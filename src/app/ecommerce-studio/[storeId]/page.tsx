"use client";

import React, { use, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { StoreCatalogView } from "../components/StoreCatalogView";
import { StorefrontItem } from "../components/StorefrontsDirectoryView";
import { EcommercePreProductionModal } from "../components/EcommercePreProductionModal";
import { ProductSpec } from "@/lib/types/ecommerce";
import { useToast } from "@/components/global/ToastContainer";
import { Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StoreCatalogPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.storeId;
  const router = useRouter();
  const { toast } = useToast();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [storyboardProduct, setStoryboardProduct] = useState<ProductSpec | null>(null);

  // Fetch Storefront metadata
  const {
    data: storefrontsData,
    mutate: mutateStorefronts,
    isLoading: isLoadingStores,
  } = useSWR<{ success: boolean; storefronts: StorefrontItem[] }>(
    "/api/ecommerce/storefronts",
    fetcher
  );

  const currentStore =
    storefrontsData?.storefronts?.find((s) => s.id === storeId) || null;

  const handleSelectProduct = (spec: ProductSpec) => {
    router.push(`/ecommerce-studio/${storeId}/editor/${spec.id}`);
  };

  const handleOpenStoryboardModal = (spec: ProductSpec) => {
    setStoryboardProduct(spec);
  };

  const handleApproveStoryboardFromCatalog = async () => {
    if (!storyboardProduct) return;
    toast("✨ Storyboard Approved", "Launching video editor with calibrated scenes...", "success");
    router.push(`/ecommerce-studio/${storeId}/editor/${storyboardProduct.id}`);
  };

  const handleBackToStores = () => {
    router.push("/ecommerce-studio");
  };

  const handleSyncStore = async (
    targetStoreId: string,
    options?: { limit?: number; maxPages?: number }
  ) => {
    setIsSyncing(true);
    toast("Scraping Catalog", "Crawling catalog pages & extracting product assets...", "info");
    try {
      const res = await fetch(`/api/ecommerce/storefronts/${targetStoreId}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options || {}),
      });
      const data = await res.json();
      if (data.success) {
        toast(
          "Sync Complete",
          `Ingested ${data.totalIngested || data.products?.length || 0} products into catalog!`,
          "success"
        );
        await mutateStorefronts();
      } else {
        toast("Sync Error", data.error || "Failed to scrape storefront", "error");
      }
    } catch (err: unknown) {
      toast("Sync Failed", (err as Error).message || "Unknown error", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const res = await fetch(`/api/ecommerce/products?id=${productId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast("Product Removed", "Deleted campaign and assets from catalog", "info");
      }
    } catch (err: unknown) {
      toast("Delete Failed", (err as Error).message || "Unknown error", "error");
    }
  };

  const handleHarvestSingleUrl = async (url: string) => {
    setIsHarvesting(true);
    toast("Harvesting Product", "Extracting specifications, dimensions & media...", "info");
    try {
      const res = await fetch("/api/ecommerce/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, storefrontId: storeId }),
      });
      const data = await res.json();
      if (data.success) {
        toast("Product Ingested", `Added "${data.product.title}" to catalog!`, "success");
      } else {
        toast("Harvest Failed", data.error || "Could not parse URL", "error");
      }
    } catch (err: unknown) {
      toast("Harvest Failed", (err as Error).message || "Unknown error", "error");
    } finally {
      setIsHarvesting(false);
    }
  };

  if (isLoadingStores) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#09090c] text-white space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        <p className="text-xs text-zinc-400">Loading store catalog...</p>
      </div>
    );
  }

  return (
    <>
      <StoreCatalogView
        store={currentStore}
        storeId={storeId}
        onSelectProduct={handleSelectProduct}
        onOpenStoryboardModal={handleOpenStoryboardModal}
        onBackToStores={handleBackToStores}
        onSyncStore={handleSyncStore}
        onDeleteProduct={handleDeleteProduct}
        onHarvestSingleUrl={handleHarvestSingleUrl}
        onOpenCsvModal={() => {}}
        isSyncingStore={isSyncing}
        isHarvesting={isHarvesting}
      />

      {storyboardProduct && (
        <EcommercePreProductionModal
          isOpen={Boolean(storyboardProduct)}
          onClose={() => setStoryboardProduct(null)}
          productSpec={storyboardProduct}
          campaignId={storyboardProduct.id}
          onApproveStoryboard={handleApproveStoryboardFromCatalog}
        />
      )}
    </>
  );
}
