"use client";

import React, { useState } from "react";
import {
  Smartphone,
  Monitor,
  Square,
  ShieldCheck,
  Download,
  X,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Layers,
} from "lucide-react";
import { OmnichannelCampaignBundle, OmnichannelFormatKey } from "@/lib/ecommerce/omnichannelExporter";

export interface OmnichannelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: OmnichannelCampaignBundle | null;
  isRendering?: boolean;
  onTriggerBatchRender?: () => void;
}

export const OmnichannelExportModal: React.FC<OmnichannelExportModalProps> = ({
  isOpen,
  onClose,
  bundle,
  isRendering = false,
  onTriggerBatchRender,
}) => {
  const [activePreviewFormat, setActivePreviewFormat] = useState<OmnichannelFormatKey>("vertical");

  if (!isOpen) return null;

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMetaCsv = () => {
    if (!bundle?.package?.metaCsv) return;
    downloadFile(bundle.package.metaCsv, `meta-ads-${bundle.campaignId}.csv`, "text/csv");
  };

  const handleDownloadTikTokCsv = () => {
    if (!bundle?.package?.tiktokCsv) return;
    downloadFile(bundle.package.tiktokCsv, `tiktok-ads-${bundle.campaignId}.csv`, "text/csv");
  };

  const handleDownloadPMaxJson = () => {
    if (!bundle?.package?.googlePmax) return;
    downloadFile(
      JSON.stringify(bundle.package.googlePmax, null, 2),
      `google-pmax-${bundle.campaignId}.json`,
      "application/json"
    );
  };

  const handleDownloadManifest = () => {
    if (!bundle) return;
    downloadFile(
      JSON.stringify(bundle, null, 2),
      `campaign-manifest-${bundle.campaignId}.json`,
      "application/json"
    );
  };

  const formatList: Array<{
    key: OmnichannelFormatKey;
    label: string;
    sublabel: string;
    aspect: string;
    resolution: string;
    icon: typeof Smartphone;
  }> = [
    {
      key: "vertical",
      label: "Vertical 9:16",
      sublabel: "TikTok Shop • IG Reels • YouTube Shorts",
      aspect: "9:16",
      resolution: "1080x1920",
      icon: Smartphone,
    },
    {
      key: "landscape",
      label: "Landscape 16:9",
      sublabel: "Amazon PDP • Shopify Desktop • YouTube Ads",
      aspect: "16:9",
      resolution: "1920x1080",
      icon: Monitor,
    },
    {
      key: "square",
      label: "Square 1:1",
      sublabel: "Meta Feed • IG Carousel • LinkedIn Ads",
      aspect: "1:1",
      resolution: "1080x1080",
      icon: Square,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0e0e13] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-black font-black">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">
                  1-Click Omnichannel Campaign Exporter
                </h3>
                <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  9:16 + 16:9 + 1:1
                </span>
                {bundle?.overallQaCertified && (
                  <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    QA Certified
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Simultaneous batch multi-aspect rendering with automated QA Gatekeeper certification & ad manager copy bundles.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {isRendering ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-white">Rendering Omnichannel Campaign Pack...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Rendering 9:16 Vertical, 16:9 Landscape & 1:1 Square with Zero-Trust QA Gatekeeper...
                </p>
              </div>
            </div>
          ) : !bundle ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Ready for 1-Click Omnichannel Batch Export</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Click below to render all 3 commercial formats simultaneously, audit them with Gemini Vision, and bundle Meta, TikTok, and Google PMax copy.
                </p>
              </div>
              {onTriggerBatchRender && (
                <button
                  type="button"
                  onClick={onTriggerBatchRender}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Start 1-Click Omnichannel Render
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 3 Format Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {formatList.map((fmt) => {
                  const Icon = fmt.icon;
                  const meta = bundle.videos[fmt.key];
                  const qa = meta?.qaReport;
                  const isSelected = activePreviewFormat === fmt.key;

                  return (
                    <div
                      key={fmt.key}
                      onClick={() => setActivePreviewFormat(fmt.key)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-cyan-500/10 border-cyan-400 shadow-md shadow-cyan-500/10"
                          : "bg-white/[0.02] border-white/10 hover:bg-white/5"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-black text-white">{fmt.label}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-md">
                            {fmt.resolution}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{fmt.sublabel}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                        {qa ? (
                          <span
                            className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                              qa.status === "CERTIFIED_PASS"
                                ? "text-emerald-400"
                                : qa.status === "FLAGGED_REVIEW"
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {qa.overallScore}/100 {qa.status === "CERTIFIED_PASS" ? "PASS" : "FLAGGED"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">Rendered</span>
                        )}

                        <span className="text-[10px] text-cyan-400 font-bold hover:underline">
                          Select View
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Format Inspection Box */}
              {bundle.videos[activePreviewFormat] && (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">
                        {bundle.videos[activePreviewFormat]?.label} Details
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400">
                        ({bundle.videos[activePreviewFormat]?.resolution})
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground truncate max-w-sm">
                      Output: {bundle.videos[activePreviewFormat]?.outputPath.split(/[\\/]/).pop()}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>
                        Composition Props & Safe-Zones auto-adapted for{" "}
                        <strong className="text-white">
                          {bundle.videos[activePreviewFormat]?.aspectRatio}
                        </strong>
                      </span>
                    </div>
                    {bundle.videos[activePreviewFormat]?.qaReport && (
                      <span className="text-[11px] text-emerald-300 font-bold font-mono">
                        Trust Score: {bundle.videos[activePreviewFormat]?.qaReport.overallScore}/100
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Ad Manager CSV & Copy Bundles */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                  Generated Campaign Assets & CSV Packages
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadMetaCsv}
                    className="p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 text-left space-y-1 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                        Meta Ads Manager CSV
                      </span>
                      <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">5 Dynamic Titles + Primary Body Copy</p>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTikTokCsv}
                    className="p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 text-left space-y-1 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                        TikTok Ads Manager CSV
                      </span>
                      <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">#tiktokshop & Virality Tagged</p>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPMaxJson}
                    className="p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 text-left space-y-1 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                        Google PMax Asset Copy
                      </span>
                      <FileCode className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Strict 30 & 90 Char Compliance</p>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
          <button
            type="button"
            onClick={handleDownloadManifest}
            disabled={!bundle}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Download Manifest JSON
          </button>

          <div className="flex items-center gap-2">
            {onTriggerBatchRender && (
              <button
                type="button"
                onClick={onTriggerBatchRender}
                disabled={isRendering}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRendering ? "animate-spin" : ""}`} />
                Re-Render Omnichannel Pack
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/20"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
