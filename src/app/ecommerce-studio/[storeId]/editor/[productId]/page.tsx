"use client";

import { useToast } from "@/components/global/ToastContainer";
import { compileAdScript } from "@/lib/ecommerce/adCopywriter";
import { SAMPLE_FLOORING } from "@/lib/ecommerce/sampleProducts";
import { AdAspectRatio,ProductSpec } from "@/lib/types/ecommerce";
import { PlayerRef } from "@remotion/player";
import { useRouter } from "next/navigation";
import { Suspense,use,useCallback,useEffect,useRef,useState } from "react";
import useSWR from "swr";

import { useProductAdAudio } from "@/app/ecommerce-studio/hooks/useProductAdAudio";
import { useProductEditorHistory } from "@/app/ecommerce-studio/hooks/useProductEditorHistory";
import { useProductPresenterOrchestrator } from "@/app/ecommerce-studio/hooks/useProductPresenterOrchestrator";
import { useProductSceneManager } from "@/app/ecommerce-studio/hooks/useProductSceneManager";

import { EditorBottomTimeline } from "@/app/ecommerce-studio/components/EditorBottomTimeline";
import { EditorCenterCanvas } from "@/app/ecommerce-studio/components/EditorCenterCanvas";
import { EditorHeaderToolbar } from "@/app/ecommerce-studio/components/EditorHeaderToolbar";
import { EditorLeftInspector } from "@/app/ecommerce-studio/components/EditorLeftInspector";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PageProps {
  params: Promise<{ storeId: string; productId: string }>;
}

function ProductEditorContent({ params }: PageProps) {
  const { storeId, productId } = use(params);

  const { toast } = useToast();
  const playerRef = useRef<PlayerRef>(null);
  const _router = useRouter();

  const [productSpec, setProductSpec] = useState<ProductSpec>(SAMPLE_FLOORING);
  const [aspectRatio, setAspectRatio] = useState<AdAspectRatio>("9:16");

  // Fetch product data if API exists
  const { data: apiData } = useSWR(
    productId ? `/api/ecommerce/product/${productId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (apiData?.product) {
      setProductSpec(apiData.product);
    }
  }, [apiData]);

  // Initial script compilation
  const initialScript = compileAdScript({ productSpec, archetype: "viral_ugc", targetChannel: "tiktok_shop" });

  const history = useProductEditorHistory(initialScript);
  const sceneManager = useProductSceneManager(history.script, history.pushScriptState);
  const audio = useProductAdAudio();
  const presenter = useProductPresenterOrchestrator();

  const handleSave = useCallback(() => {
    toast("Saved Campaign", "Product video campaign configuration saved.", "success");
  }, [toast]);

  const handleRender = useCallback(() => {
    toast("Render Triggered", "Queued video rendering pipeline.", "info");
  }, [toast]);

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans overflow-hidden selection:bg-cyan-500 selection:text-white">
      <EditorHeaderToolbar
        productTitle={productSpec.title}
        storeName={storeId}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.handleUndo}
        onRedo={history.handleRedo}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        onSave={handleSave}
        onRender={handleRender}
      />

      <div className="flex-1 flex overflow-hidden">
        <EditorLeftInspector
          currentScene={sceneManager.currentScene}
          onUpdateScene={sceneManager.handleUpdateCurrentScene}
          presenterConfig={presenter.presenterConfig}
          onUpdatePresenterConfig={presenter.updatePresenterConfig}
          selectedEngine={audio.selectedEngine}
          setSelectedEngine={audio.setSelectedEngine}
          selectedVoiceModel={audio.selectedVoiceModel}
          setSelectedVoiceModel={audio.setSelectedVoiceModel}
          speechSpeed={audio.speechSpeed}
          setSpeechSpeed={audio.setSpeechSpeed}
          selectedMusicTrack={audio.selectedMusicTrack}
          setSelectedMusicTrack={audio.setSelectedMusicTrack}
          backgroundMusicVolume={audio.backgroundMusicVolume}
          setBackgroundMusicVolume={audio.setBackgroundMusicVolume}
          product={productSpec}
          onUpdateProduct={(updater) => setProductSpec((prev) => ({ ...prev, ...updater }))}
        />

        <EditorCenterCanvas
          script={history.script}
          product={productSpec}
          aspectRatio={aspectRatio}
          playerRef={playerRef}
        />
      </div>

      <EditorBottomTimeline
        script={history.script}
        selectedSceneIndex={sceneManager.selectedSceneIndex}
        onSelectScene={sceneManager.setSelectedSceneIndex}
        onAddScene={sceneManager.handleAddScene}
        onDeleteScene={sceneManager.handleDeleteScene}
      />
    </div>
  );
}

export default function ProductEditorPage(props: PageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-xs">Loading Product Video Editor...</div>}>
      <ProductEditorContent {...props} />
    </Suspense>
  );
}
