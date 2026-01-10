/**
 * Cloudflare R2 Storage Service
 * Uploads audio files to R2 and returns public URLs for Suno API
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFile } from 'fs/promises';
import { createLogger } from '../utils/logger.js';

const log = createLogger('R2');

/**
 * Creates an S3 client configured for Cloudflare R2
 */
function createR2Client() {
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.replace(/[\n\r\t\s]/g, '');
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.replace(/[\n\r\t\s]/g, '');
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.replace(/[\n\r\t\s]/g, '');

  if (!accessKeyId || !secretAccessKey || !accountId) {
    throw new Error('Cloudflare R2 credentials are required. Set CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, and CLOUDFLARE_R2_ACCOUNT_ID in .env');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true, // Important for R2 compatibility
  });
}

/**
 * Get R2 bucket configuration
 */
function getR2Config() {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME?.replace(/[\n\r\t\s]/g, '');
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/[\n\r\t\s]/g, '');

  if (!bucketName || !publicUrl) {
    throw new Error('R2 bucket configuration required. Set CLOUDFLARE_R2_BUCKET_NAME and CLOUDFLARE_R2_PUBLIC_URL in .env');
  }

  return { bucketName, publicUrl };
}

/**
 * Upload a file from local path to Cloudflare R2
 * @param {string} localPath - Local file path
 * @param {string} filename - Filename to use in R2
 * @param {string} contentType - MIME type (default: audio/wav)
 * @returns {Promise<string>} Public URL of uploaded file
 */
export async function uploadFileToR2(localPath, filename, contentType = 'audio/wav') {
  log.info(`Uploading to R2: ${filename}`);

  try {
    // Read the file
    const buffer = await readFile(localPath);

    if (!buffer || buffer.length === 0) {
      throw new Error('Empty file');
    }

    log.debug(`File size: ${(buffer.length / 1024).toFixed(1)} KB`);

    const { bucketName, publicUrl } = getR2Config();
    const r2Client = createR2Client();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `raga-radio/${filename}`, // Store in raga-radio subfolder
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=3600', // Cache for 1 hour
    });

    await r2Client.send(command);

    const fileUrl = `${publicUrl}/raga-radio/${filename}`;
    log.info(`✅ Uploaded to R2: ${fileUrl}`);

    return fileUrl;

  } catch (error) {
    log.error('R2 upload failed', { error: error.message, filename });
    throw error;
  }
}

/**
 * Upload a buffer directly to Cloudflare R2
 * @param {Buffer} buffer - Audio data buffer
 * @param {string} filename - Filename to use in R2
 * @param {string} contentType - MIME type (default: audio/wav)
 * @returns {Promise<string>} Public URL of uploaded file
 */
export async function uploadBufferToR2(buffer, filename, contentType = 'audio/wav') {
  log.info(`Uploading buffer to R2: ${filename}`);

  try {
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty buffer');
    }

    log.debug(`Buffer size: ${(buffer.length / 1024).toFixed(1)} KB`);

    const { bucketName, publicUrl } = getR2Config();
    const r2Client = createR2Client();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `raga-radio/${filename}`,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=3600',
    });

    await r2Client.send(command);

    const fileUrl = `${publicUrl}/raga-radio/${filename}`;
    log.info(`✅ Uploaded to R2: ${fileUrl}`);

    return fileUrl;

  } catch (error) {
    log.error('R2 buffer upload failed', { error: error.message, filename });
    throw error;
  }
}

/**
 * Check if R2 is properly configured
 * @returns {boolean}
 */
export function isR2Configured() {
  const required = [
    'CLOUDFLARE_R2_ACCESS_KEY_ID',
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    'CLOUDFLARE_R2_ACCOUNT_ID',
    'CLOUDFLARE_R2_BUCKET_NAME',
    'CLOUDFLARE_R2_PUBLIC_URL',
  ];

  return required.every(key => !!process.env[key]);
}
