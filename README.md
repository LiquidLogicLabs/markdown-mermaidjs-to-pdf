# Markdown to PDF Converter

Convert Markdown files with Mermaid diagrams to high-quality PDF documents.

[![npm](https://img.shields.io/npm/v/@liquidlogiclabs/markdown-mermaidjs-to-pdf)](https://github.com/LiquidLogicLabs/markdown-mermaidjs-to-pdf/packages)
[![Container Image](https://img.shields.io/badge/ghcr-liquidlogiclabs%2Fmarkdown--mermaidjs--to--pdf-blue)](https://github.com/LiquidLogicLabs/markdown-mermaidjs-to-pdf/pkgs/container/markdown-mermaidjs-to-pdf)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![GitHub Repository](https://img.shields.io/badge/github-liquidlogiclabs%2Fmarkdown--mermaidjs--to--pdf-black)](https://github.com/liquidlogiclabs/markdown-mermaidjs-to-pdf)
[![Release](https://github.com/liquidlogiclabs/markdown-mermaidjs-to-pdf/actions/workflows/release.yml/badge.svg)](https://github.com/liquidlogiclabs/markdown-mermaidjs-to-pdf/actions/workflows/release.yml)

## Purpose

This tool converts Markdown files containing Mermaid diagrams into professional PDF documents. It is designed for:

- Technical documentation
- Architecture diagrams
- Process flows
- API documentation
- Any document requiring both text and visual diagrams

## Features

- **Batch Processing** - Convert multiple markdown files at once
- **Full Markdown Support** - Headers, lists, tables, code blocks, and more
- **Mermaid Diagram Rendering** - All diagram types (flowcharts, sequence, class, state, etc.)
- **YAML Front Matter** - Parse front matter metadata for PDF document properties and optional styled title blocks
- **High-Quality PDF Output** - Professional formatting with clean typography
- **Docker and npm** - Install via npm or run as a Docker container

## Supported Mermaid Diagrams

- [Flowcharts](https://mermaid.js.org/syntax/flowchart.html)
- [Sequence Diagrams](https://mermaid.js.org/syntax/sequenceDiagram.html)
- [Class Diagrams](https://mermaid.js.org/syntax/classDiagram.html)
- [State Diagrams](https://mermaid.js.org/syntax/stateDiagram.html)
- [Entity Relationship Diagrams](https://mermaid.js.org/syntax/entityRelationshipDiagram.html)
- [User Journey Diagrams](https://mermaid.js.org/syntax/userJourney.html)
- [Gantt Charts](https://mermaid.js.org/syntax/gantt.html)
- [Pie Charts](https://mermaid.js.org/syntax/pie.html)
- [Git Graphs](https://mermaid.js.org/syntax/gitgraph.html)
- [Mind Maps](https://mermaid.js.org/syntax/mindmap.html)
- [Timeline](https://mermaid.js.org/syntax/timeline.html)
- [ZenUML](https://mermaid.js.org/syntax/zenuml.html)
- [Sankey Diagrams](https://mermaid.js.org/syntax/sankey.html)

## Installation

### npm (requires Node.js >= 20)

```bash
# Install globally
npm install -g @liquidlogiclabs/markdown-mermaidjs-to-pdf

# Or run without installing
npx @liquidlogiclabs/markdown-mermaidjs-to-pdf -i ./docs -o ./pdfs
```

Puppeteer downloads a Chromium binary automatically during install (~280 MB). No other system dependencies are required.

### Docker (pull)

```bash
docker pull ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:latest
```

## Quick Start

1. Place your `.md` files in a directory (e.g. `./docs`)
2. Run the converter:

```bash
markdown-mermaidjs-to-pdf -i ./docs -o ./pdfs
```

3. Find the generated PDFs in `./pdfs` -- each `.md` file produces a matching `.pdf` (e.g. `guide.md` becomes `guide.pdf`)

## Usage

### npm / npx

```bash
# Convert files from ./input to ./output (defaults)
markdown-mermaidjs-to-pdf

# Specify directories
markdown-mermaidjs-to-pdf -i ./docs -o ./pdfs

# Short alias
mdmmjs2pdf -i ./docs -o ./pdfs

# Render front matter as a styled title block
markdown-mermaidjs-to-pdf -i ./docs -o ./pdfs --front-matter styled

# Verbose logging
markdown-mermaidjs-to-pdf -i ./docs -o ./pdfs -v

# Disable logging
markdown-mermaidjs-to-pdf -i ./docs -o ./pdfs --no-logging
```

### Docker (run)

The image runs the converter by default; you only pass volume mounts and any CLI options after the image name.

```bash
# Convert all markdown files in ./data/input to ./data/output
docker run --rm \
  -v $(pwd)/data/input:/data/input \
  -v $(pwd)/data/output:/data/output \
  ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Convert files from custom directories
docker run --rm \
  -v $(pwd)/docs:/data/input \
  -v $(pwd)/pdfs:/data/output \
  ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Render front matter as a styled title block
docker run --rm \
  -v $(pwd)/data/input:/data/input \
  -v $(pwd)/data/output:/data/output \
  -e FRONT_MATTER_MODE=styled \
  ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Enable verbose logging (env var)
docker run --rm \
  -v $(pwd)/data/input:/data/input \
  -v $(pwd)/data/output:/data/output \
  -e LOG_LEVEL=debug \
  ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Pass CLI options after the image name (e.g. verbose, custom dirs, front matter)
docker run --rm \
  -v $(pwd)/docs:/data/input \
  -v $(pwd)/pdfs:/data/output \
  ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:latest -v --front-matter styled
```

### CLI Options

| Option | Description |
|--------|-------------|
| `-i, --input <dir>` | Input directory (default: `./input`, Docker: `/data/input`) |
| `-o, --output <dir>` | Output directory (default: `./output`, Docker: `/data/output`) |
| `--front-matter <mode>` | Front matter handling: `none` (default) or `styled` |
| `-v, --verbose` | Enable debug logging |
| `--no-logging` | Disable logging |
| `-V, --version` | Show version number |
| `-h, --help` | Show help |

### Output File Naming

Each input file produces a PDF with the same base name: `guide.md` becomes `guide.pdf`, `notes.markdown` becomes `notes.pdf`.

### Directory Structure

- **Input Directory**: Place your `.md` and `.markdown` files here
- **Output Directory**: Generated PDF files are saved here
- **Logs**: Application logs are stored in the `logs/` directory (when logging is enabled)

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONT_MATTER_MODE` | `none` | Front matter handling: `none` or `styled` (see [YAML Front Matter](#yaml-front-matter)) |
| `LOGGING_ENABLED` | `true` | Enable or disable logging |
| `LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `LOG_DIR` | `logs` | Directory for log files |
| `NODE_ENV` | `production` | Environment mode |
| `MARKDOWN_MERMAIDJS_TO_PDF_DEBUG` | `false` | Enable debug overlay showing Mermaid diagram statistics |
| `MAX_FILE_SIZE` | `10485760` | Maximum file size in bytes (default: 10MB) |
| `MAX_MERMAID_DIAGRAMS` | `50` | Maximum number of Mermaid diagrams per file |
| `MARKDOWN_BREAKS` | `false` | Treat single newlines as line breaks in paragraphs |
| `PDF_FORMAT` | `A4` | PDF page format (A4, Letter, Legal, etc.) |
| `PDF_MARGIN_TOP` | `1in` | PDF top margin |
| `PDF_MARGIN_RIGHT` | `1in` | PDF right margin |
| `PDF_MARGIN_BOTTOM` | `1in` | PDF bottom margin |
| `PDF_MARGIN_LEFT` | `1in` | PDF left margin |

## YAML Front Matter

Markdown files can include a YAML front matter block at the top, delimited by `---`. This is a widely supported standard used by Jekyll, Hugo, Pandoc, Obsidian, and many other tools.

```markdown
---
title: Branch and Release Guidelines
description: Branching strategy and release process
author: Platform Engineering
date: 2026-03-02
keywords: branching, releases, versioning
---

# Your document content starts here
```

### How front matter is used

Front matter is always stripped from the visible document content. It is used in two ways:

1. **PDF document metadata** - The `title`, `author`, `description` (as Subject), `date`, and `keywords` fields are embedded into the PDF document properties. These appear in your PDF viewer's "Document Properties" dialog and are used by search engines and document management systems.

2. **HTML title** - The `title` field sets the HTML `<title>` tag (visible in browser tabs when viewing the PDF source).

### Styled Title Block

With `--front-matter styled`, a formatted title block is rendered at the top of the PDF:

```bash
# Build image locally
docker build -f docker/Dockerfile -t liquidlogiclabs/markdown-mermaidjs-to-pdf:latest .

# Run with custom log level
docker run --rm \
  -v $(pwd)/data/input:/data/input \
  -v $(pwd)/data/output:/data/output \
  -e LOG_LEVEL=debug \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Run with debug mode enabled
docker run --rm \
  -v $(pwd)/data/input:/data/input \
  -v $(pwd)/data/output:/data/output \
  -e MARKDOWN_MERMAIDJS_TO_PDF_DEBUG=true \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Disable logging
docker run --rm \
  -v $(pwd)/data/input:/data/input \
  -v $(pwd)/data/output:/data/output \
  -e LOGGING_ENABLED=false \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Custom PDF margins and format (Letter size with custom margins)
docker run --rm \
  -v $(pwd)/data/input:/data/input \
  -v $(pwd)/data/output:/data/output \
  -e PDF_FORMAT=Letter \
  -e PDF_MARGIN_TOP=0.5in \
  -e PDF_MARGIN_BOTTOM=0.5in \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Increase file size limit for large documents
docker run --rm \
  -v $(pwd)/data/input:/data/input \
  -v $(pwd)/data/output:/data/output \
  -e MAX_FILE_SIZE=20971520 \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Enable markdown line breaks and increase diagram limit
docker run --rm \
  -v $(pwd)/data/input:/data/input \
  -v $(pwd)/data/output:/data/output \
  -e MARKDOWN_BREAKS=true \
  -e MAX_MERMAID_DIAGRAMS=100 \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest
```

This displays the title as a large heading, followed by the description, author, and date in a styled header block separated from the document content by a divider.

### Supported Fields

| Field | PDF Property | Styled block |
|-------|-------------|--------------|
| `title` | Title | Large heading |
| `description` | Subject | Subtitle text |
| `author` | Author | Meta line |
| `date` | CreationDate | Meta line |
| `keywords` | Keywords | - |

## Architecture

1. **CLI Interface** - Command-line argument parsing (Commander)
2. **Front Matter Parser** - Extracts YAML metadata from markdown (gray-matter)
3. **Markdown Parser** - Converts markdown to HTML (marked)
4. **Mermaid Renderer** - Renders diagrams to SVG (mermaid.js via Puppeteer)
5. **PDF Generator** - Converts HTML to PDF (Puppeteer)
6. **PDF Metadata** - Embeds document properties into PDF (pdf-lib)
7. **Logging System** - Configurable logging (Winston)

## Contributing

See [DEVELOPMENT.md](DEVELOPMENT.md) for local development setup, testing, workflows, and release process.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:

1. Review the log files
2. Check the [troubleshooting section](DEVELOPMENT.md#troubleshooting-act) in the development guide
3. Open an issue on GitHub

---

**Built by LiquidLogicLabs**
