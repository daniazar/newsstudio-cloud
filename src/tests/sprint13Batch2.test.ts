import { describe, it, expect, vi } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/neural3DMMShader";
import { LiveAnchorStageEngine } from "../lib/realtime/liveAnchorStageEngine";

describe("Sprint 13 Batch 2: Iris Trabecular Fibers (K3) & WebGL Resiliency (Q1)", () => {
  describe("K3: Iris Trabecular Fiber Overlay & Fuchs Crypts", () => {
    it("should implement K3 Iris Trabecular Fiber Overlay for both left and right eyes in NEURAL_3DMM_FRAGMENT_SHADER", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("K3: Iris Trabecular Fiber Overlay & Fuchs Crypts (Viewer's Left)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("K3: Iris Trabecular Fiber Overlay & Fuchs Crypts (Viewer's Right)");
    });

    it("should calculate multi-frequency radial ciliary fibers (48Hz, 96Hz, 24Hz)", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("sin(angIrisL * 48.0)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("sin(angIrisL * 96.0 + 1.4)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("cos(angIrisL * 24.0 - 0.8)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("sin(angIrisR * 48.0)");
    });

    it("should model the collarette ring and Fuchs crypt perforations", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("rIrisL - 0.52");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("sin(angIrisL * 16.0)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("rIrisR - 0.52");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("sin(angIrisR * 16.0)");
    });

    it("should modulate videoColor rgb by stromaDetail bounded by blink progress", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("(1.0 - u_blinkLeft)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("videoColor.rgb += videoColor.rgb * stromaDetailL;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("(1.0 - u_blinkRight)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("videoColor.rgb += videoColor.rgb * stromaDetailR;");
    });
  });

  describe("Q1: WebGL Context Loss & Restoration Lifecycle", () => {
    it("should attach webglcontextlost and webglcontextrestored listeners to canvas on construction", () => {
      const addSpy = vi.fn();
      const mockCanvas = {
        addEventListener: addSpy,
        removeEventListener: vi.fn(),
        getContext: vi.fn().mockReturnValue(null),
      } as unknown as HTMLCanvasElement;

      const engine = new LiveAnchorStageEngine(mockCanvas, null);
      expect(addSpy).toHaveBeenCalledWith("webglcontextlost", expect.any(Function), false);
      expect(addSpy).toHaveBeenCalledWith("webglcontextrestored", expect.any(Function), false);

      engine.dispose();
    });

    it("should remove webgl context listeners on engine dispose", () => {
      const removeSpy = vi.fn();
      const mockCanvas = {
        addEventListener: vi.fn(),
        removeEventListener: removeSpy,
        getContext: vi.fn().mockReturnValue(null),
      } as unknown as HTMLCanvasElement;

      const engine = new LiveAnchorStageEngine(mockCanvas, null);
      engine.dispose();

      expect(removeSpy).toHaveBeenCalledWith("webglcontextlost", expect.any(Function), false);
      expect(removeSpy).toHaveBeenCalledWith("webglcontextrestored", expect.any(Function), false);
    });

    it("should call preventDefault() on webglcontextlost and set isContextLost to true", () => {
      const statusSpy = vi.fn();
      const mockCanvas = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getContext: vi.fn().mockReturnValue(null),
      } as unknown as HTMLCanvasElement;

      const engine = new LiveAnchorStageEngine(mockCanvas, null, {
        onContextStatusChange: statusSpy,
      });

      expect(engine.getIsContextLost()).toBe(false);

      const preventDefaultSpy = vi.fn();
      const mockLostEvent = {
        cancelable: true,
        preventDefault: preventDefaultSpy,
      } as unknown as Event;

      engine.handleContextLost(mockLostEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(engine.getIsContextLost()).toBe(true);
      expect(statusSpy).toHaveBeenCalledWith(true);

      engine.dispose();
    });

    it("should recover and set isContextLost to false on webglcontextrestored", async () => {
      const statusSpy = vi.fn();
      const mockCanvas = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getContext: vi.fn().mockReturnValue(null),
      } as unknown as HTMLCanvasElement;

      const engine = new LiveAnchorStageEngine(mockCanvas, null, {
        onContextStatusChange: statusSpy,
      });

      // Simulate lost state
      engine.handleContextLost({ cancelable: true, preventDefault: vi.fn() } as unknown as Event);
      expect(engine.getIsContextLost()).toBe(true);

      // Mock init to return true on restoration
      vi.spyOn(engine, "init").mockResolvedValue(true);

      await engine.handleContextRestored(new Event("webglcontextrestored"));

      expect(engine.getIsContextLost()).toBe(false);
      expect(statusSpy).toHaveBeenCalledWith(false);

      engine.dispose();
    });

    it("should NOT call loseContext() on WEBGL_lose_context extension during dispose", () => {
      const loseContextSpy = vi.fn();
      const mockGl = {
        getExtension: vi.fn((ext: string) => {
          if (ext === "WEBGL_lose_context") {
            return { loseContext: loseContextSpy };
          }
          return null;
        }),
        isContextLost: vi.fn().mockReturnValue(false),
        deleteTexture: vi.fn(),
        createShader: vi.fn().mockReturnValue({}),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn().mockReturnValue(true),
        createProgram: vi.fn().mockReturnValue({}),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn().mockReturnValue(true),
        getUniformLocation: vi.fn().mockReturnValue({}),
        createVertexArray: vi.fn().mockReturnValue({}),
        bindVertexArray: vi.fn(),
        createBuffer: vi.fn().mockReturnValue({}),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        getAttribLocation: vi.fn().mockReturnValue(0),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        createTexture: vi.fn().mockReturnValue({}),
        bindTexture: vi.fn(),
        texParameteri: vi.fn(),
      };
      const mockCanvas = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getContext: vi.fn().mockReturnValue(mockGl),
      } as unknown as HTMLCanvasElement;

      const engine = new LiveAnchorStageEngine(mockCanvas, null);
      engine.dispose();

      expect(loseContextSpy).not.toHaveBeenCalled();
    });
  });
});
