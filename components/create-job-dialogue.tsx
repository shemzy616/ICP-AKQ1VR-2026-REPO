"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createJobApplication } from "@/lib/actions/job-application";
import { uploadJobApplicationDocument } from "@/lib/client/job-documents";

interface CreateJobApplicationDialogProps {
  columnId: string;
  boardId: string;
  onCreated?: () => void;
}

interface CustomFieldForm {
  key: string;
  value: string;
}

interface CreateJobFormData {
  company: string;
  position: string;
  location: string;
  cvVersion: string;
  coverLetterVersion: string;
  notes: string;
  salary: string;
  jobUrl: string;
  tags: string;
  description: string;
  customFields: CustomFieldForm[];
}

function getInitialFormData(): CreateJobFormData {
  return {
    company: "",
    position: "",
    location: "",
    cvVersion: "",
    coverLetterVersion: "",
    notes: "",
    salary: "",
    jobUrl: "",
    tags: "",
    description: "",
    customFields: [],
  };
}

export default function CreateJobApplicationDialog({
  columnId,
  boardId,
  onCreated,
}: CreateJobApplicationDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateJobFormData>(() => getInitialFormData());
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setCvFile(null);
      setCoverLetterFile(null);
      setFileInputResetKey((prev) => prev + 1);
    }
  };

  const addCustomField = () => {
    setFormData((prev) => ({
      ...prev,
      customFields: [...(prev.customFields || []), { key: "", value: "" }],
    }));
  };

  const updateCustomField = (
    index: number,
    field: keyof CustomFieldForm,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeCustomField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    try {
      const result = await createJobApplication({
        ...formData,
        columnId,
        boardId,
        tags: (formData.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
        customFields: (formData.customFields || [])
          .map((field) => ({
            key: (field.key || "").trim(),
            value: (field.value || "").trim(),
          }))
          .filter((field) => field.key.length > 0),
      });

      if (!result.error) {
        const jobId = result.data?._id?.toString();

        if (jobId) {
          const uploads: Promise<unknown>[] = [];
          if (cvFile) {
            uploads.push(uploadJobApplicationDocument(jobId, "cv", cvFile));
          }
          if (coverLetterFile) {
            uploads.push(
              uploadJobApplicationDocument(jobId, "coverLetter", coverLetterFile)
            );
          }

          if (uploads.length > 0) {
            const uploadResults = await Promise.allSettled(uploads);
            let uploadFailed = false;
            for (const uploadResult of uploadResults) {
              if (uploadResult.status === "rejected") {
                uploadFailed = true;
                console.error("Failed to upload document:", uploadResult.reason);
              }
            }
            if (uploadFailed) {
              alert("Application saved, but one or more PDF uploads failed.");
            }
          }
        }

        setFormData(getInitialFormData());
        setCvFile(null);
        setCoverLetterFile(null);
        setFileInputResetKey((prev) => prev + 1);
        setOpen(false);
        router.refresh();
        onCreated?.();
      } else {
        console.error("Failed to create job: ", result.error);
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full mb-4 justify-start text-muted-foreground border-dashed border-2 hover:border-solid hover:bg-muted/50"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Job Application</DialogTitle>
          <DialogDescription>Track a new job application</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  required
                  value={formData.company ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position *</Label>
                <Input
                  id="position"
                  required
                  value={formData.position ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Salary</Label>
                <Input
                  id="salary"
                  placeholder="e.g., $100k - $150k"
                  value={formData.salary ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, salary: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cvVersion">CV Version</Label>
                <Input
                  id="cvVersion"
                  placeholder="e.g., v3, Product-focused"
                  value={formData.cvVersion ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, cvVersion: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverLetterVersion">Cover Letter Version</Label>
                <Input
                  id="coverLetterVersion"
                  placeholder="e.g., v2, Fintech template"
                  value={formData.coverLetterVersion ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, coverLetterVersion: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobUrl">Job URL</Label>
              <Input
                id="jobUrl"
                type="url"
                placeholder="https://..."
                value={formData.jobUrl ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, jobUrl: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="React, Tailwind, High Pay"
                value={formData.tags ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Brief description of the role..."
                value={formData.description ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={4}
                value={formData.notes ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cvPdf">CV PDF</Label>
                <Input
                  key={`cv-upload-${fileInputResetKey}`}
                  id="cvPdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-zinc-500">
                  {cvFile ? `Selected: ${cvFile.name}` : "Optional. Upload PDF only (max 5MB)."}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverLetterPdf">Cover Letter PDF</Label>
                <Input
                  key={`cover-upload-${fileInputResetKey}`}
                  id="coverLetterPdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setCoverLetterFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-zinc-500">
                  {coverLetterFile
                    ? `Selected: ${coverLetterFile.name}`
                    : "Optional. Upload PDF only (max 5MB)."}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custom Fields</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomField}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Field
                </Button>
              </div>
              {(formData.customFields || []).length === 0 ? (
                <p className="text-xs text-zinc-500">
                  Add fields like Referral Name or Commute Time.
                </p>
              ) : (
                <div className="space-y-2">
                  {(formData.customFields || []).map((field, index) => (
                    <div key={`custom-field-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <Input
                        placeholder="Field name"
                        value={field.key ?? ""}
                        onChange={(e) => updateCustomField(index, "key", e.target.value)}
                      />
                      <Input
                        placeholder="Value"
                        value={field.value ?? ""}
                        onChange={(e) => updateCustomField(index, "value", e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomField(index)}
                        aria-label="Remove custom field"
                      >
                        <Trash2 className="h-4 w-4 text-zinc-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Application</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
