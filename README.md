# Ruby NewsStudio

An autonomous AI news channel orchestrator. Ingests RSS feeds, generates scripts via LLM, synthesizes voice via Modern-TTS-Server, generates lip-synced presenter videos via ComfyUI, and composes final broadcast videos via Remotion.

---

## Architecture At a Glance

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) + Tailwind CSS |
| Database | SQLite via Prisma (→ PostgreSQL in cloud) |
| Workflow | Inngest (lightweight) + Standalone Pipeline Workers (heavy AI) |
| Storage | MinIO (local, S3-compatible) / Local / Azure |
| Video | Remotion + WebGL Chroma Keyer |
| LLM | Gemini 2.5 Flash (primary) / Ollama (local fallback) |
| TTS | **Modern-TTS-Server** (Piper, F5-TTS, StyleTTS2, CosyVoice) — port **8005** |
| Lip-sync | ComfyUI + InfiniteTalk / LTX Video / EchoMimic V3 / Wan 2.1 — port **8188** |
| Realtime Lip-sync | MuseTalk (port **8007**) / KeySync (port **8008**) |
| Auth | Clerk (B2B multi-tenant) |

---

## Requirements

- Node.js v20+
- Docker Desktop (for MinIO object storage)
- Python 3.10+ (for TTS and AI microservices)
- ComfyUI (for presenter video generation — CUDA GPU recommended)

---

## Setup

### 1. Clone with Submodules
```bash
git clone --recursive https://github.com/daniazar/newsStudio.git
cd newsStudio
```

If you forgot `--recursive`:
```bash
git submodule update --init --recursive
```

### 2. Install & Database
```bash
npm install
npx prisma generate
npm run db:push
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and fill in at minimum:
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/apikey)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` — from [Clerk Dashboard](https://clerk.com)
- `PEXELS_API_KEY` — from [Pexels](https://www.pexels.com/api/) (for B-roll stock footage)

### 4. Start MinIO (Object Storage)
```bash
docker run -d \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=admin \
  -e MINIO_ROOT_PASSWORD=password123 \
  minio/minio server /data --console-address ":9001"
```

Create the `news-studio` bucket at [http://localhost:9001](http://localhost:9001).

### 5. Start the Application
```bash
npm run dev
```

### 6. Start Inngest Dev Server (separate terminal)
```bash
npx inngest-cli@latest dev
```

### 7. Start Pipeline Workers (separate terminals)

The AI generation pipeline is fully decoupled into standalone Node.js workers. The Next.js app never runs heavy AI tasks — it enqueues `GenerationJob` records in the database. Workers poll, claim, and process jobs independently.

```bash
# Run all worker roles in one process:
npm run worker

# Or run specialized workers:
npm run worker:audio    # TTS audio generation
npm run worker:video    # ComfyUI video generation
npm run worker:render   # Remotion final render
```

Workers can run on the same machine, a separate GPU PC, or in the cloud — no code changes needed.

### 8. Access the App
Open [http://localhost:3000](http://localhost:3000)

---

## AI Backend Services

### Modern-TTS-Server (Primary Voice, port 8005)

The primary TTS engine supporting Piper ONNX, Kokoro-82M, StyleTTS2, F5-TTS, and CosyVoice with native C++ AVX2 SIMD quantization and zero-copy shared memory (`/dev/shm`).

#### VRAM Memory Profiles

Modern-TTS supports 3 memory profile tiers to optimize GPU VRAM allocation alongside **ComfyUI (Wan 2.1)** and **MuseTalk**:

| Mode | Resident Pre-warmed Engines | VRAM Footprint | Best Use Case |
|---|---|---|---|
| **`lightweight`** | Piper ONNX (Female+Male) + Kokoro-82M (ES+EN) | **~450 MB** | Real-time live breaking news & maximum VRAM headroom for Wan 2.1 |
| **`studio`** *(Default)* | Piper ONNX + Kokoro-82M + StyleTTS 2 (Disk Latents) | **~1.6 GB** | Daily news production & hyper-expressive cloned voices |
| **`full`** | All 8 engines eager-loaded (Piper, Kokoro, MeloTTS, StyleTTS2, OmniVoice, ChatTTS, Orpheus, F5-TTS) | **~14.0 GB** | Lab research & multi-model parity benchmarking |

#### How to Run in Different Modes

##### Option 1: Direct Python CLI
```bash
# Lightweight (~450 MB VRAM)
python server.py --profile lightweight
# or
python server.py -p lightweight

# Studio (~1.6 GB VRAM) — Recommended Default
python server.py --profile studio

# Full (~14.0 GB VRAM)
python server.py --profile full
```

##### Option 2: NPM Shortcuts & TypeScript Launcher
```bash
# Direct NPM shortcuts
npm run modern-tts:lightweight
npm run modern-tts:studio
npm run modern-tts:full

# Using TSX launcher with custom arguments
npx tsx scripts/start-modern-tts.ts --profile=lightweight
```

##### Option 3: Docker & Docker Compose
```bash
# Pass as environment variable in Docker run
docker run -e TTS_PROFILE=lightweight -p 8005:8005 modern-tts-server

# Or with Docker Compose
TTS_PROFILE=lightweight docker compose -f docker-compose.ai.yml up modern-tts -d
```

##### Dynamic Switching on the Fly
You can also switch memory profiles without restarting the server:
- `POST http://localhost:8005/api/profile/set` with payload `{"profile": "lightweight"}`
- `POST http://localhost:8005/api/models/unload` to evict unused models to CPU RAM immediately

See [`docs/MODERN_TTS_WALKTHROUGH.md`](./docs/MODERN_TTS_WALKTHROUGH.md) for full benchmarks and architecture details.

---

### ComfyUI (Presenter Video, port 8188)

Runs InfiniteTalk, LTX Video 2.5, EchoMimic V3, HunyuanVideo 1.5, MiniMax H3, and Wan 2.1 workflows.

```bash
cd ~/ComfyUI
source venv/bin/activate
python main.py --port 8188 --enable-manager
```

See [`comfy_workflows/README.md`](./comfy_workflows/README.md) for required model downloads.  
Or launch directly from the **Presenter Studio** panel via **"Launch ComfyUI"**.

---

### MuseTalk Realtime Lip-sync (port 8007)

40 FPS real-time lip-sync engine for action loops and streamer mode.

```bash
# Via Docker (recommended):
docker run -d --gpus all -p 8007:8007 musetalk-server:latest

# Or natively:
cd vendor/MuseTalk-Server
python server.py --port 8007
```

---

### KeySync Cached Lip-sync (port 8008)

2-stage latent diffusion lip-sync with VAE pre-vectorization. Ultra-fast broadcast inference.

```bash
docker run -d --gpus all -p 8008:8008 keysync-server:latest
```

---

### Ollama (Local LLM fallback, port 11434)

Used when `LLM_PROVIDER=ollama` in `.env`.

```bash
ollama serve
ollama pull qwen3.5:9b
```

---

## ComfyUI Workflow System

All workflows live in `comfy_workflows/video/`. The `workflowBuilder.ts` dynamically selects and patches the correct JSON at runtime based on the `model` parameter passed to `POST /api/presenter/generate-scene`.

| Model param | Workflow file | Use case |
|---|---|---|
| `1.3b` | `infinitetalk_1.3b_i2v.json` | Fast lip-sync (default) |
| `14b` | `infinitetalk_14b_i2v.json` | High-quality lip-sync |
| `ltx` / `eros` / `sulphur` | `ltx_video_unified.json` | LTX Video 2.5 variants |
| `echomimic` | `echomimic_v3_flash_api.json` | EchoMimic V3 |
| `hunyuan` | `hunyuanvideo_1.5_i2v.json` | HunyuanVideo 1.5 |
| `minimax` | `minimax_h3_video.json` | MiniMax H3 |
| `wan` | `wan_video_alpha_unified.json` | Wan 2.1 |
| `musetalk` | MuseTalk microservice (port 8007) | Realtime 350+ FPS TensorRT / NVENC |

---

## Key Features

- **Newsroom Dashboard** — RSS ingestion, story pipeline, one-click studio launch
- **6 Studio Production Modes** — Interview, Podcast, VTuber, Localization Matrix, Data Graphics, Narrative Matrix (accessed via `✨ Studios ▾` on story cards)
- **Field Reporter & Roundtable Studios** — Outdoor and panel production modes
- **Persona Vault** — 48 pre-built AI anchor personas with voice/visual configs
- **Voice Studio** — Multi-engine TTS (Piper, F5-TTS, StyleTTS2, CosyVoice) with voice preview
- **Voice Cloning Lab** — Teleprompter recorder + Piper ONNX voice dataset exporter
- **Wardrobe Studio** — Probabilistic attire system with LoRA-based wardrobe generation
- **Thumbnail Builder** — AI-generated viral thumbnails via Gemini Imagen
- **Prompt Builder** — ComfyUI workflow prompt compiler with preset registry
- **Pipeline Queue** — Real-time job monitor with GPU telemetry
- **Interactive CVI Call** — Live AI anchor conversation via browser WebRTC + Ollama
- **Localization Matrix** — 6-language auto-translation powered by Gemini (es_AR, en_US, pt_BR, de_DE, fr_FR, ja_JP)
- **Fact-Checking Engine** — Gemini-powered script verification with CitationBadge overlay
- **Admin Dashboard** — Multi-tenant org management, scheduler, access requests, usage telemetry

---

## Cloud Deployment & Custom Domain Cost Caveats

Before assigning a custom domain to the live Railway deployment (`https://newsstudio.up.railway.app`), review [`docs/CLOUD_PRICING_AND_WORKER_HOSTING.md`](./docs/CLOUD_PRICING_AND_WORKER_HOSTING.md). In particular:

1. **Serve R2 Directly via Custom Domain (Avoid Railway `\$0.05/GB` Egress)**: Currently, `next.config.ts` (`rewrites()`) and `src/remotion/utils/resolveSrc.ts` proxy `/r2/*`, `/assets/*`, and `/avatars/*` through Railway for same-origin loading on `*.up.railway.app`. Once you attach a domain, bind a CDN subdomain (e.g., `cdn.yourdomain.com`) directly to the R2 bucket in Cloudflare, allow `GET, HEAD, Range` CORS from your app origin (exposing `Content-Range, Accept-Ranges, Content-Length, ETag`), point `NEXT_PUBLIC_S3_PUBLIC_URL` at `https://cdn.yourdomain.com`, and remove the media proxy rewrites so video streaming incurs **\$0/GB egress**.
2. **Cloudflare Cache Rules & SSL `Full (strict)`**: Enable a Cloudflare Cache Rule (`Cache Everything`) on `cdn.yourdomain.com` so repeat video/image loads don't consume R2's `10M/mo` free Class B reads. On `app.yourdomain.com`, use DNS-only or SSL/TLS **`Full (strict)`** (never `Flexible`) with cache bypass on `/api/*` and `/_next/data/*`.
3. **Rebuild After Updating `NEXT_PUBLIC_*` & `MAIN_APP_URL`**: `Dockerfile` bakes `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_S3_PUBLIC_URL`, and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` during `npm run build`. Trigger a Railway rebuild after changing them, and update `MAIN_APP_URL` in worker `.env` files.
4. **Update CSP Before Enabling Clerk `pk_live_`**: Production Clerk uses custom subdomains (`clerk.yourdomain.com`, `accounts.yourdomain.com`) rather than `*.clerk.accounts.dev`. Add them (plus `cdn.yourdomain.com`) to `Content-Security-Policy` and `images.remotePatterns` in `next.config.ts` before switching keys, and monitor Clerk B2B seat thresholds.
5. **Do Not Point External Uptime Pingers at `/api/health`**: Frequent HTTP health probes prevent Railway `sleepApplication: true` from sleeping and waste compute credits.
6. **Keep R2 Action Loops Selective & Enforce `temp/` Lifecycle**: Add a 7-day R2 Lifecycle expiration rule on `temp/` alongside selective action-loop uploads (`< 10 GB` free storage cap).

---

## Documentation

| Document | Purpose |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | **Single source of truth** for AI coding agents & project architecture |
| [`ROADMAP.md`](./ROADMAP.md) | Master Product Roadmap — sprint plan, completed features & backlog |
| [`docs/CLOUD_PRICING_AND_WORKER_HOSTING.md`](./docs/CLOUD_PRICING_AND_WORKER_HOSTING.md) | Long-run R2/Railway/Supabase pricing, custom domain caveats & online NewsStudio/CineZero worker hosting |
| [`docs/REALTIME_LIPSYNC_OPTIMIZATION_SERIES.md`](./docs/REALTIME_LIPSYNC_OPTIMIZATION_SERIES.md) | **MuseTalk Real-Time Lip-Sync Optimization Series** (351.6 FPS, TensorRT FP8/FP16, NVENC) |
| [`docs/architecture.md`](./docs/architecture.md) | Pipeline data flow, microservice ports & health check architecture |
| [`docs/MODERN_TTS_WALKTHROUGH.md`](./docs/MODERN_TTS_WALKTHROUGH.md) | Modern-TTS-Server engine hub setup & voice model guide |
| [`docs/AZURE.md`](./docs/AZURE.md) | Azure cloud deployment, Bicep IaC, Service Bus & cost optimization |
| [`docs/HARDWARE.md`](./docs/HARDWARE.md) | VRAM benchmarks (M4 Mac Mini, RTX GPUs, Azure A10) |
| [`docs/LOOP_ARCHITECTURE.md`](./docs/LOOP_ARCHITECTURE.md) | Action loop FSM, MuseTalk pre-vectorization & state machine architecture |
| [`docs/PIPELINE.md`](./docs/PIPELINE.md) | Full pipeline worker architecture & job lifecycle |
| [`comfy_workflows/README.md`](./comfy_workflows/README.md) | ComfyUI model downloads & workflow setup |
