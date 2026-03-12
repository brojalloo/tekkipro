# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src/

# ---- Production stage ----
FROM node:20-alpine AS production

WORKDIR /app

# Copier uniquement les fichiers nécessaires depuis le build stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY package*.json ./

RUN addgroup -S app && adduser -S app -G app \
    && chown -R app:app /app

# Variables d'environnement par défaut (surcharger avec docker-compose)
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

USER app

# Appliquer les migrations Prisma puis démarrer le serveur
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]

