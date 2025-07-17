# Release Process Guide

This document explains how to use the automated release scripts to increment version numbers and create releases for the markdown-to-pdf converter.

## Overview

The release system provides two scripts:
- **Node.js version** (`scripts/release.js`) - More feature-rich with pre-release support
- **Bash version** (`scripts/release.sh`) - Simpler, basic semantic versioning

Both scripts automatically:
- Increment version numbers in `package.json`
- Update Dockerfile labels
- Run tests before release
- Create git commits and tags
- Push changes to trigger CI/CD pipeline

## Quick Start

### Using npm scripts (Recommended)

```bash
# Patch release (bug fixes)
npm run release:patch

# Minor release (new features)
npm run release:minor

# Major release (breaking changes)
npm run release:major

# Dry run to see what would happen
npm run release:dry-run
```

### Using the Node.js script directly

```bash
# Basic usage
node scripts/release.js patch
node scripts/release.js minor
node scripts/release.js major

# With options
node scripts/release.js patch --dry-run
node scripts/release.js minor --skip-tests
node scripts/release.js major --force
```

### Using the Bash script

```bash
# Basic usage
./scripts/release.sh patch
./scripts/release.sh minor
./scripts/release.sh major

# With options
./scripts/release.sh patch --dry-run
./scripts/release.sh minor --skip-tests
./scripts/release.sh major --force
```

## Release Types

### Semantic Versioning

The project follows [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
  - **MAJOR**: Breaking changes (incompatible API changes)
  - **MINOR**: New features (backward compatible)
  - **PATCH**: Bug fixes (backward compatible)

### Version Increment Examples

| Current Version | Release Type | New Version | Description |
|----------------|--------------|-------------|-------------|
| 1.0.0 | patch | 1.0.1 | Bug fix release |
| 1.0.0 | minor | 1.1.0 | New feature release |
| 1.0.0 | major | 2.0.0 | Breaking change release |
| 1.0.0 | prerelease | 1.0.1-0 | Pre-release for patch |
| 1.0.0 | preminor | 1.1.0-0 | Pre-release for minor |
| 1.0.0 | premajor | 2.0.0-0 | Pre-release for major |

## Script Options

### Common Options

- `--dry-run` or `-d`: Show what would be done without making changes
- `--skip-tests` or `-s`: Skip running tests before release
- `--force` or `-f`: Force release even if tests fail or working directory is dirty

### Node.js Script Only

The Node.js script supports additional pre-release types:
- `prerelease`: Increment pre-release number
- `premajor`: Pre-release for major version
- `preminor`: Pre-release for minor version
- `prepatch`: Pre-release for patch version

## Release Process Steps

### 1. Pre-Release Checklist

Before running a release, ensure:

- [ ] All changes are committed to git
- [ ] Tests pass locally (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Working directory is clean
- [ ] You're on the main branch

### 2. Running the Release

```bash
# For a patch release (most common)
npm run release:patch

# For a minor release (new features)
npm run release:minor

# For a major release (breaking changes)
npm run release:major
```

### 3. What Happens During Release

1. **Version Check**: Reads current version from `package.json`
2. **Working Directory Check**: Ensures no uncommitted changes
3. **Tests**: Runs the test suite
4. **Version Update**: Increments version in `package.json`
5. **Dockerfile Update**: Updates version label in Dockerfile
6. **Git Commit**: Commits version changes
7. **Git Tag**: Creates version tag (e.g., `v1.0.1`)
8. **Push**: Pushes changes and tags to remote
9. **CI/CD Trigger**: GitHub Actions automatically builds and publishes

### 4. Post-Release Steps

After the release script completes:

1. **Monitor CI/CD**: Check GitHub Actions for build status
2. **Verify Images**: Confirm Docker images are published
3. **Create Release**: Add release notes on GitHub
4. **Update Documentation**: If needed

## Release Workflow Examples

### Bug Fix Release

```bash
# 1. Fix the bug and commit
git add .
git commit -m "fix: resolve PDF generation issue"

# 2. Create patch release
npm run release:patch

# 3. Monitor CI/CD pipeline
# 4. Create GitHub release with notes
```

### Feature Release

```bash
# 1. Add new feature and commit
git add .
git commit -m "feat: add support for custom CSS"

# 2. Create minor release
npm run release:minor

# 3. Monitor CI/CD pipeline
# 4. Create GitHub release with notes
```

### Breaking Change Release

```bash
# 1. Make breaking changes and commit
git add .
git commit -m "feat!: change API interface"

# 2. Create major release
npm run release:major

# 3. Monitor CI/CD pipeline
# 4. Create GitHub release with migration guide
```

## Dry Run Mode

Always test your release with dry run mode first:

```bash
# See what would happen for a patch release
npm run release:dry-run

# Or with the full script
node scripts/release.js patch --dry-run
```

This will show you:
- What version would be created
- What files would be updated
- What git commands would be run
- No actual changes are made

## Troubleshooting

### Common Issues

1. **Working directory not clean**
   ```bash
   # Commit or stash your changes first
   git add . && git commit -m "your message"
   # Or use --force (not recommended)
   npm run release:patch -- --force
   ```

2. **Tests failing**
   ```bash
   # Fix tests first, or skip them (not recommended)
   npm run release:patch -- --skip-tests
   ```

3. **Permission denied**
   ```bash
   # Make scripts executable
   chmod +x scripts/release.sh scripts/release.js
   ```

4. **Git push fails**
   ```bash
   # Ensure you have push access
   git push origin main
   git push origin --tags
   ```

### Emergency Rollback

If something goes wrong:

```bash
# Delete the tag locally
git tag -d v1.0.1

# Delete the tag remotely
git push origin :refs/tags/v1.0.1

# Reset to previous commit
git reset --hard HEAD~1

# Force push (be careful!)
git push origin main --force
```

## Best Practices

### 1. Release Frequency

- **Patch releases**: As needed for bug fixes
- **Minor releases**: When adding new features
- **Major releases**: When making breaking changes

### 2. Version Naming

- Always use semantic versioning
- Never skip versions (1.0.0 → 1.0.2 is OK, 1.0.0 → 1.0.5 is not)
- Use pre-releases for testing major changes

### 3. Release Notes

When creating GitHub releases, include:
- Summary of changes
- Breaking changes (if any)
- Migration guide (if needed)
- Known issues
- Contributors

### 4. Testing

- Always run tests before release
- Use dry run mode to verify changes
- Test the released Docker image

### 5. Communication

- Notify team members of releases
- Update documentation
- Announce breaking changes well in advance

## Automation Integration

The release scripts integrate with:

- **GitHub Actions**: Automatic builds and publishing
- **Docker Hub**: Image publishing
- **GitHub Container Registry**: Image publishing
- **Security scanning**: Vulnerability checks
- **SBOM generation**: Software bill of materials

## Version History

Track your version history in:
- `package.json` - Current version
- Git tags - Release points
- GitHub releases - Release notes
- Docker image tags - Published versions

## Support

For issues with the release process:
1. Check this documentation
2. Review the script source code
3. Check GitHub Actions logs
4. Create an issue in the repository 