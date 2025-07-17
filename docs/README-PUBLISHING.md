# README Publishing Guide

This document explains how the README publishing feature works in the CI/CD pipeline, automatically publishing your README.md content to both Docker Hub and GitHub Container Registry.

## Overview

When you create a release (tag), the CI/CD pipeline automatically:

1. **Builds and pushes** Docker images to both registries
2. **Publishes README content** to both registries
3. **Updates metadata** with proper documentation links

## How It Works

### Automatic Publishing

The README publishing happens automatically during releases:

```bash
# When you run a release
npm run release:patch

# The pipeline will:
# 1. Build and push images
# 2. Publish README to Docker Hub
# 3. Publish README to GitHub Container Registry
```

### Manual Publishing

You can also publish README content manually:

```bash
# Publish README to both registries
npm run publish-readme

# Or run the script directly
node scripts/publish-readme.js
```

## Registry-Specific Behavior

### Docker Hub

- **Full README content** is published as the repository description
- **Markdown formatting** is preserved and rendered
- **Images, links, and tables** are supported
- **No character limits** for the full description

### GitHub Container Registry (GHCR)

- **Truncated description** (first 1000 characters) due to API limits
- **Basic text formatting** only
- **Links to full documentation** are included
- **Repository README** is automatically linked

## Configuration

### Environment Variables

The script uses these environment variables:

```bash
# Docker Hub (required for Docker Hub publishing)
DOCKERHUB_USERNAME=your-username
DOCKERHUB_TOKEN=your-access-token

# GitHub (automatically provided in GitHub Actions)
GITHUB_TOKEN=github-token
GITHUB_REPOSITORY_OWNER=repository-owner
```

### Image Names

The script publishes to these image names:

```bash
# Docker Hub
docker.io/liquidlogiclabs/markdown-mermaidjs-to-pdf

# GitHub Container Registry
ghcr.io/liquidlogiclabs/markdown-mermaidjs-to-pdf
```

## README Content Requirements

### Recommended Structure

Your `README.md` should include:

```markdown
# Markdown to PDF with MermaidJS

Brief description of what the tool does.

## Quick Start

```bash
docker run -v $(pwd):/data liquidlogiclabs/markdown-mermaidjs-to-pdf
```

## Features

- Feature 1
- Feature 2
- Feature 3

## Usage

Detailed usage instructions...

## Examples

Code examples and sample outputs...

## Configuration

Environment variables and options...

## Contributing

How to contribute to the project...

## License

MIT License
```

### Best Practices

1. **Clear title** and description
2. **Quick start** section with Docker command
3. **Usage examples** with real commands
4. **Configuration options** clearly documented
5. **Links to full documentation** for complex topics
6. **Screenshots or examples** of output
7. **License information**

## Troubleshooting

### Common Issues

1. **Docker Hub authentication failed**
   ```bash
   # Check your Docker Hub credentials
   echo $DOCKERHUB_USERNAME
   echo $DOCKERHUB_TOKEN
   ```

2. **GitHub Container Registry access denied**
   ```bash
   # Ensure GITHUB_TOKEN has write permissions
   # Check repository permissions
   ```

3. **README not updating**
   ```bash
   # Verify README.md exists and is readable
   ls -la README.md
   cat README.md | head -10
   ```

### Debugging

1. **Check script output**:
   ```bash
   npm run publish-readme
   ```

2. **Verify registry content**:
   - Docker Hub: Visit your repository page
   - GHCR: Check package description

3. **Check API responses**:
   - Look for error messages in the script output
   - Verify API endpoints are accessible

## Integration with CI/CD

### Workflow Integration

The README publishing is integrated into the main CI/CD workflow:

```yaml
- name: Publish README to Registries
  if: startsWith(github.ref, 'refs/tags/')
  env:
    DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
    DOCKERHUB_TOKEN: ${{ secrets.DOCKERHUB_TOKEN }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_REPOSITORY_OWNER: ${{ github.repository_owner }}
  run: |
    node scripts/publish-readme.js
```

### When It Runs

- ✅ **On tag releases** (v1.0.0, v1.1.0, etc.)
- ❌ **Not on main branch pushes** (only builds images)
- ❌ **Not on pull requests** (only runs tests)

### Dependencies

The README publishing step depends on:
- Successful image builds
- Valid README.md file
- Proper authentication tokens
- Network connectivity to registries

## Customization

### Modifying the Script

You can customize the `scripts/publish-readme.js` script:

1. **Change image names**:
   ```javascript
   this.imageName = 'your-custom-image-name';
   ```

2. **Modify content processing**:
   ```javascript
   // Add custom formatting or filtering
   const processedContent = this.processReadme(readmeContent);
   ```

3. **Add more registries**:
   ```javascript
   await this.publishToCustomRegistry(readmeContent);
   ```

### Alternative Methods

If the script doesn't work for your needs:

1. **Use Docker Hub web interface** to manually update descriptions
2. **Use GitHub API** directly for GHCR updates
3. **Use third-party actions** for specific registry features

## Security Considerations

- **Tokens are stored** as GitHub secrets
- **No sensitive data** is logged
- **API requests** use proper authentication
- **Error handling** prevents token exposure

## Monitoring

### Success Indicators

- ✅ "README published to Docker Hub successfully"
- ✅ "README published to GitHub Container Registry successfully"
- ✅ "README publishing completed!"

### Failure Indicators

- ❌ "Error publishing to Docker Hub"
- ❌ "Error publishing to GitHub Container Registry"
- ❌ "Error reading README.md"

### Logs

Check GitHub Actions logs for:
- README content length
- API response status codes
- Error messages and stack traces

## Best Practices

1. **Keep README updated** with each release
2. **Test locally** before releasing
3. **Monitor publishing** in CI/CD logs
4. **Verify content** on registry websites
5. **Include examples** in README
6. **Link to documentation** for complex topics
7. **Use clear formatting** for better readability

## Support

For issues with README publishing:

1. Check this documentation
2. Review the script source code
3. Check GitHub Actions logs
4. Verify registry permissions
5. Test manually with `npm run publish-readme` 