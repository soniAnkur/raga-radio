/**
 * One-time migration script to upload existing tracks-metadata.json to R2
 * Run with: node scripts/migrate-metadata-to-r2.js
 */

import { config } from 'dotenv';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import R2 functions
const { putJsonToR2, isR2Configured } = await import('../src/services/cloudflare-r2.js');

async function migrate() {
  console.log('🚀 Starting metadata migration to R2...\n');

  // Check R2 configuration
  if (!isR2Configured()) {
    console.error('❌ R2 not configured. Set R2 credentials in .env file.');
    process.exit(1);
  }

  // Read local metadata file
  const metadataPath = join(__dirname, '..', 'output', 'tracks-metadata.json');
  console.log(`📂 Reading local metadata from: ${metadataPath}`);

  try {
    const content = await readFile(metadataPath, 'utf-8');
    const tracks = JSON.parse(content);

    console.log(`📊 Found ${tracks.length} tracks in local metadata\n`);

    // Upload to R2
    console.log('☁️  Uploading to R2...');
    const r2Key = 'raga-radio/tracks-metadata.json';
    await putJsonToR2(r2Key, tracks);

    console.log(`\n✅ Successfully migrated ${tracks.length} tracks to R2!`);
    console.log(`   Key: ${r2Key}`);

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('❌ Local metadata file not found:', metadataPath);
    } else {
      console.error('❌ Migration failed:', error.message);
    }
    process.exit(1);
  }
}

migrate();
