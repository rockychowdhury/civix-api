# -------------------- Stage 1: Build --------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Leverage BuildKit cache mount for fast dependency installs
COPY package*.json ./
COPY prisma ./prisma/

RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy source code
COPY . .

# Generate Prisma Client & compile TypeScript bundle
RUN npx prisma generate --schema=./prisma/schema
RUN npm run build

# Prune devDependencies to keep only production packages in node_modules
RUN npm prune --omit=dev && npm cache clean --force


# -------------------- Stage 2: Production Runner --------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init for proper signal handling and graceful process teardown
RUN apk add --no-cache dumb-init

# Copy only production node_modules from builder (no re-downloading)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy generated Prisma client, compiled app, and static templates
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/templates ./src/templates

# Run as non-root user for security
USER node

EXPOSE 5000

# Use dumb-init as init process and run node directly (bypassing npm wrapper)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
