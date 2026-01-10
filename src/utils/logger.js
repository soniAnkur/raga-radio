/**
 * Logger Utility
 * Provides colored console output and file logging for debugging
 */

import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log levels
const LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// Level colors and labels
const LEVEL_CONFIG = {
  DEBUG: { color: COLORS.dim + COLORS.cyan, label: 'DEBUG', emoji: '🔍' },
  INFO: { color: COLORS.green, label: 'INFO ', emoji: '✅' },
  WARN: { color: COLORS.yellow, label: 'WARN ', emoji: '⚠️' },
  ERROR: { color: COLORS.red + COLORS.bright, label: 'ERROR', emoji: '❌' },
};

// Detect Vercel environment (disable file logging)
const isVercel = process.env.VERCEL === '1';

// Configuration
const config = {
  level: LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LEVELS.DEBUG,
  logToFile: !isVercel && process.env.LOG_TO_FILE !== 'false',
  logDir: join(__dirname, '..', '..', 'logs'),
};

// Ensure log directory exists (skip on Vercel)
if (config.logToFile && !isVercel) {
  if (!existsSync(config.logDir)) {
    mkdirSync(config.logDir, { recursive: true });
  }
}

/**
 * Format timestamp for logging
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 23);
}

/**
 * Get today's log file path
 */
function getLogFilePath() {
  const date = new Date().toISOString().split('T')[0];
  return join(config.logDir, `raga-radio-${date}.log`);
}

/**
 * Strip ANSI color codes from a string
 */
function stripColors(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Format a log message
 */
function formatMessage(level, category, message, data) {
  const timestamp = getTimestamp();
  const levelConfig = LEVEL_CONFIG[level];

  let formattedData = '';
  if (data !== undefined) {
    if (typeof data === 'object') {
      formattedData = '\n' + JSON.stringify(data, null, 2);
    } else {
      formattedData = ' ' + String(data);
    }
  }

  const consoleMsg = `${COLORS.dim}${timestamp}${COLORS.reset} ${levelConfig.emoji} ${levelConfig.color}[${levelConfig.label}]${COLORS.reset} ${COLORS.magenta}[${category}]${COLORS.reset} ${message}${formattedData}`;

  return {
    console: consoleMsg,
    file: `${timestamp} [${levelConfig.label}] [${category}] ${stripColors(message)}${stripColors(formattedData)}\n`,
  };
}

/**
 * Write log entry
 */
function log(level, category, message, data) {
  if (LEVELS[level] < config.level) return;

  const formatted = formatMessage(level, category, message, data);

  // Console output
  if (level === 'ERROR') {
    console.error(formatted.console);
  } else if (level === 'WARN') {
    console.warn(formatted.console);
  } else {
    console.log(formatted.console);
  }

  // File output
  if (config.logToFile) {
    try {
      appendFileSync(getLogFilePath(), formatted.file);
    } catch (err) {
      console.error('Failed to write to log file:', err.message);
    }
  }
}

/**
 * Create a logger instance for a specific category
 */
export function createLogger(category) {
  return {
    debug: (message, data) => log('DEBUG', category, message, data),
    info: (message, data) => log('INFO', category, message, data),
    warn: (message, data) => log('WARN', category, message, data),
    error: (message, data) => log('ERROR', category, message, data),

    // Special methods for common patterns
    request: (method, path, data) => {
      log('INFO', category, `${COLORS.cyan}${method}${COLORS.reset} ${path}`, data);
    },
    response: (status, path, duration) => {
      const color = status < 400 ? COLORS.green : COLORS.red;
      log('INFO', category, `${color}${status}${COLORS.reset} ${path} ${COLORS.dim}(${duration}ms)${COLORS.reset}`);
    },
    api: (action, data) => {
      log('DEBUG', category, `API: ${action}`, data);
    },
  };
}

/**
 * Express middleware for request logging
 */
export function requestLogger(category = 'HTTP') {
  const logger = createLogger(category);

  return (req, res, next) => {
    const start = Date.now();

    // Log request
    logger.request(req.method, req.path, req.method === 'POST' ? req.body : undefined);

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.response(res.statusCode, req.path, duration);
    });

    next();
  };
}

/**
 * Log a separator line (for visual debugging)
 */
export function logSeparator(title = '') {
  const line = '─'.repeat(60);
  if (title) {
    console.log(`\n${COLORS.dim}${line}${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.cyan}  ${title}${COLORS.reset}`);
    console.log(`${COLORS.dim}${line}${COLORS.reset}\n`);
  } else {
    console.log(`${COLORS.dim}${line}${COLORS.reset}`);
  }
}

/**
 * Log application startup banner
 */
export function logStartup(port) {
  console.log(`
${COLORS.cyan}${COLORS.bright}
╔═══════════════════════════════════════════════════════════╗
║                    🎵 RAGA RADIO 🎵                       ║
║                                                           ║
║   Server running at: ${COLORS.yellow}http://localhost:${port}${COLORS.cyan}               ║
║   Log level: ${COLORS.green}${Object.keys(LEVELS).find(k => LEVELS[k] === config.level)}${COLORS.cyan}                                       ║
║   Log file: ${COLORS.dim}${config.logToFile ? 'enabled' : 'disabled'}${COLORS.cyan}${COLORS.bright}                                     ║
║                                                           ║
║   Open in browser to explore Indian Classical Ragas       ║
╚═══════════════════════════════════════════════════════════╝
${COLORS.reset}`);
}

// Default export
export default {
  createLogger,
  requestLogger,
  logSeparator,
  logStartup,
};
