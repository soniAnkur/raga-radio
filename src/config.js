/**
 * Configuration Module
 * Single Responsibility: Manage all application configuration
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Detect Vercel environment (only /tmp is writable)
const isVercel = process.env.VERCEL === '1';

export default {
  // API Configuration
  api: {
    baseUrl: process.env.SUNO_API_BASE_URL || 'https://api.kie.ai',
    key: process.env.SUNO_API_KEY,
    model: process.env.SUNO_MODEL || 'V4_5PLUS',
  },

  // Output Configuration
  output: {
    dir: isVercel ? '/tmp/output' : join(__dirname, '..', 'output'),
  },

  // Temp directory for reference audio files (local before R2 upload)
  temp: {
    dir: isVercel ? '/tmp/raga-temp' : join(__dirname, '..', 'temp'),
  },

  // Environment flag
  isVercel,

  // Cloudflare R2 configuration (for serving reference audio to Suno)
  r2: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL,
  },

  // Polling Configuration
  polling: {
    maxAttempts: 60,
    intervalMs: 10000, // 10 seconds
  },

  // Default tonic note (Sa = C)
  defaultTonic: 'C',

  // Server port
  port: process.env.PORT || 8888,
};
