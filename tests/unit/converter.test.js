const { MarkdownConverter } = require('../../src/root/app/converter');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs-extra');
const path = require('path');

describe('MarkdownConverter', () => {
  let converter;

  beforeEach(() => {
    converter = new MarkdownConverter();
  });

  afterEach(async () => {
    await converter.cleanup();
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
        const puppeteer = require('puppeteer');
        const originalLaunch = puppeteer.launch;
        puppeteer.launch = jest.fn().mockImplementation(() => {
          const mockPage = {
            setContent: () => Promise.resolve(),
            waitForFunction: () => Promise.resolve(),
            evaluate: () => Promise.resolve({ total: 0, rendered: 0, failed: 0 }),
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
          const minimalHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Test</title></head><body><p>Test</p></body></html>';
          await converter.generatePdf(minimalHtml, outputPath, {});
          expect(pdfOptionsCaptured).not.toBeNull();
          expect(pdfOptionsCaptured.tagged).toBe(true);
        } finally {
          puppeteer.launch = originalLaunch;
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
});
