import { Config } from "@remotion/cli/config";
import path from "path";
import os from "os";

Config.setCachingEnabled(true);
Config.setChromiumOpenGlRenderer("angle");
Config.setChromiumDisableWebSecurity(true);
Config.setPublicDir(path.resolve(process.cwd(), "public"));

// Hardware acceleration & multi-core concurrency optimizations (dynamically scales to host CPU & RAM)
const logicalCores = os.cpus()?.length || 4;
const totalRamGb = os.totalmem() ? Math.floor(os.totalmem() / (1024 * 1024 * 1024)) : 8;
const maxWorkersByRam = Math.max(2, Math.floor(totalRamGb / 2.5));
const maxWorkersByCpu = Math.max(2, Math.floor(logicalCores * 0.75));
const autoConcurrency = Math.min(16, Math.min(maxWorkersByRam, maxWorkersByCpu));

const envConcurrency = process.env.REMOTION_CONCURRENCY ? parseInt(process.env.REMOTION_CONCURRENCY, 10) : null;
Config.setConcurrency(
  envConcurrency && !isNaN(envConcurrency)
    ? envConcurrency
    : autoConcurrency
);

Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
Config.setCrf(18);
Config.setX264Preset("fast");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(85);

// In-Memory RAM Caching & GPU Acceleration (Eliminates repetitive disk seeks and raw frame thrashing)
Config.setOffthreadVideoCacheSizeInBytes(2 * 1024 * 1024 * 1024); // 2GB RAM cache for decoded video frames
Config.setHardwareAcceleration("if-possible");
Config.setDisallowParallelEncoding(false);

Config.overrideWebpackConfig((currentConfiguration) => {
  return {
    ...currentConfiguration,
    resolve: {
      ...currentConfiguration.resolve,
      alias: {
        ...(currentConfiguration.resolve?.alias ?? {}),
        "@": path.resolve(process.cwd(), "src"),
      },
      fallback: {
        ...(currentConfiguration.resolve?.fallback ?? {}),
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        dotenv: false,
      },
    },
  };
});
