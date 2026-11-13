import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/tenant";

// Use a global variable to persist the map across Next.js HMR reloads in dev mode
const globalForNotifs = global as unknown as {
  liveNotifications: Map<string, { message: string; progress: number; total: number }>;
};
export const liveNotifications =
  globalForNotifs.liveNotifications || new Map<string, { message: string; progress: number; total: number }>();
if (process.env.NODE_ENV !== "production") {
  globalForNotifs.liveNotifications = liveNotifications;
}

export interface JobProgressData {
  progress: number;
  total: number;
  storyId?: string;
  jobId?: string;
}

/**
 * Creates a new notification specifically for tracking job progress.
 * Returns the notification ID so it can be updated later.
 */
export async function startJobProgress(
  title: string,
  message: string,
  total: number,
  companyId: string = DEFAULT_ORG_ID,
  storyId?: string,
  jobId?: string
): Promise<string> {
  const data: JobProgressData = { progress: 0, total, storyId, jobId };
  const notification = await prisma.notification.create({
    data: {
      companyId,
      type: "job_progress",
      title,
      message,
      data: JSON.stringify(data),
      isRead: false,
    },
  });

  // Track natively in memory immediately
  liveNotifications.set(notification.id, { message, progress: 0, total });

  return notification.id;
}

/**
 * Updates an existing job_progress notification with a new message and progress.
 */
export async function updateJobProgress(
  id: string,
  progress: number,
  message: string
): Promise<void> {
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif || notif.type !== "job_progress") return;

  // In-memory update, skips database to prevent DB hammering
  if (liveNotifications.has(id)) {
    const prev = liveNotifications.get(id);
    liveNotifications.set(id, { ...prev!, message, progress });
  } else {
    // If not in map (e.g. server restarted), grab total from DB as baseline to initialize map
    const prevData = notif.data ? JSON.parse(notif.data) as JobProgressData : { total: 100 };
    liveNotifications.set(id, { message, progress, total: prevData.total });
  }
}

/**
 * Marks a job_progress notification as completed, potentially turning it into a system_alert or success notification.
 */
export async function finishJobProgress(
  id: string,
  message: string,
  success: boolean = true
): Promise<void> {
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) return;

  const prevData = notif.data ? JSON.parse(notif.data) as JobProgressData : { total: 100 };
  
  // Use map's total if available, else DB's total
  const liveData = liveNotifications.get(id);
  const total = liveData?.total ?? prevData.total;
  
  // Clean up from memory
  liveNotifications.delete(id);

  const newData: JobProgressData = {
    ...prevData,
    progress: total,
    total: total,
  };

  await prisma.notification.update({
    where: { id },
    data: {
      type: success ? "system_alert" : "job_failed",
      message,
      data: JSON.stringify(newData),
    },
  });
}
