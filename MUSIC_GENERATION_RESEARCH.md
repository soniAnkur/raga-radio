# Music Generation Research: Specific Notes & Ragas

## The Challenge

Indian Classical Ragas require **precise note sequences**:
- **Aaroha** (ascending pattern): Specific notes in specific order
- **Avaroha** (descending pattern): Specific notes in specific order
- **Vadi/Samvadi**: Primary and secondary notes that must be emphasized
- **Pakad**: Signature phrase that defines the raga's identity

Example - **Raga Yaman**:
- Scale: S R G M' P D N (with tivra/sharp Ma)
- Western: C D E F# G A B
- Aaroha: N R G M' D N S' (skips P in ascent)
- Avaroha: S' N D P M' G R S

## Current Approach: Suno AI (via kie.ai)

### What Suno CAN Do
| Feature | Support Level |
|---------|--------------|
| Mode names (Lydian, Dorian) | Good |
| Mood descriptors | Good |
| Instrument names (sitar, tabla) | Good |
| Genre/style | Good |
| Tempo/BPM | Good |
| Indian classical "feel" | Moderate |

### What Suno CANNOT Do
| Feature | Support Level |
|---------|--------------|
| Exact note sequences | Not supported |
| Specific aaroha/avaroha | Not guaranteed |
| MIDI input | Not supported |
| Note-by-note control | Not supported |
| Guaranteed scale adherence | Not reliable |

### Suno Prompt Best Practices (Research Findings)
1. **Put genre first** - Suno weights early words more heavily
2. **Use 4-7 descriptors** - More confuses the AI
3. **Mood words influence scales** - "sad" → minor, "bright" → major
4. **Specify BPM** for rhythm consistency
5. **Mode names work** - "Lydian mode" is understood
6. **Note lists are hints, not guarantees**

### Sources
- [Suno AI Wiki - Chord Progressions](https://sunoaiwiki.com/tips/2024-05-07-how-to-specify-chord-progressions-in-suno-ai/)
- [Ultimate Suno AI Prompt Guide](https://medium.com/@abhisheksd2003/the-ultimate-suno-ai-prompt-guide-with-clear-tested-examples-2d827ffe8b3a)
- [Suno V5 API Guide](https://suno-api.org/blog/2025/09-25-suno-v5-api)

---

## Alternative Approaches for Exact Note Control

### Option 1: MIDI-Based Generation

**How it works:** Generate MIDI files with exact notes, then render with instrument samples.

**Tools:**
| Tool | Description | Note Control |
|------|-------------|--------------|
| **Magenta (Google)** | AI music generation with MIDI I/O | Exact |
| **MuseNet (OpenAI)** | Transformer-based MIDI generation | Exact |
| **AIVA** | AI composer with MIDI export | Exact |
| **Amper Music** | AI music with stem control | High |

**Pros:**
- Exact note sequences guaranteed
- Can enforce aaroha/avaroha patterns
- Full control over vadi/samvadi emphasis

**Cons:**
- Requires Indian instrument soundfonts/samples
- More complex pipeline
- Less "organic" sound

### Option 2: Hybrid Approach

**Concept:** Use Suno for backing track (tanpura drone, tabla rhythm), overlay with MIDI-generated melody.

```
┌─────────────────┐     ┌─────────────────┐
│   Suno AI       │     │   MIDI Generator │
│   (Backing)     │     │   (Melody)       │
│                 │     │                  │
│ - Tanpura drone │     │ - Exact aaroha   │
│ - Tabla rhythm  │     │ - Exact avaroha  │
│ - Ambience      │     │ - Vadi emphasis  │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │   Mix/DAW   │
              │   (Merge)   │
              └─────────────┘
```

**Pros:**
- Best of both worlds
- Organic backing + precise melody
- Full raga authenticity

**Cons:**
- Complex multi-step process
- Requires audio mixing
- Latency in generation

### Option 3: Specialized Indian Music AI

**Emerging Tools:**
| Tool | Status | Notes |
|------|--------|-------|
| **Riyaz** | Research | IIT Bombay - Hindustani music AI |
| **Katha AI** | Beta | Indian classical focused |
| **Swar AI** | Concept | Raga-specific generation |

**Research Papers:**
- "Raga Recognition Using Deep Learning" - IIT Madras
- "Generative Models for Indian Classical Music" - IIIT Hyderabad

### Option 4: Programmatic MIDI Generation

**Concept:** Write code to generate MIDI based on raga rules.

```javascript
// Example: Generate Yaman aaroha as MIDI
const yamanAaroha = ['N', 'R', 'G', 'M', 'D', 'N', 'S'];
const midiNotes = yamanAaroha.map(swara => swaraToMidi(swara));
// Output: [71, 62, 64, 66, 69, 71, 72]

// Render with sitar soundfont
renderMidi(midiNotes, 'sitar.sf2');
```

**Libraries:**
| Library | Language | Purpose |
|---------|----------|---------|
| **Tone.js** | JavaScript | Web audio synthesis |
| **music21** | Python | Music analysis & MIDI |
| **Magenta.js** | JavaScript | AI music in browser |
| **FluidSynth** | C/Python | Soundfont rendering |

**Pros:**
- 100% control over notes
- Algorithmic raga generation
- Can implement all raga rules

**Cons:**
- Requires high-quality samples
- Sounds mechanical without humanization
- Development effort

---

## Recommended Path Forward

### For Authentic Raga Generation

**Phase 1: Improve Current (Quick Win)**
- Keep Suno for quick prototypes
- Accept limitations on note accuracy
- Use for "raga-inspired" rather than "authentic raga"

**Phase 2: Add MIDI Layer (Medium Effort)**
```
1. Generate backing track with Suno (drone + rhythm)
2. Generate melody MIDI programmatically (exact notes)
3. Render MIDI with Indian instrument soundfonts
4. Mix backing + melody
```

**Phase 3: Full Custom Solution (High Effort)**
```
1. Build raga rule engine (aaroha, avaroha, pakad, vadi)
2. Programmatic melody generation following rules
3. Use high-quality Indian instrument samples
4. Add humanization (timing variations, ornaments)
5. Real-time generation with Tone.js
```

---

## Indian Instrument Sample Sources

| Source | Quality | License | Price |
|--------|---------|---------|-------|
| **Native Instruments** | Professional | Commercial | $$$$ |
| **Spitfire Audio** | Professional | Commercial | $$$ |
| **Soundfonts (free)** | Variable | Free | Free |
| **Loopmasters** | Good | Royalty-free | $$ |
| **Splice** | Good | Subscription | $ |

### Free Soundfonts for Indian Instruments
- Sitar: `sitar.sf2` (various sources)
- Tabla: `tabla_loops.sf2`
- Tanpura: `tanpura_drone.sf2`
- Bansuri: `flute_indian.sf2`

---

## Technical Implementation Notes

### MIDI Note Mapping (Sa = C4)
```
Swara    Western    MIDI
──────────────────────────
S        C          60
r        Db         61
R        D          62
g        Eb         63
G        E          64
m        F          65
M        F#         66
P        G          67
d        Ab         68
D        A          69
n        Bb         70
N        B          71
S'       C'         72
```

### Raga Rule Engine (Pseudocode)
```javascript
class Raga {
  constructor(name, thaat, aaroha, avaroha, vadi, samvadi, pakad) {
    this.name = name;
    this.thaat = thaat;
    this.aaroha = aaroha;      // Allowed ascending notes
    this.avaroha = avaroha;    // Allowed descending notes
    this.vadi = vadi;          // Primary note (emphasize)
    this.samvadi = samvadi;    // Secondary note
    this.pakad = pakad;        // Signature phrase
  }

  isValidPhrase(notes, direction) {
    const allowed = direction === 'up' ? this.aaroha : this.avaroha;
    return notes.every(note => allowed.includes(note));
  }

  generateMelody(bars, tempo) {
    // Algorithmic generation following raga rules
    // - Start with alap (free rhythm)
    // - Include pakad phrases
    // - Emphasize vadi in middle octave
    // - Resolve to samvadi
    // - Follow aaroha/avaroha direction rules
  }
}
```

---

## Conclusion

**Current State:** Suno AI provides "raga-inspired" music but cannot guarantee authentic note sequences.

**For True Raga Authenticity:** A hybrid or programmatic approach is needed:
1. MIDI-based melody generation with exact notes
2. High-quality Indian instrument samples
3. Rule engine enforcing raga grammar
4. Humanization for natural feel

**Next Steps:**
1. [ ] Evaluate Magenta.js for browser-based MIDI generation
2. [ ] Source quality Indian instrument soundfonts
3. [ ] Build raga rule engine in JavaScript
4. [ ] Create hybrid pipeline (Suno backing + MIDI melody)
5. [ ] Test with Raga Yaman as proof of concept
