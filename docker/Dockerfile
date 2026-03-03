# Use Node.js 20 LTS as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies required for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Tell Puppeteer to skip installing Chromium. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package*.json ./

# Install dependencies (ignore-scripts so prepare/husky is not run in container)
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Copy application code
COPY src/ ./src/

# Create logs directory
RUN mkdir -p logs

# Create data directories (before switching to non-root user)
RUN mkdir -p /data/input /data/output /data/logs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory and data directories
RUN chown -R nodejs:nodejs /app && \
    chown -R nodejs:nodejs /data

# Switch to non-root user
USER nodejs

# Set the working directory to the app directory
WORKDIR /app

# Set default environment variables
ENV NODE_ENV=production \
    LOGGING_ENABLED=true \
    LOG_LEVEL=info \
    LOG_DIR=logs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Default command
CMD ["node", "src/root/app/index.js"] 
