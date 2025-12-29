/**
 * Tests para logger.ts
 */

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let originalEnv: string | undefined;
  let logger: any;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.resetModules();
  });

  describe('en desarrollo', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      logger = require('../logger').logger;
    });

    test('logger.log registra mensajes informativos', () => {
      logger.log('Test info message', { data: 'test' });

      expect(consoleLogSpy).toHaveBeenCalledWith('[LOG]', 'Test info message', { data: 'test' });
    });

    test('logger.debug registra mensajes de debugging', () => {
      logger.debug('Test debug message', { context: 'test' });

      expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Test debug message', { context: 'test' });
    });

    test('logger.warn registra advertencias', () => {
      logger.warn('Test warning', { issue: 'minor' });

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'Test warning', { issue: 'minor' });
    });

    test('logger.error registra errores con Error object', () => {
      const error = new Error('Test error');
      logger.error(error, { context: 'test' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR]',
        'Test error',
        error.stack,
        { context: 'test' }
      );
    });

    test('logger.error registra errores con string', () => {
      logger.error('Test error message', { context: 'test' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR]',
        'Test error message',
        undefined,
        { context: 'test' }
      );
    });

    test('logger.performance registra métricas de rendimiento', () => {
      logger.performance('Test operation', 150);

      expect(consoleLogSpy).toHaveBeenCalledWith('[PERF] Test operation: 150ms');
    });
  });

  describe('en producción', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      logger = require('../logger').logger;
    });

    test('logger.log no registra en producción', () => {
      logger.log('Test info message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('logger.debug no registra en producción', () => {
      logger.debug('Test debug message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('logger.warn no registra en producción', () => {
      logger.warn('Test warning');

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('logger.error siempre registra en producción', () => {
      const error = new Error('Test error');
      logger.error(error, { context: 'test' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR]',
        'Test error',
        { context: 'test' }
      );
    });

    test('logger.error con string en producción', () => {
      logger.error('Test error message', { context: 'test' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR]',
        'Test error message',
        { context: 'test' }
      );
    });

    test('logger.performance no registra en producción', () => {
      logger.performance('Test operation', 150);

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  test('logger.error maneja errores sin stack trace', () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    logger = require('../logger').logger;
    const error = { message: 'Test error' } as Error;
    logger.error(error, { context: 'test' });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ERROR]',
      'Test error',
      undefined,
      { context: 'test' }
    );
  });

  test('logger.error maneja múltiples argumentos', () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    logger = require('../logger').logger;
    logger.log('Message 1', 'Message 2', { data: 'test' });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[LOG]',
      'Message 1',
      'Message 2',
      { data: 'test' }
    );
  });
});

