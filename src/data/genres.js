/**
 * Genre Definitions for Raga Radio
 * Supports multiple music genres while maintaining raga authenticity in MIDI
 */

export const genres = {
  indianClassical: {
    id: 'indianClassical',
    name: 'Indian Classical',
    description: 'Traditional Hindustani/Carnatic style with authentic instruments',
    sunoTags: ['Indian Classical', 'Hindustani', 'Raga', 'Traditional', 'Modal', 'Meditative'],
    instruments: ['sitar', 'sarod', 'veena', 'tanpura', 'santoor', 'bansuri', 'shehnai', 'tabla', 'pakhawaj', 'mridangam', 'vocal', 'harmonium'],
    moodMapping: ['Devotional', 'Peaceful', 'Serious', 'Meditative', 'Romantic'],
    defaultInstruments: ['sitar', 'tabla'],
    bpmRange: { min: 40, max: 80 },
    production: 'Concert hall reverb, natural acoustic sound'
  },

  atmospheric: {
    id: 'atmospheric',
    name: 'Atmospheric / Ambient',
    description: 'Cinematic, ethereal, spacious soundscapes',
    sunoTags: ['Atmospheric', 'Ambient', 'Cinematic', 'Ethereal', 'Reverb-drenched', 'Spacious', 'Dreamy'],
    instruments: ['synth_pad', 'strings', 'piano', 'choir', 'ambient_guitar', 'glass_marimba', 'tanpura', 'bansuri', 'cello'],
    moodMapping: ['Mysterious', 'Peaceful', 'Meditative', 'Longing', 'Melancholic'],
    defaultInstruments: ['synth_pad', 'strings', 'piano'],
    bpmRange: { min: 60, max: 90 },
    production: 'Layered reverb, wide stereo, subtle modulation'
  },

  metal: {
    id: 'metal',
    name: 'Metal / Heavy',
    description: 'Heavy riffs, distorted guitars, powerful drums',
    sunoTags: ['Metal', 'Heavy', 'Powerful', 'Aggressive', 'Distorted', 'Intense', 'Progressive'],
    instruments: ['electric_guitar', 'bass_guitar', 'drums', 'double_bass_drums', 'synth_lead', 'orchestral_hits'],
    moodMapping: ['Serious', 'Majestic', 'Heroic', 'Mysterious', 'Devotional'],
    defaultInstruments: ['electric_guitar', 'bass_guitar', 'drums'],
    bpmRange: { min: 80, max: 140 },
    production: 'Heavy distortion, crushing low-end, arena reverb'
  },

  electronic: {
    id: 'electronic',
    name: 'Electronic / EDM',
    description: 'Synthesizers, beats, modern production',
    sunoTags: ['Electronic', 'EDM', 'Synthesizer', 'Modern', 'Bass-heavy', 'Festival', 'Dance'],
    instruments: ['synth_lead', 'synth_bass', 'electronic_drums', '808', 'arpeggiator', 'vocoder', 'pluck_synth'],
    moodMapping: ['Joyful', 'Energetic', 'Playful', 'Romantic'],
    defaultInstruments: ['synth_lead', 'synth_bass', 'electronic_drums'],
    bpmRange: { min: 110, max: 140 },
    production: 'Punchy kicks, sidechained bass, wide stereo, festival sound'
  },

  lofi: {
    id: 'lofi',
    name: 'Lo-fi / Chill',
    description: 'Warm, nostalgic, relaxed beats',
    sunoTags: ['Lo-fi', 'Chill', 'Relaxed', 'Nostalgic', 'Warm', 'Vinyl crackle', 'Study beats'],
    instruments: ['lofi_piano', 'mellow_guitar', 'soft_drums', 'bass', 'rhodes', 'vinyl_fx', 'jazz_keys'],
    moodMapping: ['Romantic', 'Peaceful', 'Longing', 'Pathos', 'Melancholic'],
    defaultInstruments: ['lofi_piano', 'soft_drums', 'bass'],
    bpmRange: { min: 70, max: 90 },
    production: 'Tape saturation, vinyl crackle, low-pass filter, warm EQ'
  },

  jazzFusion: {
    id: 'jazzFusion',
    name: 'Jazz Fusion',
    description: 'Complex harmonies, improvisation, sophisticated',
    sunoTags: ['Jazz Fusion', 'Sophisticated', 'Complex harmonies', 'Improvisation', 'Smooth', 'Virtuosic'],
    instruments: ['saxophone', 'jazz_guitar', 'piano', 'upright_bass', 'jazz_drums', 'trumpet', 'sitar', 'flute'],
    moodMapping: ['Romantic', 'Mysterious', 'Peaceful', 'Playful'],
    defaultInstruments: ['saxophone', 'piano', 'upright_bass', 'jazz_drums'],
    bpmRange: { min: 80, max: 120 },
    production: 'Warm room reverb, dynamic range, live feel'
  },

  worldFusion: {
    id: 'worldFusion',
    name: 'World Fusion',
    description: 'Blend of Indian classical with world instruments',
    sunoTags: ['World Fusion', 'Global', 'Cross-cultural', 'Ethnic blend', 'Contemporary', 'Organic'],
    instruments: ['sitar', 'tabla', 'acoustic_guitar', 'cajon', 'didgeridoo', 'handpan', 'kalimba', 'oud', 'djembe'],
    moodMapping: ['Peaceful', 'Joyful', 'Devotional', 'Mysterious'],
    defaultInstruments: ['sitar', 'acoustic_guitar', 'cajon'],
    bpmRange: { min: 70, max: 110 },
    production: 'Natural acoustic blend, ethnic percussion, world textures'
  },

  orchestral: {
    id: 'orchestral',
    name: 'Orchestral / Cinematic',
    description: 'Full orchestra, epic, film score style',
    sunoTags: ['Orchestral', 'Cinematic', 'Epic', 'Film score', 'Dramatic', 'Full orchestra', 'Majestic'],
    instruments: ['strings_section', 'brass', 'woodwinds', 'timpani', 'harp', 'choir', 'piano', 'french_horn'],
    moodMapping: ['Majestic', 'Serious', 'Devotional', 'Mysterious', 'Heroic'],
    defaultInstruments: ['strings_section', 'brass', 'choir'],
    bpmRange: { min: 60, max: 100 },
    production: 'Concert hall reverb, wide dynamic range, cinematic layers'
  }
};

/**
 * Map raga moods to suggested genres
 * Returns genres sorted by how well they match the raga's mood
 */
export function suggestGenres(ragaMoods) {
  if (!ragaMoods || ragaMoods.length === 0) {
    return [genres.indianClassical]; // Default
  }

  const scores = {};

  for (const [genreId, genre] of Object.entries(genres)) {
    let score = 0;
    for (const mood of ragaMoods) {
      if (genre.moodMapping.includes(mood)) {
        score += 1;
      }
    }
    scores[genreId] = score;
  }

  // Sort by score descending
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([genreId]) => genres[genreId]);

  return sorted;
}

/**
 * Get default suggested genre for a raga
 */
export function getSuggestedGenre(ragaMoods) {
  const suggestions = suggestGenres(ragaMoods);
  return suggestions[0] || genres.indianClassical;
}

/**
 * Get all genre IDs
 */
export function getGenreIds() {
  return Object.keys(genres);
}

/**
 * Get genre by ID
 */
export function getGenreById(id) {
  return genres[id] || genres.indianClassical;
}

export default genres;
