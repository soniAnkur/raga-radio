# Raga Radio

**AI-Powered Indian Classical Music Generator**

Generate authentic Indian classical raga music using cutting-edge AI synthesis, algorithmic melody generation, and precise MIDI-based references.

---

## 🎵 What is Raga Radio?

Raga Radio transforms traditional Indian classical ragas into modern synthesized music across multiple genres. It combines:

- **68+ Traditional Ragas** with authentic scale systems
- **AI-Enhanced Melody Generation** using OpenAI GPT
- **Suno AI Music Synthesis** for professional-quality audio
- **Multi-Genre Adaptation** (Classical, Electronic, Metal, Jazz, Lo-fi, Orchestral)
- **Precise MIDI References** for exact note sequences
- **iOS & Web Apps** for universal access

---

## 🏗️ Architecture Overview

### Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Vanilla JavaScript, HTML5, CSS3 (Web); SwiftUI (iOS) |
| **Backend** | Node.js (ES modules), Express.js |
| **Music Generation** | Suno API (kie.ai), MIDI synthesis, WAV rendering |
| **AI/LLM** | OpenAI API (GPT-4/3.5-turbo) for prompts and melodies |
| **Storage** | Cloudflare R2 (S3-compatible), Local filesystem fallback |
| **Deployment** | Vercel (serverless), Localhost (development) |

### Application Type

Full-stack music generation platform with:
- **Web Interface**: Responsive single-page application
- **iOS App**: Native SwiftUI wrapper with WebView
- **API Backend**: RESTful Express.js server
- **Serverless Support**: Vercel deployment with feature flags

---

## 🎼 How Music Generation Works

### Quick Overview

```
User Selects Raga
    ↓
Choose Generation Mode
    ├─ Quick Mode: Template-based prompt → Suno AI
    └─ Authentic Mode: AI melody → MIDI → WAV → Suno AI
    ↓
Suno Synthesizes Music
    ↓
Download MP3 to Library
    ↓
Playback with Waveform Visualization
```

### Detailed Flow

#### 1. **Raga Selection**
   - Browse by **Time** (Morning/Afternoon/Evening/Night)
   - Filter by **Mood** (Devotional/Romantic/Peaceful/Serious)
   - Search **All 68+ Ragas**

#### 2. **Generation Mode Selection**

**Quick Mode** (Fast, Simple)
   - Template-based prompt generation
   - No reference audio needed
   - ~2-3 minutes total time
   - Good for creative exploration

**Authentic Mode** (Precise, Complex)
   - AI or algorithmic melody generation
   - MIDI file creation with exact notes
   - WAV reference audio (sine waves)
   - Upload to Cloudflare R2
   - Suno re-synthesizes from reference
   - ~3-5 minutes total time
   - High fidelity to raga rules

#### 3. **Melody Generation** (Authentic Mode Only)

**AI Path** (if OpenAI configured):
   ```
   OpenAI GPT-4/3.5
   ├─ System Prompt: Raga theory, swara notation, Alap-Jor-Jhala structure
   ├─ Input: Raga data (aaroha, avaroha, vadi, samvadi)
   └─ Output: JSON with note events (swara, duration, ornaments)
   ```

**Fallback Path** (Algorithmic):
   ```
   AlapGenerator
   ├─ Parse aaroha/avaroha sequences
   ├─ Weight notes: vadi (3x), samvadi (2x), others (1x)
   ├─ Generate random weighted sequences
   ├─ Add ornamentations (meend/glide, gamak/oscillation)
   └─ Output: Note events with MIDI mappings
   ```

#### 4. **MIDI File Creation**
   ```
   midi-writer-js
   ├─ Tempo: 45 BPM (slow Alap style)
   ├─ Instrument: GM Program 104 (Sitar)
   ├─ Events: Note pitch + duration + velocity
   └─ Output: Binary .mid file
   ```

#### 5. **WAV Reference Audio**
   ```
   Custom Synthesizer
   ├─ Generate sine waves at exact frequencies
   ├─ Apply attack/release envelope
   ├─ Sample rate: 44.1 kHz, 16-bit mono
   └─ Output: PCM .wav file
   ```

#### 6. **Cloud Storage Upload**
   ```
   Cloudflare R2 (S3-compatible)
   ├─ Upload MIDI file → Get public URL
   ├─ Upload WAV file → Get public URL
   └─ Used as reference for Suno API
   ```

#### 7. **Prompt Generation**

**AI Path** (if enabled):
   ```
   OpenAI GPT
   ├─ Input: Raga + Genre + Instruments
   ├─ Output: Creative prompt (500 chars)
   │         Style tags (200 chars, 4-7 descriptors)
   │         Negative tags (what to avoid)
   └─ Optimized for Suno AI best practices
   ```

**Template Path** (Fallback):
   ```
   promptBuilder.js
   ├─ Style: "Indian Classical, Hindustani, [mood], [time], [instruments]"
   ├─ Prompt: Technical description of raga with scale conversions
   └─ Tags: Genre-specific descriptors
   ```

#### 8. **Suno API Submission**

**Authentic Mode**:
   ```
   POST /api/v1/generate_from_upload
   ├─ uploadUrl: WAV reference (public R2 URL)
   ├─ prompt: AI-generated or template
   ├─ style: Genre tags
   └─ Suno analyzes WAV, re-synthesizes with instruments
   ```

**Quick Mode**:
   ```
   POST /api/v1/generate
   ├─ prompt: Template-based description
   ├─ style: Genre tags
   └─ Suno generates from prompt interpretation
   ```

#### 9. **Polling & Download**
   ```
   Poll /api/v1/generate/record-info every 10 seconds
   ├─ Status: PENDING → SUCCESS
   ├─ Max attempts: 60 (10 minutes)
   └─ On success: Download MP3 from Suno
   ```

#### 10. **Storage & Metadata**
   ```
   Upload to R2 (if available)
   ├─ Save MP3 file
   ├─ Update tracks-metadata.json
   └─ Store: filename, URL, ragaName, instruments, genre,
            createdAt, duration, midiFileUrl, referenceAudioUrl
   ```

---

## 🤖 AI & LLM Integration

### Where AI is Used

#### 1. **AI Melody Generation** (`src/services/aiMelodyGenerator.js`)

**Purpose**: Generate authentic raga melodies following Alap-Jor-Jhala structure

**Provider**: OpenAI (GPT-4 or GPT-3.5-turbo)

**How it Works**:
   - System prompt includes complete raga theory
   - Swara notation with MIDI mappings
   - Three-phase composition rules:
     - **Alap (35%)**: Slow, meditative, long notes (2-4 sec)
     - **Jor (35%)**: Medium tempo, rhythmic pulse
     - **Jhala (30%)**: Fast climax, ornamentations
   - Includes meend (glides) and gamak (oscillations)

**Example Prompt Structure**:
```
PHASE 1: ALAP (~35 notes, ~21 seconds)
- NO rhythm, free-flowing, meditative
- Start from lower octave, introduce Sa
- Use LONG durations: 2-4 seconds per note
- Heavy emphasis on VADI (G) - hold it longest
- Include MEEND (glides) between notes
- Ascend gradually through scale
```

**Output**:
```json
{
  "events": [
    {"swara": "S", "duration": 3.0, "octave": 0},
    {"swara": "R", "duration": 2.5, "ornament": "meend"},
    {"swara": "G", "duration": 4.0, "emphasis": "vadi"}
  ]
}
```

**Fallback**: If OpenAI fails, switches to `AlapGenerator` (algorithmic)

#### 2. **AI Prompt Generation** (`src/services/aiPromptGenerator.js`)

**Purpose**: Create creative Suno AI prompts for multi-genre adaptation

**Provider**: OpenAI (GPT-4 or GPT-3.5-turbo)

**How it Works**:
   - System prompt includes Suno AI best practices
   - Character limits (prompt: 500, style: 200)
   - Descriptor counts (4-7 tags optimal)
   - Takes raga + genre + instruments as input

**Example Output**:
```json
{
  "prompt": "Moonlit meditation in Raga Yaman, ascending phrases on sitar with tabla's gentle pulse, blending classical Indian essence with atmospheric ambient production",
  "style": "Hindustani classical, atmospheric fusion, meditative, sitar-driven, tabla accompaniment",
  "negativeTags": "Electronic drums, harsh vocals, distorted guitars"
}
```

**When Used**: Enabled with `useAIPrompt=true` flag

**Fallback**: Template-based prompt from `promptBuilder.js`

#### 3. **Claude AI Integration** (Not Currently Active)

**Status**: Infrastructure ready, not implemented
- Environment variable: `CLAUDE_API_KEY`
- Potential replacement for OpenAI
- Could provide more culturally-tuned outputs

### AI Configuration

**Environment Variables**:
```bash
OPENAI_API_KEY=sk-...           # Required for AI features
OPENAI_MODEL=gpt-4              # Default: gpt-3.5-turbo
CLAUDE_API_KEY=sk-ant-...       # Optional (not used yet)
```

**Fallback Strategy**:
```
1. Try AI Generation (if API key configured)
2. On failure: Log warning
3. Switch to Algorithmic Generation
4. Continue pipeline without interruption
```

---

## 🎹 Swara (Note) Conversion System

### Indian to Western Mapping

| Swara | Type | Semitone | Western | MIDI | Frequency (C=Sa) |
|-------|------|----------|---------|------|------------------|
| S | Sa (Tonic) | 0 | C | 60 | 261.63 Hz |
| r | Komal Re | 1 | C# | 61 | 277.18 Hz |
| R | Shuddha Re | 2 | D | 62 | 293.66 Hz |
| g | Komal Ga | 3 | D# | 63 | 311.13 Hz |
| G | Shuddha Ga | 4 | E | 64 | 329.63 Hz |
| m | Shuddha Ma | 5 | F | 65 | 349.23 Hz |
| M | Tivra Ma | 6 | F# | 66 | 369.99 Hz |
| P | Pa (Fifth) | 7 | G | 67 | 392.00 Hz |
| d | Komal Dha | 8 | G# | 68 | 415.30 Hz |
| D | Shuddha Dha | 9 | A | 69 | 440.00 Hz |
| n | Komal Ni | 10 | A# | 70 | 466.16 Hz |
| N | Shuddha Ni | 11 | B | 71 | 493.88 Hz |

**Octave Markers**:
- `.` = Lower octave (e.g., `.S` = C3)
- No marker = Middle octave (e.g., `S` = C4)
- `'` = Higher octave (e.g., `S'` = C5)

**Converter File**: `src/converters/swaraConverter.js`

### Raga Structure Example

**Raga Yaman** (Khamar Thaat):
```javascript
{
  scaleIndian: "S R G M P D N",          // Indian notation
  aaroha: "S R G M P D N S'",            // Ascending pattern
  avaroha: "S' N D P M G R S",           // Descending pattern
  vadi: "G",                             // Primary emphasis note
  samvadi: "N",                          // Secondary resolution note
  westernMode: "Lydian",                 // Western equivalent
  westernNotes: ["C", "D", "E", "F#", "G", "A", "B"],
  midiNotes: [60, 62, 64, 66, 67, 69, 71]
}
```

---

## 🔌 External Integrations

### 1. Suno API (kie.ai)

**Provider**: [kie.ai/suno](https://kie.ai)

**Base URL**: `https://kie.ai`

**API Endpoints**:

| Endpoint | Method | Purpose | Mode |
|----------|--------|---------|------|
| `/api/v1/generate` | POST | Text-to-music generation | Quick |
| `/api/v1/generate_from_upload` | POST | Upload-cover (reference audio) | Authentic |
| `/api/v1/add_instrumental` | POST | Add background music | Remix |
| `/api/v1/generate/record-info` | GET | Check task status | Polling |

**Authentication**:
```bash
SUNO_API_KEY=your_key_here
```

**Request Example** (Authentic Mode):
```javascript
POST /api/v1/generate_from_upload
{
  "uploadUrl": "https://bucket.r2.dev/melody_yaman.wav",
  "prompt": "Peaceful Raga Yaman in atmospheric style...",
  "style": "Hindustani classical, ambient, sitar, tabla",
  "negativeTags": "electronic drums, vocals",
  "title": "Raga Yaman - Peaceful Evening"
}
```

**Response**:
```javascript
{
  "data": {
    "taskId": "abc-123-def",
    "status": "PENDING"
  }
}
```

**Polling Response** (Success):
```javascript
{
  "data": {
    "status": "SUCCESS",
    "response": {
      "sunoData": [
        {
          "id": "track_id_xyz",
          "audioUrl": "https://cdn.suno.ai/track.mp3",
          "duration": 60,
          "title": "Raga Yaman - Peaceful Evening"
        }
      ]
    }
  }
}
```

**Key Features**:
- Upload-Cover: Re-synthesizes from reference audio
- Preserves exact pitch contours from WAV input
- Supports diverse genres and instruments
- Professional-quality audio synthesis

### 2. Cloudflare R2

**Provider**: Cloudflare R2 (S3-compatible object storage)

**Configuration**:
```bash
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**Storage Structure**:
```
raga-radio/
├── melody_yaman_abc123.mid          # MIDI reference files
├── melody_yaman_abc123.wav          # WAV reference files
├── raga_yaman_p2_1705427000_1.mp3   # Generated tracks
└── tracks-metadata.json             # Master metadata
```

**Metadata JSON Format**:
```json
[
  {
    "filename": "raga_yaman_p2_1705427000_1.mp3",
    "url": "https://pub-xxxxx.r2.dev/raga-radio/...",
    "ragaName": "Yaman",
    "ragaId": "yaman",
    "genre": "indianClassical",
    "instruments": ["sitar", "tabla"],
    "createdAt": "2025-01-14T22:30:45.123Z",
    "duration": 60,
    "midiFileUrl": "https://.../melody_yaman_abc123.mid",
    "referenceAudioUrl": "https://.../melody_yaman_abc123.wav",
    "sunoId": "track_id_xyz"
  }
]
```

**Why R2?**
- S3-compatible API (easy migration)
- Cost-effective vs AWS S3
- Built-in CDN for fast global access
- Automatic CORS headers
- No egress fees

### 3. OpenAI API

**Provider**: OpenAI

**Models Used**:
- `gpt-4` (default for best results)
- `gpt-3.5-turbo` (fallback, faster/cheaper)

**Configuration**:
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
```

**Usage**:
1. Melody generation (structured JSON output)
2. Prompt generation (creative descriptions)

**API Calls Per Generation** (Authentic Mode with AI):
- 1 call for melody generation
- 1 call for prompt generation (if enabled)
- Total: 0-2 calls per track

**Cost Estimation** (GPT-3.5-turbo):
- Melody: ~$0.002 per track
- Prompt: ~$0.001 per track
- Total: ~$0.003 per track

---

## 📁 Project Structure

```
raga_radio/
├── src/                          # Backend source code
│   ├── server.js                 # Express API server (710 lines)
│   ├── index.js                  # CLI entry point (160 lines)
│   ├── config.js                 # Configuration management
│   ├── features.js               # Feature flags (Vercel/localhost)
│   │
│   ├── data/                     # Static data
│   │   ├── ragas.js              # 68+ raga definitions (949 lines)
│   │   ├── genres.js             # 9+ genre definitions
│   │   └── instruments.js        # 25+ instrument definitions
│   │
│   ├── generators/               # Music generation
│   │   ├── alapGenerator.js      # Algorithmic melody generator
│   │   └── midiBuilder.js        # MIDI file creation
│   │
│   ├── services/                 # External integrations
│   │   ├── sunoApi.js            # Suno API client (400+ lines)
│   │   ├── aiMelodyGenerator.js  # OpenAI melody generation
│   │   ├── aiPromptGenerator.js  # OpenAI prompt generation
│   │   ├── promptBuilder.js      # Template-based prompts
│   │   ├── synthesizer.js        # WAV audio rendering
│   │   └── cloudflare-r2.js      # R2 storage client
│   │
│   ├── converters/               # Note conversion
│   │   └── swaraConverter.js     # Indian ↔ Western notation
│   │
│   └── utils/                    # Utilities
│       └── logger.js             # Structured logging
│
├── public/                       # Frontend files
│   ├── index.html                # Main app shell
│   ├── js/
│   │   └── app.js                # Frontend logic (2000+ lines)
│   └── css/
│       └── styles.css            # Neomorphic design (1700+ lines)
│
├── IOSApp/                       # iOS native app
│   └── raag/
│       └── raag/
│           ├── ContentView.swift # Main SwiftUI view
│           └── WebView.swift     # WebKit integration
│
├── output/                       # Local file storage (fallback)
├── logs/                         # Application logs
├── .env                          # Environment variables (gitignored)
├── .env.example                  # Environment template
├── package.json                  # Dependencies & scripts
└── vercel.json                   # Vercel deployment config
```

---

## 🎵 Core Components

### Backend Components

#### 1. **Express Server** (`src/server.js`)

**API Routes**:

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/ragas` | List all ragas with conversions |
| GET | `/api/ragas/:id` | Get single raga details |
| POST | `/api/generate/:id` | Quick generation |
| POST | `/api/generate/:id/authentic` | Authentic generation |
| POST | `/api/remix/:ragaId` | Add background music |
| GET | `/api/status/:taskId` | Check generation status |
| POST | `/api/download/:taskId` | Download completed track |
| GET | `/api/tracks` | Get library tracks |
| GET | `/api/genres` | List genres |
| GET | `/api/instruments` | List instruments |
| GET | `/api/features` | Get feature flags |

**Static Files**:
- `/` → Serves `public/index.html`
- `/output/*` → Serves local generated files

#### 2. **Melody Generators**

**AlapGenerator** (`src/generators/alapGenerator.js`):
```javascript
class AlapGenerator {
  constructor(raga, options) {
    this.raga = raga;
    this.duration = options.duration;
    this.tonic = options.tonic || 'C';
  }

  generate() {
    // 1. Parse aaroha/avaroha sequences
    // 2. Weight notes: vadi (3x), samvadi (2x)
    // 3. Generate random weighted sequences
    // 4. Add ornamentations (meend, gamak)
    // 5. Apply envelope for dynamics

    return events; // [{midiNote, duration, velocity, ornament}, ...]
  }
}
```

**AIMelodyGenerator** (`src/services/aiMelodyGenerator.js`):
```javascript
class AIMelodyGenerator {
  async generate() {
    const systemPrompt = this.buildSystemPrompt();
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {role: 'system', content: systemPrompt},
        {role: 'user', content: 'Generate Alap-Jor-Jhala composition'}
      ],
      response_format: {type: 'json_object'}
    });

    return this.parseAIResponse(response);
  }
}
```

#### 3. **MIDI Builder** (`src/generators/midiBuilder.js`)

**Library**: `midi-writer-js`

```javascript
function buildMidi(events, options) {
  const track = new MidiWriter.Track();

  // Set tempo (45 BPM for Alap)
  track.setTempo(options.tempo || 45);

  // Set instrument (GM Sitar = 104)
  track.addEvent(new MidiWriter.ProgramChangeEvent({
    instrument: 104
  }));

  // Add note events
  events.forEach(event => {
    track.addEvent(new MidiWriter.NoteEvent({
      pitch: [event.midiNote],
      duration: convertSecondsToTicks(event.duration),
      velocity: event.velocity || 80
    }));
  });

  const write = new MidiWriter.Writer(track);
  return write.buildFile(); // Returns Uint8Array
}
```

#### 4. **WAV Synthesizer** (`src/services/synthesizer.js`)

```javascript
class Synthesizer {
  renderToWav(events, options) {
    const sampleRate = 44100;
    const samples = [];

    events.forEach(event => {
      const frequency = midiToFrequency(event.midiNote);
      const duration = event.duration;
      const velocity = event.velocity / 127;

      // Generate sine wave
      for (let t = 0; t < duration * sampleRate; t++) {
        const amplitude = velocity * 0.5;
        const sample = Math.sin(2 * Math.PI * frequency * t / sampleRate);

        // Apply envelope (attack/release)
        const envelope = this.applyEnvelope(t, duration, sampleRate);
        samples.push(sample * amplitude * envelope);
      }
    });

    return this.writePCM(samples, sampleRate); // WAV file buffer
  }
}
```

### Frontend Components

#### 1. **Main Application** (`public/js/app.js`)

**State Management**:
```javascript
const state = {
  ragas: [],                    // All ragas
  libraryTracks: [],            // User's generated tracks
  genres: [],                   // Available genres
  instruments: [],              // Available instruments
  currentRaga: null,            // Selected raga
  currentTrack: null,           // Playing track
  isPlaying: false,             // Playback state
  audioContext: null,           // Web Audio API context
  analyser: null                // For waveform visualization
};
```

**Key Functions**:
- `renderLibrary()` - Display track list
- `showTrackDetails(index)` - Show detail modal
- `generateMusic(ragaId)` - Trigger generation
- `playLibraryTrack(index)` - Start playback
- `updateWaveform()` - Visualizer animation

#### 2. **UI Features**

**Raga Discovery**:
- Time-based filtering (Morning/Afternoon/Evening/Night)
- Mood-based filtering (Devotional/Romantic/Peaceful/Serious)
- Search all 68+ ragas

**Generation Controls**:
- Mode selector (Quick/Authentic)
- Genre selector (8+ genres)
- Instrument selector (25+ instruments, multi-select)
- Duration slider (15-120 seconds)
- AI prompt toggle

**Playback**:
- Mini player with progress bar
- Waveform visualizer (Web Audio API)
- Full-screen player with controls
- Queue management (next/previous)

**Library**:
- Minimal list view (raga name only)
- Detail modal with:
  - Genre badge
  - Instrument chips with emojis
  - Mood badges
  - Download artifacts (MIDI/WAV/MP3)
  - Share functionality

#### 3. **Design System** (`public/css/styles.css`)

**Theme**: Neomorphic (soft shadows, glass-morphism)

**Key Styles**:
- Glass cards with blur effects
- Soft shadows and highlights
- Minimal color palette (blues/grays)
- Responsive grid layout
- Mobile-first design

---

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ (ES modules support)
- npm or yarn
- Suno API key from [kie.ai](https://kie.ai)
- OpenAI API key (optional, for AI features)
- Cloudflare R2 account (optional, for storage)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/raga-radio.git
cd raga-radio

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env
```

### Environment Configuration

**Required**:
```bash
SUNO_API_KEY=your_suno_key_here
```

**Optional** (for full features):
```bash
# AI Features
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Storage
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=raga-radio
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# Feature Flags (optional)
ENABLE_GENERATION=true
```

### Running Locally

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Batch generation (CLI)
node src/index.js
```

**Access**: [http://localhost:8888](http://localhost:8888)

### Deployment

#### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# - SUNO_API_KEY
# - OPENAI_API_KEY (optional)
# - CLOUDFLARE_R2_* (optional)
# - ENABLE_GENERATION=false (recommended for cost control)
```

**Configuration**: `vercel.json` (already configured)

---

## 📱 iOS App

### Building iOS App

```bash
cd IOSApp/raag
open raag.xcodeproj
```

**Requirements**:
- Xcode 13+
- iOS 15+ target
- SwiftUI

**Configuration**:
Edit `ContentView.swift` to point to your deployment:
```swift
let url = URL(string: "https://your-deployment.vercel.app")!
```

**Features**:
- Native SwiftUI wrapper
- WebView integration
- Full offline support (if localhost configured)
- Native iOS playback controls

---

## 🎛️ Feature Flags

**File**: `src/features.js`

**Purpose**: Control feature availability by environment

**Flags**:

| Flag | Description | Default (Vercel) | Default (Localhost) |
|------|-------------|------------------|---------------------|
| `enableGeneration` | Allow music generation | `false` | `true` |

**Configuration**:
```javascript
// On Vercel: Disabled by default (security, cost control)
// On localhost: Enabled by default (full dev features)

const isVercel = process.env.VERCEL === '1';

export const features = {
  enableGeneration: isVercel
    ? process.env.ENABLE_GENERATION === 'true'
    : true
};
```

**Why?**
- Vercel is serverless/stateless
- Prevent accidental generation costs
- localhost has full capabilities for development

---

## 📊 Data Models

### Raga Object

```javascript
{
  name: "Yaman",
  thaat: "Khamar",                          // Scale family
  scaleIndian: "S R G M P D N",             // Indian notation
  aaroha: "S R G M P D N S'",               // Ascending pattern
  avaroha: "S' N D P M G R S",              // Descending pattern
  time: "Evening (6 PM - 10 PM)",           // Time of day
  mood: ["Peaceful", "Romantic"],           // Mood tags
  vadi: "G",                                // Primary note
  samvadi: "N",                             // Secondary note
  westernMode: "Lydian",                    // Western equivalent
  season: null,                             // Associated season
  difficulty: "Beginner",                   // Complexity
  pakad: "D N S' N D, P M G R S",           // Signature phrase
  description: "One of the most popular..."
}
```

### Genre Object

```javascript
{
  id: "atmospheric",
  name: "Atmospheric / Ambient",
  description: "Ethereal soundscapes...",
  sunoTags: ["ambient", "atmospheric", "meditative"],
  instruments: ["synth_pad", "ambient_guitar", "tabla"],
  moodMapping: ["Peaceful", "Meditative", "Mysterious"],
  defaultInstruments: ["synth_pad", "tabla", "tanpura"],
  bpmRange: {min: 40, max: 80},
  production: "Reverb-heavy, layered textures..."
}
```

### Instrument Object

```javascript
{
  id: "sitar",
  name: "Sitar",
  category: "indian_string",
  sunoDesc: "shimmering sitar with sympathetic strings, rich meend glides, resonant jawari buzz",
  gmProgram: 104,                           // MIDI program number
  role: "melodic"                           // melodic/rhythm/drone
}
```

### Track Metadata

```javascript
{
  filename: "raga_yaman_p2_1705427000_1.mp3",
  url: "https://bucket.r2.dev/...",
  ragaName: "Yaman",
  ragaId: "yaman",
  genre: "indianClassical",
  instruments: ["sitar", "tabla"],
  createdAt: "2025-01-14T22:30:45.123Z",
  duration: 60,
  midiFileUrl: "https://.../melody_yaman.mid",
  referenceAudioUrl: "https://.../melody_yaman.wav",
  sunoId: "track_id_xyz"
}
```

---

## 🔍 API Reference

### Generate Music (Quick Mode)

```http
POST /api/generate/:id
Content-Type: application/json

{
  "instruments": ["sitar", "tabla"]
}
```

**Response**:
```json
{
  "success": true,
  "taskId": "abc-123-def",
  "message": "Generation started",
  "raga": "Yaman"
}
```

### Generate Music (Authentic Mode)

```http
POST /api/generate/:id/authentic
Content-Type: application/json

{
  "instruments": ["sitar", "tabla", "tanpura"],
  "duration": 60,
  "genre": "indianClassical",
  "useAIPrompt": true
}
```

**Response**:
```json
{
  "success": true,
  "taskId": "abc-123-def",
  "raga": "Yaman",
  "genre": "indianClassical",
  "melody": {
    "noteCount": 45,
    "duration": 60,
    "generatedBy": "AI"
  },
  "referenceAudio": "https://.../melody_yaman.wav",
  "midiFile": "https://.../melody_yaman.mid"
}
```

### Check Status

```http
GET /api/status/:taskId
```

**Response**:
```json
{
  "success": true,
  "status": "SUCCESS",
  "data": {
    "sunoData": [
      {
        "id": "track_id",
        "audioUrl": "https://...",
        "duration": 60
      }
    ]
  }
}
```

### Download Track

```http
POST /api/download/:taskId
Content-Type: application/json

{
  "ragaName": "Yaman",
  "ragaId": "yaman",
  "instruments": ["sitar", "tabla"],
  "genre": "indianClassical",
  "referenceAudioUrl": "https://...",
  "midiFileUrl": "https://..."
}
```

### Get All Tracks

```http
GET /api/tracks
```

**Response**:
```json
{
  "success": true,
  "tracks": [
    {
      "filename": "raga_yaman_p2_1705427000_1.mp3",
      "url": "https://...",
      "ragaName": "Yaman",
      "genre": "indianClassical",
      "raga": {
        "name": "Yaman",
        "thaat": "Khamar",
        "mood": ["Peaceful", "Romantic"]
      }
    }
  ]
}
```

---

## 🧪 Testing

**Current Status**: Manual testing only (no automated test suite)

**Preview Endpoints**:

```bash
# Preview raga prompt without generation
GET /api/ragas/:id/preview

# Preview melody without synthesis
GET /api/melody/:id/preview
```

**Logging**:
```bash
# Logs written to
logs/raga-radio-YYYY-MM-DD.log

# Log levels: debug, info, warn, error
# Structured JSON format with timestamps
```

---

## 🎯 Use Cases

### 1. Music Education
- Learn raga theory with interactive examples
- Understand swara-to-Western conversions
- Study Alap-Jor-Jhala structure
- Download MIDI files for analysis

### 2. Creative Exploration
- Generate fusion music (Raga + Electronic/Metal/Jazz)
- Experiment with non-traditional instruments
- Create atmospheric soundscapes
- Remix with background music

### 3. Technical Research
- AI music generation research
- MIDI-based synthesis
- Prompt engineering for music
- Multi-modal AI integration

### 4. Content Creation
- Background music for videos
- Meditation/yoga soundtracks
- Cultural fusion projects
- Royalty-free raga music

---

## 🛠️ Troubleshooting

### Generation Fails

**Error**: "API key check failed"
- **Solution**: Check `SUNO_API_KEY` in `.env`

**Error**: "Generation timed out"
- **Solution**: Suno may be slow, try again or reduce duration

**Error**: "OpenAI generation failed"
- **Solution**: Falls back to algorithmic, check `OPENAI_API_KEY`

### Upload Fails

**Error**: "R2 not configured"
- **Solution**: Add Cloudflare R2 credentials, or app will use local storage

**Error**: "Upload failed"
- **Solution**: Check R2 bucket permissions and CORS settings

### Playback Issues

**Error**: Audio won't play
- **Solution**: Check browser console, ensure HTTPS (for WebAudio)

**Error**: Waveform not showing
- **Solution**: Check if AudioContext is initialized (user gesture required)

---

## 📈 Roadmap

- [ ] Automated testing suite
- [ ] User authentication & personal libraries
- [ ] Social sharing features
- [ ] Advanced raga mixer (combine multiple ragas)
- [ ] Real-time collaboration
- [ ] MIDI export with full ornamentations
- [ ] VST plugin integration
- [ ] Claude AI integration (replace OpenAI)
- [ ] Custom instrument synthesis
- [ ] Raga recommendation engine

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- **Suno AI** for cutting-edge music synthesis
- **OpenAI** for GPT models
- **Cloudflare** for R2 storage
- **Indian Classical Music** tradition for centuries of musical wisdom

---

## 📞 Support

- Issues: [GitHub Issues](https://github.com/yourusername/raga-radio/issues)
- Documentation: This README
- Logs: `logs/raga-radio-YYYY-MM-DD.log`

---

**Built with ❤️ for Indian Classical Music**
