/**
 * workers/pipeline-worker/webrtcStreamingServer.ts
 *
 * WebRTC Low-Latency Streaming Session Manager
 *
 * Manages browser-to-worker WebRTC session state for the Interactive CVI Call feature.
 * Sessions are tracked in memory on the worker process. The Next.js app creates sessions
 * via POST /api/interactive/session, the worker picks them up, and the browser connects
 * using standard WebRTC browser APIs (no separate media server required for 1:1 calls).
 *
 * Architecture:
 *   Browser ──[WebRTC DataChannel/MediaStream]──> Pipeline Worker
 *   Pipeline Worker ──[MuseTalk/Ollama/TTS]──> Browser
 *
 * For scale-out, replace the in-memory session map with a Redis-backed store.
 */

import { createLogger } from "@/lib/logger";

const log = createLogger("worker:webrtcStreamingServer");

export interface WebRTCSessionConfig {
  sessionId: string;
  personaId: string;
  roomName: string;
  musetalkUrl?: string;
  ollamaUrl?: string;
}

export interface WebRTCSessionInfo {
  sessionId: string;
  personaId: string;
  roomName: string;
  status: "INITIALIZING" | "ACTIVE" | "ENDED" | "ERROR";
  startedAt: Date;
  lastHeartbeat: Date;
  /** STUN/TURN ICE configuration for the browser client */
  iceServers: RTCIceServer[];
}

// In-memory session registry (single-worker scope)
const activeSessions = new Map<string, WebRTCSessionInfo>();

/** Default public STUN servers — no auth required */
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/**
 * Initializes a WebRTC session entry in the registry.
 * Returns session info including ICE servers for the browser to use.
 */
export function initWebRTCSession(config: WebRTCSessionConfig): WebRTCSessionInfo {
  log.info(`📡 [WebRTCServer] Initializing session for persona: ${config.personaId} | room: ${config.roomName}`);

  const iceServers = buildIceServers();

  const session: WebRTCSessionInfo = {
    sessionId: config.sessionId,
    personaId: config.personaId,
    roomName: config.roomName,
    status: "INITIALIZING",
    startedAt: new Date(),
    lastHeartbeat: new Date(),
    iceServers,
  };

  activeSessions.set(config.sessionId, session);

  // Auto-mark as ACTIVE after handshake window
  setTimeout(() => {
    const s = activeSessions.get(config.sessionId);
    if (s && s.status === "INITIALIZING") {
      s.status = "ACTIVE";
      log.info(`📡 [WebRTCServer] Session ${config.sessionId} marked ACTIVE`);
    }
  }, 2000);

  return session;
}

/**
 * Updates the heartbeat timestamp for a session.
 * Called periodically to keep sessions alive and detect dropped connections.
 */
export function heartbeatWebRTCSession(sessionId: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) return false;
  session.lastHeartbeat = new Date();
  return true;
}

/**
 * Terminates a session and removes it from the registry.
 */
export function endWebRTCSession(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.status = "ENDED";
    activeSessions.delete(sessionId);
    log.info(`📡 [WebRTCServer] Session ${sessionId} ended.`);
  }
}

/**
 * Returns the current info for an active session.
 */
export function getWebRTCSession(sessionId: string): WebRTCSessionInfo | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Lists all currently active sessions (for monitoring/telemetry).
 */
export function listActiveSessions(): WebRTCSessionInfo[] {
  return Array.from(activeSessions.values());
}

/**
 * Prunes sessions that haven't sent a heartbeat in > 30 seconds.
 * Call this on a periodic interval from the worker's main loop.
 */
export function pruneStaleWebRTCSessions(): number {
  const cutoff = Date.now() - 30_000;
  let pruned = 0;
  for (const [id, session] of activeSessions) {
    if (session.lastHeartbeat.getTime() < cutoff) {
      console.warn(`📡 [WebRTCServer] Pruning stale session: ${id}`);
      activeSessions.delete(id);
      pruned++;
    }
  }
  return pruned;
}

/**
 * Builds the ICE server list. Adds a TURN relay if configured via env vars.
 */
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [...DEFAULT_ICE_SERVERS];

  const turnUrl = process.env.TURN_SERVER_URL;
  const turnUser = process.env.TURN_SERVER_USERNAME;
  const turnCredential = process.env.TURN_SERVER_CREDENTIAL;

  if (turnUrl && turnUser && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnCredential,
    });
    log.info(`📡 [WebRTCServer] TURN relay configured: ${turnUrl}`);
  }

  return servers;
}

// RTCIceServer type shim for Node.js (browser type not available in worker context)
interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}
