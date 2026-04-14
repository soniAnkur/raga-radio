'use client';

import { useEffect } from 'react';

const appShellHTML = `
<div class="app" id="app">
  <div class="gen-banner hidden" id="gen-banner">
    <div class="gen-banner-content">
      <div class="gen-banner-spinner" id="gen-banner-spinner"></div>
      <div class="gen-banner-info">
        <span class="gen-banner-title" id="gen-banner-title">Generating...</span>
        <span class="gen-banner-detail" id="gen-banner-detail">Composing Alaap</span>
      </div>
      <button class="gen-banner-action hidden" id="gen-banner-action">Play</button>
      <button class="gen-banner-close hidden" id="gen-banner-close"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg></button>
    </div>
  </div>
  <div class="screens-container">
    <section class="screen active" id="screen-home">
      <div class="screen-scroll">
        <div class="time-hero" id="time-hero">
          <div class="time-hero-gradient" id="time-hero-gradient"></div>
          <div class="time-hero-ornament">
            <svg viewBox="0 0 200 200" class="hero-mandala">
              <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
              <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.2"/>
              <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.15"/>
              <circle cx="100" cy="100" r="20" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.1"/>
            </svg>
          </div>
          <div class="time-hero-content">
            <span class="time-hero-eyebrow" id="time-greeting">Good Evening</span>
            <h1 class="time-hero-title" id="time-title">Evening Ragas</h1>
            <p class="time-hero-desc" id="time-desc">4 PM – 10 PM · Sunset melodies</p>
          </div>
        </div>
        <div class="section" id="section-current-time">
          <div class="section-header"><h2 class="section-title">For This Hour</h2></div>
          <div class="horizontal-scroll" id="current-time-ragas"></div>
        </div>
        <div class="section">
          <div class="section-header"><h2 class="section-title">Devotional</h2><span class="section-subtitle">Spiritual &amp; Sacred</span></div>
          <div class="horizontal-scroll" id="home-devotional"></div>
        </div>
        <div class="section">
          <div class="section-header"><h2 class="section-title">Romantic</h2><span class="section-subtitle">Love &amp; Longing</span></div>
          <div class="horizontal-scroll" id="home-romantic"></div>
        </div>
        <div class="section">
          <div class="section-header"><h2 class="section-title">Peaceful</h2><span class="section-subtitle">Calm &amp; Meditative</span></div>
          <div class="horizontal-scroll" id="home-peaceful"></div>
        </div>
        <div class="section">
          <div class="section-header"><h2 class="section-title">Serious</h2><span class="section-subtitle">Deep &amp; Contemplative</span></div>
          <div class="horizontal-scroll" id="home-serious"></div>
        </div>
      </div>
    </section>
    <section class="screen" id="screen-explore">
      <div class="screen-scroll">
        <div class="explore-header"><h1 class="screen-title">Explore</h1><p class="screen-subtitle">All 68+ ragas</p></div>
        <div class="search-container">
          <div class="search-bar">
            <svg class="search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input type="text" class="search-input" id="search-input" placeholder="Search ragas...">
            <button class="search-clear hidden" id="search-clear"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
          </div>
        </div>
        <div class="filter-chips" id="filter-chips">
          <button class="chip active" data-filter="all">All</button>
          <button class="chip" data-filter="morning">Morning</button>
          <button class="chip" data-filter="afternoon">Afternoon</button>
          <button class="chip" data-filter="evening">Evening</button>
          <button class="chip" data-filter="night">Night</button>
          <span class="chip-divider"></span>
          <button class="chip" data-filter="devotional">Devotional</button>
          <button class="chip" data-filter="romantic">Romantic</button>
          <button class="chip" data-filter="peaceful">Peaceful</button>
          <button class="chip" data-filter="serious">Serious</button>
        </div>
        <div class="explore-grid" id="explore-grid"></div>
      </div>
    </section>
    <section class="screen" id="screen-library">
      <div class="screen-scroll">
        <div class="library-header">
          <h1 class="screen-title">Library</h1>
          <div class="library-stats">
            <div class="stat-pill"><span class="stat-value" id="track-count">0</span><span class="stat-label">tracks</span></div>
            <div class="stat-pill"><span class="stat-value" id="total-duration">0:00</span><span class="stat-label">total</span></div>
          </div>
        </div>
        <div class="track-list" id="track-list">
          <div class="empty-state">
            <div class="empty-state-icon"><svg viewBox="0 0 48 48"><path d="M24 4v22.1C22.8 25.4 21.5 25 20 25c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8V12h8V4H24z" fill="currentColor" opacity="0.3"/></svg></div>
            <p class="empty-state-title">No tracks yet</p>
            <p class="empty-state-desc">Generate your first raga from the Home or Explore tabs</p>
          </div>
        </div>
      </div>
    </section>
  </div>
  <div class="mini-player hidden" id="mini-player">
    <div class="mini-player-progress"><div class="mini-player-progress-fill" id="mini-progress-fill"></div></div>
    <div class="mini-player-content">
      <div class="mini-player-artwork" id="mini-artwork"><svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor"/></svg></div>
      <div class="mini-player-info"><span class="mini-player-title" id="mini-title">—</span><span class="mini-player-subtitle" id="mini-subtitle">—</span></div>
      <button class="mini-player-btn" id="mini-play-btn">
        <svg class="icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
        <svg class="icon-pause hidden" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/></svg>
      </button>
    </div>
  </div>
  <nav class="tab-bar" id="tab-bar">
    <button class="tab active" data-tab="home"><svg class="tab-icon" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg><span class="tab-label">Home</span></button>
    <button class="tab" data-tab="explore"><svg class="tab-icon" viewBox="0 0 24 24"><path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"/></svg><span class="tab-label">Explore</span></button>
    <button class="tab" data-tab="library"><svg class="tab-icon" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg><span class="tab-label">Library</span></button>
  </nav>
  <div class="full-player" id="full-player">
    <div class="full-player-bg" id="full-player-bg"></div>
    <div class="full-player-inner">
      <div class="full-player-header">
        <button class="full-player-dismiss" id="full-player-close"><svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" fill="currentColor"/></svg></button>
        <span class="full-player-label">Now Playing</span>
        <button class="full-player-action" id="full-player-share"><svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" fill="currentColor"/></svg></button>
      </div>
      <div class="full-player-artwork-wrap">
        <div class="full-player-artwork" id="full-player-artwork">
          <div class="artwork-glow"></div>
          <div class="artwork-inner"><svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor"/></svg></div>
        </div>
      </div>
      <div class="full-player-info"><h2 class="full-player-title" id="fp-title">—</h2><p class="full-player-subtitle" id="fp-subtitle">—</p></div>
      <div class="waveform-wrap"><canvas class="waveform-canvas" id="waveform-canvas"></canvas></div>
      <div class="full-player-progress">
        <div class="progress-track" id="fp-progress-track"><div class="progress-fill" id="fp-progress-fill"></div><div class="progress-knob" id="fp-progress-knob"></div></div>
        <div class="progress-times"><span id="fp-current-time">0:00</span><span id="fp-duration">0:00</span></div>
      </div>
      <div class="full-player-controls">
        <button class="fp-btn" id="fp-prev"><svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" fill="currentColor"/></svg></button>
        <button class="fp-btn fp-btn-play" id="fp-play-btn"><svg class="icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg><svg class="icon-pause hidden" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/></svg></button>
        <button class="fp-btn" id="fp-next"><svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor"/></svg></button>
      </div>
    </div>
  </div>
  <div class="sheet-backdrop hidden" id="sheet-backdrop"></div>
  <div class="bottom-sheet" id="raga-sheet">
    <div class="sheet-handle-area" id="sheet-handle-area"><div class="sheet-handle"></div><button class="sheet-close-btn" id="sheet-close-btn"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button></div>
    <div class="sheet-scroll">
      <div class="sheet-header">
        <div class="sheet-artwork" id="sheet-artwork"><svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor"/></svg></div>
        <div class="sheet-title-group"><h2 class="sheet-title" id="sheet-title">Raga Name</h2><p class="sheet-thaat" id="sheet-thaat">Thaat</p></div>
      </div>
      <div class="sheet-tabs"><button class="sheet-tab active" data-tab="details">Details</button><button class="sheet-tab" data-tab="generate">Generate</button></div>
      <div class="sheet-tab-content active" id="sheet-tab-details">
        <div class="detail-grid">
          <div class="detail-card"><span class="detail-label">Time</span><span class="detail-value" id="sheet-time">—</span></div>
          <div class="detail-card"><span class="detail-label">Mood</span><span class="detail-value" id="sheet-mood">—</span></div>
          <div class="detail-card full-width"><span class="detail-label">Scale (Indian)</span><span class="detail-value mono" id="sheet-scale-indian">—</span></div>
          <div class="detail-card full-width"><span class="detail-label">Scale (Western)</span><span class="detail-value mono" id="sheet-scale-western">—</span></div>
          <div class="detail-card"><span class="detail-label">Western Mode</span><span class="detail-value" id="sheet-mode">—</span></div>
        </div>
        <div class="artifact-row hidden" id="artifact-row">
          <a class="artifact-btn" id="artifact-midi" href="#" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor"/></svg><span>MIDI</span></a>
          <a class="artifact-btn" id="artifact-wav" href="#" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/></svg><span>WAV</span></a>
          <a class="artifact-btn" id="artifact-mp3" href="#" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z" fill="currentColor"/></svg><span>MP3</span></a>
        </div>
        <p class="sheet-description" id="sheet-description">—</p>
      </div>
      <div class="sheet-tab-content" id="sheet-tab-generate">
        <div class="gen-options" id="gen-options">
          <div class="gen-group"><label class="gen-label">Mode</label><div class="segment-control" id="mode-control"><button type="button" class="segment" data-value="standard">Standard</button><button type="button" class="segment active" data-value="authentic">Authentic</button><div class="segment-indicator"></div></div></div>
          <div class="gen-group" id="genre-group"><label class="gen-label">Genre</label><div class="genre-chips" id="genre-control"><button type="button" class="genre-chip active" data-value="indianClassical">Classical</button><button type="button" class="genre-chip" data-value="atmospheric">Ambient</button><button type="button" class="genre-chip" data-value="metal">Metal</button><button type="button" class="genre-chip" data-value="electronic">EDM</button><button type="button" class="genre-chip" data-value="lofi">Lo-fi</button><button type="button" class="genre-chip" data-value="jazzFusion">Jazz</button><button type="button" class="genre-chip" data-value="worldFusion">World</button><button type="button" class="genre-chip" data-value="orchestral">Orchestral</button></div></div>
          <div class="gen-group" id="instrument-group"><label class="gen-label">Instruments</label><div class="instrument-selector" id="instrument-selector"></div><p class="gen-hint">Tap to select instruments</p></div>
          <div class="gen-group" id="duration-group"><label class="gen-label">Duration</label><div class="duration-chips" id="duration-control"><button type="button" class="duration-chip" data-value="30">30s</button><button type="button" class="duration-chip active" data-value="60">1 min</button><button type="button" class="duration-chip" data-value="90">1.5 min</button><button type="button" class="duration-chip" data-value="120">2 min</button></div></div>
          <div class="gen-group"><label class="toggle-row"><span class="toggle-text"><span class="toggle-title">Deep Background Music</span><span class="toggle-desc">Atmospheric accompaniment matching the raga's mood</span></span><input type="checkbox" id="add-background-music" checked class="toggle-input"><span class="toggle-switch"></span></label></div>
        </div>
      </div>
    </div>
    <div class="sheet-actions">
      <button class="btn-generate" id="generate-btn"><span class="btn-generate-text">Generate Track</span><svg class="btn-generate-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg></button>
      <button class="btn-play hidden" id="sheet-play-btn"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg><span>Play Track</span></button>
      <button class="btn-share hidden" id="sheet-share-btn"><svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" fill="currentColor"/></svg><span>Share</span></button>
    </div>
    <div class="gen-progress hidden" id="gen-progress">
      <div class="gen-progress-ring">
        <svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="26" fill="none" stroke="var(--surface-3)" stroke-width="3"/><circle cx="30" cy="30" r="26" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-dasharray="163.36" stroke-dashoffset="163.36" id="gen-progress-circle"/></svg>
        <span class="gen-progress-step" id="gen-step">1/4</span>
      </div>
      <div class="gen-progress-info"><span class="gen-progress-phase" id="gen-phase">Initializing</span><span class="gen-progress-text" id="gen-text">Preparing generation...</span></div>
    </div>
  </div>
  <div class="toast hidden" id="toast"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg><span id="toast-message">Copied!</span></div>
  <div class="copy-modal hidden" id="copy-modal">
    <div class="copy-modal-backdrop"></div>
    <div class="copy-modal-content">
      <button class="copy-modal-close" id="copy-modal-close"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg></button>
      <h3>Share this track</h3>
      <textarea class="copy-modal-text" id="copy-modal-text" readonly></textarea>
      <button class="btn-generate" id="copy-modal-btn">Copy to Clipboard</button>
    </div>
  </div>
</div>
<audio id="audio-player"></audio>
`;

export default function Home() {
  useEffect(() => {
    // Load app.js after the DOM is rendered
    const script = document.createElement('script');
    script.src = '/js/app.js';
    script.async = false;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: appShellHTML }} />;
}
