"use client";

import { InfiniteScrollSentinel } from "@/components/global/InfiniteScrollSentinel";
import { useToast } from "@/components/global/ToastContainer";
import { useInfiniteList } from "@/lib/hooks/useInfiniteList";
import {
cronToHumanLabel,
type ScheduleFormData,
type ScheduleWithRuns,
} from "@/lib/types/scheduler";
import { useUser } from "@clerk/nextjs";
import {
Calendar,
Check,
Clock,
Edit2,
Layers,
Pause,
Play,
Plus,
RefreshCw,
Settings2,Sparkles,
Trash2,
X
} from "lucide-react";
import React,{ useMemo,useState } from "react";
import useSWR from "swr";

interface BrandFeed {
  id: string;
  name: string;
}

interface BrandRssGroup {
  id: string;
  name: string;
  feeds?: BrandFeed[];
}

interface BrandItem {
  id: string;
  name: string;
  rssGroups?: BrandRssGroup[];
}

const DEFAULT_CRITERIA = [
  "Most important global news",
  "Highest clickbait potential",
  "Most engaging tech updates",
  "Trending celebrity gossip",
  "Biggest financial market movers",
  "Deep-dive investigative journalism",
  "Most controversial political debates",
  "Inspirational human interest stories",
  "Latest breakthroughs in science",
  "Most viral social media topics"
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Helper for generating monthly dots
function getMonthlyExecutionDays(cronExpr: string): number[] {
  // A naive implementation to highlight days in the next 30 days based on the cron
  const days = new Set<number>();
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return [];
  const [, , dom, , dow] = parts;
  
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    let match = false;
    
    // Check Day of Week
    if (dow === "*" || dow.split(",").includes(d.getDay().toString())) {
      // Check Day of Month
      if (dom === "*" || dom.split(",").includes(d.getDate().toString())) {
        match = true;
      }
    }
    
    if (match) days.add(d.getDate());
  }
  return Array.from(days);
}

function computeCron(freq: "daily" | "weekly" | "hourly" | "custom", time: string, days: number[], interval: number): string {
  if (freq === "custom") return "";
  const [h, m] = time.split(":");
  const hr = parseInt(h, 10) || 0;
  const min = parseInt(m, 10) || 0;

  if (freq === "hourly") {
    return `0 */${interval} * * *`;
  } else if (freq === "daily") {
    return `${min} ${hr} * * *`;
  } else if (freq === "weekly") {
    const dayStr = days.length > 0 ? days.join(",") : "*";
    return `${min} ${hr} * * ${dayStr}`;
  }
  return "0 18 * * *";
}

export default function SchedulerPage() {
  const { isLoaded, isSignedIn } = useUser();
  const { toast } = useToast();
  const isAdmin = isSignedIn;

  const {
    items: schedules,
    mutate,
    isValidating,
    setSize,
    size,
    isReachingEnd,
    isLoadingMore,
    isLoadingInitial,
  } = useInfiniteList<ScheduleWithRuns>(isAdmin ? "/api/admin/schedules" : null, { limit: 24 });
  const schedulesLoaded = isAdmin && !isLoadingInitial;

  const { data: brandsRes } = useSWR<{ data?: BrandItem[]; brands?: BrandItem[] }>(
    isAdmin ? "/api/brands?limit=500&lite=true" : null,
    fetcher
  );
  const brands = useMemo(() => brandsRes?.data ?? brandsRes?.brands ?? [], [brandsRes]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ScheduleFormData>({
    name: "",
    cronExpression: "0 18 * * *",
    mode: "latest_n",
    count: 5,
    feedIds: [],
    brandId: "",
    targetChannelIds: [],
    personaId: "",
    autoScript: true,
    autoPublish: false,
    requireApproval: true,
    isActive: true,
    selectionCriteria: "",
    outputMode: "roundup",
  });

  // Visual Cron Builder State
  const [freqType, setFreqType] = useState<"daily" | "weekly" | "hourly" | "custom">("daily");
  const [timeStr, setTimeStr] = useState("18:00");
  const [selectedDays, setSelectedDays] = useState<number[]>([1,2,3,4,5]); // Mon-Fri
  const [intervalHours, setIntervalHours] = useState(6);

  const handleFreqTypeChange = (newFreq: "daily" | "weekly" | "hourly" | "custom") => {
    setFreqType(newFreq);
    if (newFreq !== "custom") {
      setFormData(prev => ({ ...prev, cronExpression: computeCron(newFreq, timeStr, selectedDays, intervalHours) }));
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTimeStr(newTime);
    if (freqType !== "custom") {
      setFormData(prev => ({ ...prev, cronExpression: computeCron(freqType, newTime, selectedDays, intervalHours) }));
    }
  };

  const handleDaysToggle = (dayIndex: number) => {
    const updatedDays = selectedDays.includes(dayIndex)
      ? selectedDays.filter(d => d !== dayIndex)
      : [...selectedDays, dayIndex];
    setSelectedDays(updatedDays);
    if (freqType !== "custom") {
      setFormData(prev => ({ ...prev, cronExpression: computeCron(freqType, timeStr, updatedDays, intervalHours) }));
    }
  };

  const handleIntervalChange = (newInterval: number) => {
    setIntervalHours(newInterval);
    if (freqType !== "custom") {
      setFormData(prev => ({ ...prev, cronExpression: computeCron(freqType, timeStr, selectedDays, newInterval) }));
    }
  };

  // Brand specific feeds
  const availableFeeds = useMemo(() => {
    if (!formData.brandId || !brands.length) return [];
    const brand = brands.find((b) => b.id === formData.brandId);
    if (!brand || !brand.rssGroups) return [];
    return brand.rssGroups.flatMap((g) => g.feeds || []);
  }, [formData.brandId, brands]);

  if (!isLoaded) return <div className="flex justify-center py-20"><div className="w-8 h-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  if (!isAdmin) return <div className="p-10 text-center text-error font-bold">Access Denied</div>;

  const openCreateModal = () => {
    setEditingId(null);
    setFreqType("daily");
    setTimeStr("18:00");
    setFormData({
      name: "",
      cronExpression: "0 18 * * *",
      mode: "latest_n",
      count: 5,
      feedIds: [],
      brandId: "",
      targetChannelIds: [],
      personaId: "",
      autoScript: true,
      autoPublish: false,
      requireApproval: true,
      isActive: true,
      selectionCriteria: "",
      outputMode: "roundup",
    });
    setShowModal(true);
  };

  const openEditModal = (s: ScheduleWithRuns) => {
    setEditingId(s.id);
    setFreqType("custom"); // fallback for edit
    
    let parsedFeedIds: string[] = [];
    try { parsedFeedIds = JSON.parse(s.feedIds); } catch { /* skip */ }
    
    setFormData({
      name: s.name,
      cronExpression: s.cronExpression,
      mode: (s.mode as ScheduleFormData["mode"]) || "latest_n",
      count: s.count,
      feedIds: parsedFeedIds,
      brandId: s.brandId || "",
      targetChannelIds: s.targetChannelIds ? JSON.parse(s.targetChannelIds) : [],
      personaId: s.personaId,
      autoScript: s.autoScript,
      autoPublish: s.autoPublish,
      requireApproval: s.requireApproval,
      isActive: s.isActive,
      selectionCriteria: s.selectionCriteria || "",
      outputMode: (s.outputMode as ScheduleFormData["outputMode"]) || "roundup",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingId ? `/api/admin/schedules/${editingId}` : "/api/admin/schedules";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (res.ok) {
        toast("Success", "Schedule saved.", "success");
        setShowModal(false);
        mutate();
      } else {
        toast("Error", data.error || "Failed to save schedule.", "error");
      }
    } catch {
      toast("Error", "Connection error.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete schedule "${name}"?`)) return;
    const res = await fetch(`/api/admin/schedules/${id}`, { method: "DELETE" });
    if (res.ok) { toast("Deleted", "Schedule removed.", "success"); mutate(); }
  };

  const handleRunNow = async (id: string) => {
    const res = await fetch(`/api/admin/schedules/${id}`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      toast("Triggered", "Schedule running in background.", "success");
      setTimeout(() => mutate(), 2000);
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await fetch(`/api/admin/schedules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !active }),
    });
    mutate();
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <span>📅</span> Automation Scheduler
          </h1>
          <p className="text-xs text-muted font-medium mt-1">
            Brand-centric automation hub. Manage when feeds are ingested and videos generated.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => mutate()} disabled={isValidating} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-border hover:bg-white/10 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 h-9">
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={openCreateModal} className="flex items-center gap-1.5 px-4 py-2 bg-accent-muted hover:bg-accent-subtle text-accent border border-accent/20 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer h-9">
            <Plus className="w-4 h-4" /> New Schedule
          </button>
        </div>
      </div>

      {/* Calendar Preview Header */}
      {schedulesLoaded && schedules.length > 0 && (
        <div className="bg-surface/30 border border-border rounded-2xl p-4 flex gap-2 overflow-x-auto no-scrollbar">
          {Array.from({length: 30}).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const isToday = i === 0;
            const dayNum = d.getDate();
            const dayName = d.toLocaleDateString('en-US', {weekday: 'short'}).charAt(0);
            
            // Check if any schedule runs on this day
            const runsToday = schedules.some(s => {
              if (!s.isActive) return false;
              const execDays = getMonthlyExecutionDays(s.cronExpression);
              return execDays.includes(dayNum);
            });

            return (
              <div key={i} className={`flex flex-col items-center min-w-[32px] gap-1 ${isToday ? 'opacity-100' : 'opacity-60'} hover:opacity-100 transition-opacity`}>
                <span className="text-[9px] font-bold text-muted uppercase">{dayName}</span>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${isToday ? 'bg-white/10 border-border text-foreground' : 'bg-transparent border-transparent'} ${runsToday ? 'ring-1 ring-accent text-accent' : ''}`}>
                  {dayNum}
                </div>
                {runsToday && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule List */}
      {!schedulesLoaded ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-24 space-y-4">
          <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-3xl flex items-center justify-center mx-auto text-accent"><Calendar className="w-8 h-8" /></div>
          <h3 className="font-bold">No Schedules Yet</h3>
          <button onClick={openCreateModal} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-accent-muted hover:bg-accent-subtle text-accent border border-accent/20 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer mx-auto h-9"><Plus className="w-4 h-4"/> Create Schedule</button>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => {
            return (
              <div key={schedule.id} onClick={() => setDetailsId(schedule.id)} className="cursor-pointer bg-surface/30 border border-border/80 rounded-3xl overflow-hidden hover:border-border-hover transition-colors">
                <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${schedule.isActive ? "bg-success animate-pulse" : "bg-muted"}`} />
                      <h3 className="text-sm font-black text-foreground truncate">{schedule.name}</h3>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                        schedule.mode === "roundup" ? "bg-purple-500/10 border-purple-500/30 text-purple-400" :
                        schedule.mode === "curated_top" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                        "bg-accent/10 border-accent/30 text-accent"
                      }`}>
                        {schedule.mode === "roundup" ? "📺 Roundup" : schedule.mode === "curated_top" ? "✨ Curated Top" : `📰 Latest ${schedule.count}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted font-semibold flex-wrap">
                      <span className="flex items-center gap-1 text-foreground"><Clock className="w-3 h-3" /> {cronToHumanLabel(schedule.cronExpression)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {schedule._brandName || "No Brand"}</span>
                      {schedule.mode === "curated_top" && (
                        <><span>•</span><span className="text-amber-400 flex items-center gap-1"><Sparkles className="w-3 h-3"/> {schedule.selectionCriteria}</span></>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); handleToggleActive(schedule.id, schedule.isActive); }} className={`h-8 px-3 flex items-center gap-1.5 text-[10px] font-bold border rounded-xl transition-all active:scale-95 cursor-pointer ${schedule.isActive ? 'bg-warning/10 border-warning/20 text-warning hover:bg-warning/15' : 'bg-border/30 border-border/50 text-foreground hover:bg-border/50'}`}>
                      {schedule.isActive ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Resume</>}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleRunNow(schedule.id); }} className="h-8 px-3 flex items-center gap-1.5 text-[10px] font-bold bg-success/10 border border-success/20 text-success hover:bg-success/15 rounded-xl transition-all active:scale-95 cursor-pointer"><Play className="w-3.5 h-3.5" /> Run</button>
                    <button onClick={(e) => { e.stopPropagation(); openEditModal(schedule); }} className="h-8 w-8 flex items-center justify-center bg-white/5 border border-border hover:bg-white/10 rounded-xl transition-all active:scale-95 cursor-pointer text-subtle hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(schedule.id, schedule.name); }} className="h-8 w-8 flex items-center justify-center bg-error/5 border border-error/20 hover:bg-error/10 rounded-xl transition-all active:scale-95 cursor-pointer text-error"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
          <InfiniteScrollSentinel
            onIntersect={() => setSize(size + 1)}
            disabled={isReachingEnd || isLoadingMore}
          />
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-surface-raised border border-border/85 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border/60 flex justify-between bg-white/[0.01]">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><Settings2 className="w-4 h-4 text-accent" /> {editingId ? "Edit Schedule" : "New Schedule"}</h3>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full border border-border hover:bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-subtle uppercase">Schedule Name</label>
                  <button type="button" onClick={() => {
                    const brandName = brands.find((b) => b.id === formData.brandId)?.name || "News";
                    const freq = freqType === "daily" ? "Daily" : freqType === "weekly" ? "Weekly" : freqType === "hourly" ? "Hourly" : "Custom";
                    const modeName = formData.mode === "roundup" ? "Roundup" : formData.mode === "curated_top" ? "Curated Top" : "Latest";
                    setFormData(prev => ({ ...prev, name: `${brandName} ${freq} ${modeName}`.trim() }));
                  }} className="text-[9px] text-accent font-bold hover:underline flex items-center gap-1"><Sparkles className="w-3 h-3"/> Auto-name</button>
                </div>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs outline-none focus:border-accent" />
              </div>

              {/* Brand & Feeds */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-border/40 space-y-4">
                <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1.5"><Layers className="w-3.5 h-3.5"/> Brand Context</h4>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-subtle uppercase">Target Brand</label>
                  <select 
                    required 
                    value={formData.brandId} 
                    onChange={e => {
                      const nextBrandId = e.target.value;
                      const targetBrand = brands.find((b) => b.id === nextBrandId);
                      const brandFeeds = targetBrand?.rssGroups?.flatMap((g) => g.feeds || []) || [];
                      setFormData(prev => ({
                        ...prev,
                        brandId: nextBrandId,
                        targetChannelIds: [],
                        feedIds: editingId ? prev.feedIds : brandFeeds.map((f) => f.id)
                      }));
                    }} 
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs outline-none focus:border-accent"
                  >
                    <option value="">Select Brand...</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                {formData.brandId && availableFeeds.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-subtle uppercase">Included RSS Feeds</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableFeeds.map((feed) => (
                        <label key={feed.id} className="flex items-center gap-2 p-2 rounded-xl border border-border/50 bg-background/50 cursor-pointer hover:bg-white/5">
                          <input type="checkbox" className="accent-accent" checked={formData.feedIds.includes(feed.id)} onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              feedIds: e.target.checked ? [...prev.feedIds, feed.id] : prev.feedIds.filter(id => id !== feed.id)
                            }))
                          }}/>
                          <span className="text-[11px] font-medium truncate">{feed.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Timing */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-border/40 space-y-4">
                <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Execution Time</h4>
                
                <div className="flex gap-2">
                  {(["daily", "weekly", "hourly", "custom"] as const).map(type => (
                    <button type="button" key={type} onClick={() => handleFreqTypeChange(type)} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg uppercase border transition-colors ${freqType === type ? 'bg-accent/20 border-accent/50 text-accent' : 'bg-transparent border-border text-muted hover:bg-white/5'}`}>
                      {type}
                    </button>
                  ))}
                </div>

                {freqType === "weekly" && (
                  <div className="flex gap-1 justify-between">
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day, i) => (
                      <button type="button" key={day} onClick={() => handleDaysToggle(i)} className={`w-9 h-9 rounded-full text-[10px] font-bold border ${selectedDays.includes(i) ? 'bg-accent text-white border-accent' : 'bg-background text-muted border-border'}`}>
                        {day}
                      </button>
                    ))}
                  </div>
                )}

                {(freqType === "daily" || freqType === "weekly") && (
                  <div>
                    <label className="text-[10px] font-bold text-subtle uppercase mr-2">Time:</label>
                    <input type="time" value={timeStr} onChange={e => handleTimeChange(e.target.value)} className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs outline-none" />
                  </div>
                )}

                {freqType === "hourly" && (
                  <div>
                    <label className="text-[10px] font-bold text-subtle uppercase mr-2">Every (Hours):</label>
                    <input type="number" min={1} max={23} value={intervalHours} onChange={e => handleIntervalChange(parseInt(e.target.value)||6)} className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs w-20 outline-none" />
                  </div>
                )}

                <div className="pt-2">
                  <label className="text-[10px] font-bold text-subtle uppercase block mb-1">Raw Cron Expression</label>
                  <input type="text" readOnly={freqType !== "custom"} value={formData.cronExpression} onChange={e => freqType === "custom" && setFormData({...formData, cronExpression: e.target.value})} className={`w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs font-mono outline-none ${freqType !== 'custom' && 'opacity-50'}`} />
                  <p className="text-[9px] text-muted font-bold mt-1">Parses to: {cronToHumanLabel(formData.cronExpression)}</p>
                </div>
              </div>

              {/* Mode & Curated */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-subtle uppercase">Generation Mode</label>
                  <select value={formData.mode} onChange={e => setFormData({...formData, mode: e.target.value as ScheduleFormData["mode"]})} className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs outline-none">
                    <option value="latest_n">📰 Latest N (Process new articles)</option>
                    <option value="roundup">📺 Standard Roundup (Merge all new)</option>
                    <option value="curated_top">✨ Curated Top N (AI selects best)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-subtle uppercase">Max Story Count</label>
                  <input type="number" min={1} max={20} value={formData.count} onChange={e => setFormData({...formData, count: parseInt(e.target.value) || 1})} className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs outline-none" />
                </div>
              </div>

              {formData.mode === "curated_top" && (
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5"/> Selection Criteria for AI</label>
                    <select 
                      onChange={e => { if (e.target.value !== "custom") setFormData({...formData, selectionCriteria: e.target.value}) }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs outline-none focus:border-amber-500 mb-2"
                      value={DEFAULT_CRITERIA.includes(formData.selectionCriteria || "") ? formData.selectionCriteria : "custom"}
                    >
                      <option value="custom">-- Custom Text --</option>
                      {DEFAULT_CRITERIA.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="text" value={formData.selectionCriteria} onChange={e => setFormData({...formData, selectionCriteria: e.target.value})} placeholder="e.g. Highest clickbait, Most important industry news..." className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs outline-none focus:border-amber-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-amber-500 uppercase">Output Format</label>
                    <div className="flex gap-2">
                      <label className="flex-1 flex items-center gap-2 p-2 rounded-xl border border-border bg-background cursor-pointer hover:bg-white/5">
                        <input type="radio" name="omode" checked={formData.outputMode === "roundup"} onChange={() => setFormData({...formData, outputMode: "roundup"})} className="accent-amber-500" />
                        <span className="text-[11px] font-bold">1 Roundup Video</span>
                      </label>
                      <label className="flex-1 flex items-center gap-2 p-2 rounded-xl border border-border bg-background cursor-pointer hover:bg-white/5">
                        <input type="radio" name="omode" checked={formData.outputMode === "individual"} onChange={() => setFormData({...formData, outputMode: "individual"})} className="accent-amber-500" />
                        <span className="text-[11px] font-bold">N Individual Videos</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Toggles */}
              <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-border/40">
                <h4 className="text-[10px] font-bold text-muted uppercase">Automation Behavior</h4>
                {[
                  { key: "autoScript" as const, label: "Auto-generate scripts", desc: "Run AI scripting after ingest" },
                  { key: "requireApproval" as const, label: "Require human approval", desc: "Pause for review before TTS" },
                  { key: "autoPublish" as const, label: "Auto-publish", desc: "Publish to connected social channels" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex justify-between items-center py-1.5">
                    <div><h5 className="text-[11px] font-bold">{label}</h5><p className="text-[9px] text-muted">{desc}</p></div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input type="checkbox" checked={formData[key] as boolean} onChange={e => setFormData({...formData, [key]: e.target.checked})} className="sr-only peer" />
                      <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-subtle after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent peer-checked:after:bg-white" />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-border/60 flex justify-between bg-white/[0.01]">
              <button type="button" onClick={() => setShowModal(false)} className="text-xs font-bold text-muted px-4 hover:text-foreground">Cancel</button>
              <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Schedule
              </button>
            </div>
          </form>
        </div>
      )}
      {detailsId && schedules?.find(s => s.id === detailsId) && (
        <ScheduleDetailsModal 
          schedule={schedules.find(s => s.id === detailsId)!} 
          onClose={() => setDetailsId(null)} 
        />
      )}
    </div>
  );
}

function ScheduleDetailsModal({ schedule, onClose }: { schedule: ScheduleWithRuns, onClose: () => void }) {
  let feedIdsStr = "";
  try {
    const parsed = JSON.parse(schedule.feedIds);
    feedIdsStr = Array.isArray(parsed) ? parsed.join(",") : "";
  } catch {}

  const { data } = useSWR(
    feedIdsStr ? `/api/stories?status=SCRIPTED&feedIds=${feedIdsStr}&limit=50` : null,
    fetcher
  );

  const pendingStories = data?.stories?.filter((s: { approvalStatus?: string }) => s.approvalStatus === "pending_review") || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-raised border border-border/85 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-border/60 flex justify-between bg-white/[0.01]">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-4 h-4 text-accent" /> Schedule Details</h3>
            <p className="text-xs text-muted font-bold mt-1">{schedule.name}</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full border border-border hover:bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
           <div className="space-y-2">
             <h4 className="text-[10px] font-bold text-muted uppercase">Execution Calendar (Next 30 Days)</h4>
             <div className="bg-surface/30 border border-border rounded-2xl p-4">
                <div 
                  className="grid gap-y-3 gap-x-1 justify-items-center w-full"
                  style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
                >
                  {/* Headers */}
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div key={`header-${i}`} className="text-[9px] font-bold text-muted uppercase w-full text-center pb-2 border-b border-border/40">
                      {d}
                    </div>
                  ))}
                  
                  {/* Empty cells for the start of the current week */}
                  {Array.from({length: new Date().getDay()}).map((_, i) => (
                    <div key={`empty-${i}`} className="w-7 h-7" />
                  ))}

                  {/* 30 days from today */}
                  {Array.from({length: 30}).map((_, i) => {
                    const d = new Date(); d.setDate(d.getDate() + i);
                    const isToday = i === 0;
                    const dayNum = d.getDate();
                    const execDays = getMonthlyExecutionDays(schedule.cronExpression);
                    const runsToday = execDays.includes(dayNum);
                    
                    return (
                      <div key={i} className={`flex flex-col items-center gap-1 ${isToday ? 'opacity-100' : 'opacity-60'} hover:opacity-100 transition-opacity`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${isToday ? 'bg-white/10 border-border text-foreground' : 'bg-transparent border-transparent'} ${runsToday ? 'ring-1 ring-accent text-accent' : ''}`}>
                          {dayNum}
                        </div>
                        {runsToday ? (
                          <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                        ) : (
                          <div className="w-1 h-1" /> /* spacing preservation */
                        )}
                      </div>
                    );
                  })}
                </div>
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
               <h4 className="text-[10px] font-bold text-muted uppercase">Execution History</h4>
               <div className="bg-surface/30 border border-border/80 rounded-2xl p-4 space-y-2 max-h-64 overflow-y-auto">
                 {schedule.runs?.length ? schedule.runs.map((run: ScheduleWithRuns["runs"][0]) => (
                   <div key={run.id} className="flex justify-between p-3 rounded-xl bg-surface/50 border border-border/40 text-[10px]">
                     <span className="font-bold text-foreground">{run.status} — {run.storyCount} stories</span>
                     <span className="text-muted">{new Date(run.startedAt).toLocaleString()}</span>
                   </div>
                 )) : <p className="text-xs text-muted text-center py-4">No past executions.</p>}
               </div>
             </div>

             <div className="space-y-2">
               <h4 className="text-[10px] font-bold text-muted uppercase flex items-center justify-between">
                 Pending Approvals 
                 {pendingStories.length > 0 && <span className="bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">{pendingStories.length}</span>}
               </h4>
               <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-2 max-h-64 overflow-y-auto">
                 {pendingStories.length > 0 ? pendingStories.map((story: { id: string; title: string; pubDate: string | Date }) => (
                   <div key={story.id} className="flex justify-between items-center p-3 rounded-xl bg-surface/50 border border-amber-500/30">
                     <div className="min-w-0 flex-1">
                       <h5 className="text-[11px] font-bold text-foreground truncate">{story.title}</h5>
                       <p className="text-[9px] text-muted">{new Date(story.pubDate).toLocaleString()}</p>
                     </div>
                     <a href={`/editor/${story.id}`} className="flex-shrink-0 ml-3 text-[10px] font-bold text-accent hover:underline">Review &rarr;</a>
                   </div>
                 )) : <p className="text-xs text-muted text-center py-4">All clear. No stories awaiting approval.</p>}
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
