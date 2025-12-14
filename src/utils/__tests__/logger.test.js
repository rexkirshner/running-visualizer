/**
 * Tests for logger.js
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  LOG_LEVELS,
  setLogLevel,
  getLogLevel,
  debug,
  info,
  warn,
  error,
  createLogger
} from '../logger.js'

describe('logger', () => {
  let consoleSpy

  beforeEach(() => {
    // Reset log level before each test
    setLogLevel(LOG_LEVELS.DEBUG)
    // Spy on console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('LOG_LEVELS', () => {
    it('should have correct hierarchy', () => {
      expect(LOG_LEVELS.DEBUG).toBeLessThan(LOG_LEVELS.INFO)
      expect(LOG_LEVELS.INFO).toBeLessThan(LOG_LEVELS.WARN)
      expect(LOG_LEVELS.WARN).toBeLessThan(LOG_LEVELS.ERROR)
      expect(LOG_LEVELS.ERROR).toBeLessThan(LOG_LEVELS.SILENT)
    })
  })

  describe('setLogLevel / getLogLevel', () => {
    it('should set and get log level', () => {
      setLogLevel(LOG_LEVELS.WARN)
      expect(getLogLevel()).toBe(LOG_LEVELS.WARN)

      setLogLevel(LOG_LEVELS.ERROR)
      expect(getLogLevel()).toBe(LOG_LEVELS.ERROR)
    })

    it('should ignore invalid log levels', () => {
      setLogLevel(LOG_LEVELS.INFO)
      const currentLevel = getLogLevel()

      setLogLevel(-1)
      expect(getLogLevel()).toBe(currentLevel)

      setLogLevel(100)
      expect(getLogLevel()).toBe(currentLevel)
    })
  })

  describe('debug', () => {
    it('should log when level is DEBUG', () => {
      setLogLevel(LOG_LEVELS.DEBUG)
      debug('test message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('should not log when level is above DEBUG', () => {
      setLogLevel(LOG_LEVELS.INFO)
      debug('test message')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('should include context in message', () => {
      setLogLevel(LOG_LEVELS.DEBUG)
      debug('test message', 'TestContext')
      expect(consoleSpy.log).toHaveBeenCalled()
      const call = consoleSpy.log.mock.calls[0][0]
      expect(call).toContain('TestContext')
      expect(call).toContain('test message')
    })
  })

  describe('info', () => {
    it('should log when level is INFO or lower', () => {
      setLogLevel(LOG_LEVELS.DEBUG)
      info('test message')
      expect(consoleSpy.info).toHaveBeenCalled()

      setLogLevel(LOG_LEVELS.INFO)
      info('test message 2')
      expect(consoleSpy.info).toHaveBeenCalledTimes(2)
    })

    it('should not log when level is above INFO', () => {
      setLogLevel(LOG_LEVELS.WARN)
      info('test message')
      expect(consoleSpy.info).not.toHaveBeenCalled()
    })
  })

  describe('warn', () => {
    it('should log when level is WARN or lower', () => {
      setLogLevel(LOG_LEVELS.WARN)
      warn('test message')
      expect(consoleSpy.warn).toHaveBeenCalled()
    })

    it('should not log when level is above WARN', () => {
      setLogLevel(LOG_LEVELS.ERROR)
      warn('test message')
      expect(consoleSpy.warn).not.toHaveBeenCalled()
    })
  })

  describe('error', () => {
    it('should log when level is ERROR or lower', () => {
      setLogLevel(LOG_LEVELS.ERROR)
      error('test message')
      expect(consoleSpy.error).toHaveBeenCalled()
    })

    it('should not log when level is SILENT', () => {
      setLogLevel(LOG_LEVELS.SILENT)
      error('test message')
      expect(consoleSpy.error).not.toHaveBeenCalled()
    })
  })

  describe('createLogger', () => {
    it('should create a logger with fixed context', () => {
      const log = createLogger('MyModule')
      setLogLevel(LOG_LEVELS.DEBUG)

      log.debug('debug message')
      log.info('info message')
      log.warn('warn message')
      log.error('error message')

      expect(consoleSpy.log).toHaveBeenCalled()
      expect(consoleSpy.info).toHaveBeenCalled()
      expect(consoleSpy.warn).toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalled()

      // Check context is included
      expect(consoleSpy.log.mock.calls[0][0]).toContain('MyModule')
    })
  })
})
