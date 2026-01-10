/**
 * Prompt Builder Service
 * Single Responsibility: Build API prompts for music generation
 *
 * NEW: Supports AI-generated prompts for multi-genre music generation
 */

import {
  swaraToWestern,
  getScaleNotes,
  getMidiNotes,
  getIntervals,
  getAvoidNotes,
} from '../converters/swaraConverter.js';

import { generateSunoPrompt, buildSunoPayload } from './aiPromptGenerator.js';
import { getGenreById } from '../data/genres.js';
import { getInstrumentById } from '../data/instruments.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('PromptBuilder');

/**
 * Build the style string for the API
 * @param {object} raga - Raga data object
 * @returns {string} Style string (max 1000 chars for V5)
 */
function buildStyle(raga) {
  // Core genre
  const coreStyle = ['Indian Classical', 'Hindustani Raga', 'Traditional'];

  // Time-based atmosphere
  const timeStyle = getTimeAtmosphere(raga.time);

  // Mood-based qualities
  const moodStyle = raga.mood.slice(0, 3); // Use up to 3 moods

  // Instrumentation (traditional Indian classical)
  const instruments = ['Sitar', 'Tabla', 'Tanpura drone', 'Bansuri flute'];

  // Musical characteristics
  const musicalStyle = [
    raga.westernMode,
    `${raga.thaat} thaat`,
    'Modal',
    'Microtonal ornaments',
    'Meend (glides)',
    'Gamak (oscillations)',
  ];

  // Tempo/feel based on time
  const tempoStyle = getTempoStyle(raga.time);

  const styleElements = [
    ...coreStyle,
    ...timeStyle,
    ...moodStyle,
    ...instruments,
    ...musicalStyle,
    ...tempoStyle,
  ];

  return styleElements.join(', ').slice(0, 1000);
}

/**
 * Get atmospheric style elements based on time of day
 */
function getTimeAtmosphere(time) {
  const timeLower = time.toLowerCase();
  if (timeLower.includes('early morning')) {
    return ['Dawn atmosphere', 'Serene', 'Awakening'];
  }
  if (timeLower.includes('morning')) {
    return ['Morning freshness', 'Bright', 'Uplifting'];
  }
  if (timeLower.includes('afternoon')) {
    return ['Midday warmth', 'Contemplative'];
  }
  if (timeLower.includes('evening')) {
    return ['Evening twilight', 'Sunset mood', 'Romantic'];
  }
  if (timeLower.includes('late night')) {
    return ['Deep night', 'Introspective', 'Mystical'];
  }
  if (timeLower.includes('night')) {
    return ['Nocturnal', 'Moonlit', 'Peaceful night'];
  }
  if (timeLower.includes('monsoon')) {
    return ['Rainy season', 'Romantic longing', 'Cloudy atmosphere'];
  }
  return ['Timeless', 'Meditative'];
}

/**
 * Get tempo/feel based on time
 */
function getTempoStyle(time) {
  const timeLower = time.toLowerCase();
  if (timeLower.includes('early morning') || timeLower.includes('late night')) {
    return ['Slow tempo', 'Alap style', 'Free rhythm'];
  }
  if (timeLower.includes('evening') || timeLower.includes('night')) {
    return ['Medium tempo', 'Flowing', 'Gentle rhythm'];
  }
  return ['Medium-slow tempo', 'Rhythmic'];
}

/**
 * Build the music generation prompt with precise note information
 * @param {object} raga - Raga data object
 * @param {string} tonic - The Western note that Sa is set to (default 'C')
 * @returns {string} The prompt text
 */
function buildPromptText(raga, tonic = 'C') {
  // Convert scales to Western notation
  const scaleNotes = getScaleNotes(raga.scaleIndian, tonic);
  const midiNotes = getMidiNotes(raga.scaleIndian, tonic);
  const intervals = getIntervals(raga.scaleIndian);
  const avoidNotes = getAvoidNotes(raga.scaleIndian, tonic);

  // Convert melodic patterns
  const aarohaWestern = getScaleNotes(raga.aaroha || raga.scaleIndian, tonic);
  const avarohaWestern = getScaleNotes(raga.avaroha || raga.scaleIndian, tonic);

  // Convert vadi/samvadi
  const vadiInfo = swaraToWestern(raga.vadi, tonic);
  const samvadiInfo = swaraToWestern(raga.samvadi, tonic);
  const vadiNote = vadiInfo ? vadiInfo.westernNote : 'E';
  const samvadiNote = samvadiInfo ? samvadiInfo.westernNote : 'B';

  // Get mood descriptor for scale feel
  const moodDescriptor = getMoodDescriptor(raga.mood);
  const tempoDescriptor = getTempoDescriptor(raga.time);

  // OPTIMIZED PROMPT: Based on Suno AI best practices research
  // - Primary genre/style first (Suno weights early words more)
  // - Natural language descriptions work better than technical specs
  // - Mood descriptors influence scale selection
  // - Limit to key elements, avoid overstuffing

  return `Hindustani classical instrumental, Raga ${raga.name}, ${raga.thaat} thaat, ${raga.westernMode} mode.

${moodDescriptor} ${tempoDescriptor} composition featuring sitar melody with tabla rhythm and tanpura drone.

Musical character: ${raga.mood.slice(0, 3).join(', ').toLowerCase()} mood, ${raga.time.split('(')[0].trim().toLowerCase()} atmosphere.

Scale: ${raga.westernMode} mode in ${tonic} (${scaleNotes}). Emphasize ${vadiNote} as primary note, resolve to ${samvadiNote}.

Melodic movement: Ascend through ${aarohaWestern}, descend via ${avarohaWestern}.

Traditional Indian classical structure: Begin with meditative alap (slow, free rhythm exploration of the raga), then transition into rhythmic gat section with tabla accompaniment.${raga.description ? `\n\n${raga.description}` : ''}`;
}

/**
 * Get mood descriptor for natural language prompt
 */
function getMoodDescriptor(moods) {
  const moodMap = {
    'Devotional': 'Spiritual and sacred',
    'Peaceful': 'Serene and calming',
    'Romantic': 'Tender and emotional',
    'Serious': 'Deep and contemplative',
    'Joyful': 'Bright and uplifting',
    'Mysterious': 'Enigmatic and haunting',
    'Majestic': 'Grand and noble',
    'Pathos': 'Melancholic and sorrowful',
    'Longing': 'Yearning and wistful',
  };

  for (const mood of moods) {
    if (moodMap[mood]) return moodMap[mood];
  }
  return 'Meditative and expressive';
}

/**
 * Get tempo descriptor based on time of day
 */
function getTempoDescriptor(time) {
  const timeLower = time.toLowerCase();
  if (timeLower.includes('early morning') || timeLower.includes('late night')) {
    return 'slow tempo, 60-70 BPM,';
  }
  if (timeLower.includes('morning')) {
    return 'medium-slow tempo, 70-80 BPM,';
  }
  if (timeLower.includes('afternoon')) {
    return 'medium tempo, 80-90 BPM,';
  }
  if (timeLower.includes('evening')) {
    return 'relaxed tempo, 70-85 BPM,';
  }
  if (timeLower.includes('night')) {
    return 'slow-medium tempo, 65-80 BPM,';
  }
  return 'medium tempo, 75-85 BPM,';
}

/**
 * Build LEGACY prompt with full technical details (for reference/debugging)
 */
function buildPromptTextLegacy(raga, tonic = 'C') {
  const scaleNotes = getScaleNotes(raga.scaleIndian, tonic);
  const midiNotes = getMidiNotes(raga.scaleIndian, tonic);
  const intervals = getIntervals(raga.scaleIndian);
  const avoidNotes = getAvoidNotes(raga.scaleIndian, tonic);
  const aarohaWestern = getScaleNotes(raga.aaroha || raga.scaleIndian, tonic);
  const avarohaWestern = getScaleNotes(raga.avaroha || raga.scaleIndian, tonic);
  const vadiInfo = swaraToWestern(raga.vadi, tonic);
  const samvadiInfo = swaraToWestern(raga.samvadi, tonic);
  const vadiNote = vadiInfo ? vadiInfo.westernNote : 'E';
  const samvadiNote = samvadiInfo ? samvadiInfo.westernNote : 'B';

  return `Indian classical instrumental music in Raga ${raga.name}.

EXACT MUSICAL SCALE (Western notation, Sa = ${tonic}):
- Notes to USE: ${scaleNotes}
- MIDI note numbers: ${midiNotes}
- Semitone intervals: ${intervals}
- Mode: ${raga.westernMode} / ${raga.thaat} thaat

NOTES TO AVOID (do not play these):
- ${avoidNotes.join(', ')}

MELODIC MOVEMENT:
- Ascending pattern: ${aarohaWestern}
- Descending pattern: ${avarohaWestern}
- Signature phrase (Pakad): ${raga.pakad || 'N/A'}

EMPHASIS:
- Primary note (Vadi): ${vadiNote} - feature prominently
- Secondary note (Samvadi): ${samvadiNote} - use for resolution
- Drone notes: ${tonic} (Sa) and ${swaraToWestern('P', tonic)?.westernNote || 'G'} (Pa)

MOOD: ${raga.mood.join(', ')}
TIME: ${raga.time}
${raga.description ? `\n${raga.description}\n` : ''}
INSTRUMENTATION:
- Lead melody: Sitar or Sarod
- Rhythm: Tabla
- Drone: Tanpura on ${tonic} and ${swaraToWestern('P', tonic)?.westernNote || 'G'}
- Optional: Bansuri (bamboo flute)

Structure: Begin with slow alap (free rhythm exploration), then transition to gentle rhythmic gat section.`;
}

/**
 * Build negative tags (elements to exclude from generation)
 * @param {object} raga - Raga data object
 * @param {string} tonic - The Western note that Sa is set to
 * @returns {string} Comma-separated negative tags
 */
function buildNegativeTags(raga, tonic = 'C') {
  const avoidNotes = getAvoidNotes(raga.scaleIndian, tonic);
  const baseTags = ['vocals', 'singing', 'voice', 'lyrics', 'pop', 'rock', 'electronic'];

  return [...baseTags, ...avoidNotes].join(', ');
}

/**
 * Build the complete API payload for a raga
 * @param {object} raga - Raga data object
 * @param {object} options - Additional options
 * @param {string} options.tonic - The Western note that Sa is set to (default 'C')
 * @param {string} options.model - Suno model to use (default 'V5' - superior musical expression)
 * @param {string} options.callbackUrl - Optional callback URL
 * @param {number} options.styleWeight - Adherence to style (0-1, default 0.7)
 * @param {number} options.weirdnessConstraint - Creative deviation (0-1, default 0.3)
 * @param {number} options.audioWeight - Audio feature balance (0-1, default 0.6)
 * @returns {object} The complete API payload
 */
export function buildPayload(raga, options = {}) {
  const {
    tonic = 'C',
    model = 'V5',  // V5: Superior musical expression, faster generation
    callbackUrl = 'https://example.com/callback',  // Required by API, we poll instead
    styleWeight = 0.7,  // Higher = more adherence to Indian classical style
    weirdnessConstraint = 0.3,  // Lower = more traditional, less experimental
    audioWeight = 0.6,  // Balanced audio features
  } = options;

  const payload = {
    prompt: buildPromptText(raga, tonic),
    customMode: true,
    instrumental: true,
    model: model,
    style: buildStyle(raga),
    title: `Raga ${raga.name} - ${raga.mood[0]} ${raga.time.split('(')[0].trim()}`,
    negativeTags: buildNegativeTags(raga, tonic),
    callBackUrl: callbackUrl,
    styleWeight: styleWeight,
    weirdnessConstraint: weirdnessConstraint,
    audioWeight: audioWeight,
  };

  return payload;
}

/**
 * Preview the payload in human-readable format
 * @param {object} payload - The API payload
 * @returns {string} Formatted preview string
 */
export function formatPayloadPreview(payload) {
  const separator = '='.repeat(60);

  return `
${separator}
GENERATED PROMPT PREVIEW
${separator}

Title: ${payload.title}

Style: ${payload.style}

Negative Tags: ${payload.negativeTags}

Model: ${payload.model}

Prompt:
${payload.prompt}

${separator}
`;
}

/**
 * Build prompt for Upload and Cover API (authentic raga generation)
 * This is used when uploading a reference melody to be transformed
 *
 * @param {object} raga - Raga data object
 * @param {string|string[]} instruments - Target instrument(s)
 * @param {object} options - Additional options
 * @returns {object} Payload for upload-cover API
 */
export function buildCoverPrompt(raga, instruments = ['sitar'], options = {}) {
  const { tonic = 'C' } = options;

  // Ensure instruments is an array
  const instrumentList = Array.isArray(instruments) ? instruments : [instruments];

  // Instrument-specific descriptions (detailed and beautiful)
  const instrumentDescriptions = {
    sitar: 'majestic sitar with shimmering sympathetic strings (taraf), rich meend glides, and resonant jawari buzz',
    sarod: 'deep-toned sarod with fretless metallic fingerboard, producing hauntingly smooth meends',
    veena: 'saraswati veena with its ancient, meditative plucked tones and subtle gamakas',
    tanpura: 'hypnotic tanpura drone creating the sacred foundation of Sa and Pa',
    santoor: 'sparkling santoor hammered dulcimer with its crystalline, cascading notes',
    bansuri: 'soulful bamboo flute (bansuri) with breathy, ethereal tones and ornamental murki',
    shehnai: 'ceremonial shehnai reed instrument with its bright, auspicious timbre',
    tabla: 'expressive tabla drums with intricate rhythmic patterns (tala) and resonant bass',
    pakhawaj: 'ancient pakhawaj barrel drum with deep, powerful strokes',
    mridangam: 'Carnatic mridangam with its crisp, mathematical rhythmic precision',
    vocal: 'human voice in traditional alaap style with slow, meditative exploration',
    harmonium: 'pump organ harmonium providing warm, sustained melodic support',
    synth: 'atmospheric synthesizer with Indian classical textures and ambient pads',
  };

  // Build instrument descriptions for prompt
  const instrumentDescs = instrumentList
    .map(inst => instrumentDescriptions[inst] || inst)
    .filter(Boolean);

  // Categorize instruments
  const melodicInstruments = instrumentList.filter(i => ['sitar', 'sarod', 'veena', 'santoor', 'bansuri', 'shehnai', 'vocal', 'harmonium', 'synth'].includes(i));
  const percussionInstruments = instrumentList.filter(i => ['tabla', 'pakhawaj', 'mridangam'].includes(i));
  const droneInstruments = instrumentList.filter(i => i === 'tanpura');

  // Get mood and time descriptors
  const moodDescriptor = getMoodDescriptor(raga.mood);
  const tempoDescriptor = getTempoDescriptor(raga.time);

  // Build the instrument ensemble description - EMPHASIZE ALL INSTRUMENTS PLAYING TOGETHER
  const allInstrumentNames = instrumentList.map(i => i.charAt(0).toUpperCase() + i.slice(1)).join(', ');
  const instrumentEnsemble = instrumentList.length > 1
    ? `FULL ENSEMBLE featuring ALL of these instruments playing together: ${allInstrumentNames}`
    : `Solo ${instrumentList[0] || 'sitar'} performance`;

  // Build beautiful, evocative prompt with STRONG multi-instrument emphasis
  const prompt = `Create an enchanting Hindustani classical rendition of Raga ${raga.name} - a ${moodDescriptor.toLowerCase()} raga traditionally performed during ${raga.time.split('(')[0].trim().toLowerCase()}.

CRITICAL - ${instrumentEnsemble}. Each instrument MUST be clearly audible and playing its role throughout the composition.

PRESERVE THE MELODY: The uploaded audio contains the precise note sequence (aaroha-avaroha patterns) of Raga ${raga.name}. Transform it into a rich, multi-layered production with ALL selected instruments.

THE RAGA'S ESSENCE:
Raga ${raga.name} belongs to the ${raga.thaat} thaat (parent scale), expressing the ${raga.westernMode} mode in Western terms. Its soul lies in the ${raga.mood.join(' and ').toLowerCase()} emotions it evokes.
${raga.description ? `\n"${raga.description}"` : ''}

INSTRUMENTATION - ONLY USE THESE SPECIFIC INSTRUMENTS:
${melodicInstruments.length > 0 ? `MELODIC VOICES (play the main raga melody in interplay): ${melodicInstruments.map(i => instrumentDescriptions[i] || i).join('; ')}` : ''}
${percussionInstruments.length > 0 ? `RHYTHM SECTION (maintain tala throughout): ${percussionInstruments.map(i => instrumentDescriptions[i] || i).join('; ')}` : '(No percussion - this is a rhythmless alaap style composition)'}
${droneInstruments.length > 0 ? `DRONE FOUNDATION: ${instrumentDescriptions.tanpura}` : '(Subtle ambient drone pad only, no tanpura)'}

DO NOT USE: ${!instrumentList.includes('bansuri') ? 'flute, bansuri, ' : ''}${!instrumentList.includes('sitar') ? 'sitar, ' : ''}${!instrumentList.includes('tabla') ? 'tabla, drums, ' : ''}${!instrumentList.includes('vocal') ? 'vocals, singing, ' : ''}guitar, piano, violin

ARRANGEMENT - HOW INSTRUMENTS INTERACT:
${instrumentList.length > 1 ? `
- All ${instrumentList.length} instruments (${allInstrumentNames}) enter progressively: drone first, then melody, then rhythm
- Melodic instruments take turns with the main phrase, creating call-and-response patterns
- During climactic sections, ALL instruments play simultaneously in full ensemble
- Each instrument should be balanced in the mix - no instrument should overpower others` : '- Solo instrument with supporting drone and optional rhythm'}

MUSICAL CHARACTER:
- ${tempoDescriptor} performance
- Begin with expansive alaap (slow, meditative exploration without rhythm)
- Gradually introduce each instrument one by one
- Apply traditional ornaments: meend (glides), gamak (oscillations), andolan (slow vibrato), and murki (quick ornaments)
- Create the feeling of ${raga.time.toLowerCase().includes('morning') ? 'dawn breaking with spiritual awakening' : raga.time.toLowerCase().includes('evening') ? 'sunset meditation and romantic longing' : raga.time.toLowerCase().includes('night') ? 'moonlit serenity and deep introspection' : 'timeless contemplation'}

PRODUCTION:
- Concert hall reverb for authentic ambience
- IMPORTANT: Balanced mix where ALL instruments are clearly audible
- Stereo placement: drone centered, melody instruments panned slightly, percussion balanced`;

  // Build rich style string with ALL instruments prominently listed
  const styleElements = [
    'Indian Classical Ensemble',
    'Hindustani Raga',
    `Raga ${raga.name}`,
    `Multi-instrument: ${allInstrumentNames}`,
    ...instrumentList.map(i => i.charAt(0).toUpperCase() + i.slice(1)),
    raga.westernMode,
    `${raga.thaat} thaat`,
    ...raga.mood.slice(0, 3),
    'Full Orchestra',
    'Ensemble Performance',
    'Traditional ornaments',
    'Concert hall reverb',
  ];

  const style = styleElements.join(', ').slice(0, 1000);

  // Build NEGATIVE TAGS to exclude instruments NOT selected
  // This helps prevent Suno from substituting unwanted instruments
  const allPossibleInstruments = ['sitar', 'sarod', 'veena', 'tanpura', 'santoor', 'bansuri', 'shehnai', 'tabla', 'pakhawaj', 'mridangam', 'vocal', 'harmonium', 'synth'];
  const unselectedInstruments = allPossibleInstruments.filter(i => !instrumentList.includes(i));

  // Map to common names that AI might substitute
  const instrumentExclusions = {
    bansuri: ['flute', 'bamboo flute', 'bansuri'],
    sitar: ['sitar'],
    sarod: ['sarod'],
    veena: ['veena'],
    tanpura: ['tanpura', 'drone'],
    santoor: ['santoor', 'dulcimer'],
    shehnai: ['shehnai', 'oboe'],
    tabla: ['tabla', 'drums'],
    pakhawaj: ['pakhawaj'],
    mridangam: ['mridangam'],
    vocal: ['voice', 'vocals', 'singing'],
    harmonium: ['harmonium', 'organ'],
    synth: ['synthesizer', 'synth', 'electronic'],
  };

  const negativeTags = [
    ...unselectedInstruments.flatMap(i => instrumentExclusions[i] || [i]),
    'guitar',
    'piano',
    'violin western',
  ].join(', ');

  // Build title showing instrument count
  const instrumentSummary = instrumentList.length > 1
    ? `${instrumentList.length} Instruments`
    : (melodicInstruments[0] || instrumentList[0] || 'Classical').charAt(0).toUpperCase() + (melodicInstruments[0] || instrumentList[0] || 'classical').slice(1);
  const title = `Raga ${raga.name} | ${instrumentSummary} | ${raga.mood[0]}`;

  return {
    prompt: prompt.slice(0, 5000), // Max 5000 chars for V5
    style: style,
    title: title.slice(0, 100), // Max 100 chars
    negativeTags: negativeTags.slice(0, 200), // Max 200 chars for API
    model: options.model || 'V5',
    styleWeight: options.styleWeight || 0.7,
    weirdnessConstraint: options.weirdnessConstraint || 0.3,
    audioWeight: options.audioWeight || 0.6,
    instruments: instrumentList, // Store for metadata
  };
}

/**
 * Build prompt for Add Instrumental API (adding background music)
 * This creates deep, atmospheric background music matching the raga's mood
 *
 * @param {object} raga - Raga data object
 * @param {object} options - Additional options
 * @returns {object} Payload for add-instrumental API
 */
export function buildBackgroundMusicPrompt(raga, options = {}) {
  const moodDescriptor = getMoodDescriptor(raga.mood);

  // Create tags based on raga characteristics
  const tags = [
    'Indian Classical Background',
    'Ambient Drone',
    'Meditative Pads',
    'Atmospheric',
    raga.westernMode,
    ...raga.mood.slice(0, 2),
    raga.time.toLowerCase().includes('morning') ? 'Dawn Ambience' :
    raga.time.toLowerCase().includes('evening') ? 'Twilight Atmosphere' :
    raga.time.toLowerCase().includes('night') ? 'Nocturnal Ambient' : 'Ethereal',
    'Deep Bass',
    'Reverb Heavy',
    'Cinematic',
  ].join(', ');

  const negativeTags = [
    'vocals',
    'singing',
    'fast tempo',
    'drums heavy',
    'electronic beats',
    'pop',
    'rock',
    'distortion',
  ].join(', ');

  const title = `${raga.name} | Deep Ambient Background`;

  return {
    title: title.slice(0, 80),
    tags: tags.slice(0, 200),
    negativeTags: negativeTags.slice(0, 200),
    model: options.model || 'V5',
    styleWeight: options.styleWeight || 0.6,
    weirdnessConstraint: options.weirdnessConstraint || 0.2,
    audioWeight: options.audioWeight || 0.7,
  };
}

/**
 * NEW: Build AI-generated cover prompt with multi-genre support
 * Uses OpenAI to generate creative, varied prompts
 *
 * @param {object} raga - Raga data object
 * @param {string} genreId - Genre ID from genres.js (e.g., 'metal', 'atmospheric')
 * @param {string[]} instrumentIds - Array of instrument IDs from instruments.js
 * @param {object} options - Additional options
 * @returns {Promise<object>} Payload for upload-cover API with AI-generated content
 */
export async function buildAICoverPrompt(raga, genreId = 'indianClassical', instrumentIds = ['sitar', 'tabla'], options = {}) {
  log.info('Building AI-powered cover prompt', {
    raga: raga.name,
    genre: genreId,
    instruments: instrumentIds.length
  });

  try {
    // Generate AI prompt
    const aiPrompt = await generateSunoPrompt(raga, genreId, instrumentIds, {
      temperature: options.temperature || 0.8,
      model: options.model || 'gpt-4o-mini'
    });

    // Get genre data for additional info
    const genre = getGenreById(genreId);

    // Build title
    const instrumentCount = instrumentIds.length;
    const mood = raga.mood?.[0] || 'Peaceful';
    const title = `Raga ${raga.name} | ${genre.name} | ${mood}`;

    // Combine AI-generated content with API requirements
    const payload = {
      prompt: aiPrompt.prompt,
      style: aiPrompt.style,
      title: title.slice(0, 100),
      negativeTags: aiPrompt.negativeTags,
      model: options.model || 'V5',
      customMode: true,
      instrumental: true,
      styleWeight: options.styleWeight || 0.7,
      weirdnessConstraint: options.weirdnessConstraint || 0.3,
      audioWeight: options.audioWeight || 0.6,
      // Metadata for tracking
      genre: genreId,
      instruments: instrumentIds,
      generatedBy: 'AI'
    };

    log.info('AI cover prompt generated', {
      promptLength: payload.prompt.length,
      styleLength: payload.style.length,
      genre: genreId
    });

    return payload;

  } catch (error) {
    log.error('AI prompt generation failed, falling back to template', { error: error.message });

    // Fallback to legacy template-based generation
    return buildCoverPrompt(raga, instrumentIds, options);
  }
}

/**
 * Check if AI prompt generation is available
 */
export function isAIPromptAvailable() {
  return !!process.env.OPENAI_API_KEY;
}

export default {
  buildPayload,
  buildCoverPrompt,
  buildAICoverPrompt,
  buildBackgroundMusicPrompt,
  formatPayloadPreview,
  isAIPromptAvailable,
};
