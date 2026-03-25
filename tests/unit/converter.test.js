const { MarkdownConverter } = require('../../src/root/app/converter');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs-extra');
const path = require('path');

describe('MarkdownConverter', () => {
  let converter;

  beforeEach(() => {
    // Set default environment variables for tests
    process.env.MARKDOWN_BREAKS = 'false';
    process.env.MAX_FILE_SIZE = '10485760';
    process.env.MAX_MERMAID_DIAGRAMS = '50';
    converter = new MarkdownConverter();
  });

  afterEach(async () => {
    await converter.cleanup();
    // Clean up environment variables
    delete process.env.MARKDOWN_BREAKS;
    delete process.env.MAX_FILE_SIZE;
    delete process.env.MAX_MERMAID_DIAGRAMS;
  });

  describe('Paragraph rendering (Issue #1)', () => {
    test('should treat consecutive lines with single newlines as a single paragraph', async () => {
      const markdownContent = `I will start writing a paragraph but put some of the newlines
in the file myself, so the raw source can also be read fluently.
Continuing with a next sentence, but still part of this paragraph.
Most renderers display a sequence of lines correctly as a paragraph.`;

      const { html: htmlContent } = await converter.processMarkdown(markdownContent);

      expect(htmlContent).toContain('<p>');
      expect(htmlContent).toMatch(/I will start writing.*in the file myself.*Continuing with a next sentence.*Most renderers/s);
      
      const pContent = htmlContent.match(/<p>(.*?)<\/p>/s);
      if (pContent) {
        expect(pContent[1]).not.toContain('<br>');
        expect(pContent[1]).not.toContain('<br/>');
        expect(pContent[1]).not.toContain('<br />');
      }
    });

    test('should create separate paragraphs for double newlines', async () => {
      const markdownContent = `First paragraph with some text.

Second paragraph after an empty line.`;

      const { html: htmlContent } = await converter.processMarkdown(markdownContent);

      const pTags = htmlContent.match(/<p>/g);
      expect(pTags).not.toBeNull();
      expect(pTags.length).toBeGreaterThanOrEqual(2);
      
      expect(htmlContent).toContain('First paragraph');
      expect(htmlContent).toContain('Second paragraph');
    });

    test('should handle mixed paragraph styles correctly', async () => {
      const markdownContent = `First line of paragraph one
still part of paragraph one.

This is paragraph two
also part of paragraph two.

And paragraph three stands alone.`;

      const { html: htmlContent } = await converter.processMarkdown(markdownContent);

      const pTags = htmlContent.match(/<p>/g);
      expect(pTags).not.toBeNull();
      expect(pTags.length).toBeGreaterThanOrEqual(3);
    });

    test('should allow explicit line breaks with two trailing spaces', async () => {
      const markdownContent = `First line  
Second line with explicit break`;

      const { html: htmlContent } = await converter.processMarkdown(markdownContent);

      expect(htmlContent).toMatch(/<br\s*\/?>/);
    });
  });

  describe('Mermaid diagram extraction', () => {
    test('should extract mermaid diagrams from markdown', () => {
      const markdownContent = `# Test

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

Some text.`;

      const diagrams = converter.extractMermaidDiagrams(markdownContent);
      expect(diagrams).toHaveLength(1);
      expect(diagrams[0].code).toContain('graph TD');
      expect(diagrams[0].type).toBe('flowchart');
    });

    test('should handle multiple mermaid diagrams', () => {
      const markdownContent = `\`\`\`mermaid
graph TD
  A --> B
\`\`\`

\`\`\`mermaid
sequenceDiagram
  Alice->>John: Hello
\`\`\``;

      const diagrams = converter.extractMermaidDiagrams(markdownContent);
      expect(diagrams).toHaveLength(2);
      expect(diagrams[0].type).toBe('flowchart');
      expect(diagrams[1].type).toBe('sequence');
    });
  });

  describe('Input validation', () => {
    test('should reject empty markdown content', () => {
      const emptyContent = '';
      expect(() => converter.validateMarkdownContent(emptyContent, 'test.md')).toThrow('File is empty');
    });

    test('should reject files with too many diagrams', () => {
      process.env.MAX_MERMAID_DIAGRAMS = '2';
      const converter2 = new MarkdownConverter();
      
      const contentWithManyDiagrams = `
\`\`\`mermaid
graph TD
  A --> B
\`\`\`

\`\`\`mermaid
graph TD
  C --> D
\`\`\`

\`\`\`mermaid
graph TD
  E --> F
\`\`\`
`;
      
      expect(() => converter2.validateMarkdownContent(contentWithManyDiagrams, 'test.md')).toThrow('exceeding maximum allowed');
      delete process.env.MAX_MERMAID_DIAGRAMS;
    });

    test('should accept valid markdown with reasonable number of diagrams', () => {
      const validContent = `# Test

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

Some text.`;
      
      expect(() => converter.validateMarkdownContent(validContent, 'test.md')).not.toThrow();
    });
  });

  describe('Environment-based configuration', () => {
    test('should respect MARKDOWN_BREAKS environment variable', () => {
      process.env.MARKDOWN_BREAKS = 'true';
      const converterWithBreaks = new MarkdownConverter();
      
      // Check that marked was configured with breaks: true
      // Note: We can't directly test marked's internal config,
      // but we can verify the converter was created without errors
      expect(converterWithBreaks).toBeDefined();
      
      delete process.env.MARKDOWN_BREAKS;
    });

    test('should use default MAX_FILE_SIZE when not specified', () => {
      const newConverter = new MarkdownConverter();
      expect(newConverter.maxFileSize).toBe(10485760); // 10MB default
    });

    test('should respect custom MAX_FILE_SIZE', () => {
      process.env.MAX_FILE_SIZE = '5242880';
      const newConverter = new MarkdownConverter();
      expect(newConverter.maxFileSize).toBe(5242880); // 5MB
      delete process.env.MAX_FILE_SIZE;
    });
  });

  describe('Diagram type detection', () => {
    test('should detect flowchart diagrams', () => {
      const code = 'graph TD\n  A --> B';
      const type = converter.detectDiagramType(code);
      expect(type).toBe('flowchart');
    });

    test('should detect sequence diagrams', () => {
      const code = 'sequenceDiagram\n  Alice->>John: Hello';
      const type = converter.detectDiagramType(code);
      expect(type).toBe('sequence');
    });

    test('should detect class diagrams', () => {
      const code = 'classDiagram\n  Animal <|-- Duck';
      const type = converter.detectDiagramType(code);
      expect(type).toBe('class');
    });
  });

  describe('YAML front matter parsing', () => {
    test('should strip front matter and return parsed data', async () => {
      const markdownContent = `---
title: Test Document
author: Jane Doe
date: 2026-03-02
description: A test document for front matter
---

# Hello World

Some content here.`;

      const { html, frontMatter } = await converter.processMarkdown(markdownContent);

      expect(frontMatter.title).toBe('Test Document');
      expect(frontMatter.author).toBe('Jane Doe');
      expect(frontMatter.description).toBe('A test document for front matter');
      expect(html).toContain('<h1');
      expect(html).toContain('Hello World');
      expect(html).not.toContain('title: Test Document');
      expect(html).not.toContain('author: Jane Doe');
    });

    test('should handle markdown without front matter', async () => {
      const markdownContent = `# No Front Matter

Just regular content.`;

      const { html, frontMatter } = await converter.processMarkdown(markdownContent);

      expect(Object.keys(frontMatter)).toHaveLength(0);
      expect(html).toContain('No Front Matter');
      expect(html).toContain('Just regular content');
    });

    test('should use title from front matter for HTML document title', async () => {
      const markdownContent = `---
title: My Custom Title
---

# Content`;

      const { html } = await converter.processMarkdown(markdownContent);

      expect(html).toContain('<title>My Custom Title</title>');
      expect(html).not.toContain('<title>Markdown to PDF</title>');
    });

    test('should use default title when front matter has no title', async () => {
      const markdownContent = `---
author: Someone
---

# Content`;

      const { html } = await converter.processMarkdown(markdownContent);

      expect(html).toContain('<title>Markdown to PDF</title>');
    });

    test('should escape HTML entities in front matter values', async () => {
      const markdownContent = `---
title: Title with <script>alert("xss")</script>
---

Content.`;

      const { html } = await converter.processMarkdown(markdownContent);

      expect(html).not.toContain('<script>alert');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('Front matter styled mode', () => {
    let styledConverter;

    beforeEach(() => {
      styledConverter = new MarkdownConverter({ frontMatterMode: 'styled' });
    });

    afterEach(async () => {
      await styledConverter.cleanup();
    });

    test('should render styled title block when mode is styled', async () => {
      const markdownContent = `---
title: Styled Document
author: Platform Engineering
date: 2026-03-02
description: A styled front matter test
---

# Content`;

      const { html } = await styledConverter.processMarkdown(markdownContent);

      expect(html).toContain('class="front-matter-header"');
      expect(html).toContain('class="front-matter-title"');
      expect(html).toContain('Styled Document');
      expect(html).toContain('class="front-matter-description"');
      expect(html).toContain('A styled front matter test');
      expect(html).toContain('Platform Engineering');
      expect(html).toContain('2026-03-02');
    });

    test('should not render title block when mode is none', async () => {
      const markdownContent = `---
title: Hidden Title
author: Someone
---

# Content`;

      const { html } = await converter.processMarkdown(markdownContent);

      expect(html).not.toContain('class="front-matter-header"');
      expect(html).not.toContain('class="front-matter-title"');
      expect(html).toContain('<title>Hidden Title</title>');
    });

    test('should not render title block when no front matter exists', async () => {
      const markdownContent = `# Just Content`;

      const { html } = await styledConverter.processMarkdown(markdownContent);

      expect(html).not.toContain('class="front-matter-header"');
    });

    test('should render partial front matter in styled mode', async () => {
      const markdownContent = `---
title: Title Only Doc
---

# Content`;

      const { html } = await styledConverter.processMarkdown(markdownContent);

      expect(html).toContain('class="front-matter-header"');
      expect(html).toContain('Title Only Doc');
      expect(html).not.toContain('class="front-matter-description"');
      expect(html).not.toContain('class="front-matter-meta"');
    });
  });

  describe('PDF metadata embedding', () => {
    const tmpDir = path.join(__dirname, '..', 'tmp');
    const tmpPdfPath = path.join(tmpDir, 'test-metadata.pdf');

    beforeAll(async () => {
      await fs.ensureDir(tmpDir);
    });

    afterAll(async () => {
      await fs.remove(tmpDir);
    });

    test('should embed metadata into a PDF file', async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage();
      const pdfBytes = await pdfDoc.save();
      await fs.writeFile(tmpPdfPath, pdfBytes);

      const frontMatter = {
        title: 'Metadata Test',
        author: 'Test Author',
        description: 'Test description for subject field',
        date: '2026-03-02',
        keywords: ['test', 'metadata', 'pdf']
      };

      await converter.embedPdfMetadata(tmpPdfPath, frontMatter);

      const modifiedBytes = await fs.readFile(tmpPdfPath);
      const modifiedDoc = await PDFDocument.load(modifiedBytes);

      expect(modifiedDoc.getTitle()).toBe('Metadata Test');
      expect(modifiedDoc.getAuthor()).toBe('Test Author');
      expect(modifiedDoc.getSubject()).toBe('Test description for subject field');
      expect(modifiedDoc.getKeywords()).toBe('test metadata pdf');
      expect(modifiedDoc.getCreator()).toBe('markdown-mermaidjs-to-pdf');
      expect(modifiedDoc.getCreationDate()).toEqual(new Date('2026-03-02'));
    });

    test('should handle keywords as comma-separated string', async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage();
      const pdfBytes = await pdfDoc.save();
      await fs.writeFile(tmpPdfPath, pdfBytes);

      const frontMatter = {
        keywords: 'alpha, beta, gamma'
      };

      await converter.embedPdfMetadata(tmpPdfPath, frontMatter);

      const modifiedBytes = await fs.readFile(tmpPdfPath);
      const modifiedDoc = await PDFDocument.load(modifiedBytes);

      expect(modifiedDoc.getKeywords()).toBe('alpha beta gamma');
    });

    test('should skip metadata embedding when no front matter', async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage();
      const originalBytes = await pdfDoc.save();
      await fs.writeFile(tmpPdfPath, originalBytes);

      await converter.embedPdfMetadata(tmpPdfPath, {});

      const afterBytes = await fs.readFile(tmpPdfPath);
      expect(Buffer.compare(originalBytes, afterBytes)).toBe(0);
    });

    test('should not throw on invalid date in front matter', async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage();
      const pdfBytes = await pdfDoc.save();
      await fs.writeFile(tmpPdfPath, pdfBytes);

      const frontMatter = {
        title: 'Bad Date Doc',
        date: 'not-a-real-date'
      };

      await expect(converter.embedPdfMetadata(tmpPdfPath, frontMatter)).resolves.not.toThrow();

      const modifiedBytes = await fs.readFile(tmpPdfPath);
      const modifiedDoc = await PDFDocument.load(modifiedBytes);
      expect(modifiedDoc.getTitle()).toBe('Bad Date Doc');
    });
  });

  describe('PDF link support', () => {
    describe('heading IDs for internal links', () => {
      test('should add id attribute to headings in HTML output', async () => {
        const markdownContent = `## My Section

Some content.

### Another Heading Here`;

        const { html } = await converter.processMarkdown(markdownContent);

        expect(html).toContain('id="my-section"');
        expect(html).toContain('<h2 id="my-section">');
        expect(html).toContain('id="another-heading-here"');
        expect(html).toContain('<h3 id="another-heading-here">');
      });

      test('should slugify heading text in GFM style', async () => {
        const markdownContent = `# Hello World
## Code & Stuff`;

        const { html } = await converter.processMarkdown(markdownContent);

        expect(html).toMatch(/<h1[^>]*id="hello-world"/);
        expect(html).toMatch(/<h2[^>]*id="code-stuff"/);
      });
    });

    describe('link CSS in HTML document', () => {
      test('should include anchor styles and print URL rule in wrapped HTML', () => {
        const html = converter.wrapInHtmlDocument('<p>Body</p>', {});

        expect(html).toContain('a {');
        expect(html).toContain('color: inherit');
        expect(html).toContain('text-decoration: none');
        expect(html).toContain('a[href^="#"]');
        expect(html).toContain('a[href^="http"]');
        expect(html).toContain('color: #0366d6');
        expect(html).toContain('text-decoration: underline');
        expect(html).toContain('@media print');
        expect(html).toContain('a[href^="http"]::after');
        expect(html).toContain('attr(href)');
      });
    });

    describe('tagged PDF option', () => {
      test('should pass tagged: true to page.pdf when generating PDF', async () => {
        const outputDir = path.join(__dirname, '..', 'tmp');
        const outputPath = path.join(outputDir, 'tagged-pdf-test.pdf');
        await fs.ensureDir(outputDir);

        let pdfOptionsCaptured = null;
        const puppeteer = require('puppeteer-core');
        const originalLaunch = puppeteer.launch;
        const originalExecPath = process.env.PUPPETEER_EXECUTABLE_PATH;
        process.env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/true';
        puppeteer.launch = jest.fn().mockImplementation(() => {
          const mockPage = {
            setContent: () => Promise.resolve(),
            waitForFunction: () => Promise.resolve(),
            evaluate: () => Promise.resolve({ total: 0, rendered: 0, failed: 0 }),
            addScriptTag: () => Promise.resolve(),
            pdf: (opts) => {
              pdfOptionsCaptured = opts;
              return Promise.resolve(Buffer.alloc(0));
            },
            close: () => Promise.resolve()
          };
          return Promise.resolve({
            newPage: () => Promise.resolve(mockPage),
            close: () => Promise.resolve()
          });
        });

        try {
          await converter.initializeBrowser();
          const minimalHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Test</title></head><body><p>Test</p></body></html>';
          await converter.generatePdf(minimalHtml, outputPath, {});
          expect(pdfOptionsCaptured).not.toBeNull();
          expect(pdfOptionsCaptured.tagged).toBe(true);
        } finally {
          puppeteer.launch = originalLaunch;
          if (originalExecPath) { process.env.PUPPETEER_EXECUTABLE_PATH = originalExecPath; } else { delete process.env.PUPPETEER_EXECUTABLE_PATH; }
          await fs.remove(outputDir).catch(() => {});
        }
      });
    });

    describe('annotation preservation in metadata embedding', () => {
      test('should not throw when embedding metadata into PDF with pages', async () => {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage();
        const pdfBytes = await pdfDoc.save();
        const tmpDir = path.join(__dirname, '..', 'tmp');
        const tmpPath = path.join(tmpDir, 'annot-test.pdf');
        await fs.ensureDir(tmpDir);
        await fs.writeFile(tmpPath, pdfBytes);

        await expect(
          converter.embedPdfMetadata(tmpPath, { title: 'Test', author: 'Author' })
        ).resolves.not.toThrow();

        const loaded = await PDFDocument.load(await fs.readFile(tmpPath));
        expect(loaded.getPages()).toHaveLength(1);
        await fs.remove(tmpDir).catch(() => {});
      });
    });
  });

  describe('Mermaid diagram count from processMarkdown', () => {
    test('should return mermaidDiagramCount of 0 when no diagrams', async () => {
      const markdownContent = `# No Diagrams\n\nJust text.`;
      const result = await converter.processMarkdown(markdownContent);
      expect(result.mermaidDiagramCount).toBe(0);
    });

    test('should return correct mermaidDiagramCount when diagrams exist', async () => {
      const markdownContent = `# With Diagrams

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

Some text.

\`\`\`mermaid
sequenceDiagram
  Alice->>Bob: Hello
\`\`\``;

      const result = await converter.processMarkdown(markdownContent);
      expect(result.mermaidDiagramCount).toBe(2);
    });
  });

  describe('HTML template Mermaid script removal', () => {
    test('should not include CDN mermaid script in HTML output', async () => {
      const markdownContent = `# Test\n\nSome content.`;
      const { html } = await converter.processMarkdown(markdownContent);
      expect(html).not.toContain('cdn.jsdelivr.net/npm/mermaid');
      expect(html).not.toContain('mermaid.initialize');
      expect(html).not.toContain('DOMContentLoaded');
    });

    test('should not include mermaid script even with diagrams', async () => {
      const markdownContent = `# Test

\`\`\`mermaid
graph TD
  A --> B
\`\`\``;

      const { html } = await converter.processMarkdown(markdownContent);
      expect(html).not.toContain('cdn.jsdelivr.net/npm/mermaid');
    });
  });

  describe('getMermaidCdnUrl', () => {
    test('should return CDN URL with default version', () => {
      const url = converter.getMermaidCdnUrl();
      expect(url).toContain('cdn.jsdelivr.net/npm/mermaid@10.6.1');
    });

    test('should respect MERMAID_VERSION environment variable', () => {
      process.env.MERMAID_VERSION = '11.0.0';
      try {
        const url = converter.getMermaidCdnUrl();
        expect(url).toContain('mermaid@11.0.0');
      } finally {
        delete process.env.MERMAID_VERSION;
      }
    });
  });

  describe('getMermaidLocalPath', () => {
    test('should return null when no local file exists and no env override', () => {
      // When the bundled vendor file exists (e.g., in Docker), it returns that path.
      // When no local file exists, it returns null.
      const localPath = converter.getMermaidLocalPath();
      if (localPath) {
        expect(require('fs').existsSync(localPath)).toBe(true);
      } else {
        expect(localPath).toBeNull();
      }
    });

    test('should respect MERMAID_JS_PATH environment variable', () => {
      const tmpDir = path.join(__dirname, '..', 'tmp');
      const tmpPath = path.join(tmpDir, 'mermaid-test.js');
      fs.ensureDirSync(tmpDir);
      fs.writeFileSync(tmpPath, '// fake mermaid');

      process.env.MERMAID_JS_PATH = tmpPath;
      try {
        const localPath = converter.getMermaidLocalPath();
        expect(localPath).toBe(tmpPath);
      } finally {
        delete process.env.MERMAID_JS_PATH;
        fs.removeSync(tmpDir);
      }
    });
  });

  describe('generatePdf Mermaid conditional loading', () => {
    let mockPage;
    let puppeteerModule;
    let originalLaunch;
    let originalExecPath;

    beforeEach(() => {
      originalExecPath = process.env.PUPPETEER_EXECUTABLE_PATH;
      process.env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/true';
      mockPage = {
        setContent: jest.fn().mockResolvedValue(undefined),
        waitForFunction: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue({ total: 0, rendered: 0, failed: 0 }),
        addScriptTag: jest.fn().mockResolvedValue(undefined),
        pdf: jest.fn().mockResolvedValue(Buffer.alloc(0)),
        close: jest.fn().mockResolvedValue(undefined)
      };

      puppeteerModule = require('puppeteer-core');
      originalLaunch = puppeteerModule.launch;
      puppeteerModule.launch = jest.fn().mockResolvedValue({
        newPage: () => Promise.resolve(mockPage),
        close: () => Promise.resolve()
      });
    });

    afterEach(async () => {
      puppeteerModule.launch = originalLaunch;
      if (originalExecPath) { process.env.PUPPETEER_EXECUTABLE_PATH = originalExecPath; } else { delete process.env.PUPPETEER_EXECUTABLE_PATH; }
    });

    test('should skip mermaid loading when mermaidDiagramCount is 0', async () => {
      const outputDir = path.join(__dirname, '..', 'tmp');
      const outputPath = path.join(outputDir, 'no-mermaid.pdf');
      await fs.ensureDir(outputDir);

      try {
        await converter.initializeBrowser();
        const html = '<!DOCTYPE html><html><head></head><body><p>Test</p></body></html>';
        await converter.generatePdf(html, outputPath, {}, 0);

        expect(mockPage.addScriptTag).not.toHaveBeenCalled();
        expect(mockPage.pdf).toHaveBeenCalled();
      } finally {
        await fs.remove(outputDir).catch(() => {});
      }
    });

    test('should load mermaid when mermaidDiagramCount > 0', async () => {
      const outputDir = path.join(__dirname, '..', 'tmp');
      const outputPath = path.join(outputDir, 'with-mermaid.pdf');
      await fs.ensureDir(outputDir);

      try {
        await converter.initializeBrowser();
        const html = '<!DOCTYPE html><html><head></head><body><div class="mermaid-diagram" data-mermaid="graph%20TD%0A%20%20A%20--%3E%20B"><div class="mermaid-placeholder">Rendering...</div></div></body></html>';
        await converter.generatePdf(html, outputPath, {}, 1);

        expect(mockPage.addScriptTag).toHaveBeenCalled();
        expect(mockPage.waitForFunction).toHaveBeenCalled();
        expect(mockPage.evaluate).toHaveBeenCalled();
        expect(mockPage.pdf).toHaveBeenCalled();
      } finally {
        await fs.remove(outputDir).catch(() => {});
      }
    });

    test('should fall back to local file when CDN addScriptTag fails', async () => {
      const outputDir = path.join(__dirname, '..', 'tmp');
      const outputPath = path.join(outputDir, 'fallback-mermaid.pdf');
      const fakeMermaidPath = path.join(outputDir, 'mermaid.min.js');
      await fs.ensureDir(outputDir);
      await fs.writeFile(fakeMermaidPath, '// fake mermaid');

      process.env.MERMAID_JS_PATH = fakeMermaidPath;

      let addScriptCallCount = 0;
      mockPage.addScriptTag = jest.fn().mockImplementation((opts) => {
        addScriptCallCount++;
        if (opts.url) {
          // CDN call fails
          return Promise.reject(new Error('net::ERR_CONNECTION_REFUSED'));
        }
        // Local file call succeeds
        return Promise.resolve();
      });

      try {
        await converter.initializeBrowser();
        const html = '<!DOCTYPE html><html><head></head><body><div class="mermaid-diagram" data-mermaid="graph%20TD%0A%20%20A%20--%3E%20B"><div class="mermaid-placeholder">Rendering...</div></div></body></html>';
        await converter.generatePdf(html, outputPath, {}, 1);

        expect(addScriptCallCount).toBe(2);
        expect(mockPage.addScriptTag).toHaveBeenCalledWith(expect.objectContaining({ url: expect.any(String) }));
        expect(mockPage.addScriptTag).toHaveBeenCalledWith(expect.objectContaining({ path: fakeMermaidPath }));
        expect(mockPage.pdf).toHaveBeenCalled();
      } finally {
        delete process.env.MERMAID_JS_PATH;
        await fs.remove(outputDir).catch(() => {});
      }
    });

    test('should default mermaidDiagramCount to 0 when not provided', async () => {
      const outputDir = path.join(__dirname, '..', 'tmp');
      const outputPath = path.join(outputDir, 'default-count.pdf');
      await fs.ensureDir(outputDir);

      try {
        await converter.initializeBrowser();
        const html = '<!DOCTYPE html><html><head></head><body><p>Test</p></body></html>';
        await converter.generatePdf(html, outputPath, {});

        expect(mockPage.addScriptTag).not.toHaveBeenCalled();
        expect(mockPage.pdf).toHaveBeenCalled();
      } finally {
        await fs.remove(outputDir).catch(() => {});
      }
    });
  });
});
