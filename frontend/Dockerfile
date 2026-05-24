FROM node:20-alpine AS builder

WORKDIR /app

# Declare build arg for Vite (baked in at build time)
ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.node.json* vite.config.ts ./
COPY index.html ./
COPY src/ ./src/

RUN npm run build

# ---- Runtime ----
FROM nginx:alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
