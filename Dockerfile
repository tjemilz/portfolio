# Use Node.js image
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Next.js public environment variables
ARG NEXT_PUBLIC_API_URL=https://still24.fr
ARG NEXT_PUBLIC_MEDIA_URL=https://still24.fr/media

# Set as environment variables for the build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MEDIA_URL=$NEXT_PUBLIC_MEDIA_URL

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
