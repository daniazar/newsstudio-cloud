/**
 * ccMixter Music Provider — Keyless royalty-free Creative Commons music.
 * API Docs: http://ccmixter.org/query-api
 */

import https from "https";
import { execFile } from "child_process";
import type { MusicProvider, MusicTrack, MusicSearchOptions } from "./types";
import { createLogger } from "@/lib/logger";

const log = createLogger("music:ccmixter");

interface CCMixterFile {
  download_url?: string;
  file_format_info?: {
    ps?: string;
  };
}

interface CCMixterItem {
  upload_id: string | number;
  upload_name?: string;
  user_name?: string;
  file_page_url?: string;
  license_name?: string;
  upload_tags?: string;
  upload_extra?: {
    bpm?: string;
  };
  files?: CCMixterFile[];
}

function httpGetInsecure(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. Try standard https request
    const req = https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve(data);
      });
    });
    
    req.on("error", (err: Error & { code?: string }) => {
      // 2. Fall back to curl if Node's HTTP parser overflows due to the massive X-JSON header
      if (err.code === "HPE_HEADER_OVERFLOW" || err.message?.includes("Header overflow")) {
        console.warn(`[Music:ccMixter] Node HTTP parser failed with HPE_HEADER_OVERFLOW (massive X-JSON header). Falling back to curl...`);
        execFile("curl", ["-k", "-s", url], (curlErr, stdout) => {
          if (curlErr) {
            reject(new Error(`Both Node https and curl fallback failed. Curl error: ${curlErr.message}`));
          } else {
            resolve(stdout);
          }
        });
        return;
      }
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

export class CCMixterMusicProvider implements MusicProvider {
  readonly name = "ccmixter-music";

  isAvailable(): boolean {
    return true; // Completely free, keyless, and always available
  }

  async search(query: string, options?: MusicSearchOptions): Promise<MusicTrack[]> {
    const perPage = options?.perPage ?? 10;

    try {
      const url = new URL("https://ccmixter.org/api/query");
      url.searchParams.set("f", "json");
      url.searchParams.set("limit", String(perPage));

      // Build tag filter based on query and mood by splitting into individual words
      const queryTags = query
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 2);

      const searchTags = [
        ...queryTags,
        options?.mood ? options.mood.toLowerCase() : ""
      ].filter(Boolean);

      if (searchTags.length > 0) {
        url.searchParams.set("tags", searchTags.join("+"));
        url.searchParams.set("type", "any"); // match any tag for higher success
      }

      log.info(`[Music:ccMixter] Querying ccMixter API: ${url.toString()}`);
      const rawResponse = await httpGetInsecure(url.toString());
      
      const results = JSON.parse(rawResponse) as CCMixterItem[];
      if (!Array.isArray(results)) {
        return [];
      }

      return results
        .filter((item) => item.files && item.files.length > 0 && item.files[0].download_url)
        .map((item): MusicTrack => {
          const file = item.files![0];
          // Parse duration string e.g. "1:07" to seconds
          let durationSeconds = 120;
          if (file.file_format_info?.ps) {
            const parts = file.file_format_info.ps.split(":").map(Number);
            if (parts.length === 2) {
              durationSeconds = parts[0] * 60 + parts[1];
            } else if (parts.length === 1) {
              durationSeconds = parts[0];
            }
          }

          return {
            externalId: String(item.upload_id),
            provider: "ccmixter-music",
            name: item.upload_name || `Track ${item.upload_id}`,
            artist: item.user_name || undefined,
            mood: options?.mood ?? "ambient",
            url: item.file_page_url || `https://ccmixter.org/files/${item.user_name}/${item.upload_id}`,
            previewUrl: file.download_url || "",
            downloadUrl: file.download_url || "",
            duration: durationSeconds,
            bpm: item.upload_extra?.bpm ? parseInt(item.upload_extra.bpm) : undefined,
            license: item.license_name || "creative-commons",
            tags: item.upload_tags ? item.upload_tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
          };
        });
    } catch (error) {
      console.error(`[Music:ccMixter] Search failed for "${query}":`, error);
      return [];
    }
  }
}
