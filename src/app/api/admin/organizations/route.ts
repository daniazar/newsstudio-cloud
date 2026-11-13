import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isSuperAdmin } from "@/lib/superadmin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

interface OrgMember {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  role: string;
}

interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  membersCount: number;
  createdAt: number;
  tier: string | null;
  members: OrgMember[];
}

/**
 * Cross-tenant org/user directory. Super admin only. Reads the source of truth
 * (Clerk) for organizations + memberships and enriches each org with the local
 * `Company.tier`. Tenant-scoped routes must NEVER expose this data.
 */
export async function GET() {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await clerkClient();

  // 1. Page through every organization.
  const organizations = [];
  let offset = 0;
  for (;;) {
    const { data, totalCount } = await client.organizations.getOrganizationList({
      limit: PAGE_SIZE,
      offset,
      includeMembersCount: true,
    });
    organizations.push(...data);
    offset += data.length;
    if (data.length === 0 || offset >= totalCount) break;
  }

  // 2. Local Company rows keyed by id (== Clerk orgId) for tier/extra metadata.
  const companies = await prisma.company.findMany({ select: { id: true, tier: true } });
  const tierById = new Map(companies.map((c) => [c.id, c.tier]));

  // 3. Resolve each org's members (paged).
  const summaries: OrgSummary[] = await Promise.all(
    organizations.map(async (org): Promise<OrgSummary> => {
      const members: OrgMember[] = [];
      let mOffset = 0;
      for (;;) {
        const { data, totalCount } = await client.organizations.getOrganizationMembershipList({
          organizationId: org.id,
          limit: PAGE_SIZE,
          offset: mOffset,
        });
        for (const m of data) {
          members.push({
            userId: m.publicUserData?.userId ?? "",
            email: m.publicUserData?.identifier ?? "",
            firstName: m.publicUserData?.firstName ?? null,
            lastName: m.publicUserData?.lastName ?? null,
            imageUrl: m.publicUserData?.imageUrl ?? "",
            role: m.role,
          });
        }
        mOffset += data.length;
        if (data.length === 0 || mOffset >= totalCount) break;
      }
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        imageUrl: org.imageUrl,
        membersCount: org.membersCount ?? members.length,
        createdAt: org.createdAt,
        tier: tierById.get(org.id) ?? null,
        members,
      };
    }),
  );

  summaries.sort((a, b) => b.createdAt - a.createdAt);

  const uniqueUsers = new Set(
    summaries.flatMap((o) => o.members.map((m) => m.userId).filter(Boolean)),
  ).size;

  return NextResponse.json({
    organizations: summaries,
    stats: { orgCount: summaries.length, userCount: uniqueUsers },
  });
}
