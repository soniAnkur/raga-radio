/**
 * Synthesizer Module
 * Renders melody events to WAV audio using pure sine wave synthesis
 *
 * Since Suno will re-synthesize the melody with proper instruments,
 * we only need a pitch-accurate reference audio. Simple sine waves suffice.
 */

import { createWriteStream } from 'fs';
import { FileWriter } from 'wav';

const SAMPLE_RATE = 44100;
const BIT_DEPTH = 16;
const CHANNELS = 1; // Mono

/**
 * Convert MIDI note number to frequency in Hz
 * A4 (MIDI 69) = 440 Hz
 */
function midiToFrequency(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Generate sine wave samples for a single note
 * @param {number} frequency - Note frequency in Hz
 * @param {number} durationSec - Duration in seconds
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {Int16Array} Audio samples
 */
function generateSineWave(frequency, durationSec, velocity = 80) {
  const numSamples = Math.floor(durationSec * SAMPLE_RATE);
  const samples = new Int16Array(numSamples);

  // Normalize velocity to amplitude (0.0 - 1.0)
  const amplitude = (velocity / 127) * 0.5; // Max 50% to avoid clipping

  // Attack and release envelope (simple ADSR)
  const attackSamples = Math.min(numSamples * 0.1, SAMPLE_RATE * 0.1); // 10% or 100ms max
  const releaseSamples = Math.min(numSamples * 0.2, SAMPLE_RATE * 0.2); // 20% or 200ms max

  for (let i = 0; i < numSamples; i++) {
    // Calculate envelope multiplier
    let envelope = 1.0;
    if (i < attackSamples) {
      envelope = i / attackSamples; // Fade in
    } else if (i > numSamples - releaseSamples) {
      envelope = (numSamples - i) / releaseSamples; // Fade out
    }

    // Generate sine wave sample
    const sample = Math.sin(2 * Math.PI * frequency * i / SAMPLE_RATE);

    // Apply envelope and amplitude, convert to 16-bit integer
    samples[i] = Math.round(sample * envelope * amplitude * 32767);
  }

  return samples;
}

/**
 * Generate silence samples
 * @param {number} durationSec - Duration in seconds
 * @returns {Int16Array} Silent audio samples
 */
function generateSilence(durationSec) {
  const numSamples = Math.floor(durationSec * SAMPLE_RATE);
  return new Int16Array(numSamples); // Initialized to zeros
}

/**
 * Render melody events to a WAV file
 * @param {Array} events - Array of note events from AlapGenerator
 * @param {string} outputPath - Path to output WAV file
 * @returns {Promise<string>} Resolves with output path when complete
 */
export async function renderToWav(events, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      // Sort events by start time
      const sortedEvents = [...events].sort((a, b) => a.startTime - b.startTime);

      // Create WAV file writer
      const writer = new FileWriter(outputPath, {
        sampleRate: SAMPLE_RATE,
        bitDepth: BIT_DEPTH,
        channels: CHANNELS,
      });

      let currentTime = 0;

      for (const event of sortedEvents) {
        // Add silence before this note if needed
        const silenceDuration = event.startTime - currentTime;
        if (silenceDuration > 0) {
          const silence = generateSilence(silenceDuration);
          writer.write(Buffer.from(silence.buffer));
        }

        // Generate note audio
        const frequency = midiToFrequency(event.midiNote);
        const noteSamples = generateSineWave(frequency, event.duration, event.velocity);
        writer.write(Buffer.from(noteSamples.buffer));

        currentTime = event.startTime + event.duration;
      }

      // Add a short silence at the end
      const endSilence = generateSilence(0.5);
      writer.write(Buffer.from(endSilence.buffer));

      writer.end();

      writer.on('done', () => {
        resolve(outputPath);
      });

      writer.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get audio info for the rendered output
 */
export function getAudioInfo(events) {
  const totalDuration = events.length > 0
    ? events[events.length - 1].startTime + events[events.length - 1].duration + 0.5
    : 0;

  return {
    sampleRate: SAMPLE_RATE,
    bitDepth: BIT_DEPTH,
    channels: CHANNELS,
    durationSeconds: totalDuration.toFixed(2),
    format: 'WAV (PCM)',
  };
}

export default { renderToWav, getAudioInfo };
