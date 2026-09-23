# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /workspace

COPY front/package*.json ./
RUN npm install

COPY front/ ./
RUN npm run build

# --- run stage (Nginxで静的配信) ---
FROM nginx:alpine
COPY --from=build /workspace/dist /usr/share/nginx/html
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
