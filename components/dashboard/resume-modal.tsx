"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Upload,
  Check,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Layers,
  Cpu,
} from "lucide-react";
import { MasterResumeData } from "./types";

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (resumeData: MasterResumeData, reanalyzedCount?: number) => void;
}

export function ResumeModal({ isOpen, onClose, onSaved }: ResumeModalProps) {
  const [rawText, setRawText] = useState("");
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rescoreAll, setRescoreAll] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadResume();
    }
  }, [isOpen]);

  const loadResume = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/resume");
      if (res.ok) {
        const data = await res.json();
        if (data.exists && data.resume) {
          setRawText(data.resume.rawText || "");
          setParsedSkills(data.resume.parsedSkills || []);
          setCategories(data.resume.categories || {});
          setUpdatedAt(data.resume.updatedAt || null);
        }
      }
    } catch (err: any) {
      console.error("Failed to load resume:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setRawText(content);
        setStatusMessage({
          type: "success",
          text: `Loaded file "${file.name}" (${content.length} characters). Click 'Save & Analyze' to index skills.`,
        });
      }
    };
    reader.onerror = () => {
      setStatusMessage({ type: "error", text: "Failed to read file." });
    };

    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!rawText.trim()) {
      setStatusMessage({ type: "error", text: "Please paste your resume text or upload a document." });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      // 1. Save resume and extract skills
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: rawText.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save resume");
      }

      const data = await res.json();
      const updatedResume = data.resume;
      setParsedSkills(updatedResume.parsedSkills || []);
      setCategories(updatedResume.categories || {});
      setUpdatedAt(updatedResume.updatedAt);

      let reanalyzedCount = 0;
      // 2. Optionally re-score all applications on the Kanban board
      if (rescoreAll) {
        try {
          const syncRes = await fetch("/api/resume/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ syncAll: true }),
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            reanalyzedCount = syncData.count || 0;
          }
        } catch (syncErr) {
          console.warn("Could not batch re-score applications:", syncErr);
        }
      }

      setStatusMessage({
        type: "success",
        text: `Master resume saved! Indexed ${updatedResume.parsedSkills?.length || 0} skills. ${
          reanalyzedCount > 0 ? `Updated fit scores for ${reanalyzedCount} job applications.` : ""
        }`,
      });

      onSaved?.(updatedResume, reanalyzedCount);
    } catch (err: any) {
      console.error("Save error:", err);
      setStatusMessage({ type: "error", text: err.message || "Failed to save resume" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:rounded-2xl p-0 gap-0">
        {/* Header */}
        <div className="bg-zinc-900 text-white p-6 pb-5 rounded-t-xl sm:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Master Resume & Skills Engine
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold">
                  Zero Cost
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                Paste your master resume once. JobTrack automatically indexes your skills and calculates ATS match scores for every job card.
              </DialogDescription>
            </div>
          </div>

          {/* Quick stats banner if resume exists */}
          {updatedAt && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Indexed <strong className="text-white">{parsedSkills.length} competencies</strong>
              </span>
              <span className="text-zinc-400 text-[11px]">
                Last updated: {new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}
        </div>

        {/* Body Form */}
        <div className="p-6 space-y-5 bg-white">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`rounded-lg p-3 text-xs flex items-start gap-2 ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              {statusMessage.type === "success" ? (
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Text Area & Upload Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                Resume Content / Experience Bullets
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.md,.rtf,.json"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 text-xs gap-1.5 text-zinc-600 hover:text-black"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Text File
                </Button>
              </div>
            </div>

            <textarea
              rows={10}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste your full resume here (summary, work experience, bullet points, technical skills, projects, and education)..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-black focus:bg-white focus:outline-hidden font-mono leading-relaxed"
            />
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>{rawText.length} characters</span>
              <span>Supported: plain text, markdown, or text dumps from your PDF resume</span>
            </div>
          </div>

          {/* Parsed Competencies Preview */}
          {parsedSkills.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Detected Core Competencies ({parsedSkills.length})
                </span>
                <span className="text-[11px] text-zinc-500">Auto-extracted via open-source taxonomy</span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {parsedSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full bg-white border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-800 shadow-2xs"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sync All Checkbox */}
          <div className="flex items-start gap-2.5 rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-3">
            <input
              type="checkbox"
              id="rescore-all"
              checked={rescoreAll}
              onChange={(e) => setRescoreAll(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-black focus:ring-black accent-black cursor-pointer"
            />
            <label htmlFor="rescore-all" className="text-xs text-zinc-700 cursor-pointer select-none">
              <strong className="text-zinc-900 block">Auto-recalculate fit score on all active board cards</strong>
              Update the match percentage and missing keywords for every job already on your Kanban board.
            </label>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-zinc-600"
            >
              Close
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !rawText.trim()}
              className="gap-1.5 bg-black text-white text-xs font-semibold hover:bg-zinc-800 h-9 px-5 shadow-sm"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Indexing Skills...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  Save & Index Resume
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
