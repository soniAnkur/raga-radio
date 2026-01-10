/**
 * MIDI Builder Module
 * Creates MIDI files from melody events using midi-writer-js
 */

import MidiWriter from 'midi-writer-js';

/**
 * Convert seconds to MIDI ticks
 * At tempo 60 BPM: 1 beat = 1 second, 128 ticks per beat
 */
function secondsToTicks(seconds, tempo = 60, ticksPerBeat = 128) {
  return Math.round(seconds * ticksPerBeat * (tempo / 60));
}

/**
 * Build a MIDI file from melody events
 * @param {Array} events - Array of note events from AlapGenerator
 * @param {Object} options - MIDI options
 * @returns {Uint8Array} MIDI file as buffer
 */
export function buildMidi(events, options = {}) {
  const {
    tempo = 45, // Very slow for alap (45 BPM)
    instrument = 104, // GM Sitar (104 in GM standard)
    trackName = 'Raga Melody',
  } = options;

  const track = new MidiWriter.Track();

  // Set track name
  track.addTrackName(trackName);

  // Set tempo
  track.setTempo(tempo);

  // Set instrument (program change)
  track.addEvent(new MidiWriter.ProgramChangeEvent({
    instrument: instrument
  }));

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => a.startTime - b.startTime);

  let previousEndTime = 0;

  for (const event of sortedEvents) {
    // Calculate wait time (rest before this note)
    const waitSeconds = event.startTime - previousEndTime;
    const waitTicks = Math.max(0, secondsToTicks(waitSeconds, tempo));

    // Calculate note duration in ticks
    const durationTicks = secondsToTicks(event.duration, tempo);

    // Create note event
    const noteEvent = new MidiWriter.NoteEvent({
      pitch: [event.midiNote],
      duration: `T${durationTicks}`,
      velocity: event.velocity || 80,
      wait: waitTicks > 0 ? `T${waitTicks}` : 0,
    });

    track.addEvent(noteEvent);

    previousEndTime = event.startTime + event.duration;
  }

  // Build the MIDI file
  const writer = new MidiWriter.Writer([track]);
  return writer.buildFile();
}

/**
 * Build MIDI and return as base64 string
 */
export function buildMidiBase64(events, options = {}) {
  const midiBuffer = buildMidi(events, options);
  return Buffer.from(midiBuffer).toString('base64');
}

/**
 * Get MIDI file info
 */
export function getMidiInfo(events, options = {}) {
  const tempo = options.tempo || 45;
  const totalDuration = events.length > 0
    ? events[events.length - 1].startTime + events[events.length - 1].duration
    : 0;

  return {
    noteCount: events.length,
    tempo: tempo,
    durationSeconds: totalDuration.toFixed(2),
    format: 'SMF Type 0',
  };
}

export default { buildMidi, buildMidiBase64, getMidiInfo };
