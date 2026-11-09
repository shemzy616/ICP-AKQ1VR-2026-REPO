"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Archive,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  Ghost,
  Check,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { ColumnItem, JobApplicationItem } from "./types";
import { getApplicationAgeStatus } from "@/lib/pipeline-radar";

interface DeclutterModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnItem[];
  onDeclutterComplete: () => void;
}

export function DeclutterModal({
  isOpen,
  onClose,
  columns,
  onDeclutterComplete,
}: DeclutterModalProps) {
  const [thresholdDays, setThresholdDays] = useState<number>(28);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Find rejected column if exists
  const rejectedColumn = columns.find(
    (c) => c.name.toLowerCase().includes("reject")
  );

  // Filter stale applications based on threshold
  const staleApplications = useMemo(() => {
    const list: { app: JobApplicationItem; days: number; colName: string }[] = [];

    for (const col of columns) {
      // Don't flag applications that are already in Rejected or Offered
      const normName = col.name.toLowerCase();
      if (normName.includes("reject") || normName.includes("offer")) continue;

      for (const app of col.JobApplications || []) {
        if (app.isArchived) continue;
        const ageStatus = getApplicationAgeStatus(app);
        if (ageStatus.daysElapsed >= thresholdDays) {
          list.push({ app, days: ageStatus.daysElapsed, colName: col.name });
        }
      }
    }

    // Sort descending by days
    return list.sort((a, b) => b.days - a.days);
  }, [columns, thresholdDays]);

  // Pre-select all matching applications whenever staleApplications change
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(staleApplications.map((s) => s.app._id)));
      setSuccessMessage(null);
    }
  }, [isOpen, staleApplications.length, thresholdDays]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set(staleApplications.map((s) => s.app._id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkAction = async (action: "archive" | "reject") => {
    const appIds = Array.from(selectedIds);
    if (appIds.length === 0) return;

    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      let updates: any = {};
      if (action === "archive") {
        updates = { isArchived: true };
      } else if (action === "reject") {
        updates = {
          columnId: rejectedColumn?._id,
          status: "Rejected",
        };
      }

      const res = await fetch("/api/applications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appIds, updates }),
      });

      if (!res.ok) {
        throw new Error("Failed to process bulk declutter");
      }

      const data = await res.json();
      setSuccessMessage(
        action === "archive"
          ? `Archived ${data.updatedCount || appIds.length} stale applications. Your active board is clean!`
          : `Moved ${data.updatedCount || appIds.length} applications to Rejected.`
      );

      setTimeout(() => {
        onDeclutterComplete();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Declutter error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:rounded-2xl p-0 gap-0">
        {/* Header */}
        <div className="bg-zinc-900 text-white p-6 pb-5 rounded-t-xl sm:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Ghost className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                1-Click Board Declutter & Ghosting Cleaner
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                Automatically identify stale jobs with no recruiter response to keep your Kanban board focused and zen.
              </DialogDescription>
            </div>
          </div>

          {/* Threshold selector */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-400">Identify jobs older than:</span>
            {[
              { days: 14, label: "14+ days" },
              { days: 21, label: "21+ days" },
              { days: 28, label: "28+ days (Ghosted)" },
            ].map((t) => (
              <button
                key={t.days}
                type="button"
                onClick={() => setThresholdDays(t.days)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  thresholdDays === t.days
                    ? "bg-white text-black shadow-xs"
                    : "bg-white/10 text-zinc-300 hover:bg-white/20"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 bg-white">
          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* List Toolbar */}
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              Found <strong className="text-zinc-900">{staleApplications.length}</strong> inactive applications
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] font-semibold text-zinc-600 hover:text-black"
              >
                Select All
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-[11px] font-semibold text-zinc-600 hover:text-black"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Stale Application Cards List */}
          {staleApplications.length > 0 ? (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 border border-zinc-100 rounded-xl p-2 bg-zinc-50/50">
              {staleApplications.map(({ app, days, colName }) => {
                const isSelected = selectedIds.has(app._id);
                return (
                  <div
                    key={app._id}
                    onClick={() => toggleSelect(app._id)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "bg-white border-zinc-400 shadow-xs"
                        : "bg-white/70 border-zinc-200/70 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div onClick
                        className="h-4 w-4 rounded border-zinc-300 text-black focus:ring-black accent-black cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <strong className="text-zinc-900 truncate">{app.company}</strong>
                          <span className="text-zinc-400">•</span>
                          <span className="text-zinc-600 truncate">{app.position}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span>Column: {colName}</span>
                          {app.location && <span>• {app.location}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-[10px] font-bold">
                        👻 {days}d ago
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-500 space-y-1">
              <Check className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
              <p className="font-semibold text-zinc-800">Your board is already clean!</p>
              <p className="text-zinc-400">No active applications exceed the {thresholdDays}-day threshold.</p>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-[11px] text-zinc-500">
              {selectedIds.size} application{selectedIds.size === 1 ? "" : "s"} selected
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-zinc-600 h-8"
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction("reject")}
                disabled={isProcessing || selectedIds.size === 0}
                className="text-xs h-8 gap-1.5 text-zinc-700 hover:text-black border-zinc-300"
              >
                <Trash2 className="h-3.5 w-3.5 text-zinc-500" />
                <span>Move to Rejected ({selectedIds.size})</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleBulkAction("archive")}
                disabled={isProcessing || selectedIds.size === 0}
                className="text-xs h-8 gap-1.5 bg-black text-white hover:bg-zinc-800 font-semibold shadow-xs"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Cleaning...</span>
                  </>
                ) : (
                  <>
                    <Archive className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Archive Selected ({selectedIds.size})</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
