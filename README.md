# Markdown to PDF Converter

A Docker-based application that converts Markdown files with Mermaid diagrams to high-quality PDF documents.

[![Docker Image](https://img.shields.io/badge/docker-liquidlogiclabs%2Fmarkdown--to--pdf-blue)](https://hub.docker.com/r/liquidlogiclabs/markdown-to-pdf)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 🚀 Quick Start

### Prerequisites
- Docker installed and running

### Installation & Testing

```bash
# Clone the repository
git clone <repository-url>
cd markdown-converter

# Build the Docker image
./scripts/build.sh

# Test with sample files
./scripts/test.sh
```

### Basic Usage

```bash
# Convert all markdown files in ./input to ./output
./scripts/run.sh

# Convert files from custom directories
./scripts/run.sh ./docs ./pdfs

# Enable verbose logging
./scripts/run.sh -v ./data/input ./data/output
```

## ✨ Features

- **Batch Processing** - Convert multiple markdown files at once
- **Full Markdown Support** - Complete Markdown syntax including headers, lists, tables, code blocks
- **Mermaid Diagram Rendering** - All diagram types (flowcharts, sequence, class, state, etc.)
- **High-Quality PDF Output** - Professional PDF generation with clean typography
- **Docker Containerization** - Easy deployment and consistent environment
- **Comprehensive Logging** - Detailed logging with configurable levels
- **Environment Configuration** - Flexible configuration through environment variables

## 📊 Supported Mermaid Diagrams

- Flowcharts
- Sequence Diagrams
- Class Diagrams
- State Diagrams
- Entity Relationship Diagrams
- User Journey Diagrams
- Gantt Charts
- Pie Charts
- Git Graphs
- Mind Maps
- Timeline
- ZenUML
- Sankey Diagrams

## 🏗️ Architecture

The application uses a modular architecture:

1. **CLI Interface** - Command-line argument parsing
2. **Markdown Parser** - Converts markdown to HTML using `marked`
3. **Mermaid Renderer** - Renders diagrams to SVG using `mermaid.js`
4. **PDF Generator** - Converts HTML to PDF using Puppeteer
5. **Logging System** - Comprehensive logging using Winston

## 📁 Project Structure

```
markdown-converter/
├── src/root/app/         # Application source code
├── docker/               # Docker-related files
├── tests/                # Test files and samples
├── scripts/              # Utility scripts
├── docs/                 # Documentation
├── data/input/           # Input directory for markdown files (created by run script)
├── data/output/          # Output directory for PDF files (created by run script)
├── data/logs/            # Output directory for Log files
└── package.json          # Node.js dependencies
```

### Directory Structure

The application uses a simple directory structure:
- **Input Directory** (`/data/input` in container): Place your `.md` and `.markdown` files here
- **Output Directory** (`/data/output` in container): Generated PDF files will be saved here
- **Logs**: Application logs are stored in the `/data/logs/` directory

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOGGING_ENABLED` | `true` | Enable or disable logging |
| `LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `LOG_DIR` | `logs` | Directory for log files |
| `NODE_ENV` | `production` | Environment mode |

### Docker Usage

```bash
# Build image
docker build -f docker/Dockerfile -t liquidlogiclabs/markdown-mermaidjs-to-pdf:latest .

# Run batch conversion (processes all .md files in input directory)
docker run --rm \
  -v $(pwd)/data/input:/data/input \
  -v $(pwd)/data/output:/data/output \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Run with custom directories
docker run --rm \
  -v $(pwd)/docs:/data/input \
  -v $(pwd)/pdfs:/data/output \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
./scripts/test.sh
```

This will:
- Build the Docker image if needed
- Convert all sample files to PDF
- Validate the output files
- Generate a test report

## 📖 Documentation

For detailed documentation, see the [docs/](docs/) directory:

- [Complete Documentation](docs/README.md)
- [API Reference](docs/API.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:
1. Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
2. Review the log files
3. Open an issue on GitHub

---

**Built with ❤️ by LiquidLogicLabs** 