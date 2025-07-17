# CI/CD Pipeline Setup Guide

This document explains how to set up the GitHub Actions CI/CD pipeline for building, testing, and publishing the Docker image to both Docker Hub and GitHub Container Registry (GHCR).

## Overview

The CI/CD pipeline includes:
- **Testing**: Linting, unit tests, and Docker container tests
- **Building**: Multi-platform Docker image builds (AMD64 and ARM64)
- **Publishing**: Automatic publishing to Docker Hub and GHCR
- **Security**: Vulnerability scanning with Trivy
- **Versioning**: Semantic versioning with proper tagging

## Required GitHub Secrets

You need to configure the following secrets in your GitHub repository:

### 1. Docker Hub Secrets (Optional)

**Note**: These secrets are only required if you enable Docker Hub publishing by setting `PUBLISH_TO_DOCKERHUB=true`.

Go to [Docker Hub](https://hub.docker.com/) and create an access token:

1. Log in to Docker Hub
2. Go to Account Settings → Security
3. Create a new access token
4. Copy the token

Then add these secrets to your GitHub repository:

- **`DOCKERHUB_USERNAME`**: Your Docker Hub username
- **`DOCKERHUB_TOKEN`**: Your Docker Hub access token

### 2. GitHub Container Registry (GHCR)

GitHub Container Registry is automatically available for GitHub repositories. No additional setup is required as it uses the built-in `GITHUB_TOKEN`.

**Note**: The `GITHUB_TOKEN` is automatically provided by GitHub Actions and has the necessary permissions to push to GHCR.

### 3. Publishing Configuration

#### Docker Hub Publishing (Optional)

By default, Docker Hub publishing is **disabled**. To enable it:

1. Go to your GitHub repository
2. Click on "Settings" → "Secrets and variables" → "Actions"
3. Click on the "Variables" tab
4. Click "New repository variable"
5. Set:
   - **Name**: `PUBLISH_TO_DOCKERHUB`
   - **Value**: `true`
6. Click "Add variable"

**Note**: When `PUBLISH_TO_DOCKERHUB` is set to `true`, you must also configure the Docker Hub secrets (`DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`).

#### Registry Owners (Optional)

You can configure different owners for different registries:

1. Go to your GitHub repository
2. Click on "Settings" → "Secrets and variables" → "Actions"
3. Click on the "Variables" tab
4. Click "New repository variable" for each setting:

**Docker Hub Owner**:
- **Name**: `DOCKERHUB_OWNER`
- **Value**: `your-dockerhub-username` (default: `ravensorb`)

**GitHub Container Registry Owner**:
- **Name**: `GHCR_OWNER`
- **Value**: `your-github-org` (default: `liquidlogiclabs`)

## Setting Up GitHub Secrets

1. Go to your GitHub repository
2. Click on "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret" for each secret above
4. Add the secret name and value

## Versioning Strategy

The pipeline uses a consistent tagging strategy with the following rules:

### For All Builds
- **Version tag**: Always includes the version from `package.json` (e.g., `1.0.0`)
- **SHA tag**: Always includes the short git commit SHA (e.g., `a1b2c3d`)

### For Releases (Tags)
- **Version tag**: `1.0.0` (from the git tag)
- **SHA tag**: `a1b2c3d` (commit SHA)
- **Latest tag**: `latest` (only for actual releases)

### For Main Branch
- **Version tag**: `1.0.0` (from package.json)
- **SHA tag**: `a1b2c3d` (commit SHA)
- **No latest tag** (only releases get latest)

### Examples
- Release `v1.0.0`: `1.0.0`, `a1b2c3d`, `latest`
- Main branch: `1.0.0`, `a1b2c3d`

## Workflow Triggers

The pipeline runs on:
- **Push to main/develop branches**: Builds and publishes
- **Push with tags (v*)**: Creates releases
- **Pull requests**: Runs tests only

## Image Names

The images will be published with consistent tagging:

### For Releases (e.g., v1.0.0)
```
docker.io/ravensorb/markdown-mermaidjs-to-pdf:1.0.0
docker.io/ravensorb/markdown-mermaidjs-to-pdf:a1b2c3d
docker.io/ravensorb/markdown-mermaidjs-to-pdf:latest

ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:1.0.0
ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:a1b2c3d
ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:latest
```

### For Main Branch
```
docker.io/ravensorb/markdown-mermaidjs-to-pdf:1.0.0
docker.io/ravensorb/markdown-mermaidjs-to-pdf:a1b2c3d

ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:1.0.0
ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf:a1b2c3d
```

**Note**: The image names and owners are configurable via environment variables:
- `IMAGE_NAME`: Full image name (e.g., `liquidlogiclabs/markdown-mermaidjs-to-pdf`)
- `IMAGE_NAME_SHORT`: Short image name (e.g., `markdown-mermaidjs-to-pdf`)
- `DOCKERHUB_OWNER`: Docker Hub organization/username (default: `ravensorb`)
- `GHCR_OWNER`: GitHub Container Registry organization (default: `liquidlogiclabs`)

## Pipeline Jobs

### 1. Test Job
- Runs on every push and PR
- Installs dependencies
- Runs linting and unit tests
- Builds Docker image for testing
- Runs container tests with sample markdown files

### 2. Build and Push Job
- Runs only on main branch pushes and tags
- Requires test job to pass
- Builds multi-platform images
- Pushes to both Docker Hub and GHCR
- Generates SBOM (Software Bill of Materials)

### 3. Security Scan Job
- Runs vulnerability scanning with Trivy
- Uploads results to GitHub Security tab
- Only runs on main branch and tags

### 4. Notify Job
- Provides build status notifications
- Shows image tags and digests

## Creating a Release

To create a new release:

1. **Update version in package.json**:
   ```json
   {
     "version": "1.0.0"
   }
   ```

2. **Create and push a tag**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **The pipeline will automatically**:
   - Run all tests
   - Build the Docker image
   - Push to both registries with proper tags
   - Run security scans
   - Create a GitHub release (if you have release automation enabled)

## Testing the Pipeline

### Local Testing
Before pushing to GitHub, test locally:

```bash
# Run the test script
./scripts/test.sh

# Build the image
./scripts/build.sh
```

### Manual Trigger
You can manually trigger the workflow:
1. Go to Actions tab in GitHub
2. Select "CI/CD Pipeline"
3. Click "Run workflow"
4. Choose branch and click "Run workflow"

## Troubleshooting

### Common Issues

1. **Docker Hub authentication failed**:
   - Verify `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are correct
   - Ensure the token has write permissions

2. **GHCR authentication failed**:
   - Verify `GITHUB_TOKEN` has write permissions
   - Check repository permissions
   - Ensure workflow has proper access

3. **Build fails**:
   - Check Dockerfile syntax
   - Verify all dependencies are available
   - Check for platform-specific issues

4. **Tests fail**:
   - Run tests locally first
   - Check for missing test dependencies
   - Verify test data files exist

### Debugging

1. **View workflow logs**: Go to Actions tab and click on the workflow run
2. **Check individual job logs**: Click on the job name to see detailed logs
3. **Download artifacts**: SBOM files are available as artifacts
4. **Security scan results**: Check the Security tab for vulnerability reports

## Best Practices

1. **Always test locally** before pushing
2. **Use semantic versioning** for releases
3. **Review security scan results** regularly
4. **Keep dependencies updated**
5. **Monitor build times** and optimize if needed
6. **Use feature branches** for development
7. **Tag releases** for production deployments

## Security Considerations

- Service account keys are stored as GitHub secrets
- Images are scanned for vulnerabilities
- Non-root user is used in the container
- SBOM is generated for supply chain security
- Secrets are never logged or exposed

## Cost Optimization

- Use GitHub Actions cache for faster builds
- Consider using self-hosted runners for large builds
- Monitor GHCR storage costs
- Clean up old images periodically 