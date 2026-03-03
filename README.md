# Markdown to PDF Converter

A Docker-based application that converts Markdown files with Mermaid diagrams to high-quality PDF documents.

[![Docker Image](https://img.shields.io/badge/docker-liquidlogiclabs%2Fmarkdown--to--pdf-blue)](https://hub.docker.com/r/liquidlogiclabs/markdown-mermaidjs-to-pdf)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![GitHub Repository](https://img.shields.io/badge/github-liquidlogiclabs%2Fmarkdown--mermaidjs--to--pdf-black)](https://github.com/liquidlogiclabs/markdown-mermaidjs-to-pdf)
[![Build Status](https://github.com/liquidlogiclabs/markdown-mermaidjs-to-pdf/actions/workflows/ci.yml/badge.svg)](https://github.com/liquidlogiclabs/markdown-mermaidjs-to-pdf/actions)

## 🎯 Purpose

This application converts Markdown files containing Mermaid diagrams into professional PDF documents. It's designed for:
- Technical documentation
- Architecture diagrams
- Process flows
- API documentation
- Any document requiring both text and visual diagrams

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

## 🚀 Quick Start with Docker

### Prerequisites
- Docker installed and running

### Basic Usage

```bash
# Convert all markdown files in ./input to ./output
docker run --rm \
  -v $(pwd)/data/input:/data/input \
  -v $(pwd)/data/output:/data/output \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Convert files from custom directories
docker run --rm \
  -v $(pwd)/docs:/data/input \
  -v $(pwd)/pdfs:/data/output \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Enable verbose logging
docker run --rm \
  -v $(pwd)/data/input:/data/input \
  -v $(pwd)/data/output:/data/output \
  -e LOG_LEVEL=debug \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest
```

## 📁 Directory Structure

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

## Development

### Docker Usage Examples

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
```

## 🧪 Testing

All commands run via npm scripts:

```bash
# Unit tests and lint
npm test
npm run lint

# E2E (Docker build + run + PDF verification) — use act locally
npm run test:e2e
```

- **Unit tests**: `npm test` runs Jest in `tests/unit/`.
- **E2E**: `npm run test:e2e` runs the E2E workflow locally via [act](https://github.com/nektos/act) (builds the image, runs the container, verifies PDFs). On CI, the same workflow runs on push/PR.

## 📖 Documentation

This README contains comprehensive documentation for the project. For additional information:

- **Docker Hub**: [Container Documentation](https://hub.docker.com/r/liquidlogiclabs/markdown-mermaidjs-to-pdf)
- **GitHub**: [Source Code](https://github.com/liquidlogiclabs/markdown-converter)

## 🏗️ Architecture

The application uses a modular architecture:

1. **CLI Interface** - Command-line argument parsing
2. **Markdown Parser** - Converts markdown to HTML using `marked`
3. **Mermaid Renderer** - Renders diagrams to SVG using `mermaid.js`
4. **PDF Generator** - Converts HTML to PDF using Puppeteer
5. **Logging System** - Comprehensive logging using Winston

## 📁 Project Structure

```
markdown-mermaidjs-to-pdf/
├── src/root/app/         # Application source code
├── docker/               # Docker-related files
├── tests/                # Test files
├── .github/workflows/    # CI, E2E, and release workflows
├── docs/                 # Additional documentation (if needed)
├── samples/              # Sample markdown files for testing
└── package.json          # Node.js dependencies
```

## 🛠️ Development

### Local Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd markdown-mermaidjs-to-pdf

# Install dependencies
npm install

# Run linting
npm run lint

# Run tests
npm test

# Start development mode
npm run dev
```

### npm Scripts (all commands via npm)

```bash
# Lint and unit tests
npm run lint
npm test

# Run CI workflow locally (act)
npm run ci

# Run E2E workflow locally (act: build image, run container, verify PDFs)
npm run test:e2e

# Run converter via Docker (ensure data/input, data/output, data/logs exist)
npm run run:docker
```

Docker image build and push happen in the E2E and release workflows only; for a one-off local run use `docker build -f docker/Dockerfile -t liquidlogiclabs/markdown-mermaidjs-to-pdf:latest .` then `npm run run:docker` or the `docker run` examples above.

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

Use **`.act.env`** (vars) and **`.act.secrets`** (secrets) in the repo so `npm run ci`, `npm run test:e2e`, and `npm run build:act` load them when present. Copy from the examples and add to `.gitignore`:

- **`.act.env.example`** → copy to `.act.env` (gitignored). Set `IMAGE_BUILD_MODE=load` and `CREATE_RELEASE=false` for local builds.
- **`.act.secrets.example`** → copy to `.act.secrets` (gitignored). Set `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`, and `GITHUB_TOKEN`.

npm scripts pass `--var-file .act.env` and `--secret-file .act.secrets` to act when those files exist. Alternatively, use a `.actrc` in the repo or home directory:

```bash
# Optional: use repo .act.env / .act.secrets (npm scripts add these when files exist)
--var-file .act.env
--secret-file .act.secrets
```

#### Getting Required Tokens

1. **GHCR (default)**: `REGISTRY_USERNAME` = your GitHub username, `REGISTRY_PASSWORD` = a GitHub PAT with `write:packages` scope (or use `GITHUB_TOKEN`).
2. **Docker Hub**: `REGISTRY_USERNAME` = your Docker Hub username, `REGISTRY_PASSWORD` = a Docker Hub access token.
3. **Gitea**: `REGISTRY_USERNAME` = your Gitea username, `REGISTRY_PASSWORD` = a Gitea token with package write scope.

Set `REGISTRY_NAME` to match your registry (e.g. `ghcr.io`, `docker.io`, `gitea.example.com`).

#### Workflows

- **`ci.yml`**: Triggered on push to main/develop and pull_request to main (with path filters). Runs the **test** workflow (lint + unit tests).
- **`test.yml`**: Reusable job: checkout, Node 20, `npm ci`, `npm run lint`, `npm test`.
- **`e2e.yml`**: Reusable: install deps, run converter locally on sample files, verify PDFs. Available via `npm run test:e2e` or `workflow_dispatch`.
- **`release.yml`**: Triggered on tag push `v*.*.*` or `workflow_dispatch`. Single job: test, build and push/load Docker image, security scan (Trivy + SBOM), changelog, and GitHub/Gitea release.

#### Docker build and publish (vars)

All Docker build and publish behavior is driven by repo variables (set via GitHub/Gitea repo settings or `.actrc`). Defaults work out of the box for GHCR.

| Variable | Default | Purpose |
|----------|---------|---------|
| `REGISTRY_NAME` | `ghcr.io` | Container registry host |
| `REGISTRY_ORG` | `liquidlogiclabs` | Registry owner/org/namespace |
| `IMAGE_NAME` | `markdown-mermaidjs-to-pdf` | Docker image name |
| `IMAGE_BUILD_MODE` | (empty = push) | Set to `load` to build locally without pushing |
| `DOCKER_PLATFORMS` | `linux/amd64,linux/arm64` | Target platforms for multi-arch build |
| `DOCKER_FILE` | `docker/Dockerfile` | Path to Dockerfile |
| `CREATE_RELEASE` | `true` | Set to `false` to skip GitHub/Gitea release creation |
| `DEBUG` | `false` | Set to `true` for verbose workflow logs |

**Secrets:** `REGISTRY_USERNAME` and `REGISTRY_PASSWORD` (generic, works with any registry). Falls back to `github.actor` / `GITHUB_TOKEN` for GHCR.

#### Running Locally with Act

```bash
# Run CI workflow (lint + unit tests)
npm run ci

# Run E2E workflow (run converter locally, verify PDFs)
npm run test:e2e

# Run release workflow locally (test → build image with load, no push; uses tag from package.json)
npm run build:act

# Verbose
act push -W .github/workflows/ci.yml -v
```

Ensure `.act.env` has `IMAGE_BUILD_MODE=load` and `CREATE_RELEASE=false` for local release runs, and `.act.secrets` has valid `GITHUB_TOKEN` (and registry credentials if you enable push). The npm scripts run act with `--container-options "--user $(id -u):$(id -g)"` so job containers run as your current user/group (Linux/macOS).

#### Release Process

Releases are driven by **tags**. Locally: bump version and push the tag (no custom release script):

```bash
# Patch release (1.0.0 → 1.0.1): runs tests, bumps version, commits, tags, pushes
npm run release:patch

# Minor: npm run release:minor
# Major: npm run release:major

# Dry run: run tests only (no version bump)
npm run release:dry-run
```

Pushing a tag `v*` triggers **release.yml**: test → e2e → build-and-push → security-scan → changelog → GitHub/Gitea release.

#### Troubleshooting Act

- **Docker permission issues**: Ensure your user is in the `docker` group
- **Memory issues**: Increase Docker memory allocation in Docker Desktop
- **Network issues**: Use `--container-daemon-socket` flag if needed
- **Platform issues**: Use `--platform linux/amd64` for consistent behavior
- **GHCR 403 errors**: Ensure `GITHUB_ACTOR` is set to your GitHub username and `GITHUB_TOKEN` has `write:packages` scope
- **Docker Hub 403 errors**: Verify `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are correct

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