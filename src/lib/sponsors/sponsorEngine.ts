/**
 * src/lib/sponsors/sponsorEngine.ts
 *
 * Dynamic Virtual Sponsor & Native Brand Insertion Engine.
 * Manages sponsor campaigns, inserts natural contextual verbal plugs into scripts,
 * and configures visual broadcast placement layers (mugs, video walls, lower-third ribbons, QR codes).
 */

export interface SponsorCampaign {
  id: string;
  brandName: string;
  tagline: string;
  sponsorType: "exclusive_title" | "segment_presenter" | "ticker_sponsor" | "desk_brand";
  logoUrl?: string;
  qrCodeUrl?: string;
  ctaText?: string;
  verbalPlugTemplate?: string;
  accentColor?: string; // Hex color (e.g. "#10b981", "#3b82f6", "#f59e0b")
  startSecond?: number;
  durationSeconds?: number;
}

export const SAMPLE_SPONSOR_CAMPAIGNS: SponsorCampaign[] = [
  {
    id: "sponsor_apex_terminal",
    brandName: "Apex Terminal",
    tagline: "Ultra-Low Latency Financial Intelligence",
    sponsorType: "segment_presenter",
    logoUrl: "/presets/samples/apex_logo.png",
    qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://apexterminal.ai",
    ctaText: "Scan to Unlock Free Pro Tier",
    verbalPlugTemplate: "Before we examine the market trends, today's broadcast is brought to you by Apex Terminal — precision financial intelligence for modern traders.",
    accentColor: "#10b981",
    startSecond: 8,
    durationSeconds: 12,
  },
  {
    id: "sponsor_cyber_guard",
    brandName: "CyberGuard AI",
    tagline: "Autonomous Enterprise Threat Defense",
    sponsorType: "exclusive_title",
    logoUrl: "/presets/samples/cyberguard_logo.png",
    qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://cyberguard.ai",
    ctaText: "Protect Your Infrastructure Today",
    verbalPlugTemplate: "This special technology report is sponsored by CyberGuard AI — enterprise cybersecurity powered by autonomous neural defense.",
    accentColor: "#3b82f6",
    startSecond: 5,
    durationSeconds: 10,
  },
];

/**
 * Naturally weaves a verbal sponsor plug into the anchor script.
 */
export function weaveSponsorIntoScript(
  scriptSegments: Array<{ speaker: string; text: string; cameraAngle?: string }>,
  sponsor: SponsorCampaign,
  plugPosition: "intro" | "mid_roll" | "outro" = "intro"
): Array<{ speaker: string; text: string; cameraAngle?: string }> {
  if (!sponsor.verbalPlugTemplate) return scriptSegments;

  const result = [...scriptSegments];
  const plugSegment = {
    speaker: result[0]?.speaker || "Anchor",
    text: sponsor.verbalPlugTemplate,
    cameraAngle: "tight",
  };

  if (plugPosition === "intro" && result.length > 0) {
    // Insert right after the first hook sentence
    result.splice(1, 0, plugSegment);
  } else if (plugPosition === "mid_roll" && result.length > 2) {
    const mid = Math.floor(result.length / 2);
    result.splice(mid, 0, plugSegment);
  } else {
    result.push(plugSegment);
  }

  return result;
}
