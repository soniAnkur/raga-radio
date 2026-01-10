/**
 * AI-Powered Suno Prompt Generator
 * Uses OpenAI to generate creative, varied prompts for Suno API
 *
 * Key features:
 * - Generates creative, non-repetitive prompts
 * - Follows Suno AI best practices (character limits, descriptor count)
 * - Adapts to different genres while preserving raga essence
 */

import OpenAI from 'openai';
import { createLogger } from '../utils/logger.js';
import { genres, getGenreById } from '../data/genres.js';
import { instruments, getInstrumentById, buildInstrumentDescription } from '../data/instruments.js';

const log = createLogger('AIPrompt');

/**
 * Check if OpenAI API is configured
 */
function isOpenAIConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Create OpenAI client
 */
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not found in environment variables');
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Build the system prompt for Suno prompt generation
 */
function buildSystemPrompt() {
  return `You are an expert music producer who specializes in creating Suno AI prompts.

SUNO AI BEST PRACTICES:
1. Style field MUST be under 200 characters
2. Use 4-7 descriptors (sweet spot for best results)
3. Order: Genre → Mood → Instruments → Production quality
4. Be specific, not generic ("haunting Bhairav scale" beats "Indian music")
5. Include era/decade references for flavor ("90s prog metal", "70s fusion")
6. Describe emotional arc and energy progression
7. negativeTags field MUST be under 200 characters

WHAT MAKES GREAT PROMPTS:
- Evocative imagery ("moonlit meditation", "dawn awakening")
- Production style details ("reverb-drenched", "punchy mix", "wide stereo")
- Tempo/energy descriptions ("building intensity", "meditative stillness")
- Unexpected genre blends work well ("Indian classical meets prog metal")

OUTPUT REQUIREMENTS:
Return ONLY valid JSON with exactly these fields:
{
  "prompt": "Main creative description (max 500 chars)",
  "style": "Comma-separated tags (max 200 chars, 4-7 descriptors)",
  "negativeTags": "What to avoid (max 200 chars)"
}`;
}

/**
 * Build the user prompt for Suno prompt generation
 */
function buildUserPrompt(raga, genre, instrumentIds) {
  const genreData = getGenreById(genre);
  const instrumentDescs = instrumentIds
    .map(id => getInstrumentById(id))
    .filter(Boolean)
    .map(i => `${i.name}: ${i.sunoDesc}`)
    .join('\n');

  const instrumentNames = instrumentIds
    .map(id => getInstrumentById(id)?.name)
    .filter(Boolean)
    .join(', ');

  return `Create a creative Suno AI prompt for this raga-genre combination:

=== RAGA INFORMATION ===
Name: ${raga.name}
Mood: ${raga.mood?.join(', ') || 'Peaceful'}
Time of Day: ${raga.time || 'Any time'}
Western Mode: ${raga.westernMode || 'Modal'}
Vadi (primary note): ${raga.vadi || 'G'}
Samvadi (secondary note): ${raga.samvadi || 'N'}
${raga.special ? `Special characteristic: ${raga.special}` : ''}

=== GENRE ===
Genre: ${genreData.name}
Genre Tags: ${genreData.sunoTags.join(', ')}
Production Style: ${genreData.production || 'High quality'}
BPM Range: ${genreData.bpmRange?.min || 60}-${genreData.bpmRange?.max || 120}

=== INSTRUMENTS ===
Selected: ${instrumentNames}
Descriptions:
${instrumentDescs}

=== REQUIREMENTS ===
1. Create a prompt that blends the raga's essence with the genre's sound
2. Mention specific instruments and their roles
3. Describe the emotional journey (how energy builds/flows)
4. Include production style appropriate for the genre
5. Be creative and evocative - avoid generic descriptions

REMEMBER:
- style field: max 200 chars, 4-7 descriptors
- negativeTags: max 200 chars
- Be specific about what instruments to AVOID based on genre

Generate the JSON now:`;
}

/**
 * Validate and fix the generated prompt
 */
function validateAndFixPrompt(result) {
  // Ensure style is under 200 chars
  if (result.style && result.style.length > 200) {
    // Truncate to nearest comma before 200 chars
    const truncated = result.style.substring(0, 200);
    const lastComma = truncated.lastIndexOf(',');
    result.style = lastComma > 50 ? truncated.substring(0, lastComma) : truncated;
    log.warn('Truncated style field to 200 chars');
  }

  // Ensure negativeTags is under 200 chars
  if (result.negativeTags && result.negativeTags.length > 200) {
    const truncated = result.negativeTags.substring(0, 200);
    const lastComma = truncated.lastIndexOf(',');
    result.negativeTags = lastComma > 50 ? truncated.substring(0, lastComma) : truncated;
    log.warn('Truncated negativeTags field to 200 chars');
  }

  // Ensure prompt is under 500 chars
  if (result.prompt && result.prompt.length > 500) {
    result.prompt = result.prompt.substring(0, 497) + '...';
    log.warn('Truncated prompt field to 500 chars');
  }

  return result;
}

/**
 * Generate fallback prompt if AI fails
 */
function generateFallbackPrompt(raga, genreId, instrumentIds) {
  const genreData = getGenreById(genreId);
  const instrumentNames = instrumentIds
    .map(id => getInstrumentById(id)?.name)
    .filter(Boolean)
    .join(', ');

  return {
    prompt: `${genreData.name} interpretation of Raga ${raga.name}. ${raga.mood?.join(' and ') || 'Peaceful'} atmosphere with ${instrumentNames}. ${genreData.production || 'High quality production'}`,
    style: genreData.sunoTags.slice(0, 6).join(', '),
    negativeTags: 'vocals, singing, harsh noise, off-key'
  };
}

/**
 * Main function to generate Suno prompt using AI
 * @param {Object} raga - Raga data from ragas.js
 * @param {string} genreId - Genre ID from genres.js
 * @param {string[]} instrumentIds - Array of instrument IDs
 * @param {Object} options - Optional settings
 * @returns {Promise<{prompt: string, style: string, negativeTags: string}>}
 */
export async function generateSunoPrompt(raga, genreId, instrumentIds, options = {}) {
  const { temperature = 0.8, model = 'gpt-4o-mini' } = options;

  log.info('Generating AI Suno prompt', {
    raga: raga.name,
    genre: genreId,
    instruments: instrumentIds.length
  });

  // Use fallback if OpenAI not configured
  if (!isOpenAIConfigured()) {
    log.warn('OpenAI not configured, using fallback prompt');
    return generateFallbackPrompt(raga, genreId, instrumentIds);
  }

  try {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(raga, genreId, instrumentIds) }
      ],
      temperature,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const responseText = response.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error('Empty response from AI');
    }

    log.debug('AI prompt response received', { length: responseText.length });

    // Parse JSON response
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      log.error('Failed to parse AI response', { error: parseError.message });
      return generateFallbackPrompt(raga, genreId, instrumentIds);
    }

    // Validate and fix
    result = validateAndFixPrompt(result);

    log.info('AI Suno prompt generated', {
      promptLength: result.prompt?.length,
      styleLength: result.style?.length,
      negativeLength: result.negativeTags?.length
    });

    return result;

  } catch (error) {
    log.error('AI prompt generation failed', { error: error.message });
    return generateFallbackPrompt(raga, genreId, instrumentIds);
  }
}

/**
 * Generate a title for the track
 */
export function generateTitle(raga, genreId, instrumentIds) {
  const genreData = getGenreById(genreId);
  const instrumentCount = instrumentIds.length;
  const mood = raga.mood?.[0] || 'Peaceful';

  return `Raga ${raga.name} | ${instrumentCount} Instruments | ${mood}`;
}

/**
 * Build complete Suno API payload
 */
export async function buildSunoPayload(raga, genreId, instrumentIds, uploadUrl, options = {}) {
  const aiPrompt = await generateSunoPrompt(raga, genreId, instrumentIds, options);
  const title = generateTitle(raga, genreId, instrumentIds);

  return {
    uploadUrl,
    prompt: aiPrompt.prompt,
    style: aiPrompt.style,
    title,
    customMode: true,
    instrumental: true,
    model: 'V5',
    negativeTags: aiPrompt.negativeTags,
    styleWeight: 0.7,
    weirdnessConstraint: 0.3,
    audioWeight: 0.6,
    callBackUrl: options.callbackUrl || 'https://example.com/callback'
  };
}

export default {
  generateSunoPrompt,
  generateTitle,
  buildSunoPayload
};
