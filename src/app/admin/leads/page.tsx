"use client";

import React from "react";
import useSWR from "swr";
import { useUser } from "@clerk/nextjs";
import { Users, Mail, Building2, Calendar, CheckCircle2, Archive, Clock, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/components/global/ToastContainer";
import { formatDistanceToNow } from "date-fns";

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string | null;
  status: "NEW" | "CONTACTED" | "ARCHIVED";
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function LeadsDashboard() {
  const { isLoaded, isSignedIn } = useUser();
  const { toast } = useToast();
  const isAdmin = isSignedIn;

  const { data: leads, mutate, isValidating } = useSWR<Lead[]>(
    isAdmin ? "/api/admin/leads" : null,
    fetcher
  );

  if (!isLoaded) return <div className="flex justify-center py-20"><div className="w-8 h-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  if (!isAdmin) return <div className="p-10 text-center text-error font-bold">Access Denied</div>;

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast("Status Updated", "Lead status successfully updated.", "success" );
      mutate();
    } catch {
      toast("Error", "Failed to update lead status.", "error" );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW": return <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1"><Clock className="w-3 h-3"/> New</span>;
      case "CONTACTED": return <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Contacted</span>;
      case "ARCHIVED": return <span className="px-2 py-1 text-xs font-bold rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30 flex items-center gap-1"><Archive className="w-3 h-3"/> Archived</span>;
      default: return null;
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 text-sm text-muted font-medium mb-2">
            <Users className="w-4 h-4" /> <span>Enterprise Leads</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">Access Requests</h1>
          <p className="text-muted mt-2">Manage incoming requests for enterprise platform access.</p>
        </div>
        <button 
          onClick={() => mutate()} 
          disabled={isValidating}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isValidating ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Leads Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/50 border-b border-border text-xs font-bold text-muted uppercase tracking-wider">
                <th className="p-4">Contact</th>
                <th className="p-4">Company</th>
                <th className="p-4">Message</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {!leads ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted">
                    No enterprise leads found.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-background/30 transition-colors group">
                    <td className="p-4 align-top">
                      <div className="font-bold text-white flex items-center gap-2">
                        {lead.name}
                        {lead.status === "NEW" && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                      <div className="text-muted flex items-center gap-1 mt-1 text-xs">
                        <Mail className="w-3 h-3" />
                        <a href={`mailto:${lead.email}`} className="hover:text-accent transition-colors">{lead.email}</a>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      {lead.company ? (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-muted" /> {lead.company}
                        </div>
                      ) : (
                        <span className="text-muted italic">Not provided</span>
                      )}
                    </td>
                    <td className="p-4 align-top max-w-xs">
                      {lead.message ? (
                        <p className="text-slate-300 line-clamp-3 text-xs leading-relaxed" title={lead.message}>{lead.message}</p>
                      ) : (
                        <span className="text-muted italic">No message</span>
                      )}
                    </td>
                    <td className="p-4 align-top">
                      {getStatusBadge(lead.status)}
                    </td>
                    <td className="p-4 align-top text-muted text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="p-4 align-top text-right">
                      <select 
                        className="bg-background border border-border rounded-lg text-xs p-1.5 focus:outline-none focus:border-accent text-slate-300"
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      >
                        <option value="NEW">New</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
