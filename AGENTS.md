<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# NewsStudio — AI Agent Coding Instructions

This file is the **single source of truth** for any AI coding agent working in this repository. Read it fully before touching any code.

---

## 1. Project Overview

**Ruby NewsStudio** is an autonomous AI news channel orchestrator. It ingests RSS feeds, generates scripts via LLM, produces TTS audio via Modern-TTS (Piper / F5-TTS), generates presenter videos via ComfyUI (LTX Video / InfiniteTalk), and renders final videos via Remotion.

**Read before coding:**
- [`README.md`](./README.md) — Setup, services, how to run
- [`ROADMAP.md`](./ROADMAP.md) — Sprint plan, DB schema changes, architecture decisions
- [`docs/architecture.md`](./docs/architecture.md) — Data flow, microservices, pipeline architecture
- [`docs/AZURE.md`](./docs/AZURE.md) — Cloud deployment (Sprint 8+, don't break local-first design)

---

## 2. Tech Stack (Exact Versions Matter)

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js** (App Router) | Check `package.json` for exact version. Read `node_modules/next/dist/docs/` |
| Styling | **Tailwind CSS** | Config in `tailwind.config.ts` |
| Database | **Prisma** + SQLite (→ PostgreSQL in Sprint 8) | Schema in `prisma/schema.prisma` |
| Workflow | **Inngest** | Functions in `inngest/functions/` |
| Storage | **MinIO** (local, S3-compatible) | Abstraction layer in `lib/storage/` (see Sprint 0) |
| Video | **Remotion** | Compositions in `remotion/` |
| LLM | **Gemini API** (primary) / **Ollama** (local fallback) | |
| TTS | **Modern-TTS-Server** (Python server, port 8005) | Piper ONNX / F5-TTS / StyleTTS2 / CosyVoice |
| Video / Lip-sync | **ComfyUI + LTX Video / InfiniteTalk** (port 8188) | Git submodule: `SadTalker-Server/` (legacy) |
| Testing | **Vitest** | Config in `vitest.config.mts` |

---

## 3. Critical Conventions

### 3.1 App Router Only
- All routes live under `app/`. **Never use `pages/`.**
- API routes: `app/api/[route]/route.ts` — export named HTTP handlers (`GET`, `POST`, etc.)
- Always check `node_modules/next/dist/docs/` for the exact API surface. Do not guess.

### 3.2 Database (Prisma)
- Schema file: `prisma/schema.prisma`
- After ANY schema change: run `npx prisma generate` then `npm run db:push`
- Never write raw SQL. Use the Prisma client: `import { prisma } from '@/lib/prisma'`
- All new models must follow the DB schema defined in `ROADMAP.md` (Sprint 0 section)
- Use `prisma.config.ts` for any Prisma configuration — do not modify `schema.prisma` directly for config

### 3.3 Storage
- **Never hardcode MinIO URLs.** Use the storage abstraction layer: `lib/storage/index.ts`
- Storage client is selected via `STORAGE_PROVIDER` env var (`local` | `minio` | `azure`)
- Asset keys follow the pattern: `{type}/{storyId}/{filename}` (e.g., `audio/story-123/segment-01.wav`)

### 3.4 Background Jobs & Pipeline Workers
- AI heavy lifting (TTS, Video Generation) has been decoupled from the Next.js API/Inngest.
- AI pipeline jobs are managed by standalone Node workers (`workers/pipeline-worker/index.ts`) which poll the database queue.
- Inngest is still used for lightweight background orchestration (e.g., fetching RSS feeds, triggering renders via `POST /api/render/[id]`).
- Do NOT perform long-running AI tasks inside API route handlers or Inngest. Instead, create a `GenerationJob` and let the standalone workers handle it.

### 3.5 Environment Variables
- All env vars are documented in `.env.example` — keep it updated when adding new ones
- Never hardcode secrets, URLs, or API keys
- API keys must be masked in all UI displays

### 3.6 Type Safety
- This is a **TypeScript-strict** project. No `any` types without explicit justification
- Run `npx tsc --noEmit` before declaring a change complete

---

## 4. Project Structure

```
newsStudio/
├── src/                    # ← ALL source code lives here
│   ├── app/                    # Next.js App Router (pages + API routes)
│   │   ├── admin/              # Admin dashboard, scheduler, telemetry, organizations
│   │   ├── api/                # API route handlers
│   │   │   ├── health/         # GET /api/health — aggregated system health
│   │   │   ├── piper/inspect/  # GET /api/piper/inspect — Piper ONNX model inspector
│   │   │   ├── presenter/      # Presenter/lip-sync generation & render-podcast endpoints
│   │   │   ├── stats/          # GET /api/stats/personas — persona performance analytics
│   │   │   ├── stories/        # Story CRUD + script generation + parse-studio
│   │   │   └── ...
│   │   ├── brands/             # Brands & channels management
│   │   ├── data-graphics-studio/ # Financial ticker & data infographics studio page
│   │   ├── ecommerce-studio/   # E-Commerce Video Ad Studio & Product Catalog Hub
│   │   ├── editor/[storyId]/   # Video editor page
│   │   ├── feeds/              # RSS feed management
│   │   ├── field-reporter-studio/ # Field reporter studio page
│   │   ├── interview-studio/   # Dual-presenter 3-camera interview studio page
│   │   ├── localization-studio/ # 6-language multi-dubbing matrix page
│   │   ├── narrative-matrix/   # "What If?" 3-way perspective debate matrix page
│   │   ├── newsroom/           # Newsroom dashboard
│   │   ├── personas/           # Persona vault management
│   │   ├── pipeline/           # Pipeline queue monitor
│   │   ├── podcast-studio/     # Multi-speaker podcast studio page
│   │   ├── roundtable-studio/  # Roundtable studio page
│   │   ├── tools/
│   │   │   ├── thumbnail-builder/ # Visual AI thumbnail & cover hook builder page
│   │   │   └── prompt-builder/ # Prompt builder page
│   │   ├── vault/              # Video vault & asset vault
│   │   ├── voice-cloning-lab/  # Teleprompter recorder & Piper voice dataset exporter
│   │   ├── voice-studio/       # Voice studio & matrix
│   │   ├── vtuber-studio/      # AI VTuber react streamer screen-in-screen studio
│   │   ├── wardrobe-studio/    # Wardrobe studio
│   │   └── layout.tsx          # Root layout (ClerkProvider, sidebar, toast)
│   ├── components/
│   │   ├── editor/             # Editor components (EmotionToolbar, SceneDetailPanel, etc.)
│   │   └── global/             # Sidebar.tsx, NotificationDropdown.tsx, ClientLayout.tsx
│   ├── inngest/
│   │   ├── client.ts           # Inngest client initialization
│   │   └── functions/          # Background workflow functions (10 total)
│   ├── lib/
│   │   ├── ai/                 # AI client wrappers: comfy/, translator.ts, factChecker.ts,
│   │   │                       #   pronunciationDetector.ts, musetalkClient.ts, keysyncClient.ts,
│   │   │                       #   echomimicClient.ts, geminiApiRunner.ts, roundupSynthesizer.ts
│   │   ├── ecommerce/          # E-Commerce studio suite: parsers/, typologyClassifier, adCopywriter, etc.
│   │   ├── sfx/                # SFX library & inline tag parser (sfxRegistry.ts)
│   │   ├── storage/            # Storage abstraction (local, minio, azure)
│   │   ├── stock/              # Stock asset providers (Pexels, Pixabay)
│   │   ├── music/              # Background music providers
│   │   ├── tts/                # TTS library (modernTtsClient, personas, voiceCatalog)
│   │   ├── types/              # TypeScript types: CompositionProps, RemotionSegment, etc.
│   │   └── prisma.ts           # Prisma client singleton
│   └── remotion/               # Remotion video compositions
│       ├── NewsComposition.tsx # Main composition (16 layers including StreamChatLayer)
│       ├── ProductAdComposition.tsx # E-Commerce Multi-Aspect Video Ad Composition
│       ├── Broadcast3CameraComposition.tsx
│       ├── ThumbnailComposition.tsx
│       ├── Root.tsx            # Remotion registerRoot
│       ├── components/         # AudioDuckingLayer.tsx, ChromaKeyVideo.tsx, RobustImg.tsx
│       └── layers/             # 20 layer files: StreamChatLayer, TickerTapeLayer,
│                               #   CitationBadgeLayer, StateMachinePresenterLayer, etc.
├── prisma/
│   └── schema.prisma       # ← Single source of truth for DB schema (24 models, Clerk auth)
├── scripts/                # CLI scripts & one-off utilities (ltx-video-cli.ts, loop-cli/, etc.)
├── workers/
│   └── pipeline-worker/    # Standalone Node.js generation worker (audio, video, render)
├── vendor/
│   └── Modern-TTS-Server/  # Modern-TTS-Server python engine hub (Port 8005)
├── comfy_workflows/        # ComfyUI workflow JSON templates (video/, image/, avatar/)
├── infra/                  # Bicep IaC (Sprint 8 — Azure)
├── docs/                   # Technical documentation (48 files)
├── AGENTS.md               # ← You are here
├── README.md               # Setup + quickstart
└── ROADMAP.md              # Sprint plan + full feature backlog
```


---

## 5. Key API Patterns

### Health Check
Every backend service must have a health endpoint. Pattern from `GET /api/health`:
```typescript
// Always return within 2s — use Promise.race with a timeout
export async function GET() {
  return Response.json({ status: 'ok', services: { ... } })
}
```

### Async Job Submission (Enqueue Pattern)
For any operation that takes >500ms, do NOT block the HTTP response:
```typescript
// ❌ Wrong — blocks HTTP connection
const video = await generateVideo(segmentId) // Takes 20+ minutes

// ✅ Correct — enqueue and return jobId immediately
const { ids } = await inngest.send({ name: 'video/generate', data: { segmentId } })
return Response.json({ jobId: ids[0] })
```

### Streaming Progress (NDJSON)
For long-running operations where the UI needs live updates (e.g., TTS generation):
```typescript
const stream = new ReadableStream({ ... })
return new Response(stream, {
  headers: { 'Content-Type': 'application/x-ndjson' }
})
```

---

## 6. AI Backend Services

| Service | URL | Port | Purpose |
|---|---|---|---|
| Pipeline Worker | `localhost` | `N/A` | Standalone Node.js worker polling jobs |
| Modern-TTS-Server | `localhost` | `8005` | Voice synthesis (Piper, F5-TTS, StyleTTS2, CosyVoice) & Glossary |
| MuseTalk Realtime | `localhost` | `8007` | 350+ FPS real-time lip-sync engine (TensorRT FP8/FP16 + NVENC) |
| KeySync Realtime | `localhost` | `8008` | 2-stage latent diffusion cached lip-sync engine |
| LivePortrait Realtime | `localhost` | `8009` | 3D head rotation, procedural puppeteering & inverted compositor |
| Modern-Mesh-Server | `localhost` | `8020` | Low-VRAM 3D mesh reconstruction & 360° turntable (TripoSG, TRELLIS, SPAR3D) |
| ComfyUI | `localhost` | `8188` | LTX Video / InfiniteTalk presenter video |
| Ollama | `localhost` | `11434` | Local LLM (script polish) |
| Inngest Dev | `localhost` | `8288` | Lightweight orchestration (RSS, Render) |
| MinIO | `localhost` | `9000` | Object storage |
| Next.js | `localhost` | `3000` | Main app |

Always check server health via `/api/health` before initiating generation. Never assume servers are running.

---

## 7. ComfyUI (LTX Video / InfiniteTalk) Integration

- Client: `src/lib/ai/comfyClient.ts` (re-exports from `src/lib/ai/comfy/` submodules)
- Workflow templates: `comfy_workflows/video/*.json`
- Pattern: upload assets → submit workflow → poll via WebSocket → download output
- Supported models: LTX Video 2.5, InfiniteTalk `1.3b` / `14b`, EchoMimic V3, HunyuanVideo 1.5, MiniMax H3, Wan 2.1
- All ComfyUI calls go through `POST /api/presenter/generate-scene` — never call ComfyUI directly from frontend

---

## 8. Remotion Conventions

- All compositions are in `src/remotion/`
- The main entry point is `src/remotion/NewsComposition.tsx` which uses `<Series>` to sequence scenes
- The `IntroLayer` always runs first (3s / 90 frames at 30fps)
- New scene types must be added to `NewsComposition` and respect the `compositionProps` schema in `src/lib/types/index.ts`
- **Never block the Remotion render thread** — all asset fetching must be done before render starts
- `StreamChatLayer` is rendered when `showStreamChat=true` in `CompositionProps` (VTuber studio mode)

---

## 9. What NOT to Do

- ❌ Do not add new general UI routes without adding them to the sidebar in `src/components/global/Sidebar.tsx`
  - **Exception:** Studio Production pages (`/interview-studio`, `/podcast-studio`, `/vtuber-studio`, `/localization-studio`, `/data-graphics-studio`, `/narrative-matrix`, `/roundtable-studio`, `/field-reporter-studio`) are accessed via the `✨ Studios ▾` dropdown on Newsroom story cards — they intentionally have no sidebar link. `/ecommerce-studio` is accessible both in the sidebar under **Content & Assets** (`ShoppingBag` icon) and via the `✨ Studios ▾` dropdown.
- ❌ Do not call AI backends directly from React components — always route through Next.js API routes
- ❌ Do not store secrets in the DB — only store references/pointers (e.g., storage keys, not full URLs)
- ❌ Do not modify `SadTalker-Server/` — it is a git submodule
- ❌ Do not add `console.log` statements to production code — use `createLogger` from `@/lib/logger` (`src/lib/logger.ts`) for structured logging with automated secret redaction and OpenTelemetry trace correlation
- ❌ Do not skip running `npx prisma generate` after schema changes
- ❌ Do not assume MinIO is available in production — use the `StorageClient` abstraction
- ❌ Do not create App Router pages or API routes in root `app/` — all Next.js App Router code belongs in `src/app/`
- ❌ Do not reference `lib/`, `app/`, or `remotion/` without the `src/` prefix — all source code lives under `src/`
- ❌ **Autonomous Agents (Jules) PR Hygiene — Do NOT cause collateral merge conflicts:**
  - Never modify `package.json`, `package-lock.json`, `prisma/schema.prisma`, `eslint.config.mjs`, or `.github/workflows/*` unless the task explicitly asks you to change dependencies, schema, or CI workflows.
  - Never commit generated timestamp changes in `public/avatars/*/action_loops_manifest.json` or other manifest/lock files when running tests.
  - Never commit temporary benchmark or scratch scripts (e.g., `benchmark*.ts`, `patch_*.js`) to the repository root or `scripts/`.

---

## 10. Keep Skills, Rules & Documentation Synchronized

Whenever you create, modify, or calibrate CLI tools, ComfyUI graphs, AI parameters (LoRAs, CFG scale, timecodes), Remotion layers, API routes, or worker daemons:
1. **Update Skills**: Update the corresponding skill in `.agents/skills/` with current parameters and commands.
2. **Update Documentation**: Maintain `docs/README.md` and `docs/FUTURE_STEPS_IMPLEMENTATION_ROADMAP.md` as live, single-source-of-truth references.
3. **No Stale Code/Docs**: Never leave outdated instructions or legacy defaults behind.

---

## 11. Before Submitting Changes

Run the following and fix all errors before declaring work complete:

```bash
npx tsc --noEmit          # TypeScript check
npx eslint src --fix      # Lint + auto-fix
npx prisma validate       # Validate schema
npm run dev               # Verify the app boots without errors
```

If you added a new Prisma model or field, also run:
```bash
npx prisma generate
npm run db:push
```

