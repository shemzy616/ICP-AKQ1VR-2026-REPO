"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Copy,
  Check,
  Calendar,
  Send,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Clock,
} from "lucide-react";
import { JobApplicationItem } from "./types";
import { generateFollowUpTemplates, getApplicationAgeStatus } from "@/lib/pipeline-radar";

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: JobApplicationItem | null;
  onFollowedUpSaved?: (updatedApp: JobApplicationItem) => void;
}

export function FollowUpModal({
  isOpen,
  onClose,
  application,
  onFollowedUpSaved,
}: FollowUpModalProps) {
  const [activeTab, setActiveTab] = useState<"email" | "linkedin" | "quick">("email");
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isMarking, setIsMarking] = useState(false);

  if (!application) return null;

  const ageStatus = getApplicationAgeStatus(application);
  const templates = generateFollowUpTemplates(application);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleMarkFollowedUp = async () => {
    setIsMarking(true);
    try {
      const now = new Date().toISOString();
      const res = await fetch(`/api/applications/${application._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastFollowedUpAt: now }),
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.application || { ...application, lastFollowedUpAt: now };
        onFollowedUpSaved?.(updated);
        onClose();
      }
    } catch (err) {
      console.error("Error marking application as followed up:", err);
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto sm:rounded-2xl p-0 gap-0">
        {/* Header */}
        <div className="bg-zinc-900 text-white p-6 pb-5 rounded-t-xl sm:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                  {application.company}
                </span>
                <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.2 text-[10px] font-bold">
                  {ageStatus.daysElapsed} days since applied
                </span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
                1-Click Follow-Up Assistant
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Polite, tailored notes to ping the recruiter or hiring manager for {application.position}.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "email"
                ? "border-black text-black"
                : "border-transparent text-zinc-500 hover:text-black"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Formal Email</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("linkedin")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "linkedin"
                ? "border-black text-black"
                : "border-transparent text-zinc-500 hover:text-black"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>LinkedIn DM (300 chars)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("quick")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "quick"
                ? "border-black text-black"
                : "border-transparent text-zinc-500 hover:text-black"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Quick Check-In</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 bg-white">
          {/* TAB 1: FORMAL EMAIL */}
          {activeTab === "email" && (
            <div className="space-y-3">
              {/* Subject */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                  <span>Subject Line</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(templates.email.subject, "subject")}
                    className="text-[11px] text-zinc-600 hover:text-black flex items-center gap-1 font-semibold"
                  >
                    {copiedType === "subject" ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Subject</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5 text-xs font-mono text-zinc-800">
                  {templates.email.subject}
                </div>
              </div>

              {/* Body */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                  <span>Email Body</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(templates.email.body, "email_body")}
                    className="text-[11px] text-zinc-600 hover:text-black flex items-center gap-1 font-semibold"
                  >
                    {copiedType === "email_body" ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied Body</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Full Body</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={8}
                  value={templates.email.body}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-xs text-zinc-800 font-sans leading-relaxed focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* TAB 2: LINKEDIN DM */}
          {activeTab === "linkedin" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                <span>Tailored Connection Request Note</span>
                <span className="text-[11px] text-zinc-400">
                  {templates.linkedIn.length} / 300 characters
                </span>
              </div>
              <textarea
                readOnly
                rows={5}
                value={templates.linkedIn}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-xs text-zinc-800 font-sans leading-relaxed focus:outline-hidden"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(templates.linkedIn, "linkedin")}
                  className="h-8 text-xs gap-1.5"
                >
                  {copiedType === "linkedin" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy LinkedIn Note</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: QUICK 1-LINER */}
          {activeTab === "quick" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                <span>Casual 1-Line Status Check</span>
                <span className="text-[11px] text-zinc-400">Great for direct emails or recruiters</span>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-xs text-zinc-800 leading-relaxed font-sans">
                {templates.quickCheckIn}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(templates.quickCheckIn, "quick")}
                  className="h-8 text-xs gap-1.5"
                >
                  {copiedType === "quick" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Quick Check-in</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">
              Copied your message? Mark it to update card freshness.
            </span>

            <Button
              type="button"
              size="sm"
              onClick={handleMarkFollowedUp}
              disabled={isMarking}
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isMarking ? "Updating..." : "Mark as Followed Up Today"}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
