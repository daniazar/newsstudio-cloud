"use client";

import { useState, useMemo, useDeferredValue, useEffect, useCallback } from "react";
import { useToast } from "@/components/global/ToastContainer";
import {
  HAIR_CATALOG,
  HairStyleItem,
  HairColorSwatch,
  formatHairstyleWithSwatch,
} from "@/lib/wardrobe/hairCatalog";
import { OutfitItem } from "../types";

export function useHairstyleCatalog(currentPersonaGender?: string) {
  const { toast } = useToast();

  const [hairstyles, setHairstyles] = useState<HairStyleItem[]>(HAIR_CATALOG);
  const [selectedHairGender, setSelectedHairGender] = useState<string>("auto");
  const [selectedHairCategory, setSelectedHairCategory] = useState<string>("all");
  const [selectedHairLength, setSelectedHairLength] = useState<string>("all");
  const [selectedHairColorFamily, setSelectedHairColorFamily] = useState<string>("all");

  const [hairSearch, setHairSearch] = useState<string>("");
  const deferredHairSearch = useDeferredValue(hairSearch);

  const [activeHairstyle, setActiveHairstyle] = useState<HairStyleItem>(HAIR_CATALOG[0]);
  const [selectedColorSwatch, setSelectedColorSwatch] = useState<HairColorSwatch | null>(null);

  // Fetch hairstyles from backend API (includes custom database presets)
  useEffect(() => {
    let active = true;
    fetch("/api/wardrobe/hairstyles")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.hairstyles?.length) {
          setHairstyles(data.hairstyles);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const addCustomHairstyle = useCallback((hair: HairStyleItem) => {
    setHairstyles((prev) => [hair, ...prev.filter((h) => h.id !== hair.id)]);
    setActiveHairstyle(hair);
  }, []);

  const filteredHairstyles = useMemo(() => {
    return hairstyles.filter((h) => {
      let matchesGender = true;
      if (selectedHairGender === "auto") {
        if (currentPersonaGender === "female") {
          matchesGender = h.gender === "female" || h.gender === "unisex";
        } else if (currentPersonaGender === "male") {
          matchesGender = h.gender === "male" || h.gender === "unisex";
        }
      } else if (selectedHairGender !== "all") {
        matchesGender = h.gender === selectedHairGender;
      }

      const matchesCategory = selectedHairCategory === "all" || h.category === selectedHairCategory;
      const matchesLength = selectedHairLength === "all" || h.hairLength === selectedHairLength;
      const matchesColor = selectedHairColorFamily === "all" || h.colorFamily === selectedHairColorFamily;

      const q = deferredHairSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        h.name.toLowerCase().includes(q) ||
        h.hairColor.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q) ||
        h.colorFamily.toLowerCase().includes(q) ||
        h.category.toLowerCase().includes(q);

      return matchesGender && matchesCategory && matchesLength && matchesColor && matchesSearch;
    });
  }, [
    hairstyles,
    selectedHairGender,
    currentPersonaGender,
    selectedHairCategory,
    selectedHairLength,
    selectedHairColorFamily,
    deferredHairSearch,
  ]);

  const selectHairstyle = (
    hair: HairStyleItem,
    customSwatch?: HairColorSwatch | null,
    onTargetOutfitUpdate?: (outfit: OutfitItem) => void,
    onTrackPromptUpdate?: (prompt: string) => void,
    onCustomImageUpdate?: (url: string) => void
  ) => {
    setActiveHairstyle(hair);
    if (customSwatch !== undefined) {
      setSelectedColorSwatch(customSwatch);
    }
    const swatchToUse = customSwatch !== undefined ? customSwatch : selectedColorSwatch;
    const formatted = formatHairstyleWithSwatch(hair, swatchToUse);

    const targetOutfitPayload: OutfitItem = {
      id: hair.id,
      name: formatted.displayName,
      category: hair.category,
      gender: hair.gender,
      prompt: formatted.resolvedPrompt,
      samPrompt: hair.samPrompt,
      imageUrl: hair.imageUrl,
      description: formatted.displayDescription,
      cleanGenPrompt: hair.cleanGenPrompt,
    };

    onTargetOutfitUpdate?.(targetOutfitPayload);
    onTrackPromptUpdate?.(hair.samPrompt);
    if (hair.imageUrl) {
      onCustomImageUpdate?.(hair.imageUrl);
    }

    toast(
      "Hairstyle Selected",
      `Selected ${formatted.displayName}`,
      "info"
    );
  };

  const selectColorSwatch = (
    swatch: HairColorSwatch | null,
    onTargetOutfitUpdate?: (outfit: OutfitItem) => void,
    onTrackPromptUpdate?: (prompt: string) => void,
    onCustomImageUpdate?: (url: string) => void
  ) => {
    setSelectedColorSwatch(swatch);
    if (activeHairstyle) {
      selectHairstyle(activeHairstyle, swatch, onTargetOutfitUpdate, onTrackPromptUpdate, onCustomImageUpdate);
    }
  };

  return {
    hairstyles,
    setHairstyles,
    addCustomHairstyle,
    filteredHairstyles,
    activeHairstyle,
    setActiveHairstyle,
    selectedHairGender,
    setSelectedHairGender,
    selectedHairCategory,
    setSelectedHairCategory,
    selectedHairLength,
    setSelectedHairLength,
    selectedHairColorFamily,
    setSelectedHairColorFamily,
    hairSearch,
    setHairSearch,
    deferredHairSearch,
    selectedColorSwatch,
    setSelectedColorSwatch,
    selectHairstyle,
    selectColorSwatch,
  };
}
