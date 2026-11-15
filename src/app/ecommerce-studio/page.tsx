"use client";

import { useToast } from "@/components/global/ToastContainer";
import { compileAdScript } from "@/lib/ecommerce/adCopywriter";
import { calculateProductReadiness } from "@/lib/ecommerce/readinessMatrix";
import { SAMPLE_FLOORING } from "@/lib/ecommerce/sampleProducts";
import { AdScene,TargetDistributionChannel,VideoArchetype } from "@/lib/types/ecommerce";
import { PlayerRef } from "@remotion/player";
import { usePathname,useRouter,useSearchParams } from "next/navigation";
import { Suspense,useCallback,useEffect,useMemo,useRef } from "react";
import useSWR from "swr";

import { useEcommerceStudioAudio } from "./hooks/useEcommerceStudioAudio";
import { useEcommerceStudioHarvester } from "./hooks/useEcommerceStudioHarvester";
import { useEcommerceStudioState } from "./hooks/useEcommerceStudioState";

import { StudioConversionOverlaysPanel } from "./components/StudioConversionOverlaysPanel";
import { StudioHeaderToolbar } from "./components/StudioHeaderToolbar";
import { StudioPreviewPlayerPanel } from "./components/StudioPreviewPlayerPanel";
import { StudioProductScraperPanel } from "./components/StudioProductScraperPanel";
import { StudioScriptEditorPanel } from "./components/StudioScriptEditorPanel";
import { StudioSwarmViralHooksPanel } from "./components/StudioSwarmViralHooksPanel";

import { EcommercePreProductionModal } from "./components/EcommercePreProductionModal";
import { StoreCatalogView } from "./components/StoreCatalogView";
import { StorefrontsDirectoryView } from "./components/StorefrontsDirectoryView";
import { VeoStudioTab } from "./components/VeoStudioTab";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function EcommerceStudioContent() {
  const { toast } = useToast();
  const playerRef = useRef<PlayerRef>(null);
  const _router = useRouter();
  const _searchParams = useSearchParams();
  const _pathname = usePathname();

  const studioState = useEcommerceStudioState(SAMPLE_FLOORING);
  const _studioAudio = useEcommerceStudioAudio();

  const { data: storefrontsData, mutate: mutateStorefronts } = useSWR("/api/ecommerce/storefronts", fetcher);
  const { data: catalogData, mutate: mutateCatalog } = useSWR("/api/ecommerce/products", fetcher);

  const harvester = useEcommerceStudioHarvester((newProduct) => {
    studioState.setProduct(newProduct);
    const compiled = compileAdScript({ productSpec: newProduct, archetype: "viral_ugc", targetChannel: "tiktok_shop" });
    studioState.setScript(compiled);
    toast("Product Scraped", `Loaded ${newProduct.title} and compiled initial ad script.`, "success");
  });

  // Initialize script on product change if not present
  useEffect(() => {
    if (!studioState.script && studioState.product) {
      const compiled = compileAdScript({ productSpec: studioState.product, archetype: "viral_ugc", targetChannel: "tiktok_shop" });
      studioState.setScript(compiled);
    }
  }, [studioState]);

  const readinessReport = useMemo(() => {
    return calculateProductReadiness(studioState.product);
  }, [studioState.product]);

  const handleUpdateActiveScene = useCallback(
    (field: keyof AdScene, value: unknown) => {
      if (!studioState.script || !studioState.script.scenes) return;
      const scenes = studioState.script.scenes.map((scene, idx) => {
        if (idx !== studioState.selectedSceneIndex) return scene;
        return { ...scene, [field]: value };
      });
      studioState.setScript({ ...studioState.script, scenes });
    },
    [studioState]
  );

  const handleSelectArchetype = useCallback(
    (archetype: VideoArchetype) => {
      if (!studioState.product) return;
      const updated = compileAdScript({
        productSpec: studioState.product,
        archetype,
        targetChannel: studioState.script?.targetChannel || "tiktok_shop",
      });
      studioState.setScript(updated);
      toast("Archetype Applied", `Re-compiled script using ${archetype} framework.`, "info");
    },
    [studioState, toast]
  );

  const handleSelectChannel = useCallback(
    (targetChannel: TargetDistributionChannel) => {
      if (!studioState.script) return;
      studioState.setScript({ ...studioState.script, targetChannel });
    },
    [studioState]
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-white">
      <StudioHeaderToolbar
        activeLevel={studioState.activeLevel}
        setActiveLevel={studioState.setActiveLevel}
        activeStudioEngine={studioState.activeStudioEngine}
        setActiveStudioEngine={studioState.setActiveStudioEngine}
        onOpenPreProduction={() => studioState.setIsPreProductionOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {studioState.activeLevel === "stores" && (
          <StorefrontsDirectoryView
            storefronts={storefrontsData?.storefronts || []}
            allProducts={catalogData?.products ?? catalogData?.items ?? []}
            onSelectStore={() => studioState.setActiveLevel("products")}
            onSyncStore={async () => { await mutateStorefronts(); await mutateCatalog(); }}
            onAddStore={async () => { studioState.setActiveLevel("products"); }}
          />
        )}

        {studioState.activeLevel === "products" && (
          <StoreCatalogView
            store={storefrontsData?.storefronts?.[0] || null}
            products={catalogData?.products ?? catalogData?.items}
            onSelectProduct={(p) => {
              studioState.setProduct(p);
              const compiled = compileAdScript({ productSpec: p, archetype: "viral_ugc", targetChannel: "tiktok_shop" });
              studioState.setScript(compiled);
              studioState.setActiveLevel("studio");
            }}
            onBackToStores={() => studioState.setActiveLevel("stores")}
            onDeleteProduct={async () => { await mutateCatalog(); }}
            onHarvestSingleUrl={async (url) => {
              harvester.setProductUrl(url);
              await harvester.harvestProduct(url);
            }}
            onOpenCsvModal={() => {}}
          />
        )}

        {studioState.activeLevel === "studio" && studioState.activeStudioEngine === "veo" && (
          <VeoStudioTab product={studioState.product} />
        )}

        {studioState.activeLevel === "studio" && studioState.activeStudioEngine === "remotion" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              <StudioProductScraperPanel
                productUrl={harvester.productUrl}
                setProductUrl={harvester.setProductUrl}
                isHarvesting={harvester.isHarvesting}
                harvestError={harvester.harvestError}
                onHarvest={harvester.harvestProduct}
                selectedProduct={studioState.product}
                onSelectSampleProduct={(sample) => {
                  studioState.setProduct(sample);
                  const compiled = compileAdScript({ productSpec: sample, archetype: "viral_ugc", targetChannel: "tiktok_shop" });
                  studioState.setScript(compiled);
                }}
              />

              <StudioScriptEditorPanel
                script={studioState.script}
                selectedSceneIndex={studioState.selectedSceneIndex}
                onSelectScene={studioState.handleSelectScene}
                onUpdateScene={handleUpdateActiveScene}
                onSelectArchetype={handleSelectArchetype}
                onSelectChannel={handleSelectChannel}
              />

              <StudioSwarmViralHooksPanel
                onSelectHook={(hook) => {
                  if (!studioState.script) return;
                  handleUpdateActiveScene("headline", hook.headline);
                  handleUpdateActiveScene("voiceoverScript", hook.voiceoverScript);
                  toast("Hook Applied", `Inserted hook "${hook.headline}" into Scene #${studioState.selectedSceneIndex + 1}.`, "success");
                }}
              />

              <StudioConversionOverlaysPanel />
            </div>

            <div className="lg:col-span-5 space-y-6">
              <StudioPreviewPlayerPanel
                script={studioState.script}
                product={studioState.product}
                aspectRatio={studioState.aspectRatio}
                setAspectRatio={studioState.setAspectRatio}
                playerRef={playerRef}
              />

              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-200">Commercial Quality Score</h3>
                  <span className="text-xs font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-800">
                    {readinessReport.score}/100
                  </span>
                </div>
                <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="bg-cyan-500 h-full transition-all duration-500"
                    style={{ width: `${readinessReport.score}%` }}
                  />
                </div>
                <ul className="text-xs text-zinc-400 space-y-1 pt-1">
                  {readinessReport.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <span className={item.passed ? "text-emerald-400" : "text-zinc-600"}>
                        {item.passed ? "✓" : "✗"}
                      </span>
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {studioState.isPreProductionOpen && (
        <EcommercePreProductionModal
          isOpen={studioState.isPreProductionOpen}
          onClose={() => studioState.setIsPreProductionOpen(false)}
          productSpec={studioState.product}
          campaignId={studioState.product.id}
          onApproveStoryboard={async () => {
            studioState.setIsPreProductionOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default function EcommerceStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-xs font-medium">
          Loading E-Commerce Studio Hub...
        </div>
      }
    >
      <EcommerceStudioContent />
    </Suspense>
  );
}
