/**
 * Feature Flags Module
 * Controls feature availability based on environment
 *
 * On Vercel: features are disabled by default (must explicitly enable via env vars)
 * On localhost: all features are enabled by default
 */

const isVercel = process.env.VERCEL === '1';

export default {
  // Enable/disable raga generation
  // Localhost: always enabled
  // Vercel: disabled unless ENABLE_GENERATION=true
  enableGeneration: isVercel
    ? process.env.ENABLE_GENERATION === 'true'
    : true,
};
