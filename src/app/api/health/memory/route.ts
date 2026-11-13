import { NextResponse } from "next/server";
import v8 from "v8";

function getMemorySnapshot() {
  const mem = process.memoryUsage();
  const v8Stats = v8.getHeapStatistics();

  const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

  return {
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    gcAvailable: typeof global.gc === "function",
    processMemory: {
      rssMB: toMB(mem.rss),
      heapTotalMB: toMB(mem.heapTotal),
      heapUsedMB: toMB(mem.heapUsed),
      externalMB: toMB(mem.external),
      arrayBuffersMB: toMB(mem.arrayBuffers),
    },
    v8HeapStatistics: {
      totalHeapSizeMB: toMB(v8Stats.total_heap_size),
      usedHeapSizeMB: toMB(v8Stats.used_heap_size),
      heapSizeLimitMB: toMB(v8Stats.heap_size_limit),
      totalAvailableSizeMB: toMB(v8Stats.total_available_size),
      totalPhysicalSizeMB: toMB(v8Stats.total_physical_size),
      mallocedMemoryMB: toMB(v8Stats.malloced_memory),
      peakMallocedMemoryMB: toMB(v8Stats.peak_malloced_memory),
    },
  };
}

import { cleanOrphanedTempFiles } from "@/lib/storage/tempCleaner";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shouldGc = url.searchParams.get("gc") === "true";
  const shouldCleanTemp = url.searchParams.get("cleanTemp") === "true";

  let gcResult = null;
  if (shouldGc && typeof global.gc === "function") {
    const before = process.memoryUsage();
    global.gc();
    const after = process.memoryUsage();
    const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;
    gcResult = {
      freedHeapMB: toMB(before.heapUsed - after.heapUsed),
      freedRssMB: toMB(before.rss - after.rss),
    };
  }

  let tempCleanResult = null;
  if (shouldCleanTemp) {
    tempCleanResult = cleanOrphanedTempFiles();
  }

  const snapshot = getMemorySnapshot();
  return NextResponse.json(
    {
      status: "ok",
      ...snapshot,
      ...(gcResult ? { gcResult } : {}),
      ...(tempCleanResult ? { tempCleanResult } : {}),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function POST() {
  if (typeof global.gc !== "function") {
    return NextResponse.json(
      {
        status: "error",
        message: "Garbage collection is not exposed. Start Node with --expose-gc flag.",
        snapshot: getMemorySnapshot(),
      },
      { status: 400 }
    );
  }

  const before = process.memoryUsage();
  global.gc();
  const after = process.memoryUsage();
  const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

  return NextResponse.json({
    status: "ok",
    message: "Garbage collection executed successfully",
    freed: {
      heapMB: toMB(before.heapUsed - after.heapUsed),
      rssMB: toMB(before.rss - after.rss),
      externalMB: toMB(before.external - after.external),
    },
    snapshot: getMemorySnapshot(),
  });
}
