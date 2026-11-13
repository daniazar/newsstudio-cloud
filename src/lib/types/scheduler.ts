// ============================================================
// Scheduler Types
// ============================================================

export interface CronPreset {
  label: string;
  expression: string;
  description: string;
}

export const CRON_PRESETS: CronPreset[] = [
  { label: "Every hour", expression: "0 * * * *", description: "Runs at the start of every hour" },
  { label: "Every 3 hours", expression: "0 */3 * * *", description: "Runs every 3 hours" },
  { label: "Every 6 hours", expression: "0 */6 * * *", description: "Runs 4 times per day" },
  { label: "Every 12 hours", expression: "0 */12 * * *", description: "Runs twice daily" },
  { label: "Daily at 9 AM", expression: "0 9 * * *", description: "Once per day at 9:00 AM" },
  { label: "Daily at 6 PM", expression: "0 18 * * *", description: "Once per day at 6:00 PM" },
  { label: "Weekdays at 8 AM", expression: "0 8 * * 1-5", description: "Monday to Friday at 8:00 AM" },
  { label: "Weekly Monday 7 AM", expression: "0 7 * * 1", description: "Every Monday at 7:00 AM" },
  { label: "Twice daily (9 AM & 6 PM)", expression: "0 9,18 * * *", description: "At 9:00 AM and 6:00 PM" },
];

export interface ScheduleFormData {
  name: string;
  cronExpression: string;
  mode: "latest_n" | "roundup" | "curated_top";
  count: number;
  feedIds: string[];
  brandId: string;
  targetChannelIds: string[];
  personaId: string;
  autoScript: boolean;
  autoPublish: boolean;
  requireApproval: boolean;
  isActive: boolean;
  selectionCriteria?: string;
  outputMode?: "roundup" | "individual";
}

export interface ScheduleWithRuns {
  id: string;
  name: string;
  cronExpression: string;
  mode: string;
  count: number;
  feedIds: string; // JSON array string
  brandId: string;
  targetChannelIds: string | null; // JSON array string
  personaId: string;
  autoScript: boolean;
  autoPublish: boolean;
  requireApproval: boolean;
  isActive: boolean;
  selectionCriteria: string | null;
  outputMode: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastRunStatus: string | null;
  createdAt: string;
  updatedAt: string;
  runs: ScheduleRunRecord[];
  _feedNames?: string[];
  _brandName?: string;
  _channelNames?: string[];
  _personaName?: string;
}

export interface ScheduleRunRecord {
  id: string;
  scheduleId: string;
  status: string;
  storyCount: number;
  errorLog: string | null;
  startedAt: string;
  completedAt: string | null;
}

/**
 * Convert a cron expression to a human-readable label.
 * Handles common patterns; falls back to the raw expression for complex ones.
 */
export function cronToHumanLabel(expression: string): string {
  const preset = CRON_PRESETS.find(p => p.expression === expression);
  if (preset) return preset.label;

  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return expression;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Every N minutes
  if (minute.startsWith("*/") && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Every ${minute.slice(2)} minutes`;
  }

  // Every N hours
  if (minute === "0" && hour.startsWith("*/") && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Every ${hour.slice(2)} hours`;
  }

  // Daily at specific hour
  if (minute === "0" && /^\d{1,2}$/.test(hour) && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    const h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `Daily at ${h12}:00 ${ampm}`;
  }

  // Specific weekdays
  if (minute === "0" && /^\d{1,2}$/.test(hour) && dayOfMonth === "*" && month === "*") {
    const h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const dayMap: Record<string, string> = {
      "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat",
      "1-5": "Weekdays", "0,6": "Weekends",
    };
    const dayLabel = dayMap[dayOfWeek] || `Day ${dayOfWeek}`;
    return `${dayLabel} at ${h12}:00 ${ampm}`;
  }

  return expression;
}

/**
 * Calculate the next run time from a cron expression (approximate).
 * For display purposes only — the actual scheduling is done by Inngest.
 */
export function getNextRunEstimate(cronExpression: string): Date {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) return new Date(Date.now() + 3600000); // fallback: 1 hour from now

  const [minute, hour] = parts;
  const now = new Date();
  const next = new Date(now);

  if (minute === "0" && /^\d{1,2}$/.test(hour)) {
    // Daily at specific hour
    const targetHour = parseInt(hour);
    next.setUTCHours(targetHour, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }

  if (minute.startsWith("*/")) {
    const interval = parseInt(minute.slice(2));
    if (isNaN(interval) || interval <= 0) return new Date(Date.now() + 3600000);

    const nextMinute = Math.ceil(now.getUTCMinutes() / interval) * interval;
    next.setUTCMinutes(nextMinute, 0, 0);
    if (next <= now) next.setUTCMinutes(next.getUTCMinutes() + interval);
    return next;
  }

  if (hour.startsWith("*/")) {
    const interval = parseInt(hour.slice(2));
    if (isNaN(interval) || interval <= 0) return new Date(Date.now() + 3600000);

    const nextHour = Math.ceil(now.getUTCHours() / interval) * interval;
    next.setUTCHours(nextHour, 0, 0, 0);
    if (next <= now) next.setUTCHours(next.getUTCHours() + interval);
    return next;
  }

  // Fallback: 1 hour from now
  return new Date(Date.now() + 3600000);
}
