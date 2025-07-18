#!/bin/bash

# Container runtime detection and unified interface
# Supports both Docker and Podman

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables
CONTAINER_RUNTIME=""
CONTAINER_CMD=""

# Function to detect available container runtime
detect_container_runtime() {
    # Check for Podman first (preferred for rootless containers)
    if command -v podman >/dev/null 2>&1; then
        if podman info >/dev/null 2>&1; then
            CONTAINER_RUNTIME="podman"
            CONTAINER_CMD="podman"
            echo -e "${GREEN}✓ Using Podman as container runtime${NC}"
            return 0
        else
            echo -e "${YELLOW}Podman found but not running properly${NC}"
        fi
    fi
    
    # Check for Docker
    if command -v docker >/dev/null 2>&1; then
        if docker info >/dev/null 2>&1; then
            CONTAINER_RUNTIME="docker"
            CONTAINER_CMD="docker"
            echo -e "${GREEN}✓ Using Docker as container runtime${NC}"
            return 0
        else
            echo -e "${YELLOW}Docker found but not running properly${NC}"
        fi
    fi
    
    # No container runtime available
    echo -e "${RED}✗ No container runtime (Docker or Podman) is available and running${NC}"
    echo -e "${YELLOW}Please install and start either Docker or Podman${NC}"
    return 1
}

# Function to build container image
build_image() {
    local dockerfile="$1"
    local image_name="$2"
    local build_context="$3"
    
    if [ -z "$CONTAINER_CMD" ]; then
        echo -e "${RED}Error: No container runtime detected${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Building image: $image_name${NC}"
    echo -e "${YELLOW}Using: $CONTAINER_CMD${NC}"
    
    if [ "$CONTAINER_RUNTIME" = "podman" ]; then
        # Podman specific build command
        $CONTAINER_CMD build -f "$dockerfile" -t "$image_name" "$build_context"
    else
        # Docker build command
        $CONTAINER_CMD build -f "$dockerfile" -t "$image_name" "$build_context"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Container image built successfully!${NC}"
        echo -e "${GREEN}Image: $image_name${NC}"
        
        # Show image info
        echo -e "${YELLOW}Image details:${NC}"
        $CONTAINER_CMD images "$image_name"
        return 0
    else
        echo -e "${RED}✗ Container build failed!${NC}"
        return 1
    fi
}

# Function to check if image exists
image_exists() {
    local image_name="$1"
    
    if [ -z "$CONTAINER_CMD" ]; then
        return 1
    fi
    
    $CONTAINER_CMD image inspect "$image_name" >/dev/null 2>&1
    return $?
}

# Function to run container
run_container() {
    local args=("$@")
    
    if [ -z "$CONTAINER_CMD" ]; then
        echo -e "${RED}Error: No container runtime detected${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Running container with: $CONTAINER_CMD${NC}"
    
    # Execute the container command with all arguments
    $CONTAINER_CMD run "${args[@]}"
    return $?
}

# Function to show runtime info
show_runtime_info() {
    if [ -z "$CONTAINER_CMD" ]; then
        echo -e "${RED}No container runtime detected${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Container Runtime Information:${NC}"
    echo -e "  Runtime: $CONTAINER_RUNTIME"
    echo -e "  Command: $CONTAINER_CMD"
    echo -e "  Version: $($CONTAINER_CMD --version)"
    echo ""
    
    # Show runtime info
    echo -e "${BLUE}Runtime Details:${NC}"
    $CONTAINER_CMD info 2>/dev/null | head -20 || echo "Unable to get runtime info"
}

# Main execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Script is being executed directly
    case "${1:-}" in
        "detect"|"")
            detect_container_runtime
            ;;
        "build")
            if [ $# -lt 4 ]; then
                echo -e "${RED}Usage: $0 build <dockerfile> <image_name> <build_context>${NC}"
                exit 1
            fi
            detect_container_runtime && build_image "$2" "$3" "$4"
            ;;
        "run")
            shift
            detect_container_runtime && run_container "$@"
            ;;
        "info")
            detect_container_runtime && show_runtime_info
            ;;
        "exists")
            if [ $# -lt 2 ]; then
                echo -e "${RED}Usage: $0 exists <image_name>${NC}"
                exit 1
            fi
            detect_container_runtime && image_exists "$2"
            ;;
        *)
            echo -e "${BLUE}Usage: $0 [COMMAND]${NC}"
            echo ""
            echo "Commands:"
            echo "  detect    Detect available container runtime"
            echo "  build     Build a container image"
            echo "  run       Run a container"
            echo "  exists    Check if image exists"
            echo "  info      Show runtime information"
            echo ""
            echo "Examples:"
            echo "  $0 detect"
            echo "  $0 build docker/Dockerfile myimage:latest ."
            echo "  $0 run --rm -it myimage:latest"
            echo "  $0 exists myimage:latest"
            echo "  $0 info"
            ;;
    esac
fi 