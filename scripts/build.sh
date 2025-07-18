#!/bin/bash

# Build script for markdown-mermaidjs-to-pdf converter
# Supports both Docker and Podman
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Source the container runtime utility
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/container-runtime.sh"

echo -e "${YELLOW}Building markdown-mermaidjs-to-pdf container image...${NC}"

# Detect container runtime
if ! detect_container_runtime; then
    exit 1
fi

# Build the container image
IMAGE_NAME="liquidlogiclabs/markdown-mermaidjs-to-pdf:latest"
if build_image "docker/Dockerfile" "$IMAGE_NAME" "."; then
    echo -e "${GREEN}✓ Container image built successfully!${NC}"
    echo -e "${GREEN}Image: $IMAGE_NAME${NC}"
    echo -e "${GREEN}Runtime: $CONTAINER_RUNTIME${NC}"
else
    echo -e "${RED}✗ Container build failed!${NC}"
    exit 1
fi 