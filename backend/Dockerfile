FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5001 \
    HOST=0.0.0.0
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup
COPY --from=builder --chown=appuser:appgroup /usr/src/app ./
USER 10001:10001
EXPOSE 5001
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5001/health || exit 1
CMD ["node", "src/index.js"]
