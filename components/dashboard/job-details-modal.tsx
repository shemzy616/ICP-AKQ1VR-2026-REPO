"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  MapPin,
  DollarSign,
  Calendar,
  CheckCircle2,
  FileText,
  Mail,
  Pencil,
  Trash2,
  ChevronRight,
  Sparkles,
  Target,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  BookOpen,
  PlusCircle,
  MinusCircle,
  Scissors,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { JobApplicationItem, ColumnItem, FitAnalysis } from "./types";

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: JobApplicationItem | null;
  columns: ColumnItem[];
  onEdit: (app: JobApplicationItem) => void;
  onDelete: (appId: string) => void;
  onMoveColumn: (appId: string, colId: string) => void;
  onOpenResumeModal?: () => void;
  onApplicationUpdated?: (updatedApp: JobApplicationItem) => void;
}

export function JobDetailsModal({
  isOpen,
  onClose,
  application: initialApp,
  columns,
  onEdit,
  onDelete,
  onMoveColumn,
  onOpenResumeModal,
  onApplicationUpdated,
}: JobDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"spec" | "fit" | "full" | "notes">("spec");
  const [tailoringView, setTailoringView] = useState<"all" | "add" | "remove">("all");
  const [application, setApplication] = useState<JobApplicationItem | null>(initialApp);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isRescanning, setIsRescanning] = useState(false);

  useEffect(() => {
    setApplication(initialApp);
    // If opening a card with fit analysis, or if user was already on fit
    if (initialApp?.fitAnalysis?.score !== undefined) {
      // keep active tab or let user switch
    }
  }, [initialApp]);

  if (!application) return null;

  const currentColumn = columns.find((c) => c._id === application.columnId);

  const formattedSalary =
    application.salaryText ||
    (application.salary
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(application.salary)
      : null);

  const formattedDate = application.appliedDate
    ? new Date(application.appliedDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const fit = application.fitAnalysis;

  const handleCopyBullet = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRescanFit = async () => {
    if (!application) return;
    setIsRescanning(true);
    try {
      const res = await fetch("/api/resume/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application._id }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.fitAnalysis) {
          const updated = { ...application, fitAnalysis: data.fitAnalysis };
          setApplication(updated);
          onApplicationUpdated?.(updated);
        }
      }
    } catch (err) {
      console.error("Failed to rescan fit:", err);
    } finally {
      setIsRescanning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:rounded-2xl p-0 gap-0">
        {/* Header Banner */}
        <div className="bg-zinc-900 text-white p-6 pb-5 rounded-t-xl sm:rounded-t-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                  {application.company}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                  {currentColumn?.name || application.status}
                </span>
                {fit && fit.score !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                      fit.score >= 75
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : fit.score >= 50
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                    }`}
                  >
                    🎯 {fit.score}% Fit
                  </span>
                )}
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight mt-1 text-white">
                {application.position}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Job details, ATS fit, responsibilities, and requirements for {application.position} at {application.company}
              </DialogDescription>
            </div>

            {application.jobUrl && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs bg-white text-black hover:bg-zinc-200 border-0"
              >
                <a
                  href={application.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Job Link</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-zinc-800 text-xs">
            {formattedSalary && (
              <div className="flex items-center gap-1.5 text-zinc-300">
                <DollarSign className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-medium truncate">{formattedSalary}</span>
              </div>
            )}

            {application.location && (
              <div className="flex items-center gap-1.5 text-zinc-300">
                <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="truncate">{application.location}</span>
              </div>
            )}

            {formattedDate && (
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Calendar className="h-4 w-4 text-zinc-400 shrink-0" />
                <span>{formattedDate}</span>
              </div>
            )}

            {application.recruiterContact && (
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Mail className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="truncate">{application.recruiterContact}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab("spec")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "spec"
                ? "border-black text-black"
                : "border-transparent text-zinc-500 hover:text-black"
            }`}
          >
            Role Spec & Duties
          </button>

          <button
            onClick={() => setActiveTab("fit")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "fit"
                ? "border-black text-black"
                : "border-transparent text-zinc-500 hover:text-black"
            }`}
          >
            <Target className="h-3.5 w-3.5 text-emerald-600" />
            <span>ATS Resume Fit</span>
            {fit?.score !== undefined && (
              <span
                className={`ml-1 rounded px-1.5 py-0.2 text-[10px] font-bold ${
                  fit.score >= 75
                    ? "bg-emerald-100 text-emerald-800"
                    : fit.score >= 50
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {fit.score}%
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("full")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "full"
                ? "border-black text-black"
                : "border-transparent text-zinc-500 hover:text-black"
            }`}
          >
            Full Description
          </button>

          <button
            onClick={() => setActiveTab("notes")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "notes"
                ? "border-black text-black"
                : "border-transparent text-zinc-500 hover:text-black"
            }`}
          >
            My Notes
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-6 max-h-[50vh] overflow-y-auto">
          {/* TAB 1: Role Spec & Duties */}
          {activeTab === "spec" && (
            <div className="space-y-6">
              {/* Responsibilities Section */}
              {application.responsibilities && application.responsibilities.length > 0 ? (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-black" />
                    Key Responsibilities & What You'll Do
                  </h3>
                  <ul className="space-y-2">
                    {application.responsibilities.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-zinc-700 leading-relaxed bg-zinc-50 p-2.5 rounded-lg border border-zinc-100"
                      >
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Requirements Section */}
              {application.requirements && application.requirements.length > 0 ? (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-black" />
                    Requirements & Qualifications
                  </h3>
                  <ul className="space-y-2">
                    {application.requirements.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-zinc-700 leading-relaxed bg-zinc-50 p-2.5 rounded-lg border border-zinc-100"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Fallback if no parsed bullets */}
              {(!application.responsibilities || application.responsibilities.length === 0) &&
                (!application.requirements || application.requirements.length === 0) && (
                  <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-500">
                    <FileText className="h-6 w-6 text-zinc-400 mx-auto mb-2" />
                    <p>No separate bullet breakdown detected.</p>
                    <p className="text-zinc-400 mt-1">
                      Check the "Full Description" tab to read the complete text.
                    </p>
                  </div>
                )}

              {/* Tags */}
              {application.tags && application.tags.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold uppercase text-zinc-400 mb-2">
                    Skills & Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {application.tags.map((t, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ATS RESUME FIT (The Zero-Cost Analyzer) */}
          {activeTab === "fit" && (
            <div className="space-y-6">
              {/* Top Fit Score Card */}
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border font-black text-xl shadow-xs ${
                        fit && fit.score >= 75
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : fit && fit.score >= 50
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : "bg-rose-50 text-rose-800 border-rose-300"
                      }`}
                    >
                      {fit ? `${fit.score}%` : "--"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-zinc-900">
                          {fit?.verdict?.label || "ATS Match Assessment"}
                        </h4>
                        <span className="rounded bg-zinc-200/70 px-1.5 py-0.2 text-[10px] font-semibold text-zinc-600">
                          Zero-Cost Engine
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 mt-1 max-w-md leading-relaxed">
                        {fit?.verdict?.description ||
                          "Upload your Master Resume to benchmark keyword overlap and identify missing ATS requirements."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenResumeModal && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onOpenResumeModal}
                        className="h-8 text-xs gap-1.5 text-zinc-700 hover:text-black"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Edit Resume</span>
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleRescanFit}
                      disabled={isRescanning}
                      className="h-8 text-xs gap-1.5 bg-black text-white hover:bg-zinc-800"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isRescanning ? "animate-spin" : ""}`} />
                      <span>{isRescanning ? "Scanning..." : "Re-Scan"}</span>
                    </Button>
                  </div>
                </div>

                {/* Progress bar visual */}
                {fit && fit.score !== undefined && (
                  <div className="mt-4 pt-3 border-t border-zinc-200/60">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1.5">
                      <span>ATS Match Probability</span>
                      <strong className="text-zinc-900">{fit.score}% Match</strong>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-200 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          fit.score >= 75
                            ? "bg-emerald-500"
                            : fit.score >= 50
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${fit.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Two-Column Skills Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Matched Strengths */}
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Matched Strengths ({fit?.matchedSkills?.length || 0})
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium">Found in Resume</span>
                  </div>

                  {fit?.matchedSkills && fit.matchedSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {fit.matchedSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-full bg-white border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-800 shadow-2xs"
                        >
                          ✓ {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic pt-1">
                      No overlapping technical competencies detected.
                    </p>
                  )}
                </div>

                {/* Missing ATS Gaps */}
                <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Missing ATS Keywords ({fit?.missingSkills?.length || 0})
                    </span>
                    <span className="text-[10px] text-amber-700 font-medium">In Job, Missing in Resume</span>
                  </div>

                  {fit?.missingSkills && fit.missingSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {fit.missingSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-800 shadow-2xs"
                        >
                          ⚠️ {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700 font-medium pt-1">
                      ✓ No missing core keywords identified! Great fit.
                    </p>
                  )}
                </div>
              </div>

              {/* Recommended Bullets (Google X-Y-Z Formula) */}
              {fit?.suggestions && fit.suggestions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        ATS Bullet Recommendations (Google X-Y-Z Formula)
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Copy and adjust these battle-tested bullets to cover missing skills before applying:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {fit.suggestions.slice(0, 5).map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-2xs space-y-2 transition-all hover:border-zinc-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-800 uppercase tracking-wide">
                              {item.skill}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium">
                              {item.category}
                            </span>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyBullet(item.bullet, idx)}
                            className="h-7 text-[11px] gap-1 text-zinc-600 hover:text-black hover:bg-zinc-100"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span className="text-emerald-700 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy Bullet</span>
                              </>
                            )}
                          </Button>
                        </div>

                        <p className="text-xs text-zinc-800 leading-relaxed font-sans bg-zinc-50/60 p-2.5 rounded-lg border border-zinc-100">
                          {item.bullet}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: Role-Specific Tailoring (What to Add vs. What to Remove) */}
              <div className="space-y-4 pt-4 border-t border-zinc-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-blue-600" />
                      Role-Specific Tailoring: What to Add vs. Remove
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Target Role: <strong className="text-zinc-800">{fit?.roleArchetype || "Software Engineer"}</strong>
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setTailoringView("all")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        tailoringView === "all"
                          ? "bg-white text-black shadow-xs font-semibold"
                          : "text-zinc-600 hover:text-black"
                      }`}
                    >
                      All ({(fit?.tailoringAdvice?.toAdd?.length || 0) + (fit?.tailoringAdvice?.toRemove?.length || 0)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTailoringView("add")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        tailoringView === "add"
                          ? "bg-emerald-600 text-white shadow-xs font-semibold"
                          : "text-zinc-600 hover:text-black"
                      }`}
                    >
                      ➕ Add ({fit?.tailoringAdvice?.toAdd?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTailoringView("remove")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        tailoringView === "remove"
                          ? "bg-rose-600 text-white shadow-xs font-semibold"
                          : "text-zinc-600 hover:text-black"
                      }`}
                    >
                      ➖ Remove ({fit?.tailoringAdvice?.toRemove?.length || 0})
                    </button>
                  </div>
                </div>

                {/* WHAT TO ADD SECTION */}
                {(tailoringView === "all" || tailoringView === "add") && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                      <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Recommended Additions for this Role</span>
                    </div>

                    {fit?.tailoringAdvice?.toAdd && fit.tailoringAdvice.toAdd.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2.5">
                        {fit.tailoringAdvice.toAdd.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-emerald-200/90 bg-emerald-50/30 p-3.5 space-y-1.5 transition-all hover:border-emerald-300"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                {item.title}
                              </span>
                              <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                                {item.impact} Impact
                              </span>
                            </div>

                            <p className="text-xs text-zinc-600 leading-relaxed">
                              <strong className="text-zinc-800">Why Add: </strong>
                              {item.reason}
                            </p>

                            <div className="rounded-lg bg-white/80 border border-emerald-100 p-2 text-[11px] text-zinc-800 font-mono leading-relaxed">
                              <strong className="font-sans text-emerald-700 block font-semibold mb-0.5">
                                Suggested Action:
                              </strong>
                              {item.suggestedAction}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic p-3 rounded-lg border border-zinc-100 bg-zinc-50">
                        No critical skill additions required. Your core stack aligns well.
                      </p>
                    )}
                  </div>
                )}

                {/* WHAT TO REMOVE SECTION */}
                {(tailoringView === "all" || tailoringView === "remove") && (
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                      <MinusCircle className="h-3.5 w-3.5 text-rose-600" />
                      <span>Recommended Removals & Anti-Patterns to Prune</span>
                    </div>

                    {fit?.tailoringAdvice?.toRemove && fit.tailoringAdvice.toRemove.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2.5">
                        {fit.tailoringAdvice.toRemove.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-rose-200/90 bg-rose-50/30 p-3.5 space-y-1.5 transition-all hover:border-rose-300"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                                <Scissors className="h-3.5 w-3.5 text-rose-600" />
                                {item.title}
                              </span>
                              {item.foundSnippet && (
                                <span className="line-through rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-semibold text-rose-800">
                                  "{item.foundSnippet}"
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-zinc-600 leading-relaxed">
                              <strong className="text-zinc-800">Why Remove: </strong>
                              {item.reason}
                            </p>

                            <div className="rounded-lg bg-white/80 border border-rose-100 p-2 text-[11px] text-zinc-800 leading-relaxed">
                              <strong className="text-rose-700 block font-semibold mb-0.5">
                                How to Fix:
                              </strong>
                              {item.suggestedAction}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 text-xs text-emerald-800 flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Clean Resume!</strong> No empty buzzwords, outdated technologies, or passive phrasing detected.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Full Job Posting Text */}
          {activeTab === "full" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Full Job Posting Text
              </h3>
              {application.description ? (
                <div className="rounded-xl bg-zinc-50 p-4 border border-zinc-200 text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap font-sans">
                  {application.description}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">
                  No full description stored for this application.
                </p>
              )}
            </div>
          )}

          {/* TAB 4: Personal Notes */}
          {activeTab === "notes" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Personal Notes & Strategy
              </h3>
              {application.notes ? (
                <div className="rounded-xl bg-amber-50/60 p-4 border border-amber-200 text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap">
                  {application.notes}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">
                  No notes recorded yet. Click "Edit Details" below to add notes.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 p-4 px-6 rounded-b-xl sm:rounded-b-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Move to:</span>
            <select
              value={application.columnId}
              onChange={(e) => onMoveColumn(application._id, e.target.value)}
              className="h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-800 focus:border-black focus:outline-hidden"
            >
              {columns.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onClose();
                onEdit(application);
              }}
              className="h-8 gap-1.5 text-xs"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Details</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onDelete(application._id);
                onClose();
              }}
              className="h-8 gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
