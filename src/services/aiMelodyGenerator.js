/**
 * AI-Powered Melody Generator
 * Uses OpenAI API to generate musically authentic raga melodies
 *
 * Key features:
 * - Strictly follows aaroha (ascending) / avaroha (descending) sequences
 * - Includes pakad (signature phrases) naturally
 * - Creates musical phrasing with proper structure
 * - Emphasizes vadi/samvadi with musical intent
 * - NEW: Alap-Jor-Jhala three-phase structure
 * - NEW: Ornamentations (meend, gamak, kan swaras)
 */

import OpenAI from 'openai';
import { swaraToWestern } from '../converters/swaraConverter.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('AIMelody');

// MIDI note for middle C (Sa in middle octave)
const MIDI_MIDDLE_C = 60;

// Swara order for validation (base swaras without accidentals)
const SWARA_ORDER = ['S', 'r', 'R', 'g', 'G', 'm', 'M', 'P', 'd', 'D', 'n', 'N'];

// Phase timing percentages
const PHASE_TIMING = {
  alap: { start: 0, end: 0.35 },    // 35% - slow, meditative
  jor: { start: 0.35, end: 0.70 },  // 35% - rhythmic pulse
  jhala: { start: 0.70, end: 1.0 }  // 30% - fast climax
};

/**
 * Check if OpenAI API is configured
 */
export function isAIConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Create OpenAI client
 */
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not found in environment variables');
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Build the AI prompt for melody generation with Alap-Jor-Jhala structure
 */
function buildMelodyPrompt(raga, options = {}) {
  const { duration = 60 } = options;

  // Calculate notes needed for each phase
  const alapDuration = duration * 0.35;
  const jorDuration = duration * 0.35;
  const jhalaDuration = duration * 0.30;

  // Alap: longer notes, Jor: medium, Jhala: short
  const alapNotes = Math.ceil(alapDuration / 2.5);  // ~2.5 sec avg
  const jorNotes = Math.ceil(jorDuration / 1.0);    // ~1.0 sec avg
  const jhalaNotes = Math.ceil(jhalaDuration / 0.4); // ~0.4 sec avg

  return `You are a master Hindustani classical musician composing a complete raga performance with traditional Alap-Jor-Jhala structure.

RAGA: ${raga.name}
- Thaat: ${raga.thaat}
- Time: ${raga.time}
- Mood: ${raga.mood.join(', ')}
- Aaroha: ${raga.aaroha}
- Avaroha: ${raga.avaroha}
- Vadi (king note): ${raga.vadi}
- Samvadi (queen note): ${raga.samvadi}
${raga.pakad ? `- Pakad: ${raga.pakad}` : ''}
${raga.special ? `- Special rule: ${raga.special}` : ''}

SCALE NOTES (lowercase=komal, uppercase=shuddha, M=teevra):
S=Sa, r=komal Re, R=shuddha Re, g=komal Ga, G=shuddha Ga,
m=shuddha Ma, M=teevra Ma, P=Pa, d=komal Dha, D=shuddha Dha, n=komal Ni, N=shuddha Ni

OCTAVE: -1=lower, 0=middle, 1=upper

=== COMPOSITION STRUCTURE ===

PHASE 1: ALAP (~${alapNotes} notes, ${Math.round(alapDuration)} seconds)
- NO rhythm, free-flowing, meditative
- Start from lower octave (.N, .D), slowly introduce Sa
- Use LONG durations: 2-4 seconds per note
- Heavy emphasis on VADI (${raga.vadi}) - hold it longest
- Include MEEND (glides) between notes - especially to/from vadi
- Explore: lower octave → middle octave → touch upper Sa → descend
- Dynamics: soft, intimate, introspective

PHASE 2: JOR (~${jorNotes} notes, ${Math.round(jorDuration)} seconds)
- Introduce PULSE (rhythmic feel, but no tabla)
- MEDIUM durations: 0.5-1.5 seconds per note
- Play PAKAD phrase 2-3 times naturally woven in
- Use GAMAK (oscillation) on important notes
- More active movement, building energy
- Balance aaroha and avaroha phrases

PHASE 3: JHALA (~${jhalaNotes} notes, ${Math.round(jhalaDuration)} seconds)
- FAST, energetic climax
- SHORT durations: 0.2-0.5 seconds
- Rapid aaroha-avaroha runs
- Build to CLIMAX on upper Sa (S' octave 1)
- Gradually descend to conclude on middle Sa
- Use KAN SWARAS (grace notes) for ornamentation

=== NOTE TYPES ===

REGULAR NOTE:
{"swara": "G", "octave": 0, "duration": 2.0, "velocity": 75, "phase": "alap"}

MEEND (glide between notes) - mainly in alap:
{"type": "meend", "from": "S", "fromOctave": 0, "to": "G", "toOctave": 0, "duration": 2.5, "phase": "alap"}

GAMAK (oscillation on note) - mainly in jor:
{"type": "gamak", "swara": "P", "octave": 0, "duration": 1.0, "oscillations": 3, "phase": "jor"}

KAN SWARA (grace note before main) - mainly in jhala:
{"type": "kan", "grace": "R", "graceOctave": 0, "main": "G", "mainOctave": 0, "duration": 0.4, "phase": "jhala"}

=== STRICT RULES ===
1. Ascending passages MUST follow aaroha sequence (can skip, never go back)
2. Descending passages MUST follow avaroha sequence (can skip, never go back)
3. Vadi appears frequently, held longest, phrase endings rest on it
4. Total composition must have clear three-phase arc: slow → medium → fast → resolution

=== OUTPUT FORMAT ===
Return a JSON object with three phases:
{
  "phases": [
    {
      "name": "alap",
      "notes": [
        {"swara": "N", "octave": -1, "duration": 3.0, "velocity": 70},
        {"type": "meend", "from": "N", "fromOctave": -1, "to": "S", "toOctave": 0, "duration": 2.0},
        {"swara": "S", "octave": 0, "duration": 2.5, "velocity": 75}
      ]
    },
    {
      "name": "jor",
      "notes": [...]
    },
    {
      "name": "jhala",
      "notes": [...]
    }
  ]
}

RESPOND WITH ONLY THE JSON OBJECT, NO OTHER TEXT.`;
}

/**
 * Parse and validate AI response (handles both old flat array and new phased structure)
 */
function parseAIResponse(responseText, raga) {
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = responseText.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // New format: { phases: [...] }
    if (parsed.phases && Array.isArray(parsed.phases)) {
      log.debug('Parsed phased structure', {
        phaseCount: parsed.phases.length,
        phaseNames: parsed.phases.map(p => p.name)
      });
      return { isPhased: true, phases: parsed.phases };
    }

    // Old format: flat array of notes
    if (Array.isArray(parsed)) {
      log.debug('Parsed flat array (legacy format)', { noteCount: parsed.length });
      return { isPhased: false, notes: parsed };
    }

    throw new Error('Response is neither a phased object nor an array');
  } catch (error) {
    log.error('Failed to parse AI response', { error: error.message, response: responseText.substring(0, 200) });
    throw new Error(`Invalid JSON from AI: ${error.message}`);
  }
}

/**
 * Get MIDI note for a swara
 */
function getMidiNote(swara, octave, tonic = 'C') {
  const converted = swaraToWestern(swara, tonic);
  if (!converted) {
    log.warn(`Unknown swara: ${swara}, defaulting to Sa`);
    return MIDI_MIDDLE_C + (octave * 12);
  }
  return converted.midiNote + (octave * 12);
}

/**
 * Process a MEEND (glide) ornament - creates pitch bend effect
 */
function processMeend(note, raga, tonic, currentTime) {
  const events = [];
  const fromOctave = note.fromOctave ?? 0;
  const toOctave = note.toOctave ?? 0;
  const duration = Math.max(0.5, Math.min(4.0, note.duration || 2.0));

  const fromMidi = getMidiNote(note.from, fromOctave, tonic);
  const toMidi = getMidiNote(note.to, toOctave, tonic);

  // Create a meend as a series of short notes with pitch progression
  const steps = 6;
  const stepDuration = duration / steps;
  const pitchStep = (toMidi - fromMidi) / (steps - 1);

  for (let i = 0; i < steps; i++) {
    const currentPitch = Math.round(fromMidi + (pitchStep * i));
    events.push({
      midiNote: currentPitch,
      swara: i < steps / 2 ? note.from : note.to,
      startTime: currentTime + (i * stepDuration),
      duration: stepDuration * 1.1, // Slight overlap for legato
      velocity: 70 + (i * 2), // Gradual crescendo
      octave: i < steps / 2 ? fromOctave : toOctave,
      type: 'meend',
      ornamentType: 'meend',
      phase: note.phase,
    });
  }

  return { events, totalDuration: duration };
}

/**
 * Process a GAMAK (oscillation) ornament
 */
function processGamak(note, raga, tonic, currentTime) {
  const events = [];
  const octave = note.octave ?? 0;
  const duration = Math.max(0.3, Math.min(2.0, note.duration || 1.0));
  const oscillations = note.oscillations || 3;

  const mainMidi = getMidiNote(note.swara, octave, tonic);
  // Oscillate to upper neighbor (next swara in scale)
  const upperMidi = mainMidi + 1; // Semitone up for oscillation effect

  const oscDuration = duration / (oscillations * 2);

  for (let i = 0; i < oscillations * 2; i++) {
    const isMain = i % 2 === 0;
    events.push({
      midiNote: isMain ? mainMidi : upperMidi,
      swara: note.swara,
      startTime: currentTime + (i * oscDuration),
      duration: oscDuration * 0.9,
      velocity: isMain ? 75 : 65,
      octave,
      type: 'gamak',
      ornamentType: 'gamak',
      phase: note.phase,
    });
  }

  return { events, totalDuration: duration };
}

/**
 * Process a KAN SWARA (grace note) ornament
 */
function processKan(note, raga, tonic, currentTime) {
  const events = [];
  const graceOctave = note.graceOctave ?? 0;
  const mainOctave = note.mainOctave ?? 0;
  const totalDuration = Math.max(0.2, Math.min(1.0, note.duration || 0.4));

  const graceDuration = totalDuration * 0.15; // Grace note is very short
  const mainDuration = totalDuration * 0.85;

  const graceMidi = getMidiNote(note.grace, graceOctave, tonic);
  const mainMidi = getMidiNote(note.main, mainOctave, tonic);

  // Grace note
  events.push({
    midiNote: graceMidi,
    swara: note.grace,
    startTime: currentTime,
    duration: graceDuration,
    velocity: 55, // Softer
    octave: graceOctave,
    type: 'kan_grace',
    ornamentType: 'kan',
    phase: note.phase,
  });

  // Main note
  events.push({
    midiNote: mainMidi,
    swara: note.main,
    startTime: currentTime + graceDuration,
    duration: mainDuration,
    velocity: 75,
    octave: mainOctave,
    type: 'kan_main',
    ornamentType: 'kan',
    phase: note.phase,
  });

  return { events, totalDuration };
}

/**
 * Process a regular note
 */
function processRegularNote(note, raga, tonic, currentTime, vadiSwara, samvadiSwara) {
  const swara = note.swara || 'S';
  const octave = note.octave ?? 0;
  const duration = Math.max(0.2, Math.min(5.0, note.duration || 1.5));
  const baseSwara = swara.replace(/['\.]/g, '');

  const isVadi = baseSwara === vadiSwara;
  const isSamvadi = baseSwara === samvadiSwara;

  // Calculate velocity based on phase and note importance
  let velocity = note.velocity || 70;
  if (isVadi || note.type === 'vadi') velocity = Math.max(velocity, 85);
  else if (isSamvadi || note.type === 'samvadi') velocity = Math.max(velocity, 78);
  else if (note.type === 'held' || note.type === 'final') velocity = Math.max(velocity, 80);
  else if (note.type === 'passing') velocity = Math.min(velocity, 65);

  // Adjust velocity by phase
  if (note.phase === 'alap') velocity = Math.max(60, velocity - 5);
  else if (note.phase === 'jhala') velocity = Math.min(90, velocity + 5);

  const midiNote = getMidiNote(swara, octave, tonic);

  return {
    events: [{
      midiNote,
      swara: baseSwara,
      startTime: currentTime,
      duration,
      velocity,
      isVadi,
      isSamvadi,
      octave,
      type: note.type || 'regular',
      phase: note.phase,
    }],
    totalDuration: duration
  };
}

/**
 * Convert AI melody to event format (handles both phased and flat structures)
 */
function convertToEvents(parsedMelody, raga, tonic = 'C') {
  const events = [];
  let currentTime = 0;

  const vadiSwara = (raga.vadi || 'G').replace(/['\.]/g, '');
  const samvadiSwara = (raga.samvadi || 'N').replace(/['\.]/g, '');

  // Flatten phases into single note array with phase info
  let allNotes = [];
  if (parsedMelody.isPhased) {
    for (const phase of parsedMelody.phases) {
      for (const note of phase.notes || []) {
        allNotes.push({ ...note, phase: phase.name });
      }
    }
  } else {
    allNotes = parsedMelody.notes || parsedMelody;
  }

  log.debug('Converting notes to events', {
    totalNotes: allNotes.length,
    hasOrnaments: allNotes.some(n => n.type === 'meend' || n.type === 'gamak' || n.type === 'kan')
  });

  // Rest duration varies by phase
  const getRestDuration = (phase) => {
    if (phase === 'alap') return 0.2 + Math.random() * 0.5; // Longer rests
    if (phase === 'jor') return 0.1 + Math.random() * 0.3;  // Medium rests
    return 0.05 + Math.random() * 0.1; // Short rests for jhala
  };

  for (const note of allNotes) {
    let result;

    // Process based on note type
    if (note.type === 'meend') {
      result = processMeend(note, raga, tonic, currentTime);
    } else if (note.type === 'gamak') {
      result = processGamak(note, raga, tonic, currentTime);
    } else if (note.type === 'kan') {
      result = processKan(note, raga, tonic, currentTime);
    } else {
      result = processRegularNote(note, raga, tonic, currentTime, vadiSwara, samvadiSwara);
    }

    events.push(...result.events);
    currentTime += result.totalDuration + getRestDuration(note.phase);
  }

  return events;
}

/**
 * Validate that melody follows aaroha/avaroha rules
 * This is a soft validation - we log warnings but don't reject
 */
function validateMelody(events, raga) {
  const warnings = [];

  // Parse allowed notes from aaroha/avaroha
  const aarohaPattern = (raga.aaroha || '').split(/\s+/).map(s => s.replace(/['\.]/g, ''));
  const avarohaPattern = (raga.avaroha || '').split(/\s+/).map(s => s.replace(/['\.]/g, ''));

  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];

    // Calculate pitch direction
    const prevPitch = prev.midiNote;
    const currPitch = curr.midiNote;

    if (currPitch > prevPitch) {
      // Ascending - should follow aaroha
      const prevIdx = aarohaPattern.indexOf(prev.swara);
      const currIdx = aarohaPattern.indexOf(curr.swara);

      if (prevIdx !== -1 && currIdx !== -1 && currIdx < prevIdx) {
        warnings.push(`Ascending violation at note ${i}: ${prev.swara} -> ${curr.swara} doesn't follow aaroha`);
      }
    } else if (currPitch < prevPitch) {
      // Descending - should follow avaroha
      const prevIdx = avarohaPattern.indexOf(prev.swara);
      const currIdx = avarohaPattern.indexOf(curr.swara);

      if (prevIdx !== -1 && currIdx !== -1 && currIdx < prevIdx) {
        warnings.push(`Descending violation at note ${i}: ${prev.swara} -> ${curr.swara} doesn't follow avaroha`);
      }
    }
  }

  if (warnings.length > 0) {
    log.warn('Melody validation warnings', { count: warnings.length, first: warnings[0] });
  }

  return { valid: warnings.length === 0, warnings };
}

/**
 * Main AI Melody Generator Class
 */
export class AIMelodyGenerator {
  constructor(raga, options = {}) {
    this.raga = raga;
    this.duration = options.duration || 60;
    this.tonic = options.tonic || 'C';
    this.model = options.model || 'gpt-4o-mini'; // Fast and cost-effective
  }

  /**
   * Generate melody using AI with Alap-Jor-Jhala structure
   */
  async generate() {
    if (!isAIConfigured()) {
      throw new Error('OpenAI API not configured');
    }

    log.info('Generating AI melody', {
      raga: this.raga.name,
      duration: this.duration,
      model: this.model,
      structure: 'alap-jor-jhala'
    });

    const client = getOpenAIClient();
    const prompt = buildMelodyPrompt(this.raga, { duration: this.duration });

    try {
      const response = await client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a master Hindustani classical musician. Generate structured raga compositions in JSON format with alap-jor-jhala phases. Include ornamentations (meend, gamak, kan swaras). Output valid JSON only, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.75, // Slightly higher for creative variation
        max_tokens: 8000,  // Increased for phased structure
      });

      const responseText = response.choices[0]?.message?.content;

      if (!responseText) {
        throw new Error('Empty response from AI');
      }

      log.debug('AI response received', { length: responseText.length });

      // Parse and convert to events (handles both phased and flat structures)
      const parsedMelody = parseAIResponse(responseText, this.raga);
      const events = convertToEvents(parsedMelody, this.raga, this.tonic);

      // Validate (soft validation - logs warnings)
      const validation = validateMelody(events, this.raga);

      // Get phase breakdown for logging
      const phaseBreakdown = {};
      for (const event of events) {
        const phase = event.phase || 'unknown';
        phaseBreakdown[phase] = (phaseBreakdown[phase] || 0) + 1;
      }

      log.info('AI melody generated', {
        noteCount: events.length,
        totalDuration: events.length > 0
          ? (events[events.length - 1].startTime + events[events.length - 1].duration).toFixed(2)
          : 0,
        phases: phaseBreakdown,
        ornaments: {
          meend: events.filter(e => e.ornamentType === 'meend').length,
          gamak: events.filter(e => e.ornamentType === 'gamak').length,
          kan: events.filter(e => e.ornamentType === 'kan').length
        },
        valid: validation.valid,
        warnings: validation.warnings.length
      });

      return events;

    } catch (error) {
      log.error('AI melody generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get summary of generated melody with phase and ornamentation info
   */
  static getSummary(events) {
    const vadiCount = events.filter(e => e.isVadi).length;
    const samvadiCount = events.filter(e => e.isSamvadi).length;
    const totalDuration = events.length > 0
      ? events[events.length - 1].startTime + events[events.length - 1].duration
      : 0;

    // Count by phase
    const phases = {};
    for (const event of events) {
      const phase = event.phase || 'unknown';
      phases[phase] = (phases[phase] || 0) + 1;
    }

    // Count ornaments
    const ornaments = {
      meend: events.filter(e => e.ornamentType === 'meend').length,
      gamak: events.filter(e => e.ornamentType === 'gamak').length,
      kan: events.filter(e => e.ornamentType === 'kan').length
    };

    return {
      noteCount: events.length,
      totalDuration: totalDuration.toFixed(2),
      vadiCount,
      samvadiCount,
      uniqueNotes: new Set(events.map(e => e.swara)).size,
      phases,
      ornaments,
      generatedBy: 'AI',
      structure: 'alap-jor-jhala'
    };
  }
}

export default AIMelodyGenerator;
