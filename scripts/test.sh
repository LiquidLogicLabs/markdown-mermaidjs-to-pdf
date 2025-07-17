#!/bin/bash

# Test script for markdown-to-pdf converter
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="liquidlogiclabs/markdown-mermaidjs-to-pdf:latest"
SAMPLES_DIR="data/input"
OUTPUT_DIR="data/output"
LOG_DIR="data/logs"

echo -e "${BLUE}Running markdown-to-pdf converter tests...${NC}"

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SAMPLES_DIR_ABS="$PROJECT_ROOT/$SAMPLES_DIR"
OUTPUT_DIR_ABS="$PROJECT_ROOT/$OUTPUT_DIR"
LOG_DIR_ABS="$PROJECT_ROOT/$LOG_DIR"

echo -e "${BLUE}Using paths:${NC}"
echo -e "  Input: $SAMPLES_DIR_ABS"
echo -e "  Output: $OUTPUT_DIR_ABS"
echo -e "  Logs: $LOG_DIR_ABS"

# Create output and log directories
mkdir -p "$OUTPUT_DIR_ABS" "$LOG_DIR_ABS"

# Check if input directory exists and has files
if [ ! -d "$SAMPLES_DIR_ABS" ]; then
    echo -e "${RED}Error: Input directory does not exist: $SAMPLES_DIR_ABS${NC}"
    exit 1
fi

if [ ! "$(ls -A "$SAMPLES_DIR_ABS"/*.md 2>/dev/null)" ]; then
    echo -e "${RED}Error: No markdown files found in input directory: $SAMPLES_DIR_ABS${NC}"
    exit 1
fi

# Check if Docker image exists
if ! docker image inspect "$IMAGE_NAME" > /dev/null 2>&1; then
    echo -e "${YELLOW}Docker image not found. Building...${NC}"
    ./scripts/build.sh
fi

# Function to test batch conversion
test_batch_conversion() {
    echo -e "${YELLOW}Testing batch conversion...${NC}"
    
    # Clear output directory
    rm -f "$OUTPUT_DIR_ABS"/*.pdf
    
    # Run the converter with real-time output
    echo -e "${BLUE}Running converter (showing real-time output):${NC}"
    docker run --rm \
        -v "$SAMPLES_DIR_ABS:/data/input" \
        -v "$OUTPUT_DIR_ABS:/data/output" \
        -v "$LOG_DIR_ABS:/data/logs" \
        -e LOGGING_ENABLED=true \
        -e LOG_LEVEL=info \
        "$IMAGE_NAME" 2>&1 | tee "$LOG_DIR_ABS/batch.log"
    
    # Check if PDFs were generated
    local pdf_count=$(ls -1 "$OUTPUT_DIR_ABS"/*.pdf 2>/dev/null | wc -l)
    local expected_count=$(ls -1 "$SAMPLES_DIR_ABS"/*.md 2>/dev/null | wc -l)
    
    if [ $pdf_count -eq $expected_count ] && [ $expected_count -gt 0 ]; then
        echo -e "${GREEN}✓ Batch conversion successful: ${pdf_count} PDFs generated${NC}"
        
        # Show file sizes
        for pdf in "$OUTPUT_DIR_ABS"/*.pdf; do
            if [ -f "$pdf" ]; then
                local file_size=$(stat -c%s "$pdf" 2>/dev/null || stat -f%z "$pdf" 2>/dev/null)
                local filename=$(basename "$pdf")
                echo -e "${GREEN}  - ${filename}: ${file_size} bytes${NC}"
            fi
        done
        return 0
    else
        echo -e "${RED}✗ Batch conversion failed: expected ${expected_count} PDFs, got ${pdf_count}${NC}"
        echo -e "${RED}Log output:${NC}"
        cat "$LOG_DIR_ABS/batch.log"
        return 1
    fi
}

# Run batch test
failed_tests=0
total_tests=1

if ! test_batch_conversion; then
    failed_tests=$((failed_tests + 1))
fi

# Summary
echo -e "\n${BLUE}Test Summary:${NC}"
echo -e "Total tests: $total_tests"
echo -e "Passed: $((total_tests - failed_tests))"
echo -e "Failed: $failed_tests"

if [ $failed_tests -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo -e "${GREEN}Generated PDFs are available in: $OUTPUT_DIR_ABS${NC}"
    echo -e "${GREEN}Log files are available in: $LOG_DIR_ABS${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed!${NC}"
    echo -e "${YELLOW}Check the log files in: $LOG_DIR_ABS${NC}"
    exit 1
fi 