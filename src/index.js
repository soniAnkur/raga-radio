#!/usr/bin/env node
/**
 * Raga Radio - Main Entry Point
 * Single Responsibility: Orchestrate the music generation workflow
 */

import { getRaga, getRagaNames } from './data/ragas.js';
import { getScaleNotes, getMidiNotes, getIntervals } from './converters/swaraConverter.js';
import { buildPayload, formatPayloadPreview } from './services/promptBuilder.js';
import { checkApiKey, generateMusic, pollStatus, downloadTracks } from './services/sunoApi.js';
import config from './config.js';

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
Raga Radio - Generate Instrumental Tracks for Indian Classical Ragas

Usage:
  node src/index.js [options] [raga-name]

Options:
  --preview     Preview the prompt without sending to API
  --list        List all available ragas
  --help        Show this help message

Examples:
  node src/index.js                    # Generate for default raga (Yaman)
  node src/index.js yaman              # Generate for Raga Yaman
  node src/index.js bhairav --preview  # Preview prompt for Raga Bhairav
  node src/index.js --list             # List all available ragas

Available Ragas:
  ${getRagaNames().join(', ')}
`);
}

/**
 * Print raga information
 * @param {object} raga - Raga data object
 */
function printRagaInfo(raga) {
  console.log(`
Raga: ${raga.name}
Thaat: ${raga.thaat} (${raga.westernMode})
Time: ${raga.time}
Mood: ${raga.mood.join(', ')}

Scale Conversion:
  Indian:  ${raga.scaleIndian}
  Western: ${getScaleNotes(raga.scaleIndian)}
  MIDI:    ${getMidiNotes(raga.scaleIndian)}
  Intervals: ${getIntervals(raga.scaleIndian)} semitones

Vadi (Primary): ${raga.vadi}
Samvadi (Secondary): ${raga.samvadi}
`);
}

/**
 * Parse command line arguments
 * @returns {object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  return {
    preview: args.includes('--preview'),
    list: args.includes('--list'),
    help: args.includes('--help') || args.includes('-h'),
    ragaName: args.find(arg => !arg.startsWith('--')) || 'yaman',
  };
}

/**
 * Main application entry point
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Raga Radio - Instrumental Track Generator');
  console.log('='.repeat(60));

  const args = parseArgs();

  // Handle help
  if (args.help) {
    printUsage();
    return;
  }

  // Handle list
  if (args.list) {
    console.log('\nAvailable Ragas:\n');
    const ragas = getRagaNames();
    ragas.forEach(name => console.log(`  - ${name}`));
    console.log(`\nTotal: ${ragas.length} ragas`);
    return;
  }

  // Get raga data
  const raga = getRaga(args.ragaName);
  if (!raga) {
    console.error(`\nError: Raga "${args.ragaName}" not found.`);
    console.log('Available ragas:', getRagaNames().join(', '));
    process.exit(1);
  }

  // Print raga information
  printRagaInfo(raga);

  // Build payload
  const payload = buildPayload(raga, { model: config.api.model });

  // Preview mode
  console.log(formatPayloadPreview(payload));

  if (args.preview) {
    console.log('Preview mode - not sending to API.');
    console.log('Run without --preview to generate music.');
    return;
  }

  // Check API key before proceeding
  try {
    checkApiKey();
  } catch (error) {
    console.error(`\n${error.message}`);
    process.exit(1);
  }

  try {
    // Generate music
    const taskId = await generateMusic(payload);

    // Poll for completion
    const record = await pollStatus(taskId);

    // Download tracks
    const files = await downloadTracks(record, raga.name);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Generation complete!');
    if (files.length > 0) {
      console.log(`Downloaded ${files.length} track(s) to: ${config.output.dir}`);
    }
    console.log('='.repeat(60));
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
