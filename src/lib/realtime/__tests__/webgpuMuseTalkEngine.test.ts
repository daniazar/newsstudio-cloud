import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebGPUMuseTalkEngine, OrtGlobal, OrtSession } from "../webgpuMuseTalkEngine";

describe("WebGPUMuseTalkEngine", () => {
  let originalNavigator: unknown;
  let originalWindow: unknown;
  let originalCaches: unknown;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalNavigator = globalThis.navigator;
    originalWindow = globalThis.window;
    originalCaches = (globalThis as unknown as { caches?: unknown }).caches;
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
    (globalThis as unknown as { caches?: unknown }).caches = originalCaches;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("provides a singleton instance", () => {
    const instance1 = WebGPUMuseTalkEngine.getInstance();
    const instance2 = WebGPUMuseTalkEngine.getInstance();
    expect(instance1).toBe(instance2);
  });

  it("reports initial status as not initialized", () => {
    const engine = new WebGPUMuseTalkEngine();
    const status = engine.getStatus();
    expect(status.isInitialized).toBe(false);
    expect(status.isInitializing).toBe(false);
    expect(status.error).toBeNull();
  });

  it("throws descriptive error when WebGPU is not supported in the environment", async () => {
    const engine = new WebGPUMuseTalkEngine();
    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: { gpu: undefined },
      configurable: true,
      writable: true,
    });

    await expect(engine.initialize()).rejects.toThrow(
      "WebGPU is not supported in this browser environment."
    );
  });

  it("omits powerPreference on Windows to prevent crbug.com/369219127 console warning", async () => {
    const engine = new WebGPUMuseTalkEngine();

    const requestAdapterMock = vi.fn().mockResolvedValue({
      features: new Set(["shader-f16"]),
      limits: {
        maxBufferSize: 1024 * 1024 * 1024,
        maxStorageBufferBindingSize: 1024 * 1024 * 1024,
      },
      info: { device: "NVIDIA GeForce RTX 5090" },
      requestDevice: vi.fn().mockResolvedValue({}),
    });

    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0",
        platform: "Win32",
        gpu: { requestAdapter: requestAdapterMock },
      },
      configurable: true,
      writable: true,
    });

    // Provide pre-loaded ort to test adapter request options in isolation
    const mockOrt: OrtGlobal = {
      env: { webgpu: { device: null } },
      InferenceSession: {
        create: vi.fn().mockResolvedValue({
          inputNames: ["latent", "whisper"],
          run: vi.fn().mockResolvedValue({}),
        } as OrtSession),
      },
      Tensor: vi.fn() as unknown as OrtGlobal["Tensor"],
    };
    (globalThis.window as unknown as { ort: OrtGlobal }).ort = mockOrt;

    // Mock fetch for model downloads
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "100" }),
      body: {
        getReader: () => {
          let readOnce = false;
          return {
            read: () => {
              if (readOnce) return Promise.resolve({ done: true, value: undefined });
              readOnce = true;
              return Promise.resolve({ done: false, value: new Uint8Array(100) });
            },
          };
        },
      },
    } as unknown as Response);

    await engine.initialize({ precision: "fp32", prewarm: false });

    expect(requestAdapterMock).toHaveBeenCalledWith({});
    expect(mockOrt.InferenceSession.create).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      expect.objectContaining({
        executionProviders: [
          { name: "webgpu", deviceType: "gpu", device: expect.any(Object) },
          "wasm",
        ],
      })
    );
  });

  it("passes high-performance powerPreference on non-Windows platforms", async () => {
    const engine = new WebGPUMuseTalkEngine();

    const requestAdapterMock = vi.fn().mockResolvedValue({
      features: new Set([]),
      limits: {
        maxBufferSize: 512 * 1024 * 1024,
        maxStorageBufferBindingSize: 512 * 1024 * 1024,
      },
      info: { device: "Apple M3 Max" },
      requestDevice: vi.fn().mockResolvedValue({}),
    });

    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        platform: "MacIntel",
        gpu: { requestAdapter: requestAdapterMock },
      },
      configurable: true,
      writable: true,
    });

    const mockOrt: OrtGlobal = {
      env: { webgpu: { device: null } },
      InferenceSession: {
        create: vi.fn().mockResolvedValue({
          inputNames: ["latent", "whisper"],
          run: vi.fn().mockResolvedValue({}),
        } as OrtSession),
      },
      Tensor: vi.fn() as unknown as OrtGlobal["Tensor"],
    };
    (globalThis.window as unknown as { ort: OrtGlobal }).ort = mockOrt;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "50" }),
      body: {
        getReader: () => {
          let readOnce = false;
          return {
            read: () => {
              if (readOnce) return Promise.resolve({ done: true, value: undefined });
              readOnce = true;
              return Promise.resolve({ done: false, value: new Uint8Array(50) });
            },
          };
        },
      },
    } as unknown as Response);

    await engine.initialize({ precision: "fp32", prewarm: false });

    expect(requestAdapterMock).toHaveBeenCalledWith({
      powerPreference: "high-performance",
    });
    expect(mockOrt.InferenceSession.create).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      expect.objectContaining({
        executionProviders: [
          { name: "webgpu", deviceType: "gpu", device: expect.any(Object), powerPreference: "high-performance" },
          "wasm",
        ],
        logSeverityLevel: 3,
      })
    );
  });

  it("loadOrt returns window.ort directly if already populated", async () => {
    const engine = new WebGPUMuseTalkEngine();
    const mockOrt: OrtGlobal = {
      env: { webgpu: { device: null } },
      InferenceSession: {
        create: vi.fn(),
      },
      Tensor: vi.fn() as unknown as OrtGlobal["Tensor"],
    };

    Object.defineProperty(globalThis, "window", {
      value: { ort: mockOrt },
      configurable: true,
      writable: true,
    });

    const ort = await engine.loadOrt();
    expect(ort).toBe(mockOrt);
  });

  it("falls back gracefully from FP16 to standard model if FP16 model returns 404", async () => {
    const engine = new WebGPUMuseTalkEngine();

    const requestAdapterMock = vi.fn().mockResolvedValue({
      features: new Set(["shader-f16"]),
      limits: {
        maxBufferSize: 1024 * 1024 * 1024,
        maxStorageBufferBindingSize: 1024 * 1024 * 1024,
      },
      info: { device: "NVIDIA RTX" },
      requestDevice: vi.fn().mockResolvedValue({}),
    });

    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: "Windows",
        gpu: { requestAdapter: requestAdapterMock },
      },
      configurable: true,
      writable: true,
    });

    const mockOrt: OrtGlobal = {
      env: { webgpu: { device: null } },
      InferenceSession: {
        create: vi.fn().mockResolvedValue({
          inputNames: ["latent", "whisper"],
          run: vi.fn().mockResolvedValue({}),
        } as OrtSession),
      },
      Tensor: vi.fn() as unknown as OrtGlobal["Tensor"],
    };
    (globalThis.window as unknown as { ort: OrtGlobal }).ort = mockOrt;

    const fetchedUrls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      fetchedUrls.push(url);
      if (url.includes("_fp16.onnx")) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "content-length": "64" }),
        body: {
          getReader: () => {
            let done = false;
            return {
              read: () => {
                if (done) return Promise.resolve({ done: true, value: undefined });
                done = true;
                return Promise.resolve({ done: false, value: new Uint8Array(64) });
              },
            };
          },
        },
      } as unknown as Response);
    });

    const stages: string[] = [];
    await engine.initialize({
      precision: "fp16",
      unetUrl: "/models/musetalk/musetalk_unet_fp16.onnx",
      vaeUrl: "/models/musetalk/vae_decoder_fp16.onnx",
      prewarm: false,
      onProgress: (_pct, stage) => stages.push(stage),
    });

    // Verify it attempted custom _fp16.onnx first and fell back to standard .onnx
    expect(fetchedUrls).toContain("/models/musetalk/musetalk_unet_fp16.onnx");
    expect(fetchedUrls).toContain("/models/musetalk/musetalk_unet.onnx");
    expect(fetchedUrls).toContain("/models/musetalk/vae_decoder_fp16.onnx");
    expect(fetchedUrls).toContain("/models/musetalk/vae_decoder.onnx");
    expect(engine.getStatus().isInitialized).toBe(true);
    expect(engine.getStatus().precision).toBe("fp32");
  });

  it("loads standard verified ONNX models directly without 404 network attempts when initialized by default", async () => {
    const engine = new WebGPUMuseTalkEngine();

    const requestAdapterMock = vi.fn().mockResolvedValue({
      features: new Set(["shader-f16"]),
      limits: {
        maxBufferSize: 1024 * 1024 * 1024,
        maxStorageBufferBindingSize: 1024 * 1024 * 1024,
      },
      info: { device: "NVIDIA RTX" },
      requestDevice: vi.fn().mockResolvedValue({}),
    });

    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: "Windows",
        gpu: { requestAdapter: requestAdapterMock },
      },
      configurable: true,
      writable: true,
    });

    const mockOrt: OrtGlobal = {
      env: { webgpu: { device: null } },
      InferenceSession: {
        create: vi.fn().mockResolvedValue({
          inputNames: ["latent", "whisper"],
          run: vi.fn().mockResolvedValue({}),
        } as OrtSession),
      },
      Tensor: vi.fn() as unknown as OrtGlobal["Tensor"],
    };
    (globalThis.window as unknown as { ort: OrtGlobal }).ort = mockOrt;

    const fetchedUrls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      fetchedUrls.push(url);
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "content-length": "64" }),
        body: {
          getReader: () => {
            let done = false;
            return {
              read: () => {
                if (done) return Promise.resolve({ done: true, value: undefined });
                done = true;
                return Promise.resolve({ done: false, value: new Uint8Array(64) });
              },
            };
          },
        },
      } as unknown as Response);
    });

    await engine.initialize({
      precision: "fp16",
      prewarm: false,
    });

    // Verify it loads verified on-disk models directly without attempting non-existent _fp16.onnx
    expect(fetchedUrls).toEqual([
      "/models/musetalk/musetalk_unet.onnx",
      "/models/musetalk/vae_decoder.onnx",
    ]);
    expect(fetchedUrls).not.toContain("/models/musetalk/musetalk_unet_fp16.onnx");
    expect(engine.getStatus().isInitialized).toBe(true);
    expect(engine.getStatus().precision).toBe("fp32");
  });

  it("pre-warms compute shaders when prewarm is true", async () => {
    const engine = new WebGPUMuseTalkEngine();

    const requestAdapterMock = vi.fn().mockResolvedValue({
      features: new Set([]),
      limits: {
        maxBufferSize: 512 * 1024 * 1024,
        maxStorageBufferBindingSize: 512 * 1024 * 1024,
      },
      info: { device: "NVIDIA GPU" },
      requestDevice: vi.fn().mockResolvedValue({}),
    });

    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: "Windows",
        gpu: { requestAdapter: requestAdapterMock },
      },
      configurable: true,
      writable: true,
    });

    const unetRunMock = vi.fn().mockResolvedValue({});
    const vaeRunMock = vi.fn().mockResolvedValue({});

    const mockTensor = vi.fn().mockImplementation(function (this: { type: string; data: Float32Array; dims: number[] }, type: string, data: Float32Array, dims: number[]) {
      this.type = type;
      this.data = data;
      this.dims = dims;
    });

    let createCount = 0;
    const mockOrt: OrtGlobal = {
      env: { webgpu: { device: null } },
      InferenceSession: {
        create: vi.fn().mockImplementation((_buf, _opts) => {
          createCount++;
          if (createCount === 1) {
            return Promise.resolve({
              inputNames: ["latent", "whisper"],
              run: unetRunMock,
            } as OrtSession);
          }
          return Promise.resolve({
            inputNames: ["latent"],
            run: vaeRunMock,
          } as OrtSession);
        }),
      },
      Tensor: mockTensor as unknown as OrtGlobal["Tensor"],
    };
    (globalThis.window as unknown as { ort: OrtGlobal }).ort = mockOrt;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "100" }),
      body: {
        getReader: () => {
          let done = false;
          return {
            read: () => {
              if (done) return Promise.resolve({ done: true, value: undefined });
              done = true;
              return Promise.resolve({ done: false, value: new Uint8Array(100) });
            },
          };
        },
      },
    } as unknown as Response);

    await engine.initialize({
      precision: "fp32",
      batchSize: 2,
      prewarm: true,
    });

    expect(unetRunMock).toHaveBeenCalledTimes(1);
    expect(vaeRunMock).toHaveBeenCalledTimes(1);
  });

  it("clears persistent Cache API cache on clearCache()", async () => {
    const engine = new WebGPUMuseTalkEngine();
    const deleteMock = vi.fn().mockResolvedValue(true);

    Object.defineProperty(globalThis, "window", {
      value: { caches: { delete: deleteMock } },
      configurable: true,
      writable: true,
    });
    (globalThis as unknown as { caches?: unknown }).caches = { delete: deleteMock };

    await engine.clearCache();
    expect(deleteMock).toHaveBeenCalledWith("musetalk-webgpu-v1");
  });

  it("records error in getStatus() when initialization throws", async () => {
    const engine = new WebGPUMuseTalkEngine();
    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: { gpu: undefined },
      configurable: true,
      writable: true,
    });

    await expect(engine.initialize()).rejects.toThrow();
    expect(engine.getStatus().error).toBe("WebGPU is not supported in this browser environment.");
  });

  it("continues in-memory without throwing when caches.put() throws QuotaExceededError", async () => {
    const engine = new WebGPUMuseTalkEngine();

    const requestAdapterMock = vi.fn().mockResolvedValue({
      features: new Set([]),
      limits: {
        maxBufferSize: 512 * 1024 * 1024,
        maxStorageBufferBindingSize: 512 * 1024 * 1024,
      },
      info: { device: "NVIDIA GPU" },
      requestDevice: vi.fn().mockResolvedValue({}),
    });

    const mockPut = vi.fn().mockRejectedValue(new Error("QuotaExceededError"));
    const mockCache = {
      match: vi.fn().mockResolvedValue(null),
      put: mockPut,
    };

    Object.defineProperty(globalThis, "window", {
      value: {
        caches: {
          open: vi.fn().mockResolvedValue(mockCache),
        },
      },
      configurable: true,
      writable: true,
    });
    (globalThis as unknown as { caches?: unknown }).caches = {
      open: vi.fn().mockResolvedValue(mockCache),
    };

    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: "Windows",
        gpu: { requestAdapter: requestAdapterMock },
      },
      configurable: true,
      writable: true,
    });

    const mockOrt: OrtGlobal = {
      env: { webgpu: { device: null } },
      InferenceSession: {
        create: vi.fn().mockResolvedValue({
          inputNames: ["latent", "whisper"],
          run: vi.fn().mockResolvedValue({}),
        } as OrtSession),
      },
      Tensor: vi.fn() as unknown as OrtGlobal["Tensor"],
    };
    (globalThis.window as unknown as { ort: OrtGlobal }).ort = mockOrt;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "100" }),
      body: {
        getReader: () => {
          let done = false;
          return {
            read: () => {
              if (done) return Promise.resolve({ done: true, value: undefined });
              done = true;
              return Promise.resolve({ done: false, value: new Uint8Array(100) });
            },
          };
        },
      },
    } as unknown as Response);

    // Initialization should succeed despite QuotaExceededError
    await expect(engine.initialize({ precision: "fp32", prewarm: false })).resolves.toBe(true);
    expect(engine.getStatus().isInitialized).toBe(true);
    expect(mockPut).toHaveBeenCalled();
  });

  it("shares single promise across concurrent loadOrt() calls", async () => {
    const engine = new WebGPUMuseTalkEngine();
    const mockOrt: OrtGlobal = {
      env: { wasm: {}, webgpu: { device: null } },
      InferenceSession: { create: vi.fn() },
      Tensor: vi.fn() as unknown as OrtGlobal["Tensor"],
    };

    Object.defineProperty(globalThis, "window", {
      value: { ort: mockOrt },
      configurable: true,
      writable: true,
    });

    const [res1, res2] = await Promise.all([engine.loadOrt(), engine.loadOrt()]);
    expect(res1).toBe(res2);
    expect(res1).toBe(mockOrt);
    expect(res1.env.wasm?.wasmPaths).toBe("/ort/");
  });

  it("waits for in-flight existing script tag to complete before resolving loadOrt", async () => {
    const engine = new WebGPUMuseTalkEngine();

    const mockOrt: OrtGlobal = {
      env: { wasm: {}, webgpu: { device: null } },
      InferenceSession: { create: vi.fn() },
      Tensor: vi.fn() as unknown as OrtGlobal["Tensor"],
    };

    const listeners: Record<string, () => void> = {};
    const mockScriptElement = {
      addEventListener: vi.fn((event: string, callback: () => void) => {
        listeners[event] = callback;
      }),
      removeEventListener: vi.fn(),
    };

    const mockDocument = {
      querySelector: vi.fn().mockReturnValue(mockScriptElement),
      createElement: vi.fn(),
      head: { appendChild: vi.fn() },
    };

    Object.defineProperty(globalThis, "document", {
      value: mockDocument,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
      writable: true,
    });

    // Start loadScript directly - should wait for script tag load event
    let resolved = false;
    const loadPromise = (engine as unknown as { loadScript: (src: string) => Promise<void> })
      .loadScript("/ort/ort.webgpu.min.js")
      .then(() => {
        resolved = true;
      });

    // In the meantime, it shouldn't have resolved immediately
    await new Promise((r) => setTimeout(r, 10));
    expect(resolved).toBe(false);

    // Simulate script finishing: attach ort to window and fire load event
    (globalThis.window as unknown as { ort: OrtGlobal }).ort = mockOrt;
    listeners["load"]?.();

    await loadPromise;
    expect(resolved).toBe(true);
    expect(mockScriptElement.addEventListener).toHaveBeenCalledWith("load", expect.any(Function), { once: true });
  });

  it("tolerates shader pre-warm error gracefully without failing initialization", async () => {
    const engine = new WebGPUMuseTalkEngine();

    const requestAdapterMock = vi.fn().mockResolvedValue({
      features: new Set([]),
      limits: {
        maxBufferSize: 512 * 1024 * 1024,
        maxStorageBufferBindingSize: 512 * 1024 * 1024,
      },
      info: { device: "NVIDIA GPU" },
      requestDevice: vi.fn().mockResolvedValue({}),
    });

    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: "Windows",
        gpu: { requestAdapter: requestAdapterMock },
      },
      configurable: true,
      writable: true,
    });

    const unetRunMock = vi.fn().mockRejectedValue(new Error("Transient WGSL warmup compilation error"));
    const vaeRunMock = vi.fn().mockResolvedValue({});

    const mockTensor = vi.fn().mockImplementation(function (this: { type: string; data: Float32Array; dims: number[] }, type: string, data: Float32Array, dims: number[]) {
      this.type = type;
      this.data = data;
      this.dims = dims;
    });

    let createCount = 0;
    const mockOrt: OrtGlobal = {
      env: { webgpu: { device: null } },
      InferenceSession: {
        create: vi.fn().mockImplementation(() => {
          createCount++;
          return Promise.resolve({
            inputNames: ["latent", "whisper"],
            run: createCount === 1 ? unetRunMock : vaeRunMock,
          } as OrtSession);
        }),
      },
      Tensor: mockTensor as unknown as OrtGlobal["Tensor"],
    };
    (globalThis.window as unknown as { ort: OrtGlobal }).ort = mockOrt;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "100" }),
      body: {
        getReader: () => {
          let done = false;
          return {
            read: () => {
              if (done) return Promise.resolve({ done: true, value: undefined });
              done = true;
              return Promise.resolve({ done: false, value: new Uint8Array(100) });
            },
          };
        },
      },
    } as unknown as Response);

    // Initialization should still succeed despite the pre-warm run error
    await expect(engine.initialize({ precision: "fp32", prewarm: true })).resolves.toBe(true);
    expect(engine.getStatus().isInitialized).toBe(true);
  });

  it("installs a requestAdapter sanitizer on Windows that strips powerPreference", async () => {
    const engine = new WebGPUMuseTalkEngine();
    const rawRequestAdapter = vi.fn().mockResolvedValue({
      features: new Set([]),
      limits: { maxBufferSize: 512 * 1024 * 1024, maxStorageBufferBindingSize: 512 * 1024 * 1024 },
      requestDevice: vi.fn().mockResolvedValue({}),
    });

    Object.defineProperty(globalThis, "window", { value: {}, configurable: true, writable: true });
    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        platform: "Win32",
        gpu: { requestAdapter: rawRequestAdapter },
      },
      configurable: true,
      writable: true,
    });

    const mockOrt: OrtGlobal = {
      env: {},
      InferenceSession: {
        create: vi.fn().mockResolvedValue({
          inputNames: ["latent", "whisper"],
          run: vi.fn().mockResolvedValue({}),
        } as OrtSession),
      },
      Tensor: vi.fn() as unknown as OrtGlobal["Tensor"],
    };
    (globalThis.window as unknown as { ort: OrtGlobal }).ort = mockOrt;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "10" }),
      body: {
        getReader: () => {
          let done = false;
          return {
            read: () => {
              if (done) return Promise.resolve({ done: true, value: undefined });
              done = true;
              return Promise.resolve({ done: false, value: new Uint8Array(10) });
            },
          };
        },
      },
    } as unknown as Response);

    await engine.initialize({ precision: "fp32", prewarm: false });

    // Now test that navigator.gpu.requestAdapter strips powerPreference when called by WASM / internal libraries
    await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    expect(rawRequestAdapter).toHaveBeenLastCalledWith({});

    // Verify ort.env.webgpu was initialized safely
    expect(mockOrt.env.webgpu).toBeDefined();
    expect(mockOrt.env.webgpu?.device).toBeDefined();
    expect(mockOrt.env.webgpu?.adapter).toBeDefined();
    expect(mockOrt.env.webgpu?.powerPreference).toBeUndefined();
  });

  it("completes initialization even if shader pre-warming hangs indefinitely", async () => {
    vi.useFakeTimers();
    try {
      const engine = new WebGPUMuseTalkEngine();

      const requestAdapterMock = vi.fn().mockResolvedValue({
        features: new Set([]),
        limits: {
          maxBufferSize: 512 * 1024 * 1024,
          maxStorageBufferBindingSize: 512 * 1024 * 1024,
        },
        info: { device: "NVIDIA RTX" },
        requestDevice: vi.fn().mockResolvedValue({}),
      });

      Object.defineProperty(globalThis, "window", {
        value: {},
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, "navigator", {
        value: {
          userAgent: "Windows",
          gpu: { requestAdapter: requestAdapterMock },
        },
        configurable: true,
        writable: true,
      });

      // Hanging session.run
      const hangingRun = vi.fn().mockReturnValue(new Promise(() => {}));

      const mockOrt: OrtGlobal = {
        env: { webgpu: { device: null } },
        InferenceSession: {
          create: vi.fn().mockResolvedValue({
            inputNames: ["latent", "whisper"],
            run: hangingRun,
          } as OrtSession),
        },
        Tensor: vi.fn() as unknown as OrtGlobal["Tensor"],
      };
      (globalThis.window as unknown as { ort: OrtGlobal }).ort = mockOrt;

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-length": "100" }),
        body: {
          getReader: () => {
            let done = false;
            return {
              read: () => {
                if (done) return Promise.resolve({ done: true, value: undefined });
                done = true;
                return Promise.resolve({ done: false, value: new Uint8Array(100) });
              },
            };
          },
        },
      } as unknown as Response);

      const stages: string[] = [];
      const initPromise = engine.initialize({
        precision: "fp32",
        prewarm: true,
        onProgress: (_pct, stage) => stages.push(stage),
      });

      // Advance timers past the 15s timeout
      await vi.advanceTimersByTimeAsync(16000);

      const result = await initPromise;
      expect(result).toBe(true);
      expect(engine.getStatus().isInitialized).toBe(true);
      expect(stages[stages.length - 1]).toContain("WebGPU Neural Engine Ready");
    } finally {
      vi.useRealTimers();
    }
  });
});
