/**
 * Suno API Client Service
 * Single Responsibility: Handle all communication with the Suno/kie.ai API
 */

import config from '../config.js';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { createLogger } from '../utils/logger.js';
import { uploadBufferToR2, isR2Configured, getJsonFromR2, putJsonToR2 } from './cloudflare-r2.js';

const log = createLogger('SunoAPI');

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Parsed JSON response
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${config.api.baseUrl}${endpoint}`;

  const headers = {
    'Authorization': `Bearer ${config.api.key}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok || data.code !== 200) {
    throw new Error(data.msg || `API error: ${response.status}`);
  }

  return data;
}

/**
 * Check if API key is configured
 * @throws {Error} If API key is not configured
 */
export function checkApiKey() {
  if (!config.api.key) {
    throw new Error(
      'SUNO_API_KEY not found in environment variables.\n' +
      'Please set it in .env file or export it:\n' +
      '  export SUNO_API_KEY=your_api_key_here'
    );
  }
}

/**
 * Submit a music generation request
 * @param {object} payload - The generation request payload
 * @returns {Promise<string>} The task ID
 */
export async function generateMusic(payload) {
  log.info('Submitting generation request...', {
    title: payload.title,
    model: payload.model,
    styleLength: payload.style.length
  });
  log.debug('Full payload', payload);

  const response = await apiRequest('/api/v1/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const taskId = response.data?.taskId;
  if (!taskId) {
    log.error('No task ID in response', response);
    throw new Error('No task ID returned from API');
  }

  log.info(`Task submitted successfully`, { taskId });
  return taskId;
}

/**
 * Poll for task completion
 * @param {string} taskId - The task ID to poll
 * @param {object} options - Polling options
 * @param {number} options.maxAttempts - Maximum polling attempts
 * @param {number} options.intervalMs - Interval between polls in milliseconds
 * @returns {Promise<object>} The completed task record
 */
export async function pollStatus(taskId, options = {}) {
  const {
    maxAttempts = config.polling.maxAttempts,
    intervalMs = config.polling.intervalMs,
  } = options;

  log.info(`Polling for completion`, { taskId, intervalMs, maxAttempts });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await apiRequest(`/api/v1/generate/record-info?taskId=${taskId}`, {
        method: 'GET',
      });

      const record = response.data || {};
      const status = record.status || 'unknown';

      log.debug(`Poll attempt ${attempt}/${maxAttempts}`, { status });

      // kie.ai uses SUCCESS, FIRST_SUCCESS, TEXT_SUCCESS, PENDING
      if (status === 'complete' || status === 'SUCCESS') {
        log.info(`Generation complete`, { taskId, status });
        return record;
      }

      if (status === 'failed' || status === 'error' || status === 'FAILED') {
        log.error(`Generation failed`, { taskId, errorMessage: record.errorMessage });
        throw new Error(`Generation failed: ${record.errorMessage || JSON.stringify(record)}`);
      }
    } catch (error) {
      if (error.message.includes('Generation failed')) {
        throw error;
      }
      log.warn(`Poll attempt ${attempt} failed`, { error: error.message });
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  log.error(`Polling timeout`, { taskId, attempts: maxAttempts });
  throw new Error(
    `Timeout: Generation did not complete in expected time.\n` +
    `You can check status later with task ID: ${taskId}`
  );
}

/**
 * Download a file from URL
 * @param {string} url - URL to download from
 * @param {string} filepath - Local path to save to
 * @returns {Promise<void>}
 */
async function downloadFile(url, filepath) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  await writeFile(filepath, Buffer.from(buffer));
}

/**
 * Download generated tracks from a completed task and upload to R2
 * @param {object} record - The completed task record
 * @param {string} ragaName - Name of the raga (for filename)
 * @param {object} options - Additional options
 * @param {string} options.referenceAudioUrl - URL of the reference audio used for generation
 * @param {string} options.midiFileUrl - URL of the MIDI file with exact notes
 * @param {string[]} options.instruments - Instruments used
 * @param {string} options.ragaId - Raga ID
 * @returns {Promise<Array<object>>} Array of track info objects with R2 URLs
 */
export async function downloadTracks(record, ragaName, options = {}) {
  // Extract tracks from various possible response structures
  // kie.ai uses response.sunoData array
  let tracks = record.response?.sunoData || record.tracks || record.data?.tracks || [];

  // Fallback: single audio URL
  if (tracks.length === 0) {
    const audioUrl = record.audioUrl || record.audio_url;
    if (audioUrl) {
      tracks = [{ audioUrl, title: ragaName }];
    }
  }

  if (tracks.length === 0) {
    log.warn('No tracks found in response', record);
    return [];
  }

  log.info(`Processing ${tracks.length} track(s)...`);

  const processedTracks = [];
  const useR2 = isR2Configured();
  const timestamp = Date.now();

  // Also ensure local output dir exists as fallback
  await mkdir(config.output.dir, { recursive: true });

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    // kie.ai: prefer audioUrl, fallback to streamAudioUrl (add .mp3 if needed)
    let audioUrl = track.audioUrl || track.audio_url || track.streamAudioUrl;

    // Ensure URL ends with .mp3 for proper download
    if (audioUrl && !audioUrl.includes('.mp3') && !audioUrl.includes('?')) {
      audioUrl = audioUrl + '.mp3';
    }

    if (!audioUrl) {
      log.warn(`Track ${i + 1}: No audio URL found`);
      continue;
    }

    // p2 suffix to distinguish new authentic generation files
    const filename = `raga_${ragaName.toLowerCase().replace(/\s+/g, '_')}_p2_${timestamp}_${i + 1}.mp3`;

    log.debug(`Downloading track ${i + 1}`, { filename, url: audioUrl.substring(0, 60) + '...' });

    try {
      // Download the audio file
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());

      let finalUrl;
      let localPath = null;

      if (useR2) {
        // Upload to R2
        finalUrl = await uploadBufferToR2(buffer, filename, 'audio/mpeg');
        log.info(`Track uploaded to R2`, { filename, url: finalUrl });
      } else {
        // Fallback: save locally
        localPath = join(config.output.dir, filename);
        await writeFile(localPath, buffer);
        finalUrl = `/output/${filename}`;
        log.info(`Track saved locally`, { filename, localPath });
      }

      const trackInfo = {
        filename,
        url: finalUrl,
        localPath,
        ragaName,
        ragaId: options.ragaId,
        instruments: options.instruments || [],
        genre: options.genre || 'indianClassical',
        referenceAudioUrl: options.referenceAudioUrl,
        midiFileUrl: options.midiFileUrl,
        createdAt: new Date().toISOString(),
        duration: track.duration || null,
        sunoId: track.id || null,
      };

      processedTracks.push(trackInfo);

    } catch (error) {
      log.error(`Failed to process track ${i + 1}`, { error: error.message, url: audioUrl });
    }
  }

  // Save track metadata to local JSON file for persistence
  if (processedTracks.length > 0) {
    await saveTrackMetadata(processedTracks);
  }

  return processedTracks;
}

// R2 key for metadata storage
const METADATA_R2_KEY = 'raga-radio/tracks-metadata.json';

// In-memory cache for metadata
let metadataCache = null;

/**
 * Save track metadata to R2
 * @param {Array<object>} newTracks - New tracks to save
 */
async function saveTrackMetadata(newTracks) {
  try {
    // Load existing tracks from R2
    let existingTracks = await loadTrackMetadata();

    // Merge new tracks (avoid duplicates by sunoId)
    const existingIds = new Set(existingTracks.map(t => t.sunoId).filter(Boolean));
    const uniqueNewTracks = newTracks.filter(t => !t.sunoId || !existingIds.has(t.sunoId));

    const allTracks = [...existingTracks, ...uniqueNewTracks];

    // Save to R2
    await putJsonToR2(METADATA_R2_KEY, allTracks);

    // Update cache
    metadataCache = allTracks;

    log.info(`Track metadata saved to R2`, { total: allTracks.length, new: uniqueNewTracks.length });
  } catch (error) {
    log.error('Failed to save track metadata to R2', { error: error.message });
    throw error;
  }
}

/**
 * Load all track metadata from R2
 * @returns {Promise<Array<object>>} Array of track info objects
 */
export async function loadTrackMetadata() {
  // Return cached data if available
  if (metadataCache !== null) {
    log.debug(`Returning cached metadata (${metadataCache.length} tracks)`);
    return metadataCache;
  }

  try {
    const data = await getJsonFromR2(METADATA_R2_KEY);

    if (data) {
      metadataCache = data;
      log.info(`Loaded ${data.length} tracks from R2`);
      return data;
    }

    // No metadata file in R2 yet
    log.debug('No metadata file in R2, returning empty array');
    return [];
  } catch (error) {
    log.error('Failed to load track metadata from R2', { error: error.message });
    return [];
  }
}

/**
 * Get task status without polling
 * @param {string} taskId - The task ID to check
 * @returns {Promise<object>} The task record
 */
export async function getTaskStatus(taskId) {
  const response = await apiRequest(`/api/v1/generate/record-info?taskId=${taskId}`, {
    method: 'GET',
  });

  return response.data || {};
}

/**
 * Generate music from uploaded audio using Upload and Cover API
 * This transforms the uploaded audio into a new style while preserving the melody
 *
 * @param {string} uploadUrl - Public URL of the reference audio file
 * @param {object} payload - Generation parameters
 * @param {string} payload.prompt - Description of desired output
 * @param {string} payload.style - Style descriptors (max 1000 chars)
 * @param {string} payload.title - Track title (max 100 chars)
 * @param {string} [payload.callBackUrl] - Callback URL for completion notification
 * @returns {Promise<string>} The task ID
 */
export async function generateFromUpload(uploadUrl, payload) {
  log.info('Submitting upload-cover generation request...', {
    title: payload.title,
    uploadUrl: uploadUrl.substring(0, 50) + '...',
  });

  const requestBody = {
    uploadUrl: uploadUrl,
    prompt: payload.prompt,
    style: payload.style,
    title: payload.title,
    customMode: true,
    instrumental: true,
    model: payload.model || 'V5',
    callBackUrl: payload.callBackUrl || 'https://example.com/callback',
    // Negative tags to exclude unwanted instruments
    negativeTags: payload.negativeTags || '',
    // Optional parameters
    styleWeight: payload.styleWeight || 0.7,
    weirdnessConstraint: payload.weirdnessConstraint || 0.3,
    audioWeight: payload.audioWeight || 0.6,
  };

  log.debug('Upload-cover payload', requestBody);

  const response = await apiRequest('/api/v1/generate/upload-cover', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  const taskId = response.data?.taskId;
  if (!taskId) {
    log.error('No task ID in response', response);
    throw new Error('No task ID returned from upload-cover API');
  }

  log.info(`Upload-cover task submitted`, { taskId });
  return taskId;
}

/**
 * Add instrumental background music to an existing audio track
 * Uses the Suno Add Instrumental API to generate deep background music
 *
 * @param {string} uploadUrl - Public URL of the audio file to add background to
 * @param {object} payload - Generation parameters
 * @param {string} payload.title - Track title (max 80 chars)
 * @param {string} payload.tags - Style tags for the background (max 200 chars)
 * @param {string} payload.negativeTags - Tags to avoid (max 200 chars)
 * @param {string} [payload.model] - AI model version (default V5)
 * @returns {Promise<string>} The task ID
 */
export async function addInstrumental(uploadUrl, payload) {
  log.info('Submitting add-instrumental request...', {
    title: payload.title,
    uploadUrl: uploadUrl.substring(0, 50) + '...',
  });

  const requestBody = {
    uploadUrl: uploadUrl,
    title: payload.title,
    tags: payload.tags,
    negativeTags: payload.negativeTags,
    model: payload.model || 'V5',
    callBackUrl: payload.callBackUrl || 'https://example.com/callback',
    // Optional enhancement parameters
    styleWeight: payload.styleWeight || 0.6,
    weirdnessConstraint: payload.weirdnessConstraint || 0.2,
    audioWeight: payload.audioWeight || 0.7,
  };

  log.debug('Add-instrumental payload', requestBody);

  const response = await apiRequest('/api/v1/generate/add-instrumental', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  const taskId = response.data?.taskId;
  if (!taskId) {
    log.error('No task ID in response', response);
    throw new Error('No task ID returned from add-instrumental API');
  }

  log.info(`Add-instrumental task submitted`, { taskId });
  return taskId;
}

export default {
  checkApiKey,
  generateMusic,
  generateFromUpload,
  addInstrumental,
  pollStatus,
  downloadTracks,
  getTaskStatus,
  loadTrackMetadata,
};
