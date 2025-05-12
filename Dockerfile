# Use Node.js image
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm install --omit=dev

COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "run", "start"]
