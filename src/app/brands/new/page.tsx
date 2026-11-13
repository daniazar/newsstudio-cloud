"use client";

import { useToast } from "@/components/global/ToastContainer";
import { ArrowLeft,Loader2,Save,Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React,{ useState } from "react";

export default function NewBrandPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [concept, setConcept] = useState("");

  const [form, setForm] = useState({
    name: "",
    handle: "",
    description: "",
    tags: "",
    avatarPrompt: "",
  });

  const handleGenerate = async () => {
    if (!concept) {
      toast("Error", "Please enter a concept for the brand.", "error");
      return;
    }
    setIsGenerating(true);
    try {
      // Use the generic platform prompt under the hood for AI generation
      const res = await fetch("/api/brands/generate-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: concept, platform: "youtube" })
      });
      const data = await res.json();
      
      if (res.ok) {
        setForm(prev => ({
          ...prev,
          name: data.name || prev.name,
          handle: data.handle || prev.handle,
          description: data.description || prev.description,
          tags: data.tags ? data.tags.join(", ") : prev.tags,
          avatarPrompt: data.avatarPrompt || prev.avatarPrompt
        }));
        toast("Success", "Brand generated successfully!", "success");
      } else {
        toast("Error", data.error || "Failed to generate brand", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          handle: form.handle,
          descriptionTemplate: form.description,
          titleTemplate: "{{title}} | " + form.name,
          autoPublish: false
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast("Success", "Brand created! Next: Connect credentials.", "success");
        router.push(`/brands/${data.id}`);
      } else {
        toast("Error", data.error || "Failed to save", "error");
      }
    } catch {
      toast("Error", "Connection error", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <Link href="/brands" className="p-2 rounded-xl border border-border hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-foreground">Create New Brand</h1>
          <p className="text-xs text-muted font-medium mt-1">
            Define your brand's global identity. You can connect API credentials for each platform in the next step.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: AI Generator */}
        <div className="lg:col-span-1 space-y-4">
          <div className="backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl p-6 shadow space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" /> AI Brand Studio
            </h3>
            <p className="text-[10px] text-muted">
              Describe the type of brand you want to create and let Ruby's LLM generate the branding assets.
            </p>
            <textarea
              className="w-full h-32 px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent resize-none placeholder:text-muted/50"
              placeholder="e.g. A fast-paced news channel covering daily AI startups and tech breakthroughs for developers."
              value={concept}
              onChange={e => setConcept(e.target.value)}
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? "Generating..." : "Generate Brand"}
            </button>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="backdrop-blur-md bg-surface/30 border border-border/80 rounded-3xl p-6 shadow space-y-5">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-subtle uppercase">Brand Name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-subtle uppercase">Global Handle *</label>
                <input
                  required
                  type="text"
                  value={form.handle}
                  onChange={e => setForm({ ...form, handle: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-subtle uppercase">Default Description / Bio</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full h-24 px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-subtle uppercase">Default Tags (comma separated)</label>
              <input
                type="text"
                value={form.tags}
                onChange={e => setForm({ ...form, tags: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-subtle uppercase">Avatar Prompt Idea</label>
              <input
                type="text"
                value={form.avatarPrompt}
                onChange={e => setForm({ ...form, avatarPrompt: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-accent"
              />
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-accent-hover transition-all active:scale-95 shadow-md shadow-accent/20 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save & Continue
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
