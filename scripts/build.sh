#!/bin/bash

# Build script for markdown-to-pdf converter
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Building markdown-to-pdf Docker image...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Build the Docker image
echo -e "${YELLOW}Building image: liquidlogiclabs/markdown-mermaidjs-to-pdf:latest${NC}"
docker build -f docker/Dockerfile -t liquidlogiclabs/markdown-mermaidjs-to-pdf:latest .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image built successfully!${NC}"
    echo -e "${GREEN}Image: liquidlogiclabs/markdown-mermaidjs-to-pdf:latest${NC}"
    
    # Show image info
    echo -e "${YELLOW}Image details:${NC}"
    docker images liquidlogiclabs/markdown-mermaidjs-to-pdf:latest
else
    echo -e "${RED}✗ Docker build failed!${NC}"
    exit 1
fi 