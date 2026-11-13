"use client";

import React, { useState } from "react";
import { X, Download, Copy, Check, Share2, Layers } from "lucide-react";
import { ProductSpec, AdScript } from "@/lib/types/ecommerce";
import {
  generateCompleteCampaignPackage,
  CampaignPlatform,
} from "@/lib/ecommerce/campaignExporter";
import { useToast } from "@/components/global/ToastContainer";

export interface CampaignExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductSpec;
  script: AdScript;
}

export const CampaignExportModal: React.FC<CampaignExportModalProps> = ({
  isOpen,
  onClose,
  product,
  script,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<CampaignPlatform>("meta");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const campaignPackage = generateCompleteCampaignPackage(product, script);

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast("Copied to Clipboard", `Copied ${label}`, "info");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast("CSV Exported", `Downloaded ${filename}`, "success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#0e0e12] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#141418]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Multi-Platform Campaign Exporter
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Bulk Ad Ready
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pre-formatted bulk import CSVs and UTM tracking tags for media buyers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="px-6 pt-4 border-b border-white/10 flex gap-2 bg-[#0c0c0f]">
          <button
            onClick={() => setActiveTab("meta")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "meta"
                ? "border-blue-500 text-blue-400 bg-blue-500/10"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Meta Ads Manager
          </button>
          <button
            onClick={() => setActiveTab("tiktok")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "tiktok"
                ? "border-pink-500 text-pink-400 bg-pink-500/10"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-pink-500" />
            TikTok Ads Manager
          </button>
          <button
            onClick={() => setActiveTab("google_pmax")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "google_pmax"
                ? "border-amber-500 text-amber-400 bg-amber-500/10"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Google Performance Max
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: META ADS MANAGER */}
          {activeTab === "meta" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Meta Ads Manager Bulk Import</div>
                  <div className="text-[11px] text-muted-foreground">
                    Matches Facebook & Instagram Ads Manager bulk spreadsheet schema
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadCsv(campaignPackage.metaCsv, `meta-campaign-${product.id}.csv`)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
                >
                  <Download className="w-3.5 h-3.5" /> Download Meta CSV
                </button>
              </div>

              {/* UTM Destination URL */}
              <div className="bg-[#141418] border border-white/10 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span>Parameter-Tracked Destination URL</span>
                  <button
                    onClick={() => handleCopyText(campaignPackage.utmUrls.meta, "Meta UTM URL")}
                    className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {copiedField === "Meta UTM URL" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy URL
                  </button>
                </div>
                <div className="text-xs font-mono text-white/90 bg-black/40 p-2 rounded-xl overflow-x-auto select-all">
                  {campaignPackage.utmUrls.meta}
                </div>
              </div>

              {/* CSV Raw Preview */}
              <div className="bg-[#141418] border border-white/10 rounded-2xl p-3.5 space-y-1.5">
                <div className="text-[11px] font-bold text-muted-foreground">CSV Table Preview</div>
                <pre className="text-[10px] font-mono text-muted-foreground bg-black/50 p-3 rounded-xl overflow-x-auto max-h-40 whitespace-pre-wrap">
                  {campaignPackage.metaCsv}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: TIKTOK ADS MANAGER */}
          {activeTab === "tiktok" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">TikTok Ads Manager Bulk Upload</div>
                  <div className="text-[11px] text-muted-foreground">
                    Optimized for TikTok Shop and Spark Ads campaign structures
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadCsv(campaignPackage.tiktokCsv, `tiktok-campaign-${product.id}.csv`)}
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-pink-500/20"
                >
                  <Download className="w-3.5 h-3.5" /> Download TikTok CSV
                </button>
              </div>

              {/* TikTok Ad Caption */}
              <div className="bg-[#141418] border border-white/10 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span>Viral TikTok Caption & Hashtags</span>
                  <button
                    onClick={() => handleCopyText(`${script.hookHeadline} 🔥 Honest review! #tiktokshop #review #fyp`, "TikTok Caption")}
                    className="text-[10px] text-pink-400 hover:underline flex items-center gap-1"
                  >
                    {copiedField === "TikTok Caption" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy Caption
                  </button>
                </div>
                <div className="text-xs font-mono text-white/90 bg-black/40 p-2.5 rounded-xl">
                  {script.hookHeadline} 🔥 Honest review of the viral {product.title.slice(0, 30)}! #tiktokshop #review #deal #fyp
                </div>
              </div>

              {/* UTM URL */}
              <div className="bg-[#141418] border border-white/10 rounded-2xl p-3.5 space-y-1.5">
                <div className="text-[11px] font-bold text-muted-foreground">TikTok UTM URL</div>
                <div className="text-xs font-mono text-white/90 bg-black/40 p-2 rounded-xl overflow-x-auto select-all">
                  {campaignPackage.utmUrls.tiktok}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE PERFORMANCE MAX */}
          {activeTab === "google_pmax" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Google Performance Max (PMax) Asset Group</div>
                  <div className="text-[11px] text-muted-foreground">
                    Obeying Google&apos;s strict 30-char and 90-char limits
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(JSON.stringify(campaignPackage.googlePmax, null, 2), "PMax Asset Group")
                  }
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy JSON Asset Group
                </button>
              </div>

              {/* Short Headlines (<=30 chars) */}
              <div className="bg-[#141418] border border-white/10 rounded-2xl p-3.5 space-y-2">
                <div className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                  <span>Short Headlines (Max 30 characters)</span>
                  <span className="text-[9px] text-emerald-400 font-mono">Character Validated</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {campaignPackage.googlePmax.shortHeadlines.map((h, i) => (
                    <div key={i} className="bg-black/40 p-2 rounded-xl text-xs text-white flex items-center justify-between">
                      <span className="truncate">{h}</span>
                      <span className="text-[9px] font-mono text-muted-foreground shrink-0 ml-1.5">{h.length}/30</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Long Headlines (<=90 chars) */}
              <div className="bg-[#141418] border border-white/10 rounded-2xl p-3.5 space-y-2">
                <div className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                  <span>Long Headlines (Max 90 characters)</span>
                </div>
                {campaignPackage.googlePmax.longHeadlines.map((lh, i) => (
                  <div key={i} className="bg-black/40 p-2 rounded-xl text-xs text-white flex items-center justify-between">
                    <span>{lh}</span>
                    <span className="text-[9px] font-mono text-muted-foreground shrink-0 ml-1.5">{lh.length}/90</span>
                  </div>
                ))}
              </div>

              {/* Descriptions (<=90 chars) */}
              <div className="bg-[#141418] border border-white/10 rounded-2xl p-3.5 space-y-2">
                <div className="text-[11px] font-bold text-muted-foreground">Descriptions (Max 90 characters)</div>
                {campaignPackage.googlePmax.descriptions.map((desc, i) => (
                  <div key={i} className="bg-black/40 p-2 rounded-xl text-xs text-white flex items-center justify-between">
                    <span>{desc}</span>
                    <span className="text-[9px] font-mono text-muted-foreground shrink-0 ml-1.5">{desc.length}/90</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-[#141418]/60 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Ready for Meta Ads Manager, TikTok Creative Center, and Google Ads Editor.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
