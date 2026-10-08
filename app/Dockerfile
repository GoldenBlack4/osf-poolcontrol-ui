FROM node:22-alpine
LABEL org.opencontainers.image.title="OSF PoolControl UI" \
      org.opencontainers.image.description="Unofficial modern web UI and Home Assistant bridge for OSF PoolControl .NET controllers" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/GoldenBlack4/osf-poolcontrol-ui"
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null 2>&1 || exit 1
CMD ["node", "server.js"]
