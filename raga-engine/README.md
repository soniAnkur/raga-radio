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
| Suno | `suno.js` | Suno client (kie.ai) with every option exposed |

## Use from code

```js
import { composeReference } from './raga-engine/index.js';

const result = composeReference(raga, { id: 'yaman', tonic: 'D', duration: 90, seed: 11 });
result.check.valid;   // true, or the call throws
result.wav;           // Buffer: reference audio
result.events;        // notes with timing and ornaments
```

## Use as an MCP server

```bash
cd raga-engine && npm install
```

```json
{
  "mcpServers": {
    "raga-engine": {
      "command": "node",
      "args": ["/absolute/path/to/raga-engine/mcp-server.js"],
      "env": {
        "SUNO_API_KEY": "your kie.ai key",
        "RAGA_DATA_MODULE": "/absolute/path/to/src/data/ragas.js"
      }
    }
  }
}
```

Tools: `raga_rules`, `compose_melody`, `validate_melody`, `certify_audio`, `suno_cover`, `suno_add_instrumental`, `suno_generate`, `suno_status`.

`RAGA_DATA_MODULE` is optional. With it, tools accept `ragaId`; without it, pass a full `raga` definition. The Suno tools take `dryRun: true` to show the request without sending it or spending credits.

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
