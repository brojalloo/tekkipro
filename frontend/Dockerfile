# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers workspace root
COPY package*.json ./
COPY packages/ ./packages/

# Copier le frontend
COPY frontend/package*.json ./frontend/

# Installer toutes les dépendances workspace
RUN npm ci --workspace=frontend --include-workspace-root

# Copier le reste du frontend
COPY frontend/ ./frontend/

WORKDIR /app/frontend

# Build Vite (injecter l'URL API au moment du build)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- Production stage (Nginx) ----
FROM nginx:alpine AS production

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
