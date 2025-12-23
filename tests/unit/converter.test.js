const { MarkdownConverter } = require('../../src/root/app/converter');
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

      const htmlContent = await converter.processMarkdown(markdownContent);

      // The HTML should contain a single <p> tag with the text joined
      // It should NOT contain <br> tags for the single newlines
      expect(htmlContent).toContain('<p>');
      expect(htmlContent).toMatch(/I will start writing.*in the file myself.*Continuing with a next sentence.*Most renderers/s);
      
      // Should NOT have <br> tags within the paragraph (breaks: false)
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

      const htmlContent = await converter.processMarkdown(markdownContent);

      // Should have two separate <p> tags
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

      const htmlContent = await converter.processMarkdown(markdownContent);

      // Should have three <p> tags
      const pTags = htmlContent.match(/<p>/g);
      expect(pTags).not.toBeNull();
      expect(pTags.length).toBeGreaterThanOrEqual(3);
    });

    test('should allow explicit line breaks with two trailing spaces', async () => {
      const markdownContent = `First line  
Second line with explicit break`;

      const htmlContent = await converter.processMarkdown(markdownContent);

      // With GFM and breaks: false, two trailing spaces should create a <br>
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
});
