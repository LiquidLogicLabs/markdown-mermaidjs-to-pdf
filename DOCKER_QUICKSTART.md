# Quick Start: Docker Build & Test

**Status**: ✅ Application ready for Docker containerization

## Prerequisites

- Docker Engine 20.10+
- 2GB free disk space
- 4GB available RAM

## Quick Build & Test

### Step 1: Build the Docker Image

**On Linux/macOS:**
```bash
docker build -f docker/Dockerfile -t liquidlogiclabs/markdown-mermaidjs-to-pdf:latest .
```

**On Windows with WSL:**
```bash
wsl docker build -f docker/Dockerfile -t liquidlogiclabs/markdown-mermaidjs-to-pdf:latest .
```

**Build time**: ~2-3 minutes (first run), ~30 seconds (cached)
**Expected output**: Successfully tagged image

### Step 2: Verify Image Built Successfully

```bash
docker images | grep markdown-mermaidjs-to-pdf
```

Expected output:
```
REPOSITORY                                            TAG      IMAGE ID      SIZE
liquidlogiclabs/markdown-mermaidjs-to-pdf             latest   abc123def456  ~900MB
```

### Step 3: Run Tests Inside Container

#### Option A: Complete Test Suite
```bash
docker run --rm liquidlogiclabs/markdown-mermaidjs-to-pdf:latest npm test
```

**Expected output**:
```
Test Suites: 2 passed, 2 total
Tests:       20 passed, 20 total
```

#### Option B: Run with Linting
```bash
docker run --rm liquidlogiclabs/markdown-mermaidjs-to-pdf:latest bash -c "npm run lint && npm test"
```

**Expected output**: 0 lint errors, all tests passing

### Step 4: Test Converter with Sample Files

```bash
mkdir -p test-output

docker run --rm \
  -v $(pwd)/samples:/data/input \
  -v $(pwd)/test-output:/data/output \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest
```

**Expected output**:
```
Converting: sample1.md → sample1.pdf
✓ sample1.md → sample1.pdf (6.35s)
Converting: sample2.md → sample2.pdf
✓ sample2.md → sample2.pdf (4.12s)
Converting: test-sample.md → test-sample.pdf
✓ test-sample.md → test-sample.pdf (3.17s)

=== Conversion Summary ===
✓ Successfully converted: 3 files
```

**Verify output files**:
```bash
ls -lh test-output/
# sample1.pdf  128550 bytes
# sample2.pdf  223106 bytes
# test-sample.pdf 101334 bytes
```

### Step 5: Test Configuration Options

```bash
# Test with custom PDF format and margins
docker run --rm \
  -v $(pwd)/samples:/data/input \
  -v $(pwd)/test-output:/data/output \
  -e PDF_FORMAT=Letter \
  -e PDF_MARGIN_TOP=0.5in \
  -e PDF_MARGIN_BOTTOM=0.5in \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest

# Test with debug logging
docker run --rm \
  -v $(pwd)/samples:/data/input \
  -v $(pwd)/test-output:/data/output \
  -e LOG_LEVEL=debug \
  liquidlogiclabs/markdown-mermaidjs-to-pdf:latest
```

## Full Test Checklist

Run through each test to verify complete functionality:

```bash
#!/bin/bash

IMAGE="liquidlogiclabs/markdown-mermaidjs-to-pdf:latest"
PASS=0
FAIL=0

test_case() {
    echo ""
    echo "Testing: $1"
    if eval "$2"; then
        echo "✓ PASSED"
        ((PASS++))
    else
        echo "✗ FAILED"
        ((FAIL++))
    fi
}

echo "=== Docker Image Test Suite ==="
echo ""

# Test 1: Image exists
test_case "Image exists" \
    "docker inspect $IMAGE > /dev/null 2>&1"

# Test 2: npm test passes
test_case "npm test passes" \
    "docker run --rm $IMAGE npm test > /dev/null 2>&1"

# Test 3: npm run lint passes
test_case "npm run lint passes" \
    "docker run --rm $IMAGE npm run lint > /dev/null 2>&1"

# Test 4: Both npm ci and npm install work
test_case "Dependencies install" \
    "docker run --rm $IMAGE npm ci > /dev/null 2>&1"

# Test 5: Container runs default command
test_case "Default command runs" \
    "docker run --rm \
        -v $(pwd)/samples:/data/input \
        -v /tmp/docker-test:/data/output \
        --timeout 60 \
        $IMAGE > /dev/null 2>&1"

# Test 6: Environment variables work
test_case "Environment variables respected" \
    "docker run --rm \
        -e PDF_FORMAT=Letter \
        -e MAX_FILE_SIZE=20971520 \
        $IMAGE npm test > /dev/null 2>&1"

# Summary
echo ""
echo "=== Test Summary ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "✅ All tests passed - Docker image is ready!"
    exit 0
else
    echo "❌ Some tests failed - check output above"
    exit 1
fi
```

## Troubleshooting

### Problem: Docker daemon not running
**Error**: "Cannot connect to Docker daemon"
```bash
# Start Docker daemon
docker ps

# Or on Linux:
sudo systemctl start docker
```

### Problem: Permission denied
**Error**: "permission denied while trying to connect to Docker daemon"
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker
```

### Problem: Out of disk space
**Error**: "no space left on device"
```bash
# Clean up unused images
docker image prune -a

# Check disk usage
docker system df
```

### Problem: Build fails with "chromium: not found"
**Solution**: Rebuild without cache
```bash
docker build --no-cache -f docker/Dockerfile -t liquidlogiclabs/markdown-mermaidjs-to-pdf:latest .
```

### Problem: Tests fail in container but pass locally
**Solution**: Check environment and dependencies
```bash
# Verify dependencies installation
docker run --rm liquidlogiclabs/markdown-mermaidjs-to-pdf:latest npm ls

# Check Node.js version
docker run --rm liquidlogiclabs/markdown-mermaidjs-to-pdf:latest node --version

# Verify Chromium installed
docker run --rm liquidlogiclabs/markdown-mermaidjs-to-pdf:latest which chromium-browser
```

## What Gets Tested in Docker

1. **Build Process**
   - Base image pulls successfully
   - All dependencies install (npm ci)
   - Chromium dependencies available
   - Source code copied correctly

2. **Unit Tests**
   - 20 unit tests pass
   - Linting passes with 0 errors
   - Coverage metrics collected

3. **Integration Tests**
   - Batch file conversion works
   - Mermaid diagrams render
   - PDF files generate
   - Logging works correctly

4. **Configuration**
   - Environment variables respected
   - PDF options configurable
   - Input/output paths work
   - File size limits enforced

5. **Resource Management**
   - No memory leaks
   - Browser cleanup verified
   - Container exits cleanly

## Next Steps

After successful Docker tests:

1. **Push to Registry**:
   ```bash
   docker tag liquidlogiclabs/markdown-mermaidjs-to-pdf:latest liquidlogiclabs/markdown-mermaidjs-to-pdf:v1.0.0
   docker push liquidlogiclabs/markdown-mermaidjs-to-pdf:latest
   docker push liquidlogiclabs/markdown-mermaidjs-to-pdf:v1.0.0
   ```

2. **Deploy to Production**:
   ```bash
   docker run -d \
     -v /data/input:/data/input \
     -v /data/output:/data/output \
     liquidlogiclabs/markdown-mermaidjs-to-pdf:latest
   ```

3. **Monitor Container**:
   ```bash
   docker logs <container-id>
   docker stats <container-id>
   docker inspect <container-id>
   ```

## Resources

- [Docker Testing Guide](DOCKER_TESTING.md)
- [Docker Build Report](DOCKER_BUILD_REPORT.md)
- [Dockerfile](docker/Dockerfile)
- [Main README](README.md)

---

**Status**: ✅ Ready for Docker Build  
**Last Updated**: February 3, 2026
