// src/components/prompt-builder/PresetSelector.tsx

import {
HAIRSTYLE_PRESETS_LIST,
LORA_ADAPTERS,
PRESENTERS,
TATTOO_JEWELRY_PRESETS_LIST,
type FullPreset
} from "@/data/prompt_presets";
import { presetRegistry } from "@/lib/prompt/presetRegistry";
import { compilePresenterPrompt } from "@/lib/prompt/promptCompiler";
import { Check,ChevronDown,ChevronUp,Film,Sliders,Sparkles,Users } from "lucide-react";
import React,{ useEffect,useMemo,useState } from "react";
import useSWR from "swr";

interface LoraConfig {
  name: string;
  strength: number;
  enabled: boolean;
  label: string;
  type?: string;
  engine?: string;
}

interface PresetDbItem {
  id?: string;
  name: string;
  desc: string;
  category?: string;
  subCategory?: string;
  subSubCategory?: string;
  isFullAttire?: boolean;
  isStudioApproved?: boolean;
  videoDesc?: string;
  imageDesc?: string;
  medium?: string;
  lighting?: string;
  color?: string;
}

interface PresetSelectorProps {
  personaDescription?: string;
  onSelect: (result: {
    preset: string;
    compiledPrompt: string;
    compiledVideoPrompt?: string;
    attire: string;
    loras: { name: string; strength: number }[];
  }) => void;
  selectedPreset?: string;
  compact?: boolean;
  exposedEnabled?: boolean;
  compilerOptions?: {
    enableDuplicateStripping?: boolean;
    enableCategorySeparation?: boolean;
    enableQualityBoilerplate?: boolean;
    enableSfwWordSwap?: boolean;
    isAttireOnlyPreview?: boolean;
    studioApprovedOnly?: boolean;
    fullAttireOnly?: boolean;
  };
}

function cleanSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface PaginatedPresetPanelProps {
  category: string;
  subCategory?: string;
  selectedValue: string;
  onSelectValue: (val: string) => void;
  defaultSubLabel: string;
  icon: string;
  studioApprovedOnly?: boolean;
  fullAttireOnly?: boolean;
}

function PaginatedPresetPanel({
  category,
  subCategory,
  selectedValue,
  onSelectValue,
  defaultSubLabel,
  icon,
  studioApprovedOnly = false,
  fullAttireOnly = false
}: PaginatedPresetPanelProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const [selectedSub, setSelectedSub] = useState("");
  const [selectedSubSub, setSelectedSubSub] = useState("");
  const [page, setPage] = useState(1);

  // Build API URL: Lock to subCategory if passed
  const activeSubCategory = subCategory || selectedSub;
  const queryUrl = `/api/presets?category=${category}&page=${page}&limit=12&search=${encodeURIComponent(debouncedSearch)}&subCategory=${encodeURIComponent(activeSubCategory)}&subSubCategory=${encodeURIComponent(selectedSubSub)}&studioApproved=${studioApprovedOnly ? "true" : "false"}&fullAttire=${fullAttireOnly ? "true" : "false"}`;

  const { data, isLoading, mutate } = useSWR(
    queryUrl, 
    url => fetch(url).then(res => res.json()), 
    { keepPreviousData: true }
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleCreated = () => {
      mutate();
    };
    window.addEventListener("preset-created", handleCreated);
    return () => {
      window.removeEventListener("preset-created", handleCreated);
    };
  }, [mutate]);

  // Reset page when debouncedSearch or sub/sub-sub changes without triggering cascading effect
  const [prevFilterKey, setPrevFilterKey] = useState("");
  const currentFilterKey = `${debouncedSearch}|${selectedSub}|${selectedSubSub}`;
  if (currentFilterKey !== prevFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setPage(1);
  }

  const hierarchy = data?.hierarchy || {};
  const subCategoriesList = Object.keys(hierarchy);
  const subSubCategoriesList = activeSubCategory ? (hierarchy[activeSubCategory] || []) : [];

  return (
    <div className="space-y-4">
      {/* Search & Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search presets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-border/80 bg-background/50 text-foreground focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        
        {!subCategory && subCategoriesList.length > 0 && (
          <div className="w-full sm:w-48">
            <select
              value={selectedSub}
              onChange={e => {
                setSelectedSub(e.target.value);
                setSelectedSubSub("");
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/80 bg-background/50 text-foreground focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="">All Categories</option>
              {subCategoriesList.map((sc: string) => (
                <option key={sc} value={sc}>{sc}</option>
              ))}
            </select>
          </div>
        )}

        {selectedSub && subSubCategoriesList.length > 0 && (
          <div className="w-full sm:w-48">
            <select
              value={selectedSubSub}
              onChange={e => setSelectedSubSub(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/80 bg-background/50 text-foreground focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="">All Sub-Groups</option>
              {subSubCategoriesList.map((ssc: string) => (
                <option key={ssc} value={ssc}>{ssc}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Grid of cards */}
      {isLoading && !data ? (
        <div className="flex items-center justify-center py-12 text-xs text-muted">
          <Sparkles className="w-4 h-4 animate-spin text-emerald-400 mr-2" /> Loading presets...
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 pr-1">
          {/* Default Option Card */}
          <button
            onClick={() => onSelectValue("")}
            className={`relative aspect-[3/4] rounded-xl overflow-hidden border flex flex-col items-center justify-center p-3 text-center transition-all ${
              !selectedValue
                ? "border-emerald-500 bg-emerald-950/20 text-emerald-400 ring-2 ring-emerald-500/20"
                : "border-border/60 bg-background/50 hover:bg-white/[0.02]"
            }`}
          >
            <span className="text-xl mb-1">{icon}</span>
            <span className="text-[10px] font-black uppercase">Default</span>
            <span className="text-[8px] text-muted mt-0.5">{defaultSubLabel}</span>
          </button>

          {data?.items?.map((item: PresetDbItem) => {
            const isSelected = selectedValue === item.desc;
            const slug = cleanSlug(item.name);
            
            let imgFolder = "attire";
            if (item.category === "nudeSheer") imgFolder = "nude-sheer";
            else if (item.category === "scenarios") imgFolder = "scenarios";
            else if (item.category === "actions") imgFolder = "actions";
            
            const imgPath = `/presets/${imgFolder}/${slug}.png`;

            return (
              <div
                key={item.id}
                onClick={() => onSelectValue(item.desc)}
                className={`relative aspect-[3/4] rounded-xl overflow-hidden border cursor-pointer group transition-all duration-200 ${
                  isSelected
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-950/10"
                    : "border-border/60 hover:border-border bg-surface/30 hover:bg-surface/50"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgPath}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent flex flex-col justify-end p-2.5">
                  <span className="text-[9px] font-black text-white leading-tight">{item.name}</span>
                  {item.subSubCategory && (
                    <span className="text-[7px] text-emerald-400 font-bold uppercase tracking-wider mt-0.5">{item.subSubCategory}</span>
                  )}
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted">
          <div>
            Showing <span className="font-bold text-foreground">{data.items?.length || 0}</span> of{" "}
            <span className="font-bold text-foreground">{data.totalCount}</span> items
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 rounded bg-background/50 border border-border/80 hover:bg-white/[0.02] disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              Previous
            </button>
            <span className="font-semibold text-foreground">
              {page} / {data.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="px-2 py-1 rounded bg-background/50 border border-border/80 hover:bg-white/[0.02] disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PresetSelector({
  personaDescription = "A professional news presenter",
  onSelect,
  selectedPreset = "news-anchor-desk",
  compact = false,
  exposedEnabled = true,
  compilerOptions = {}
}: PresetSelectorProps) {
  // Preset selection
  const [activePresetSlug, setActivePresetSlug] = useState<string>(selectedPreset);
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>("Studio Defaults");

  // Fetch DB Templates
  const { data: templatesData } = useSWR(
    `/api/presets?category=templates&limit=500`,
    url => fetch(url).then(res => res.json())
  );

  // Accordion panels
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    attire: false,
    scenario: false,
    actions: false,
    hairstyle: false,
    tattooJewelry: false,
    groinStyle: false,
    genitalSize: false,
    genitalFluids: false,
    breastsNipples: false,
    interactivePose: false,
    nudeAttire: false,
    loras: false
  });

  // Custom visual modifier states
  const [selectedAttire, setSelectedAttire] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [selectedHairstyle, setSelectedHairstyle] = useState<string>("");
  const [selectedTattoosPiercings, setSelectedTattoosPiercings] = useState<string>("");
  
  // Split intimate selections
  const [selectedGroinStyle, setSelectedGroinStyle] = useState<string>("");
  const [selectedGenitalSize, setSelectedGenitalSize] = useState<string>("");
  const [selectedGenitalFluids, setSelectedGenitalFluids] = useState<string>("");
  const [selectedBreastsNipples, setSelectedBreastsNipples] = useState<string>("");
  const [selectedInteractivePose, setSelectedInteractivePose] = useState<string>("");
  const [selectedNudeAttire, setSelectedNudeAttire] = useState<string>("");
  
  const [partnerPersonaId, setPartnerPersonaId] = useState<string>("blaze");
  const [interactionRole, setInteractionRole] = useState<string>("primary_submissive_partner_dominant");

  const [customModifiers, _setCustomModifiers] = useState<string[]>([]);
  const [_newModifier, _setNewModifier] = useState<string>("");

  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);

  // Randomizer helper
  const rollRandomElements = React.useCallback(() => {
    // 1. Roll Hairstyle
    const allHair = HAIRSTYLE_PRESETS_LIST.flatMap(cat => cat.sections.flatMap(s => s.items));
    if (allHair.length > 0) {
      const randHair = allHair[Math.floor(Math.random() * allHair.length)].desc;
      setSelectedHairstyle(randHair);
    }

    // 2. Roll Accessories / Jewelry
    const allJewelry = TATTOO_JEWELRY_PRESETS_LIST.flatMap(cat => cat.sections.flatMap(s => s.items));
    if (allJewelry.length > 0 && Math.random() < 0.4) {
      const randJewelry = allJewelry[Math.floor(Math.random() * allJewelry.length)].desc;
      setSelectedTattoosPiercings(randJewelry);
    } else {
      setSelectedTattoosPiercings("");
    }

    // 3. Roll Attire via DB query or client fallbacks (we'll fetch from DB using fetch API)
    fetch(`/api/presets?category=attire&limit=100&studioApproved=${compilerOptions?.studioApprovedOnly ? "true" : "false"}&fullAttire=${compilerOptions?.fullAttireOnly ? "true" : "false"}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.items && data.items.length > 0) {
          const items: PresetDbItem[] = data.items;
          const fullBody = items.filter((a: PresetDbItem) => a.isFullAttire || a.subCategory?.toLowerCase().includes("dress") || a.desc.toLowerCase().includes("gown") || a.desc.toLowerCase().includes("suit"));
          const tops = items.filter((a: PresetDbItem) => !a.isFullAttire && (a.desc.toLowerCase().includes("shirt") || a.desc.toLowerCase().includes("blouse") || a.desc.toLowerCase().includes("top") || a.desc.toLowerCase().includes("blazer") || a.desc.toLowerCase().includes("sweater") || a.desc.toLowerCase().includes("jacket")));
          const bottoms = items.filter((a: PresetDbItem) => !a.isFullAttire && (a.desc.toLowerCase().includes("pants") || a.desc.toLowerCase().includes("skirt") || a.desc.toLowerCase().includes("trousers") || a.desc.toLowerCase().includes("jeans") || a.desc.toLowerCase().includes("shorts")));
          
          if (Math.random() > 0.5 && fullBody.length > 0) {
            const randFull = fullBody[Math.floor(Math.random() * fullBody.length)];
            setSelectedAttire(randFull.desc);
          } else if (tops.length > 0 && bottoms.length > 0) {
            const randTop = tops[Math.floor(Math.random() * tops.length)];
            const randBottom = bottoms[Math.floor(Math.random() * bottoms.length)];
            setSelectedAttire(`wearing ${randTop.desc.replace(/^attire:\s*/i, "")} and ${randBottom.desc.replace(/^attire:\s*/i, "")}`);
          } else {
            const randAny = items[Math.floor(Math.random() * items.length)];
            setSelectedAttire(randAny.desc);
          }
        }
      })
      .catch(err => console.error("Error rolling random attire:", err));
  }, [compilerOptions?.studioApprovedOnly, compilerOptions?.fullAttireOnly]);

  // Roll random elements whenever the studio preset changes
  useEffect(() => {
    rollRandomElements();
  }, [activePresetSlug, rollRandomElements]);



  // LoRA settings
  const [loras, setLoras] = useState<LoraConfig[]>(
    LORA_ADAPTERS.map(l => ({
      name: l.name,
      label: l.label,
      strength: l.strength,
      enabled: l.enabled,
      type: l.type,
      engine: (l as { engine?: string }).engine
    }))
  );

  const [loraFilter, setLoraFilter] = useState<"all" | "flux" | "ltx" | "wan">("all");

  const staticPresets = useMemo(() => presetRegistry.getAll(), []);

  const allTemplates = useMemo(() => {
    const list: { slug: string, category: string, preset: FullPreset, isDb: boolean }[] = [];
    
    // 1. Add Studio Defaults
    staticPresets.forEach(item => {
      list.push({
        slug: item.slug,
        category: "Studio Defaults",
        preset: item.preset,
        isDb: false
      });
    });

    // 2. Add DB Templates
    if (templatesData && templatesData.items) {
      templatesData.items.forEach((dbItem: PresetDbItem) => {
        list.push({
          slug: `db_${dbItem.id}`,
          category: dbItem.subCategory || "Other",
          isDb: true,
          preset: {
            name: dbItem.name,
            description: dbItem.desc,
            action: dbItem.videoDesc || "",
            scenario: dbItem.imageDesc || "",
            medium: dbItem.medium || "",
            lighting: dbItem.lighting || "",
            color: dbItem.color || ""
          }
        });
      });
    }
    return list;
  }, [staticPresets, templatesData]);

  const templateCategories = useMemo(() => {
    const cats = new Set<string>();
    allTemplates.forEach(t => cats.add(t.category));
    return Array.from(cats);
  }, [allTemplates]);

  const visibleTemplates = useMemo(() => {
    return allTemplates.filter(t => t.category === selectedTemplateCategory);
  }, [allTemplates, selectedTemplateCategory]);

  // Find active preset config
  const activePreset = useMemo(() => {
    const found = allTemplates.find(t => t.slug === activePresetSlug);
    return found ? found.preset : staticPresets[0].preset;
  }, [activePresetSlug, allTemplates, staticPresets]);

  // Check if we are inside a multi-persona interaction preset
  const isMultiPersonaInteraction = useMemo(() => {
    // Check if the template explicitly mentions Model B
    const actionLower = activePreset.action?.toLowerCase() || "";
    const scenarioLower = activePreset.scenario?.toLowerCase() || "";
    const descriptionLower = activePreset.description?.toLowerCase() || "";
    if (actionLower.includes("model b") || scenarioLower.includes("model b") || descriptionLower.includes("model b")) {
      return true;
    }

    const activeSelection = selectedInteractivePose;
    if (!activeSelection) return false;
    const lower = activeSelection.toLowerCase();
    return lower.includes("embrace") || 
           lower.includes("caress") || 
           lower.includes("whisper") || 
           lower.includes("kissing") || 
           lower.includes("massage from behind") || 
           lower.includes("collar & leash") || 
           lower.includes("spanking over lap") || 
           lower.includes("active shibari") || 
           lower.includes("double masturbation") || 
           lower.includes("scissoring") || 
           lower.includes("intercourse") || 
           lower.includes("deepthroat") || 
           lower.includes("double penetration") || 
           lower.includes("face sitting") || 
           lower.includes("69 position") || 
           lower.includes("strap-on") || 
           lower.includes("finger insertion") || 
           lower.includes("footjob") || 
           lower.includes("leash-walk") || 
           lower.includes("licking") || 
           lower.includes("breast play") || 
           lower.includes("whip spanking") || 
           lower.includes("cunnilingus") || 
           lower.includes("whipped back caress") || 
           lower.includes("saliva") || 
           lower.includes("spit exchange") || 
           lower.includes("worship") || 
           lower.includes("eye contact") || 
           lower.includes("hair pulling");
  }, [selectedInteractivePose, activePreset]);

  // Toggle sections
  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Compile prompt live preview
  const compiledPromptResult = useMemo(() => {
    const activeLorasList = loras
      .filter(l => l.enabled && l.name)
      .map(l => ({ name: l.name, strength: l.strength }));

    const presetWithOverrides = {
      ...activePreset,
      action: selectedAction || activePreset.action,
      scenario: selectedScenario || activePreset.scenario
    };

    const combinedModifiers = [...customModifiers];
    if (selectedHairstyle) combinedModifiers.push(selectedHairstyle);
    if (selectedTattoosPiercings) combinedModifiers.push(selectedTattoosPiercings);
    
    if (exposedEnabled) {
      if (selectedGroinStyle) combinedModifiers.push(selectedGroinStyle);
      if (selectedGenitalSize) combinedModifiers.push(selectedGenitalSize);
      if (selectedGenitalFluids) combinedModifiers.push(selectedGenitalFluids);
      if (selectedBreastsNipples) combinedModifiers.push(selectedBreastsNipples);
      if (selectedInteractivePose) combinedModifiers.push(selectedInteractivePose);
      if (selectedNudeAttire) combinedModifiers.push(selectedNudeAttire);
    }

    const primaryAnchor = PRESENTERS.find(p => 
      p.description === personaDescription || 
      personaDescription.includes(p.name) ||
      (p.visualBodyPrompt && personaDescription.includes(p.visualBodyPrompt))
    ) || PRESENTERS[0]; // Fallback to Ruby

    const partnerAnchor = PRESENTERS.find(p => p.id === partnerPersonaId) || PRESENTERS[1]; // Fallback to Blaze

    return compilePresenterPrompt({
      personaDescription,
      preset: presetWithOverrides,
      attire: selectedAttire || undefined,
      extraModifiers: combinedModifiers,
      loras: activeLorasList,
      partnerDescription: isMultiPersonaInteraction ? partnerAnchor.description : undefined,
      partnerBodyPrompt: isMultiPersonaInteraction ? partnerAnchor.visualBodyPrompt : undefined,
      partnerName: isMultiPersonaInteraction ? partnerAnchor.name : undefined,
      primaryName: isMultiPersonaInteraction ? primaryAnchor.name : undefined,
      interactionRole: isMultiPersonaInteraction ? interactionRole : undefined,
      ...compilerOptions
    });
  }, [
    personaDescription, activePreset, selectedAttire, selectedAction,
    selectedScenario, selectedHairstyle, selectedTattoosPiercings,
    selectedGroinStyle, selectedGenitalSize, selectedGenitalFluids,
    selectedBreastsNipples, selectedInteractivePose, selectedNudeAttire,
    customModifiers, loras, exposedEnabled, partnerPersonaId, interactionRole,
    isMultiPersonaInteraction, compilerOptions
  ]);

  // Trigger callback when values change
  useEffect(() => {
    onSelect({
      preset: activePresetSlug,
      compiledPrompt: compiledPromptResult.positivePrompt,
      compiledVideoPrompt: compiledPromptResult.videoPrompt,
      attire: selectedAttire || compiledPromptResult.attireUsed,
      loras: loras.filter(l => l.enabled && l.name).map(l => ({ name: l.name, strength: l.strength }))
    });
  }, [activePresetSlug, compiledPromptResult, selectedAttire, loras, onSelect]);

  const handleLoraToggle = (index: number) => {
    setLoras(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], enabled: !copy[index].enabled };
      return copy;
    });
  };

  const handleLoraStrengthChange = (index: number, val: number) => {
    setLoras(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], strength: val };
      return copy;
    });
  };

  return (
    <div className="space-y-6 w-full text-foreground">
      {/* Preset Grid Selection */}
      <div>
        {isMultiPersonaInteraction && (
          <div className="mb-6 p-4 border border-rose-500/40 bg-rose-950/20 rounded-2xl flex flex-col gap-4 shadow-lg shadow-rose-900/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Film className="w-16 h-16 text-rose-500" />
            </div>
            
            <div className="flex items-center gap-2 text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Multi-Persona Scene Detected (Model B Required)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <div>
                <label className="text-xs font-semibold text-muted mb-1.5 block">Select Partner (Model B)</label>
                <select
                  value={partnerPersonaId}
                  onChange={(e) => setPartnerPersonaId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-rose-500"
                >
                  {PRESENTERS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted mb-1.5 block">Interaction Role (Dynamic Framing)</label>
                <select
                  value={interactionRole}
                  onChange={(e) => setInteractionRole(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-rose-500"
                >
                  <option value="primary_submissive_partner_dominant">Model A Submissive / Model B Dominant</option>
                  <option value="primary_dominant_partner_submissive">Model A Dominant / Model B Submissive</option>
                  <option value="equal_interaction">Equal Interaction (No Power Dynamic)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Film className="w-4 h-4 text-emerald-400" /> Choose Studio Setting
          </h3>
          
          <select
            value={selectedTemplateCategory}
            onChange={(e) => setSelectedTemplateCategory(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 text-xs rounded-xl border border-border/80 bg-surface/30 text-foreground focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
          >
            {templateCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        
        <div className={`grid gap-4 ${compact ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}`}>
          {visibleTemplates.map(item => {
            const isSelected = item.slug === activePresetSlug;
            const imgPath = item.isDb ? "" : presetRegistry.getPreviewImagePath(item.slug);

            return (
              <div
                key={item.slug}
                onClick={() => {
                  setActivePresetSlug(item.slug);
                  setSelectedAction("");
                  setSelectedScenario("");
                }}
                className={`relative rounded-2xl overflow-hidden border cursor-pointer group transition-all duration-300 ${
                  isSelected
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-950/10 shadow-lg shadow-emerald-950/20"
                    : "border-border/60 hover:border-border bg-surface/30 hover:bg-surface/50"
                }`}
              >
                {/* Visual Thumbnail */}
                <div className="relative aspect-[9/13] w-full bg-surface/80 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgPath}
                    alt={item.preset.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-3.5">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">Preset</span>
                    <h4 className="text-xs font-black tracking-tight text-white leading-tight">{item.preset.name}</h4>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                
                {!compact && (
                  <div className="p-3 text-[11px] text-muted leading-relaxed min-h-[56px] border-t border-border/40">
                    {item.preset.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Advanced Customizations Toggle & Auto Randomizer Info */}
      <div className="p-5 border border-border/80 rounded-2xl bg-surface/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-foreground">Advanced Override Settings</h4>
            <p className="text-[10px] text-muted">Manually select hairstyles, wardrobe pieces, and micro-behaviors</p>
          </div>
          <button
            onClick={() => setIsAdvancedMode(!isAdvancedMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isAdvancedMode
                ? "border-emerald-500 bg-emerald-950/20 text-emerald-400"
                : "border-border bg-background hover:bg-white/[0.02]"
            }`}
          >
            {isAdvancedMode ? "Hide Details" : "Configure Manually"}
          </button>
        </div>

        {!isAdvancedMode && (
          <div className="p-4 rounded-xl bg-background/50 border border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] leading-relaxed">
            <div className="space-y-1">
              <span className="font-bold text-emerald-400 block uppercase tracking-wider text-[9px]">👕 Attire Auto-Selected</span>
              <p className="text-foreground">{selectedAttire ? selectedAttire.replace("attire: ", "") : "None (Default Template)"}</p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-emerald-400 block uppercase tracking-wider text-[9px]">💇 Hair Auto-Selected</span>
              <p className="text-foreground">{selectedHairstyle ? selectedHairstyle.replace("hairstyle: ", "") : "None (Default Template)"}</p>
            </div>
            {selectedTattoosPiercings && (
              <div className="space-y-1 sm:col-span-2 border-t border-border/30 pt-2">
                <span className="font-bold text-emerald-400 block uppercase tracking-wider text-[9px]">✨ Accessories Auto-Selected</span>
                <p className="text-foreground">{selectedTattoosPiercings}</p>
              </div>
            )}
            <div className="sm:col-span-2 border-t border-border/30 pt-3 flex justify-end">
              <button
                onClick={rollRandomElements}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <span>🎲</span> Roll Random Outfit
              </button>
            </div>
          </div>
        )}
      </div>

      {isAdvancedMode && (
        <div className="space-y-3">
          {/* Attire Customization */}
        <div className="border border-border/80 rounded-2xl bg-surface/10 overflow-hidden">
          <button
            onClick={() => toggleSection("attire")}
            aria-expanded={openSections.attire}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">👔</span>
              <div>
                <h4 className="text-xs font-bold text-foreground">Attire & Wardrobe Selection</h4>
                <p className="text-[10px] text-muted mt-0.5">
                  {selectedAttire ? `Custom: ${selectedAttire.replace("attire: ", "")}` : "Standard news anchor blazers & field coats"}
                </p>
              </div>
            </div>
            {openSections.attire ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          </button>

          {openSections.attire && (
            <div className="p-5 border-t border-border/40 bg-surface/20 space-y-4 animate-slide-down">
              <PaginatedPresetPanel
                category="attire"
                selectedValue={selectedAttire}
                onSelectValue={setSelectedAttire}
                defaultSubLabel="Preset Wardrobe"
                icon="👔"
                studioApprovedOnly={compilerOptions?.studioApprovedOnly}
                fullAttireOnly={compilerOptions?.fullAttireOnly}
              />
            </div>
          )}
        </div>

        {/* Scenario/Environment Customization */}
        <div className="border border-border/80 rounded-2xl bg-surface/10 overflow-hidden">
          <button
            onClick={() => toggleSection("scenario")}
            aria-expanded={openSections.scenario}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🎬</span>
              <div>
                <h4 className="text-xs font-bold text-foreground">Scenarios & Environments</h4>
                <p className="text-[10px] text-muted mt-0.5">
                  {selectedScenario ? `Custom: ${selectedScenario.replace("environment: ", "")}` : "Uses preset backdrop settings"}
                </p>
              </div>
            </div>
            {openSections.scenario ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          </button>

          {openSections.scenario && (
            <div className="p-5 border-t border-border/40 bg-surface/20 space-y-4 animate-slide-down">
              <PaginatedPresetPanel
                category="scenarios"
                selectedValue={selectedScenario}
                onSelectValue={setSelectedScenario}
                defaultSubLabel="Preset Backdrop"
                icon="🎬"
              />
            </div>
          )}
        </div>

        {/* Action/Pose Customization */}
        <div className="border border-border/80 rounded-2xl bg-surface/10 overflow-hidden">
          <button
            onClick={() => toggleSection("actions")}
            aria-expanded={openSections.actions}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🧍</span>
              <div>
                <h4 className="text-xs font-bold text-foreground">Actions, Poses & Gestures</h4>
                <p className="text-[10px] text-muted mt-0.5">
                  {selectedAction ? `Custom: ${selectedAction.replace("pose: ", "")}` : "Uses preset default broadcast action"}
                </p>
              </div>
            </div>
            {openSections.actions ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          </button>

          {openSections.actions && (
            <div className="p-5 border-t border-border/40 bg-surface/20 space-y-4 animate-slide-down">
              <PaginatedPresetPanel
                category="actions"
                selectedValue={selectedAction}
                onSelectValue={setSelectedAction}
                defaultSubLabel="Preset Action"
                icon="🧍"
              />
            </div>
          )}
        </div>

        {/* Hairstyle Customization */}
        <div className="border border-border/80 rounded-2xl bg-surface/10 overflow-hidden">
          <button
            onClick={() => toggleSection("hairstyle")}
            aria-expanded={openSections.hairstyle}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">💇</span>
              <div>
                <h4 className="text-xs font-bold text-foreground">Hairstyles & Cuts</h4>
                <p className="text-[10px] text-muted mt-0.5">
                  {selectedHairstyle ? `Custom: ${selectedHairstyle.replace("hairstyle: ", "")}` : "Standard character default styling"}
                </p>
              </div>
            </div>
            {openSections.hairstyle ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          </button>

          {openSections.hairstyle && (
            <div className="p-5 border-t border-border/40 bg-surface/20 space-y-4 animate-slide-down">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-h-96 overflow-y-auto pr-1">
                <button
                  onClick={() => setSelectedHairstyle("")}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden border flex flex-col items-center justify-center p-3 text-center transition-all ${
                    !selectedHairstyle
                      ? "border-emerald-500 bg-emerald-950/20 text-emerald-400 ring-2 ring-emerald-500/20"
                      : "border-border/60 bg-background/50 hover:bg-white/[0.02]"
                  }`}
                >
                  <span className="text-xl mb-1">💇</span>
                  <span className="text-[10px] font-black uppercase">Default</span>
                  <span className="text-[8px] text-muted mt-0.5">Anchor Default</span>
                </button>
                {HAIRSTYLE_PRESETS_LIST.flatMap(cat => cat.sections.flatMap(s => s.items)).map(item => {
                  const isSelected = selectedHairstyle === item.desc;
                  const slug = cleanSlug(item.title);
                  const imgPath = `/presets/hairstyle/${slug}.png`;

                  return (
                    <div
                      key={item.title}
                      onClick={() => setSelectedHairstyle(item.desc)}
                      className={`relative aspect-[3/4] rounded-xl overflow-hidden border cursor-pointer group transition-all duration-200 ${
                        isSelected
                          ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-950/10"
                          : "border-border/60 hover:border-border bg-surface/30 hover:bg-surface/50"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgPath}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-2.5">
                        <span className="text-[9px] font-black text-white leading-tight">{item.title}</span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tattoos, Piercings & Accessories Customization */}
        <div className="border border-border/80 rounded-2xl bg-surface/10 overflow-hidden">
          <button
            onClick={() => toggleSection("tattooJewelry")}
            aria-expanded={openSections.tattooJewelry}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">✨</span>
              <div>
                <h4 className="text-xs font-bold text-foreground">Tattoos, Piercings & Body Art</h4>
                <p className="text-[10px] text-muted mt-0.5">
                  {selectedTattoosPiercings ? `Custom: ${selectedTattoosPiercings.replace("detail: ", "").replace("jewelry: ", "")}` : "None"}
                </p>
              </div>
            </div>
            {openSections.tattooJewelry ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          </button>

          {openSections.tattooJewelry && (
            <div className="p-5 border-t border-border/40 bg-surface/20 space-y-4 animate-slide-down">
              {exposedEnabled ? (
                <PaginatedPresetPanel
                  category="nudeSheer"
                  subCategory="Nude - Piercings, Chains & Weighted Chains"
                  selectedValue={selectedTattoosPiercings}
                  onSelectValue={setSelectedTattoosPiercings}
                  defaultSubLabel="No Accessories / Piercings"
                  icon="✨"
                />
              ) : (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-h-96 overflow-y-auto pr-1">
                  <button
                    onClick={() => setSelectedTattoosPiercings("")}
                    className={`relative aspect-[3/4] rounded-xl overflow-hidden border flex flex-col items-center justify-center p-3 text-center transition-all ${
                      !selectedTattoosPiercings
                        ? "border-emerald-500 bg-emerald-950/20 text-emerald-400 ring-2 ring-emerald-500/20"
                        : "border-border/60 bg-background/50 hover:bg-white/[0.02]"
                    }`}
                  >
                    <span className="text-xl mb-1">✨</span>
                    <span className="text-[10px] font-black uppercase">None</span>
                    <span className="text-[8px] text-muted mt-0.5">No Accessories</span>
                  </button>
                  {TATTOO_JEWELRY_PRESETS_LIST.flatMap(cat => cat.sections.flatMap(s => s.items)).map(item => {
                    const isSelected = selectedTattoosPiercings === item.desc;
                    const slug = cleanSlug(item.title);
                    const imgPath = `/presets/tattoo-jewelry/${slug}.png`;

                    return (
                      <div
                        key={item.title}
                        onClick={() => setSelectedTattoosPiercings(item.desc)}
                        className={`relative aspect-[3/4] rounded-xl overflow-hidden border cursor-pointer group transition-all duration-200 ${
                          isSelected
                            ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-950/10"
                            : "border-border/60 hover:border-border bg-surface/30 hover:bg-surface/50"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgPath}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-2.5">
                          <span className="text-[9px] font-black text-white leading-tight">{item.title}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Groin Style & Look */}
        {exposedEnabled && (
          <div className="border border-border/80 rounded-2xl bg-surface/10 overflow-hidden">
            <button
              onClick={() => toggleSection("groinStyle")}
              aria-expanded={openSections.groinStyle}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">👙</span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Groin Style & Appearance</h4>
                  <p className="text-[10px] text-muted mt-0.5">
                    {selectedGroinStyle ? `Selected: ${selectedGroinStyle.replace("groin style: ", "").substring(0, 30)}...` : "Default anchor groin appearance"}
                  </p>
                </div>
              </div>
              {openSections.groinStyle ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
            </button>

            {openSections.groinStyle && (
              <div className="p-5 border-t border-border/40 bg-surface/20 space-y-4 animate-slide-down">
                <PaginatedPresetPanel
                  category="nudeSheer"
                  subCategory="Nude - Groin Style"
                  selectedValue={selectedGroinStyle}
                  onSelectValue={setSelectedGroinStyle}
                  defaultSubLabel="Smooth Groin Cleft"
                  icon="👙"
                />
              </div>
            )}
          </div>
        )}

        {/* Genital Size & Proportions */}
        {exposedEnabled && (
          <div className="border border-border/80 rounded-2xl bg-surface/10 overflow-hidden">
            <button
              onClick={() => toggleSection("genitalSize")}
              aria-expanded={openSections.genitalSize}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">📏</span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Genital Size & Proportions</h4>
                  <p className="text-[10px] text-muted mt-0.5">
                    {selectedGenitalSize ? `Selected: ${selectedGenitalSize.replace("groin detail: ", "").substring(0, 30)}...` : "Standard dimensions"}
                  </p>
                </div>
              </div>
              {openSections.genitalSize ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
            </button>

            {openSections.genitalSize && (
              <div className="p-5 border-t border-border/40 bg-surface/20 space-y-4 animate-slide-down">
                <PaginatedPresetPanel
                  category="nudeSheer"
                  subCategory="Nude - Genital Size & Length"
                  selectedValue={selectedGenitalSize}
                  onSelectValue={setSelectedGenitalSize}
                  defaultSubLabel="Default Proportions"
                  icon="📏"
                />
              </div>
            )}
          </div>
        )}

        {/* Intimate Fluids & Details */}
        {exposedEnabled && (
          <div className="border border-border/80 rounded-2xl bg-surface/10 overflow-hidden">
            <button
              onClick={() => toggleSection("genitalFluids")}
              aria-expanded={openSections.genitalFluids}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">💦</span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Intimate Fluids & Special Details</h4>
                  <p className="text-[10px] text-muted mt-0.5">
                    {selectedGenitalFluids ? `Selected: ${selectedGenitalFluids.replace("groin detail: ", "").substring(0, 30)}...` : "None"}
                  </p>
                </div>
              </div>
              {openSections.genitalFluids ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
            </button>

            {openSections.genitalFluids && (
              <div className="p-5 border-t border-border/40 bg-surface/20 space-y-4 animate-slide-down">
                <PaginatedPresetPanel
                  category="nudeSheer"
                  subCategory="Nude - Genital Fluids & Details"
                  selectedValue={selectedGenitalFluids}
                  onSelectValue={setSelectedGenitalFluids}
                  defaultSubLabel="Clean Skin"
                  icon="💦"
                />
              </div>
            )}
          </div>
        )}

        {/* Breasts & Nipples Styling */}
        {exposedEnabled && (
          <div className="border border-border/80 rounded-2xl bg-surface/10 overflow-hidden">
            <button
              onClick={() => toggleSection("breastsNipples")}
              aria-expanded={openSections.breastsNipples}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🍒</span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Breasts & Nipples (Physics-Aware)</h4>
                  <p className="text-[10px] text-muted mt-0.5">
                    {selectedBreastsNipples ? `Selected: ${selectedBreastsNipples.substring(0, 30)}...` : "Standard anchor body shape"}
                  </p>
                </div>
              </div>
              {openSections.breastsNipples ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
            </button>

            {openSections.breastsNipples && (
              <div className="p-5 border-t border-border/40 bg-surface/20 space-y-4 animate-slide-down">
                <PaginatedPresetPanel
                  category="nudeSheer"
                  subCategory="Nude - Breast Shapes & Sizes"
                  selectedValue={selectedBreastsNipples}
                  onSelectValue={setSelectedBreastsNipples}
                  defaultSubLabel="Standard Chest"
                  icon="🍒"
                />
              </div>
            )}
          </div>
        )}

        {/* Glamour & BDSM Poses / Toys */}
        {exposedEnabled && (
          <div className="border border-border/80 rounded-2xl bg-surface/10 overflow-hidden">
            <button
              onClick={() => toggleSection("interactivePose")}
              aria-expanded={openSections.interactivePose}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🌶️</span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Glamour & BDSM Poses / Toys</h4>
                  <p className="text-[10px] text-muted mt-0.5">
                    {selectedInteractivePose ? `Selected: ${selectedInteractivePose.substring(0, 30)}...` : "Default preset pose"}
                  </p>
                </div>
              </div>
              {openSections.interactivePose ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
            </button>

            {openSections.interactivePose && (
              <div className="p-5 border-t border-border/40 bg-surface/20 space-y-4 animate-slide-down">
                <PaginatedPresetPanel
                  category="nudeSheer"
                  subCategory="Nude - Multi-Persona Interactions"
                  selectedValue={selectedInteractivePose}
                  onSelectValue={setSelectedInteractivePose}
                  defaultSubLabel="Standard Standing Pose"
                  icon="🌶️"
                />
              </div>
            )}
          </div>
        )}

        {/* Nude Attire, Harnesses & Accessories */}
        {exposedEnabled && (
          <div className="border border-border/80 rounded-2xl bg-surface/10 overflow-hidden">
            <button
              onClick={() => toggleSection("nudeAttire")}
              aria-expanded={openSections.nudeAttire}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">⛓️</span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Nude Attire, Harnesses & Accessories</h4>
                  <p className="text-[10px] text-muted mt-0.5">
                    {selectedNudeAttire ? `Selected: ${selectedNudeAttire.substring(0, 30)}...` : "None"}
                  </p>
                </div>
              </div>
              {openSections.nudeAttire ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
            </button>

            {openSections.nudeAttire && (
              <div className="p-5 border-t border-border/40 bg-surface/20 space-y-4 animate-slide-down">
                <PaginatedPresetPanel
                  category="nudeSheer"
                  subCategory="Nude - Attires"
                  selectedValue={selectedNudeAttire}
                  onSelectValue={setSelectedNudeAttire}
                  defaultSubLabel="Fully Unrestricted"
                  icon="⛓️"
                />
              </div>
            )}
          </div>
        )}

        {/* LoRA Adapters */}
        <div className="border border-border/80 rounded-2xl bg-surface/10 overflow-hidden">
          <button
            onClick={() => toggleSection("loras")}
            aria-expanded={openSections.loras}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <div>
                <h4 className="text-xs font-bold text-foreground">LoRA Adapters</h4>
                <p className="text-[10px] text-muted mt-0.5">
                  {loras.filter(l => l.enabled).length} active model enhancers loaded
                </p>
              </div>
            </div>
            {openSections.loras ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          </button>

          {openSections.loras && (
            <div className="p-5 border-t border-border/40 bg-surface/20 space-y-4 animate-slide-down">
              {/* Tab Selector */}
              <div className="flex flex-wrap gap-2 border-b border-border/20 pb-3">
                {(["all", "flux", "ltx", "wan"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setLoraFilter(tab)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      loraFilter === tab
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-surface border border-border/40 text-muted hover:text-foreground"
                    }`}
                  >
                    {tab === "all" ? "All" : tab === "flux" ? "Image (Flux)" : tab === "ltx" ? "LTX Video" : "Wan Video"}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {loras.map((lora, idx) => {
                  if (!lora.name) return null;

                  // Filter logic
                  if (loraFilter === "flux") {
                    if (lora.type !== "image" && lora.type !== "both") return null;
                  } else if (loraFilter === "ltx") {
                    if (lora.type !== "video" && lora.type !== "both") return null;
                    if (lora.engine !== "ltx" && lora.engine !== "both") return null;
                  } else if (loraFilter === "wan") {
                    if (lora.type !== "video" && lora.type !== "both") return null;
                    if (lora.engine !== "wan" && lora.engine !== "both") return null;
                  }

                  return (
                    <div key={lora.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-xl bg-background/50 border border-border/40">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lora.enabled}
                          onChange={() => handleLoraToggle(idx)}
                          className="w-4 h-4 accent-emerald-500 rounded border-border"
                        />
                        <div className="flex flex-row items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{lora.label}</span>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                            lora.type === "video"
                              ? lora.engine === "ltx"
                                ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                : lora.engine === "wan"
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : lora.type === "both"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}>
                            {lora.type === "video" 
                              ? lora.engine === "ltx" 
                                ? "video (ltx)" 
                                : lora.engine === "wan" 
                                ? "video (wan)" 
                                : "video (both)" 
                              : lora.type || "image"}
                          </span>
                        </div>
                      </label>
                      
                      {lora.enabled && (
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <input
                            type="range"
                            min="0.1"
                            max="2.0"
                            step="0.1"
                            value={lora.strength}
                            onChange={(e) => handleLoraStrengthChange(idx, parseFloat(e.target.value))}
                            className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                          <span className="text-[10px] font-bold text-muted w-8 text-right">
                            {lora.strength.toFixed(1)}x
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Partner Persona Selector */}
      {isMultiPersonaInteraction && (
        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/5 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-2.5">
            <Users className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-emerald-400">Multi-Persona Casting Selector</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-subtle uppercase tracking-wider">Cast Partner Persona</label>
              <select
                value={partnerPersonaId}
                onChange={(e) => setPartnerPersonaId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-background text-xs font-bold focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {PRESENTERS.filter(p => p.id !== "scratch").map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.id === "ruby" || p.id === "blaze" || p.id === "storm" || p.id === "luna" || p.id === "isabel" || p.id === "claire" || p.id === "abigail" || p.id === "jade" || p.id === "layla" || p.id === "taylor" ? "Female" : "Male"})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-subtle uppercase tracking-wider">Role Distribution Mode</label>
              <select
                value={interactionRole}
                onChange={(e) => setInteractionRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-background text-xs font-bold focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="primary_submissive_partner_dominant">You Submissive / Partner Dominant</option>
                <option value="primary_dominant_partner_submissive">You Dominant / Partner Submissive</option>
                <option value="symmetrical">Symmetrical Interaction (Equal)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Live Compiled Prompt Preview Card */}
      <div className="p-5 border border-emerald-500/20 bg-emerald-950/5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2.5">
          <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" /> Compiled Presenter Prompt
          </h4>
          <span className="text-[10px] font-mono text-muted uppercase">Live Preview</span>
        </div>
        <p className="text-xs text-muted leading-relaxed font-mono select-all bg-black/20 p-3.5 rounded-xl border border-border/30 max-h-24 overflow-y-auto">
          {compiledPromptResult.positivePrompt}
        </p>
        <div className="flex justify-between items-center text-[10px] text-muted">
          <span>Preset slug: <code className="bg-white/5 px-1 py-0.5 rounded text-foreground font-mono">{compiledPromptResult.presetSlug}</code></span>
          <span>compiled prompt length: {compiledPromptResult.positivePrompt.length} chars</span>
        </div>
      </div>
    </div>
  );
}
