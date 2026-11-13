"use client";

import React, { useState } from "react";
import { ShieldAlert, LogOut, Loader2, ArrowRight } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { useToast } from "@/components/global/ToastContainer";

export default function PendingApprovalPage() {
  const { signOut } = useClerk();
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  const handleRequestApproval = async () => {
    setIsRequesting(true);
    try {
      const res = await fetch("/api/access-requests", { method: "POST" });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast("Error", result.error || "Could not send your request.", "error");
        return;
      }
      setRequested(true);
      toast(
        "Request Sent",
        result.alreadyApproved
          ? "You already have access — try reloading."
          : "An admin will review your request.",
        "success",
      );
    } catch {
      toast("Error", "Connection error. Please try again.", "error");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 text-center animate-fade-in-up">
        <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-black tracking-tight mb-3">Pending Approval</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Your account has been created, but you do not have permission to access the control center yet. Please request approval from an administrator.
        </p>

        <div className="space-y-4">
          <button 
            onClick={handleRequestApproval}
            disabled={isRequesting || requested}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 font-bold text-white rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
            style={{ background: requested ? "linear-gradient(90deg, #10b981 0%, #059669 100%)" : "linear-gradient(90deg, #6366f1 0%, #a855f7 100%)" }}
          >
            {isRequesting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : requested ? (
              "Approval Requested"
            ) : (
              <>Request Approval <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
          
          <button 
            onClick={() => signOut({ redirectUrl: "/" })}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold text-slate-300 border border-slate-700 rounded-xl hover:bg-slate-800 hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
