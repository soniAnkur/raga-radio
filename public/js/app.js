/**
 * Raga Radio - Main Application JavaScript
 * Neomorphic UI with Waveform Visualizer
 */

// ============================================
// State
// ============================================
const state = {
  ragas: [],
  libraryTracks: [],
  genres: [],
  instruments: [],
  features: {
    enableGeneration: true, // Default to true, will be updated from server
  },
  currentRaga: null,
  currentTrack: null,
  currentTrackIndex: -1,
  currentGenre: 'indianClassical',
  isPlaying: false,
  generatingRagas: new Set(),
  fullPlayerVisible: false,
  audioContext: null,
  analyser: null,
  dataArray: null,
};

// ============================================
// DOM Elements
// ============================================
const elements = {
  // Filter Panel
  filterBtn: document.getElementById('filter-btn'),
  filterPanel: document.getElementById('filter-panel'),
  filterPanelBackdrop: document.getElementById('filter-panel-backdrop'),
  filterPanelClose: document.getElementById('filter-panel-close'),
  filterItems: document.querySelectorAll('.filter-item'),
  filterTags: document.getElementById('filter-tags'),

  // Sections
  librarySection: document.getElementById('library-section'),
  timeSection: document.getElementById('time-section'),
  moodSection: document.getElementById('mood-section'),
  allSection: document.getElementById('all-section'),

  // Library
  trackList: document.getElementById('track-list'),
  trackCount: document.getElementById('track-count'),
  totalDuration: document.getElementById('total-duration'),

  // Raga Grids
  morningRagas: document.getElementById('morning-ragas'),
  afternoonRagas: document.getElementById('afternoon-ragas'),
  eveningRagas: document.getElementById('evening-ragas'),
  nightRagas: document.getElementById('night-ragas'),
  devotionalRagas: document.getElementById('devotional-ragas'),
  romanticRagas: document.getElementById('romantic-ragas'),
  peacefulRagas: document.getElementById('peaceful-ragas'),
  seriousRagas: document.getElementById('serious-ragas'),
  allRagas: document.getElementById('all-ragas'),

  // Mini Player
  nowPlaying: document.getElementById('now-playing'),
  miniPlayerTitle: document.getElementById('mini-player-title'),
  miniPlayerSubtitle: document.getElementById('mini-player-subtitle'),
  miniPlayerArtwork: document.getElementById('mini-player-artwork'),
  playPauseBtn: document.getElementById('play-pause-btn'),
  progressFill: document.getElementById('progress-fill'),

  // Full Player
  fullPlayer: document.getElementById('full-player'),
  fullPlayerClose: document.getElementById('full-player-close'),
  fullPlayerTitle: document.getElementById('full-player-title'),
  fullPlayerSubtitle: document.getElementById('full-player-subtitle'),
  fullPlayerArtworkInner: document.getElementById('full-player-artwork-inner'),
  fullPlayerProgressFill: document.getElementById('full-player-progress-fill'),
  fullPlayerCurrentTime: document.getElementById('full-player-current-time'),
  fullPlayerDuration: document.getElementById('full-player-duration'),
  fullPlayerPlayBtn: document.getElementById('full-player-play-btn'),
  fullPlayerPrev: document.getElementById('full-player-prev'),
  fullPlayerNext: document.getElementById('full-player-next'),

  // Waveform
  waveformContainer: document.getElementById('waveform-container'),
  waveformCanvas: document.getElementById('waveform-canvas'),

  // Modal
  modal: document.getElementById('raga-modal'),
  modalClose: document.getElementById('modal-close'),
  modalTitle: document.getElementById('modal-title'),
  modalThaat: document.getElementById('modal-thaat'),
  modalArtwork: document.getElementById('modal-artwork'),
  modalTime: document.getElementById('modal-time'),
  modalMood: document.getElementById('modal-mood'),
  modalScaleIndian: document.getElementById('modal-scale-indian'),
  modalScaleWestern: document.getElementById('modal-scale-western'),
  modalMode: document.getElementById('modal-mode'),
  modalDescription: document.getElementById('modal-description'),
  generateBtn: document.getElementById('generate-btn'),
  playBtn: document.getElementById('play-btn'),
  generationStatus: document.getElementById('generation-status'),
  statusText: document.querySelector('.status-text'),

  // Generation Options
  generationOptions: document.getElementById('generation-options'),
  modeSelect: document.getElementById('mode-select'),
  genreSelect: document.getElementById('genre-select'),
  genreHint: document.getElementById('genre-hint'),
  instrumentSelect: document.getElementById('instrument-select'),
  instrumentSelector: document.getElementById('instrument-selector'),
  durationSelect: document.getElementById('duration-select'),
  instrumentGroup: document.getElementById('instrument-group'),
  durationGroup: document.getElementById('duration-group'),
  modeHint: document.getElementById('mode-hint'),
  addBackgroundMusic: document.getElementById('add-background-music'),

  // Modal Tabs
  tabDetails: document.getElementById('tab-details'),
  tabGenerate: document.getElementById('tab-generate'),

  // Artifact Buttons
  artifactButtons: document.getElementById('artifact-buttons'),
  artifactMidi: document.getElementById('artifact-midi'),
  artifactWav: document.getElementById('artifact-wav'),
  artifactMp3: document.getElementById('artifact-mp3'),

  // Generation Status (improved)
  stepNumber: document.getElementById('step-number'),
  stepTotal: document.getElementById('step-total'),
  generationProgressFill: document.getElementById('generation-progress-fill'),
  statusPhase: document.getElementById('status-phase'),

  // Audio
  audioPlayer: document.getElementById('audio-player'),
};

// ============================================
// SVG Icons (Clean, Apple-like)
// ============================================
const musicNoteIcon = '<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>';
const shareIcon = '<svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>';

// ============================================
// Modal Tab Switching
// ============================================
function switchModalTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Update content visibility
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });
}

// ============================================
// Generation Status Step Definitions
// ============================================
const GENERATION_STEPS = {
  authentic: [
    { step: 1, total: 4, phase: 'Generating Melody', text: 'Creating authentic raga melody with AI...' },
    { step: 2, total: 4, phase: 'Building Audio', text: 'Converting melody to audio...' },
    { step: 3, total: 4, phase: 'AI Processing', text: 'Suno AI is transforming the melody...' },
    { step: 4, total: 4, phase: 'Finalizing', text: 'Downloading and saving your track...' },
  ],
  standard: [
    { step: 1, total: 3, phase: 'Generating', text: 'Starting AI music generation...' },
    { step: 2, total: 3, phase: 'Processing', text: 'Creating musical variations...' },
    { step: 3, total: 3, phase: 'Finalizing', text: 'Downloading your track...' },
  ],
  withBackground: [
    { step: 1, total: 5, phase: 'Generating Melody', text: 'Creating authentic raga melody...' },
    { step: 2, total: 5, phase: 'Building Audio', text: 'Converting to audio format...' },
    { step: 3, total: 5, phase: 'AI Processing', text: 'Suno AI processing melody...' },
    { step: 4, total: 5, phase: 'Adding Background', text: 'Adding atmospheric background music...' },
    { step: 5, total: 5, phase: 'Finalizing', text: 'Downloading final track...' },
  ]
};

/**
 * Update the generation status UI
 * @param {number} stepIndex - Current step index (0-based)
 * @param {string} mode - Generation mode ('authentic', 'standard', 'withBackground')
 * @param {string} customText - Optional custom status text
 */
function updateGenerationStatus(stepIndex, mode = 'authentic', customText = null) {
  const steps = GENERATION_STEPS[mode] || GENERATION_STEPS.standard;
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  if (elements.stepNumber) elements.stepNumber.textContent = currentStep.step;
  if (elements.stepTotal) elements.stepTotal.textContent = `/${currentStep.total}`;

  if (elements.generationProgressFill) {
    const progress = (currentStep.step / currentStep.total) * 100;
    elements.generationProgressFill.style.width = `${progress}%`;
  }

  if (elements.statusPhase) elements.statusPhase.textContent = currentStep.phase;
  if (elements.statusText) elements.statusText.textContent = customText || currentStep.text;
}

// ============================================
// Toast Notification
// ============================================
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast-notification');
  const toastMessage = document.getElementById('toast-message');

  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, duration);
}

// ============================================
// Share Functionality
// ============================================
async function shareTrack(track) {
  const raga = track.raga;
  const ragaName = raga ? raga.name : track.ragaName || 'Unknown';
  const mood = raga?.mood ? raga.mood.join(', ') : '';
  const time = raga?.time || '';
  const instruments = Array.isArray(track.instruments)
    ? track.instruments.join(', ')
    : (track.instrument || '');

  // Build shareable URL
  const trackUrl = track.url;

  // Format share text
  const shareTitle = `Raga ${ragaName} - Raga Radio`;
  const shareText = [
    `Raga ${ragaName}`,
    mood ? `Mood: ${mood}` : '',
    time ? `Best time: ${time}` : '',
    instruments ? `Instruments: ${instruments}` : '',
    '',
    'Listen on Raga Radio'
  ].filter(Boolean).join('\n');

  // Try Web Share API first
  if (navigator.share && navigator.canShare) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: trackUrl
      });
      return; // Successfully shared via native API
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // User cancelled - no fallback needed
      }
      // Fall through to clipboard fallback
      console.log('Web Share API failed, falling back to clipboard:', err);
    }
  }

  // Fallback: Copy to clipboard
  const fullShareText = `${shareText}\n\n${trackUrl}`;

  try {
    await navigator.clipboard.writeText(fullShareText);
    showToast('Link copied to clipboard!');
  } catch (err) {
    // Final fallback: show copy modal with selectable text
    showCopyModal(fullShareText);
  }
}

function showCopyModal(text) {
  const modal = document.getElementById('copy-modal');
  const textarea = document.getElementById('copy-modal-text');

  if (!modal || !textarea) {
    // Ultimate fallback
    prompt('Copy this link:', text);
    return;
  }

  textarea.value = text;
  modal.classList.remove('hidden');
  textarea.select();
}

function closeCopyModal() {
  const modal = document.getElementById('copy-modal');
  if (modal) modal.classList.add('hidden');
}

function copyFromModal() {
  const textarea = document.getElementById('copy-modal-text');
  if (textarea) {
    textarea.select();
    document.execCommand('copy');
    showToast('Copied to clipboard!');
    closeCopyModal();
  }
}

// Expose share function globally for onclick handlers
window.shareTrackByIndex = function(index) {
  const track = state.libraryTracks[index];
  if (track) {
    shareTrack(track);
  }
};

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
    this.ctx.strokeStyle = '#D1D9E6';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  animate() {
    if (!this.isPlaying) return;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw smooth waveform
    const gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
    gradient.addColorStop(0, '#4A90D9');
    gradient.addColorStop(0.5, '#6BA3E0');
    gradient.addColorStop(1, '#4A90D9');

    this.ctx.beginPath();
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';

    const centerY = this.height / 2;
    const amplitude = this.height * 0.35;

    for (let x = 0; x < this.width; x++) {
      const normalizedX = x / this.width;

      // Multiple sine waves for organic look
      const wave1 = Math.sin(normalizedX * Math.PI * 4 + this.phase) * 0.5;
      const wave2 = Math.sin(normalizedX * Math.PI * 6 + this.phase * 1.3) * 0.3;
      const wave3 = Math.sin(normalizedX * Math.PI * 2 + this.phase * 0.7) * 0.2;

      // Envelope to taper at edges
      const envelope = Math.sin(normalizedX * Math.PI);

      const y = centerY + (wave1 + wave2 + wave3) * amplitude * envelope;

      if (x === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();

    // Add glow effect
    this.ctx.shadowColor = '#4A90D9';
    this.ctx.shadowBlur = 10;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    this.phase += 0.05;
    this.animationId = requestAnimationFrame(() => this.animate());
  }
}

let waveformVisualizer = null;

// ============================================
// Full Player Functions
// ============================================
function openFullPlayer() {
  state.fullPlayerVisible = true;
  elements.fullPlayer.classList.add('visible');
  document.body.style.overflow = 'hidden';

  // Start waveform if playing
  if (state.isPlaying && waveformVisualizer) {
    waveformVisualizer.start();
  }
}

function closeFullPlayer() {
  state.fullPlayerVisible = false;
  elements.fullPlayer.classList.remove('visible');
  document.body.style.overflow = '';

  // Stop waveform
  if (waveformVisualizer) {
    waveformVisualizer.stop();
  }
}

function updateFullPlayer(raga, thaat = '') {
  if (!raga) return;

  const ragaName = typeof raga === 'string' ? raga : raga.name;
  const thaatName = thaat || (raga.thaat ? `${raga.thaat} Thaat` : 'Hindustani Classical');

  elements.fullPlayerTitle.textContent = `Raga ${ragaName}`;
  elements.fullPlayerSubtitle.textContent = thaatName;
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      renderRagas();
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
    }
  } catch (error) {
    console.error('Failed to fetch library tracks:', error);
  }
}

async function fetchGenres() {
  try {
    const response = await fetch('/api/genres');
    const data = await response.json();
    if (data.success) {
      state.genres = data.genres;
    }
  } catch (error) {
    console.error('Failed to fetch genres:', error);
  }
}

async function fetchGenreInstruments(genreId) {
  try {
    const response = await fetch(`/api/genres/${genreId}/instruments`);
    const data = await response.json();
    if (data.success) {
      renderInstrumentBadges(data.instruments, data.defaultInstruments);
    }
  } catch (error) {
    console.error('Failed to fetch genre instruments:', error);
    populateDefaultInstruments();
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
    // Keep default values if fetch fails
  }
}

/**
 * Apply feature flags to the UI
 * Hides/shows elements based on enabled features
 */
function applyFeatureFlags() {
  // Hide Generate tab if generation is disabled
  const generateTab = document.querySelector('.modal-tab[data-tab="generate"]');
  if (generateTab) {
    generateTab.style.display = state.features.enableGeneration ? '' : 'none';
  }

  // Also hide the generate button
  if (elements.generateBtn) {
    elements.generateBtn.style.display = state.features.enableGeneration ? '' : 'none';
  }
}

/**
 * Render instrument badges grouped by category
 * @param {Array} instruments - Array of instrument objects
 * @param {Array} defaultInstruments - Array of instrument IDs to pre-select
 */
function renderInstrumentBadges(instruments, defaultInstruments = []) {
  const container = elements.instrumentSelector;
  if (!container) return;

  // Group instruments by category
  const groups = {};
  instruments.forEach(inst => {
    const category = formatCategory(inst.category);
    if (!groups[category]) groups[category] = [];
    groups[category].push(inst);
  });

  // Render categories with badges
  container.innerHTML = Object.entries(groups).map(([category, items]) => `
    <div class="instrument-category">
      <span class="instrument-category-label">${category}</span>
      <div class="instrument-badges">
        ${items.map(inst => `
          <button
            type="button"
            class="instrument-badge ${defaultInstruments.includes(inst.id) ? 'selected' : ''}"
            data-id="${inst.id}"
            title="${inst.sunoDesc || inst.name}"
          >
            ${inst.name}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Add click handlers for toggle behavior
  container.querySelectorAll('.instrument-badge').forEach(badge => {
    badge.addEventListener('click', (e) => {
      e.preventDefault();
      badge.classList.toggle('selected');
    });
  });
}

/**
 * Get array of selected instrument IDs from badge selector
 */
function getSelectedInstruments() {
  const badges = document.querySelectorAll('.instrument-badge.selected');
  const selected = Array.from(badges).map(b => b.dataset.id);
  // Fallback to sitar if nothing selected
  return selected.length > 0 ? selected : ['sitar'];
}

// Keep for backward compatibility (populates the old select element if it exists)
function populateInstrumentDropdown(instruments, defaultInstruments = []) {
  const select = elements.instrumentSelect;
  if (!select) return;

  const groups = {};
  instruments.forEach(inst => {
    const category = formatCategory(inst.category);
    if (!groups[category]) groups[category] = [];
    groups[category].push(inst);
  });

  let html = '';
  for (const [category, items] of Object.entries(groups)) {
    html += `<optgroup label="${category}">`;
    items.forEach(inst => {
      const isDefault = defaultInstruments.includes(inst.id);
      html += `<option value="${inst.id}" ${isDefault ? 'selected' : ''} title="${inst.sunoDesc}">${inst.name}</option>`;
    });
    html += '</optgroup>';
  }

  select.innerHTML = html;
}

function formatCategory(category) {
  const categoryMap = {
    'indian_string': 'Indian String',
    'indian_wind': 'Indian Wind',
    'indian_percussion': 'Indian Percussion',
    'indian_keyboard': 'Indian Keyboard',
    'indian_vocal': 'Vocal',
    'western_electric': 'Electric',
    'western_acoustic': 'Acoustic',
    'western_string': 'String',
    'western_keyboard': 'Keyboard',
    'western_percussion': 'Percussion',
    'western_wind': 'Wind',
    'jazz_wind': 'Jazz Wind',
    'jazz_string': 'Jazz String',
    'jazz_brass': 'Jazz Brass',
    'jazz_percussion': 'Jazz Percussion',
    'electronic': 'Electronic',
    'lofi': 'Lo-fi',
    'orchestral': 'Orchestral',
    'world_fusion': 'World Fusion',
    'world_percussion': 'World Percussion',
    'world_string': 'World String',
    'world_wind': 'World Wind',
  };
  return categoryMap[category] || category.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function populateDefaultInstruments() {
  const select = elements.instrumentSelect;
  if (!select) return;

  select.innerHTML = `
    <optgroup label="String Instruments">
      <option value="sitar" selected>Sitar</option>
      <option value="sarod">Sarod</option>
      <option value="veena">Veena</option>
      <option value="tanpura">Tanpura (Drone)</option>
      <option value="santoor">Santoor</option>
    </optgroup>
    <optgroup label="Wind Instruments">
      <option value="bansuri">Bansuri (Bamboo Flute)</option>
      <option value="shehnai">Shehnai</option>
    </optgroup>
    <optgroup label="Percussion">
      <option value="tabla" selected>Tabla</option>
      <option value="pakhawaj">Pakhawaj</option>
      <option value="mridangam">Mridangam</option>
    </optgroup>
    <optgroup label="Vocal & Modern">
      <option value="vocal">Vocal (Alaap style)</option>
      <option value="harmonium">Harmonium</option>
      <option value="synth">Synthesizer</option>
    </optgroup>
  `;
}

async function suggestGenreForRaga(ragaId) {
  try {
    const response = await fetch(`/api/ragas/${ragaId}/suggest-genre`);
    const data = await response.json();
    if (data.success && data.suggestedGenres.length > 0) {
      const suggested = data.suggestedGenres[0];
      if (elements.genreSelect) {
        elements.genreSelect.value = suggested.id;
        elements.genreHint.textContent = `Suggested: ${suggested.name} (matches ${data.moods.join(', ')} mood)`;
      }
      state.currentGenre = suggested.id;
      await fetchGenreInstruments(suggested.id);
    }
  } catch (error) {
    console.error('Failed to suggest genre:', error);
  }
}

// ============================================
// Library Rendering
// ============================================
function renderLibrary() {
  const tracks = state.libraryTracks;
  elements.trackCount.textContent = tracks.length;

  if (tracks.length === 0) {
    elements.trackList.innerHTML = `
      <div class="empty-library">
        <span class="empty-icon">🎵</span>
        <p>No tracks generated yet</p>
        <p class="empty-hint">Generate your first raga from the "By Time" or "By Mood" tabs</p>
      </div>
    `;
    elements.totalDuration.textContent = '0:00';
    return;
  }

  elements.trackList.innerHTML = tracks.map((track, index) => {
    const raga = track.raga;
    const ragaName = raga ? raga.name : track.ragaKey || track.ragaName || 'Unknown';
    const thaat = raga ? raga.thaat : '';
    const time = raga ? raga.time : '';
    const mode = raga ? raga.westernMode : '';
    const hasRefAudio = !!track.referenceAudioUrl;

    // Build minimal subtitle
    let subtitle = '';
    if (thaat) subtitle = thaat + ' Thaat';
    if (mode) subtitle += (subtitle ? ' • ' : '') + mode;

    // Extract simple time label (e.g., "Morning" from "Early Morning (6-9 AM)")
    const simpleTime = time ? time.split('(')[0].trim() : '';

    return `
      <div class="track-item ${hasRefAudio ? 'authentic-track' : ''}" data-url="${track.url}" data-index="${index}">
        <div class="track-artwork">${musicNoteIcon}</div>
        <div class="track-info">
          <div class="track-title">Raga ${ragaName}</div>
          <div class="track-subtitle">${subtitle}</div>
          <div class="track-meta">
            ${simpleTime ? `<span class="meta-tag time-tag">${simpleTime}</span>` : ''}
            ${hasRefAudio ? `<span class="meta-tag authentic-tag">Authentic</span>` : ''}
          </div>
        </div>
        <div class="track-actions">
          <button class="track-share-btn" onclick="event.stopPropagation(); shareTrackByIndex(${index})" title="Share">
            ${shareIcon}
          </button>
          <button class="track-play-btn" onclick="event.stopPropagation(); playLibraryTrack(${index})" title="Play">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.track-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.track-play-btn')) {
        const index = parseInt(item.dataset.index);
        showTrackDetails(index);
      }
    });
  });
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
  elements.modalTitle.textContent = `Raga ${ragaName}`;
  elements.modalThaat.textContent = raga ? `${raga.thaat} Thaat` : '';
  elements.modalArtwork.innerHTML = musicNoteIcon;
  elements.modalTime.textContent = raga ? raga.time : '';
  elements.modalMood.textContent = raga ? raga.mood.join(', ') : '';
  elements.modalScaleIndian.textContent = raga ? raga.scaleIndian : '';
  elements.modalScaleWestern.textContent = raga ? raga.westernNotes : '';
  elements.modalMode.textContent = raga ? raga.westernMode : '';
  elements.modalDescription.textContent = raga?.description || 'A beautiful raga from the Hindustani classical tradition.';

  // Remove any previously added dynamic rows
  document.querySelectorAll('.modal-dynamic-row').forEach(el => el.remove());

  const instruments = Array.isArray(track.instruments) ? track.instruments : (track.instrument ? [track.instrument] : []);
  const dateStr = new Date(track.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Add dynamic detail rows before the artifact buttons
  const artifactButtons = elements.artifactButtons;
  const detailsContainer = artifactButtons?.parentNode || elements.modalDescription.parentNode;
  const insertBeforeEl = artifactButtons || elements.modalDescription;

  // Instruments row
  if (instruments.length > 0) {
    const instrumentsRow = document.createElement('div');
    instrumentsRow.className = 'detail-row modal-dynamic-row';
    instrumentsRow.innerHTML = `
      <span class="detail-label">Instruments</span>
      <span class="detail-value">${instruments.join(', ')}</span>
    `;
    detailsContainer.insertBefore(instrumentsRow, insertBeforeEl);
  }

  // Created date row
  const dateRow = document.createElement('div');
  dateRow.className = 'detail-row modal-dynamic-row';
  dateRow.innerHTML = `
    <span class="detail-label">Created</span>
    <span class="detail-value">${dateStr}</span>
  `;
  detailsContainer.insertBefore(dateRow, insertBeforeEl);

  // Configure artifact buttons
  if (elements.artifactButtons) {
    const hasAnyArtifact = track.midiFileUrl || track.referenceAudioUrl || track.url;

    if (hasAnyArtifact) {
      elements.artifactButtons.classList.remove('hidden');

      // MIDI button
      if (elements.artifactMidi) {
        if (track.midiFileUrl) {
          elements.artifactMidi.href = track.midiFileUrl;
          elements.artifactMidi.classList.remove('disabled');
        } else {
          elements.artifactMidi.removeAttribute('href');
          elements.artifactMidi.classList.add('disabled');
        }
      }

      // WAV button (reference audio)
      if (elements.artifactWav) {
        if (track.referenceAudioUrl) {
          elements.artifactWav.href = track.referenceAudioUrl;
          elements.artifactWav.classList.remove('disabled');
        } else {
          elements.artifactWav.removeAttribute('href');
          elements.artifactWav.classList.add('disabled');
        }
      }

      // MP3 button (main track URL)
      if (elements.artifactMp3) {
        if (track.url) {
          elements.artifactMp3.href = track.url;
          elements.artifactMp3.classList.remove('disabled');
        } else {
          elements.artifactMp3.removeAttribute('href');
          elements.artifactMp3.classList.add('disabled');
        }
      }
    } else {
      elements.artifactButtons.classList.add('hidden');
    }
  }

  elements.generateBtn.classList.add('hidden');
  elements.playBtn.classList.remove('hidden');
  elements.generationStatus.classList.add('hidden');

  // Show and wire up share button
  const modalShareBtn = document.getElementById('modal-share-btn');
  if (modalShareBtn) {
    modalShareBtn.classList.remove('hidden');
    modalShareBtn.onclick = () => shareTrack(track);
  }

  // Switch to Details tab for library tracks
  switchModalTab('details');

  elements.modal.classList.remove('hidden');
}

window.playLibraryTrack = function(index) {
  const track = state.libraryTracks[index];
  if (!track) return;

  state.currentTrack = track;
  state.currentTrackIndex = index;

  elements.audioPlayer.src = track.url;
  elements.audioPlayer.play();
  state.isPlaying = true;

  const ragaName = track.raga ? track.raga.name : track.ragaKey || 'Unknown';
  const thaat = track.raga ? track.raga.thaat : '';

  // Update mini player
  elements.nowPlaying.classList.remove('hidden');
  elements.miniPlayerTitle.textContent = `Raga ${ragaName}`;
  elements.miniPlayerSubtitle.textContent = thaat || 'Hindustani Classical';

  // Update play/pause icons
  updatePlayPauseIcons(true);

  // Update full player
  updateFullPlayer(track.raga || { name: ragaName }, thaat);

  // Highlight current track in library
  document.querySelectorAll('.track-item').forEach((item, i) => {
    item.classList.toggle('playing', i === index);
  });

  // Start waveform if full player is visible
  if (state.fullPlayerVisible && waveformVisualizer) {
    waveformVisualizer.start();
  }
};

function updatePlayPauseIcons(isPlaying) {
  // Mini player
  const miniPlayIcon = elements.playPauseBtn.querySelector('.play-icon');
  const miniPauseIcon = elements.playPauseBtn.querySelector('.pause-icon');
  miniPlayIcon.classList.toggle('hidden', isPlaying);
  miniPauseIcon.classList.toggle('hidden', !isPlaying);

  // Full player
  const fullPlayIcon = elements.fullPlayerPlayBtn.querySelector('.play-icon');
  const fullPauseIcon = elements.fullPlayerPlayBtn.querySelector('.pause-icon');
  fullPlayIcon.classList.toggle('hidden', isPlaying);
  fullPauseIcon.classList.toggle('hidden', !isPlaying);
}

// ============================================
// Generation Functions
// ============================================
async function generateRaga(ragaId) {
  if (state.generatingRagas.has(ragaId)) return;

  state.generatingRagas.add(ragaId);
  updateGenerateButton(true);

  const mode = elements.modeSelect?.value || 'standard';
  const genre = elements.genreSelect?.value || state.currentGenre || 'indianClassical';

  // Use badge selector for instruments
  const instruments = getSelectedInstruments();

  const duration = parseInt(elements.durationSelect?.value || '60');
  const addBackgroundMusic = elements.addBackgroundMusic?.checked ?? true;

  // Determine status mode for progress updates
  let statusMode = 'standard';
  if (mode === 'authentic') {
    statusMode = addBackgroundMusic ? 'withBackground' : 'authentic';
  }

  console.log('Generation options:', { mode, genre, instruments, duration, statusMode });

  let referenceAudioUrl = null;
  let midiFileUrl = null;
  let generatedTrackUrl = null;

  try {
    let endpoint, requestBody;

    // Initial status
    updateGenerationStatus(0, statusMode);

    if (mode === 'authentic') {
      endpoint = `/api/generate/${ragaId}/authentic`;
      requestBody = { instruments, duration, genre, useAIPrompt: true };
    } else {
      endpoint = `/api/generate/${ragaId}`;
      requestBody = { instruments };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    const taskId = data.taskId;

    if (mode === 'authentic') {
      if (data.referenceAudio) referenceAudioUrl = data.referenceAudio;
      if (data.midiFile) midiFileUrl = data.midiFile;
    }

    // Update to step 2 - audio building / processing
    if (mode === 'authentic') {
      updateGenerationStatus(1, statusMode, data.melody ? `${data.melody.noteCount} notes generated` : null);
    } else {
      updateGenerationStatus(1, statusMode);
    }

    let attempts = 0;
    const maxAttempts = 60;
    const pollInterval = 5000;

    while (attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(`/api/status/${taskId}`);
      const statusData = await statusResponse.json();

      if (!statusData.success) {
        throw new Error(statusData.error || 'Status check failed');
      }

      const status = statusData.status;
      console.log(`Poll ${attempts}: ${status}`);

      if (status === 'PENDING') {
        updateGenerationStatus(2, statusMode, `Processing... (${attempts * 5}s)`);
      } else if (status === 'TEXT_SUCCESS') {
        updateGenerationStatus(2, statusMode, 'Processing audio...');
      } else if (status === 'FIRST_SUCCESS') {
        updateGenerationStatus(2, statusMode, 'Almost there...');
      } else if (status === 'SUCCESS' || status === 'complete') {
        updateGenerationStatus(3, statusMode, 'Downloading track...');
        break;
      } else if (status === 'FAILED' || status === 'error') {
        throw new Error(statusData.errorMessage || 'Generation failed');
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Generation timed out. Check status later.');
    }

    const downloadResponse = await fetch(`/api/download/${taskId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ragaName: state.currentRaga.name,
        ragaId: ragaId,
        instruments: instruments,
        referenceAudioUrl: referenceAudioUrl,
        midiFileUrl: midiFileUrl,
      }),
    });
    const downloadData = await downloadResponse.json();

    if (!downloadData.success) {
      throw new Error(downloadData.error);
    }

    if (addBackgroundMusic && downloadData.tracks && downloadData.tracks.length > 0) {
      const baseTrack = downloadData.tracks[0];
      generatedTrackUrl = baseTrack.url;

      updateGenerationStatus(3, statusMode, 'Adding background music...');

      const remixResponse = await fetch(`/api/remix/${ragaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: generatedTrackUrl,
          ragaName: state.currentRaga.name,
          instruments: instruments,
          referenceAudioUrl: referenceAudioUrl,
          midiFileUrl: midiFileUrl,
        }),
      });
      const remixData = await remixResponse.json();

      if (!remixData.success) {
        console.warn('Remix failed, using base track:', remixData.error);
        updateGenerationStatus(4, statusMode, 'Background music failed, using base track...');
      } else {
        const remixTaskId = remixData.taskId;
        let remixAttempts = 0;
        const remixMaxAttempts = 40;

        while (remixAttempts < remixMaxAttempts) {
          remixAttempts++;
          await new Promise(resolve => setTimeout(resolve, pollInterval));

          const remixStatusResponse = await fetch(`/api/status/${remixTaskId}`);
          const remixStatusData = await remixStatusResponse.json();

          if (!remixStatusData.success) {
            console.warn('Remix status check failed');
            break;
          }

          const remixStatus = remixStatusData.status;
          console.log(`Remix poll ${remixAttempts}: ${remixStatus}`);

          if (remixStatus === 'PENDING') {
            updateGenerationStatus(3, statusMode, `Adding background music... (${remixAttempts * 5}s)`);
          } else if (remixStatus === 'SUCCESS' || remixStatus === 'complete') {
            updateGenerationStatus(4, statusMode, 'Downloading final track...');

            const remixDownloadResponse = await fetch(`/api/remix/download/${remixTaskId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ragaName: state.currentRaga.name,
                ragaId: ragaId,
                instruments: instruments,
                referenceAudioUrl: referenceAudioUrl,
                midiFileUrl: midiFileUrl,
                originalAudioUrl: generatedTrackUrl,
              }),
            });
            const remixDownloadData = await remixDownloadResponse.json();

            if (remixDownloadData.success && remixDownloadData.tracks?.length > 0) {
              const remixedTrack = remixDownloadData.tracks[0];
              state.currentRaga.audioUrl = remixedTrack.url;
              state.currentRaga.referenceAudioUrl = referenceAudioUrl;
              state.currentRaga.midiFileUrl = midiFileUrl;
              state.currentRaga.instruments = instruments;
              elements.playBtn.classList.remove('hidden');
              updateGenerationStatus(4, statusMode, 'Track with background music ready!');

              fetchLibraryTracks();
              playTrack(state.currentRaga);
              return;
            }
            break;
          } else if (remixStatus === 'FAILED' || remixStatus === 'error') {
            console.warn('Remix generation failed');
            break;
          }
        }

        updateGenerationStatus(4, statusMode, 'Using base track...');
      }
    }

    if (downloadData.tracks && downloadData.tracks.length > 0) {
      const track = downloadData.tracks[0];
      state.currentRaga.audioUrl = track.url;
      state.currentRaga.referenceAudioUrl = track.referenceAudioUrl;
      state.currentRaga.midiFileUrl = track.midiFileUrl;
      state.currentRaga.instruments = track.instruments;
      elements.playBtn.classList.remove('hidden');
      const finalStepIndex = GENERATION_STEPS[statusMode].length - 1;
      updateGenerationStatus(finalStepIndex, statusMode, 'Track ready!');

      fetchLibraryTracks();
      playTrack(state.currentRaga);
    }
  } catch (error) {
    console.error('Generation failed:', error);
    if (elements.statusPhase) elements.statusPhase.textContent = 'Error';
    if (elements.statusText) elements.statusText.textContent = error.message;
    if (elements.generationProgressFill) elements.generationProgressFill.style.width = '0%';
  } finally {
    state.generatingRagas.delete(ragaId);
    updateGenerateButton(false);
  }
}

// ============================================
// Render Functions
// ============================================
function renderRagas() {
  elements.morningRagas.innerHTML = '';
  elements.afternoonRagas.innerHTML = '';
  elements.eveningRagas.innerHTML = '';
  elements.nightRagas.innerHTML = '';
  elements.devotionalRagas.innerHTML = '';
  elements.romanticRagas.innerHTML = '';
  elements.peacefulRagas.innerHTML = '';
  elements.seriousRagas.innerHTML = '';
  elements.allRagas.innerHTML = '';

  state.ragas.forEach(raga => {
    const card = createRagaCard(raga);

    elements.allRagas.appendChild(card.cloneNode(true));

    const time = raga.time.toLowerCase();
    if (time.includes('early morning') || time.includes('morning')) {
      elements.morningRagas.appendChild(card.cloneNode(true));
    }
    if (time.includes('afternoon') || time.includes('late morning')) {
      elements.afternoonRagas.appendChild(card.cloneNode(true));
    }
    if (time.includes('evening')) {
      elements.eveningRagas.appendChild(card.cloneNode(true));
    }
    if (time.includes('night')) {
      elements.nightRagas.appendChild(card.cloneNode(true));
    }
    if (time.includes('any')) {
      elements.morningRagas.appendChild(card.cloneNode(true));
      elements.eveningRagas.appendChild(card.cloneNode(true));
    }

    raga.mood.forEach(mood => {
      const moodLower = mood.toLowerCase();
      if (moodLower.includes('devotional') || moodLower.includes('spiritual')) {
        appendIfNotExists(elements.devotionalRagas, card, raga.id);
      }
      if (moodLower.includes('romantic') || moodLower.includes('love') || moodLower.includes('longing')) {
        appendIfNotExists(elements.romanticRagas, card, raga.id);
      }
      if (moodLower.includes('peaceful') || moodLower.includes('calm') || moodLower.includes('serene') || moodLower.includes('meditative')) {
        appendIfNotExists(elements.peacefulRagas, card, raga.id);
      }
      if (moodLower.includes('serious') || moodLower.includes('majestic') || moodLower.includes('mysterious')) {
        appendIfNotExists(elements.seriousRagas, card, raga.id);
      }
    });
  });

  document.querySelectorAll('.raga-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.raga-card-generate')) {
        const ragaId = card.dataset.id;
        const raga = state.ragas.find(r => r.id === ragaId);
        if (raga) openModal(raga);
      }
    });
  });
}

function appendIfNotExists(container, card, id) {
  if (!container.querySelector(`[data-id="${id}"]`)) {
    container.appendChild(card.cloneNode(true));
  }
}

function createRagaCard(raga) {
  const card = document.createElement('div');
  card.className = 'raga-card';
  card.dataset.id = raga.id;
  card.dataset.time = raga.time;

  card.innerHTML = `
    <div class="raga-artwork">${musicNoteIcon}</div>
    <div class="raga-card-info">
      <div class="raga-card-title">${raga.name}</div>
      <div class="raga-card-subtitle">${raga.thaat}</div>
    </div>
    <button class="raga-card-generate" title="Generate" onclick="event.stopPropagation(); generateFromCard('${raga.id}')">
      <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
    </button>
  `;

  return card;
}

// ============================================
// Modal Functions
// ============================================
async function openModal(raga) {
  state.currentRaga = raga;

  elements.modalTitle.textContent = `Raga ${raga.name}`;
  elements.modalThaat.textContent = `${raga.thaat} Thaat`;
  elements.modalArtwork.innerHTML = musicNoteIcon;
  elements.modalTime.textContent = raga.time;
  elements.modalMood.textContent = raga.mood.join(', ');
  elements.modalScaleIndian.textContent = raga.scaleIndian;
  elements.modalScaleWestern.textContent = raga.westernNotes;
  elements.modalMode.textContent = raga.westernMode;
  elements.modalDescription.textContent = raga.description;

  elements.generateBtn.classList.remove('hidden');
  elements.playBtn.classList.add('hidden');
  elements.generationStatus.classList.add('hidden');

  // Hide share button for new ragas (not from library)
  const modalShareBtn = document.getElementById('modal-share-btn');
  if (modalShareBtn) {
    modalShareBtn.classList.add('hidden');
  }

  // Hide artifact buttons for new ragas (not from library)
  if (elements.artifactButtons) {
    elements.artifactButtons.classList.add('hidden');
  }

  if (raga.audioUrl) {
    elements.playBtn.classList.remove('hidden');
  }

  // Switch to Generate tab for new ragas
  switchModalTab('generate');

  elements.modal.classList.remove('hidden');
  await suggestGenreForRaga(raga.id);
}

function closeModal() {
  elements.modal.classList.add('hidden');
  state.currentRaga = null;
}

function updateGenerateButton(isGenerating) {
  if (isGenerating) {
    elements.generateBtn.classList.add('hidden');
    elements.generationStatus.classList.remove('hidden');
  } else {
    elements.generateBtn.classList.remove('hidden');
    elements.generationStatus.classList.add('hidden');
  }
}

// ============================================
// Audio Functions
// ============================================
function playTrack(raga) {
  if (!raga.audioUrl) return;

  elements.audioPlayer.src = raga.audioUrl;
  elements.audioPlayer.play();
  state.isPlaying = true;

  // Update mini player
  elements.nowPlaying.classList.remove('hidden');
  elements.miniPlayerTitle.textContent = `Raga ${raga.name}`;
  elements.miniPlayerSubtitle.textContent = raga.thaat || 'Hindustani Classical';

  // Update icons
  updatePlayPauseIcons(true);

  // Update full player
  updateFullPlayer(raga);

  // Start waveform if visible
  if (state.fullPlayerVisible && waveformVisualizer) {
    waveformVisualizer.start();
  }
}

function togglePlayPause() {
  if (state.isPlaying) {
    elements.audioPlayer.pause();
    if (waveformVisualizer) waveformVisualizer.stop();
  } else {
    elements.audioPlayer.play();
    if (state.fullPlayerVisible && waveformVisualizer) {
      waveformVisualizer.start();
    }
  }
  state.isPlaying = !state.isPlaying;
  updatePlayPauseIcons(state.isPlaying);
}

function playPreviousTrack() {
  if (state.libraryTracks.length === 0) return;

  let newIndex = state.currentTrackIndex - 1;
  if (newIndex < 0) newIndex = state.libraryTracks.length - 1;
  playLibraryTrack(newIndex);
}

function playNextTrack() {
  if (state.libraryTracks.length === 0) return;

  let newIndex = state.currentTrackIndex + 1;
  if (newIndex >= state.libraryTracks.length) newIndex = 0;
  playLibraryTrack(newIndex);
}

// ============================================
// Filter Panel
// ============================================
const filterLabels = {
  library: 'My Library',
  time: 'By Time',
  mood: 'By Mood',
  all: 'All Ragas'
};

function openFilterPanel() {
  elements.filterPanel.classList.add('open');
  elements.filterPanelBackdrop.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeFilterPanel() {
  elements.filterPanel.classList.remove('open');
  elements.filterPanelBackdrop.classList.add('hidden');
  document.body.style.overflow = '';
}

function updateFilterTags(category) {
  const label = filterLabels[category] || category;
  elements.filterTags.innerHTML = `
    <span class="filter-tag" data-filter="${category}">
      <span>${label}</span>
      <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </span>
  `;
}

function switchCategory(category) {
  // Update filter items active state
  elements.filterItems.forEach(item => {
    item.classList.toggle('active', item.dataset.category === category);
  });

  // Update sections visibility
  elements.librarySection.classList.toggle('hidden', category !== 'library');
  elements.timeSection.classList.toggle('hidden', category !== 'time');
  elements.moodSection.classList.toggle('hidden', category !== 'mood');
  elements.allSection.classList.toggle('hidden', category !== 'all');

  // Update filter tags in header
  updateFilterTags(category);

  // Close filter panel
  closeFilterPanel();

  if (category === 'library') {
    fetchLibraryTracks();
  }
}

// ============================================
// Global Functions
// ============================================
window.generateFromCard = async function(ragaId) {
  const raga = state.ragas.find(r => r.id === ragaId);
  if (raga) {
    state.currentRaga = raga;
    openModal(raga);
    await generateRaga(ragaId);
  }
};

// ============================================
// Event Listeners
// ============================================
function initEventListeners() {
  // Filter Panel
  elements.filterBtn?.addEventListener('click', openFilterPanel);
  elements.filterPanelClose?.addEventListener('click', closeFilterPanel);
  elements.filterPanelBackdrop?.addEventListener('click', closeFilterPanel);

  // Filter items in panel
  elements.filterItems.forEach(item => {
    item.addEventListener('click', () => switchCategory(item.dataset.category));
  });

  // Filter tag click (to reopen panel)
  elements.filterTags?.addEventListener('click', (e) => {
    const tag = e.target.closest('.filter-tag');
    if (tag) {
      openFilterPanel();
    }
  });

  // Modal
  elements.modalClose.addEventListener('click', closeModal);
  document.querySelector('.modal-backdrop').addEventListener('click', closeModal);

  // Modal Tab Switching
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchModalTab(tab.dataset.tab);
    });
  });

  // Copy Modal (share fallback)
  const copyModalClose = document.getElementById('copy-modal-close');
  const copyModalBackdrop = document.querySelector('#copy-modal .modal-backdrop');
  const copyModalBtn = document.getElementById('copy-modal-btn');

  if (copyModalClose) copyModalClose.addEventListener('click', closeCopyModal);
  if (copyModalBackdrop) copyModalBackdrop.addEventListener('click', closeCopyModal);
  if (copyModalBtn) copyModalBtn.addEventListener('click', copyFromModal);

  // Generate button
  elements.generateBtn.addEventListener('click', () => {
    if (state.currentRaga) {
      generateRaga(state.currentRaga.id);
    }
  });

  // Mode select
  if (elements.modeSelect) {
    elements.modeSelect.addEventListener('change', (e) => {
      const mode = e.target.value;
      const options = elements.generationOptions;

      if (mode === 'authentic') {
        options?.classList.remove('standard-mode');
        elements.modeHint.textContent = 'Generates precise raga melody, then transforms with Suno';
      } else {
        options?.classList.add('standard-mode');
        elements.modeHint.textContent = 'Full AI generation by Suno (raga-inspired, not precise)';
      }
    });
  }

  // Genre select
  if (elements.genreSelect) {
    elements.genreSelect.addEventListener('change', async (e) => {
      const genreId = e.target.value;
      state.currentGenre = genreId;
      const genre = state.genres.find(g => g.id === genreId);
      if (genre) {
        elements.genreHint.textContent = genre.description;
      }
      await fetchGenreInstruments(genreId);
    });
  }

  // Play button in modal
  elements.playBtn.addEventListener('click', () => {
    if (state.currentRaga) {
      playTrack(state.currentRaga);
      closeModal();
    }
  });

  // Mini player controls
  elements.playPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayPause();
  });

  // Click on mini player to open full player
  elements.nowPlaying.addEventListener('click', (e) => {
    if (!e.target.closest('.control-btn')) {
      openFullPlayer();
    }
  });

  // Full player controls
  elements.fullPlayerClose.addEventListener('click', closeFullPlayer);
  elements.fullPlayerPlayBtn.addEventListener('click', togglePlayPause);
  elements.fullPlayerPrev.addEventListener('click', playPreviousTrack);
  elements.fullPlayerNext.addEventListener('click', playNextTrack);

  // Audio progress updates
  elements.audioPlayer.addEventListener('timeupdate', () => {
    const progress = (elements.audioPlayer.currentTime / elements.audioPlayer.duration) * 100;
    elements.progressFill.style.width = `${progress}%`;
    elements.fullPlayerProgressFill.style.width = `${progress}%`;
    elements.fullPlayerCurrentTime.textContent = formatTime(elements.audioPlayer.currentTime);
  });

  elements.audioPlayer.addEventListener('loadedmetadata', () => {
    elements.fullPlayerDuration.textContent = formatTime(elements.audioPlayer.duration);
  });

  elements.audioPlayer.addEventListener('ended', () => {
    state.isPlaying = false;
    updatePlayPauseIcons(false);
    elements.progressFill.style.width = '0%';
    elements.fullPlayerProgressFill.style.width = '0%';
    if (waveformVisualizer) waveformVisualizer.stop();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.fullPlayerVisible) {
        closeFullPlayer();
      } else {
        closeModal();
      }
    }
    if (e.key === ' ' && !e.target.matches('input, textarea, select')) {
      e.preventDefault();
      togglePlayPause();
    }
  });

  // Swipe gesture for full player (touch devices)
  let touchStartY = 0;
  elements.fullPlayer.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  elements.fullPlayer.addEventListener('touchend', (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchEndY - touchStartY;
    if (diff > 100) {
      closeFullPlayer();
    }
  }, { passive: true });
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize waveform visualizer
  if (elements.waveformCanvas) {
    waveformVisualizer = new WaveformVisualizer(elements.waveformCanvas);
    waveformVisualizer.drawStatic();
  }

  initEventListeners();

  // Fetch feature flags first to configure UI
  await fetchFeatures();

  // Fetch data in parallel
  await Promise.all([
    fetchRagas(),
    fetchLibraryTracks(),
    fetchGenres(),
    fetchGenreInstruments('indianClassical')
  ]);
});
