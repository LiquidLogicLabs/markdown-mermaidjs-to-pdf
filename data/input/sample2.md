# Complex Markdown Document with Multiple Diagrams

This document demonstrates various types of Mermaid diagrams and complex markdown features.

## System Architecture

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Converter
    participant Mermaid
    participant Puppeteer
    
    User->>Converter: Submit markdown file
    Converter->>Converter: Parse markdown content
    Converter->>Mermaid: Extract diagram code
    Mermaid->>Mermaid: Render to SVG
    Mermaid-->>Converter: Return SVG
    Converter->>Converter: Replace code blocks
    Converter->>Puppeteer: Generate PDF
    Puppeteer-->>Converter: Return PDF
    Converter-->>User: Output file
```

### Class Diagram

```mermaid
classDiagram
    class MarkdownConverter {
        -logger: Logger
        -browser: Browser
        -page: Page
        +convertToPdf(input, output)
        -readMarkdownFile(path)
        -processMarkdown(content)
        -extractMermaidDiagrams(content)
        -renderMermaidDiagram(code)
        -generatePdf(html, path)
        -cleanup()
    }
    
    class Logger {
        +info(message, meta)
        +debug(message, meta)
        +error(message, meta)
        +warn(message, meta)
    }
    
    MarkdownConverter --> Logger
```

### State Diagram

```mermaid
stateDiagram-v2
    [*] --> Initialized
    Initialized --> ReadingFile: Read markdown
    ReadingFile --> Processing: File loaded
    Processing --> ExtractingDiagrams: Parse content
    ExtractingDiagrams --> RenderingDiagrams: Diagrams found
    RenderingDiagrams --> ConvertingHTML: Diagrams rendered
    ConvertingHTML --> GeneratingPDF: HTML ready
    GeneratingPDF --> Completed: PDF generated
    Completed --> [*]
    
    ReadingFile --> Error: File not found
    Processing --> Error: Parse error
    ExtractingDiagrams --> Error: Diagram error
    RenderingDiagrams --> Error: Render error
    GeneratingPDF --> Error: PDF error
    Error --> [*]
```

## Pie Chart Example

```mermaid
pie title Technology Stack
    "Node.js" : 40
    "Puppeteer" : 25
    "Mermaid.js" : 20
    "Marked" : 15
```

## Gantt Chart

```mermaid
gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Development
    Setup Environment    :done, setup, 2024-01-01, 2024-01-03
    Core Implementation  :active, core, 2024-01-04, 2024-01-15
    Testing             :test, 2024-01-16, 2024-01-20
    Documentation       :doc, 2024-01-21, 2024-01-25
```

## Entity Relationship Diagram

```mermaid
erDiagram
    MARKDOWN_FILE ||--o{ MERMAID_DIAGRAM : contains
    MARKDOWN_FILE {
        string filename
        string content
        datetime created
    }
    MERMAID_DIAGRAM {
        string type
        string code
        string rendered_svg
    }
    PDF_OUTPUT ||--|| MARKDOWN_FILE : generated_from
    PDF_OUTPUT {
        string filename
        int page_count
        datetime generated
    }
```

## Mind Map

```mermaid
mindmap
  root((Markdown to PDF))
    Features
      Markdown Support
        Headers
        Lists
        Tables
        Code blocks
      Mermaid Diagrams
        Flowcharts
        Sequence diagrams
        Class diagrams
        State diagrams
        Pie charts
        Gantt charts
      PDF Generation
        High quality
        Configurable margins
        Professional styling
    Architecture
      Node.js runtime
      Puppeteer for PDF
      Mermaid.js for diagrams
      Winston for logging
```

## Configuration Options

The application supports various configuration options through environment variables:

- `LOGGING_ENABLED`: Enable/disable logging (default: true)
- `LOG_LEVEL`: Set log level (debug, info, warn, error)
- `LOG_DIR`: Directory for log files
- `NODE_ENV`: Environment mode (development, production)

## Advanced Features

### Custom Styling

The generated PDF includes professional styling with:
- Clean typography
- Proper spacing
- Syntax highlighting for code blocks
- Responsive diagram rendering
- Professional color scheme

### Error Handling

The application includes comprehensive error handling:
- File not found errors
- Mermaid diagram rendering errors
- PDF generation failures
- Graceful cleanup of resources

### Performance Considerations

- Efficient diagram rendering
- Memory management
- Resource cleanup
- Optimized PDF generation 