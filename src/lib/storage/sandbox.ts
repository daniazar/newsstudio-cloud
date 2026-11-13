import fs from "fs";
import path from "path";

export interface TenantSandboxOptions {
  baseDir?: string;
  autoCreate?: boolean;
}

/**
 * Creates and returns an isolated local scratch workspace for a tenant/job.
 * Path structure: {baseDir}/scratch/tenants/{tenantId}/{jobId}
 */
export async function createTenantSandbox(
  tenantId: string,
  jobId: string,
  options?: TenantSandboxOptions
): Promise<string> {
  const safeTenantId = (tenantId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeJobId = (jobId || Date.now().toString()).replace(/[^a-zA-Z0-9_-]/g, "_");

  const baseDir = options?.baseDir || process.cwd();
  const sandboxPath = path.join(baseDir, "scratch", "tenants", safeTenantId, safeJobId);

  if (options?.autoCreate !== false) {
    await fs.promises.mkdir(sandboxPath, { recursive: true });
  }

  return sandboxPath;
}

/**
 * Safely and recursively removes a tenant's scratch workspace.
 */
export async function cleanupTenantSandbox(sandboxPath: string): Promise<void> {
  try {
    if (fs.existsSync(sandboxPath)) {
      await fs.promises.rm(sandboxPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn(`[TenantSandbox] Notice cleaning up sandbox at ${sandboxPath}:`, err);
  }
}

/**
 * Returns an absolute path for a named file inside the tenant sandbox.
 */
export function getTenantScratchFilePath(sandboxPath: string, filename: string): string {
  return path.join(sandboxPath, filename);
}

/**
 * Higher-order helper that wraps an operation in an isolated tenant sandbox
 * and guarantees cleanup in a finally block.
 */
export async function withTenantSandbox<T>(
  tenantId: string,
  jobId: string,
  fn: (sandboxPath: string) => Promise<T>,
  options?: TenantSandboxOptions
): Promise<T> {
  const sandboxPath = await createTenantSandbox(tenantId, jobId, options);
  try {
    return await fn(sandboxPath);
  } finally {
    await cleanupTenantSandbox(sandboxPath);
  }
}
