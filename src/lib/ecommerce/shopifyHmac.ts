/**
 * src/lib/ecommerce/shopifyHmac.ts
 *
 * Validates Shopify Webhook HMAC-SHA256 signatures.
 */

import crypto from "crypto";

export function verifyShopifyHmac(
  body: string,
  hmacHeader: string | null,
  secret?: string
): boolean {
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("❌ [Shopify Webhook] SHOPIFY_WEBHOOK_SECRET is not configured in production");
      return false;
    }
    console.warn("⚠️ [Shopify Webhook] SHOPIFY_WEBHOOK_SECRET is not configured. Bypassing HMAC verification in dev.");
    return true;
  }
  if (!hmacHeader) {
    return false;
  }
  try {
    const hash = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
    const hashBuf = Buffer.from(hash, "utf8");
    const hmacBuf = Buffer.from(hmacHeader, "utf8");
    if (hashBuf.length !== hmacBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(hashBuf, hmacBuf);
  } catch (err) {
    console.error("❌ [Shopify Webhook] Error during HMAC verification:", err);
    return false;
  }
}
