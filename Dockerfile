# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
# Skip postinstall scripts in container dependency installation
RUN npm ci --legacy-peer-deps --ignore-scripts

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV BUILD_STANDALONE=true

# Build args for public env vars baked into the client bundle
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_S3_PUBLIC_URL
ARG NEXT_PUBLIC_DISABLE_POLLING=true
ARG NEXT_PUBLIC_TTS_MODE=server
ARG NEXT_PUBLIC_OBJECT3D_SERVER_URL

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_S3_PUBLIC_URL=$NEXT_PUBLIC_S3_PUBLIC_URL
ENV NEXT_PUBLIC_DISABLE_POLLING=$NEXT_PUBLIC_DISABLE_POLLING
ENV NEXT_PUBLIC_TTS_MODE=$NEXT_PUBLIC_TTS_MODE
ENV NEXT_PUBLIC_OBJECT3D_SERVER_URL=$NEXT_PUBLIC_OBJECT3D_SERVER_URL

# Generate Prisma Client for PostgreSQL
RUN npx prisma generate

# Build Next.js standalone output
RUN npm run build

# ─── Stage 3: Runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
ENV COMFYUI_AUTO_START=false

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health/live || exit 1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy standalone distribution artifacts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/comfy_workflows ./comfy_workflows

# Ensure runtime directories exist with correct permissions for non-root nextjs user
RUN mkdir -p /app/storage/cache /app/data /app/public/assets/completed /app/public/assets/pending \
 && chown -R nextjs:nodejs /app/storage /app/data /app/public/assets

USER nextjs

EXPOSE 3000

CMD ["node", "--max-old-space-size=384", "server.js"]
