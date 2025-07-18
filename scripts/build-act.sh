#!/bin/bash

# Act testing script with proper container options
set -e

# Parse command line arguments
JOB_NAME="test"
DRYRUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dryrun)
      DRYRUN=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [JOB_NAME] [--dryrun]"
      echo ""
      echo "Arguments:"
      echo "  JOB_NAME    Job to run (default: test)"
      echo "  --dryrun    Run act in dry-run mode"
      echo "  --help, -h  Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                    # Run test job"
      echo "  $0 build-and-push     # Run build-and-push job"
      echo "  $0 --dryrun           # Run test job in dry-run mode"
      echo "  $0 build-and-push --dryrun  # Run build-and-push job in dry-run mode"
      exit 0
      ;;
    *)
      if [[ "$JOB_NAME" == "test" ]]; then
        JOB_NAME="$1"
      else
        echo "Error: Unknown argument '$1'"
        echo "Use --help for usage information"
        exit 1
      fi
      shift
      ;;
  esac
done

echo "🧪 Testing with act using proper container options... (job: $JOB_NAME)"
if [[ "$DRYRUN" == "true" ]]; then
  echo "🔍 Running in DRY-RUN mode"
fi

# Get the current directory
CURRENT_PATH=$(pwd)

# Create test directories
mkdir -p data/input data/output data/logs

# Copy sample files if they exist
if [ -d "samples" ]; then
  echo "📁 Copying sample files..."
  cp samples/*.md data/input/ 2>/dev/null || true
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

# Build act command as an argument array
ACT_ARGS=(
  push
  --job "$JOB_NAME"
  --container-options "-v ${CURRENT_PATH}/data:/workspace/data"
)

# Only add env variables if they are defined
if [[ -n "${PUBLISH_TO_DOCKERHUB}" ]]; then
  ACT_ARGS+=(--env PUBLISH_TO_DOCKERHUB="${PUBLISH_TO_DOCKERHUB}")
fi
if [[ -n "${PUBLISH_TO_GHCR}" ]]; then
  ACT_ARGS+=(--env PUBLISH_TO_GHCR="${PUBLISH_TO_GHCR}")
fi
if [[ -n "${DOCKERHUB_OWNER}" ]]; then
  ACT_ARGS+=(--env DOCKERHUB_OWNER="${DOCKERHUB_OWNER}")
fi
if [[ -n "${GHCR_OWNER}" ]]; then
  ACT_ARGS+=(--env GHCR_OWNER="${GHCR_OWNER}")
fi

# Add dryrun flag if specified
if [[ "$DRYRUN" == "true" ]]; then
  ACT_ARGS+=(--dryrun)
fi

echo "Running: act ${ACT_ARGS[*]}"
act "${ACT_ARGS[@]}"

# Skip results checking in dryrun mode
if [[ "$DRYRUN" == "true" ]]; then
  echo "🔍 Dry-run completed - no actual files generated"
  echo "✅ Act dry-run completed successfully!"
  exit 0
fi

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