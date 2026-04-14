/**
 * Raga Radio — Main Application
 * Twilight Concert Hall Edition
 */

// ============================================
// State
// ============================================
const state = {
  ragas: [],
  libraryTracks: [],
  genres: [],
  instruments: [],
  features: { enableGeneration: true },
  currentRaga: null,
  currentTrack: null,
  currentTrackIndex: -1,
  currentGenre: 'indianClassical',
  isPlaying: false,
  generatingRagas: new Set(),
  fullPlayerVisible: false,
  activeTab: 'home',
  activeFilter: 'all',
  searchQuery: '',
  autopilot: false,
  autopilotInterval: null,
  autopilotLastBlock: null,
};

// ============================================
// DOM Cache
// ============================================
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

const el = {
  // Screens
  screenHome: $('screen-home'),
  screenExplore: $('screen-explore'),
  screenLibrary: $('screen-library'),

  // Time Hero
  timeHero: $('time-hero'),
  timeGreeting: $('time-greeting'),
  timeTitle: $('time-title'),
  timeDesc: $('time-desc'),

  // Home sections
  currentTimeRagas: $('current-time-ragas'),
  homeDevotional: $('home-devotional'),
  homeRomantic: $('home-romantic'),
  homePeaceful: $('home-peaceful'),
  homeSerious: $('home-serious'),

  // Explore
  searchInput: $('search-input'),
  searchClear: $('search-clear'),
  exploreGrid: $('explore-grid'),

  // Library
  trackList: $('track-list'),
  trackCount: $('track-count'),
  totalDuration: $('total-duration'),

  // Mini Player
  miniPlayer: $('mini-player'),
  miniTitle: $('mini-title'),
  miniSubtitle: $('mini-subtitle'),
  miniArtwork: $('mini-artwork'),
  miniPlayBtn: $('mini-play-btn'),
  miniProgressFill: $('mini-progress-fill'),

  // Full Player
  fullPlayer: $('full-player'),
  fullPlayerClose: $('full-player-close'),
  fpTitle: $('fp-title'),
  fpSubtitle: $('fp-subtitle'),
  fpProgressFill: $('fp-progress-fill'),
  fpProgressKnob: $('fp-progress-knob'),
  fpProgressTrack: $('fp-progress-track'),
  fpCurrentTime: $('fp-current-time'),
  fpDuration: $('fp-duration'),
  fpPlayBtn: $('fp-play-btn'),
  fpPrev: $('fp-prev'),
  fpNext: $('fp-next'),
  fpShare: $('full-player-share'),

  // Waveform
  waveformCanvas: $('waveform-canvas'),

  // Bottom Sheet
  sheetBackdrop: $('sheet-backdrop'),
  ragaSheet: $('raga-sheet'),
  sheetTitle: $('sheet-title'),
  sheetThaat: $('sheet-thaat'),
  sheetTime: $('sheet-time'),
  sheetMood: $('sheet-mood'),
  sheetScaleIndian: $('sheet-scale-indian'),
  sheetScaleWestern: $('sheet-scale-western'),
  sheetMode: $('sheet-mode'),
  sheetDescription: $('sheet-description'),

  // Generation Banner
  genBanner: $('gen-banner'),
  genBannerSpinner: $('gen-banner-spinner'),
  genBannerTitle: $('gen-banner-title'),
  genBannerDetail: $('gen-banner-detail'),
  genBannerAction: $('gen-banner-action'),
  genBannerClose: $('gen-banner-close'),

  // Generation
  generateBtn: $('generate-btn'),
  sheetPlayBtn: $('sheet-play-btn'),
  sheetShareBtn: $('sheet-share-btn'),
  genProgress: $('gen-progress'),
  genProgressCircle: $('gen-progress-circle'),
  genStep: $('gen-step'),
  genPhase: $('gen-phase'),
  genText: $('gen-text'),
  instrumentSelector: $('instrument-selector'),
  addBackgroundMusic: $('add-background-music'),

  // Artifacts
  artifactRow: $('artifact-row'),
  artifactMidi: $('artifact-midi'),
  artifactWav: $('artifact-wav'),
  artifactMp3: $('artifact-mp3'),

  // Audio
  audioPlayer: $('audio-player'),

  // Autopilot
  autopilotToggle: $('autopilot-toggle'),
  miniAutopilotBadge: $('mini-autopilot-badge'),

  // Home Radio Player
  homeRadioTitle: $('home-radio-title'),
  homeRadioMeta: $('home-radio-meta'),
  homeRadioPlayBtn: $('home-radio-play-btn'),
  homeRadioAutoBadge: $('home-radio-auto-badge'),
  homeRadioProgressFill: $('home-radio-progress-fill'),
  homeRadioBars: $('home-radio-bars'),
};

// ============================================
// Mood Color Map
// ============================================
const MOOD_COLORS = {
  'Devotional': 'var(--mood-devotional)',
  'Romantic': 'var(--mood-romantic)',
  'Peaceful': 'var(--mood-peaceful)',
  'Serious': 'var(--mood-serious)',
  'Heroic': 'var(--mood-heroic)',
  'Playful': 'var(--mood-playful)',
  'Mysterious': '#9B7BC4',
  'Joyful': '#E8C838',
  'Light': '#8BC4A0',
  'Pathos': '#C47B8B',
  'Meditative': '#6BA098',
  'Majestic': '#C49B38',
  'Tender': '#D4A0A8',
  'Serene': '#7BADC4',
  'Melancholic': '#7B7BAD',
  'Dramatic': '#C45050',
  'Celebratory': '#D4A038',
  'Contemplative': '#8B8BAD',
};

function getMoodColor(mood) {
  return MOOD_COLORS[mood] || 'var(--accent-dim)';
}

function getTracksForRaga(ragaId) {
  return state.libraryTracks.filter(t =>
    t.ragaId === ragaId || (t.raga && t.raga.id === ragaId)
  );
}

// ============================================
// Instrument & Genre Mappings
// ============================================
const GENRE_NAMES = {
  'indianClassical': 'Indian Classical',
  'atmospheric': 'Atmospheric / Ambient',
  'metal': 'Metal / Heavy',
  'electronic': 'Electronic / EDM',
  'lofi': 'Lo-fi / Chill',
  'jazzFusion': 'Jazz Fusion',
  'worldFusion': 'World Fusion',
  'orchestral': 'Orchestral / Cinematic'
};

const INSTRUMENT_NAMES = {
  sitar: 'Sitar', sarod: 'Sarod', veena: 'Veena', tanpura: 'Tanpura',
  santoor: 'Santoor', bansuri: 'Bansuri', shehnai: 'Shehnai',
  tabla: 'Tabla', pakhawaj: 'Pakhawaj', mridangam: 'Mridangam',
  harmonium: 'Harmonium', vocal: 'Vocal',
  electric_guitar: 'Electric Guitar', bass_guitar: 'Bass Guitar',
  drums: 'Drums', double_bass_drums: 'Double Bass Drums',
  acoustic_guitar: 'Acoustic Guitar', piano: 'Piano', cello: 'Cello',
  strings: 'Strings', strings_section: 'Strings Section', flute: 'Flute',
  saxophone: 'Saxophone', jazz_guitar: 'Jazz Guitar',
  upright_bass: 'Upright Bass', jazz_drums: 'Jazz Drums', trumpet: 'Trumpet',
  synth_pad: 'Synth Pad', synth_lead: 'Synth Lead',
  synth_bass: 'Synth Bass', electronic_drums: 'Electronic Drums',
  '808': '808', arpeggiator: 'Arpeggiator', vocoder: 'Vocoder',
  pluck_synth: 'Pluck Synth',
  lofi_piano: 'Lo-fi Piano', mellow_guitar: 'Mellow Guitar',
  soft_drums: 'Soft Drums', bass: 'Bass', rhodes: 'Rhodes',
  vinyl_fx: 'Vinyl FX', jazz_keys: 'Jazz Keys',
  brass: 'Brass', woodwinds: 'Woodwinds', timpani: 'Timpani',
  harp: 'Harp', choir: 'Choir', french_horn: 'French Horn',
  orchestral_hits: 'Orchestral Hits',
  ambient_guitar: 'Ambient Guitar', glass_marimba: 'Glass Marimba',
  cajon: 'Cajon', didgeridoo: 'Didgeridoo', handpan: 'Handpan',
  kalimba: 'Kalimba', oud: 'Oud', djembe: 'Djembe'
};

function getInstrumentName(id) { return INSTRUMENT_NAMES[id] || id; }
function getGenreDisplayName(id) { return GENRE_NAMES[id] || id; }

function formatCategory(category) {
  const map = {
    'indian_string': 'Indian String', 'indian_wind': 'Indian Wind',
    'indian_percussion': 'Indian Percussion', 'indian_keyboard': 'Indian Keyboard',
    'indian_vocal': 'Vocal', 'western_electric': 'Electric',
    'western_acoustic': 'Acoustic', 'western_string': 'String',
    'western_keyboard': 'Keyboard', 'western_percussion': 'Percussion',
    'western_wind': 'Wind', 'jazz_wind': 'Jazz Wind',
    'jazz_string': 'Jazz String', 'jazz_brass': 'Jazz Brass',
    'jazz_percussion': 'Jazz Percussion', 'electronic': 'Electronic',
    'lofi': 'Lo-fi', 'orchestral': 'Orchestral',
    'world_fusion': 'World Fusion', 'world_percussion': 'World Percussion',
    'world_string': 'World String', 'world_wind': 'World Wind',
  };
  return map[category] || category.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================
// Time of Day
// ============================================
function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 16) return 'afternoon';
  if (hour >= 16 && hour < 22) return 'evening';
  return 'night';
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 22) return 'Good Evening';
  return 'Good Night';
}

const TIME_INFO = {
  morning: { title: 'Morning Ragas', desc: '4 AM – 10 AM · Sunrise melodies', filter: 'morning' },
  afternoon: { title: 'Afternoon Ragas', desc: '10 AM – 4 PM · Midday compositions', filter: 'afternoon' },
  evening: { title: 'Evening Ragas', desc: '4 PM – 10 PM · Sunset melodies', filter: 'evening' },
  night: { title: 'Night Ragas', desc: '10 PM – 4 AM · Moonlit compositions', filter: 'night' },
};

function updateTimeHero() {
  const tod = getTimeOfDay();
  const info = TIME_INFO[tod];
  el.timeHero.className = 'time-hero ' + tod;
  el.timeGreeting.textContent = getTimeGreeting();
  el.timeTitle.textContent = info.title;
  el.timeDesc.textContent = info.desc;
}

// ============================================
// Tab Navigation
// ============================================
function switchTab(tabName) {
  state.activeTab = tabName;

  // Update tab buttons
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));

  // Update screens
  const screens = { home: el.screenHome, explore: el.screenExplore, library: el.screenLibrary };
  Object.entries(screens).forEach(([key, screen]) => {
    screen.classList.toggle('active', key === tabName);
  });

  // Refresh library when switching to it
  if (tabName === 'library') fetchLibraryTracks();
}

// ============================================
// Raga Card Rendering
// ============================================
function createRagaCard(raga) {
  const card = document.createElement('div');
  card.className = 'raga-card';
  if (state.generatingRagas.has(raga.id)) card.classList.add('generating');
  card.dataset.ragaId = raga.id;
  card.dataset.mood = (raga.mood && raga.mood[0]) || 'Peaceful';

  const moods = raga.mood || [];
  const primaryMood = moods[0] || 'Peaceful';
  const moodColor = getMoodColor(primaryMood);

  // Unique geometric pattern per raga based on name hash
  const hash = raga.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const patternRotation = hash % 360;
  const patternScale = 0.8 + (hash % 5) * 0.1;
  const patternType = hash % 4;

  const patterns = [
    `<circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.15"/>
     <circle cx="50" cy="50" r="18" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.1"/>`,
    `<polygon points="50,20 80,70 20,70" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.12"/>
     <polygon points="50,35 65,60 35,60" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.08"/>`,
    `<rect x="25" y="25" width="50" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.12" transform="rotate(45 50 50)"/>`,
    `<path d="M50 20 Q80 50 50 80 Q20 50 50 20Z" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.12"/>`,
  ];

  const ragaTracks = getTracksForRaga(raga.id);
  const hasTrack = ragaTracks.length > 0;

  card.innerHTML = `
    <div class="raga-card-art">
      <div class="raga-card-art-bg" style="background: linear-gradient(${patternRotation}deg, ${moodColor} 0%, transparent 80%)"></div>
      <svg viewBox="0 0 100 100" class="raga-card-pattern" style="transform: rotate(${patternRotation}deg) scale(${patternScale})">
        ${patterns[patternType]}
      </svg>
      <svg viewBox="0 0 24 24" class="raga-card-note"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor"/></svg>
      ${hasTrack ? `<button class="raga-card-play-btn" title="Play">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
      </button>` : ''}
    </div>
    <div class="raga-card-body">
      <div class="raga-card-name">${raga.name}</div>
      <div class="raga-card-meta">
        <span class="raga-card-mood">
          <span class="raga-card-mood-dot" style="background: ${moodColor}"></span>
          ${primaryMood}
        </span>
        ${hasTrack ? `<span class="raga-card-track-badge">${ragaTracks.length}</span>` : ''}
      </div>
    </div>
  `;

  card.addEventListener('click', () => openRagaSheet(raga));

  if (hasTrack) {
    const playBtn = card.querySelector('.raga-card-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const track = ragaTracks[0];
        state.currentTrack = track;
        state.currentTrackIndex = state.libraryTracks.indexOf(track);
        playTrack(track.url, track.raga || raga, track.raga?.thaat ? `${track.raga.thaat} Thaat` : '');
      });
    }
  }

  return card;
}

function getRagaTimeCategory(raga) {
  const time = (raga.time || '').toLowerCase();
  if (time.includes('morning') || time.includes('4 am') || time.includes('sunrise') || time.includes('dawn')) return 'morning';
  if (time.includes('afternoon') || time.includes('10 am') || time.includes('midday') || time.includes('noon')) return 'afternoon';
  if (time.includes('evening') || time.includes('4 pm') || time.includes('sunset') || time.includes('dusk')) return 'evening';
  if (time.includes('night') || time.includes('10 pm') || time.includes('midnight') || time.includes('late')) return 'night';
  return 'evening'; // default
}

function getRagaMoods(raga) {
  return (raga.mood || []).map(m => m.toLowerCase());
}

// ============================================
// Home Screen Rendering
// ============================================
function renderHome() {
  const tod = getTimeOfDay();
  const ragas = state.ragas;

  // Current time ragas
  const timeRagas = ragas.filter(r => getRagaTimeCategory(r) === tod);
  renderHorizontalScroll(el.currentTimeRagas, timeRagas);

  // Mood sections
  const moodSections = {
    devotional: el.homeDevotional,
    romantic: el.homeRomantic,
    peaceful: el.homePeaceful,
    serious: el.homeSerious,
  };

  Object.entries(moodSections).forEach(([mood, container]) => {
    const filtered = ragas.filter(r => getRagaMoods(r).includes(mood));
    renderHorizontalScroll(container, filtered);
  });
}

function renderHorizontalScroll(container, ragas) {
  container.innerHTML = '';
  if (ragas.length === 0) {
    container.innerHTML = '<span style="color: var(--text-3); font-size: var(--text-sm); padding: var(--sp-3);">No ragas found</span>';
    return;
  }
  ragas.forEach(raga => container.appendChild(createRagaCard(raga)));
}

// ============================================
// Explore Screen Rendering
// ============================================
function renderExplore() {
  let ragas = state.ragas;

  // Filter
  if (state.activeFilter !== 'all') {
    const filter = state.activeFilter;
    const timeFilters = ['morning', 'afternoon', 'evening', 'night'];
    if (timeFilters.includes(filter)) {
      ragas = ragas.filter(r => getRagaTimeCategory(r) === filter);
    } else {
      ragas = ragas.filter(r => getRagaMoods(r).includes(filter));
    }
  }

  // Search
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    ragas = ragas.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.thaat || '').toLowerCase().includes(q) ||
      (r.mood || []).some(m => m.toLowerCase().includes(q))
    );
  }

  el.exploreGrid.innerHTML = '';
  ragas.forEach(raga => el.exploreGrid.appendChild(createRagaCard(raga)));
}

// ============================================
// Library Rendering
// ============================================
function renderLibrary() {
  const tracks = state.libraryTracks;
  el.trackCount.textContent = tracks.length;

  if (tracks.length === 0) {
    el.trackList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 48 48"><path d="M24 4v22.1C22.8 25.4 21.5 25 20 25c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8V12h8V4H24z" fill="currentColor" opacity="0.3"/></svg>
        </div>
        <p class="empty-state-title">No tracks yet</p>
        <p class="empty-state-desc">Generate your first raga from the Home or Explore tabs</p>
      </div>
    `;
    el.totalDuration.textContent = '0:00';
    return;
  }

  el.trackList.innerHTML = tracks.map((track, index) => {
    const raga = track.raga;
    const ragaName = raga ? raga.name : track.ragaKey || track.ragaName || 'Unknown';
    const genre = track.genre || 'indianClassical';
    const trackMood = (raga?.mood && raga.mood[0]) || 'Peaceful';
    const trackMoodImg = getMoodImage(trackMood);

    return `
      <div class="track-item" data-index="${index}">
        <div class="track-artwork">
          <div class="track-artwork-bg" style="background-image: url('${trackMoodImg}')"></div>
          <div class="track-artwork-glass"></div>
          <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor"/></svg>
        </div>
        <div class="track-info">
          <div class="track-title">Raga ${ragaName}</div>
          <div class="track-meta">${getGenreDisplayName(genre)}</div>
        </div>
        <div class="track-actions">
          <button class="track-action-btn" onclick="event.stopPropagation(); shareTrackByIndex(${index})" title="Share">
            <svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
          </button>
          <button class="track-action-btn play-btn" onclick="event.stopPropagation(); playLibraryTrack(${index})" title="Play">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Click to show details
  $$('.track-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.track-action-btn')) {
        showTrackDetails(parseInt(item.dataset.index));
      }
    });
  });
}

// ============================================
// Bottom Sheet
// ============================================
// Map moods to image files
const MOOD_IMAGES = {
  'Devotional': '/images/moods/devotional.jpg',
  'Romantic': '/images/moods/romantic.jpg',
  'Peaceful': '/images/moods/peaceful.jpg',
  'Serious': '/images/moods/serious.jpg',
  'Mysterious': '/images/moods/serious.jpg',
  'Meditative': '/images/moods/peaceful.jpg',
  'Heroic': '/images/moods/devotional.jpg',
  'Joyful': '/images/moods/devotional.jpg',
  'Pathos': '/images/moods/romantic.jpg',
  'Tender': '/images/moods/romantic.jpg',
  'Melancholic': '/images/moods/serious.jpg',
  'Serene': '/images/moods/peaceful.jpg',
};

function getMoodImage(mood) {
  return MOOD_IMAGES[mood] || '/images/moods/devotional.jpg';
}

function updateSheetArtwork(mood) {
  const artwork = document.querySelector('.sheet-artwork');
  if (!artwork) return;
  // Remove old dynamic layers
  artwork.querySelectorAll('.sheet-artwork-bg, .sheet-artwork-glass').forEach(el => el.remove());
  // Add mood image background
  const bg = document.createElement('div');
  bg.className = 'sheet-artwork-bg';
  bg.style.backgroundImage = `url('${getMoodImage(mood)}')`;
  const glass = document.createElement('div');
  glass.className = 'sheet-artwork-glass';
  artwork.insertBefore(glass, artwork.firstChild);
  artwork.insertBefore(bg, artwork.firstChild);
}

function openRagaSheet(raga) {
  state.currentRaga = raga;

  el.sheetTitle.textContent = `Raga ${raga.name}`;
  el.sheetThaat.textContent = raga.thaat ? `${raga.thaat} Thaat` : 'Hindustani Classical';

  // Update artwork with mood image
  const primaryMood = (raga.mood && raga.mood[0]) || 'Peaceful';
  updateSheetArtwork(primaryMood);
  el.sheetTime.textContent = raga.time || '—';

  // Mood badges
  if (raga.mood && raga.mood.length > 0) {
    el.sheetMood.innerHTML = raga.mood.map(m =>
      `<span class="mood-badge">${m}</span>`
    ).join('');
  } else {
    el.sheetMood.textContent = '—';
  }

  el.sheetScaleIndian.textContent = raga.scaleIndian || raga.scale || '—';
  el.sheetScaleWestern.textContent = raga.westernNotes || '—';
  el.sheetMode.textContent = raga.westernMode || '—';
  el.sheetDescription.textContent = raga.description || 'A beautiful raga from the Hindustani classical tradition.';

  // Remove dynamic rows
  $$('.detail-row-dynamic').forEach(r => r.remove());

  // Show generate, hide play/share
  el.generateBtn.classList.remove('hidden');
  el.sheetPlayBtn.classList.add('hidden');
  el.sheetShareBtn.classList.add('hidden');
  el.genProgress.classList.add('hidden');

  // Hide artifacts
  if (el.artifactRow) el.artifactRow.classList.add('hidden');

  // Show generated versions for this raga
  const ragaTracks = getTracksForRaga(raga.id);
  if (ragaTracks.length > 0) {
    const tracksSection = document.createElement('div');
    tracksSection.className = 'raga-tracks-section detail-row-dynamic';
    tracksSection.innerHTML = `
      <div class="raga-tracks-header">
        <span class="detail-label">Generated Versions</span>
        <span class="raga-tracks-count">${ragaTracks.length}</span>
      </div>
      <div class="raga-tracks-list">
        ${ragaTracks.map((track, i) => {
          const genre = track.genre || 'indianClassical';
          const instruments = Array.isArray(track.instruments) ? track.instruments : (track.instrument ? [track.instrument] : []);
          const instNames = instruments.slice(0, 3).map(id => getInstrumentName(id)).join(', ');
          const duration = track.duration ? formatTime(track.duration) : '';
          const dateStr = track.createdAt ? new Date(track.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
          const trackIdx = state.libraryTracks.indexOf(track);
          return `
            <div class="raga-track-item" data-track-idx="${trackIdx}">
              <div class="raga-track-info">
                <span class="raga-track-genre">${getGenreDisplayName(genre)}</span>
                <span class="raga-track-meta">${[instNames, duration, dateStr].filter(Boolean).join(' · ')}</span>
              </div>
              <button class="raga-track-play-btn" data-track-idx="${trackIdx}" title="Play">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;
    const detailGrid = document.querySelector('#sheet-tab-details .detail-grid');
    if (detailGrid) detailGrid.after(tracksSection);

    tracksSection.querySelectorAll('.raga-track-play-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.trackIdx);
        closeSheet();
        playLibraryTrack(idx);
      });
    });
  }

  // Switch to details tab
  switchSheetTab('details');

  // Show sheet
  showSheet();

  // Suggest genre
  if (raga.id) suggestGenreForRaga(raga.id);

  // Apply feature flags
  applyFeatureFlags();
}

function showTrackDetails(index) {
  const track = state.libraryTracks[index];
  if (!track) return;

  const raga = track.raga;
  state.currentRaga = {
    ...raga,
    audioUrl: track.url,
    referenceAudioUrl: track.referenceAudioUrl,
  };

  const ragaName = raga ? raga.name : track.ragaName || 'Unknown';
  el.sheetTitle.textContent = `Raga ${ragaName}`;
  el.sheetThaat.textContent = raga ? `${raga.thaat} Thaat` : '';
  el.sheetTime.textContent = raga ? raga.time : '';

  if (raga && raga.mood && raga.mood.length > 0) {
    el.sheetMood.innerHTML = raga.mood.map(m =>
      `<span class="mood-badge">${m}</span>`
    ).join('');
  } else {
    el.sheetMood.textContent = '—';
  }

  el.sheetScaleIndian.textContent = raga ? raga.scaleIndian : '';
  el.sheetScaleWestern.textContent = raga ? raga.westernNotes : '';
  el.sheetMode.textContent = raga ? raga.westernMode : '';
  el.sheetDescription.textContent = raga?.description || 'A beautiful raga.';

  // Remove previous dynamic rows
  $$('.detail-row-dynamic').forEach(r => r.remove());

  // Add genre, instruments, date
  const instruments = Array.isArray(track.instruments) ? track.instruments : (track.instrument ? [track.instrument] : []);
  const genre = track.genre || 'indianClassical';
  const dateStr = new Date(track.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  const detailGrid = document.querySelector('#sheet-tab-details .detail-grid');
  if (detailGrid) {
    // Genre card
    const genreCard = document.createElement('div');
    genreCard.className = 'detail-card detail-row-dynamic';
    genreCard.innerHTML = `<span class="detail-label">Genre</span><span class="detail-value">${getGenreDisplayName(genre)}</span>`;
    detailGrid.appendChild(genreCard);

    // Instruments card
    if (instruments.length > 0) {
      const instCard = document.createElement('div');
      instCard.className = 'detail-card full-width detail-row-dynamic';
      instCard.innerHTML = `
        <span class="detail-label">Instruments</span>
        <span class="detail-value">${instruments.map(id => `<span class="instrument-chip">${getInstrumentName(id)}</span>`).join('')}</span>
      `;
      detailGrid.appendChild(instCard);
    }

    // Date card
    const dateCard = document.createElement('div');
    dateCard.className = 'detail-card detail-row-dynamic';
    dateCard.innerHTML = `<span class="detail-label">Created</span><span class="detail-value">${dateStr}</span>`;
    detailGrid.appendChild(dateCard);
  }

  // Artifacts
  if (el.artifactRow) {
    const hasAnyArtifact = track.midiFileUrl || track.referenceAudioUrl || track.url;
    if (hasAnyArtifact) {
      el.artifactRow.classList.remove('hidden');
      if (el.artifactMidi) {
        if (track.midiFileUrl) { el.artifactMidi.href = track.midiFileUrl; el.artifactMidi.classList.remove('disabled'); }
        else { el.artifactMidi.removeAttribute('href'); el.artifactMidi.classList.add('disabled'); }
      }
      if (el.artifactWav) {
        if (track.referenceAudioUrl) { el.artifactWav.href = track.referenceAudioUrl; el.artifactWav.classList.remove('disabled'); }
        else { el.artifactWav.removeAttribute('href'); el.artifactWav.classList.add('disabled'); }
      }
      if (el.artifactMp3) {
        if (track.url) { el.artifactMp3.href = track.url; el.artifactMp3.classList.remove('disabled'); }
        else { el.artifactMp3.removeAttribute('href'); el.artifactMp3.classList.add('disabled'); }
      }
    } else {
      el.artifactRow.classList.add('hidden');
    }
  }

  // Show play/share, hide generate
  el.generateBtn.classList.add('hidden');
  el.sheetPlayBtn.classList.remove('hidden');
  el.sheetShareBtn.classList.remove('hidden');
  el.genProgress.classList.add('hidden');

  // Wire up buttons
  el.sheetPlayBtn.onclick = () => { closeSheet(); playLibraryTrack(index); };
  el.sheetShareBtn.onclick = () => shareTrack(track);

  switchSheetTab('details');
  showSheet();
}

function showSheet() {
  el.sheetBackdrop.classList.remove('hidden');
  requestAnimationFrame(() => {
    el.sheetBackdrop.classList.add('visible');
    el.ragaSheet.classList.add('visible');
  });
}

function closeSheet() {
  el.sheetBackdrop.classList.remove('visible');
  el.ragaSheet.classList.remove('visible');
  setTimeout(() => {
    el.sheetBackdrop.classList.add('hidden');
  }, 300);
}

function switchSheetTab(tabName) {
  $$('.sheet-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  $$('.sheet-tab-content').forEach(c => {
    c.classList.toggle('active', c.id === `sheet-tab-${tabName}`);
  });
}

// ============================================
// Waveform Visualizer
// ============================================
class WaveformVisualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animationId = null;
    this.phase = 0;
    this.isPlaying = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.width = rect.width;
    this.height = rect.height;
  }

  start() {
    this.isPlaying = true;
    this.animate();
  }

  stop() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.drawStatic();
  }

  drawStatic() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height / 2);
    this.ctx.lineTo(this.width, this.height / 2);
    this.ctx.strokeStyle = 'rgba(232, 168, 56, 0.15)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  animate() {
    if (!this.isPlaying) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    const gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
    gradient.addColorStop(0, 'rgba(232, 168, 56, 0.6)');
    gradient.addColorStop(0.5, 'rgba(232, 168, 56, 0.9)');
    gradient.addColorStop(1, 'rgba(232, 168, 56, 0.6)');

    this.ctx.beginPath();
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';

    const centerY = this.height / 2;
    const amplitude = this.height * 0.35;

    for (let x = 0; x < this.width; x++) {
      const n = x / this.width;
      const wave1 = Math.sin(n * Math.PI * 4 + this.phase) * 0.5;
      const wave2 = Math.sin(n * Math.PI * 6 + this.phase * 1.3) * 0.3;
      const wave3 = Math.sin(n * Math.PI * 2 + this.phase * 0.7) * 0.2;
      const envelope = Math.sin(n * Math.PI);
      const y = centerY + (wave1 + wave2 + wave3) * amplitude * envelope;
      x === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    }

    this.ctx.stroke();
    this.ctx.shadowColor = 'rgba(232, 168, 56, 0.5)';
    this.ctx.shadowBlur = 8;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    this.phase += 0.05;
    this.animationId = requestAnimationFrame(() => this.animate());
  }
}

let waveformVisualizer = null;

// ============================================
// Full Player
// ============================================
function openFullPlayer() {
  state.fullPlayerVisible = true;
  el.fullPlayer.classList.add('visible');
  document.body.style.overflow = 'hidden';
  if (state.isPlaying && waveformVisualizer) waveformVisualizer.start();
}

function closeFullPlayer() {
  state.fullPlayerVisible = false;
  el.fullPlayer.classList.remove('visible');
  document.body.style.overflow = '';
  if (waveformVisualizer) waveformVisualizer.stop();
}

function updateFullPlayer(raga, thaat = '') {
  if (!raga) return;
  const ragaName = typeof raga === 'string' ? raga : raga.name;
  const thaatName = thaat || (raga.thaat ? `${raga.thaat} Thaat` : 'Hindustani Classical');
  el.fpTitle.textContent = `Raga ${ragaName}`;
  el.fpSubtitle.textContent = thaatName;
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// Audio Player
// ============================================
function playTrack(url, raga, thaat) {
  el.audioPlayer.src = url;
  el.audioPlayer.play().catch(console.error);
  state.isPlaying = true;

  const ragaName = typeof raga === 'string' ? raga : raga?.name || 'Unknown';
  const thaatName = thaat || (raga?.thaat ? `${raga.thaat} Thaat` : '');

  // Mini player
  el.miniPlayer.classList.remove('hidden');
  el.miniTitle.textContent = `Raga ${ragaName}`;
  el.miniSubtitle.textContent = thaatName || 'Hindustani Classical';

  // Update mini player artwork with mood image
  const miniMood = (raga?.mood && raga.mood[0]) || 'Peaceful';
  const miniArt = el.miniArtwork;
  miniArt.querySelectorAll('.mini-player-artwork-bg, .mini-player-artwork-glass').forEach(e => e.remove());
  const miniBg = document.createElement('div');
  miniBg.className = 'mini-player-artwork-bg';
  miniBg.style.backgroundImage = `url('${getMoodImage(miniMood)}')`;
  const miniGlass = document.createElement('div');
  miniGlass.className = 'mini-player-artwork-glass';
  miniArt.insertBefore(miniGlass, miniArt.firstChild);
  miniArt.insertBefore(miniBg, miniArt.firstChild);

  // Full player
  updateFullPlayer(raga, thaatName);
  updatePlayButtons(true);

  // Start waveform
  if (state.fullPlayerVisible && waveformVisualizer) waveformVisualizer.start();

  // Update home radio player
  updateHomePlayer();
}

function togglePlayPause() {
  if (state.isPlaying) {
    el.audioPlayer.pause();
    state.isPlaying = false;
    if (waveformVisualizer) waveformVisualizer.stop();
    // Add breathing effect to canvas on pause
    el.waveformCanvas.classList.add('breathing');
  } else {
    el.audioPlayer.play().catch(console.error);
    state.isPlaying = true;
    el.waveformCanvas.classList.remove('breathing');
    if (state.fullPlayerVisible && waveformVisualizer) waveformVisualizer.start();
  }
  updatePlayButtons(state.isPlaying);
  updateHomePlayer();
}

function updatePlayButtons(playing) {
  // Mini player
  el.miniPlayBtn.querySelector('.icon-play').classList.toggle('hidden', playing);
  el.miniPlayBtn.querySelector('.icon-pause').classList.toggle('hidden', !playing);
  // Full player
  el.fpPlayBtn.querySelector('.icon-play').classList.toggle('hidden', playing);
  el.fpPlayBtn.querySelector('.icon-pause').classList.toggle('hidden', !playing);
}

function playLibraryTrack(index) {
  const track = state.libraryTracks[index];
  if (!track) return;
  state.currentTrackIndex = index;
  state.currentTrack = track;
  playTrack(track.url, track.raga, track.raga?.thaat ? `${track.raga.thaat} Thaat` : '');
}

function playNextTrack() {
  if (state.libraryTracks.length === 0) return;
  const next = (state.currentTrackIndex + 1) % state.libraryTracks.length;
  playLibraryTrack(next);
}

function playPrevTrack() {
  if (state.libraryTracks.length === 0) return;
  const prev = state.currentTrackIndex <= 0 ? state.libraryTracks.length - 1 : state.currentTrackIndex - 1;
  playLibraryTrack(prev);
}

// ============================================
// Share
// ============================================
async function shareTrack(track) {
  const raga = track.raga;
  const ragaName = raga ? raga.name : track.ragaName || 'Unknown';
  const mood = raga?.mood ? raga.mood.join(', ') : '';
  const time = raga?.time || '';
  const instruments = Array.isArray(track.instruments) ? track.instruments.join(', ') : (track.instrument || '');
  const trackUrl = track.url;

  const shareTitle = `Raga ${ragaName} - Raga Radio`;
  const shareText = [
    `Raga ${ragaName}`,
    mood ? `Mood: ${mood}` : '',
    time ? `Best time: ${time}` : '',
    instruments ? `Instruments: ${instruments}` : '',
    '', 'Listen on Raga Radio'
  ].filter(Boolean).join('\n');

  if (navigator.share && navigator.canShare) {
    try {
      await navigator.share({ title: shareTitle, text: shareText, url: trackUrl });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  const fullShareText = `${shareText}\n\n${trackUrl}`;
  try {
    await navigator.clipboard.writeText(fullShareText);
    showToast('Link copied to clipboard!');
  } catch {
    showCopyModal(fullShareText);
  }
}

window.shareTrackByIndex = function(index) {
  const track = state.libraryTracks[index];
  if (track) shareTrack(track);
};

// ============================================
// Toast
// ============================================
function showToast(message, duration = 3000) {
  const toast = $('toast');
  const msg = $('toast-message');
  if (!toast || !msg) return;
  msg.textContent = message;
  toast.classList.remove('hidden');
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, duration);
}

// ============================================
// Copy Modal
// ============================================
function showCopyModal(text) {
  const modal = $('copy-modal');
  const textarea = $('copy-modal-text');
  if (!modal || !textarea) { prompt('Copy this link:', text); return; }
  textarea.value = text;
  modal.classList.remove('hidden');
  textarea.select();
}

function closeCopyModal() {
  const modal = $('copy-modal');
  if (modal) modal.classList.add('hidden');
}

// ============================================
// API Functions
// ============================================
async function fetchRagas() {
  try {
    const response = await fetch('/api/ragas');
    const data = await response.json();
    if (data.success) {
      state.ragas = data.ragas;
      renderHome();
      renderExplore();
    }
  } catch (error) {
    console.error('Failed to fetch ragas:', error);
  }
}

async function fetchLibraryTracks() {
  try {
    const response = await fetch('/api/tracks');
    const data = await response.json();
    if (data.success) {
      state.libraryTracks = data.tracks;
      renderLibrary();
      // Re-render home to update play buttons on cards
      if (state.ragas.length > 0) renderHome();
      updateHomePlayer();
    }
  } catch (error) {
    console.error('Failed to fetch library tracks:', error);
  }
}

async function fetchGenres() {
  try {
    const response = await fetch('/api/genres');
    const data = await response.json();
    if (data.success) state.genres = data.genres;
  } catch (error) {
    console.error('Failed to fetch genres:', error);
  }
}

async function fetchGenreInstruments(genreId) {
  try {
    const response = await fetch(`/api/genres/${genreId}/instruments`);
    const data = await response.json();
    if (data.success) renderInstrumentBadges(data.instruments, data.defaultInstruments);
  } catch (error) {
    console.error('Failed to fetch genre instruments:', error);
  }
}

async function fetchFeatures() {
  try {
    const response = await fetch('/api/features');
    const data = await response.json();
    if (data.success) {
      state.features = data.features;
      applyFeatureFlags();
    }
  } catch (error) {
    console.error('Failed to fetch features:', error);
  }
}

function applyFeatureFlags() {
  const generateTab = document.querySelector('.sheet-tab[data-tab="generate"]');
  if (generateTab) generateTab.style.display = state.features.enableGeneration ? '' : 'none';
  if (el.generateBtn) el.generateBtn.style.display = state.features.enableGeneration ? '' : 'none';
}

async function suggestGenreForRaga(ragaId) {
  try {
    const response = await fetch(`/api/ragas/${ragaId}/suggest-genre`);
    const data = await response.json();
    if (data.success && data.suggestedGenres.length > 0) {
      const suggested = data.suggestedGenres[0];
      setGenreChipActive(suggested.id);
      state.currentGenre = suggested.id;
      await fetchGenreInstruments(suggested.id);
    }
  } catch (error) {
    console.error('Failed to suggest genre:', error);
  }
}

// ============================================
// Instrument Badges
// ============================================
function renderInstrumentBadges(instruments, defaultInstruments = []) {
  const container = el.instrumentSelector;
  if (!container) return;

  const groups = {};
  instruments.forEach(inst => {
    const category = formatCategory(inst.category);
    if (!groups[category]) groups[category] = [];
    groups[category].push(inst);
  });

  container.innerHTML = Object.entries(groups).map(([category, items]) => `
    <div class="instrument-category">
      <span class="instrument-category-label">${category}</span>
      <div class="instrument-badges">
        ${items.map(inst => `
          <button type="button"
            class="instrument-badge ${defaultInstruments.includes(inst.id) ? 'selected' : ''}"
            data-id="${inst.id}"
            title="${inst.sunoDesc || inst.name}">
            ${inst.name}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.instrument-badge').forEach(badge => {
    badge.addEventListener('click', (e) => {
      e.preventDefault();
      badge.classList.toggle('selected');
    });
  });
}

function getSelectedInstruments() {
  const badges = $$('.instrument-badge.selected');
  const selected = Array.from(badges).map(b => b.dataset.id);
  return selected.length > 0 ? selected : ['sitar'];
}

// ============================================
// Generation
// ============================================
const GENERATION_STEPS = {
  authentic: [
    { step: 1, total: 4, phase: 'Composing Alaap', text: 'Unfolding the raga\'s opening meditation...' },
    { step: 2, total: 4, phase: 'Building Jor', text: 'Weaving rhythmic patterns into the melody...' },
    { step: 3, total: 4, phase: 'AI Rendering', text: 'Suno AI is bringing the composition to life...' },
    { step: 4, total: 4, phase: 'Finalizing', text: 'Your raga is ready...' },
  ],
  standard: [
    { step: 1, total: 3, phase: 'Composing', text: 'The raga is taking shape...' },
    { step: 2, total: 3, phase: 'Rendering', text: 'AI is weaving the melodic tapestry...' },
    { step: 3, total: 3, phase: 'Finalizing', text: 'Your raga is ready...' },
  ],
  withBackground: [
    { step: 1, total: 5, phase: 'Composing Alaap', text: 'Unfolding the raga\'s opening meditation...' },
    { step: 2, total: 5, phase: 'Building Jor', text: 'Weaving rhythmic patterns into melody...' },
    { step: 3, total: 5, phase: 'AI Rendering', text: 'Suno AI bringing the composition to life...' },
    { step: 4, total: 5, phase: 'Adding Tanpura', text: 'Layering the atmospheric drone...' },
    { step: 5, total: 5, phase: 'Finalizing', text: 'Your raga is ready...' },
  ]
};

function updateGenerationStatus(stepIndex, mode = 'authentic', customText = null) {
  const steps = GENERATION_STEPS[mode] || GENERATION_STEPS.standard;
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  el.genStep.textContent = `${currentStep.step}/${currentStep.total}`;
  el.genPhase.textContent = currentStep.phase;
  el.genText.textContent = customText || currentStep.text;

  // Update circular progress
  const circumference = 2 * Math.PI * 26; // r=26
  const progress = currentStep.step / currentStep.total;
  const offset = circumference * (1 - progress);
  el.genProgressCircle.style.strokeDashoffset = offset;
}

function getActiveMode() {
  const active = document.querySelector('#mode-control .segment.active');
  return active?.dataset.value || 'authentic';
}

function getActiveDuration() {
  const active = document.querySelector('#duration-control .duration-chip.active');
  return parseInt(active?.dataset.value || '60');
}

// ---- Generation Banner ----
function showBanner(title, detail) {
  el.genBannerTitle.textContent = title;
  el.genBannerDetail.textContent = detail;
  el.genBannerSpinner.className = 'gen-banner-spinner';
  el.genBannerAction.classList.add('hidden');
  el.genBannerClose.classList.add('hidden');
  el.genBanner.classList.remove('hidden');
  requestAnimationFrame(() => el.genBanner.classList.add('visible'));
}

function updateBanner(title, detail) {
  el.genBannerTitle.textContent = title;
  el.genBannerDetail.textContent = detail;
}

function bannerComplete(track, raga) {
  el.genBannerSpinner.classList.add('done');
  el.genBannerTitle.textContent = `${raga?.name || 'Track'} ready`;
  el.genBannerDetail.textContent = 'Tap Play to listen';
  el.genBannerAction.classList.remove('hidden');
  el.genBannerClose.classList.remove('hidden');
  el.genBannerAction.onclick = () => {
    playTrack(track.url || track.audio_url, raga);
    hideBanner();
  };
}

function bannerError(message) {
  el.genBannerSpinner.classList.add('error');
  el.genBannerTitle.textContent = 'Generation failed';
  el.genBannerDetail.textContent = message || 'Please try again';
  el.genBannerClose.classList.remove('hidden');
  setTimeout(hideBanner, 8000);
}

function hideBanner() {
  el.genBanner.classList.remove('visible');
  setTimeout(() => el.genBanner.classList.add('hidden'), 300);
}

// ---- Generation (async, non-blocking) ----
async function generateTrack() {
  const raga = state.currentRaga;
  if (!raga || !raga.id) return;

  const mode = getActiveMode();
  const genreId = state.currentGenre;
  const instruments = getSelectedInstruments();
  const duration = getActiveDuration();
  const addBgMusic = el.addBackgroundMusic?.checked || false;

  const genMode = (mode === 'authentic' && addBgMusic) ? 'withBackground' :
                  (mode === 'authentic' ? 'authentic' : 'standard');

  // Close sheet and show banner immediately
  closeSheet();
  state.generatingRagas.add(raga.id);
  updateRagaCardStates();

  const steps = GENERATION_STEPS[genMode] || GENERATION_STEPS.standard;
  showBanner(`Generating ${raga.name}`, steps[0].text);

  // Capture raga and instruments for the download step
  const genContext = { raga, genreId, instruments };

  // Run the whole pipeline async — user can keep browsing
  runGenerationPipeline(raga, mode, genMode, genContext, { genreId, instruments, duration, addBgMusic });
}

async function runGenerationPipeline(raga, mode, genMode, genContext, params) {
  const steps = GENERATION_STEPS[genMode] || GENERATION_STEPS.standard;

  try {
    const endpoint = mode === 'authentic'
      ? `/api/generate/${raga.id}/authentic`
      : `/api/generate/${raga.id}`;

    const body = { genre: params.genreId, instruments: params.instruments, duration: params.duration };
    if (mode === 'authentic') body.addBackgroundMusic = params.addBgMusic;

    updateBanner(`Generating ${raga.name}`, steps[0].text);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!data.success) {
      bannerError(data.error || 'Generation failed');
      resetGenerationState();
      return;
    }

    const taskId = data.taskId;
    if (taskId) {
      await pollGenerationStatus(taskId, genMode, genContext);
    } else if (data.tracks) {
      handleGenerationComplete(data, raga);
    }
  } catch (error) {
    console.error('Generation error:', error);
    bannerError('Network error. Please try again.');
    resetGenerationState();
  }
}

async function pollGenerationStatus(taskId, genMode, genContext) {
  const steps = GENERATION_STEPS[genMode] || GENERATION_STEPS.standard;
  const raga = genContext.raga;
  let stepIndex = 1;
  const maxAttempts = 120;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
    updateBanner(`Generating ${raga.name}`, `${currentStep.step}/${currentStep.total} · ${currentStep.phase}`);

    try {
      const response = await fetch(`/api/status/${taskId}`);
      const data = await response.json();

      if (data.success && data.status === 'complete') {
        const finalStep = steps[steps.length - 1];
        updateBanner(`Generating ${raga.name}`, `${finalStep.step}/${finalStep.total} · Downloading...`);
        await downloadTrack(taskId, genContext);
        return;
      } else if (data.status === 'error') {
        bannerError(data.error || data.errorMessage || 'Unknown error');
        resetGenerationState();
        return;
      }
    } catch (error) {
      console.error('Status poll error:', error);
    }

    if (i % 3 === 0 && stepIndex < steps.length - 1) stepIndex++;
  }

  bannerError('Generation timed out');
  resetGenerationState();
}

async function downloadTrack(taskId, genContext) {
  const raga = genContext.raga;
  try {
    const response = await fetch(`/api/download/${taskId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ragaName: raga.name,
        ragaId: raga.id,
        instruments: genContext.instruments,
        genre: genContext.genreId,
      }),
    });
    const data = await response.json();

    if (data.success) {
      handleGenerationComplete(data, raga);
    } else {
      bannerError(data.error || 'Download failed');
      resetGenerationState();
    }
  } catch (error) {
    console.error('Download error:', error);
    bannerError('Download failed');
    resetGenerationState();
  }
}

function handleGenerationComplete(data, raga) {
  const tracks = data.tracks || [];
  if (tracks.length > 0) {
    const track = tracks[0];
    state.currentTrack = track;

    // Show completion in banner with play button
    bannerComplete(track, raga);

    // Auto-play
    playTrack(track.url || track.audio_url, raga);

    // Refresh library
    fetchLibraryTracks();
  } else {
    bannerError('No tracks returned');
  }

  resetGenerationState();
}

function resetGenerationState() {
  state.generatingRagas.clear();
  updateRagaCardStates();
  // Reset in-sheet progress (in case they reopen)
  el.generateBtn.classList.remove('hidden');
  el.genProgress.classList.add('hidden');
  el.genProgress.classList.remove('active');
  el.genProgressCircle.style.strokeDashoffset = 2 * Math.PI * 26;
}

function updateRagaCardStates() {
  $$('.raga-card').forEach(card => {
    const ragaId = card.dataset.ragaId;
    card.classList.toggle('generating', state.generatingRagas.has(ragaId));
  });
}

// ============================================
// Genre/Duration Chip Helpers
// ============================================
function setGenreChipActive(value) {
  $$('.genre-chip').forEach(c => c.classList.toggle('active', c.dataset.value === value));
}

// ============================================
// Progress bar updates
// ============================================
function updateProgress() {
  if (!el.audioPlayer.duration) return;
  const pct = (el.audioPlayer.currentTime / el.audioPlayer.duration) * 100;

  // Mini player
  if (el.miniProgressFill) el.miniProgressFill.style.width = `${pct}%`;

  // Full player
  if (el.fpProgressFill) el.fpProgressFill.style.width = `${pct}%`;
  if (el.fpProgressKnob) el.fpProgressKnob.style.left = `${pct}%`;
  if (el.fpCurrentTime) el.fpCurrentTime.textContent = formatTime(el.audioPlayer.currentTime);
  if (el.fpDuration) el.fpDuration.textContent = formatTime(el.audioPlayer.duration);

  // Home radio player
  if (el.homeRadioProgressFill) el.homeRadioProgressFill.style.width = `${pct}%`;
}

// ============================================
// Autopilot Radio Mode
// ============================================
function toggleAutopilot() {
  state.autopilot = !state.autopilot;
  if (state.autopilot) {
    startAutopilot();
  } else {
    stopAutopilot();
  }
}

function startAutopilot() {
  const tod = getTimeOfDay();
  state.autopilotLastBlock = tod;

  // Play a random track for current time block if not already playing
  if (!state.isPlaying) {
    const tracksForBlock = state.libraryTracks.filter(t => {
      const raga = t.raga;
      return raga && getRagaTimeCategory(raga) === tod;
    });
    if (tracksForBlock.length > 0) {
      const track = tracksForBlock[Math.floor(Math.random() * tracksForBlock.length)];
      const idx = state.libraryTracks.indexOf(track);
      playLibraryTrack(idx);
    } else if (state.libraryTracks.length > 0) {
      // Fallback: play any available track
      playLibraryTrack(0);
    }
  }

  // Check every 30 seconds if the time block changed
  state.autopilotInterval = setInterval(autopilotTick, 30000);
  updateAutopilotUI();
  showToast('Autopilot enabled — playing ragas for this hour');
}

function stopAutopilot() {
  if (state.autopilotInterval) {
    clearInterval(state.autopilotInterval);
    state.autopilotInterval = null;
  }
  updateAutopilotUI();
  showToast('Autopilot disabled');
}

function autopilotTick() {
  if (!state.autopilot) return;
  const tod = getTimeOfDay();

  if (tod !== state.autopilotLastBlock) {
    // Time block changed — update UI and transition to new ragas
    state.autopilotLastBlock = tod;
    updateTimeHero();
    renderHome();

    const tracksForBlock = state.libraryTracks.filter(t => {
      const raga = t.raga;
      return raga && getRagaTimeCategory(raga) === tod;
    });

    if (tracksForBlock.length > 0) {
      const track = tracksForBlock[Math.floor(Math.random() * tracksForBlock.length)];
      const idx = state.libraryTracks.indexOf(track);
      playLibraryTrack(idx);
      showToast(`Transitioning to ${tod} ragas`);
    }
  } else if (!state.isPlaying) {
    // Resume playing if paused in autopilot mode
    const tracksForBlock = state.libraryTracks.filter(t => {
      const raga = t.raga;
      return raga && getRagaTimeCategory(raga) === tod;
    });
    if (tracksForBlock.length > 0) {
      const track = tracksForBlock[Math.floor(Math.random() * tracksForBlock.length)];
      const idx = state.libraryTracks.indexOf(track);
      playLibraryTrack(idx);
    }
  }
}

function updateAutopilotUI() {
  const active = state.autopilot;

  if (el.autopilotToggle) el.autopilotToggle.classList.toggle('active', active);
  if (el.miniAutopilotBadge) el.miniAutopilotBadge.classList.toggle('hidden', !active);
  if (el.homeRadioAutoBadge) el.homeRadioAutoBadge.classList.toggle('hidden', !active);

  updateHomePlayer();
}

function updateHomePlayer() {
  if (!el.homeRadioTitle) return;

  if (state.currentTrack) {
    const raga = state.currentTrack.raga;
    const ragaName = raga ? raga.name : state.currentTrack.ragaName || 'Unknown';
    const genre = state.currentTrack.genre || 'indianClassical';
    el.homeRadioTitle.textContent = `Raga ${ragaName}`;
    el.homeRadioMeta.textContent = getGenreDisplayName(genre);
  } else if (state.autopilot) {
    el.homeRadioTitle.textContent = 'Autopilot Active';
    el.homeRadioMeta.textContent = 'Waiting for tracks to be generated…';
  } else {
    el.homeRadioTitle.textContent = 'Nothing playing';
    el.homeRadioMeta.textContent = 'Tap a raga or enable Autopilot';
  }

  // Sync play/pause icon on home radio player
  const playBtn = el.homeRadioPlayBtn;
  if (playBtn) {
    playBtn.querySelector('.icon-play')?.classList.toggle('hidden', state.isPlaying);
    playBtn.querySelector('.icon-pause')?.classList.toggle('hidden', !state.isPlaying);
  }

  // Animate bars when playing
  if (el.homeRadioBars) {
    el.homeRadioBars.classList.toggle('playing', state.isPlaying);
  }
}

// ============================================
// Event Bindings
// ============================================
function init() {
  // Update time hero
  updateTimeHero();

  // Tab navigation
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Search
  el.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    el.searchClear.classList.toggle('hidden', !state.searchQuery);
    renderExplore();
  });
  el.searchClear.addEventListener('click', () => {
    state.searchQuery = '';
    el.searchInput.value = '';
    el.searchClear.classList.add('hidden');
    renderExplore();
  });

  // Filter chips
  $$('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeFilter = chip.dataset.filter;
      renderExplore();
    });
  });

  // Sheet close
  el.sheetBackdrop.addEventListener('click', closeSheet);
  $('sheet-close-btn')?.addEventListener('click', closeSheet);
  $('sheet-handle-area')?.addEventListener('click', (e) => {
    if (!e.target.closest('.sheet-close-btn')) closeSheet();
  });

  // Sheet tabs
  $$('.sheet-tab').forEach(tab => {
    tab.addEventListener('click', () => switchSheetTab(tab.dataset.tab));
  });

  // Segment control (mode)
  $$('#mode-control .segment').forEach(seg => {
    seg.addEventListener('click', () => {
      $$('#mode-control .segment').forEach(s => s.classList.remove('active'));
      seg.classList.add('active');
      // Update indicator
      const idx = seg.dataset.value === 'authentic' ? 1 : 0;
      const indicator = document.querySelector('#mode-control .segment-indicator');
      if (indicator) indicator.style.transform = `translateX(${idx * 100}%)`;
    });
  });

  // Genre chips
  $$('.genre-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      setGenreChipActive(chip.dataset.value);
      state.currentGenre = chip.dataset.value;
      fetchGenreInstruments(chip.dataset.value);
    });
  });

  // Duration chips
  $$('.duration-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.duration-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  // Generate button
  el.generateBtn.addEventListener('click', generateTrack);

  // Generation banner close
  el.genBannerClose.addEventListener('click', hideBanner);

  // Mini player controls
  el.miniPlayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayPause();
  });
  el.miniPlayer.addEventListener('click', openFullPlayer);

  // Full player controls
  el.fullPlayerClose.addEventListener('click', closeFullPlayer);
  el.fpPlayBtn.addEventListener('click', togglePlayPause);
  el.fpPrev.addEventListener('click', playPrevTrack);
  el.fpNext.addEventListener('click', playNextTrack);

  // Full player share
  el.fpShare.addEventListener('click', () => {
    if (state.currentTrack) shareTrack(state.currentTrack);
  });

  // Progress seek
  el.fpProgressTrack.addEventListener('click', (e) => {
    const rect = el.fpProgressTrack.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    if (el.audioPlayer.duration) {
      el.audioPlayer.currentTime = pct * el.audioPlayer.duration;
    }
  });

  // Audio events
  el.audioPlayer.addEventListener('timeupdate', updateProgress);
  el.audioPlayer.addEventListener('ended', () => {
    state.isPlaying = false;
    updatePlayButtons(false);
    updateHomePlayer();
    if (waveformVisualizer) waveformVisualizer.stop();
    if (state.autopilot) {
      // In autopilot: play a random track for the current time block
      const tod = getTimeOfDay();
      const tracksForBlock = state.libraryTracks.filter(t => {
        const raga = t.raga;
        return raga && getRagaTimeCategory(raga) === tod;
      });
      if (tracksForBlock.length > 0) {
        const track = tracksForBlock[Math.floor(Math.random() * tracksForBlock.length)];
        playLibraryTrack(state.libraryTracks.indexOf(track));
      } else {
        playNextTrack();
      }
    } else {
      playNextTrack();
    }
  });

  // Copy modal
  $('copy-modal-close')?.addEventListener('click', closeCopyModal);
  $('copy-modal-btn')?.addEventListener('click', () => {
    const textarea = $('copy-modal-text');
    if (textarea) {
      textarea.select();
      document.execCommand('copy');
      showToast('Copied to clipboard!');
      closeCopyModal();
    }
  });

  // Copy modal backdrop
  document.querySelector('.copy-modal-backdrop')?.addEventListener('click', closeCopyModal);

  // Autopilot toggle
  el.autopilotToggle?.addEventListener('click', toggleAutopilot);

  // Home radio player controls
  el.homeRadioPlayBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.currentTrack) {
      togglePlayPause();
    } else if (state.autopilot) {
      startAutopilot();
    }
  });
  $('home-radio-player')?.addEventListener('click', () => {
    if (state.currentTrack && !state.isPlaying) {
      // Do nothing — use play button
    } else if (state.currentTrack) {
      openFullPlayer();
    }
  });

  // Init waveform
  waveformVisualizer = new WaveformVisualizer(el.waveformCanvas);
  waveformVisualizer.drawStatic();

  // Fetch data
  fetchRagas()
    .catch(e => showToast('Failed to load ragas: ' + e.message));
  fetchGenres();
  fetchLibraryTracks();
  fetchFeatures();
  fetchGenreInstruments('indianClassical');
}

// Global error handler for debugging on mobile
window.onerror = function(msg, url, line, col, error) {
  showToast('JS Error: ' + msg);
  return false;
};
window.addEventListener('unhandledrejection', function(e) {
  showToast('Promise Error: ' + (e.reason?.message || e.reason));
});

// Start — support both direct load and dynamic injection (where DOMContentLoaded already fired)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
