import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Writable } from 'stream';
import pino from 'pino';

function createTestLogger() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  const logger = pino({ level: 'info' }, stream);
  return { logger, lines, stream };
}

function createDebugLogger() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  const logger = pino({ level: 'debug' }, stream);
  return { logger, lines, stream };
}

function createErrorLogger() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  const logger = pino({ level: 'error' }, stream);
  return { logger, lines, stream };
}

describe('error-logger', () => {
  describe('pino logger', () => {
    it('logs a simple info message as JSON', async () => {
      const { logger, lines } = createTestLogger();
      logger.info('test message');
      const output = JSON.parse(lines[0]);
      expect(output.msg).toBe('test message');
      expect(output.level).toBe(30);
    });

    it('includes meta object when provided', async () => {
      const { logger, lines } = createTestLogger();
      logger.info({ key: 'val' }, 'test');
      const output = JSON.parse(lines[0]);
      expect(output.key).toBe('val');
      expect(output.msg).toBe('test');
    });

    it('includes error stack when err is passed', async () => {
      const { logger, lines } = createTestLogger();
      const err = new Error('test error');
      logger.error({ err }, 'Something failed');
      const output = JSON.parse(lines[0]);
      expect(output.err.message).toBe('test error');
      expect(output.err.stack).toBeDefined();
      expect(output.msg).toBe('Something failed');
    });
  });

  describe('log levels', () => {
    it('debug does not log when level is info', async () => {
      const { logger, lines } = createTestLogger();
      logger.debug('should not appear');
      expect(lines.length).toBe(0);
    });

    it('info logs when level is info', async () => {
      const { logger, lines } = createTestLogger();
      logger.info('should appear');
      expect(lines.length).toBe(1);
    });

    it('error logs at any level', async () => {
      const { logger, lines } = createErrorLogger();
      logger.error('always appears');
      expect(lines.length).toBe(1);
    });

    it('warn does not log when level is error', async () => {
      const { logger, lines } = createErrorLogger();
      logger.warn('should not appear');
      expect(lines.length).toBe(0);
    });
  });

  describe('log output format', () => {
    it('debug outputs level 20', async () => {
      const { logger, lines } = createDebugLogger();
      logger.debug('debug msg');
      const output = JSON.parse(lines[0]);
      expect(output.level).toBe(20);
    });

    it('warn outputs level 40', async () => {
      const { logger, lines } = createTestLogger();
      logger.warn('warn msg');
      const output = JSON.parse(lines[0]);
      expect(output.level).toBe(40);
    });

    it('error outputs level 50', async () => {
      const { logger, lines } = createTestLogger();
      logger.error('error msg');
      const output = JSON.parse(lines[0]);
      expect(output.level).toBe(50);
    });
  });
});
