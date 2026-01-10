/**
 * Swara Converter Module
 * Single Responsibility: Convert Indian Classical Music notation to Western notation
 *
 * Reference: https://raag-hindustani.com/Notes.html
 * Convention:
 *   - Uppercase = Shuddha (natural)
 *   - Lowercase = Komal (flat)
 *   - M (uppercase) = Tivra Madhyam (sharp)
 */

// Mapping of swaras to semitone offsets from Sa (tonic)
const SWARA_TO_SEMITONE = {
  'S': { semitone: 0,  note: 'C',  name: 'Shadja',    type: 'fixed' },
  'r': { semitone: 1,  note: 'Db', name: 'Komal Re',  type: 'komal' },
  'R': { semitone: 2,  note: 'D',  name: 'Shuddha Re', type: 'shuddha' },
  'g': { semitone: 3,  note: 'Eb', name: 'Komal Ga',  type: 'komal' },
  'G': { semitone: 4,  note: 'E',  name: 'Shuddha Ga', type: 'shuddha' },
  'm': { semitone: 5,  note: 'F',  name: 'Shuddha Ma', type: 'shuddha' },
  'M': { semitone: 6,  note: 'F#', name: 'Tivra Ma',  type: 'tivra' },
  'P': { semitone: 7,  note: 'G',  name: 'Pancham',   type: 'fixed' },
  'd': { semitone: 8,  note: 'Ab', name: 'Komal Dha', type: 'komal' },
  'D': { semitone: 9,  note: 'A',  name: 'Shuddha Dha', type: 'shuddha' },
  'n': { semitone: 10, note: 'Bb', name: 'Komal Ni',  type: 'komal' },
  'N': { semitone: 11, note: 'B',  name: 'Shuddha Ni', type: 'shuddha' },
};

// All 12 Western chromatic notes
const WESTERN_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// MIDI note number for C4 (middle C)
const MIDI_MIDDLE_C = 60;

/**
 * Convert a single swara to Western notation
 * @param {string} swara - Indian swara (S, R, G, m, M, P, D, N, or lowercase for komal)
 * @param {string} tonic - The Western note that Sa is set to (default 'C')
 * @returns {object|null} Object with conversion details or null if invalid
 */
export function swaraToWestern(swara, tonic = 'C') {
  // Handle octave markers (' for higher, . for lower)
  const baseSwara = swara.replace(/['\.]/g, '');
  const octaveUp = (swara.match(/'/g) || []).length;
  const octaveDown = (swara.match(/\./g) || []).length;
  const octaveShift = octaveUp - octaveDown;

  const swaraInfo = SWARA_TO_SEMITONE[baseSwara];
  if (!swaraInfo) {
    return null;
  }

  // Calculate tonic offset
  const tonicIndex = WESTERN_NOTES.indexOf(tonic);
  const tonicOffset = tonicIndex >= 0 ? tonicIndex : 0;

  // Calculate actual semitone from C
  const actualSemitone = (swaraInfo.semitone + tonicOffset) % 12;

  // Calculate MIDI note number
  const midiNote = MIDI_MIDDLE_C + actualSemitone + (octaveShift * 12);

  return {
    swara: swara,
    baseSwara: baseSwara,
    westernNote: WESTERN_NOTES[actualSemitone],
    midiNote: midiNote,
    semitone: actualSemitone,
    intervalFromTonic: swaraInfo.semitone,
    name: swaraInfo.name,
    type: swaraInfo.type,
    octaveShift: octaveShift,
  };
}

/**
 * Convert an Indian scale notation to array of Western notes
 * @param {string} scaleIndian - Space-separated swaras like "S R G M P D N"
 * @param {string} tonic - The Western note that Sa is set to (default 'C')
 * @returns {Array} Array of conversion objects
 */
export function scaleToWestern(scaleIndian, tonic = 'C') {
  const swaras = scaleIndian.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  return swaras
    .map(s => swaraToWestern(s, tonic))
    .filter(Boolean);
}

/**
 * Get comma-separated Western note names from Indian scale
 * @param {string} scaleIndian - Space-separated swaras
 * @param {string} tonic - The Western note that Sa is set to
 * @returns {string} Comma-separated note names
 */
export function getScaleNotes(scaleIndian, tonic = 'C') {
  const notes = scaleToWestern(scaleIndian, tonic);
  return notes.map(n => n.westernNote).join(', ');
}

/**
 * Get comma-separated MIDI note numbers from Indian scale
 * @param {string} scaleIndian - Space-separated swaras
 * @param {string} tonic - The Western note that Sa is set to
 * @returns {string} Comma-separated MIDI numbers
 */
export function getMidiNotes(scaleIndian, tonic = 'C') {
  const notes = scaleToWestern(scaleIndian, tonic);
  return notes.map(n => n.midiNote).join(', ');
}

/**
 * Get semitone intervals between consecutive notes
 * @param {string} scaleIndian - Space-separated swaras
 * @returns {string} Space-separated intervals in semitones
 */
export function getIntervals(scaleIndian) {
  const notes = scaleToWestern(scaleIndian, 'C');
  const intervals = [];

  for (let i = 1; i < notes.length; i++) {
    let diff = notes[i].intervalFromTonic - notes[i - 1].intervalFromTonic;
    if (diff < 0) diff += 12;
    intervals.push(diff);
  }

  return intervals.join(' ');
}

/**
 * Get notes that are NOT in the given scale (notes to avoid)
 * @param {string} scaleIndian - Space-separated swaras
 * @param {string} tonic - The Western note that Sa is set to
 * @returns {Array} Array of Western notes to avoid
 */
export function getAvoidNotes(scaleIndian, tonic = 'C') {
  const scaleNotes = new Set(getScaleNotes(scaleIndian, tonic).split(', '));
  return WESTERN_NOTES.filter(note => !scaleNotes.has(note));
}

/**
 * Get all Western chromatic notes
 * @returns {Array} Array of all 12 Western notes
 */
export function getAllWesternNotes() {
  return [...WESTERN_NOTES];
}

/**
 * Get all swara mappings
 * @returns {object} The swara to semitone mapping object
 */
export function getSwaraMappings() {
  return { ...SWARA_TO_SEMITONE };
}

// CLI test when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Swara Converter Test\n');
  console.log('Testing Raga Yaman scale: S R G M P D N');
  console.log('Western Notes:', getScaleNotes('S R G M P D N'));
  console.log('MIDI Notes:', getMidiNotes('S R G M P D N'));
  console.log('Intervals:', getIntervals('S R G M P D N'));
  console.log('Avoid Notes:', getAvoidNotes('S R G M P D N').join(', '));
}
