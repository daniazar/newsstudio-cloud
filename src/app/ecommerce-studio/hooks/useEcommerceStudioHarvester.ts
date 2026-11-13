import { useState, useCallback } from "react";
import { ProductSpec } from "@/lib/types/ecommerce";
import { isValidProductUrl, normalizeProductSpec } from "@/lib/ecommerce/assetNormalization";

export function useEcommerceStudioHarvester(onHarvestSuccess?: (product: ProductSpec) => void) {
  const [productUrl, setProductUrl] = useState<string>("");
  const [isHarvesting, setIsHarvesting] = useState<boolean>(false);
  const [harvestError, setHarvestError] = useState<string | null>(null);

  const harvestProduct = useCallback(
    async (urlToHarvest?: string) => {
      const targetUrl = (urlToHarvest || productUrl).trim();
      if (!isValidProductUrl(targetUrl)) {
        setHarvestError("Please enter a valid HTTP/HTTPS product URL.");
        return null;
      }

      setIsHarvesting(true);
      setHarvestError(null);

      try {
        const res = await fetch("/api/ecommerce/harvest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Scraping failed with status ${res.status}`);
        }

        const data = await res.json();
        const normalized = normalizeProductSpec(data.product || data);
        if (onHarvestSuccess) {
          onHarvestSuccess(normalized);
        }
        return normalized;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to harvest product URL";
        setHarvestError(msg);
        return null;
      } finally {
        setIsHarvesting(false);
      }
    },
    [productUrl, onHarvestSuccess]
  );

  return {
    productUrl,
    setProductUrl,
    isHarvesting,
    harvestError,
    harvestProduct,
  };
}
