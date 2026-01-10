# Raga Radio - Architecture Documentation

## Overview

Raga Radio is a web application that generates Indian Classical Music (Hindustani Ragas) using AI. It leverages the Suno API (via kie.ai) to create instrumental tracks based on precise musical specifications for each raga.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  index.html │  │  styles.css │  │   app.js    │  │ Audio Player│    │
│  │  (UI/Layout)│  │  (Styling)  │  │  (Logic)    │  │  (Playback) │    │
│  └──────┬──────┘  └─────────────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                                  │                 │           │
│         └──────────────────┬───────────────┴─────────────────┘           │
│                            │                                             │
│                    HTTP Requests (REST API)                              │
└────────────────────────────┼─────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXPRESS SERVER (Node.js)                         │
│                              src/server.js                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         API ENDPOINTS                            │    │
│  │  GET  /api/ragas          - List all ragas with Western notes   │    │
│  │  GET  /api/ragas/:id      - Get single raga details             │    │
│  │  GET  /api/ragas/:id/preview - Preview generation prompt        │    │
│  │  POST /api/generate/:id   - Start music generation              │    │
│  │  GET  /api/status/:taskId - Check generation status             │    │
│  │  POST /api/download/:taskId - Download completed tracks         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                            │                                             │
│         ┌──────────────────┼──────────────────┐                         │
│         ▼                  ▼                  ▼                         │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ data/ragas  │  │ promptBuilder   │  │   sunoApi       │              │
│  │    .js      │  │     .js         │  │     .js         │              │
│  │ (68 Ragas)  │  │ (AI Prompts)    │  │ (API Client)    │              │
│  └─────────────┘  └────────┬────────┘  └────────┬────────┘              │
│                            │                    │                        │
│                            ▼                    │                        │
│                   ┌─────────────────┐           │                        │
│                   │ swaraConverter  │           │                        │
│                   │      .js        │           │                        │
│                   │ (Note Convert)  │           │                        │
│                   └─────────────────┘           │                        │
└─────────────────────────────────────────────────┼────────────────────────┘
                                                  │
                                                  ▼
                                    ┌─────────────────────────┐
                                    │     kie.ai API          │
                                    │  (Suno Music Generation)│
                                    │                         │
                                    │  POST /api/v1/generate  │
                                    │  GET  /record-info      │
                                    └─────────────────────────┘
                                                  │
                                                  ▼
                                    ┌─────────────────────────┐
                                    │    Generated MP3 Files  │
                                    │    /output/*.mp3        │
                                    └─────────────────────────┘
```

## Directory Structure

```
raga_radio/
├── public/                      # Static frontend files
│   ├── index.html              # Main HTML (Apple HIG design)
│   ├── css/
│   │   └── styles.css          # Dark theme, glassmorphism
│   └── js/
│       └── app.js              # Frontend logic & API calls
│
├── src/                         # Backend source code
│   ├── server.js               # Express server & routes
│   ├── config.js               # Environment configuration
│   │
│   ├── data/
│   │   └── ragas.js            # 68 raga definitions
│   │
│   ├── converters/
│   │   └── swaraConverter.js   # Indian→Western note conversion
│   │
│   └── services/
│       ├── promptBuilder.js    # AI prompt generation
│       └── sunoApi.js          # kie.ai API client
│
├── output/                      # Generated MP3 files
├── .env                         # API keys (gitignored)
├── package.json                 # Dependencies
└── ARCHITECTURE.md              # This file
```

## Data Flow

### 1. User Browses Ragas
```
Browser                    Server
   │                          │
   │  GET /api/ragas          │
   │─────────────────────────>│
   │                          │  getAllRagas()
   │                          │  + swaraConverter()
   │                          │  (add Western notes)
   │  JSON: 68 ragas          │
   │<─────────────────────────│
   │                          │
   │  Render cards by         │
   │  Time/Mood categories    │
```

### 2. User Generates Track
```
Browser                    Server                    kie.ai API
   │                          │                          │
   │  POST /api/generate/:id  │                          │
   │─────────────────────────>│                          │
   │                          │  getRaga(id)             │
   │                          │  buildPayload()          │
   │                          │    └─ buildPromptText()  │
   │                          │    └─ buildStyle()       │
   │                          │    └─ getScaleNotes()    │
   │                          │                          │
   │                          │  POST /api/v1/generate   │
   │                          │─────────────────────────>│
   │                          │                          │
   │                          │  { taskId: "abc123" }    │
   │                          │<─────────────────────────│
   │  { taskId: "abc123" }    │                          │
   │<─────────────────────────│                          │
   │                          │                          │
   │  (Frontend polls status) │                          │
```

### 3. Download Completed Track
```
Browser                    Server                    kie.ai API
   │                          │                          │
   │  POST /api/download/:id  │                          │
   │─────────────────────────>│                          │
   │                          │  pollStatus() loop       │
   │                          │    GET /record-info      │
   │                          │<────────────────────────>│
   │                          │    (until SUCCESS)       │
   │                          │                          │
   │                          │  downloadTracks()        │
   │                          │    fetch(audioUrl)       │
   │                          │    save to /output/      │
   │                          │                          │
   │  { files: ["/output/..."] }                         │
   │<─────────────────────────│                          │
   │                          │                          │
   │  Play audio via          │                          │
   │  /output/raga_*.mp3      │                          │
```

## Core Components

### 1. Raga Data (`src/data/ragas.js`)

Each raga contains:
```javascript
{
  name: "Yaman",
  thaat: "Kalyan",
  scaleIndian: "S R G M P D N",    // Indian swaras
  aaroha: "N R G M D N S",         // Ascending pattern
  avaroha: "S N D P M G R S",      // Descending pattern
  time: "Evening (7 PM - 10 PM)",
  mood: ["Devotional", "Peaceful", "Romantic"],
  vadi: "G",                        // Primary note
  samvadi: "N",                     // Secondary note
  westernMode: "Lydian"
}
```

### 2. Note Converter (`src/converters/swaraConverter.js`)

Converts Indian swaras to Western notation:
```
S  → C   (Sa - tonic)
r  → Db  (komal Re)
R  → D   (shuddha Re)
g  → Eb  (komal Ga)
G  → E   (shuddha Ga)
m  → F   (shuddha Ma)
M  → F#  (tivra Ma)
P  → G   (Pa - fifth)
d  → Ab  (komal Dha)
D  → A   (shuddha Dha)
n  → Bb  (komal Ni)
N  → B   (shuddha Ni)
```

### 3. Prompt Builder (`src/services/promptBuilder.js`)

Generates AI prompts with:
- Exact Western notes and MIDI numbers
- Notes to avoid (chromatic exclusions)
- Melodic patterns (aaroha/avaroha)
- Vadi/Samvadi emphasis
- Time-based atmosphere
- Traditional instrumentation

### 4. Suno API Client (`src/services/sunoApi.js`)

Handles kie.ai communication:
- `generateMusic()` - Submit generation request
- `pollStatus()` - Wait for completion
- `downloadTracks()` - Save MP3 files

## API Payload (V5 Model)

```javascript
{
  prompt: "Indian classical instrumental...",  // Up to 5000 chars
  customMode: true,
  instrumental: true,
  model: "V5",                    // Latest model
  style: "Indian Classical...",   // Up to 1000 chars
  title: "Raga Yaman - Devotional Evening",
  negativeTags: "vocals, pop, rock...",
  callBackUrl: "https://...",
  styleWeight: 0.7,               // Style adherence
  weirdnessConstraint: 0.3,       // Traditional sound
  audioWeight: 0.6                // Audio balance
}
```

## Status Flow (kie.ai)

```
PENDING → TEXT_SUCCESS → FIRST_SUCCESS → SUCCESS
                              │
                              └─ First track ready
                                 (can start playback)
```

## Environment Variables

```bash
SUNO_API_KEY=your_api_key        # kie.ai API key
SUNO_API_BASE_URL=https://api.kie.ai
SUNO_MODEL=V5                    # Default model
PORT=8080                        # Server port
```

## Frontend Categories

### By Time
- Morning (4 AM - 10 AM)
- Afternoon (10 AM - 4 PM)
- Evening (4 PM - 10 PM)
- Night (10 PM - 4 AM)

### By Mood
- Devotional (30 ragas)
- Romantic (27 ragas)
- Peaceful (21 ragas)
- Serious (20 ragas)

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid API key | Check .env file |
| 402 Insufficient credits | No kie.ai credits | Top up at kie.ai |
| 429 Rate limited | Too many requests | Wait and retry |
| 500 Server error | API issue | Check logs |

## Future Enhancements

1. **Playlist Support** - Queue multiple ragas
2. **Favorites** - Save preferred generations
3. **Custom Tonic** - Change Sa from C to any note
4. **Duration Control** - Short/medium/long tracks
5. **Raga Combinations** - Mix compatible ragas
