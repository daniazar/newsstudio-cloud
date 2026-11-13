import { useState, useCallback } from "react";
import { ProductSpec, AdScript, AdAspectRatio } from "@/lib/types/ecommerce";
import { SAMPLE_FLOORING } from "@/lib/ecommerce/sampleProducts";

export function useEcommerceStudioState(initialProduct: ProductSpec = SAMPLE_FLOORING) {
  const [activeLevel, setActiveLevel] = useState<"stores" | "products" | "studio">("studio");
  const [activeStudioEngine, setActiveStudioEngine] = useState<"remotion" | "veo">("remotion");
  const [product, setProduct] = useState<ProductSpec>(initialProduct);
  const [script, setScript] = useState<AdScript | null>(null);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<AdAspectRatio>("9:16");

  // Modals visibility
  const [isPreProductionOpen, setIsPreProductionOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isOmnichannelOpen, setIsOmnichannelOpen] = useState<boolean>(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);
  const [isSocialPublishOpen, setIsSocialPublishOpen] = useState<boolean>(false);
  const [isLocalizationOpen, setIsLocalizationOpen] = useState<boolean>(false);
  const [isReviewStudioOpen, setIsReviewStudioOpen] = useState<boolean>(false);
  const [isShoppableHotspotsOpen, setIsShoppableHotspotsOpen] = useState<boolean>(false);
  const [isQaReportOpen, setIsQaReportOpen] = useState<boolean>(false);

  const handleSelectScene = useCallback((index: number) => {
    setSelectedSceneIndex(index);
  }, []);

  return {
    activeLevel,
    setActiveLevel,
    activeStudioEngine,
    setActiveStudioEngine,
    product,
    setProduct,
    script,
    setScript,
    selectedSceneIndex,
    setSelectedSceneIndex,
    handleSelectScene,
    aspectRatio,
    setAspectRatio,

    // Modal states
    isPreProductionOpen,
    setIsPreProductionOpen,
    isExportOpen,
    setIsExportOpen,
    isOmnichannelOpen,
    setIsOmnichannelOpen,
    isCatalogOpen,
    setIsCatalogOpen,
    isSocialPublishOpen,
    setIsSocialPublishOpen,
    isLocalizationOpen,
    setIsLocalizationOpen,
    isReviewStudioOpen,
    setIsReviewStudioOpen,
    isShoppableHotspotsOpen,
    setIsShoppableHotspotsOpen,
    isQaReportOpen,
    setIsQaReportOpen,
  };
}
