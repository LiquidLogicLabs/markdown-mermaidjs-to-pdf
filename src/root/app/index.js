#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const { MarkdownConverter } = require('./converter');
const { setupLogger } = require('./logger');
require('dotenv').config();

// Setup logger
const logger = setupLogger();

// Timing utility functions
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(2);
  return `${minutes}m ${seconds}s`;
}

async function main() {
  const startTime = Date.now();
  
  program
    .name('markdown-to-pdf')
    .description('Convert markdown files with Mermaid diagrams to PDF')
    .version('1.0.0')
    .option('-i, --input <dir>', 'Input directory path (default: /data/input)')
    .option('-o, --output <dir>', 'Output directory path (default: /data/output)')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('--no-logging', 'Disable logging')
    .parse();

  const options = program.opts();

  try {
    // Configure logging based on options
    if (options.noLogging) {
      process.env.LOGGING_ENABLED = 'false';
    }
    if (options.verbose) {
      process.env.LOG_LEVEL = 'debug';
    }

    // Set default directories
    const inputDir = options.input || '/data/input';
    const outputDir = options.output || '/data/output';

    logger.info('Starting Markdown to PDF batch converter', {
      inputDir,
      outputDir,
      loggingEnabled: process.env.LOGGING_ENABLED !== 'false',
      logLevel: process.env.LOG_LEVEL || 'info'
    });

    // Check if input directory exists
    if (!await fs.pathExists(inputDir)) {
      logger.error(`Input directory not found: ${inputDir}`);
      console.error(chalk.red(`Error: Input directory not found: ${inputDir}`));
      process.exit(1);
    }

    // Create output directory if it doesn't exist
    await fs.ensureDir(outputDir);
    logger.info('Output directory ensured', { outputDir });

    // Find all markdown files in input directory
    const files = await fs.readdir(inputDir);
    const markdownFiles = files.filter(file => 
      file.toLowerCase().endsWith('.md') || file.toLowerCase().endsWith('.markdown')
    );

    logger.info('Found markdown files', { 
      totalFiles: files.length, 
      markdownFiles: markdownFiles.length,
      markdownFiles: markdownFiles 
    });

    if (markdownFiles.length === 0) {
      logger.warn('No markdown files found in input directory');
      console.log(chalk.yellow(`No markdown files found in: ${inputDir}`));
      process.exit(0);
    }

    // Initialize converter
    logger.info('Initializing converter');
    const converter = new MarkdownConverter();

    // Process each markdown file
    let successCount = 0;
    let errorCount = 0;
    const conversionTimes = [];

    for (const file of markdownFiles) {
      const fileStartTime = Date.now();
      const inputPath = path.join(inputDir, file);
      const outputFile = file.replace(/\.(md|markdown)$/i, '.pdf');
      const outputPath = path.join(outputDir, outputFile);

      try {
        logger.info('Converting file', { inputFile: file, outputFile });
        console.log(chalk.blue(`Converting: ${file} → ${outputFile}`));

        await converter.convertToPdf(inputPath, outputPath);

        const fileEndTime = Date.now();
        const fileDuration = fileEndTime - fileStartTime;
        conversionTimes.push({ file, duration: fileDuration, success: true });

        logger.info('File converted successfully', { 
          inputFile: file, 
          outputFile, 
          duration: fileDuration,
          durationFormatted: formatDuration(fileDuration)
        });
        console.log(chalk.green(`✓ ${file} → ${outputFile} (${formatDuration(fileDuration)})`));
        successCount++;

      } catch (error) {
        const fileEndTime = Date.now();
        const fileDuration = fileEndTime - fileStartTime;
        conversionTimes.push({ file, duration: fileDuration, success: false });

        logger.error('File conversion failed', { 
          inputFile: file, 
          error: error.message, 
          stack: error.stack,
          duration: fileDuration,
          durationFormatted: formatDuration(fileDuration)
        });
        console.error(chalk.red(`✗ ${file}: ${error.message} (${formatDuration(fileDuration)})`));
        errorCount++;
      }
    }

    const totalEndTime = Date.now();
    const totalDuration = totalEndTime - startTime;

    // Calculate timing statistics
    const successfulTimes = conversionTimes.filter(t => t.success).map(t => t.duration);
    const failedTimes = conversionTimes.filter(t => !t.success).map(t => t.duration);
    
    const avgSuccessTime = successfulTimes.length > 0 ? 
      successfulTimes.reduce((a, b) => a + b, 0) / successfulTimes.length : 0;
    const minSuccessTime = successfulTimes.length > 0 ? Math.min(...successfulTimes) : 0;
    const maxSuccessTime = successfulTimes.length > 0 ? Math.max(...successfulTimes) : 0;

    // Summary
    logger.info('Batch conversion completed', { 
      successCount, 
      errorCount, 
      totalDuration,
      totalDurationFormatted: formatDuration(totalDuration),
      avgSuccessTime: avgSuccessTime,
      avgSuccessTimeFormatted: formatDuration(avgSuccessTime),
      minSuccessTime: minSuccessTime,
      minSuccessTimeFormatted: formatDuration(minSuccessTime),
      maxSuccessTime: maxSuccessTime,
      maxSuccessTimeFormatted: formatDuration(maxSuccessTime)
    });

    console.log(chalk.blue('\n=== Conversion Summary ==='));
    console.log(chalk.green(`✓ Successfully converted: ${successCount} files`));
    if (errorCount > 0) {
      console.log(chalk.red(`✗ Failed conversions: ${errorCount} files`));
    }
    console.log(chalk.blue(`📁 Output directory: ${outputDir}`));
    console.log(chalk.blue(`⏱️  Total processing time: ${formatDuration(totalDuration)}`));
    
    if (successfulTimes.length > 0) {
      console.log(chalk.blue(`📊 Timing statistics (successful conversions):`));
      console.log(chalk.blue(`   • Average: ${formatDuration(avgSuccessTime)}`));
      console.log(chalk.blue(`   • Fastest: ${formatDuration(minSuccessTime)}`));
      console.log(chalk.blue(`   • Slowest: ${formatDuration(maxSuccessTime)}`));
    }

    // Detailed timing breakdown
    if (conversionTimes.length > 0) {
      console.log(chalk.blue(`\n📋 Detailed timing breakdown:`));
      conversionTimes.forEach(({ file, duration, success }) => {
        const status = success ? chalk.green('✓') : chalk.red('✗');
        const timeColor = success ? chalk.green : chalk.red;
        console.log(`   ${status} ${file}: ${timeColor(formatDuration(duration))}`);
      });
    }

    // Exit with error code if any conversions failed
    if (errorCount > 0) {
      process.exit(1);
    }

  } catch (error) {
    const totalEndTime = Date.now();
    const totalDuration = totalEndTime - startTime;
    
    logger.error('Batch conversion failed', { 
      error: error.message, 
      stack: error.stack,
      totalDuration,
      totalDurationFormatted: formatDuration(totalDuration)
    });
    console.error(chalk.red(`Error: ${error.message}`));
    console.error(chalk.red(`Total time before error: ${formatDuration(totalDuration)}`));
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  console.error(chalk.red(`Uncaught exception: ${error.message}`));
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason: reason?.message || reason, stack: reason?.stack });
  console.error(chalk.red(`Unhandled rejection: ${reason}`));
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = { main }; 