# Markdown to PDF Converter

A Docker-based application that converts Markdown files with Mermaid diagrams to high-quality PDF documents.

[![Docker Image](https://img.shields.io/badge/docker-liquidlogiclabs%2Fmarkdown--to--pdf-blue)](https://hub.docker.com/r/liquidlogiclabs/markdown-mermaidjs-to-pdf)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![GitHub Repository](https://img.shields.io/badge/github-liquidlogiclabs%2Fmarkdown--mermaidjs--to--pdf-black)](https://github.com/liquidlogiclabs/markdown-mermaidjs-to-pdf)
[![Build Status](https://github.com/liquidlogiclabs/markdown-mermaidjs-to-pdf/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/liquidlogiclabs/markdown-mermaidjs-to-pdf/actions)

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
├── docs/                 # Additional documentation (if needed)
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
| `MARKDOWN_MERMAIDJS_TO_PDF_DEBUG` | `false` | Enable debug overlay showing Mermaid diagram statistics |

### Local Development with Act

[Act](https://github.com/nektos/act) allows you to run GitHub Actions locally for testing and development. This is useful for testing the CI/CD pipeline before pushing changes.

#### Prerequisites

1. Install Act:
   ```bash
   # On macOS
   brew install act
   
   # On Linux
   curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
   
   # On Windows (with Chocolatey)
   choco install act-cli
   ```

2. Install Docker (required for Act)

#### Configuration

Create a `.actrc` file in your home directory (`~/.actrc`) or in your local repo folder with the following variables:

```bash
# Required secrets for Docker Hub authentication
-DOCKERHUB_USERNAME=your_dockerhub_username
-DOCKERHUB_TOKEN=your_dockerhub_token

# Required secrets for GitHub Container Registry
-GITHUB_TOKEN=your_github_token

# Optional: GitHub variables (with defaults)
-DOCKERHUB_OWNER=your_dockerhub_username
-GHCR_OWNER=your_github_username

# Control actual pushing behavior
-PUBLISH_TO_DOCKERHUB=true
-PUBLISH_TO_GHCR=true
```

#### Getting Required Tokens

1. **Docker Hub Token**:
   - Go to [Docker Hub Account Settings](https://hub.docker.com/settings/security)
   - Create a new access token
   - Use your Docker Hub username and the generated token

2. **GitHub Token**:
   - Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
   - Generate a new token with `repo` and `write:packages` scopes
   - Or use `GITHUB_TOKEN` if running in a GitHub Actions environment

#### Push Control Variables

- `PUBLISH_TO_DOCKERHUB`: Set to `false` to prevent pushing to Docker Hub
- `PUBLISH_TO_GHCR`: Set to `false` to prevent pushing to GitHub Container Registry

#### Pipeline Jobs

The CI/CD pipeline consists of the following jobs:

- **`test`**: Runs linting, unit tests, and Docker container tests
  - Installs dependencies and runs `npm ci`
  - Executes linting with `npm run lint`
  - Runs tests with `npm test`
  - Builds Docker image and tests it with sample files
  - Verifies PDF generation works correctly

- **`build-and-push`**: Builds and pushes Docker images to registries
  - Requires the `test` job to pass first
  - Builds multi-platform images (linux/amd64, linux/arm64)
  - Pushes to Docker Hub (if `PUBLISH_TO_DOCKERHUB=true`)
  - Pushes to GitHub Container Registry (if `PUBLISH_TO_GHCR=true`)
  - Publishes README to registries on tag releases
  - Outputs image tags and digests for downstream jobs

- **`security-scan`**: Performs security scanning and generates SBOM
  - Requires the `build-and-push` job to complete
  - Runs Trivy vulnerability scanner on the built image
  - Generates Software Bill of Materials (SBOM) in SPDX format
  - Uploads scan results to GitHub Security tab
  - Uploads SBOM as an artifact

- **`notify`**: Provides pipeline completion notifications
  - Runs after both `build-and-push` and `security-scan` complete
  - Reports success or failure status
  - Displays image tags and digests on success

#### Running the Pipeline Locally

```bash
# Run the entire pipeline
act push

# Run only the test job
act push -j test

# Run only the build job (requires test to pass)
act push -j build-and-push

# Run with specific event
act push -e .github/workflows/ci-cd.yml

# Run with verbose output
act push -v

# Run with specific actor (GitHub username)
act push --actor your-github-username
```

#### Testing Specific Scenarios

```bash
# Test a tag release
act push --env GITHUB_REF=refs/tags/v1.0.0

# Test main branch push
act push --env GITHUB_REF=refs/heads/main

# Test with custom event payload
act push -e .github/workflows/ci-cd.yml --eventpath .github/events/push.json
```

#### Troubleshooting Act

- **Docker permission issues**: Ensure your user is in the `docker` group
- **Memory issues**: Increase Docker memory allocation in Docker Desktop
- **Network issues**: Use `--container-daemon-socket` flag if needed
- **Platform issues**: Use `--platform linux/amd64` for consistent behavior
- **GHCR 403 errors**: Ensure `GITHUB_ACTOR` is set to your GitHub username and `GITHUB_TOKEN` has `write:packages` scope
- **Docker Hub 403 errors**: Verify `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are correct

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

This README contains comprehensive documentation for the project. For additional information:

- **Docker Hub**: [Container Documentation](https://hub.docker.com/r/liquidlogiclabs/markdown-mermaidjs-to-pdf)
- **GitHub**: [Source Code](https://github.com/liquidlogiclabs/markdown-converter)

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
1. Review the log files
2. Check the troubleshooting section in this README
3. Open an issue on GitHub

---

**Built with ❤️ by LiquidLogicLabs** 