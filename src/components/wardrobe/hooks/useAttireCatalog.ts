"use client";

import { useState, useEffect, useMemo, useDeferredValue } from "react";
import { useToast } from "@/components/global/ToastContainer";
import { OutfitItem, LOOKBOOK_ITEMS_INITIAL, SamAnalysisResult, buildFullCanvasTrackPrompt } from "../types";

export function useAttireCatalog(currentPersonaGender?: string) {
  const { toast } = useToast();

  const [outfits, setOutfits] = useState<OutfitItem[]>(LOOKBOOK_ITEMS_INITIAL);
  const [activeOutfit, setActiveOutfit] = useState<OutfitItem>(LOOKBOOK_ITEMS_INITIAL[0]);
  const [targetOutfit, setTargetOutfit] = useState<OutfitItem>(LOOKBOOK_ITEMS_INITIAL[0]);
  const [customOutfitImage, setCustomOutfitImage] = useState<string>("/assets/wardrobe_demo/sapphire_dress_3view.jpg");

  const [selectedGender, setSelectedGender] = useState<string>("auto");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [outfitSearch, setOutfitSearch] = useState<string>("");
  const deferredSearch = useDeferredValue(outfitSearch);

  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [generatingOutfitId, setGeneratingOutfitId] = useState<string | null>(null);

  // Custom Attire Creation State
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [isCreatingCustom, setIsCreatingCustom] = useState<boolean>(false);
  const [customForm, setCustomForm] = useState<{
    name: string;
    description: string;
    gender: "female" | "male" | "unisex";
    category: "broadcast" | "gala" | "edgy" | "casual" | "techwear" | "executive";
    samPrompt: string;
  }>({
    name: "",
    description: "",
    gender: "female",
    category: "broadcast",
    samPrompt: "",
  });

  // Vision LLM SAM Analysis State
  const [analyzingOutfitId, setAnalyzingOutfitId] = useState<string | null>(null);
  const [isExtractingTrackPrompt, setIsExtractingTrackPrompt] = useState<boolean>(false);
  const [samAnalysisData, setSamAnalysisData] = useState<Record<string, SamAnalysisResult>>({});

  // Fetch unified 60-attire catalog + custom database attires
  useEffect(() => {
    let active = true;
    fetch(`/api/wardrobe/catalog`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.attires?.length) {
          const mapped: OutfitItem[] = data.attires.map((a: OutfitItem) => ({
            id: a.id,
            name: a.name,
            category: a.category,
            prompt: a.prompt,
            imageUrl: a.imageUrl,
            gender: a.gender,
            samPrompt: a.samPrompt,
            description: a.description,
          }));
          setOutfits(mapped);
          setActiveOutfit(mapped[0]);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const filteredOutfits = useMemo(() => {
    return outfits.filter((o) => {
      let matchesGender = true;
      if (selectedGender === "auto") {
        if (currentPersonaGender === "female") {
          matchesGender = o.gender === "female" || o.gender === "unisex";
        } else if (currentPersonaGender === "male") {
          matchesGender = o.gender === "male" || o.gender === "unisex";
        }
      } else if (selectedGender !== "all") {
        matchesGender = o.gender === selectedGender;
      }

      const matchesCategory = selectedCategory === "all" || o.category === selectedCategory;

      const q = deferredSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        o.name.toLowerCase().includes(q) ||
        o.prompt.toLowerCase().includes(q) ||
        (o.category && o.category.toLowerCase().includes(q)) ||
        (o.gender && o.gender.toLowerCase().includes(q));

      return matchesGender && matchesCategory && matchesSearch;
    });
  }, [outfits, selectedGender, currentPersonaGender, selectedCategory, deferredSearch]);

  const handleSelectOutfitForInpaint = (outfit: OutfitItem) => {
    setTargetOutfit(outfit);
    if (outfit.imageUrl) {
      setCustomOutfitImage(outfit.imageUrl);
    }
  };

  const handleAnalyzeSamVision = async (outfit: OutfitItem) => {
    if (!outfit.imageUrl) {
      toast("No Image Plate", "This outfit does not have an image plate to analyze.", "warning");
      return;
    }

    setAnalyzingOutfitId(outfit.id);
    toast("Vision LLM Inspection", `Analyzing "${outfit.name}" plate with Multimodal Vision...`, "info");

    try {
      const res = await fetch("/api/wardrobe/sam-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: outfit.imageUrl,
          attireId: outfit.id,
          contextHint: outfit.name,
          genderHint: outfit.gender,
          saveToDb: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Vision analysis failed");
      }

      setSamAnalysisData((prev) => ({ ...prev, [outfit.id]: data }));
      setOutfits((prev) =>
        prev.map((o) => (o.id === outfit.id ? { ...o, samPrompt: data.samPrompt } : o))
      );
      if (activeOutfit?.id === outfit.id) {
        setActiveOutfit((prev) => ({ ...prev, samPrompt: data.samPrompt }));
      }
      if (targetOutfit?.id === outfit.id) {
        setTargetOutfit((prev) => ({ ...prev, samPrompt: data.samPrompt }));
      }

      const piecesCount = data.detectedGarments?.length || 0;
      toast(
        "SAM 3.1 Prompt Generated!",
        `${(data.confidence * 100).toFixed(0)}% confidence (${data.providerUsed.toUpperCase()}) • ${piecesCount} garment piece${piecesCount === 1 ? "" : "s"} detected`,
        "success"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze image";
      toast("Vision Analysis Error", msg, "error");
    } finally {
      setAnalyzingOutfitId(null);
    }
  };

  const handleAutoFillTrackPromptFromOutfit = async (
    sourceGarmentText?: string,
    onTrackPromptUpdate?: (prompt: string) => void
  ) => {
    if (!targetOutfit) return;

    if (targetOutfit.samPrompt) {
      const prompt = buildFullCanvasTrackPrompt(targetOutfit.samPrompt, sourceGarmentText);
      onTrackPromptUpdate?.(prompt);
      toast("Track Prompt Updated", `Applied SAM tokens from "${targetOutfit.name}"`, "success");
      return;
    }

    if (!targetOutfit.imageUrl) {
      toast("No Image Plate", "Selected outfit does not have an image plate.", "warning");
      return;
    }

    setIsExtractingTrackPrompt(true);
    toast("Vision Analysis", `Inspecting "${targetOutfit.name}" with Multimodal Vision...`, "info");

    try {
      const res = await fetch("/api/wardrobe/sam-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: targetOutfit.imageUrl,
          attireId: targetOutfit.id,
          contextHint: targetOutfit.name,
          genderHint: targetOutfit.gender,
          saveToDb: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Vision analysis failed");
      }

      const newSam = data.samPrompt;
      const prompt = buildFullCanvasTrackPrompt(newSam, sourceGarmentText);
      onTrackPromptUpdate?.(prompt);

      setOutfits((prev) =>
        prev.map((o) => (o.id === targetOutfit.id ? { ...o, samPrompt: newSam } : o))
      );
      setTargetOutfit((prev) => ({ ...prev, samPrompt: newSam }));
      if (activeOutfit?.id === targetOutfit.id) {
        setActiveOutfit((prev) => ({ ...prev, samPrompt: newSam }));
      }
      setSamAnalysisData((prev) => ({ ...prev, [targetOutfit.id]: data }));

      toast(
        "Track Prompt Ready",
        `Vision extracted ${data.detectedGarments?.length || 0} garment targets (${(data.confidence * 100).toFixed(0)}% confidence)`,
        "success"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not analyze image";
      toast("Analysis Failed", msg, "error");
    } finally {
      setIsExtractingTrackPrompt(false);
    }
  };

  const handleCreateCustomAttire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.name.trim() || !customForm.description.trim()) {
      toast("Missing Information", "Please provide both an attire name and description", "warning");
      return;
    }

    setIsCreatingCustom(true);
    toast("Synthesizing 4-Panel Plate", `Generating reference plate for "${customForm.name}"...`, "info");

    try {
      const res = await fetch("/api/wardrobe/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customForm),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to create custom attire");
      }

      const data = await res.json();
      if (data.attire) {
        const newOutfit: OutfitItem = {
          id: data.attire.id,
          name: data.attire.name,
          category: data.attire.category,
          prompt: data.attire.prompt,
          imageUrl: data.attire.imageUrl,
          gender: data.attire.gender,
          samPrompt: data.attire.samPrompt,
          description: data.attire.description,
        };

        setOutfits((prev) => [newOutfit, ...prev]);
        setActiveOutfit(newOutfit);
        setTargetOutfit(newOutfit);
        if (newOutfit.imageUrl) {
          setCustomOutfitImage(newOutfit.imageUrl);
        }
        setShowCustomModal(false);
        setCustomForm({
          name: "",
          description: "",
          gender: "female",
          category: "broadcast",
          samPrompt: "",
        });
        toast(
          "Custom Attire Created & Saved!",
          `"${newOutfit.name}" saved to DB via ${data.attire.engineUsed?.toUpperCase() || "AI"} engine. Ready for any persona!`,
          "success"
        );
      }
    } catch (err: unknown) {
      toast("Creation Failed", err instanceof Error ? err.message : "Failed to synthesize attire", "error");
    } finally {
      setIsCreatingCustom(false);
    }
  };

  const handleGenerateSingle = async (outfit: OutfitItem, personaId: string, personaName: string) => {
    setGeneratingOutfitId(outfit.id);
    toast("Generating Outfit", `Synthesizing ${outfit.name} for ${personaName}...`, "info");

    try {
      const res = await fetch("/api/gemini/lookbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          outfitId: outfit.id,
          count: 1,
        }),
      });

      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      if (data.outfits?.[0]) {
        const updated = outfits.map((o) => (o.id === outfit.id ? { ...o, ...data.outfits[0] } : o));
        setOutfits(updated);
        setActiveOutfit(data.outfits[0]);
        toast("Outfit Ready", `${outfit.name} generated successfully!`, "success");
      }
    } catch (err: unknown) {
      toast("Generation Warning", err instanceof Error ? err.message : "Failed to generate outfit", "error");
    } finally {
      setGeneratingOutfitId(null);
    }
  };

  const handleBatchGenerate = async (personaId: string, personaName: string) => {
    setIsBatchGenerating(true);
    toast("Batch Lookbook", `Generating all 12 wardrobe styles for ${personaName}...`, "info");

    try {
      const res = await fetch("/api/gemini/lookbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          count: 12,
        }),
      });

      if (!res.ok) throw new Error("Batch generation failed");
      const data = await res.json();
      if (data.outfits?.length) {
        setOutfits(data.outfits);
        setActiveOutfit(data.outfits[0]);
        toast("Lookbook Complete", `12-Outfit catalog generated for ${personaName}!`, "success");
      }
    } catch (err: unknown) {
      toast("Batch Error", err instanceof Error ? err.message : "Failed batch generation", "error");
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const addCustomAttire = (outfit: OutfitItem) => {
    setOutfits((prev) => [outfit, ...prev.filter((o) => o.id !== outfit.id)]);
    setActiveOutfit(outfit);
  };

  return {
    outfits,
    setOutfits,
    addCustomAttire,
    activeOutfit,
    setActiveOutfit,
    targetOutfit,
    setTargetOutfit,
    customOutfitImage,
    setCustomOutfitImage,
    selectedGender,
    setSelectedGender,
    selectedCategory,
    setSelectedCategory,
    outfitSearch,
    setOutfitSearch,
    deferredSearch,
    filteredOutfits,
    isBatchGenerating,
    generatingOutfitId,
    showCustomModal,
    setShowCustomModal,
    isCreatingCustom,
    customForm,
    setCustomForm,
    analyzingOutfitId,
    isExtractingTrackPrompt,
    samAnalysisData,
    handleSelectOutfitForInpaint,
    handleAnalyzeSamVision,
    handleAutoFillTrackPromptFromOutfit,
    handleCreateCustomAttire,
    handleGenerateSingle,
    handleBatchGenerate,
  };
}
