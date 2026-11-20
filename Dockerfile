FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
RUN apk add --no-cache nodejs
WORKDIR /app
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY server ./server
RUN mkdir -p /app/data/saves
VOLUME ["/app/data/saves"]
EXPOSE 80
CMD ["sh", "-c", "node /app/server/saveServer.mjs & nginx -g 'daemon off;'"]
