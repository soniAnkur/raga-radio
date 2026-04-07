# CLAUDE.md - Raga Radio

## Project Overview

Raga Radio is a full-stack Node.js/Express platform that generates Indian classical music tracks using AI. It combines Suno's music generation API with OpenAI for melody composition, featuring algorithmic fallbacks and Cloudflare R2 storage. Includes a vanilla JS frontend and an iOS (SwiftUI) wrapper app.

## Quick Reference

```bash
npm run dev          # Start dev server with nodemon (port 8888)
npm run dev:watch    # Start dev server with Node --watch
npm start            # Production server
npm run generate     # CLI batch generation
npm run preview      # Preview generation (no API calls)
npm run logs         # Tail today's log file
npm run logs:clear   # Clear all log files
```

## Architecture

```
src/
├── server.js                  # Express API server (13+ endpoints)
├── index.js                   # CLI entry point for batch generation
├── config.js                  # Central config (env vars, paths)
├── features.js                # Feature flags
├── data/
│   ├── ragas.js               # 68+ raga definitions with musical metadata
│   ├── genres.js              # 9+ genre definitions
│   └── instruments.js         # 25+ instrument definitions
├── generators/
│   ├── alapGenerator.js       # Algorithmic melody generation (weighted random)
│   └── midiBuilder.js         # MIDI file creation (midi-writer-js)
├── services/
│   ├── sunoApi.js             # Suno/kie.ai API client (music generation)
│   ├── aiMelodyGenerator.js   # OpenAI GPT melody generation
│   ├── aiPromptGenerator.js   # OpenAI prompt generation for multi-genre
│   ├── promptBuilder.js       # Template-based prompt builder
│   ├── synthesizer.js         # WAV sine-wave synthesis
│   └── cloudflare-r2.js       # R2 upload client (S3-compatible)
├── converters/
│   └── swaraConverter.js      # Indian swara ↔ Western note conversion
└── utils/
    └── logger.js              # Structured logging (console + file)

public/                        # Vanilla JS/CSS/HTML frontend
api/index.js                   # Vercel serverless handler
IOSApp/                        # SwiftUI iOS wrapper app
documentation/                 # Architecture docs (deployed to Vercel)
scripts/                       # One-time utility scripts
```

## Tech Stack

- **Runtime**: Node.js with ES modules (`"type": "module"`)
- **Server**: Express 4.18
- **Music Generation**: Suno API via kie.ai
- **AI/LLM**: OpenAI (GPT-4/3.5-turbo) for melody & prompt generation
- **Audio**: midi-writer-js (MIDI), wav (WAV synthesis)
- **Storage**: Cloudflare R2 (@aws-sdk/client-s3), local `/output` fallback
- **Frontend**: Vanilla HTML/CSS/JS (no framework, no build step)
- **Deployment**: Vercel (serverless)
- **Dev Tools**: nodemon

## Key Patterns & Conventions

### Code Style
- Pure JavaScript (no TypeScript, no linter, no formatter configured)
- ES module imports/exports throughout (`import`/`export default`)
- Async/await for all async operations (no raw promises)
- Single-responsibility modules - each file does one thing

### Error Handling & Fallbacks
- **Always** wrap async operations in try/catch with detailed logging
- AI melody generation falls back to algorithmic (AlapGenerator) on failure
- R2 storage falls back to local `/output` directory on failure
- Suno API uses polling: 60 attempts, 10-second intervals

### Factory Functions
- `createLogger(category)` - category-based structured logging
- `createR2Client()` - S3-compatible R2 client
- `getOpenAIClient()` - lazy-initialized OpenAI client

### Configuration
- All config via environment variables, loaded through `src/config.js`
- Feature flags in `src/features.js`
- Vercel detection: `process.env.VERCEL === '1'`
- See `.env.example` for all variables

### Data Layer
- Static data definitions in `src/data/` (ragas, genres, instruments)
- Raga definitions include: name, thaat, aroha/avaroha, vadi/samvadi, mood, time
- No database - metadata stored in R2 JSON files or local filesystem

### Logging
- Use `createLogger('ModuleName')` for each module
- Levels: DEBUG, INFO, WARN, ERROR
- Console output is colored with ANSI; file output is structured JSON
- File logging disabled on Vercel (stateless environment)

## Generation Modes

1. **Quick Mode** (`POST /api/generate/:id`) - Template prompt, no reference audio, 2-3 min
2. **Authentic Mode** (`POST /api/generate/:id/authentic`) - AI/algorithmic melody → MIDI → WAV → R2 upload → Suno with reference audio, 3-5 min

### Melody Structure (Alap-Jor-Jhala)
- **Alap** (0-35%): Slow, meditative, long notes (2-4 sec)
- **Jor** (35-70%): Medium tempo, rhythmic pulse
- **Jhala** (70-100%): Fast climax, ornamentations

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `SUNO_API_KEY` | Yes | - | Suno music generation API key |
| `SUNO_API_BASE_URL` | No | https://api.kie.ai | Suno API endpoint |
| `SUNO_MODEL` | No | V4_5PLUS | Suno model version |
| `PORT` | No | 8888 | Server port |
| `ENABLE_GENERATION` | No | true (local) / false (Vercel) | Generation feature flag |
| `OPENAI_API_KEY` | No | - | AI melody/prompt generation |
| `OPENAI_MODEL` | No | gpt-3.5-turbo | GPT model selection |
| `CLOUDFLARE_R2_*` | No | - | R2 storage (5 vars: ACCESS_KEY_ID, SECRET_ACCESS_KEY, ACCOUNT_ID, BUCKET_NAME, PUBLIC_URL) |

## Testing

No automated test suite. Use these for manual verification:
- `GET /api/ragas/:id/preview` - Preview generation prompt without calling APIs
- `GET /api/melody/:id/preview` - Preview melody events without generation
- CLI: `npm run preview` - Dry-run batch generation

## Deployment

- **Platform**: Vercel with `@vercel/node` runtime
- **Config**: `vercel.json` rewrites all non-static routes to `api/index.js`
- **Function timeout**: 60 seconds max
- **Static assets**: `public/` served directly by Vercel CDN
- Generation is disabled by default on Vercel (`ENABLE_GENERATION=false`)

## Important Notes

- No build step required - plain JS runs directly
- MIDI uses GM instrument 104 (Sitar) at 45 BPM
- WAV synthesis: 44.1 kHz, 16-bit, mono with ADSR envelope
- Indian note system (Sa, Re, Ga...) maps to Western notes via swaraConverter
- Vadi notes weighted 3x, samvadi 2x in algorithmic generation
