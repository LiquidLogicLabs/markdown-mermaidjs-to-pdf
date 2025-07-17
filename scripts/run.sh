#!/bin/bash

# Run script for markdown-to-pdf converter
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="liquidlogiclabs/markdown-mermaidjs-to-pdf:latest"

# Function to show usage
show_usage() {
    echo -e "${BLUE}Usage: $0 [OPTIONS] [input_dir] [output_dir]${NC}"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --verbose  Enable verbose logging"
    echo "  --no-logging   Disable logging"
    echo "  --build        Build Docker image before running"
    echo ""
    echo "Arguments:"
    echo "  input_dir      Input directory with markdown files (default: ./input)"
    echo "  output_dir     Output directory for PDF files (default: ./output)"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 ./docs ./pdfs"
    echo "  $0 -v ./input ./output"
    echo "  $0 --build"
}

# Parse command line arguments
BUILD_IMAGE=false
VERBOSE=false
NO_LOGGING=false
INPUT_DIR=""
OUTPUT_DIR=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --no-logging)
            NO_LOGGING=true
            shift
            ;;
        --build)
            BUILD_IMAGE=true
            shift
            ;;
        -*)
            echo -e "${RED}Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
        *)
            if [ -z "$INPUT_DIR" ]; then
                INPUT_DIR="$1"
            elif [ -z "$OUTPUT_DIR" ]; then
                OUTPUT_DIR="$1"
            else
                echo -e "${RED}Too many arguments${NC}"
                show_usage
                exit 1
            fi
            shift
            ;;
    esac
done

# Set default directories
INPUT_DIR=${INPUT_DIR:-"./data/input"}
OUTPUT_DIR=${OUTPUT_DIR:-"./data/output"}
LOG_DIR=${LOG_DIR:-"./data/logs"}

# Check if input directory exists
if [ ! -d "$INPUT_DIR" ]; then
    echo -e "${RED}Error: Input directory not found: $INPUT_DIR${NC}"
    echo -e "${YELLOW}Creating input directory...${NC}"
    mkdir -p "$INPUT_DIR"
fi

# Create output directory if it doesn't exist
[ ! -d "$OUTPUT_DIR" ] && mkdir -p "$OUTPUT_DIR"
[ ! -d "$LOG_DIR" ] && mkdir -p "$LOG_DIR"

# Build image if requested
if [ "$BUILD_IMAGE" = true ]; then
    echo -e "${YELLOW}Building Docker image...${NC}"
    ./scripts/build.sh
fi

# Check if Docker image exists
if ! docker image inspect "$IMAGE_NAME" > /dev/null 2>&1; then
    echo -e "${YELLOW}Docker image not found. Building...${NC}"
    ./scripts/build.sh
fi

# Prepare Docker command
DOCKER_CMD="docker run --rm"

# Add volume mounts
# Use an array to build the docker command for simplicity and safety
DOCKER_CMD_ARR=(docker run --rm)

# Add volume mounts
DOCKER_CMD_ARR+=(-v "$(realpath "$INPUT_DIR"):/data/input")
DOCKER_CMD_ARR+=(-v "$(realpath "$OUTPUT_DIR"):/data/output")
DOCKER_CMD_ARR+=(-v "$(realpath "$LOG_DIR"):/data/logs")

# Add environment variables
if [ "$NO_LOGGING" = true ]; then
    DOCKER_CMD_ARR+=(-e LOGGING_ENABLED=false)
else
    DOCKER_CMD_ARR+=(-e LOGGING_ENABLED=true)
    if [ "$VERBOSE" = true ]; then
        DOCKER_CMD_ARR+=(-e LOG_LEVEL=debug)
    else
        DOCKER_CMD_ARR+=(-e LOG_LEVEL=info)
    fi
fi

# Add image and command
DOCKER_CMD_ARR+=("$IMAGE_NAME")

# Add verbose flag if requested
if [ "$VERBOSE" = true ]; then
    DOCKER_CMD_ARR+=(-v)
fi

# Run the converter
echo -e "${BLUE}Running markdown-to-pdf batch converter...${NC}"
echo -e "${YELLOW}Input directory: $INPUT_DIR${NC}"
echo -e "${YELLOW}Output directory: $OUTPUT_DIR${NC}"

# Join the array into a single string and execute
eval "${DOCKER_CMD_ARR[*]}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Batch conversion completed successfully!${NC}"
    echo -e "${GREEN}Output directory: $OUTPUT_DIR${NC}"
    
    # Show generated files
    if [ -d "$OUTPUT_DIR" ] && [ "$(ls -A $OUTPUT_DIR)" ]; then
        echo -e "${BLUE}Generated PDFs:${NC}"
        ls -la "$OUTPUT_DIR"/*.pdf 2>/dev/null || echo "No PDF files found"
    fi
else
    echo -e "${RED}✗ Batch conversion failed!${NC}"
    exit 1
fi 