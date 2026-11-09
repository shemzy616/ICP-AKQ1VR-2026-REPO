"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColumnItem, JobApplicationItem } from "./types";
import { X, Plus, DollarSign, MapPin, Link2, Calendar, Zap, Loader2 } from "lucide-react";

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (applicationData: Partial<JobApplicationItem>) => Promise<void>;
  columns: ColumnItem[];
  defaultColumnId?: string;
  initialData?: JobApplicationItem | null;
}

export function ApplicationModal({
  isOpen,
  onClose,
  onSave,
  columns,
  defaultColumnId,
  initialData,
}: ApplicationModalProps) {
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [columnId, setColumnId] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState<string>("");
  const [jobUrl, setJobUrl] = useState("");
  const [appliedDate, setAppliedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // URL auto-fill state inside modal
  const [quickUrl, setQuickUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeSuccess, setScrapeSuccess] = useState(false);

  // Populate or reset form whenever modal opens or initialData changes
  useEffect(() => {
    if (initialData) {
      setCompany(initialData.company || "");
      setPosition(initialData.position || "");
      setColumnId(initialData.columnId || (columns[0]?._id ?? ""));
      setLocation(initialData.location || "");
      setSalary(initialData.salary ? initialData.salary.toString() : "");
      setJobUrl(initialData.jobUrl || "");
      setAppliedDate(
        initialData.appliedDate
          ? new Date(initialData.appliedDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setNotes(initialData.notes || "");
      setTags(initialData.tags || []);
    } else {
      setCompany("");
      setPosition("");
      setColumnId(defaultColumnId || (columns[0]?._id ?? ""));
      setLocation("");
      setSalary("");
      setJobUrl("");
      setAppliedDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setTags([]);
    }
    setError("");
    setTagInput("");
    setQuickUrl("");
    setScrapeSuccess(false);
  }, [isOpen, initialData, defaultColumnId, columns]);

  const handleScrapeAndFill = async () => {
    if (!quickUrl.trim()) return;
    setIsScraping(true);
    setError("");
    setScrapeSuccess(false);

    try {
      const res = await fetch("/api/scrape-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: quickUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse job URL");

      const info = data.jobData;
      if (info.company) setCompany(info.company);
      if (info.position) setPosition(info.position);
      if (info.location) setLocation(info.location);
      if (info.salary) setSalary(info.salary.toString());
      if (info.notes) setNotes(info.notes);
      if (info.tags && Array.isArray(info.tags)) setTags(info.tags);
      setJobUrl(quickUrl.trim());
      setScrapeSuccess(true);
    } catch (err: any) {
      setError(err.message || "Could not auto-extract fields from link.");
    } finally {
      setIsScraping(false);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !position.trim()) {
      setError("Please fill in both Company and Position.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const selectedCol = columns.find((c) => c._id === columnId);
      await onSave({
        company: company.trim(),
        position: position.trim(),
        columnId,
        status: selectedCol ? selectedCol.name : undefined,
        location: location.trim(),
        salary: salary ? Number(salary) : undefined,
        jobUrl: jobUrl.trim(),
        appliedDate: appliedDate ? new Date(appliedDate) : new Date(),
        notes: notes.trim(),
        tags,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {initialData ? "Edit Application" : "New Job Application"}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            {initialData
              ? "Update application stage, details, and interview notes."
              : "Enter the details manually or auto-fill with a job link."}
          </DialogDescription>
        </DialogHeader>

        {/* 1-Click Link Auto-Fill Section (for new applications) */}
        {!initialData && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-900 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 fill-black text-black" />
                Auto-fill from Job URL
              </span>
              {scrapeSuccess && (
                <span className="text-emerald-600 font-semibold text-[11px]">
                  ✓ Fields auto-filled!
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Paste job link (LinkedIn, Greenhouse, Lever, etc.)..."
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                className="h-8 text-xs bg-white"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleScrapeAndFill}
                disabled={isScraping || !quickUrl.trim()}
                className="h-8 px-3 text-xs bg-black text-white hover:bg-zinc-800 shrink-0 gap-1"
              >
                {isScraping ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Zap className="h-3 w-3" />
                )}
                <span>Auto-Fill</span>
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-xs font-semibold uppercase text-zinc-600">
                Company *
              </Label>
              <Input
                id="company"
                placeholder="e.g. Google, Stripe"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="position" className="text-xs font-semibold uppercase text-zinc-600">
                Position *
              </Label>
              <Input
                id="position"
                placeholder="e.g. Frontend Engineer"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
                className="h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="stage" className="text-xs font-semibold uppercase text-zinc-600">
                Stage / Column
              </Label>
              <select
                id="stage"
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-xs focus:border-black focus:outline-hidden"
              >
                {columns.map((col) => (
                  <option key={col._id} value={col._id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs font-semibold uppercase text-zinc-600">
                Location
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  id="location"
                  placeholder="e.g. Remote, SF, London"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="salary" className="text-xs font-semibold uppercase text-zinc-600">
                Annual Salary ($)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  id="salary"
                  type="number"
                  placeholder="e.g. 135000"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="appliedDate" className="text-xs font-semibold uppercase text-zinc-600">
                Date Applied
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  id="appliedDate"
                  type="date"
                  value={appliedDate}
                  onChange={(e) => setAppliedDate(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jobUrl" className="text-xs font-semibold uppercase text-zinc-600">
              Job Posting URL
            </Label>
            <div className="relative">
              <Link2 className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                id="jobUrl"
                type="url"
                placeholder="https://..."
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                className="h-10 pl-9"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-zinc-600">Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag (e.g. Next.js, Urgent, Hybrid)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDownTag}
                className="h-9 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                className="h-9 px-3"
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 border border-zinc-200"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-zinc-400 hover:text-black"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold uppercase text-zinc-600">
              Notes & Next Steps
            </Label>
            <textarea
              id="notes"
              rows={3}
              placeholder="e.g. Met recruiter Sarah at tech mixer. Follow up on Monday..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-800 shadow-xs focus:border-black focus:outline-hidden placeholder:text-zinc-400"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-black text-white hover:bg-zinc-800"
            >
              {isSubmitting ? "Saving..." : initialData ? "Save Changes" : "Create Application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
