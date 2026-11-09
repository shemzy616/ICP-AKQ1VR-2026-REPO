"use client";

import { useState } from "react";
import { Link2, Zap, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColumnItem, JobApplicationItem } from "./types";

interface QuickAddBarProps {
  columns: ColumnItem[];
  onApplicationCreated: (newApp: JobApplicationItem, targetColId: string) => void;
  isDemoMode?: boolean;
}

export function QuickAddBar({
  columns,
  onApplicationCreated,
  isDemoMode,
}: QuickAddBarProps) {
  const [url, setUrl] = useState("");
  const [selectedColumnId, setSelectedColumnId] = useState<string>(
    columns.find((c) => c.name.toLowerCase() === "applied")?._id || columns[0]?._id || ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const targetColId = selectedColumnId || columns[0]?._id;
      const targetCol = columns.find((c) => c._id === targetColId);

      const res = await fetch("/api/scrape-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          columnId: targetColId,
          autoSave: !isDemoMode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not parse job link");
      }

      const scraped = data.jobData || data.application;
      const targetApp: JobApplicationItem = {
        _id: data.application?._id || "app_" + Date.now(),
        company: scraped.company || "New Company",
        position: scraped.position || "Software Role",
        status: targetCol?.name || "Applied",
        columnId: targetColId,
        boardId: columns[0]?.boardId || "board-1",
        location: scraped.location,
        salary: scraped.salary,
        salaryText: scraped.salaryText,
        description: scraped.description,
        responsibilities: scraped.responsibilities || [],
        requirements: scraped.requirements || [],
        recruiterContact: scraped.recruiterContact,
        jobUrl: url.trim(),
        tags: scraped.tags || [],
        notes: scraped.notes,
        appliedDate: new Date(),
        order: 0,
      };

      onApplicationCreated(targetApp, targetColId);
      setUrl("");
      setMessage({
        type: "success",
        text: `Added "${targetApp.position} at ${targetApp.company}" to ${targetCol?.name || "board"}!`,
      });

      // Clear success message after 4s
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setMessage({
        type: "error",
        text: err.message || "Failed to parse link. Please check the URL.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-gradient-to-r from-zinc-900 via-black to-zinc-900 p-4 text-white shadow-md">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-400 text-black">
              <Zap className="h-3.5 w-3.5 fill-black" />
            </span>
            <span className="text-sm font-bold tracking-tight">
              Instant 1-Click Track
            </span>
            <span className="hidden sm:inline-block rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
              Zero typing needed
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">
            Paste any link from LinkedIn, Greenhouse, Lever, Indeed, Workday, or career pages
          </span>
        </div>

        <form onSubmit={handleQuickAdd} className="flex flex-col sm:flex-row gap-2">
          {/* URL Input */}
          <div className="relative flex-1">
            <Link2 className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              type="url"
              placeholder="https://jobs.lever.co/stripe/... or linkedin.com/jobs/view/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-10 pl-9 bg-zinc-800/90 border-zinc-700 text-white placeholder:text-zinc-500 text-xs sm:text-sm focus:bg-zinc-800 focus:border-white focus:ring-0"
              required
            />
          </div>

          {/* Stage Dropdown */}
          <select
            value={selectedColumnId}
            onChange={(e) => setSelectedColumnId(e.target.value)}
            className="h-10 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-xs font-medium text-zinc-200 focus:border-white focus:outline-hidden"
          >
            {columns.map((col) => (
              <option key={col._id} value={col._id}>
                Stage: {col.name}
              </option>
            ))}
          </select>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="h-10 bg-white text-black hover:bg-zinc-200 font-semibold text-xs px-5 shrink-0 gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5 fill-black" />
                <span>Auto-Add</span>
              </>
            )}
          </Button>
        </form>

        {/* Feedback Alert */}
        {message && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
              message.type === "success"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
