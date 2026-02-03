# Docker Testing Guide

This guide explains how to build and test the Docker image for the markdown-mermaidjs-to-pdf converter.

## Prerequisites

- Docker Engine 20.10+ or compatible container runtime
- Docker Compose (optional, for orchestration)
- At least 2GB free disk space for the image
- 4GB available RAM for running containers

## Building the Docker Image

### Using Docker CLI

```bash
# Build the image locally
docker build -f docker/Dockerfile -t liquidlogiclabs/markdown-mermaidjs-to-pdf:latest .

# Build with a specific tag
docker build -f docker/Dockerfile -t liquidlogiclabs/markdown-mermaidjs-to-pdf:v1.0.0 .

# Build with build arguments (if needed)
docker build -f docker/Dockerfile \
  --build-arg NODE_VERSION=20 \
  -t liquidlogiclabs/markdown-mermaidjs-to-pdf:latest .
```

### Image Specifications

- **Base Image**: node:20-alpine (lightweight, ~150MB)
- **Final Image Size**: ~900MB (includes Chromium and dependencies)
- **Security**: Runs as non-root user (nodejs:1001)
- **Health Check**: Enabled with 30s intervals

## Testing in Docker

### Running Tests Inside Container

```bash
# Run the complete test suite inside the container
docker run --rm \
  -v $(pwd)/test-output:/test-output \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest \
  bash -c "npm ci && npm run lint && npm test"

# Run just the tests
docker run --rm \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest \
  npm test

# Run with verbose output
docker run --rm -e LOG_LEVEL=debug \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest \
  npm test
```

### Running Converter Tests

```bash
# Test batch conversion inside container
docker run --rm \
  -v $(pwd)/samples:/data/input \
  -v $(pwd)/test-output:/data/output \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Test with debug output
docker run --rm \
  -v $(pwd)/samples:/data/input \
  -v $(pwd)/test-output:/data/output \
  -e LOG_LEVEL=debug \
  -e MARKDOWN_MERMAIDJS_TO_PDF_DEBUG=true \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Test with custom PDF options
docker run --rm \
  -v $(pwd)/samples:/data/input \
  -v $(pwd)/test-output:/data/output \
  -e PDF_FORMAT=Letter \
  -e PDF_MARGIN_TOP=0.5in \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest
```

### Using Docker Compose

Create a `docker-compose.test.yml`:

```yaml
version: '3.8'

services:
  converter:
    build:
      context: .
      dockerfile: docker/Dockerfile
    environment:
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - LOGGING_ENABLED=true
    volumes:
      - ./samples:/data/input
      - ./test-output:/data/output
      - ./logs:/data/logs
    command: node src/root/app/index.js
```

Run with:
```bash
docker-compose -f docker-compose.test.yml up
```

## Test Checklist

When testing a newly built Docker image, verify:

- [ ] **Build Succeeds**: Image builds without errors
- [ ] **Base Image**: Alpine Linux with Node.js 20
- [ ] **Dependencies**: npm dependencies installed
- [ ] **Chromium**: Puppeteer dependencies present
- [ ] **Size**: Final image is ~900MB
- [ ] **Security**: Non-root user (uid 1001)
- [ ] **Linting**: ESLint passes in container
- [ ] **Unit Tests**: All 20 tests pass
- [ ] **Batch Conversion**: Successfully converts sample files to PDF
- [ ] **File Output**: PDF files generated correctly
- [ ] **Logging**: Logs are created and accessible
- [ ] **Health Check**: Container health check passes
- [ ] **Environment Variables**: All options work correctly
- [ ] **Resource Cleanup**: Browser resources cleaned up properly

## CI/CD Integration

The GitHub Actions workflows automatically:
1. Build the Docker image
2. Run tests inside the container
3. Scan for vulnerabilities with Trivy
4. Push to Docker Hub and GHCR
5. Generate SBOM

See `.github/workflows/ci-cd.yml` for details.

## Troubleshooting

### Docker Build Issues

**"Cannot connect to Docker daemon"**
```bash
# Ensure Docker daemon is running
docker ps

# Restart Docker
systemctl restart docker  # Linux
# or Docker Desktop GUI on macOS/Windows
```

**"permission denied"**
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker
```

**"Out of memory"**
- Increase Docker memory limit
- Check `docker stats` during build
- Clean up unused images: `docker image prune -a`

### Container Runtime Issues

**"chromium: not found"**
- Dockerfile dependency installation failed
- Try rebuilding with `--no-cache`: `docker build --no-cache ...`

**"PDF generation fails in container"**
- Check available disk space in container
- Verify `/tmp` has write permissions
- Increase memory limit

### Test Failures

**"jest: command not found"**
```bash
# Install dev dependencies
npm ci  # or npm install in container
```

**"Port already in use"**
- Check for existing containers: `docker ps`
- Use different port: `-p 8081:8080`

## Performance Testing

To profile container performance:

```bash
# Run with resource limits
docker run --rm \
  --memory=1g \
  --cpus=1 \
  -v $(pwd)/samples:/data/input \
  -v $(pwd)/test-output:/data/output \
  -e LOG_LEVEL=debug \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Monitor resource usage
docker stats liquidlogiclabs/markdown-mermaidjs-to-pdf:latest
```

## Security Scanning

```bash
# Scan image with Trivy
trivy image liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Generate SBOM
trivy image --format spdx liquidlogiclabs/markdown-mermaidjs-to-pdf:latest > sbom.json

# Check for high-severity vulnerabilities
trivy image --severity HIGH,CRITICAL liquidlogiclabs/markdown-mermaidjs-to-pdf:latest
```

## Local Development Docker Workflow

```bash
# 1. Build image locally
docker build -f docker/Dockerfile -t markdown-mermaidjs-to-pdf:dev .

# 2. Run tests
docker run --rm markdown-mermaidjs-to-pdf:dev npm test

# 3. Test conversion
docker run --rm \
  -v $(pwd)/samples:/data/input \
  -v $(pwd)/test-output:/data/output \
  markdown-mermaidjs-to-pdf:dev

# 4. Shell into container for debugging
docker run --rm -it \
  -v $(pwd):/workspace \
  markdown-mermaidjs-to-pdf:dev \
  /bin/sh

# 5. View image layers
docker history markdown-mermaidjs-to-pdf:dev
```

## See Also

- [Dockerfile](../docker/Dockerfile)
- [Main README](../README.md)
- [Docker Official Documentation](https://docs.docker.com/)
- [Alpine Linux Documentation](https://alpinelinux.org/docs/)
