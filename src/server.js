/**
 * Raga Radio - Express Server
 * Serves the web UI and provides API endpoints for music generation
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { readdirSync, statSync } from 'fs';

// Import modules
import { getAllRagas, getRaga } from './data/ragas.js';
import { buildPayload, buildCoverPrompt, buildAICoverPrompt, buildBackgroundMusicPrompt, formatPayloadPreview, isAIPromptAvailable } from './services/promptBuilder.js';
import { genres, getGenreById, suggestGenres } from './data/genres.js';
import { instruments, getInstrumentById } from './data/instruments.js';
import { checkApiKey, generateMusic, generateFromUpload, addInstrumental, pollStatus, downloadTracks, getTaskStatus, loadTrackMetadata } from './services/sunoApi.js';
import { getScaleNotes, getMidiNotes, getIntervals } from './converters/swaraConverter.js';
import { createLogger, requestLogger, logStartup } from './utils/logger.js';
import { AlapGenerator } from './generators/alapGenerator.js';
import { AIMelodyGenerator, isAIConfigured } from './services/aiMelodyGenerator.js';
import { buildMidi, getMidiInfo } from './generators/midiBuilder.js';
import { renderToWav, getAudioInfo } from './services/synthesizer.js';
import { uploadFileToR2, isR2Configured } from './services/cloudflare-r2.js';
import appConfig from './config.js';
import { v4 as uuidv4 } from 'uuid';
import { mkdir } from 'fs/promises';

// Load environment
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = appConfig.port || 8888;

// Create logger for this module
const log = createLogger('Server');

// Ensure temp directory exists
mkdir(appConfig.temp.dir, { recursive: true }).catch(() => {});

// Middleware
app.use(express.json());
app.use(requestLogger('HTTP'));  // Log all HTTP requests
app.use(express.static(join(__dirname, '..', 'public')));
app.use('/output', express.static(join(__dirname, '..', 'output')));

// API Routes

/**
 * Get all ragas with Western note conversions
 */
app.get('/api/ragas', (req, res) => {
  const ragas = getAllRagas();
  log.debug(`Fetching all ragas`, { count: Object.keys(ragas).length });

  // Enhance with Western conversions
  const enhanced = Object.entries(ragas).map(([key, raga]) => ({
    id: key,
    ...raga,
    westernNotes: getScaleNotes(raga.scaleIndian),
    midiNotes: getMidiNotes(raga.scaleIndian),
    intervals: getIntervals(raga.scaleIndian),
  }));

  res.json({ success: true, ragas: enhanced });
});

/**
 * Get a single raga by ID
 */
app.get('/api/ragas/:id', (req, res) => {
  const raga = getRaga(req.params.id);
  log.debug(`Fetching raga: ${req.params.id}`);

  if (!raga) {
    log.warn(`Raga not found: ${req.params.id}`);
    return res.status(404).json({ success: false, error: 'Raga not found' });
  }

  res.json({
    success: true,
    raga: {
      id: req.params.id,
      ...raga,
      westernNotes: getScaleNotes(raga.scaleIndian),
      midiNotes: getMidiNotes(raga.scaleIndian),
      intervals: getIntervals(raga.scaleIndian),
    }
  });
});

/**
 * Preview the prompt for a raga (without generating)
 */
app.get('/api/ragas/:id/preview', (req, res) => {
  const raga = getRaga(req.params.id);
  log.debug(`Preview prompt for raga: ${req.params.id}`);

  if (!raga) {
    log.warn(`Raga not found for preview: ${req.params.id}`);
    return res.status(404).json({ success: false, error: 'Raga not found' });
  }

  const payload = buildPayload(raga);
  log.debug(`Generated payload for ${raga.name}`, {
    model: payload.model,
    styleLength: payload.style.length,
    promptLength: payload.prompt.length
  });

  res.json({ success: true, payload });
});

/**
 * Get all available genres
 */
app.get('/api/genres', (req, res) => {
  log.debug('Fetching all genres', { count: Object.keys(genres).length });
  res.json({
    success: true,
    genres: Object.values(genres).map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      instruments: g.instruments,
      defaultInstruments: g.defaultInstruments,
      moodMapping: g.moodMapping,
    }))
  });
});

/**
 * Get genre by ID with full details
 */
app.get('/api/genres/:id', (req, res) => {
  const genre = getGenreById(req.params.id);
  if (!genre) {
    return res.status(404).json({ success: false, error: 'Genre not found' });
  }
  res.json({ success: true, genre });
});

/**
 * Get instruments for a specific genre
 */
app.get('/api/genres/:id/instruments', (req, res) => {
  const genre = getGenreById(req.params.id);
  if (!genre) {
    return res.status(404).json({ success: false, error: 'Genre not found' });
  }

  const genreInstruments = genre.instruments
    .map(id => getInstrumentById(id))
    .filter(Boolean);

  res.json({
    success: true,
    genreId: req.params.id,
    instruments: genreInstruments,
    defaultInstruments: genre.defaultInstruments
  });
});

/**
 * Get all available instruments
 */
app.get('/api/instruments', (req, res) => {
  log.debug('Fetching all instruments', { count: Object.keys(instruments).length });
  res.json({
    success: true,
    instruments: Object.values(instruments).map(i => ({
      id: i.id,
      name: i.name,
      category: i.category,
      role: i.role,
      sunoDesc: i.sunoDesc,
    }))
  });
});

/**
 * Suggest genre for a raga based on its mood
 */
app.get('/api/ragas/:id/suggest-genre', (req, res) => {
  const raga = getRaga(req.params.id);
  if (!raga) {
    return res.status(404).json({ success: false, error: 'Raga not found' });
  }

  const suggestions = suggestGenres(raga.mood);
  res.json({
    success: true,
    raga: raga.name,
    moods: raga.mood,
    suggestedGenres: suggestions.slice(0, 4).map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      matchScore: g.moodMapping.filter(m => raga.mood.includes(m)).length
    }))
  });
});

/**
 * Generate music for a raga
 */
app.post('/api/generate/:id', async (req, res) => {
  log.info(`🎵 Generate request for raga: ${req.params.id}`);

  try {
    checkApiKey();
  } catch (error) {
    log.error('API key check failed', { error: error.message });
    return res.status(401).json({ success: false, error: error.message });
  }

  const raga = getRaga(req.params.id);

  if (!raga) {
    log.warn(`Raga not found for generation: ${req.params.id}`);
    return res.status(404).json({ success: false, error: 'Raga not found' });
  }

  try {
    const payload = buildPayload(raga);
    log.info(`Building prompt for: ${raga.name}`, {
      model: payload.model,
      mood: raga.mood,
      time: raga.time
    });

    const taskId = await generateMusic(payload);
    log.info(`✅ Generation started`, { taskId, raga: raga.name });

    res.json({
      success: true,
      taskId,
      message: 'Generation started',
      raga: raga.name,
    });
  } catch (error) {
    log.error('Generation failed', { error: error.message, raga: raga.name });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Check generation status
 */
app.get('/api/status/:taskId', async (req, res) => {
  log.debug(`Status check for task: ${req.params.taskId}`);

  try {
    checkApiKey();
    const status = await getTaskStatus(req.params.taskId);
    log.debug(`Task status: ${status.status}`, { taskId: req.params.taskId });
    res.json({ success: true, ...status });
  } catch (error) {
    log.error('Status check failed', { error: error.message, taskId: req.params.taskId });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Poll and download when complete
 */
app.post('/api/download/:taskId', async (req, res) => {
  const { ragaName, ragaId, instruments, referenceAudioUrl, midiFileUrl } = req.body;
  log.info(`📥 Download request`, { taskId: req.params.taskId, ragaName, instruments, referenceAudioUrl, midiFileUrl });

  try {
    checkApiKey();

    log.info(`Polling for completion...`, { taskId: req.params.taskId });
    const record = await pollStatus(req.params.taskId, { maxAttempts: 30, intervalMs: 5000 });

    log.info(`Task complete, processing tracks...`);
    const tracks = await downloadTracks(record, ragaName || 'unknown', {
      ragaId,
      instruments,
      referenceAudioUrl,
      midiFileUrl,
    });

    log.info(`✅ Download complete`, { tracks: tracks.length });

    res.json({
      success: true,
      tracks: tracks,
    });
  } catch (error) {
    log.error('Download failed', { error: error.message, taskId: req.params.taskId });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Preview melody for a raga (returns note events without generating audio)
 */
app.get('/api/melody/:id/preview', (req, res) => {
  const { duration = 30 } = req.query;
  log.debug(`Melody preview for raga: ${req.params.id}`, { duration });

  const raga = getRaga(req.params.id);
  if (!raga) {
    return res.status(404).json({ success: false, error: 'Raga not found' });
  }

  try {
    const generator = new AlapGenerator(raga, {
      duration: parseInt(duration),
      tonic: appConfig.defaultTonic,
    });

    const events = generator.generate();
    const summary = AlapGenerator.getSummary(events);

    res.json({
      success: true,
      raga: raga.name,
      events: events,
      summary: summary,
    });
  } catch (error) {
    log.error('Melody preview failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate authentic raga music using MIDI + Suno Upload-Cover
 * This creates a precise melody following raga rules and transforms it via Suno
 */
app.post('/api/generate/:id/authentic', async (req, res) => {
  const {
    instruments = ['sitar', 'tabla'],
    duration = 60,
    genre = null, // NEW: Optional genre parameter
    useAIPrompt = true, // NEW: Whether to use AI-generated Suno prompts
  } = req.body;

  // Ensure instruments is an array
  const instrumentList = Array.isArray(instruments) ? instruments : [instruments];

  log.info(`🎵 Authentic generation request`, {
    ragaId: req.params.id,
    instruments: instrumentList,
    duration,
    genre: genre || 'auto-suggest',
    useAIPrompt,
  });

  try {
    checkApiKey();
  } catch (error) {
    log.error('API key check failed', { error: error.message });
    return res.status(401).json({ success: false, error: error.message });
  }

  const raga = getRaga(req.params.id);
  if (!raga) {
    log.warn(`Raga not found: ${req.params.id}`);
    return res.status(404).json({ success: false, error: 'Raga not found' });
  }

  // Determine genre - use provided, or suggest based on raga mood
  const selectedGenre = genre || (suggestGenres(raga.mood)[0]?.id) || 'indianClassical';

  try {
    // Check R2 configuration
    if (!isR2Configured()) {
      log.error('Cloudflare R2 not configured');
      return res.status(500).json({
        success: false,
        error: 'Cloudflare R2 not configured. Set R2 credentials in .env file.',
      });
    }

    const fileId = uuidv4().slice(0, 8);
    const baseFilename = `melody_${raga.name.toLowerCase().replace(/\s+/g, '_')}_${fileId}`;

    // Step 1: Generate alap melody (AI if available, otherwise algorithmic)
    let events;
    let summary;
    let generatorType;

    if (isAIConfigured()) {
      log.info(`Step 1: Generating AI melody for ${raga.name}...`);
      generatorType = 'AI';
      try {
        const aiGenerator = new AIMelodyGenerator(raga, {
          duration: parseInt(duration),
          tonic: appConfig.defaultTonic,
        });
        events = await aiGenerator.generate();
        summary = AIMelodyGenerator.getSummary(events);
        log.info(`AI melody generated`, summary);
      } catch (aiError) {
        log.warn(`AI generation failed, falling back to algorithmic`, { error: aiError.message });
        generatorType = 'Algorithmic (AI fallback)';
        const generator = new AlapGenerator(raga, {
          duration: parseInt(duration),
          tonic: appConfig.defaultTonic,
        });
        events = generator.generate();
        summary = AlapGenerator.getSummary(events);
        log.info(`Fallback melody generated`, summary);
      }
    } else {
      log.info(`Step 1: Generating algorithmic melody for ${raga.name}...`);
      generatorType = 'Algorithmic';
      const generator = new AlapGenerator(raga, {
        duration: parseInt(duration),
        tonic: appConfig.defaultTonic,
      });
      events = generator.generate();
      summary = AlapGenerator.getSummary(events);
      log.info(`Melody generated`, summary);
    }

    // Step 2: Build MIDI file and upload to R2
    log.info(`Step 2: Building MIDI file...`);
    const midiBuffer = buildMidi(events, {
      tempo: 45,
      trackName: `Raga ${raga.name} - ${raga.thaat} Thaat`,
    });
    const midiFilename = `${baseFilename}.mid`;
    const { uploadBufferToR2 } = await import('./services/cloudflare-r2.js');
    const midiUrl = await uploadBufferToR2(Buffer.from(midiBuffer), midiFilename, 'audio/midi');
    log.info(`MIDI uploaded to R2`, { midiUrl });

    // Step 3: Render to WAV audio
    log.info(`Step 3: Rendering to WAV...`);
    const wavFilename = `${baseFilename}.wav`;
    const wavPath = join(appConfig.temp.dir, wavFilename);
    await renderToWav(events, wavPath);
    log.info(`WAV rendered`, { path: wavPath });

    // Step 4: Upload WAV to Cloudflare R2
    log.info(`Step 4: Uploading WAV to Cloudflare R2...`);
    const uploadUrl = await uploadFileToR2(wavPath, wavFilename, 'audio/wav');
    log.info(`WAV uploaded to R2`, { uploadUrl });

    // Step 5: Build cover prompt with instruments and submit to Suno
    log.info(`Step 5: Submitting to Suno Upload-Cover API...`);

    let coverPayload;

    // Use AI-generated prompt if available and requested
    if (useAIPrompt && isAIPromptAvailable()) {
      log.info(`Using AI-generated Suno prompt for genre: ${selectedGenre}`);
      try {
        coverPayload = await buildAICoverPrompt(raga, selectedGenre, instrumentList, {
          tonic: appConfig.defaultTonic,
        });
      } catch (aiError) {
        log.warn(`AI prompt generation failed, falling back to template`, { error: aiError.message });
        coverPayload = buildCoverPrompt(raga, instrumentList, {
          tonic: appConfig.defaultTonic,
        });
      }
    } else {
      // Use legacy template-based prompt
      coverPayload = buildCoverPrompt(raga, instrumentList, {
        tonic: appConfig.defaultTonic,
      });
    }

    log.debug('Cover prompt generated', {
      title: coverPayload.title,
      instruments: instrumentList,
      promptLength: coverPayload.prompt.length,
      genre: selectedGenre,
      generatedBy: coverPayload.generatedBy || 'template',
    });

    const taskId = await generateFromUpload(uploadUrl, coverPayload);
    log.info(`✅ Authentic generation started`, { taskId, raga: raga.name, genre: selectedGenre });

    res.json({
      success: true,
      taskId,
      message: 'Authentic generation started',
      raga: raga.name,
      genre: selectedGenre,
      genreInfo: getGenreById(selectedGenre),
      instruments: instrumentList,
      melody: {
        noteCount: summary.noteCount,
        duration: summary.totalDuration,
        vadiEmphasis: summary.vadiCount,
        phases: summary.phases,
        ornaments: summary.ornaments,
        generatedBy: generatorType,
        structure: summary.structure || 'legacy',
      },
      prompt: {
        generatedBy: coverPayload.generatedBy || 'template',
        title: coverPayload.title,
      },
      referenceAudio: uploadUrl,
      midiFile: midiUrl,
    });

  } catch (error) {
    log.error('Authentic generation failed', { error: error.message, raga: raga.name });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Add deep background music to an existing track using Suno Add Instrumental API
 * This creates a remix with atmospheric background music matching the raga's mood
 */
app.post('/api/remix/:ragaId', async (req, res) => {
  const {
    audioUrl,
    ragaName,
    instruments = [],
    referenceAudioUrl,
    midiFileUrl,
  } = req.body;

  log.info(`🎼 Remix request for raga: ${req.params.ragaId}`, { audioUrl, ragaName });

  try {
    checkApiKey();
  } catch (error) {
    log.error('API key check failed', { error: error.message });
    return res.status(401).json({ success: false, error: error.message });
  }

  const raga = getRaga(req.params.ragaId);
  if (!raga) {
    log.warn(`Raga not found: ${req.params.ragaId}`);
    return res.status(404).json({ success: false, error: 'Raga not found' });
  }

  if (!audioUrl) {
    return res.status(400).json({ success: false, error: 'Audio URL is required for remix' });
  }

  try {
    // Build the background music prompt based on raga characteristics
    log.info(`Building background music prompt for ${raga.name}...`);
    const bgPrompt = buildBackgroundMusicPrompt(raga);

    log.debug('Background music prompt', {
      title: bgPrompt.title,
      tags: bgPrompt.tags,
    });

    // Submit to Add Instrumental API
    log.info(`Submitting to Suno Add Instrumental API...`);
    const taskId = await addInstrumental(audioUrl, bgPrompt);

    log.info(`✅ Remix task started`, { taskId, raga: raga.name });

    res.json({
      success: true,
      taskId,
      message: 'Remix started - adding deep background music',
      raga: raga.name,
      originalAudio: audioUrl,
    });

  } catch (error) {
    log.error('Remix failed', { error: error.message, raga: raga.name });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Download remix result and save to library
 */
app.post('/api/remix/download/:taskId', async (req, res) => {
  const { ragaName, ragaId, instruments, referenceAudioUrl, midiFileUrl, originalAudioUrl } = req.body;
  log.info(`📥 Remix download request`, { taskId: req.params.taskId, ragaName });

  try {
    checkApiKey();

    log.info(`Polling for remix completion...`, { taskId: req.params.taskId });
    const record = await pollStatus(req.params.taskId, { maxAttempts: 30, intervalMs: 5000 });

    log.info(`Remix complete, processing tracks...`);
    const tracks = await downloadTracks(record, ragaName || 'unknown', {
      ragaId,
      instruments,
      referenceAudioUrl,
      midiFileUrl,
      isRemix: true,
      originalAudioUrl,
    });

    log.info(`✅ Remix download complete`, { tracks: tracks.length });

    res.json({
      success: true,
      tracks: tracks,
    });
  } catch (error) {
    log.error('Remix download failed', { error: error.message, taskId: req.params.taskId });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get all generated tracks with raga details
 * Combines metadata from tracks-metadata.json with raga info
 */
app.get('/api/tracks', async (req, res) => {
  try {
    // Load tracks from metadata file (tracks with full info including R2 URLs)
    const metadataTracks = await loadTrackMetadata();

    // Enhance tracks with raga info
    const allRagas = getAllRagas();
    const enhancedTracks = metadataTracks.map(track => {
      let ragaInfo = null;

      // Find raga by ID or name
      const ragaKey = track.ragaId || track.ragaName?.toLowerCase().replace(/\s+/g, '');
      if (ragaKey) {
        for (const [key, raga] of Object.entries(allRagas)) {
          if (key.toLowerCase() === ragaKey.toLowerCase() ||
              raga.name.toLowerCase().replace(/\s+/g, '') === ragaKey.toLowerCase()) {
            ragaInfo = {
              id: key,
              name: raga.name,
              thaat: raga.thaat,
              time: raga.time,
              mood: raga.mood,
              westernMode: raga.westernMode,
              scaleIndian: raga.scaleIndian,
              westernNotes: getScaleNotes(raga.scaleIndian),
              description: raga.description || null
            };
            break;
          }
        }
      }

      return {
        ...track,
        raga: ragaInfo,
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Newest first

    // Also include legacy local files (without p2 suffix) for backwards compatibility
    const outputDir = join(__dirname, '..', 'output');
    try {
      const localFiles = readdirSync(outputDir)
        .filter(f => f.endsWith('.mp3') && !f.includes('_p2_')) // Only old files without p2
        .map(filename => {
          const filepath = join(outputDir, filename);
          const stats = statSync(filepath);

          // Extract raga name from filename
          const match = filename.match(/^raga_(.+?)_\d+\.mp3$/);
          const ragaKey = match ? match[1].replace(/_/g, '') : null;

          let ragaInfo = null;
          if (ragaKey) {
            for (const [key, raga] of Object.entries(allRagas)) {
              if (key.toLowerCase() === ragaKey.toLowerCase() ||
                  raga.name.toLowerCase().replace(/\s+/g, '') === ragaKey.toLowerCase()) {
                ragaInfo = {
                  id: key,
                  name: raga.name,
                  thaat: raga.thaat,
                  time: raga.time,
                  mood: raga.mood,
                  westernMode: raga.westernMode,
                  scaleIndian: raga.scaleIndian,
                  westernNotes: getScaleNotes(raga.scaleIndian),
                  description: raga.description || null
                };
                break;
              }
            }
          }

          return {
            filename,
            url: `/output/${filename}`,
            ragaName: ragaKey,
            createdAt: stats.birthtime.toISOString(),
            raga: ragaInfo,
            referenceAudioUrl: null, // Legacy files don't have reference audio
            instrument: null,
            isLegacy: true,
          };
        });

      // Combine and sort by date
      const allTracks = [...enhancedTracks, ...localFiles]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      log.info(`Fetched ${allTracks.length} tracks (${enhancedTracks.length} new, ${localFiles.length} legacy)`);
      res.json({ success: true, tracks: allTracks });
    } catch {
      // No local files, just return metadata tracks
      log.info(`Fetched ${enhancedTracks.length} tracks from metadata`);
      res.json({ success: true, tracks: enhancedTracks });
    }

  } catch (error) {
    log.error('Failed to read tracks', { error: error.message });
    res.json({ success: true, tracks: [] });
  }
});

/**
 * Format file size to human readable
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  log.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server only if not in Vercel serverless environment
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logStartup(PORT);
    log.info(`Server started on port ${PORT}`);
  });
}

export default app;
