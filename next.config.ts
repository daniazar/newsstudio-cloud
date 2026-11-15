import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const publicS3Url = process.env.NEXT_PUBLIC_S3_PUBLIC_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Only produce standalone distribution in Docker CI/CD environments or production
  output: process.env.BUILD_STANDALONE === "true" || isProd ? "standalone" : undefined,
  compress: true,
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: isProd
      ? [
          { protocol: "https", hostname: "*.clerk.accounts.dev" },
          { protocol: "https", hostname: "img.clerk.com" },
          { protocol: "https", hostname: "images.pexels.com" },
          { protocol: "https", hostname: "cdn.pixabay.com" },
          { protocol: "https", hostname: "pixabay.com" },
          { protocol: "https", hostname: "images.unsplash.com" },
          { protocol: "https", hostname: "*.r2.dev" },
          { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
          { protocol: "https", hostname: "*.supabase.co" },
          { protocol: "https", hostname: "*.blob.core.windows.net" },
          { protocol: "https", hostname: "*.storage.googleapis.com" },
          { protocol: "https", hostname: "*.amazonaws.com" },
        ]
      : [
          { protocol: "https", hostname: "**" },
          { protocol: "http", hostname: "localhost" },
          { protocol: "http", hostname: "127.0.0.1" },
        ],
  },
  // Rewrite static avatar & studio plate requests directly to Cloudflare R2 when NEXT_PUBLIC_S3_PUBLIC_URL is configured
  async rewrites() {
    if (!publicS3Url) return [];
    return [
      {
        source: "/avatars/:path*",
        destination: `${publicS3Url}/avatars/:path*`,
      },
      {
        source: "/studio_plates/:path*",
        destination: `${publicS3Url}/studio_plates/:path*`,
      },
    ];
  },
  // Cap static generation workers to 4 (prevents 23 workers from exhausting RAM and thrashing pagefile)
  experimental: {
    cpus: 4,
  },
  // Dev server page retention: keeps compiled pages warm in memory so switching between studios is instant
  onDemandEntries: {
    maxInactiveAge: 15 * 60 * 1000, // Keep inactive compiled pages warm for 15 minutes
    pagesBufferLength: 6,           // Retain up to 6 inactive compiled pages in memory
  },
  // Tuned for 512 MB Railway RAM in production
  cacheMaxMemorySize: isProd ? 16 * 1024 * 1024 : 50 * 1024 * 1024,
  // Treat heavy native modules as external so Webpack doesn't load/parse them in memory
  serverExternalPackages: [
    "@prisma/client",
    "@remotion/cli",
    "@remotion/renderer",
    "puppeteer-core",
    "ws",
    "chat",
    "@discordjs/ws",
    "@chat-adapter/discord",
    "@chat-adapter/slack",
    "@chat-adapter/telegram",
    "@chat-adapter/state-memory",
    "@chat-adapter/state-ioredis",
    "ioredis",
    "@vercel/otel",
    "@ai-sdk/otel",
    "pino",
    "pino-pretty",
    "@mendable/firecrawl-js",
    "@tavily/core",
  ],
  // Tree-shake large icon and utility libraries to avoid loading full barrels into memory
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
      preventFullImport: true,
    },
    "date-fns": {
      transform: "date-fns/{{member}}",
      preventFullImport: true,
    },
  },
  webpack: (config, { isServer, dev, webpack }) => {
    if (!isServer) {
      config.output = config.output || {};
      config.output.chunkLoadTimeout = 300000;
      config.resolve.alias = {
        ...config.resolve.alias,
        undici: false,
      };
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        assert: false,
        "node:assert": false,
        buffer: false,
        "node:buffer": false,
        crypto: false,
        "node:crypto": false,
        stream: false,
        "node:stream": false,
        util: false,
        "node:util": false,
        net: false,
        "node:net": false,
        tls: false,
        "node:tls": false,
        http: false,
        "node:http": false,
        https: false,
        "node:https": false,
        url: false,
        "node:url": false,
        zlib: false,
        "node:zlib": false,
        async_hooks: false,
        "node:async_hooks": false,
        undici: false,
      };

      if (webpack) {
        config.plugins.push(
          new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
            resource.request = resource.request.replace(/^node:/, "");
          })
        );
      }
    }

    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Critical dependency: the request of a dependency is an expression/,
      { module: /@mediapipe[\\/]tasks-vision/ },
    ];

    // Silence webpack internal cache serialization warnings (PackFileCacheStrategy)
    config.infrastructureLogging = {
      ...(config.infrastructureLogging || {}),
      level: "error",
    };

    // In production builds, completely disable source maps for both server & client.
    // In development mode, retain Next.js default devtool to avoid performance regressions and devtool revert warnings.
    if (!dev) {
      config.devtool = false;

      // Apply client-side JavaScript AST obfuscation in production ONLY when explicitly requested via OBFUSCATE=true
      // This ensures standard local builds run at high speed without memory spikes or disk thrashing.
      if (!isServer && process.env.NODE_ENV === "production" && process.env.OBFUSCATE === "true") {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const WebpackObfuscator = require("webpack-obfuscator");
          config.plugins.push(
            new WebpackObfuscator(
              {
                // ZERO-FPS-IMPACT SETTINGS:
                // Scramble string arrays and object keys at initialization time with 0 per-frame overhead.
                // Keep control flow flattening and dead code injection OFF to strictly preserve 60-120 FPS WebGL rendering.
                rotateStringArray: true,
                stringArray: true,
                stringArrayEncoding: ["base64"],
                stringArrayThreshold: 0.8,
                transformObjectKeys: true,
                identifierNamesGenerator: "hexadecimal",
                compact: true,
                controlFlowFlattening: false,
                deadCodeInjection: false,
                debugProtection: process.env.OBFUSCATE_ANTI_DEBUG === "true",
              },
              [
                "**/node_modules/**",
                "**/vendor/**",
                // Exclude standard CRUD, administrative, and API routes to keep memory low and builds fast
                "**/app/admin/**",
                "**/app/feeds/**",
                "**/app/brands/**",
                "**/app/personas/**",
                "**/app/notifications/**",
                "**/app/api/**",
                "**/app/organization-selection/**",
                "**/app/pending-approval/**",
              ]
            )
          );
        } catch {
          // If webpack-obfuscator is not yet installed in the current environment, skip silently
        }
      }
    }
    return config;
  },
  async headers() {
    return [
      {
        // Immutable caching for media assets (action loops, audio, avatars, icons, textures)
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
      {
        // Apply Cross-Origin Isolation to all routes.
        // Required for SharedArrayBuffer (WASM multi-threading) and better WebGPU performance.
        // COEP: credentialless is the modern alternative to require-corp —
        // it allows cross-origin resources without explicit CORS opt-in from the remote server.
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Embedder-Policy",  value: "credentialless" },
          { key: "X-Content-Type-Options",       value: "nosniff" },
          { key: "X-Frame-Options",              value: "SAMEORIGIN" },
          { key: "Referrer-Policy",              value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control",       value: "on" },
          { key: "X-XSS-Protection",             value: "1; mode=block" },
          { key: "Strict-Transport-Security",    value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy",           value: "camera=(self), microphone=(self), geolocation=(), browsing-topics=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              `img-src 'self' blob: data: https:${isProd ? "" : " http://localhost:* http://127.0.0.1:*"}`,
              "font-src 'self' https://fonts.gstatic.com data:",
              `media-src 'self' blob: data: https:${isProd ? "" : " http://localhost:* http://127.0.0.1:*"}`,
              `connect-src 'self' blob: data: ws: wss: http://127.0.0.1:8766 https://*.supabase.co wss://*.supabase.co https://*.r2.dev https://*.r2.cloudflarestorage.com https://*.clerk.accounts.dev https://api.clerk.com${isProd ? "" : " http:"}`,
              "frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://*.clerk.accounts.dev https://accounts.google.com",
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
