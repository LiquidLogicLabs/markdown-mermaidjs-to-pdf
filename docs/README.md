# Markdown to PDF Converter

A Docker-based application that converts Markdown files with Mermaid diagrams to high-quality PDF documents.

## Features

- **Full Markdown Support**: Complete Markdown syntax including headers, lists, tables, code blocks, and more
- **Mermaid Diagram Rendering**: Supports all Mermaid diagram types (flowcharts, sequence diagrams, class diagrams, etc.)
- **High-Quality PDF Output**: Professional PDF generation with clean typography and styling
- **Docker Containerization**: Easy deployment and consistent environment
- **Comprehensive Logging**: Detailed logging with configurable levels
- **Environment Configuration**: Flexible configuration through environment variables
- **Error Handling**: Robust error handling with graceful fallbacks

## Supported Mermaid Diagram Types

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

## Quick Start

### Prerequisites

- Docker installed and running
- Git (for cloning the repository)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd markdown-converter
```

2. Build the Docker image:
```bash
./scripts/build.sh
```

3. Test the installation:
```bash
./scripts/test.sh
```

### Basic Usage

Convert a markdown file to PDF:
```bash
./scripts/run.sh document.md
```

Convert with custom output filename:
```bash
./scripts/run.sh document.md output.pdf
```

Enable verbose logging:
```bash
./scripts/run.sh -v document.md
```

## Command Line Interface

The application provides a command-line interface with the following options:

```bash
node src/root/app/index.js [OPTIONS]

Options:
  -i, --input <file>     Input markdown file path
  -o, --output <file>    Output PDF file path
  -v, --verbose         Enable verbose logging
  --no-logging          Disable logging
  -h, --help            Show help
  --version             Show version
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOGGING_ENABLED` | `true` | Enable or disable logging |
| `LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `LOG_DIR` | `logs` | Directory for log files |
| `NODE_ENV` | `production` | Environment mode |

## Docker Usage

### Building the Image

```bash
docker build -f docker/Dockerfile -t liquidlogiclabs/markdown-mermaidjs-to-pdf:latest .
```

### Running with Docker

```bash
# Basic usage
docker run --rm -v $(pwd):/workspace liquidlogiclabs/markdown-mermaidjs-to-pdf:latest \
  node src/root/app/index.js -i /workspace/document.md -o /workspace/output.pdf

# With custom environment variables
docker run --rm \
  -v $(pwd):/workspace \
  -e LOG_LEVEL=debug \
  -e LOGGING_ENABLED=true \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest \
  node src/root/app/index.js -i /workspace/document.md -o /workspace/output.pdf
```

### Using Docker Compose

```bash
# Start the service
cd docker
docker-compose up

# Run a conversion
docker-compose run --rm markdown-converter \
  node src/root/app/index.js -i /workspace/document.md -o /workspace/output.pdf
```

## Sample Files

The `tests/samples/` directory contains example markdown files demonstrating various features:

- `sample1.md`: Basic markdown with a simple flowchart
- `sample2.md`: Complex document with multiple diagram types

## Testing

Run the test suite to verify functionality:

```bash
./scripts/test.sh
```

This will:
1. Build the Docker image if not present
2. Convert all sample files to PDF
3. Validate the output files
4. Generate a test report

## Project Structure

```
markdown-converter/
├── src/root/app/          # Application source code
│   ├── index.js          # Main entry point
│   ├── converter.js      # Core conversion logic
│   └── logger.js         # Logging configuration
├── docker/               # Docker-related files
│   ├── Dockerfile        # Docker image definition
│   └── docker-compose.yml # Docker Compose configuration
├── tests/                # Test files
│   ├── samples/          # Sample markdown files
│   ├── output/           # Generated PDF files
│   └── logs/             # Test logs
├── scripts/              # Utility scripts
│   ├── build.sh          # Build script
│   ├── test.sh           # Test script
│   └── run.sh            # Run script
├── docs/                 # Documentation
└── package.json          # Node.js dependencies
```

## Technical Details

### Architecture

The application uses a modular architecture with the following components:

1. **CLI Interface**: Command-line argument parsing and user interaction
2. **Markdown Parser**: Converts markdown to HTML using the `marked` library
3. **Mermaid Renderer**: Renders Mermaid diagrams to SVG using `mermaid.js`
4. **PDF Generator**: Converts HTML to PDF using Puppeteer
5. **Logging System**: Comprehensive logging using Winston

### Dependencies

- **Node.js 18+**: Runtime environment
- **Puppeteer**: PDF generation from HTML
- **Mermaid.js**: Diagram rendering
- **Marked**: Markdown to HTML conversion
- **Winston**: Logging framework
- **Commander**: CLI argument parsing

### Security Considerations

- Runs as non-root user in Docker container
- Uses Alpine Linux for smaller attack surface
- Implements proper resource cleanup
- Validates input file paths

## Troubleshooting

### Common Issues

1. **Docker not running**: Ensure Docker is installed and running
2. **Permission errors**: Make sure scripts are executable (`chmod +x scripts/*.sh`)
3. **Memory issues**: Large documents may require more memory allocation
4. **Font rendering**: Uses system fonts for consistent rendering

### Debug Mode

Enable debug logging for troubleshooting:

```bash
./scripts/run.sh -v document.md
```

### Log Files

Log files are stored in the `logs/` directory and contain detailed information about the conversion process.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the log files
3. Open an issue on GitHub 