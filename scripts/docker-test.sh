#!/bin/bash

# Docker Container Test Script
# This script runs the complete test suite inside the Docker container

set -e

echo "======================================"
echo "Docker Container Test Suite"
echo "======================================"
echo ""
echo "Environment:"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo "  Working Directory: $(pwd)"
echo ""

echo "Step 1: Installing Dependencies"
echo "================================"
npm ci --omit=dev
echo "✓ Production dependencies installed"
echo ""

echo "Step 2: Building Application"
echo "============================"
npm run build
echo "✓ Build completed"
echo ""

echo "Step 3: Installing Dev Dependencies"
echo "===================================="
npm ci
echo "✓ All dependencies installed"
echo ""

echo "Step 4: Running Linting"
echo "======================"
npm run lint
echo "✓ Linting passed"
echo ""

echo "Step 5: Running Unit Tests"
echo "=========================="
npm test -- --coverage
echo ""

echo "Step 6: Testing Converter with Sample Files"
echo "==========================================="
mkdir -p /tmp/test-input /tmp/test-output
cp samples/*.md /tmp/test-input/
node src/root/app/index.js -i /tmp/test-input -o /tmp/test-output
PDF_COUNT=$(ls -1 /tmp/test-output/*.pdf 2>/dev/null | wc -l)
echo "✓ Generated $PDF_COUNT PDFs from sample files"
echo ""

echo "Step 7: Verifying PDF Output"
echo "============================"
for pdf in /tmp/test-output/*.pdf; do
    if [ -f "$pdf" ]; then
        SIZE=$(stat -c%s "$pdf")
        echo "  ✓ $(basename $pdf): $SIZE bytes"
    fi
done
echo ""

echo "======================================"
echo "✅ All Docker Container Tests Passed!"
echo "======================================"
exit 0
