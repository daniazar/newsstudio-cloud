"use client";

import { useToast } from "@/components/global/ToastContainer";
import { ArrowLeft,Edit3,Film,FolderOpen,HardDrive,Image as ImageIcon,Layers,Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";

interface AssetUsage {
  storyId: string;
  storyTitle: string;
  sceneIndex: number;
}

interface Asset {
  key: string;
  name: string;
  url: string;
  size: number;
  lastModified: string;
  usages: AssetUsage[];
}

export default function AssetVaultPage() {
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [renamingAsset, setRenamingAsset] = useState<{
    key: string;
    baseName: string;
    ext: string;
  } | null>(null);
  const [renameInput, setRenameInput] = useState("");

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/assets");
      const data = await res.json();
      setAssets(data.assets || []);
    } catch (err) {
      console.error("Failed to fetch assets", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const openRenameModal = (key: string, currentName: string) => {
    const ext = currentName.split(".").pop() || "";
    const baseName = currentName.substring(0, currentName.lastIndexOf("."));
    setRenamingAsset({ key, baseName, ext });
    setRenameInput(baseName);
  };

  const handleConfirmRename = async () => {
    if (!renamingAsset) return;
    const trimmed = renameInput.trim();
    if (!trimmed || trimmed === renamingAsset.baseName) {
      setRenamingAsset(null);
      return;
    }

    try {
      const res = await fetch("/api/assets/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldKey: renamingAsset.key,
          newName: `${trimmed}.${renamingAsset.ext}`,
        }),
      });
      if (res.ok) {
        toast("Asset Renamed", "The asset was renamed successfully.", "success");
        setRenamingAsset(null);
        await fetchAssets();
      } else {
        toast("Rename Failed", "Unable to rename asset on server.", "error");
      }
    } catch {
      toast("Rename Failed", "Network error while renaming asset.", "error");
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm("Are you sure you want to delete this asset? This will break any scenes currently using it!")) return;

    try {
      const res = await fetch("/api/assets/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        toast("Asset Deleted", "Asset removed from vault.", "success");
        setAssets(prev => prev.filter(a => a.key !== key));
      } else {
        toast("Delete Failed", "Unable to delete asset from server.", "error");
      }
    } catch {
      toast("Delete Failed", "Network error while deleting asset.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 via-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 border border-purple-400/30">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-foreground tracking-tight">Asset Vault</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  RAW STORAGE
                </span>
              </div>
              <p className="text-xs text-subtle font-normal mt-0.5">Manage raw B-roll video footage, synthesized stills, and audio stems in MinIO</p>
            </div>
          </div>

          <Link
            href="/vault"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-raised/90 hover:bg-white/[0.08] text-subtle hover:text-white border border-border/80 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 self-start"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Video Vault</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted font-mono font-medium">Scanning object storage...</span>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-28 border border-border/80 rounded-3xl max-w-md mx-auto p-10 glass-panel-raised flex flex-col items-center gap-3 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-border flex items-center justify-center text-purple-400">
              <HardDrive className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground tracking-tight">No Assets Found</h3>
              <p className="text-xs text-subtle mt-1 leading-relaxed font-normal">
                No media assets have been staged in MinIO storage yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {assets.map((asset) => {
              const isVideo = asset.name.endsWith(".mp4") || asset.name.endsWith(".webm") || asset.name.endsWith(".mov");
              
              return (
                <div key={asset.key} className="glass-panel-raised border border-border/80 rounded-3xl overflow-hidden flex flex-col shadow-xl hover:border-purple-500/50 transition-all duration-300">
                  <div className="relative aspect-video bg-black/80 flex-shrink-0 group overflow-hidden border-b border-border/60">
                    {isVideo ? (
                      <video src={asset.url} className="w-full h-full object-cover" controls preload="metadata" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                    )}
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider bg-black/70 border border-white/10 text-white backdrop-blur-md flex items-center gap-1">
                      {isVideo ? <Film className="w-3 h-3 text-purple-400" /> : <ImageIcon className="w-3 h-3 text-sky-400" />}
                      <span>{isVideo ? "VIDEO" : "STILL"}</span>
                    </span>
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="text-xs font-bold text-foreground truncate" title={asset.name}>{asset.name}</h3>
                      <p className="text-[10px] font-mono text-muted mt-0.5">
                        {(asset.size / 1024 / 1024).toFixed(1)} MB • {new Date(asset.lastModified).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface/80 border border-border/80">
                      <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>Scene Attachments</span>
                      </p>
                      {asset.usages.length === 0 ? (
                        <p className="text-[10px] font-mono text-muted/60 italic">Unassigned</p>
                      ) : (
                        <ul className="space-y-1">
                          {asset.usages.map((u, i) => (
                            <li key={i} className="text-[10px] font-mono truncate">
                              <a href={`/editor/${u.storyId}`} className="text-emerald-400 hover:underline">
                                {u.storyTitle}
                              </a>
                              <span className="text-muted ml-1">(Scene {u.sceneIndex + 1})</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                      <button
                        onClick={() => openRenameModal(asset.key, asset.name)}
                        className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] font-mono font-bold py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-subtle hover:text-white border border-border/80 transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Rename</span>
                      </button>
                      <button
                        onClick={() => handleDelete(asset.key)}
                        className="inline-flex items-center justify-center text-[10px] font-mono font-bold py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
                        title="Delete asset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {renamingAsset && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#121218] border border-border/80 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-400" /> Rename Asset
              </h3>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted uppercase">New Name</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleConfirmRename();
                      } else if (e.key === "Escape") {
                        setRenamingAsset(null);
                      }
                    }}
                    autoFocus
                    className="flex-1 px-3.5 py-2 rounded-xl bg-background border border-border text-xs outline-none focus:border-purple-500"
                  />
                  <span className="text-xs font-mono text-muted">.{renamingAsset.ext}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenamingAsset(null)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRename}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
