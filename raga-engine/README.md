# raga-engine

Rule-checked raga melody generation in small, separate pieces. No dependency on the Raga Radio app, so each piece can be reused elsewhere, either as a JavaScript import or as an MCP tool.

| Piece | File | What it does |
|---|---|---|
| Raga rules | `grammar.js` | Turns aaroha, avaroha, pakad and chalan into the set of moves a raga allows |
| Phrase data | `phrases.js` | Extra characteristic phrases, andolan notes and resting notes per raga |
| Melody | `melody.js` | Builds alap, jor and taan out of phrases that follow those moves |
| Ornaments | `ornaments.js` | Meend, kan, andolan, gamak and murki that only touch raga notes |
| Checker (notes) | `validate.js` | Flags any note or move outside the raga |
| Reference audio | `synth.js` | Draws the melody as one continuous pitch line over a drone, as a WAV |
| Checker (audio) | `certify.js` | Listens to a WAV or MP3 and measures time held on notes outside the raga |
| Playing styles | `styles.js` | How an instrument is played, written for Suno; a few starter styles, and rules for defining more |
| Artist research | `research.js` | Looks any artist up on Wikipedia and returns what is written about how they play |
| Prompt builder | `prompt.js` | Raga, genre, instruments and styles in; Suno prompt, style tags and negative tags out |
| Suno | `suno.js` | Suno client (kie.ai) with every option exposed |
| MCP tools | `tools.js` | All of the above as MCP tools, shared by every server below |

## Use from code

```js
import { composeReference, buildSunoPrompt, BUILT_IN_STYLES } from './raga-engine/index.js';

const result = composeReference(raga, { id: 'yaman', tonic: 'D', seed: 11 });
result.check.valid;   // true, or the call throws
result.wav;           // Buffer: reference audio

const text = buildSunoPrompt({ raga, genre: 'metal', styles: [BUILT_IN_STYLES.carnatic_guitar] });
text.prompt; text.style; text.negativeTags;
```

## MCP tools

| Tool | What it does | Spends Suno credits |
|---|---|---|
| `list_ragas` | Ragas with their time of day and moods (when raga data is configured) | No |
| `raga_rules` | Notes, forbidden notes, allowed moves, phrases | No |
| `compose_melody` | Rule-checked melody with ornaments | No |
| `validate_melody` | Check a note sequence against a raga | No |
| `certify_audio` | Wrong-note share of a WAV or MP3 (link, or local path on the local server) | No |
| `research_artist` | What is written about how an artist plays | No |
| `research_music` | What is written about how a kind of music is put together (form, sections, tempo) | No |
| `plan_structure` | The layout of a piece: sections, pulse, pace, where the theme returns | No |
| `build_prompt` | The Suno prompt from raga, genre, instruments, styles, artists and structure | No |
| `list_styles` | Starter styles plus saved ones | No |
| `define_style` | Save a style for reuse | No |
| `suno_cover`, `suno_add_instrumental`, `suno_generate` | Suno calls with every option; `dryRun: true` is free | Yes, unless `dryRun` |
| `suno_status` | Check a Suno task | No |

### Playing "like" an artist

Suno rejects prompts that name artists, so names never go into the prompt. The flow is:

1. Call `build_prompt` with `artists: ["Some Artist"]`.
2. For an artist with no style yet, the result has `needs_style` with web research on how they play.
3. Write a style from that research in your own words (tone, phrasing, techniques, dynamics; no names) and call `build_prompt` again with it in `customStyles`, with `inspiredBy` set to the artist.
4. To reuse it later by name, save it with `define_style`.

No artist list is built in beyond the `inspiredBy` of the starter styles; `research_artist` works for anyone with a Wikipedia page.

### Structure for a kind of music

Without a structure a piece is the classical alap, jor, taan. For anything else ("soothing jazz", "lo-fi", "progressive metal") the layout is decided first, in steps:

1. `plan_structure` with `kind: "soothing jazz"`. It returns web research on how that music is built (`research_music` does the same on its own), the starter structures (`indian_classical`, `jazz_ballad`, `lofi_loop`, `progressive_metal`) and the fields a section can have.
2. Write the sections for this piece (for a jazz ballad: free intro, head, solo on the head, head out, tag) and call `plan_structure` again with `sections` and a `tempo`. It returns the checked structure.
3. Pass that `structure` to `compose_melody`, `build_prompt` or the host's `start_track`. A starter id works in place of the object.

Each section sets: `pulse` (free or steady), `pace`, `register`, `material` (explore, theme, variation, theme_return, runs, ending), which `theme` it uses, how ornamented and how loud it is, and an `arrangement` line for Suno.

**A structure never changes the notes.** It decides what comes when: where a theme is stated, varied and brought back, how busy a section is, where the piece rests. Every phrase is still built from the raga's own moves, each ornament stays on raga notes, the finished melody goes through the same checker as a classical one (an invalid melody is thrown away and recomposed), and it always ends on Sa. The tests compose every starter and a custom plan across three ragas and check every note, every move and every ornament.

The structure reaches Suno twice: as the guide melody it follows, and as text ("Structure, in order: Intro (0:00-0:20): ...") with the real timings from that melody. For instrumentals Suno reads the `style` field rather than the prompt, so the playing direction and the structure line are placed there as well, within its 1000 characters.

## Run it

**Local (stdio)**, for an agent on the same machine:

```bash
cd raga-engine && npm install
```

```json
{
  "mcpServers": {
    "raga-engine": {
      "command": "node",
      "args": ["/absolute/path/to/raga-engine/mcp-server.js"],
      "env": { "SUNO_API_KEY": "your kie.ai key", "RAGA_DATA_MODULE": "/absolute/path/to/src/data/ragas.js" }
    }
  }
}
```

**Remote (HTTP), standalone**, on any Node host:

```bash
PORT=8787 SUNO_API_KEY=... node raga-engine/http-server.js
# MCP endpoint: http://localhost:8787/mcp
```

**Remote (HTTP), inside Raga Radio**: the app serves the same tools at `/api/mcp`, plus `start_track` and `save_track`, which make and store a whole track using the app's Suno account and storage.

Connect Claude Code to a remote server:

```bash
claude mcp add --transport http raga-radio https://ragaradio.vercel.app/api/mcp
claude mcp list    # should show the server as connected
```

The remote servers have no access control: anyone who can reach the address can use every tool, including the ones that spend Suno credits.

Environment:

| Variable | Used for |
|---|---|
| `SUNO_API_KEY`, `SUNO_API_BASE_URL` | Suno tools |
| `RAGA_DATA_MODULE` | Path to a module whose default export maps id to raga; enables `ragaId` and `list_ragas` |
| `RAGA_STYLES_FILE` | Where the local and standalone servers save styles (default `~/.raga-engine/styles.json`) |
| `PORT` | Standalone HTTP server port (default 8787) |

## Notation

Uppercase is shuddha, lowercase is komal, `M` is tivra Ma. A leading `.` is the lower octave and a trailing `'` the upper: `.N S R G M P D N S'`.

## Adding depth to a raga

Add an entry to `phrases.js` with `chalan` (phrases), `andolan` (notes that swing) and `nyas` (resting notes). Phrases widen what the raga allows, so only add movements the raga really uses.

## Tests

```bash
node --test raga-engine/engine.test.mjs
```

## Limits

- The audio checker follows the strongest pitch per moment. It is reliable on a clear lead line and rougher on dense mixes.
- The `jobs` request style in `suno.js` follows kie.ai's current documentation; its status response has not been exercised against the live API.
- `research_music` and `research_artist` read Wikipedia only. For a kind of music the article is often about its history more than its form; use it together with what you know of the form.
- A structure shapes the guide melody exactly, but Suno treats the section text as direction, not a contract. Section lengths in the final track can differ.
- `research_artist` details: An article that says little about technique gives thin material; add to it before writing a style.
