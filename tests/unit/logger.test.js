const { setupLogger } = require('../../src/root/app/logger');

describe('Logger', () => {
  let logger;

  beforeEach(() => {
    // Clear any existing logger
    logger = null;
  });

  afterEach(() => {
    // Clean up
    if (logger && logger.close) {
      logger.close();
    }
  });

  test('should create a logger instance', () => {
    logger = setupLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  test('should have isEnabled method', () => {
    logger = setupLogger();
    expect(typeof logger.isEnabled).toBe('function');
    expect(typeof logger.isEnabled()).toBe('boolean');
  });

  test('should log messages without throwing errors', () => {
    logger = setupLogger();
    
    // These should not throw errors
    expect(() => {
      logger.info('Test info message');
      logger.warn('Test warning message');
      logger.error('Test error message');
    }).not.toThrow();
  });

  test('should handle timing information in meta', () => {
    logger = setupLogger();
    
    const meta = {
      duration: 1500,
      timing: {
        readFile: 100,
        processMarkdown: 200,
        generatePdf: 1200,
        total: 1500
      }
    };

    expect(() => {
      logger.info('Processing completed', meta);
    }).not.toThrow();
  });

  test('should handle PDF timing information', () => {
    logger = setupLogger();
    
    const meta = {
      pdfTiming: {
        browserInit: 500,
        contentSet: 100,
        mermaidLoad: 200,
        diagramRender: 300,
        pdfGeneration: 400
      },
      totalPdfTime: 1500
    };

    expect(() => {
      logger.info('PDF generation completed', meta);
    }).not.toThrow();
  });
}); 