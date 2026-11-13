import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SyncedVideoExporter } from "../useSyncedVideoExporter";
import { LiveAnchorStageEngine } from "../liveAnchorStageEngine";
import { ActionLoopTransitionController } from "../actionLoopTransitionController";

describe("SyncedVideoExporter & LiveAnchorStageEngine Video Export", () => {
  let originalFetch: typeof global.fetch;
  let originalAudioContext: typeof window.AudioContext;
  let originalMediaRecorder: typeof window.MediaRecorder;
  let originalMediaStream: typeof window.MediaStream;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let originalRequestAnimationFrame: typeof window.requestAnimationFrame;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalAudioContext = window.AudioContext;
    originalMediaRecorder = window.MediaRecorder;
    originalMediaStream = window.MediaStream;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    originalRequestAnimationFrame = window.requestAnimationFrame;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    window.AudioContext = originalAudioContext;
    window.MediaRecorder = originalMediaRecorder;
    window.MediaStream = originalMediaStream;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    vi.restoreAllMocks();
  });

  it("initializes WebGL2 context with preserveDrawingBuffer: true in LiveAnchorStageEngine", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;

    const getContextSpy = vi.spyOn(canvas, "getContext").mockReturnValue(null);
    const engine = new LiveAnchorStageEngine(canvas, null, {
      personaId: "ruby",
      enableAutoMotion: false,
    });
    await engine.init();

    expect(getContextSpy).toHaveBeenCalledWith(
      "webgl2",
      expect.objectContaining({
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
      })
    );
    engine.dispose();
  });

  it("always composites stageCanvas onto an even-dimensioned 2D exportCanvas and pre-renders frame 0 before recorder.start", async () => {
    const stageCanvas = document.createElement("canvas");
    // Use an odd width/height to verify even-dimension rounding (e.g., 1025 -> 1024)
    stageCanvas.width = 1025;
    stageCanvas.height = 1025;

    const callOrder: string[] = [];
    const drawImageSources: CanvasImageSource[] = [];
    const fillRectCalls: Array<[number, number, number, number]> = [];

    const mock2dCtx = {
      fillStyle: "",
      fillRect: vi.fn((x: number, y: number, w: number, h: number) => {
        fillRectCalls.push([x, y, w, h]);
      }),
      clearRect: vi.fn(),
      drawImage: vi.fn((src: CanvasImageSource) => {
        drawImageSources.push(src);
        callOrder.push("ctx.drawImage");
      }),
    } as unknown as CanvasRenderingContext2D;

    const requestFrameSpy = vi.fn();
    const mockVideoTrack = { kind: "video", requestFrame: requestFrameSpy } as unknown as MediaStreamTrack;
    const mockAudioTrack = { kind: "audio" } as unknown as MediaStreamTrack;

    const origCreateElement = document.createElement.bind(document);
    let createdExportCanvas: HTMLCanvasElement | null = null;
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      const el = origCreateElement(tagName);
      if (tagName.toLowerCase() === "canvas") {
        createdExportCanvas = el as HTMLCanvasElement;
        vi.spyOn(el as HTMLCanvasElement, "getContext").mockImplementation(((contextId: string) => {
          if (contextId === "2d") return mock2dCtx;
          return null;
        }) as unknown as typeof HTMLCanvasElement.prototype.getContext);
        (el as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream = vi.fn(
          () =>
            ({
              getVideoTracks: () => [mockVideoTrack],
              getAudioTracks: () => [],
            }) as unknown as MediaStream
        );
      } else if (tagName.toLowerCase() === "a") {
        vi.spyOn(el as HTMLAnchorElement, "click").mockImplementation(() => {});
      }
      return el;
    }) as typeof document.createElement);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(128),
    } as Response);

    let simulatedAudioTime = 0;
    const closeAudioCtxSpy = vi.fn().mockResolvedValue(undefined);
    const resumeAudioCtxSpy = vi.fn().mockResolvedValue(undefined);

    class MockAudioContext {
      public state = "suspended";
      public get currentTime() {
        return simulatedAudioTime;
      }
      public resume = resumeAudioCtxSpy;
      public close = closeAudioCtxSpy;
      public decodeAudioData = vi.fn().mockResolvedValue({
        duration: 0.05,
      });
      public createMediaStreamDestination = vi.fn().mockReturnValue({
        stream: {
          getAudioTracks: () => [mockAudioTrack],
        },
      });
      public createBufferSource = vi.fn().mockReturnValue({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(() => {
          callOrder.push("audioSource.start");
        }),
        stop: vi.fn(),
      });
    }
    window.AudioContext = MockAudioContext as unknown as typeof AudioContext;

    class MockMediaStream {
      private tracks: MediaStreamTrack[];
      constructor(tracks?: MediaStreamTrack[]) {
        this.tracks = tracks ?? [];
      }
      getTracks() {
        return this.tracks;
      }
      getVideoTracks() {
        return this.tracks.filter((t) => t.kind === "video");
      }
      getAudioTracks() {
        return this.tracks.filter((t) => t.kind === "audio");
      }
    }
    window.MediaStream = MockMediaStream as unknown as typeof MediaStream;

    class MockMediaRecorder {
      public static isTypeSupported = vi.fn((mime: string) => mime.startsWith("video/mp4"));
      public state: "inactive" | "recording" = "inactive";
      public ondataavailable: ((e: { data: Blob }) => void) | null = null;
      public onstop: (() => void) | null = null;
      public onerror: ((e: unknown) => void) | null = null;

      public start = vi.fn(() => {
        callOrder.push("recorder.start");
        this.state = "recording";
      });

      public stop = vi.fn(() => {
        callOrder.push("recorder.stop");
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob([new Uint8Array([1, 2, 3, 4])], { type: "video/mp4" }) });
        this.onstop?.();
      });
    }
    window.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

    URL.createObjectURL = vi.fn(() => "blob:http://localhost:3000/mock-video");
    URL.revokeObjectURL = vi.fn();

    let rafStep = 0;
    window.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafStep++;
      simulatedAudioTime = rafStep * 0.03;
      setTimeout(() => cb(performance.now() + rafStep * 30), 0);
      return rafStep;
    });

    const stageEngine = {
      clearExplicitViseme: vi.fn(() => {
        callOrder.push("stageEngine.clearExplicitViseme");
      }),
      setSpeaking: vi.fn(() => {
        callOrder.push("stageEngine.setSpeaking");
      }),
      setExportAudioTime: vi.fn((sec: number | null) => {
        callOrder.push(`stageEngine.setExportAudioTime(${sec === null ? "null" : sec.toFixed(2)})`);
      }),
      renderSingleFrame: vi.fn(() => {
        callOrder.push("stageEngine.renderSingleFrame");
      }),
    };

    const exporter = new SyncedVideoExporter();
    const result = await exporter.exportStageRecording({
      format: "mp4",
      fps: 60,
      stageCanvas,
      overlayCanvas: null,
      stageEngine,
      audioKey: "cli_voice_ruby",
      transparent: false,
    });

    expect(result.blob.size).toBeGreaterThan(0);
    expect(result.filename).toContain("ruby_stage_cli_voice_ruby_60fps_mp4");
    expect(createdExportCanvas).not.toBeNull();
    // Even dimensions enforced (1025 & ~1 === 1024)
    expect(createdExportCanvas!.width).toBe(1024);
    expect(createdExportCanvas!.height).toBe(1024);
    expect(resumeAudioCtxSpy).toHaveBeenCalled();

    // Verify frame 0 was rendered and drawn onto exportCanvas BEFORE recorder.start
    const recorderStartIdx = callOrder.indexOf("recorder.start");
    const firstRenderIdx = callOrder.indexOf("stageEngine.renderSingleFrame");
    const firstDrawIdx = callOrder.indexOf("ctx.drawImage");
    expect(recorderStartIdx).toBeGreaterThan(0);
    expect(firstRenderIdx).toBeGreaterThanOrEqual(0);
    expect(firstRenderIdx).toBeLessThan(recorderStartIdx);
    expect(firstDrawIdx).toBeGreaterThanOrEqual(0);
    expect(firstDrawIdx).toBeLessThan(recorderStartIdx);

    // Verify stageCanvas was drawn onto exportCanvas and solid black backdrop was filled for non-transparent MP4
    expect(drawImageSources).toContain(stageCanvas);
    expect(fillRectCalls.length).toBeGreaterThan(0);
    expect(fillRectCalls[0]).toEqual([0, 0, 1024, 1024]);

    // Verify exportAudioTime was reset to null at end of export
    expect(stageEngine.setExportAudioTime).toHaveBeenLastCalledWith(null);
    expect(closeAudioCtxSpy).toHaveBeenCalled();
  });

  it("composites overlayCanvas and uses clearRect when exporting transparent WebM", async () => {
    const stageCanvas = document.createElement("canvas");
    stageCanvas.width = 544;
    stageCanvas.height = 960;

    const overlayCanvas = document.createElement("canvas");
    overlayCanvas.width = 544;
    overlayCanvas.height = 960;

    const drawImageSources: CanvasImageSource[] = [];
    const clearRectCalls: Array<[number, number, number, number]> = [];
    const fillRectCalls: Array<[number, number, number, number]> = [];

    const mock2dCtx = {
      fillStyle: "",
      fillRect: vi.fn((x: number, y: number, w: number, h: number) => {
        fillRectCalls.push([x, y, w, h]);
      }),
      clearRect: vi.fn((x: number, y: number, w: number, h: number) => {
        clearRectCalls.push([x, y, w, h]);
      }),
      drawImage: vi.fn((src: CanvasImageSource) => {
        drawImageSources.push(src);
      }),
    } as unknown as CanvasRenderingContext2D;

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      const el = origCreateElement(tagName);
      if (tagName.toLowerCase() === "canvas") {
        vi.spyOn(el as HTMLCanvasElement, "getContext").mockImplementation(((contextId: string) => {
          if (contextId === "2d") return mock2dCtx;
          return null;
        }) as unknown as typeof HTMLCanvasElement.prototype.getContext);
        (el as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream = vi.fn(
          () =>
            ({
              getVideoTracks: () => [{ kind: "video" } as unknown as MediaStreamTrack],
              getAudioTracks: () => [],
            }) as unknown as MediaStream
        );
      } else if (tagName.toLowerCase() === "a") {
        vi.spyOn(el as HTMLAnchorElement, "click").mockImplementation(() => {});
      }
      return el;
    }) as typeof document.createElement);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(128),
    } as Response);

    let simulatedAudioTime = 0;
    class MockAudioContext {
      public state = "running";
      public get currentTime() {
        return simulatedAudioTime;
      }
      public close = vi.fn().mockResolvedValue(undefined);
      public decodeAudioData = vi.fn().mockResolvedValue({ duration: 0.04 });
      public createMediaStreamDestination = vi.fn().mockReturnValue({
        stream: { getAudioTracks: () => [{ kind: "audio" } as unknown as MediaStreamTrack] },
      });
      public createBufferSource = vi.fn().mockReturnValue({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      });
    }
    window.AudioContext = MockAudioContext as unknown as typeof AudioContext;

    class MockMediaStream {
      private tracks: MediaStreamTrack[];
      constructor(tracks?: MediaStreamTrack[]) {
        this.tracks = tracks ?? [];
      }
      getTracks() {
        return this.tracks;
      }
    }
    window.MediaStream = MockMediaStream as unknown as typeof MediaStream;

    class MockMediaRecorder {
      public static isTypeSupported = vi.fn((mime: string) => mime.startsWith("video/webm"));
      public state: "inactive" | "recording" = "inactive";
      public ondataavailable: ((e: { data: Blob }) => void) | null = null;
      public onstop: (() => void) | null = null;
      public onerror: ((e: unknown) => void) | null = null;
      public start = vi.fn(() => {
        this.state = "recording";
      });
      public stop = vi.fn(() => {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob([new Uint8Array([9, 8, 7])], { type: "video/webm" }) });
        this.onstop?.();
      });
    }
    window.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

    URL.createObjectURL = vi.fn(() => "blob:http://localhost:3000/mock-webm");
    URL.revokeObjectURL = vi.fn();

    let rafStep = 0;
    window.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafStep++;
      simulatedAudioTime = rafStep * 0.05;
      setTimeout(() => cb(performance.now() + rafStep * 50), 0);
      return rafStep;
    });

    const exporter = new SyncedVideoExporter();
    const res = await exporter.exportStageRecording({
      format: "webm",
      fps: 60,
      stageCanvas,
      overlayCanvas,
      audioKey: "user_hello",
      transparent: true,
    });

    expect(res.filename).toContain("_alpha_");
    expect(res.filename.endsWith(".webm")).toBe(true);
    expect(clearRectCalls.length).toBeGreaterThan(0);
    expect(fillRectCalls.length).toBe(0);
    expect(drawImageSources).toContain(stageCanvas);
    expect(drawImageSources).toContain(overlayCanvas);
  });

  it("throws an explicit error when stageCanvas is missing or audio fetch fails", async () => {
    const exporter = new SyncedVideoExporter();
    await expect(
      exporter.exportStageRecording({
        stageCanvas: null as unknown as HTMLCanvasElement,
        audioKey: "cli_voice_ruby",
      })
    ).rejects.toThrow("Stage canvas not available for recording.");

    const stageCanvas = document.createElement("canvas");
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await expect(
      exporter.exportStageRecording({
        stageCanvas,
        audioKey: "missing_audio",
      })
    ).rejects.toThrow("Failed to load audio");
  });

  it("continues pumping frames via setTimeout fallback when document.visibilityState is hidden and invokes onFrameTick", async () => {
    const stageCanvas = document.createElement("canvas");
    stageCanvas.width = 512;
    stageCanvas.height = 512;

    const mock2dCtx = {
      fillStyle: "",
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      const el = origCreateElement(tagName);
      if (tagName.toLowerCase() === "canvas") {
        vi.spyOn(el as HTMLCanvasElement, "getContext").mockImplementation(((contextId: string) => {
          if (contextId === "2d") return mock2dCtx;
          return null;
        }) as unknown as typeof HTMLCanvasElement.prototype.getContext);
        (el as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream = vi.fn(
          () =>
            ({
              getVideoTracks: () => [{ kind: "video" } as unknown as MediaStreamTrack],
              getAudioTracks: () => [],
            }) as unknown as MediaStream
        );
      } else if (tagName.toLowerCase() === "a") {
        vi.spyOn(el as HTMLAnchorElement, "click").mockImplementation(() => {});
      }
      return el;
    }) as typeof document.createElement);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(128),
    } as Response);

    let simulatedAudioTime = 0;
    class MockAudioContext {
      public state = "running";
      public get currentTime() {
        simulatedAudioTime += 0.025;
        return simulatedAudioTime;
      }
      public close = vi.fn().mockResolvedValue(undefined);
      public decodeAudioData = vi.fn().mockResolvedValue({ duration: 0.06 });
      public createMediaStreamDestination = vi.fn().mockReturnValue({
        stream: { getAudioTracks: () => [{ kind: "audio" } as unknown as MediaStreamTrack] },
      });
      public createBufferSource = vi.fn().mockReturnValue({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      });
    }
    window.AudioContext = MockAudioContext as unknown as typeof AudioContext;

    class MockMediaStream {
      private tracks: MediaStreamTrack[];
      constructor(tracks?: MediaStreamTrack[]) {
        this.tracks = tracks ?? [];
      }
      getTracks() {
        return this.tracks;
      }
    }
    window.MediaStream = MockMediaStream as unknown as typeof MediaStream;

    class MockMediaRecorder {
      public static isTypeSupported = vi.fn((mime: string) => mime.startsWith("video/mp4"));
      public state: "inactive" | "recording" = "inactive";
      public ondataavailable: ((e: { data: Blob }) => void) | null = null;
      public onstop: (() => void) | null = null;
      public onerror: ((e: unknown) => void) | null = null;
      public start = vi.fn(() => {
        this.state = "recording";
      });
      public stop = vi.fn(() => {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob([new Uint8Array([1, 2, 3])], { type: "video/mp4" }) });
        this.onstop?.();
      });
    }
    window.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

    URL.createObjectURL = vi.fn(() => "blob:http://localhost:3000/mock-hidden");
    URL.revokeObjectURL = vi.fn();

    // Simulate backgrounded tab where requestAnimationFrame never fires
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    window.requestAnimationFrame = vi.fn(() => 1);

    const frameTicks: number[] = [];
    const stageEngine = {
      clearExplicitViseme: vi.fn(),
      setSpeaking: vi.fn(),
      setExportAudioTime: vi.fn(),
      renderSingleFrame: vi.fn(),
    };

    const exporter = new SyncedVideoExporter();
    const res = await exporter.exportStageRecording({
      format: "mp4",
      fps: 60,
      stageCanvas,
      stageEngine,
      audioKey: "user_hello",
      onFrameTick: (sec) => frameTicks.push(sec),
    });

    expect(res.blob.size).toBeGreaterThan(0);
    expect(frameTicks[0]).toBe(0);
    expect(frameTicks.length).toBeGreaterThanOrEqual(2);
    expect(stageEngine.renderSingleFrame).toHaveBeenCalledTimes(frameTicks.length + 1);
  });

  it("wraps targetTimeSec modulo video duration in ActionLoopTransitionController.syncTime", () => {
    const controller = new ActionLoopTransitionController();
    controller.transitionTo("/assets/test_loop.mp4");
    const vid = controller.getActiveVideo()!;
    expect(vid).not.toBeNull();
    Object.defineProperty(vid, "duration", { value: 4.0, configurable: true });
    vid.currentTime = 1.25;

    // targetTimeSec = 9.25s on a 4.0s looping video should wrap to 1.25s (diff = 0 -> no seek)
    controller.syncTime(9.25);
    expect(vid.currentTime).toBeCloseTo(1.25, 3);

    // targetTimeSec = 10.5s on a 4.0s looping video should wrap to 2.5s (diff > 0.08 -> seek to 2.5s)
    controller.syncTime(10.5);
    expect(vid.currentTime).toBeCloseTo(2.5, 3);
    controller.destroy();
  });
});

