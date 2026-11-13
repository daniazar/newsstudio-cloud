"use client";

import React from "react";
import useSWR from "swr";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Brush
} from "recharts";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TimelineData {
  date: string;
  tts_credits: number;
  video_credits: number;
  render_credits: number;
  llm_cost: number;
  other: number;
}

interface TimelinePayloadEntry {
  name: string;
  value: number;
  color?: string;
  dataKey?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TimelinePayloadEntry[];
  label?: string;
}

export function UsageTimelineChart({ days = 30 }: { days?: number }) {
  const { data, error, isLoading } = useSWR<{ data: TimelineData[] }>(
    `/api/admin/usage-timeline?days=${days}`,
    fetcher
  );

  const [hiddenSeries, setHiddenSeries] = React.useState<Record<string, boolean>>({});

  const toggleSeries = (e: { dataKey?: unknown }) => {
    const dataKey = typeof e?.dataKey === "string" ? e.dataKey : undefined;
    if (!dataKey) return;
    setHiddenSeries((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 bg-background/30 rounded-2xl border border-border/40">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted font-medium">Loading timeline...</span>
      </div>
    );
  }

  if (error || !data || !data.data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 bg-red-500/5 rounded-2xl border border-red-500/20">
        <span className="text-xs text-red-400 font-medium">Failed to load timeline data.</span>
      </div>
    );
  }

  const chartData = data.data;

  // Formatting date for XAxis (e.g., "YYYY-MM-DD" -> "MMM DD")
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length && label) {
      const total = payload.reduce((acc: number, entry: TimelinePayloadEntry) => acc + entry.value, 0);
      return (
        <div className="p-3 bg-surface border border-border shadow-lg rounded-xl">
          <p className="text-xs font-bold text-foreground mb-2 pb-1 border-b border-border/50">
            {formatDate(label)}
          </p>
          <div className="space-y-1">
            {payload.map((entry: TimelinePayloadEntry, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-muted uppercase font-bold">{entry.name}</span>
                </div>
                <span className="font-mono text-foreground">
                  {entry.value > 0 && entry.value < 0.01 ? entry.value.toFixed(4) : entry.value.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-1 border-t border-border/50 flex justify-between gap-4 text-[10px] font-bold">
            <span className="text-foreground uppercase">Total</span>
            <span className="font-mono text-accent">
              {total > 0 && total < 0.01 ? total.toFixed(4) : total.toFixed(2)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-72 w-full mt-4" style={{ minHeight: "288px" }}>
      <ResponsiveContainer width="100%" height={288}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorVideo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorTTS" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorRender" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorLLM" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate} 
            stroke="#94a3b8" 
            fontSize={10} 
            tickMargin={10}
            minTickGap={20}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={10} 
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => value < 1 && value > 0 ? value.toFixed(3) : value.toFixed(0)}
            domain={[0, (dataMax: number) => dataMax === 0 ? 1 : dataMax * 1.05]}
            allowDecimals={true}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Legend 
            iconType="circle" 
            wrapperStyle={{ fontSize: '10px', paddingTop: '10px', fontWeight: 'bold', cursor: 'pointer' }} 
            onClick={toggleSeries}
            formatter={(value: string, entry) => {
              const k = String(entry.dataKey || "");
              return (
                <span style={{ color: hiddenSeries[k] ? '#475569' : entry.color, transition: 'color 0.2s' }}>
                  {value}
                </span>
              );
            }}
          />
          <Area
            type="monotone"
            hide={hiddenSeries["video_credits"]}
            dataKey="video_credits"
            name="Video Generation"
            stackId="1"
            stroke="#a855f7"
            fill="url(#colorVideo)"
            strokeWidth={2}
            activeDot={{ r: 4 }}
          />
          <Area
            type="monotone"
            hide={hiddenSeries["render_credits"]}
            dataKey="render_credits"
            name="Remotion Rendering"
            stackId="1"
            stroke="#06b6d4"
            fill="url(#colorRender)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            hide={hiddenSeries["tts_credits"]}
            dataKey="tts_credits"
            name="TTS Audio"
            stackId="1"
            stroke="#3b82f6"
            fill="url(#colorTTS)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            hide={hiddenSeries["llm_cost"]}
            dataKey="llm_cost"
            name="LLM Estimated Cost"
            stackId="1"
            stroke="#10b981"
            fill="url(#colorLLM)"
            strokeWidth={2}
          />
          <Brush 
            dataKey="date" 
            height={30} 
            stroke="#475569" 
            fill="#0f172a"
            tickFormatter={formatDate}
            travellerWidth={10}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
