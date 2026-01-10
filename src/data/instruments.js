/**
 * Instrument Database for Raga Radio
 * Complete instrument definitions with Suno-friendly descriptions
 */

export const instruments = {
  // ============ Indian Classical Instruments ============

  // String Instruments
  sitar: {
    id: 'sitar',
    name: 'Sitar',
    category: 'indian_string',
    sunoDesc: 'shimmering sitar with sympathetic strings, rich meend glides, and resonant jawari buzz',
    gmProgram: 104, // Sitar in GM
    role: 'melodic'
  },
  sarod: {
    id: 'sarod',
    name: 'Sarod',
    category: 'indian_string',
    sunoDesc: 'deep sarod with metallic resonance, expressive slides, and powerful sustain',
    gmProgram: 105, // Shamisen as substitute
    role: 'melodic'
  },
  veena: {
    id: 'veena',
    name: 'Veena',
    category: 'indian_string',
    sunoDesc: 'majestic veena with warm, meditative tones and subtle oscillations',
    gmProgram: 104,
    role: 'melodic'
  },
  tanpura: {
    id: 'tanpura',
    name: 'Tanpura',
    category: 'indian_string',
    sunoDesc: 'continuous tanpura drone creating hypnotic, meditative foundation',
    gmProgram: 104,
    role: 'drone'
  },
  santoor: {
    id: 'santoor',
    name: 'Santoor',
    category: 'indian_string',
    sunoDesc: 'crystalline santoor with bright, cascading hammer strikes',
    gmProgram: 15, // Dulcimer
    role: 'melodic'
  },

  // Wind Instruments
  bansuri: {
    id: 'bansuri',
    name: 'Bansuri',
    category: 'indian_wind',
    sunoDesc: 'breathy bansuri flute with soulful meend and gentle vibrato',
    gmProgram: 73, // Flute
    role: 'melodic'
  },
  shehnai: {
    id: 'shehnai',
    name: 'Shehnai',
    category: 'indian_wind',
    sunoDesc: 'auspicious shehnai with piercing, celebratory tone',
    gmProgram: 69, // Oboe
    role: 'melodic'
  },

  // Percussion
  tabla: {
    id: 'tabla',
    name: 'Tabla',
    category: 'indian_percussion',
    sunoDesc: 'expressive tabla drums with intricate rhythmic patterns (tala) and resonant bass',
    gmProgram: null, // Percussion
    role: 'rhythm'
  },
  pakhawaj: {
    id: 'pakhawaj',
    name: 'Pakhawaj',
    category: 'indian_percussion',
    sunoDesc: 'deep pakhawaj barrel drum with ancient rhythmic patterns',
    gmProgram: null,
    role: 'rhythm'
  },
  mridangam: {
    id: 'mridangam',
    name: 'Mridangam',
    category: 'indian_percussion',
    sunoDesc: 'Carnatic mridangam with sharp, defined strokes',
    gmProgram: null,
    role: 'rhythm'
  },

  // Keyboard/Other
  harmonium: {
    id: 'harmonium',
    name: 'Harmonium',
    category: 'indian_keyboard',
    sunoDesc: 'warm harmonium with bellows-driven sustain and gentle vibrato',
    gmProgram: 22, // Accordion
    role: 'accompaniment'
  },
  vocal: {
    id: 'vocal',
    name: 'Vocal',
    category: 'indian_vocal',
    sunoDesc: 'classical Indian vocals with ornate gamak and natural vibrato',
    gmProgram: 54, // Voice Oohs
    role: 'melodic'
  },

  // ============ Western/Modern Instruments ============

  // Electric
  electric_guitar: {
    id: 'electric_guitar',
    name: 'Electric Guitar',
    category: 'western_electric',
    sunoDesc: 'distorted electric guitar with heavy riffs and screaming leads',
    gmProgram: 30, // Overdriven Guitar
    role: 'melodic'
  },
  bass_guitar: {
    id: 'bass_guitar',
    name: 'Bass Guitar',
    category: 'western_electric',
    sunoDesc: 'deep bass guitar with punchy low-end and groove',
    gmProgram: 34, // Electric Bass
    role: 'bass'
  },
  drums: {
    id: 'drums',
    name: 'Drums',
    category: 'western_percussion',
    sunoDesc: 'powerful rock drums with driving beat and thunderous fills',
    gmProgram: null,
    role: 'rhythm'
  },
  double_bass_drums: {
    id: 'double_bass_drums',
    name: 'Double Bass Drums',
    category: 'western_percussion',
    sunoDesc: 'rapid double bass drum kicks with metal intensity',
    gmProgram: null,
    role: 'rhythm'
  },

  // Acoustic Western
  acoustic_guitar: {
    id: 'acoustic_guitar',
    name: 'Acoustic Guitar',
    category: 'western_acoustic',
    sunoDesc: 'warm acoustic guitar with fingerpicked arpeggios',
    gmProgram: 25, // Acoustic Guitar (steel)
    role: 'melodic'
  },
  piano: {
    id: 'piano',
    name: 'Piano',
    category: 'western_keyboard',
    sunoDesc: 'expressive grand piano with rich dynamics and sustain',
    gmProgram: 1, // Acoustic Grand Piano
    role: 'melodic'
  },
  cello: {
    id: 'cello',
    name: 'Cello',
    category: 'western_string',
    sunoDesc: 'soulful cello with deep, emotional bowing',
    gmProgram: 43, // Cello
    role: 'melodic'
  },
  strings: {
    id: 'strings',
    name: 'Strings',
    category: 'western_string',
    sunoDesc: 'lush string ensemble with sweeping legato',
    gmProgram: 49, // String Ensemble 1
    role: 'accompaniment'
  },
  strings_section: {
    id: 'strings_section',
    name: 'String Section',
    category: 'orchestral',
    sunoDesc: 'full orchestral strings with dramatic swells and pizzicato',
    gmProgram: 49,
    role: 'accompaniment'
  },

  // Jazz
  saxophone: {
    id: 'saxophone',
    name: 'Saxophone',
    category: 'jazz_wind',
    sunoDesc: 'smooth saxophone with jazz phrasing and soulful vibrato',
    gmProgram: 66, // Alto Sax
    role: 'melodic'
  },
  jazz_guitar: {
    id: 'jazz_guitar',
    name: 'Jazz Guitar',
    category: 'jazz_string',
    sunoDesc: 'clean jazz guitar with warm hollow-body tone',
    gmProgram: 27, // Electric Guitar (jazz)
    role: 'melodic'
  },
  upright_bass: {
    id: 'upright_bass',
    name: 'Upright Bass',
    category: 'jazz_string',
    sunoDesc: 'walking upright bass with woody acoustic tone',
    gmProgram: 33, // Acoustic Bass
    role: 'bass'
  },
  jazz_drums: {
    id: 'jazz_drums',
    name: 'Jazz Drums',
    category: 'jazz_percussion',
    sunoDesc: 'subtle jazz drums with brushwork and dynamic cymbals',
    gmProgram: null,
    role: 'rhythm'
  },
  trumpet: {
    id: 'trumpet',
    name: 'Trumpet',
    category: 'jazz_brass',
    sunoDesc: 'bright trumpet with muted tones and bebop phrasing',
    gmProgram: 57, // Trumpet
    role: 'melodic'
  },
  flute: {
    id: 'flute',
    name: 'Flute',
    category: 'western_wind',
    sunoDesc: 'airy concert flute with delicate trills',
    gmProgram: 74, // Flute
    role: 'melodic'
  },

  // Electronic/Synth
  synth_pad: {
    id: 'synth_pad',
    name: 'Synth Pad',
    category: 'electronic',
    sunoDesc: 'lush atmospheric synthesizer pads with slow attack',
    gmProgram: 89, // Pad 2 (warm)
    role: 'accompaniment'
  },
  synth_lead: {
    id: 'synth_lead',
    name: 'Synth Lead',
    category: 'electronic',
    sunoDesc: 'cutting synth lead with aggressive filter sweeps',
    gmProgram: 81, // Lead 1 (square)
    role: 'melodic'
  },
  synth_bass: {
    id: 'synth_bass',
    name: 'Synth Bass',
    category: 'electronic',
    sunoDesc: 'deep wobbling synth bass with sub frequencies',
    gmProgram: 39, // Synth Bass 1
    role: 'bass'
  },
  electronic_drums: {
    id: 'electronic_drums',
    name: 'Electronic Drums',
    category: 'electronic',
    sunoDesc: 'punchy electronic drum kit with 808 and 909 sounds',
    gmProgram: null,
    role: 'rhythm'
  },
  '808': {
    id: '808',
    name: '808',
    category: 'electronic',
    sunoDesc: 'booming 808 bass drum with long sustain',
    gmProgram: null,
    role: 'rhythm'
  },
  arpeggiator: {
    id: 'arpeggiator',
    name: 'Arpeggiator',
    category: 'electronic',
    sunoDesc: 'hypnotic arpeggiator pattern with rhythmic sequencing',
    gmProgram: 84, // Lead 5 (charang)
    role: 'accompaniment'
  },
  vocoder: {
    id: 'vocoder',
    name: 'Vocoder',
    category: 'electronic',
    sunoDesc: 'robotic vocoder with harmonic processing',
    gmProgram: 55, // Voice Lead
    role: 'melodic'
  },
  pluck_synth: {
    id: 'pluck_synth',
    name: 'Pluck Synth',
    category: 'electronic',
    sunoDesc: 'bright plucky synth with sharp attack and quick decay',
    gmProgram: 82, // Lead 3 (calliope)
    role: 'melodic'
  },

  // Lo-fi
  lofi_piano: {
    id: 'lofi_piano',
    name: 'Lo-fi Piano',
    category: 'lofi',
    sunoDesc: 'vintage piano with tape warble and subtle detuning',
    gmProgram: 2, // Electric Grand Piano
    role: 'melodic'
  },
  mellow_guitar: {
    id: 'mellow_guitar',
    name: 'Mellow Guitar',
    category: 'lofi',
    sunoDesc: 'warm mellow guitar with lo-fi saturation',
    gmProgram: 26, // Acoustic Guitar (nylon)
    role: 'melodic'
  },
  soft_drums: {
    id: 'soft_drums',
    name: 'Soft Drums',
    category: 'lofi',
    sunoDesc: 'lo-fi drums with vinyl crackle and soft hits',
    gmProgram: null,
    role: 'rhythm'
  },
  bass: {
    id: 'bass',
    name: 'Bass',
    category: 'lofi',
    sunoDesc: 'round, warm bass with subtle compression',
    gmProgram: 34,
    role: 'bass'
  },
  rhodes: {
    id: 'rhodes',
    name: 'Rhodes',
    category: 'lofi',
    sunoDesc: 'dreamy Rhodes electric piano with gentle tremolo',
    gmProgram: 5, // Electric Piano 2
    role: 'melodic'
  },
  vinyl_fx: {
    id: 'vinyl_fx',
    name: 'Vinyl FX',
    category: 'lofi',
    sunoDesc: 'vinyl crackle and ambient room noise',
    gmProgram: null,
    role: 'texture'
  },
  jazz_keys: {
    id: 'jazz_keys',
    name: 'Jazz Keys',
    category: 'lofi',
    sunoDesc: 'smooth jazz keyboard with chord voicings',
    gmProgram: 5,
    role: 'accompaniment'
  },

  // Orchestral
  brass: {
    id: 'brass',
    name: 'Brass Section',
    category: 'orchestral',
    sunoDesc: 'powerful brass section with epic fanfares',
    gmProgram: 62, // Brass Section
    role: 'accompaniment'
  },
  woodwinds: {
    id: 'woodwinds',
    name: 'Woodwinds',
    category: 'orchestral',
    sunoDesc: 'ethereal woodwind ensemble with delicate passages',
    gmProgram: 69, // Oboe
    role: 'melodic'
  },
  timpani: {
    id: 'timpani',
    name: 'Timpani',
    category: 'orchestral',
    sunoDesc: 'thunderous timpani rolls with dramatic impact',
    gmProgram: null,
    role: 'rhythm'
  },
  harp: {
    id: 'harp',
    name: 'Harp',
    category: 'orchestral',
    sunoDesc: 'shimmering harp with glissando sweeps',
    gmProgram: 47, // Orchestral Harp
    role: 'melodic'
  },
  choir: {
    id: 'choir',
    name: 'Choir',
    category: 'orchestral',
    sunoDesc: 'angelic choir with soaring harmonies',
    gmProgram: 53, // Voice Oohs
    role: 'accompaniment'
  },
  french_horn: {
    id: 'french_horn',
    name: 'French Horn',
    category: 'orchestral',
    sunoDesc: 'majestic French horn with warm, heroic tone',
    gmProgram: 61, // French Horn
    role: 'melodic'
  },
  orchestral_hits: {
    id: 'orchestral_hits',
    name: 'Orchestral Hits',
    category: 'orchestral',
    sunoDesc: 'dramatic orchestral stabs and impacts',
    gmProgram: 56, // Orchestra Hit
    role: 'accent'
  },

  // World/Fusion
  ambient_guitar: {
    id: 'ambient_guitar',
    name: 'Ambient Guitar',
    category: 'world_fusion',
    sunoDesc: 'ethereal ambient guitar with reverb washes',
    gmProgram: 28, // Electric Guitar (clean)
    role: 'accompaniment'
  },
  glass_marimba: {
    id: 'glass_marimba',
    name: 'Glass Marimba',
    category: 'world_fusion',
    sunoDesc: 'crystalline glass marimba with bell-like tones',
    gmProgram: 13, // Marimba
    role: 'melodic'
  },
  cajon: {
    id: 'cajon',
    name: 'Cajon',
    category: 'world_percussion',
    sunoDesc: 'warm cajon box drum with versatile grooves',
    gmProgram: null,
    role: 'rhythm'
  },
  didgeridoo: {
    id: 'didgeridoo',
    name: 'Didgeridoo',
    category: 'world_wind',
    sunoDesc: 'deep didgeridoo drone with circular breathing',
    gmProgram: 58, // Tuba
    role: 'drone'
  },
  handpan: {
    id: 'handpan',
    name: 'Handpan',
    category: 'world_percussion',
    sunoDesc: 'melodic handpan with ethereal steel resonance',
    gmProgram: 115, // Steel Drums
    role: 'melodic'
  },
  kalimba: {
    id: 'kalimba',
    name: 'Kalimba',
    category: 'world_percussion',
    sunoDesc: 'gentle kalimba thumb piano with bright, plucky tones',
    gmProgram: 109, // Kalimba
    role: 'melodic'
  },
  oud: {
    id: 'oud',
    name: 'Oud',
    category: 'world_string',
    sunoDesc: 'expressive oud with Middle Eastern ornamentations',
    gmProgram: 106, // Banjo
    role: 'melodic'
  },
  djembe: {
    id: 'djembe',
    name: 'Djembe',
    category: 'world_percussion',
    sunoDesc: 'African djembe with rich bass and sharp slaps',
    gmProgram: null,
    role: 'rhythm'
  }
};

/**
 * Get instruments for a specific genre
 * @param {string} genreId - The genre ID
 * @param {object} genres - The genres object (passed in to avoid circular deps)
 */
export function getInstrumentsForGenre(genreId, genres) {
  const genre = genres[genreId];
  if (!genre) return [];

  return genre.instruments.map(id => instruments[id]).filter(Boolean);
}

/**
 * Get default instruments for a genre
 * @param {string} genreId - The genre ID
 * @param {object} genres - The genres object (passed in to avoid circular deps)
 */
export function getDefaultInstruments(genreId, genres) {
  const genre = genres[genreId];
  if (!genre) return [];

  return genre.defaultInstruments || genre.instruments.slice(0, 2);
}

/**
 * Get instrument by ID
 */
export function getInstrumentById(id) {
  return instruments[id];
}

/**
 * Get all instrument IDs
 */
export function getInstrumentIds() {
  return Object.keys(instruments);
}

/**
 * Get instruments by category
 */
export function getInstrumentsByCategory(category) {
  return Object.values(instruments).filter(i => i.category === category);
}

/**
 * Build Suno-friendly instrument description
 */
export function buildInstrumentDescription(instrumentIds) {
  return instrumentIds
    .map(id => instruments[id]?.sunoDesc)
    .filter(Boolean)
    .join(', ');
}

export default instruments;
