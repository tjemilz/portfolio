# Use Node.js image
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Next.js public environment variables
ARG NEXT_PUBLIC_API_URL=https://paulatreides.fr
ARG NEXT_PUBLIC_MEDIA_URL=https://paulatreides.fr/media

# Set as environment variables for the build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MEDIA_URL=$NEXT_PUBLIC_MEDIA_URL

# Copy package files and install dependencies (cached layer)
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit

# Copy only necessary files for build
COPY app ./app
COPY public ./public
COPY jsconfig.json next.config.mjs postcss.config.mjs tailwind.config.js ./

# Build Next.js
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production dependencies only
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --prefer-offline --no-audit --omit=dev

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./

EXPOSE 3000

CMD ["npm", "run", "start"]
