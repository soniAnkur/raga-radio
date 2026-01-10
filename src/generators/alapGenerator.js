/**
 * Alap Melody Generator
 * Generates authentic Indian classical alap-style melodies following raga rules
 *
 * Alap characteristics:
 * - Slow, meditative exploration of the raga
 * - Free rhythm (no fixed tempo)
 * - Follows aaroha (ascending) and avaroha (descending) patterns
 * - Emphasizes vadi (primary note) and samvadi (secondary note)
 * - Includes pakad (signature phrase) of the raga
 */

import { swaraToWestern, scaleToWestern } from '../converters/swaraConverter.js';

// MIDI note for middle C (Sa in middle octave)
const MIDI_MIDDLE_C = 60;

/**
 * Parse a scale string into an array of swara objects
 * @param {string} scaleStr - Space-separated swaras like "S R G M P D N S'"
 * @param {string} tonic - Western tonic note (default 'C')
 * @returns {Array} Array of parsed note objects
 */
function parseScale(scaleStr, tonic = 'C') {
  if (!scaleStr || scaleStr === 'Flexible') {
    return [];
  }

  const swaras = scaleStr.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  return swaras.map(swara => {
    const converted = swaraToWestern(swara, tonic);
    return converted ? {
      swara: swara,
      baseSwara: converted.baseSwara,
      midiNote: converted.midiNote,
      octaveShift: converted.octaveShift,
    } : null;
  }).filter(Boolean);
}

/**
 * Get base swara without octave markers
 */
function getBaseSwara(swara) {
  return swara.replace(/['\.]/g, '');
}

/**
 * Alap Generator Class
 */
export class AlapGenerator {
  constructor(raga, options = {}) {
    this.raga = raga;
    this.duration = options.duration || 60; // Total duration in seconds
    this.tonic = options.tonic || 'C';

    // Parse raga patterns
    this.aarohaSequence = parseScale(raga.aaroha, this.tonic);
    this.avarohaSequence = parseScale(raga.avaroha, this.tonic);
    this.scaleNotes = parseScale(raga.scaleIndian, this.tonic);

    // Get vadi and samvadi MIDI notes
    this.vadiSwara = getBaseSwara(raga.vadi || 'G');
    this.samvadiSwara = getBaseSwara(raga.samvadi || 'N');

    // Build allowed notes sets for direction checking
    this.aarohaAllowed = new Set(this.aarohaSequence.map(n => n.baseSwara));
    this.avarohaAllowed = new Set(this.avarohaSequence.map(n => n.baseSwara));

    // All unique notes in the raga (for weighted selection)
    this.allNotes = this.buildAllNotes();
  }

  /**
   * Build a list of all unique notes with their weights
   */
  buildAllNotes() {
    const noteMap = new Map();

    // Add all scale notes
    for (const note of this.scaleNotes) {
      if (!noteMap.has(note.baseSwara)) {
        noteMap.set(note.baseSwara, {
          baseSwara: note.baseSwara,
          baseMidi: this.getMidiForSwara(note.baseSwara, 0),
          weight: 1,
          isVadi: note.baseSwara === this.vadiSwara,
          isSamvadi: note.baseSwara === this.samvadiSwara,
        });
      }
    }

    // Adjust weights for vadi and samvadi
    for (const [swara, noteData] of noteMap) {
      if (noteData.isVadi) {
        noteData.weight = 3; // Vadi gets 3x weight
      } else if (noteData.isSamvadi) {
        noteData.weight = 2; // Samvadi gets 2x weight
      }
    }

    return Array.from(noteMap.values());
  }

  /**
   * Get MIDI note number for a swara at a given octave shift
   */
  getMidiForSwara(baseSwara, octaveShift = 0) {
    const converted = swaraToWestern(baseSwara, this.tonic);
    if (!converted) return MIDI_MIDDLE_C;
    return converted.midiNote + (octaveShift * 12);
  }

  /**
   * Check if a note is valid for the given direction
   */
  isValidForDirection(baseSwara, direction) {
    if (direction === 'up') {
      return this.aarohaAllowed.has(baseSwara);
    } else {
      return this.avarohaAllowed.has(baseSwara);
    }
  }

  /**
   * Weighted random selection from array
   */
  weightedRandomSelect(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of items) {
      random -= item.weight;
      if (random <= 0) return item;
    }

    return items[items.length - 1];
  }

  /**
   * Get note duration based on note type
   * Vadi: longer (2-4 sec), Samvadi: medium (1.5-3 sec), Others: shorter (0.5-2 sec)
   */
  getNoteDuration(noteData) {
    const baseMin = noteData.isVadi ? 2.0 : noteData.isSamvadi ? 1.5 : 0.5;
    const baseMax = noteData.isVadi ? 4.0 : noteData.isSamvadi ? 3.0 : 2.0;
    return baseMin + Math.random() * (baseMax - baseMin);
  }

  /**
   * Get rest duration between notes (0.2 - 1.5 seconds)
   */
  getRestDuration() {
    return 0.2 + Math.random() * 1.3;
  }

  /**
   * Get velocity (volume) for a note - vadi slightly louder
   */
  getVelocity(noteData) {
    const base = 70;
    if (noteData.isVadi) return Math.min(100, base + 15);
    if (noteData.isSamvadi) return Math.min(100, base + 8);
    return base + Math.floor(Math.random() * 10);
  }

  /**
   * Generate the alap melody
   * @returns {Array} Array of note events with timing information
   */
  generate() {
    const events = [];
    let currentTime = 0;

    // Alap structure phases
    const phases = [
      { name: 'lower', duration: 0.30, octaveRange: [-1, 0], direction: 'up' },
      { name: 'ascending', duration: 0.15, octaveRange: [0, 0], direction: 'up' },
      { name: 'middle', duration: 0.25, octaveRange: [0, 0], direction: 'both' },
      { name: 'upper-touch', duration: 0.15, octaveRange: [0, 1], direction: 'up' },
      { name: 'descending', duration: 0.10, octaveRange: [0, 1], direction: 'down' },
      { name: 'return', duration: 0.05, octaveRange: [0, 0], direction: 'down' },
    ];

    for (const phase of phases) {
      const phaseDuration = this.duration * phase.duration;
      const phaseEvents = this.generatePhase(phase, currentTime, phaseDuration);
      events.push(...phaseEvents);

      if (phaseEvents.length > 0) {
        const lastEvent = phaseEvents[phaseEvents.length - 1];
        currentTime = lastEvent.startTime + lastEvent.duration;
      }

      // Add a pause between phases
      currentTime += this.getRestDuration() * 2;
    }

    return events;
  }

  /**
   * Generate notes for a single phase
   */
  generatePhase(phase, startTime, phaseDuration) {
    const events = [];
    let currentTime = startTime;
    let currentOctave = phase.octaveRange[0];
    let direction = phase.direction === 'both' ? 'up' : phase.direction;

    while (currentTime - startTime < phaseDuration) {
      // Filter notes valid for current direction
      let validNotes = this.allNotes.filter(n =>
        phase.direction === 'both' || this.isValidForDirection(n.baseSwara, direction)
      );

      if (validNotes.length === 0) {
        validNotes = this.allNotes; // Fallback to all notes
      }

      // Select next note
      const selectedNote = this.weightedRandomSelect(validNotes);

      // Determine octave based on phase range
      const octaveOptions = [];
      for (let o = phase.octaveRange[0]; o <= phase.octaveRange[1]; o++) {
        octaveOptions.push(o);
      }
      const octave = octaveOptions[Math.floor(Math.random() * octaveOptions.length)];

      // Calculate MIDI note with octave
      const midiNote = selectedNote.baseMidi + (octave * 12);

      // Get duration for this note
      const duration = this.getNoteDuration(selectedNote);

      events.push({
        midiNote: midiNote,
        swara: selectedNote.baseSwara,
        startTime: currentTime,
        duration: duration,
        velocity: this.getVelocity(selectedNote),
        isVadi: selectedNote.isVadi,
        isSamvadi: selectedNote.isSamvadi,
        octave: octave,
      });

      currentTime += duration + this.getRestDuration();

      // Update direction for 'both' phases
      if (phase.direction === 'both' && Math.random() < 0.3) {
        direction = direction === 'up' ? 'down' : 'up';
      }
    }

    return events;
  }

  /**
   * Get summary of generated melody
   */
  static getSummary(events) {
    const vadiCount = events.filter(e => e.isVadi).length;
    const samvadiCount = events.filter(e => e.isSamvadi).length;
    const totalDuration = events.length > 0
      ? events[events.length - 1].startTime + events[events.length - 1].duration
      : 0;

    return {
      noteCount: events.length,
      totalDuration: totalDuration.toFixed(2),
      vadiCount,
      samvadiCount,
      uniqueNotes: new Set(events.map(e => e.swara)).size,
    };
  }
}

export default AlapGenerator;
