import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requireWorkerKey } from "@/lib/workerAuth";

describe("Worker Authentication Constant-Time Guard", () => {
  const originalKey = process.env.WORKER_API_KEY;

  beforeEach(() => {
    process.env.WORKER_API_KEY = "super-secret-test-worker-key-12345";
  });

  afterEach(() => {
    process.env.WORKER_API_KEY = originalKey;
  });

  it("authenticates valid Bearer token", () => {
    const req = new Request("http://localhost/api/worker/tasks", {
      headers: { Authorization: "Bearer super-secret-test-worker-key-12345" },
    });
    expect(requireWorkerKey(req)).toBeNull();
  });

  it("authenticates valid x-worker-key header", () => {
    const req = new Request("http://localhost/api/worker/tasks", {
      headers: { "x-worker-key": "super-secret-test-worker-key-12345" },
    });
    expect(requireWorkerKey(req)).toBeNull();
  });

  it("rejects mismatched key of equal length", async () => {
    const req = new Request("http://localhost/api/worker/tasks", {
      headers: { "x-worker-key": "super-secret-test-worker-key-00000" },
    });
    const res = requireWorkerKey(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
  });

  it("rejects key of different length", async () => {
    const req = new Request("http://localhost/api/worker/tasks", {
      headers: { "x-worker-key": "short" },
    });
    const res = requireWorkerKey(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
  });

  it("rejects missing authentication header", async () => {
    const req = new Request("http://localhost/api/worker/tasks");
    const res = requireWorkerKey(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
  });
});
