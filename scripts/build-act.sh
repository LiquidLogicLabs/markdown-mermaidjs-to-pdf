#!/bin/bash

# Act testing script with proper container options
set -e

# Accept job name as argument, default to 'test'
JOB_NAME=${1:-test}

echo "🧪 Testing with act using proper container options... (job: $JOB_NAME)"

# Get the current directory
CURRENT_PATH=$(pwd)

# Create test directories
mkdir -p data/input data/output data/logs

# Copy sample files if they exist
if [ -d "tests/samples" ]; then
  echo "📁 Copying sample files..."
  cp tests/samples/*.md data/input/ 2>/dev/null || true
fi

# Create a simple test markdown if no samples exist
if [ ! "$(ls -A data/input/*.md 2>/dev/null)" ]; then
  echo "📝 Creating test markdown file..."
  cat > data/input/test.md << 'EOF'
# Test Document

This is a test document for act testing.

## Features

- Basic markdown formatting
- Lists and headers
- Simple content for testing

## Mermaid Diagram

```mermaid
graph TD
    A[Start] --> B{Test?}
    B -->|Yes| C[Pass]
    B -->|No| D[Fail]
    C --> E[End]
    D --> E
```

## Conclusion

This document should be converted to PDF successfully.
EOF
fi

echo "🔧 Running act with proper container options..."

# Run act with container options for volume mounting
act push --job "$JOB_NAME" \
  --container-options "-v ${CURRENT_PATH}/data:/workspace/data" \
  --env PUBLISH_TO_DOCKERHUB=false \
  --env DOCKERHUB_OWNER=ravensorb \
  --env GHCR_OWNER=liquidlogiclabs

echo "📋 Checking results..."
# List output directory contents
echo "Output directory contents:"
ls -la data/output/ 2>/dev/null || echo "Output directory is empty or doesn't exist"

# Check for PDF files
if [ "$(ls -A data/output/*.pdf 2>/dev/null)" ]; then
  echo "✅ Act test passed - PDF files generated:"
  ls -la data/output/*.pdf
  echo ""
  echo "📊 PDF file details:"
  for pdf in data/output/*.pdf; do
    echo "  - $(basename "$pdf"): $(wc -c < "$pdf") bytes"
  done
else
  echo "❌ Act test failed - No PDF files generated"
  echo "Checking for any output files:"
  find data/output -type f 2>/dev/null || echo "No files found in output directory"
  exit 1
fi

echo "✅ Act test completed successfully!" 