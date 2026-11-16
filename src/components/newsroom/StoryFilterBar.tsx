"use client";

import React from "react";
import { Search, LayoutGrid, Kanban, List, ArrowUpDown, Check, Trash2, X } from "lucide-react";

export enum SortOption {
  Date = "date",
  Title = "title",
  Source = "source",
  Category = "category",
}

interface Brand {
  id: string;
  name: string;
}

interface StoryFilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  selectedApproval: string;
  onApprovalChange: (status: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedBrand: string;
  onBrandChange: (brandId: string) => void;
  brands: Brand[];
  viewMode: "grid" | "table" | "kanban";
  onViewModeChange: (mode: "grid" | "table" | "kanban") => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  selectedCount: number;
  onBatchApprove?: () => void;
  onBatchDelete?: () => void;
}

const CATEGORIES = ["all", "Tech", "AI", "Crypto", "Markets", "Economy", "Entertainment"];
const APPROVAL_STATUSES = [
  { id: "all", label: "All Approvals" },
  { id: "APPROVED", label: "Approved" },
  { id: "PENDING", label: "Pending" },
  { id: "REJECTED", label: "Rejected" },
];

export const StoryFilterBar: React.FC<StoryFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedApproval,
  onApprovalChange,
  selectedStatus,
  onStatusChange,
  selectedBrand,
  onBrandChange,
  brands,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  selectedCount,
  onBatchApprove,
  onBatchDelete,
}) => {
  return (
    <div className="space-y-3 mb-6">
      {/* Top Filter Controls Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 glass-panel-raised border border-white/10 rounded-2xl p-3 shadow-lg">
        {/* Search Bar with Shortcut hint */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search news stories, headlines, or keywords..."
            className="w-full bg-surface-raised/90 border border-border/80 rounded-xl pl-9 pr-14 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent/60 transition-colors"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery ? (
              <button
                onClick={() => onSearchChange("")}
                className="p-1 text-muted hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/[0.06] border border-border/60 text-[9px] font-mono text-muted">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Dropdown Filters & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Brand Filter */}
          {brands.length > 0 && (
            <select
              value={selectedBrand}
              onChange={(e) => onBrandChange(e.target.value)}
              className="bg-surface-raised/90 border border-border/80 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent/60 cursor-pointer font-medium"
            >
              <option value="all">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-surface-raised/90 border border-border/80 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent/60 cursor-pointer font-medium"
          >
            <option value="all">All Pipeline Stages</option>
            <option value="INGESTED">Ingested</option>
            <option value="SCRIPTED">Scripted</option>
            <option value="RENDERING">Rendering</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 bg-surface-raised/90 border border-border/80 rounded-xl px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer font-medium"
            >
              <option value={SortOption.Date}>Date (Newest)</option>
              <option value={SortOption.Title}>Title (A-Z)</option>
              <option value={SortOption.Source}>Source</option>
              <option value={SortOption.Category}>Category</option>
            </select>
          </div>

          {/* View Mode Segmented Controls */}
          <div className="flex rounded-xl border border-border/80 bg-surface-raised/90 p-0.5">
            <button
              onClick={() => onViewModeChange("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-accent text-accent-foreground shadow-sm shadow-accent/20 font-bold"
                  : "text-muted hover:text-foreground"
              }`}
              title="Bento Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange("kanban")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-accent text-accent-foreground shadow-sm shadow-accent/20 font-bold"
                  : "text-muted hover:text-foreground"
              }`}
              title="Kanban Board View"
            >
              <Kanban className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange("table")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-accent text-accent-foreground shadow-sm shadow-accent/20 font-bold"
                  : "text-muted hover:text-foreground"
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Chips & Approval Pills Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        {/* Category Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold tracking-tight transition-all cursor-pointer ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-accent/20 text-accent-hover border border-accent/40 shadow-sm shadow-accent/10"
                  : "bg-white/[0.03] hover:bg-white/[0.06] border border-border/60 text-subtle hover:text-foreground"
              }`}
            >
              {cat === "all" ? "All Topics" : cat}
            </button>
          ))}
        </div>

        {/* Approval Filter Pills / Batch Selection Indicator */}
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 bg-accent/15 border border-accent/30 px-3 py-1 rounded-xl shadow-sm shadow-accent/10">
              <span className="text-xs font-mono font-bold text-accent-hover">{selectedCount} Selected</span>
              {onBatchApprove && (
                <button
                  onClick={onBatchApprove}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Approve</span>
                </button>
              )}
              {onBatchDelete && (
                <button
                  onClick={onBatchDelete}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors ml-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 bg-surface-raised/80 border border-border/80 rounded-xl p-0.5">
            {APPROVAL_STATUSES.map((app) => (
              <button
                key={app.id}
                onClick={() => onApprovalChange(app.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  selectedApproval === app.id
                    ? "bg-white/[0.08] text-foreground border border-white/10 shadow-xs"
                    : "text-muted hover:text-subtle"
                }`}
              >
                {app.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
