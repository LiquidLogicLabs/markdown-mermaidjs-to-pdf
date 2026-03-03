# Development Guide

This document covers local development setup, testing, CI/CD workflows, and the release process.

## Project Structure

```
markdown-mermaidjs-to-pdf/
├── src/root/app/         # Application source code
│   ├── index.js          # CLI entry point and batch orchestration
│   ├── converter.js      # Markdown → HTML → PDF conversion pipeline
│   └── logger.js         # Winston logger configuration
├── docker/               # Docker-related files
│   └── Dockerfile        # Container image definition
├── tests/                # Test files
├── samples/              # Sample markdown files for testing
├── .github/workflows/    # CI, E2E, and release workflows
├── package.json          # Dependencies and npm scripts
└── DEVELOPMENT.md        # This file
```

## Local Development Setup

```bash
# Clone the repository
git clone https://github.com/LiquidLogicLabs/markdown-mermaidjs-to-pdf.git
cd markdown-mermaidjs-to-pdf

# Install dependencies
npm install

# Run linting
npm run lint

# Run tests
npm test

# Start development mode (auto-restart on changes)
npm run dev
```

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Run the converter |
| `npm run dev` | Run with auto-restart (nodemon) |
| `npm test` | Run unit tests (Jest) |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run ci` | Run CI workflow locally via act |
| `npm run test:e2e` | Run E2E workflow locally via act |
| `npm run build:act` | Run release workflow locally via act |
| `npm run run:docker` | Run converter via Docker |

## Testing

- **Unit tests**: `npm test` runs Jest on `tests/unit/`.
- **E2E**: `npm run test:e2e` runs the E2E workflow locally via [act](https://github.com/nektos/act) (installs deps, runs the converter on sample files, verifies PDFs are generated).

## Docker Development

```bash
# Build image locally
docker build -f docker/Dockerfile -t ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:latest .

# Or pull from GHCR
docker pull ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Run with custom log level
docker run --rm \
  -v $(pwd)/data/input:/data/input \
  -v $(pwd)/data/output:/data/output \
  -e LOG_LEVEL=debug \
  ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Run with debug mode enabled
docker run --rm \
  -v $(pwd)/data/input:/data/input \
  -v $(pwd)/data/output:/data/output \
  -e MARKDOWN_MERMAIDJS_TO_PDF_DEBUG=true \
  ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Disable logging
docker run --rm \
  -v $(pwd)/data/input:/data/input \
  -v $(pwd)/data/output:/data/output \
  -e LOGGING_ENABLED=false \
  ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Run via npm script (mounts data/input, data/output, data/logs)
npm run run:docker
```

## Local Development with Act

[Act](https://github.com/nektos/act) allows you to run GitHub Actions locally for testing and development.

### Prerequisites

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

### Configuration

Use **`.act.env`** (vars) and **`.act.secrets`** (secrets) in the repo so `npm run ci`, `npm run test:e2e`, and `npm run build:act` load them when present. Copy from the examples and add to `.gitignore`:

- **`.act.env.example`** → copy to `.act.env` (gitignored). Set `IMAGE_BUILD_MODE=load` and `CREATE_RELEASE=false` for local builds.
- **`.act.secrets.example`** → copy to `.act.secrets` (gitignored). Set `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`, and `GITHUB_TOKEN`.

npm scripts pass `--var-file .act.env` and `--secret-file .act.secrets` to act when those files exist. Alternatively, use a `.actrc` in the repo or home directory:

```bash
--var-file .act.env
--secret-file .act.secrets
```

### Getting Required Tokens

1. **GHCR (default)**: `REGISTRY_USERNAME` = your GitHub username, `REGISTRY_PASSWORD` = a GitHub PAT with `write:packages` scope (or use `GITHUB_TOKEN`).
2. **Docker Hub**: `REGISTRY_USERNAME` = your Docker Hub username, `REGISTRY_PASSWORD` = a Docker Hub access token.
3. **Gitea**: `REGISTRY_USERNAME` = your Gitea username, `REGISTRY_PASSWORD` = a Gitea token with package write scope.

Set `REGISTRY_NAME` to match your registry (e.g. `ghcr.io`, `docker.io`, `gitea.example.com`).

### Running Locally with Act

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

Ensure `.act.env` has `IMAGE_BUILD_MODE=load`, `CREATE_RELEASE=false`, and `PUBLISH_NPM=false` for local release runs, and `.act.secrets` has valid `GITHUB_TOKEN` (and registry credentials if you enable push). The npm scripts run act with `--container-options "--user $(id -u):$(id -g)"` so job containers run as your current user/group (Linux/macOS).

### Testing the release workflow locally

You can run the full release pipeline (test → docker + npm → release) locally with [act](https://github.com/nektos/act) without pushing images or publishing to npm.

**Prerequisites**

- Docker running
- [act](https://github.com/nektos/act) installed
- `.act.env` and `.act.secrets` (copy from the `.example` files; see above)
- In `.act.env`: `IMAGE_BUILD_MODE=load`, `CREATE_RELEASE=false`, `PUBLISH_NPM=false`

**What runs**

- **`npm run build:act`** triggers the release workflow via `workflow_dispatch` with `tag=v<package.json version>`.
- **test** — Reusable test workflow (lint + unit tests).
- **docker** — Builds the image and loads it into your local Docker (no push). Trivy/SBOM run only when the image is pushed, so they are skipped when `IMAGE_BUILD_MODE=load`.
- **npm** — Stamps version, runs `npm pack`, uploads the tarball as an artifact; **does not** publish (skipped when `PUBLISH_NPM=false`).
- **release** — Skipped when using `workflow_dispatch` because `github.ref` is not a tag. To exercise the release job locally you would need to simulate a tag push (e.g. `act push -W .github/workflows/release.yml -e .github/workflows/events/tag-push.json` and a one-off event file with `ref: refs/tags/v1.0.1`); normally you only need to confirm test, docker, and npm succeed.

**Command**

```bash
npm run build:act
```

**Note:** When using `--container-options "--user $(id -u):$(id -g)"` (as the npm scripts do), the **Docker** job may fail at "Set up QEMU" because the container runs as non-root and cannot use Docker-in-Docker. The **test** and **npm** jobs should still pass. On real GitHub Actions the Docker job runs without this restriction. To exercise the Docker build locally, run `docker build -f docker/Dockerfile -t ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:latest .` directly.

For more verbose output, run act directly:

```bash
act workflow_dispatch -W .github/workflows/release.yml \
  --input tag=v$(node -p "require('./package.json').version") \
  --var-file .act.env --secret-file .act.secrets \
  --container-options "--user $(id -u):$(id -g)" -v
```

## Workflows

- **`ci.yml`**: Triggered on push to main/develop and pull_request to main (with path filters). Runs the **test** workflow (lint + unit tests).
- **`test.yml`**: Reusable job: checkout, Node 20, `npm ci`, `npm run lint`, `npm test`.
- **`e2e.yml`**: Reusable: install deps, run converter locally on sample files, verify PDFs. Available via `npm run test:e2e` or `workflow_dispatch`.
- **`release.yml`**: Triggered on tag push `v*.*.*` or `workflow_dispatch`. Four parallel/sequential jobs:
  - **test**: lint + unit tests
  - **docker** (after test): build and push/load Docker image, security scan (Trivy + SBOM)
  - **npm** (after test, parallel with docker): version stamp, pack tarball, publish to npm registry
  - **release** (after docker + npm): changelog, GitHub/Gitea release creation, attach npm tarball

## Docker Build and Publish (vars)

All Docker build and publish behavior is driven by repo variables (set via GitHub/Gitea repo settings or `.act.env`). Defaults work out of the box for GHCR.

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

## npm Package Publishing (vars)

npm publishing is part of the release workflow. Defaults are configured for GitHub Packages.

| Variable | Default | Purpose |
|----------|---------|---------|
| `NPM_REGISTRY_URL` | `https://npm.pkg.github.com` | npm registry URL |
| `NPM_SCOPE` | `@liquidlogiclabs` | npm package scope |
| `PUBLISH_NPM` | `true` | Set to `false` to skip npm pack/publish |

**Secrets:** `NPM_TOKEN` (falls back to `GITHUB_TOKEN` for GitHub Packages).

To publish to **npmjs.com** instead, set:
- `NPM_REGISTRY_URL=https://registry.npmjs.org`
- `NPM_TOKEN` to an npmjs.com access token with publish permissions

## Release Process

Releases are driven by **tags**. Bump the version and push the tag:

```bash
# Patch release (1.0.0 → 1.0.1): runs tests, bumps version, commits, tags, pushes
npm run release:patch

# Minor release
npm run release:minor

# Major release
npm run release:major

# Dry run: run tests only (no version bump)
npm run release:dry-run
```

Pushing a tag `v*` triggers **release.yml** with four jobs:

1. **test** -- lint + unit tests
2. **docker** (parallel with npm) -- build and push to container registry, security scan (Trivy + SBOM)
3. **npm** (parallel with docker) -- version stamp, pack tarball, publish to npm registry
4. **release** (after docker + npm) -- changelog generation, GitHub/Gitea release creation, attach npm tarball

## Troubleshooting Act

- **Docker permission issues**: Ensure your user is in the `docker` group
- **Memory issues**: Increase Docker memory allocation in Docker Desktop
- **Network issues**: Use `--container-daemon-socket` flag if needed
- **Platform issues**: Use `--platform linux/amd64` for consistent behavior
- **GHCR 403 errors**: Ensure `GITHUB_ACTOR` is set to your GitHub username and `GITHUB_TOKEN` has `write:packages` scope
- **Docker Hub 403 errors**: Verify `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are correct
