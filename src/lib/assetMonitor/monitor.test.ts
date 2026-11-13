import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExistsSync, mockReaddirSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReaddirSync: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
  default: {
    existsSync: mockExistsSync,
    readdirSync: mockReaddirSync,
  },
}));

import { checkPendingAssets } from "./monitor";

describe("Asset Monitor", () => {
  const mockVideoId = "test-video-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty result if directory does not exist", async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await checkPendingAssets(mockVideoId);

    expect(result.isComplete).toBe(false);
    expect(result.hasPresenterVideo).toBe(false);
    expect(result.hasPresenterAudio).toBe(false);
    expect(result.hasBRollAssets).toBe(false);
  });

  it("should detect presenter video and audio files", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(["presenter.mp4", "presenter.wav"]);

    const result = await checkPendingAssets(mockVideoId);

    expect(result.isComplete).toBe(true);
    expect(result.hasPresenterVideo).toBe(true);
    expect(result.hasPresenterAudio).toBe(true);
  });

  it("should detect B-roll assets", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      "presenter.mp4",
      "presenter.wav",
      "broll_scene_0.mp4",
      "broll_scene_1.mp4",
    ]);

    const result = await checkPendingAssets(mockVideoId);

    expect(result.isComplete).toBe(true);
    expect(result.hasBRollAssets).toBe(true);
    expect(result.bRollPaths).toHaveLength(2);
  });

  it("should not be complete without presenter audio", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(["presenter.mp4"]);

    const result = await checkPendingAssets(mockVideoId);

    expect(result.isComplete).toBe(false);
    expect(result.hasPresenterVideo).toBe(true);
    expect(result.hasPresenterAudio).toBe(false);
  });

  it("should handle ruby-named files", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(["ruby_lipsync.mp4", "ruby_voice.wav"]);

    const result = await checkPendingAssets(mockVideoId);

    expect(result.isComplete).toBe(true);
    expect(result.hasPresenterVideo).toBe(true);
    expect(result.hasPresenterAudio).toBe(true);
  });
});
