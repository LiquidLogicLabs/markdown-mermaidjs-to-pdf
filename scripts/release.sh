#!/bin/bash

# Release script for markdown-to-pdf converter
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PACKAGE_JSON="package.json"
DOCKERFILE="docker/Dockerfile"

# Variables
RELEASE_TYPE=""
DRY_RUN=false
SKIP_TESTS=false
FORCE=false

# Function to show usage
show_usage() {
    echo -e "${YELLOW}"
    echo "Release Script Usage:"
    echo "  ./scripts/release.sh <type> [options]"
    echo ""
    echo "Release Types:"
    echo "  major     - 1.0.0 -> 2.0.0 (breaking changes)"
    echo "  minor     - 1.0.0 -> 1.1.0 (new features)"
    echo "  patch     - 1.0.0 -> 1.0.1 (bug fixes)"
    echo ""
    echo "Options:"
    echo "  --dry-run, -d    - Show what would be done without making changes"
    echo "  --skip-tests, -s - Skip running tests before release"
    echo "  --force, -f      - Force release even if tests fail or working directory is dirty"
    echo ""
    echo "Examples:"
    echo "  ./scripts/release.sh patch"
    echo "  ./scripts/release.sh minor --dry-run"
    echo "  ./scripts/release.sh major --skip-tests"
    echo -e "${NC}"
}

# Function to parse arguments
parse_arguments() {
    if [ $# -eq 0 ]; then
        show_usage
        exit 1
    fi

    RELEASE_TYPE=$1
    shift

    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run|-d)
                DRY_RUN=true
                shift
                ;;
            --skip-tests|-s)
                SKIP_TESTS=true
                shift
                ;;
            --force|-f)
                FORCE=true
                shift
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                show_usage
                exit 1
                ;;
        esac
    done

    # Validate release type
    case $RELEASE_TYPE in
        major|minor|patch)
            ;;
        *)
            echo -e "${RED}Invalid release type: $RELEASE_TYPE${NC}"
            show_usage
            exit 1
            ;;
    esac
}

# Function to get current version
get_current_version() {
    if [ ! -f "$PACKAGE_JSON" ]; then
        echo -e "${RED}Error: $PACKAGE_JSON not found${NC}"
        exit 1
    fi

    CURRENT_VERSION=$(node -p "require('./$PACKAGE_JSON').version")
    echo -e "${BLUE}Current version: $CURRENT_VERSION${NC}"
}

# Function to calculate new version
calculate_new_version() {
    IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
    MAJOR=${VERSION_PARTS[0]}
    MINOR=${VERSION_PARTS[1]}
    PATCH=${VERSION_PARTS[2]}

    case $RELEASE_TYPE in
        major)
            NEW_VERSION="$((MAJOR + 1)).0.0"
            ;;
        minor)
            NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
            ;;
        patch)
            NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
            ;;
    esac

    echo -e "${GREEN}New version: $NEW_VERSION${NC}"
}

# Function to check working directory
check_working_directory() {
    if [ -n "$(git status --porcelain)" ] && [ "$FORCE" = false ]; then
        echo -e "${RED}Working directory is not clean. Please commit or stash your changes.${NC}"
        echo -e "${YELLOW}Use --force to override this check.${NC}"
        exit 1
    fi
}

# Function to run tests
run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        echo -e "${YELLOW}Skipping tests (--skip-tests flag used)${NC}"
        return
    fi

    echo -e "${BLUE}Running tests...${NC}"
    
    if npm test; then
        echo -e "${GREEN}✓ Tests passed${NC}"
    else
        if [ "$FORCE" = false ]; then
            echo -e "${RED}✗ Tests failed${NC}"
            echo -e "${YELLOW}Use --force to override this check.${NC}"
            exit 1
        else
            echo -e "${YELLOW}Tests failed, but continuing due to --force flag${NC}"
        fi
    fi
}

# Function to update package.json
update_package_json() {
    echo -e "${BLUE}Updating package.json...${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would update package.json version to $NEW_VERSION${NC}"
    else
        # Use node to update the version
        node -e "
            const fs = require('fs');
            const pkg = JSON.parse(fs.readFileSync('$PACKAGE_JSON', 'utf8'));
            pkg.version = '$NEW_VERSION';
            fs.writeFileSync('$PACKAGE_JSON', JSON.stringify(pkg, null, 2) + '\n');
        "
        echo -e "${GREEN}✓ Updated package.json to version $NEW_VERSION${NC}"
    fi
}

# Function to update Dockerfile
update_dockerfile() {
    echo -e "${BLUE}Updating Dockerfile labels...${NC}"
    
    if [ ! -f "$DOCKERFILE" ]; then
        echo -e "${RED}Warning: $DOCKERFILE not found${NC}"
        return
    fi

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would update Dockerfile version label to $NEW_VERSION${NC}"
    else
        # Update the version label in Dockerfile
        sed -i "s/LABEL org\.opencontainers\.image\.version=.*/LABEL org.opencontainers.image.version=$NEW_VERSION/" "$DOCKERFILE"
        echo -e "${GREEN}✓ Updated Dockerfile version label to $NEW_VERSION${NC}"
    fi
}

# Function to commit changes
commit_changes() {
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would commit changes${NC}"
        return
    fi

    echo -e "${BLUE}Committing changes...${NC}"
    
    git add "$PACKAGE_JSON" "$DOCKERFILE"
    git commit -m "chore: bump version to $NEW_VERSION"
    echo -e "${GREEN}✓ Changes committed${NC}"
}

# Function to create tag
create_tag() {
    TAG_NAME="v$NEW_VERSION"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would create tag: $TAG_NAME${NC}"
        return
    fi

    echo -e "${BLUE}Creating tag: $TAG_NAME${NC}"
    
    git tag "$TAG_NAME"
    echo -e "${GREEN}✓ Created tag: $TAG_NAME${NC}"
}

# Function to push changes
push_changes() {
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would push changes and tags${NC}"
        return
    fi

    echo -e "${BLUE}Pushing changes and tags...${NC}"
    
    git push origin main
    git push origin --tags
    echo -e "${GREEN}✓ Changes and tags pushed${NC}"
}

# Function to show next steps
show_next_steps() {
    echo -e "${BLUE}"
    echo "🎉 Release completed successfully!"
    echo -e "${GREEN}Version: $NEW_VERSION${NC}"
    echo -e "${GREEN}Tag: v$NEW_VERSION${NC}"
    
    if [ "$DRY_RUN" = false ]; then
        echo -e "${YELLOW}"
        echo "Next steps:"
        echo "1. GitHub Actions will automatically build and publish the new version"
        echo "2. Monitor the CI/CD pipeline in the Actions tab"
        echo "3. Create a GitHub release with release notes"
        echo "4. Update documentation if needed"
        echo -e "${NC}"
    else
        echo -e "${YELLOW}This was a dry run. No changes were made.${NC}"
    fi
}

# Main function
main() {
    echo -e "${BLUE}🚀 Starting $RELEASE_TYPE release...${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN MODE] - No changes will be made${NC}"
    fi
    
    get_current_version
    calculate_new_version
    check_working_directory
    run_tests
    update_package_json
    update_dockerfile
    commit_changes
    create_tag
    push_changes
    show_next_steps
}

# Parse arguments and run main function
parse_arguments "$@"
main 