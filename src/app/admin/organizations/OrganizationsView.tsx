"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { Building2, Users, RefreshCw, Search, ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  });

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

interface OrgsResponse {
  organizations: OrgSummary[];
  stats: { orgCount: number; userCount: number };
}

const tierStyles: Record<string, string> = {
  free: "bg-white/5 border-border text-muted",
  pro: "bg-accent/10 border-accent/20 text-accent",
  enterprise: "bg-purple-500/10 border-purple-500/20 text-purple-400",
};

function memberName(m: OrgMember): string {
  const full = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
  return full || m.email || m.userId;
}

export function OrganizationsView() {
  const { data, error, isValidating, mutate } = useSWR<OrgsResponse>(
    "/api/admin/organizations",
    fetcher,
  );
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filtered = useMemo(() => {
    const orgs = data?.organizations ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.slug.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.members.some(
          (m) => m.email.toLowerCase().includes(q) || memberName(m).toLowerCase().includes(q),
        ),
    );
  }, [data, query]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-accent" /> Organizations
          </h1>
          <p className="text-xs text-muted font-medium mt-1">
            Every tenant and the users bound to it. Super admin only.
          </p>
        </div>
        <button
          onClick={() => mutate()}
          disabled={isValidating}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent-muted hover:bg-accent-subtle text-accent border border-accent/20 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="backdrop-blur-md bg-surface/30 border border-border/80 rounded-2xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Organizations</span>
            <Building2 className="w-4 h-4 text-accent" />
          </div>
          <span className="text-xl font-black text-foreground block mt-2 leading-none">
            {data?.stats.orgCount ?? "—"}
          </span>
        </div>
        <div className="backdrop-blur-md bg-surface/30 border border-border/80 rounded-2xl p-4">
          <div className="flex items-start justify-between">
            <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Unique Users</span>
            <Users className="w-4 h-4 text-success" />
          </div>
          <span className="text-xl font-black text-success block mt-2 leading-none">
            {data?.stats.userCount ?? "—"}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search org, slug, member email…"
          className="w-full pl-9 pr-3 py-2.5 bg-background/50 border border-border rounded-xl text-xs font-semibold text-foreground placeholder:text-muted focus:outline-none focus:border-accent/40 transition-colors"
        />
      </div>

      {/* States */}
      {error ? (
        <div className="p-6 rounded-2xl bg-error/10 border border-error/30 text-error text-xs font-semibold">
          Failed to load organizations ({error.message === "403" ? "forbidden — super admin only" : error.message}).
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted font-medium">Loading organizations…</span>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted italic text-center py-16">No organizations match your search.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((org) => {
            const isOpen = expanded.has(org.id);
            return (
              <div
                key={org.id}
                className="backdrop-blur-md bg-surface/30 border border-border/80 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => toggle(org.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors cursor-pointer text-left"
                >
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                  )}
                  {org.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={org.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-accent" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground truncate">{org.name}</span>
                      <span
                        className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase border ${
                          tierStyles[org.tier ?? "free"] ?? tierStyles.free
                        }`}
                      >
                        {org.tier ?? "free"}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted font-mono truncate block">{org.id}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted shrink-0">
                    <Users className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{org.membersCount}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border/60 divide-y divide-border/40">
                    {org.members.length === 0 ? (
                      <p className="text-[11px] text-muted italic px-4 py-3">No members.</p>
                    ) : (
                      org.members.map((m) => (
                        <div key={m.userId || m.email} className="flex items-center gap-3 px-4 py-2.5">
                          {m.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.imageUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-white/5 border border-border shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-semibold text-foreground truncate block">
                              {memberName(m)}
                            </span>
                            {m.email && memberName(m) !== m.email && (
                              <span className="text-[10px] text-muted truncate block">{m.email}</span>
                            )}
                          </div>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase bg-white/5 border border-border text-muted shrink-0">
                            {m.role.replace("org:", "")}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
