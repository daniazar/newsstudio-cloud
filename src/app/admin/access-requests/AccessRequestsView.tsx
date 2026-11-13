"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { ShieldCheck, RefreshCw, Check, X, Clock, Mail, Building2 } from "lucide-react";
import { useToast } from "@/components/global/ToastContainer";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  });

interface AccessRequest {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  orgId: string | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface RequestsResponse {
  requests: AccessRequest[];
  stats: { pendingCount: number; total: number };
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  approved: "bg-success/10 border-success/20 text-success",
  rejected: "bg-error/10 border-error/20 text-error",
};

export function AccessRequestsView() {
  const { data, error, isValidating, mutate } = useSWR<RequestsResponse>(
    "/api/admin/access-requests",
    fetcher,
    { refreshInterval: 0, revalidateOnFocus: true },
  );
  const { toast } = useToast();
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const act = async (id: string, action: "approve" | "reject") => {
    setBusy((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/admin/access-requests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (res.ok) {
        toast(
          action === "approve" ? "Approved" : "Rejected",
          `Access ${action === "approve" ? "granted" : "revoked"}.`,
          action === "approve" ? "success" : "info",
        );
        mutate();
      } else {
        toast("Error", result.error || "Action failed.", "error");
      }
    } catch {
      toast("Error", "Connection error.", "error");
    } finally {
      setBusy((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  };

  const requests = data?.requests ?? [];
  const pending = requests.filter((r) => r.status === "pending");
  const reviewed = requests.filter((r) => r.status !== "pending");

  const renderRow = (r: AccessRequest) => {
    const isBusy = busy.has(r.id);
    return (
      <div
        key={r.id}
        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl backdrop-blur-md bg-surface/30 border border-border/80"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground truncate">{r.name || r.email}</span>
            <span
              className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase border ${
                statusStyles[r.status] ?? statusStyles.pending
              }`}
            >
              {r.status}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" /> {r.email}
            </span>
            {r.orgId && (
              <span className="flex items-center gap-1 font-mono">
                <Building2 className="w-3 h-3" /> {r.orgId}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {new Date(r.createdAt).toLocaleString()}
            </span>
          </div>
          {r.message && (
            <p className="text-[11px] text-subtle mt-1.5 italic border-l-2 border-border pl-2">
              “{r.message}”
            </p>
          )}
          {r.status !== "pending" && r.reviewedBy && (
            <p className="text-[10px] text-muted mt-1">
              {r.status} by {r.reviewedBy}
              {r.reviewedAt ? ` · ${new Date(r.reviewedAt).toLocaleDateString()}` : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {r.status !== "approved" && (
            <button
              onClick={() => act(r.id, "approve")}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-3 py-2 bg-success/10 border border-success/20 text-success hover:bg-success/15 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Approve
            </button>
          )}
          {r.status !== "rejected" && (
            <button
              onClick={() => act(r.id, "reject")}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-3 py-2 bg-error/10 border border-error/20 text-error hover:bg-error/15 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              {r.status === "approved" ? "Revoke" : "Reject"}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-accent" /> Access Requests
          </h1>
          <p className="text-xs text-muted font-medium mt-1">
            Approve or reject requests for admin access. Super admin only.
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

      {error ? (
        <div className="p-6 rounded-2xl bg-error/10 border border-error/30 text-error text-xs font-semibold">
          Failed to load requests ({error.message === "403" ? "forbidden — super admin only" : error.message}).
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted font-medium">Loading requests…</span>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              Pending
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                {pending.length}
              </span>
            </h2>
            {pending.length === 0 ? (
              <p className="text-xs text-muted italic py-6 text-center">No pending requests. All caught up.</p>
            ) : (
              pending.map(renderRow)
            )}
          </section>

          {reviewed.length > 0 && (
            <section className="space-y-3 pt-2">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">History</h2>
              {reviewed.map(renderRow)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
