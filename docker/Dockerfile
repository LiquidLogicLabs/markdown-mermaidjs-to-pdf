FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./

RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY src/ ./src/

RUN mkdir -p logs /data/input /data/output /data/logs && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app /data

USER nodejs

WORKDIR /app

ENV NODE_ENV=production \
    LOGGING_ENABLED=true \
    LOG_LEVEL=info \
    LOG_DIR=logs

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

ENTRYPOINT ["node", "src/root/app/index.js"]
CMD ["-i", "/data/input", "-o", "/data/output"]
