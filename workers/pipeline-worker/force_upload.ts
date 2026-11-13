import { storage } from "../../src/lib/storage/index.js";
import fs from "fs";
import path from "path";
import "dotenv/config";
import { createLogger } from "@/lib/logger";

const log = createLogger("worker:force_upload");

async function forceUpload() {
  const outputDir = "/app/vendor/ComfyUI/output";
  // The file from the previous run
  const filePath = path.join(outputDir, "echomimic_v3_interpolated_00001-audio.mp4");
  
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
  }
  
  log.info("Uploading file to MinIO...");
  const buffer = fs.readFileSync(filePath);
  
  // We need to know the storyId and segmentId.
  // Wait, let's fetch all segments from the database that are "generating" or failed.
  // But we only have updateSegment in api.ts.
  
  // Let's just upload it to a known key, and print the key. 
  // Then the user can use the UI to select it if needed, or we can figure out the story ID.
  const key = `video/forced_upload/segment-0-${Date.now()}.mp4`;
  const url = await storage.upload(key, buffer, "video/mp4");
  log.info({ key, url }, "Uploaded successfully to MinIO!");
  log.info("Since we don't have the segment ID, we only uploaded it. If you need to attach it to a story, please let me know the story ID.");
}

forceUpload().catch(console.error);
