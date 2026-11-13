import { NextRequest, NextResponse } from "next/server";
import { withSuperAdminAuth } from "@/lib/apiHandler";
import { killService, switchServiceProfile, setServiceWatchdogTimeout } from "@/lib/telemetry";

export const POST = withSuperAdminAuth(async (req: NextRequest) => {
  const body = await req.json();
  const serviceId = body.serviceId || body.service;
  const action = body.action?.toLowerCase();

  if (!serviceId) {
    return NextResponse.json({ error: "Missing serviceId" }, { status: 400 });
  }

  if (action === "profile" || body.profile) {
    const targetProfile = body.profile;
    if (!targetProfile) {
      return NextResponse.json({ error: "Missing target profile" }, { status: 400 });
    }
    const result = await switchServiceProfile(serviceId, targetProfile);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  }

  if (action === "timeout" || body.timeoutSeconds !== undefined) {
    const timeoutSeconds = Number(body.timeoutSeconds ?? 600);
    const result = await setServiceWatchdogTimeout(serviceId, timeoutSeconds);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  }

  const result = await killService(serviceId);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
});

