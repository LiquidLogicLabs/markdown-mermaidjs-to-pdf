const winston = require('winston');
const path = require('path');

function setupLogger() {
  const isLoggingEnabled = process.env.LOGGING_ENABLED !== 'false';
  const logLevel = process.env.LOG_LEVEL || 'info';
  const logDir = process.env.LOG_DIR || 'logs';

  // Create logs directory if it doesn't exist
  if (isLoggingEnabled) {
    require('fs-extra').ensureDirSync(logDir);
  }

  // Helper function to format timing information
  function formatTimingInfo(meta) {
    const timingParts = [];
    
    // Format duration fields
    if (meta.duration !== undefined) {
      timingParts.push(`duration: ${meta.durationFormatted || `${meta.duration}ms`}`);
    }
    if (meta.totalDuration !== undefined) {
      timingParts.push(`total: ${meta.totalDurationFormatted || `${meta.totalDuration}ms`}`);
    }
    
    // Format timing object
    if (meta.timing) {
      const timing = meta.timing;
      const timingDetails = [];
      if (timing.readFile !== undefined) timingDetails.push(`read: ${timing.readFile}ms`);
      if (timing.processMarkdown !== undefined) timingDetails.push(`process: ${timing.processMarkdown}ms`);
      if (timing.generatePdf !== undefined) timingDetails.push(`pdf: ${timing.generatePdf}ms`);
      if (timing.total !== undefined) timingDetails.push(`total: ${timing.total}ms`);
      if (timingDetails.length > 0) {
        timingParts.push(`steps: [${timingDetails.join(', ')}]`);
      }
    }
    
    // Format PDF timing object
    if (meta.pdfTiming) {
      const pdfTiming = meta.pdfTiming;
      const pdfDetails = [];
      if (pdfTiming.browserInit !== undefined) pdfDetails.push(`browser: ${pdfTiming.browserInit}ms`);
      if (pdfTiming.contentSet !== undefined) pdfDetails.push(`content: ${pdfTiming.contentSet}ms`);
      if (pdfTiming.mermaidLoad !== undefined) pdfDetails.push(`mermaid: ${pdfTiming.mermaidLoad}ms`);
      if (pdfTiming.diagramRender !== undefined) pdfDetails.push(`diagrams: ${pdfTiming.diagramRender}ms`);
      if (pdfTiming.pdfGeneration !== undefined) pdfDetails.push(`generate: ${pdfTiming.pdfGeneration}ms`);
      if (pdfDetails.length > 0) {
        timingParts.push(`pdf: [${pdfDetails.join(', ')}]`);
      }
    }
    
    // Format total PDF time
    if (meta.totalPdfTime !== undefined) {
      timingParts.push(`pdfTotal: ${meta.totalPdfTimeFormatted || `${meta.totalPdfTime}ms`}`);
    }
    
    return timingParts.length > 0 ? ` (${timingParts.join(', ')})` : '';
  }

  const logFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let metaStr = '';
      
      // Check if this is timing-related information
      if (meta.duration !== undefined || meta.timing !== undefined || meta.pdfTiming !== undefined) {
        metaStr = formatTimingInfo(meta);
      } else if (Object.keys(meta).length > 0) {
        // For non-timing data, show simplified JSON
        const simplifiedMeta = {};
        Object.keys(meta).forEach(key => {
          if (typeof meta[key] === 'string' || typeof meta[key] === 'number') {
            simplifiedMeta[key] = meta[key];
          } else if (Array.isArray(meta[key])) {
            simplifiedMeta[key] = meta[key];
          } else if (meta[key] && typeof meta[key] === 'object') {
            // For objects, just show the key names
            simplifiedMeta[key] = `{${Object.keys(meta[key]).join(', ')}}`;
          }
        });
        if (Object.keys(simplifiedMeta).length > 0) {
          metaStr = ` ${JSON.stringify(simplifiedMeta)}`;
        }
      }
      
      return `${timestamp} [${level}]: ${message}${metaStr}`;
    })
  );

  const transports = [];

  // Console transport
  if (isLoggingEnabled) {
    transports.push(
      new winston.transports.Console({
        format: consoleFormat,
        level: logLevel
      })
    );
  }

  // File transports
  if (isLoggingEnabled) {
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );
  }

  const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports,
    exitOnError: false
  });

  // Add a method to check if logging is enabled
  logger.isEnabled = () => isLoggingEnabled;

  return logger;
}

module.exports = { setupLogger }; 