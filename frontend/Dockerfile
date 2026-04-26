# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production --legacy-peer-deps

COPY --from=builder /app/.next ./.next
# Copy public folder only if it exists
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public* ./public/

EXPOSE 3000

CMD ["npm", "start"]
