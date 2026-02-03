# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-02-03

### 🚀 Performance Improvements

#### Browser Resource Management
- **Fixed browser resource leak**: Browser instance is now created once and reused across all file conversions, significantly improving batch processing performance
- **Optimized page management**: Each conversion creates a new page instead of restarting the browser, reducing overhead by ~500-1000ms per file
- **Proper cleanup**: Added separate `cleanupPage()` and `cleanup()` methods to ensure resources are released at the appropriate times
- **Related files**: [converter.js](src/root/app/converter.js), [index.js](src/root/app/index.js)

#### Memory Management
- **Removed duplicate Mermaid initialization**: Eliminated unnecessary Node.js-based Mermaid rendering that was never used
- **Removed JSDOM memory leak**: Deleted global DOM objects that were created once and never cleaned up
- **Simplified architecture**: All Mermaid rendering now happens exclusively in the browser context via Puppeteer
- **Related files**: [converter.js](src/root/app/converter.js)

### 🛡️ Security & Validation

#### Input Validation
- **File size limits**: Added configurable maximum file size (default: 10MB) to prevent resource exhaustion
- **Diagram limits**: Added configurable maximum number of Mermaid diagrams per file (default: 50)
- **Empty file detection**: Reject empty or whitespace-only markdown files with clear error messages
- **Large diagram warnings**: Log warnings for diagrams exceeding 10KB in size
- **New environment variables**: `MAX_FILE_SIZE`, `MAX_MERMAID_DIAGRAMS`
- **Related files**: [converter.js](src/root/app/converter.js)

### ⚙️ Configuration

#### Environment-Based Configuration
- **Markdown breaks**: Added `MARKDOWN_BREAKS` environment variable to control single-newline behavior
- **PDF format**: Added `PDF_FORMAT` environment variable (A4, Letter, Legal, etc.)
- **PDF margins**: Added configurable margins via `PDF_MARGIN_TOP`, `PDF_MARGIN_RIGHT`, `PDF_MARGIN_BOTTOM`, `PDF_MARGIN_LEFT`
- **Backward compatible**: All settings maintain previous defaults if not specified
- **Related files**: [converter.js](src/root/app/converter.js), [README.md](README.md)

### 🐛 Bug Fixes

#### Error Handling
- **Better error context**: Enhanced error messages include filename, file size, and diagram counts
- **Validation failures**: Clear error messages for file size violations and diagram limits
- **Resource cleanup**: Ensures browser resources are cleaned up even when errors occur
- **Related files**: [converter.js](src/root/app/converter.js), [index.js](src/root/app/index.js)

### 📝 Documentation

#### README Updates
- **New environment variables documented**: Added 8 new configuration options to the README
- **Usage examples**: Added examples showing how to use new PDF customization options
- **Configuration table**: Complete reference for all environment variables
- **Related files**: [README.md](README.md)

### ✅ Testing

#### Enhanced Test Suite
- **Input validation tests**: Added tests for empty files, diagram limits, and validation logic
- **Configuration tests**: Added tests verifying environment variable behavior
- **Backward compatibility**: Existing tests continue to pass, ensuring no breaking changes
- **Coverage**: All new validation and configuration code is covered by tests
- **Test results**: 20 tests passing, no failures
- **Related files**: [converter.test.js](tests/unit/converter.test.js)

### 📊 Impact Summary

**Performance Gains**:
- Browser initialization: Reduced from once-per-file to once-per-batch (~500-1000ms saved per file after the first)
- Memory usage: Reduced memory footprint by eliminating duplicate Mermaid initialization and JSDOM globals
- Resource leaks: Eliminated potential memory leaks from uncleaned browser instances

**New Capabilities**:
- 8 new environment variables for fine-grained control
- Input validation prevents resource exhaustion attacks
- Configurable PDF output (format, margins)
- Configurable markdown rendering (line breaks)

**Code Quality**:
- Better error messages with actionable context
- Improved resource management with explicit cleanup methods
- Enhanced test coverage for new functionality
- No breaking changes to existing functionality

### 🔄 Migration Guide

**For existing users**: No changes required! All improvements are backward compatible. 

**To use new features**:
```bash
# Custom PDF margins (Letter size with 0.5 inch margins)
docker run --rm \
  -v $(pwd)/input:/data/input \
  -v $(pwd)/output:/data/output \
  -e PDF_FORMAT=Letter \
  -e PDF_MARGIN_TOP=0.5in \
  -e PDF_MARGIN_BOTTOM=0.5in \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Increase file size limit for large documents (20MB)
docker run --rm \
  -v $(pwd)/input:/data/input \
  -v $(pwd)/output:/data/output \
  -e MAX_FILE_SIZE=20971520 \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Enable markdown line breaks
docker run --rm \
  -v $(pwd)/input:/data/input \
  -v $(pwd)/output:/data/output \
  -e MARKDOWN_BREAKS=true \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest
```

### 🔍 Technical Details

**Files Modified**:
- [src/root/app/converter.js](src/root/app/converter.js) - Core conversion logic with improved resource management
- [src/root/app/index.js](src/root/app/index.js) - Batch processing with proper cleanup
- [tests/unit/converter.test.js](tests/unit/converter.test.js) - Enhanced test coverage
- [README.md](README.md) - Updated documentation

**Lines Changed**: ~200 lines added/modified across core files

**Test Status**: ✅ All 20 tests passing

**Breaking Changes**: None - fully backward compatible
