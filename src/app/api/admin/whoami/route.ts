import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/superadmin";

export const dynamic = "force-dynamic";

/** Authoritative reconcile source for the client-side super-admin cache. */
export async function GET() {
  return NextResponse.json({ isSuperAdmin: await isSuperAdmin() });
}
