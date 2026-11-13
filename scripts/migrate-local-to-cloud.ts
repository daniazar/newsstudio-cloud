/**
 * scripts/migrate-local-to-cloud.ts
 *
 * Cloud Migration & Lean Avatar Uploader
 * 1. Validates Supabase PostgreSQL & Cloudflare R2 environment variables.
 * 2. Pushes database schema to Supabase using DIRECT_URL || DATABASE_URL.
 * 3. Seeds system personas and default brand (init-personas.ts & init-brand.ts).
 * 4. Seeds 10,000+ visual presets from enriched_presets.json in chunks.
 * 5. Uploads lean avatar assets (.webp thumbnails + root persona .png masters,
 *    skipping heavy master_*_archive directories) plus placeholder_ruby.png to R2.
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import { PERSONAS } from "../src/lib/tts/personas";

// Required environment variables for cloud migration
const REQUIRED_ENV = [
  "DATABASE_URL",
  "S3_ENDPOINT",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "S3_BUCKET_NAME",
];

function validateEnv(): void {
  console.log("🔍 [1/5] Validating Cloud Infrastructure Environment Variables...");
  const missing: string[] = [];

  for (const envVar of REQUIRED_ENV) {
    if (!process.env[envVar] || process.env[envVar]!.trim() === "") {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error(`❌ Migration failed: Missing required environment variables: ${missing.join(", ")}`);
    console.error("Please configure them in your .env or pass them into the execution environment.");
    process.exit(1);
  }

  console.log("   ✅ Supabase PostgreSQL and Cloudflare R2 credentials verified.");
}

function pushDatabaseSchema(): void {
  console.log("\n🚀 [2/5] Pushing Prisma Schema to Supabase PostgreSQL...");
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

  try {
    execSync("npx prisma db push --accept-data-loss", {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: directUrl,
      },
    });
    console.log("   ✅ Database schema pushed successfully.");
  } catch (error) {
    console.error("❌ Failed to push database schema to Supabase:", error);
    throw error;
  }
}

function seedPersonasAndBrand(): void {
  console.log("\n🌱 [3/5] Seeding System Personas and Default Brand...");
  try {
    execSync("npx tsx scripts/init-personas.ts", {
      stdio: "inherit",
      env: process.env,
    });
    execSync("npx tsx scripts/init-brand.ts", {
      stdio: "inherit",
      env: process.env,
    });
    console.log("   ✅ Personas and default brand seeded.");
  } catch (error) {
    console.error("❌ Failed to seed personas and brand:", error);
    throw error;
  }
}

interface EnrichedPresetInput {
  name: string;
  desc?: string;
  imageDesc?: string | null;
  videoDesc?: string | null;
  category?: string;
  subCategory?: string;
  subSubCategory?: string | null;
  isCustom?: boolean;
}

async function seedVisualPresets(): Promise<void> {
  console.log("\n🎨 [4/5] Seeding Visual Presets...");

  // Search candidate paths for enriched_presets.json
  const candidatePaths = [
    path.resolve(__dirname, "../../newsStudio/src/data/enriched_presets.json"),
    path.resolve(__dirname, "../src/data/enriched_presets.json"),
  ];

  let presetsPath: string | null = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      presetsPath = p;
      break;
    }
  }

  if (!presetsPath) {
    console.warn("   ⚠️  enriched_presets.json not found in newsStudio source. Skipping preset seeding.");
    return;
  }

  console.log(`   Found presets file: ${presetsPath}`);
  const rawData = fs.readFileSync(presetsPath, "utf-8");
  const presets = JSON.parse(rawData);

  if (!Array.isArray(presets) || presets.length === 0) {
    console.warn("   ⚠️  Presets file is empty or invalid format. Skipping.");
    return;
  }

  console.log(`   Inserting ${presets.length} presets in chunks of 500...`);
  const chunkSize = 500;
  let inserted = 0;

  for (let i = 0; i < presets.length; i += chunkSize) {
    const chunk = presets.slice(i, i + chunkSize).map((p: EnrichedPresetInput) => ({
      name: p.name,
      desc: p.desc || "",
      imageDesc: p.imageDesc || null,
      videoDesc: p.videoDesc || null,
      category: p.category || "attire",
      subCategory: p.subCategory || "Studio Presets",
      subSubCategory: p.subSubCategory || null,
      isCustom: Boolean(p.isCustom),
    }));

    await prisma.visualPreset.createMany({
      data: chunk,
      skipDuplicates: true,
    });

    inserted += chunk.length;
    process.stdout.write(`\r   Progress: ${inserted}/${presets.length} presets processed.`);
  }

  console.log("\n   ✅ Visual presets seeded successfully.");
}

async function uploadAvatarsToR2(): Promise<void> {
  console.log("\n☁️  [5/5] Uploading Lean Avatars to Cloudflare R2...");

  const endpoint = process.env.S3_ENDPOINT!;
  const accessKeyId = process.env.S3_ACCESS_KEY!;
  const secretAccessKey = process.env.S3_SECRET_KEY!;
  const bucketName = process.env.S3_BUCKET_NAME!;
  const region = process.env.S3_REGION || "auto";

  const s3 = new S3Client({
    region,
    endpoint,
    forcePathStyle: false, // Cloudflare R2 standard
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  // Source avatars directory
  const candidateAvatarDirs = [
    path.resolve(__dirname, "../../newsStudio/public/avatars"),
    path.resolve(__dirname, "../public/avatars"),
  ];

  let avatarsDir: string | null = null;
  for (const d of candidateAvatarDirs) {
    if (fs.existsSync(d)) {
      avatarsDir = d;
      break;
    }
  }

  const filesToUpload: Array<{ localPath: string; r2Key: string; contentType: string }> = [];

  if (avatarsDir) {
    console.log(`   Scanning avatars directory: ${avatarsDir}`);

    const personaIds = new Set(Object.keys(PERSONAS));

    // 1. Root persona .png master files (abigail.png, ruby.png, etc.)
    const rootEntries = fs.readdirSync(avatarsDir, { withFileTypes: true });
    for (const entry of rootEntries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
        const baseName = entry.name.replace(/\.png$/i, "").toLowerCase();
        // Master persona files: exactly matches persona ID or has no underscore
        if (personaIds.has(baseName) || !entry.name.includes("_")) {
          filesToUpload.push({
            localPath: path.join(avatarsDir, entry.name),
            r2Key: `avatars/${entry.name}`,
            contentType: "image/png",
          });
        }
      }
    }

    // 2. All .webp thumbnails (skipping master_*_archive directories)
    const walkForWebp = (currentDir: string): void => {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);
        if (item.isDirectory()) {
          // Strictly skip heavy raw generation archives
          if (item.name.toLowerCase().includes("master_") && item.name.toLowerCase().includes("_archive")) {
            continue;
          }
          walkForWebp(fullPath);
        } else if (item.isFile() && item.name.toLowerCase().endsWith(".webp")) {
          const relativeToAvatars = path.relative(avatarsDir!, fullPath).replace(/\\/g, "/");
          filesToUpload.push({
            localPath: fullPath,
            r2Key: `avatars/${relativeToAvatars}`,
            contentType: "image/webp",
          });
        }
      }
    };

    walkForWebp(avatarsDir);
  } else {
    console.warn("   ⚠️  Avatars directory not found. Skipping persona avatar upload.");
  }

  // 3. placeholder_ruby.png
  const placeholderCandidates = [
    path.resolve(__dirname, "../public/placeholder_ruby.png"),
    path.resolve(__dirname, "../../newsStudio/public/placeholder_ruby.png"),
  ];

  for (const ph of placeholderCandidates) {
    if (fs.existsSync(ph)) {
      filesToUpload.push({
        localPath: ph,
        r2Key: "avatars/placeholder_ruby.png",
        contentType: "image/png",
      });
      // Also upload to root key so both URL styles resolve
      filesToUpload.push({
        localPath: ph,
        r2Key: "placeholder_ruby.png",
        contentType: "image/png",
      });
      break;
    }
  }

  console.log(`   Found ${filesToUpload.length} lean assets to upload to R2...`);

  let uploadedCount = 0;
  let skippedCount = 0;
  let uploadedBytes = 0;

  // Concurrent worker pool
  const concurrency = 8;
  const total = filesToUpload.length;
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < total) {
      const idx = currentIndex++;
      const item = filesToUpload[idx];

      try {
        // Check if object already exists in R2
        try {
          await s3.send(
            new HeadObjectCommand({
              Bucket: bucketName,
              Key: item.r2Key,
            })
          );
          skippedCount++;
          continue;
        } catch (headErr: any) {
          // Object doesn't exist, proceed with upload
        }

        const fileBuffer = fs.readFileSync(item.localPath);
        await s3.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: item.r2Key,
            Body: fileBuffer,
            ContentType: item.contentType,
            CacheControl: "public, max-age=31536000, immutable",
          })
        );

        uploadedCount++;
        uploadedBytes += fileBuffer.length;
      } catch (err) {
        console.error(`\n   ❌ Failed to upload ${item.r2Key}:`, err);
      } finally {
        const done = uploadedCount + skippedCount;
        if (done % 10 === 0 || done === total) {
          process.stdout.write(
            `\r   Progress: ${done}/${total} (Uploaded: ${uploadedCount}, Skipped: ${skippedCount}, ${(uploadedBytes / 1024 / 1024).toFixed(2)} MB)`
          );
        }
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  console.log("\n   ✅ Cloudflare R2 asset synchronization complete.");
  console.log(`   Total assets processed: ${total}`);
  console.log(`   Uploaded: ${uploadedCount} (${(uploadedBytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   Skipped (already on R2): ${skippedCount}`);
}

async function main() {
  console.log("================================================================================");
  console.log("      NewsStudio Local-to-Cloud Migration & Asset Synchronization");
  console.log("================================================================================\n");

  validateEnv();
  pushDatabaseSchema();
  seedPersonasAndBrand();
  await seedVisualPresets();
  await uploadAvatarsToR2();

  console.log("\n================================================================================");
  console.log("🎉 Cloud Migration Finished Successfully!");
  console.log("================================================================================\n");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("\n❌ Migration halted due to error:", e);
  await prisma.$disconnect();
  process.exit(1);
});
