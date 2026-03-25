#!/bin/bash

# Docker Container Test Script
# Builds a test image and runs unit tests + E2E conversion tests inside Docker

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IMAGE_NAME="md2pdf-test"

echo "======================================"
echo "Docker Container Test Suite"
echo "======================================"
echo ""

# Determine container runtime
if command -v docker &> /dev/null; then
    RUNTIME="docker"
elif command -v podman &> /dev/null; then
    RUNTIME="podman"
else
    echo "Error: Neither docker nor podman found"
    exit 1
fi
echo "Container runtime: $RUNTIME"
echo ""

echo "Step 1: Building Test Image"
echo "================================"
$RUNTIME build -t "$IMAGE_NAME" -f "$PROJECT_ROOT/docker/Dockerfile.test" --ignorefile "$PROJECT_ROOT/docker/Dockerfile.test.dockerignore" "$PROJECT_ROOT"
echo "✓ Test image built"
echo ""

echo "Step 2: Running Unit Tests"
echo "=========================="
$RUNTIME run --rm "$IMAGE_NAME"
echo "✓ Unit tests passed"
echo ""

echo "Step 3: Running E2E Conversion Tests"
echo "====================================="
$RUNTIME run --rm \
    --entrypoint sh "$IMAGE_NAME" \
    -c '
set -e
echo "--- E2E: Converting sample files ---"
mkdir -p /tmp/test-output
node src/root/app/index.js -i samples -o /tmp/test-output -v --front-matter styled

PDF_COUNT=$(ls -1 /tmp/test-output/*.pdf 2>/dev/null | wc -l)
MD_COUNT=$(ls -1 samples/*.md 2>/dev/null | wc -l)

echo ""
echo "--- E2E: Verifying PDF output ---"
for pdf in /tmp/test-output/*.pdf; do
    if [ -f "$pdf" ]; then
        SIZE=$(stat -c%s "$pdf" 2>/dev/null || stat -f%z "$pdf" 2>/dev/null)
        if [ "$SIZE" -gt 0 ]; then
            echo "  ✓ $(basename "$pdf"): ${SIZE} bytes"
        else
            echo "  ✗ $(basename "$pdf"): empty file!"
            exit 1
        fi
    fi
done

echo ""
if [ "$PDF_COUNT" -eq "$MD_COUNT" ]; then
    echo "✓ All $PDF_COUNT/$MD_COUNT sample files converted successfully"
else
    echo "✗ Only $PDF_COUNT/$MD_COUNT files converted"
    exit 1
fi
'
echo "✓ E2E tests passed"
echo ""

echo "======================================"
echo "✅ All Docker Container Tests Passed!"
echo "======================================"
exit 0
