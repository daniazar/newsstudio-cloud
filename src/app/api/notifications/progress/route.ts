import { NextResponse } from "next/server";
import { startJobProgress, updateJobProgress, finishJobProgress } from "@/lib/notifications";
import { requireTenant } from "@/lib/tenant";

export async function POST(req: Request) {
  const t = await requireTenant();
  if (!t.ok) return t.response;

  try {
    const body = await req.json();
    const { action, id, title, message, total, progress, success } = body;
    
    let newId = id;
    
    if (action === "start") {
      newId = await startJobProgress(title, message, total, t.tenant.orgId);
    } else if (action === "update") {
      await updateJobProgress(id, progress, message);
    } else if (action === "finish") {
      await finishJobProgress(id, message, success);
    }
    
    return NextResponse.json({ id: newId });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
