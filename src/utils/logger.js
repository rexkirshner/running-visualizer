/**
 * Logger Utility
 *
 * Provides structured logging that can be disabled in production.
 * Supports different log levels and contextual logging.
 *
 * @module utils/logger
 */

/**
 * Log levels in order of severity
 */
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4
}

/**
 * Current log level (can be changed at runtime)
 * In production, set to WARN or ERROR to reduce noise
 */
let currentLevel = import.meta.env?.PROD ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG

/**
 * Set the current log level
 * @param {number} level - One of LOG_LEVELS values
 */
export function setLogLevel(level) {
  if (level >= LOG_LEVELS.DEBUG && level <= LOG_LEVELS.SILENT) {
    currentLevel = level
  }
}

/**
 * Get the current log level
 * @returns {number} Current log level
 */
export function getLogLevel() {
  return currentLevel
}

/**
 * Format a log message with optional context
 * @param {string} context - The context/module name
 * @param {string} message - The log message
 * @returns {string} Formatted message
 */
function formatMessage(context, message) {
  const timestamp = new Date().toISOString().slice(11, 23)
  return context ? `[${timestamp}] [${context}] ${message}` : `[${timestamp}] ${message}`
}

/**
 * Log a debug message
 * Use for detailed debugging information
 * @param {string} message - The log message
 * @param {string} [context] - Optional context/module name
 * @param {...any} args - Additional arguments to log
 */
export function debug(message, context = '', ...args) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    console.log(formatMessage(context, message), ...args)
  }
}

/**
 * Log an info message
 * Use for general information about application flow
 * @param {string} message - The log message
 * @param {string} [context] - Optional context/module name
 * @param {...any} args - Additional arguments to log
 */
export function info(message, context = '', ...args) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.info(formatMessage(context, message), ...args)
  }
}

/**
 * Log a warning message
 * Use for potentially problematic situations
 * @param {string} message - The log message
 * @param {string} [context] - Optional context/module name
 * @param {...any} args - Additional arguments to log
 */
export function warn(message, context = '', ...args) {
  if (currentLevel <= LOG_LEVELS.WARN) {
    console.warn(formatMessage(context, message), ...args)
  }
}

/**
 * Log an error message
 * Use for error conditions
 * @param {string} message - The log message
 * @param {string} [context] - Optional context/module name
 * @param {...any} args - Additional arguments to log
 */
export function error(message, context = '', ...args) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    console.error(formatMessage(context, message), ...args)
  }
}

/**
 * Create a logger instance with a fixed context
 * Useful for module-level logging
 *
 * @param {string} context - The context/module name
 * @returns {Object} Logger instance with debug, info, warn, error methods
 *
 * @example
 * const log = createLogger('VideoExport')
 * log.info('Starting recording')
 * log.error('Capture failed', error)
 */
export function createLogger(context) {
  return {
    debug: (message, ...args) => debug(message, context, ...args),
    info: (message, ...args) => info(message, context, ...args),
    warn: (message, ...args) => warn(message, context, ...args),
    error: (message, ...args) => error(message, context, ...args)
  }
}

/**
 * Default logger instance (no context)
 */
export default {
  debug,
  info,
  warn,
  error,
  createLogger,
  setLogLevel,
  getLogLevel,
  LOG_LEVELS
}
