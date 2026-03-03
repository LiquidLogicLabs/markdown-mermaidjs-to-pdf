const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');
const matter = require('gray-matter');
const { PDFDocument, PDFName } = require('pdf-lib');
const { setupLogger } = require('./logger');

function createHeadingSlugger() {
  const seen = new Map();
  return {
    slug(raw) {
      const base = String(raw)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}-]/gu, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'section';
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      return count === 0 ? base : `${base}-${count}`;
    },
    reset() {
      seen.clear();
    }
  };
}
const headingSlugger = createHeadingSlugger();
marked.use({
  renderer: {
    heading(text, level, raw) {
      const id = headingSlugger.slug(raw);
      return `<h${level} id="${id}">${text}</h${level}>\n`;
    }
  }
});

class MarkdownConverter {
  constructor(options = {}) {
    this.logger = setupLogger();
    this.browser = null;
    this.page = null;
    this.mermaid = null;
    this.currentFilename = null;
    this.frontMatterMode = options.frontMatterMode || 'none';

    marked.setOptions({
      breaks: false,
      gfm: true
    });

    this.logger.info('MarkdownConverter initialized', { frontMatterMode: this.frontMatterMode });
  }

  // Timing utility function
  formatDuration(ms) {
    if (ms < 1000) {return `${ms}ms`;}
    if (ms < 60000) {return `${(ms / 1000).toFixed(2)}s`;}
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(2);
    return `${minutes}m ${seconds}s`;
  }

  async initializeMermaid() {
    if (!this.mermaid) {
      this.mermaid = await import('mermaid');

      // Set up JSDOM for Node.js environment with SVG support
      const { JSDOM } = await import('jsdom');
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'http://localhost',
        pretendToBeVisual: true,
        resources: 'usable'
      });

      global.document = dom.window.document;
      global.window = dom.window;
      global.navigator = dom.window.navigator;

      // Mock DOMPurify to prevent sanitization errors
      global.DOMPurify = {
        sanitize: (html) => html
      };

      // Mock SVG getBBox function
      const originalCreateElement = dom.window.document.createElement;
      dom.window.document.createElement = function(tagName) {
        const element = originalCreateElement.call(this, tagName);
        if (tagName.toLowerCase() === 'svg' || tagName.toLowerCase() === 'text') {
          element.getBBox = function() {
            return { x: 0, y: 0, width: 100, height: 20 };
          };
        }
        return element;
      };

      this.mermaid.default.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'Arial, sans-serif'
      });
    }
  }

  async convertToPdf(inputPath, outputPath) {
    const conversionStartTime = Date.now();
    // Extract filename for logging context
    this.currentFilename = path.basename(inputPath);
    this.logger.info('Starting conversion process', { inputPath, outputPath, filename: this.currentFilename });

    const timing = {
      readFile: 0,
      processMarkdown: 0,
      generatePdf: 0,
      total: 0
    };

    try {
      // Initialize Mermaid
      await this.initializeMermaid();

      // Read markdown file
      const readStartTime = Date.now();
      const markdownContent = await this.readMarkdownFile(inputPath);
      timing.readFile = Date.now() - readStartTime;
      this.logger.debug('Markdown file read successfully', {
        filename: this.currentFilename,
        size: markdownContent.length,
        duration: timing.readFile,
        durationFormatted: this.formatDuration(timing.readFile)
      });

      // Process markdown and render Mermaid diagrams
      const processStartTime = Date.now();
      const { html: htmlContent, frontMatter } = await this.processMarkdown(markdownContent);
      timing.processMarkdown = Date.now() - processStartTime;
      this.logger.debug('Markdown processed to HTML', {
        filename: this.currentFilename,
        htmlSize: htmlContent.length,
        hasFrontMatter: Object.keys(frontMatter).length > 0,
        duration: timing.processMarkdown,
        durationFormatted: this.formatDuration(timing.processMarkdown)
      });

      // Generate PDF
      const pdfStartTime = Date.now();
      await this.generatePdf(htmlContent, outputPath, frontMatter);
      timing.generatePdf = Date.now() - pdfStartTime;
      this.logger.debug('PDF generation completed', {
        filename: this.currentFilename,
        outputPath,
        duration: timing.generatePdf,
        durationFormatted: this.formatDuration(timing.generatePdf)
      });

      timing.total = Date.now() - conversionStartTime;
      this.logger.info('Conversion completed successfully', {
        filename: this.currentFilename,
        inputPath,
        outputPath,
        timing,
        totalDuration: timing.total,
        totalDurationFormatted: this.formatDuration(timing.total)
      });

    } catch (error) {
      timing.total = Date.now() - conversionStartTime;
      this.logger.error('Conversion failed', {
        filename: this.currentFilename,
        error: error.message,
        stack: error.stack,
        timing,
        totalDuration: timing.total,
        totalDurationFormatted: this.formatDuration(timing.total)
      });
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async readMarkdownFile(filePath) {
    this.logger.debug('Reading markdown file', { filePath, filename: this.currentFilename });

    try {
      const content = await fs.readFile(filePath, 'utf8');
      this.logger.debug('Markdown file read successfully', {
        filename: this.currentFilename,
        filePath,
        size: content.length,
        lines: content.split('\n').length
      });
      return content;
    } catch (error) {
      this.logger.error('Failed to read markdown file', { filename: this.currentFilename, filePath, error: error.message });
      throw new Error(`Failed to read markdown file: ${error.message}`);
    }
  }

  async processMarkdown(markdownContent) {
    this.logger.debug('Processing markdown content', { filename: this.currentFilename });

    // Parse YAML front matter
    const { data: frontMatter, content: contentWithoutFrontMatter } = matter(markdownContent);
    const hasFrontMatter = Object.keys(frontMatter).length > 0;
    if (hasFrontMatter) {
      this.logger.info('YAML front matter detected', {
        filename: this.currentFilename,
        fields: Object.keys(frontMatter),
        mode: this.frontMatterMode
      });
    }

    // Extract Mermaid diagrams from content (front matter already stripped)
    const mermaidDiagrams = this.extractMermaidDiagrams(contentWithoutFrontMatter);
    this.logger.debug('Extracted Mermaid diagrams', { filename: this.currentFilename, count: mermaidDiagrams.length });

    let processedContent = contentWithoutFrontMatter;
    for (let i = 0; i < mermaidDiagrams.length; i++) {
      const diagram = mermaidDiagrams[i];
      const placeholder = `\n\n<div class="mermaid-diagram" data-mermaid="${encodeURIComponent(diagram.code)}">\n<div class="mermaid-placeholder">Rendering diagram...</div>\n</div>\n\n`;

      processedContent = processedContent.replace(diagram.fullMatch, placeholder);
      this.logger.debug('Replaced Mermaid diagram with placeholder', { filename: this.currentFilename, index: i, type: diagram.type });
    }

    headingSlugger.reset();
    const htmlContent = marked(processedContent);
    this.logger.debug('Markdown converted to HTML', { filename: this.currentFilename });

    const fullHtml = this.wrapInHtmlDocument(htmlContent, frontMatter);
    this.logger.debug('HTML wrapped in complete document', { filename: this.currentFilename });

    return { html: fullHtml, frontMatter };
  }

  extractMermaidDiagrams(markdownContent) {
    const diagrams = [];
    // Support both standard mermaid syntax and pandoc syntax with attributes
    const mermaidRegex = /```(?:mermaid|{[^}]*\.mermaid[^}]*})\s*\n([\s\S]*?)\n```/g;
    let match;

    while ((match = mermaidRegex.exec(markdownContent)) !== null) {
      diagrams.push({
        fullMatch: match[0],
        code: match[1].trim(),
        type: this.detectDiagramType(match[1])
      });
    }

    this.logger.debug('Mermaid diagrams extracted', {
      filename: this.currentFilename,
      count: diagrams.length,
      types: diagrams.map(d => d.type)
    });

    return diagrams;
  }

  detectDiagramType(code) {
    const firstLine = code.split('\n')[0].trim().toLowerCase();

    if (firstLine.includes('graph') || firstLine.includes('flowchart')) {return 'flowchart';}
    if (firstLine.includes('sequence')) {return 'sequence';}
    if (firstLine.includes('class')) {return 'class';}
    if (firstLine.includes('state')) {return 'state';}
    if (firstLine.includes('er')) {return 'er';}
    if (firstLine.includes('journey')) {return 'journey';}
    if (firstLine.includes('gantt')) {return 'gantt';}
    if (firstLine.includes('pie')) {return 'pie';}
    if (firstLine.includes('gitgraph')) {return 'gitgraph';}
    if (firstLine.includes('mindmap')) {return 'mindmap';}
    if (firstLine.includes('timeline')) {return 'timeline';}
    if (firstLine.includes('zenuml')) {return 'zenuml';}
    if (firstLine.includes('sankey')) {return 'sankey';}

    return 'unknown';
  }

  async renderMermaidDiagram(code) {
    this.logger.debug('Rendering Mermaid diagram', { codeLength: code.length });

    try {
      // Use a simpler approach that works better in Node.js
      const { render } = this.mermaid.default;
      const result = await render(`mermaid-${Date.now()}`, code);
      this.logger.debug('Mermaid diagram rendered successfully');
      return result.svg;
    } catch (error) {
      this.logger.error('Failed to render Mermaid diagram', {
        error: error.message,
        code: code.substring(0, 100) + '...'
      });

      // Return error placeholder
      return `<div style="border: 2px solid red; padding: 10px; color: red;">
        <strong>Mermaid Diagram Error:</strong><br>
        ${error.message}<br>
        <pre style="font-size: 10px; overflow: auto;">${code}</pre>
      </div>`;
    }
  }

  wrapInHtmlDocument(htmlContent, frontMatter = {}) {
    const css = `
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        h1, h2, h3, h4, h5, h6 {
          color: #2c3e50;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        
        h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
        h3 { font-size: 1.25em; }
        
        p { margin-bottom: 1em; }
        
        code {
          background-color: #f6f8fa;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          font-size: 0.9em;
        }
        
        pre {
          background-color: #f6f8fa;
          padding: 16px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 1em 0;
        }
        
        pre code {
          background-color: transparent;
          padding: 0;
        }
        
        blockquote {
          border-left: 4px solid #ddd;
          margin: 1em 0;
          padding-left: 1em;
          color: #666;
        }
        
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        
        th, td {
          border: 1px solid #ddd;
          padding: 8px 12px;
          text-align: left;
        }
        
        th {
          background-color: #f6f8fa;
          font-weight: 600;
        }
        
        .mermaid-diagram {
          text-align: center;
          margin: 2em 0;
          padding: 1em;
          border: 1px solid #eee;
          border-radius: 6px;
          background-color: #fafafa;
        }
        
        .mermaid-diagram svg {
          max-width: 100%;
          height: auto;
        }
        
        .mermaid-placeholder {
          color: #666;
          font-style: italic;
        }
        
        ul, ol {
          margin-bottom: 1em;
          padding-left: 2em;
        }
        
        li {
          margin-bottom: 0.5em;
        }
        
        img {
          max-width: 100%;
          height: auto;
        }
        
        hr {
          border: none;
          border-top: 1px solid #eee;
          margin: 2em 0;
        }

        a {
          color: #0366d6;
          text-decoration: underline;
        }

        @media print {
          a[href^="http"]::after {
            content: " (" attr(href) ")";
            font-size: 0.85em;
            color: #666;
            word-break: break-all;
          }
        }

        .front-matter-header {
          margin-bottom: 2em;
          padding-bottom: 1.5em;
          border-bottom: 2px solid #2c3e50;
        }

        .front-matter-title {
          font-size: 2.4em;
          font-weight: 700;
          color: #2c3e50;
          margin: 0 0 0.3em 0;
          line-height: 1.2;
          border-bottom: none;
          padding-bottom: 0;
        }

        .front-matter-description {
          font-size: 1.1em;
          color: #555;
          margin: 0 0 1em 0;
          line-height: 1.5;
        }

        .front-matter-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5em;
          font-size: 0.9em;
          color: #666;
        }

        .front-matter-meta-item {
          display: flex;
          align-items: center;
          gap: 0.4em;
        }

        .front-matter-meta-label {
          font-weight: 600;
          color: #555;
        }
      </style>
    `;

    const mermaidScript = `
      <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
      <script>
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'Arial, sans-serif'
        });
        
        document.addEventListener('DOMContentLoaded', function() {
          const diagrams = document.querySelectorAll('.mermaid-diagram');
          diagrams.forEach(function(diagram) {
            const code = decodeURIComponent(diagram.getAttribute('data-mermaid'));
            const placeholder = diagram.querySelector('.mermaid-placeholder');
            
            try {
              mermaid.render('mermaid-' + Date.now(), code).then(function(result) {
                diagram.innerHTML = result.svg;
              }).catch(function(error) {
                diagram.innerHTML = '<div style="color: red; border: 1px solid red; padding: 10px;">Mermaid Diagram Error: ' + error.message + '</div>';
              });
            } catch (error) {
              diagram.innerHTML = '<div style="color: red; border: 1px solid red; padding: 10px;">Mermaid Diagram Error: ' + error.message + '</div>';
            }
          });
        });
      </script>
    `;

    const escapeHtml = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const formatDate = (val) => {
      if (val instanceof Date && !isNaN(val.getTime())) {
        return val.toISOString().split('T')[0];
      }
      return String(val);
    };
    const documentTitle = frontMatter.title ? escapeHtml(frontMatter.title) : 'Markdown to PDF';

    let titleBlockHtml = '';
    if (this.frontMatterMode === 'styled' && Object.keys(frontMatter).length > 0) {
      const parts = [];
      if (frontMatter.title) {
        parts.push(`<h1 class="front-matter-title">${escapeHtml(frontMatter.title)}</h1>`);
      }
      if (frontMatter.description) {
        parts.push(`<p class="front-matter-description">${escapeHtml(frontMatter.description)}</p>`);
      }
      const metaItems = [];
      if (frontMatter.author) {
        metaItems.push(`<span class="front-matter-meta-item"><span class="front-matter-meta-label">Author:</span> ${escapeHtml(frontMatter.author)}</span>`);
      }
      if (frontMatter.date) {
        metaItems.push(`<span class="front-matter-meta-item"><span class="front-matter-meta-label">Date:</span> ${escapeHtml(formatDate(frontMatter.date))}</span>`);
      }
      if (metaItems.length > 0) {
        parts.push(`<div class="front-matter-meta">${metaItems.join('')}</div>`);
      }
      if (parts.length > 0) {
        titleBlockHtml = `<header class="front-matter-header">${parts.join('\n')}</header>`;
      }
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${documentTitle}</title>
    ${css}
    ${mermaidScript}
</head>
<body>
    ${titleBlockHtml}
    ${htmlContent}
</body>
</html>`;
  }

  async generatePdf(htmlContent, outputPath, frontMatter = {}) {
    const pdfStartTime = Date.now();
    this.logger.debug('Initializing browser for PDF generation', { filename: this.currentFilename });

    const pdfTiming = {
      browserInit: 0,
      contentSet: 0,
      mermaidLoad: 0,
      diagramRender: 0,
      pdfGeneration: 0,
      metadataEmbed: 0
    };

    try {
      // Launch browser
      const browserStartTime = Date.now();
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();
      pdfTiming.browserInit = Date.now() - browserStartTime;
      this.logger.debug('Browser initialized', {
        filename: this.currentFilename,
        duration: pdfTiming.browserInit,
        durationFormatted: this.formatDuration(pdfTiming.browserInit)
      });

      // Set content and wait for any dynamic content
      const contentStartTime = Date.now();
      await this.page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      pdfTiming.contentSet = Date.now() - contentStartTime;
      this.logger.debug('HTML content set in page', {
        filename: this.currentFilename,
        duration: pdfTiming.contentSet,
        durationFormatted: this.formatDuration(pdfTiming.contentSet)
      });

      // Wait for Mermaid library to load
      const mermaidLoadStartTime = Date.now();
      await this.page.waitForFunction(() => {
        return typeof window.mermaid !== 'undefined';
      }, { timeout: 10000 });
      pdfTiming.mermaidLoad = Date.now() - mermaidLoadStartTime;
      this.logger.debug('Mermaid library loaded', {
        filename: this.currentFilename,
        duration: pdfTiming.mermaidLoad,
        durationFormatted: this.formatDuration(pdfTiming.mermaidLoad)
      });

      // Add debug output to the page for troubleshooting (only if debug is enabled)
      const debugEnabled = process.env.MARKDOWN_MERMAIDJS_TO_PDF_DEBUG === '1' || process.env.MARKDOWN_MERMAIDJS_TO_PDF_DEBUG === 'true';
      if (debugEnabled) {
        await this.page.evaluate(() => {
          if (!document.getElementById('mermaid-debug-info')) {
            const debugDiv = document.createElement('div');
            debugDiv.id = 'mermaid-debug-info';
            debugDiv.style = 'position:fixed;top:0;left:0;right:0;background:#fffbe6;color:#333;padding:8px 12px;font-size:14px;z-index:9999;border-bottom:1px solid #eee;box-shadow:0 2px 4px #0001;';
            debugDiv.innerText = 'Mermaid: Waiting for diagrams to render...';
            document.body.prepend(debugDiv);
          }
        });
      }

      // Progressive Mermaid diagram rendering - render diagrams one by one
      const diagramStartTime = Date.now();
      const renderStatus = await this.page.evaluate(async (debugEnabled) => {
        const diagrams = document.querySelectorAll('.mermaid-diagram');
        const debugDiv = document.getElementById('mermaid-debug-info');

        if (diagrams.length === 0) {
          if (debugEnabled && debugDiv) {debugDiv.innerText = 'Mermaid: No diagrams found.';}
          return { total: 0, rendered: 0, failed: 0 };
        }

        let rendered = 0, failed = 0;

        // Render each diagram individually
        for (let i = 0; i < diagrams.length; i++) {
          const diagram = diagrams[i];
          const code = decodeURIComponent(diagram.getAttribute('data-mermaid'));

          if (debugEnabled && debugDiv) {
            debugDiv.innerText = `Mermaid: Rendering diagram ${i + 1}/${diagrams.length}...`;
          }

          try {
            // Render the diagram
            const result = await window.mermaid.render(`mermaid-${Date.now()}-${i}`, code);
            diagram.innerHTML = result.svg;
            rendered++;

            if (debugEnabled && debugDiv) {
              debugDiv.innerText = `Mermaid: ${i + 1}/${diagrams.length} diagrams rendered successfully...`;
            }
          } catch (error) {
            // Show error for this diagram
            diagram.innerHTML = `<div style="color: red; border: 1px solid red; padding: 10px;">Mermaid Diagram Error: ${error.message}</div>`;
            failed++;

            if (debugEnabled && debugDiv) {
              debugDiv.innerText = `Mermaid: Diagram ${i + 1} failed, continuing...`;
            }
          }

          // Small delay to prevent overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (debugEnabled && debugDiv) {
          debugDiv.innerText = `Mermaid: ${diagrams.length} diagrams processed (${rendered} rendered, ${failed} failed).`;
        }

        return { total: diagrams.length, rendered, failed };
      }, debugEnabled);

      this.logger.info('Progressive Mermaid rendering completed', {
        filename: this.currentFilename,
        totalDiagrams: renderStatus.total,
        renderedDiagrams: renderStatus.rendered,
        failedDiagrams: renderStatus.failed
      });

      // Update debug output to show final status (only if debug is enabled)
      if (debugEnabled) {
        await this.page.evaluate(() => {
          const diagrams = document.querySelectorAll('.mermaid-diagram');
          const debugDiv = document.getElementById('mermaid-debug-info');
          let rendered = 0, failed = 0;
          diagrams.forEach(diagram => {
            const svg = diagram.querySelector('svg');
            const error = diagram.querySelector('div[style*="color: red"]');
            if (svg) {rendered++;}
            if (error) {failed++;}
          });
          if (debugDiv) {debugDiv.innerText = `Mermaid: ${diagrams.length} diagrams, ${rendered} rendered, ${failed} failed.`;}
        });
      }
      pdfTiming.diagramRender = Date.now() - diagramStartTime;
      this.logger.debug('Mermaid diagrams rendered', {
        filename: this.currentFilename,
        duration: pdfTiming.diagramRender,
        durationFormatted: this.formatDuration(pdfTiming.diagramRender)
      });

      // Generate PDF
      const pdfGenStartTime = Date.now();
      const pdfOptions = {
        path: outputPath,
        format: 'A4',
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in'
        },
        printBackground: true,
        displayHeaderFooter: false,
        tagged: true
      };

      this.logger.debug('Generating PDF with options', { filename: this.currentFilename, ...pdfOptions });
      await this.page.pdf(pdfOptions);
      pdfTiming.pdfGeneration = Date.now() - pdfGenStartTime;

      // Embed PDF document metadata from front matter
      const metadataStartTime = Date.now();
      await this.embedPdfMetadata(outputPath, frontMatter);
      pdfTiming.metadataEmbed = Date.now() - metadataStartTime;

      const totalPdfTime = Date.now() - pdfStartTime;
      this.logger.info('PDF generated successfully', {
        filename: this.currentFilename,
        outputPath,
        pdfTiming,
        totalPdfTime,
        totalPdfTimeFormatted: this.formatDuration(totalPdfTime)
      });

    } catch (error) {
      const totalPdfTime = Date.now() - pdfStartTime;
      this.logger.error('PDF generation failed', {
        filename: this.currentFilename,
        error: error.message,
        stack: error.stack,
        pdfTiming,
        totalPdfTime,
        totalPdfTimeFormatted: this.formatDuration(totalPdfTime)
      });
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  async embedPdfMetadata(outputPath, frontMatter) {
    const hasMeta = frontMatter && Object.keys(frontMatter).length > 0;
    if (!hasMeta) {
      this.logger.debug('No front matter metadata to embed', { filename: this.currentFilename });
      return;
    }

    this.logger.debug('Embedding PDF metadata', {
      filename: this.currentFilename,
      fields: Object.keys(frontMatter)
    });

    try {
      const pdfBytes = await fs.readFile(outputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const savedAnnotations = pages.map((p) => p.node.Annots());

      if (frontMatter.title) {
        pdfDoc.setTitle(String(frontMatter.title));
      }
      if (frontMatter.author) {
        pdfDoc.setAuthor(String(frontMatter.author));
      }
      if (frontMatter.description) {
        pdfDoc.setSubject(String(frontMatter.description));
      }
      if (frontMatter.keywords) {
        const keywords = Array.isArray(frontMatter.keywords)
          ? frontMatter.keywords
          : String(frontMatter.keywords).split(',').map(k => k.trim());
        pdfDoc.setKeywords(keywords);
      }
      if (frontMatter.date) {
        const parsedDate = frontMatter.date instanceof Date
          ? frontMatter.date
          : new Date(frontMatter.date);
        if (!isNaN(parsedDate.getTime())) {
          pdfDoc.setCreationDate(parsedDate);
          pdfDoc.setModificationDate(parsedDate);
        }
      }
      pdfDoc.setCreator('markdown-mermaidjs-to-pdf');

      pages.forEach((page, i) => {
        if (savedAnnotations[i]) {
          page.node.set(PDFName.Annots, savedAnnotations[i]);
        }
      });

      const modifiedPdfBytes = await pdfDoc.save();
      await fs.writeFile(outputPath, modifiedPdfBytes);

      this.logger.info('PDF metadata embedded successfully', {
        filename: this.currentFilename,
        title: frontMatter.title,
        author: frontMatter.author
      });
    } catch (error) {
      this.logger.warn('Failed to embed PDF metadata, PDF was still generated', {
        filename: this.currentFilename,
        error: error.message
      });
    }
  }

  async cleanup() {
    this.logger.debug('Cleaning up resources');

    if (this.page) {
      try {
        await this.page.close();
        this.logger.debug('Page closed');
      } catch (error) {
        this.logger.warn('Error closing page', { error: error.message });
      }
    }

    if (this.browser) {
      try {
        await this.browser.close();
        this.logger.debug('Browser closed');
      } catch (error) {
        this.logger.warn('Error closing browser', { error: error.message });
      }
    }
  }
}

module.exports = { MarkdownConverter };
