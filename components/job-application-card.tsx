'use client';

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Column, CustomField, JobApplication } from "@/lib/models/models.types";
import { 
    Plus,
    Edit2, 
    ExternalLink, 
    MoreVertical, 
    Trash2, 
    ArrowRight 
} from "lucide-react";

import { Card, CardContent } from "./ui/card";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";

import { updateJobApplication, deleteJobApplication } from "@/lib/actions/job-application";
import {
    deleteJobApplicationDocument,
    getJobApplicationDocumentManifest,
    uploadJobApplicationDocument,
} from "@/lib/client/job-documents";

/* --- 1. Define the Update Type --- */
interface JobUpdatePayload {
    company?: string;
    position?: string;
    location?: string;
    cvVersion?: string;
    coverLetterVersion?: string;
    salary?: string;
    jobUrl?: string;
    tags?: string[];
    description?: string;
    notes?: string;
    customFields?: CustomField[];
    columnId?: string;
}

interface JobApplicationCardProps {
    jobApplication: JobApplication;
    columns: Column[];
}

interface JobDocumentSummary {
    id: string;
    fileName: string;
    size: number;
    updatedAt: string;
}

export default function JobApplicationCard({ jobApplication, columns }: JobApplicationCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [editOpen, setEditOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
    const [fileInputResetKey, setFileInputResetKey] = useState(0);
    const [manifestLoading, setManifestLoading] = useState(false);
    const [documentManifest, setDocumentManifest] = useState<{
        cv: JobDocumentSummary | null;
        coverLetter: JobDocumentSummary | null;
    }>({
        cv: jobApplication.cvDocumentId
            ? {
                id: jobApplication.cvDocumentId,
                fileName: jobApplication.cvFileName || "CV.pdf",
                size: 0,
                updatedAt: "",
            }
            : null,
        coverLetter: jobApplication.coverLetterDocumentId
            ? {
                id: jobApplication.coverLetterDocumentId,
                fileName: jobApplication.coverLetterFileName || "CoverLetter.pdf",
                size: 0,
                updatedAt: "",
            }
            : null,
    });
    const descriptionPreview = jobApplication.description?.trim() || "";
    const truncatedDescription =
        descriptionPreview.length > 110
            ? `${descriptionPreview.slice(0, 110)}...`
            : descriptionPreview;
    const previewTags = (jobApplication.tags || []).slice(0, 2);
    const hiddenTagCount = (jobApplication.tags || []).length - previewTags.length;
    const [formData, setFormData] = useState({
        company: jobApplication.company,
        position: jobApplication.position,
        location: jobApplication.location || "",
        cvVersion: jobApplication.cvVersion || "",
        coverLetterVersion: jobApplication.coverLetterVersion || "",
        salary: jobApplication.salary || "",
        jobUrl: jobApplication.jobUrl || "",
        tags: jobApplication.tags?.join(", ") || "",
        description: jobApplication.description || "",
        notes: jobApplication.notes || "",
        customFields: (jobApplication.customFields || []).map((field) => ({
            key: field.key || "",
            value: field.value || "",
        })),
    });
    const detailsCustomFields = formData.customFields
        .map((field) => ({
            key: field.key.trim(),
            value: field.value.trim(),
        }))
        .filter((field) => field.key.length > 0);
    const hasCvDocument = Boolean(documentManifest.cv);
    const hasCoverLetterDocument = Boolean(documentManifest.coverLetter);
    const cvFileName = documentManifest.cv?.fileName || jobApplication.cvFileName;
    const coverLetterFileName =
        documentManifest.coverLetter?.fileName || jobApplication.coverLetterFileName;

    const resetDocumentInputState = () => {
        setCvFile(null);
        setCoverLetterFile(null);
        setFileInputResetKey((prev) => prev + 1);
    };

    useEffect(() => {
        if (!detailsOpen && !editOpen) {
            return;
        }

        let mounted = true;
        const loadManifest = async () => {
            try {
                setManifestLoading(true);
                const manifest = await getJobApplicationDocumentManifest(jobApplication._id);
                if (!mounted) {
                    return;
                }
                setDocumentManifest({
                    cv: manifest.cv,
                    coverLetter: manifest.coverLetter,
                });
            } catch (error) {
                console.error("Failed to load document manifest:", error);
            } finally {
                if (mounted) {
                    setManifestLoading(false);
                }
            }
        };

        void loadManifest();

        return () => {
            mounted = false;
        };
    }, [detailsOpen, editOpen, jobApplication._id]);

    /* --- 2. Corrected Function Signature --- */
    const processUpdate = async (data: JobUpdatePayload) => {
        startTransition(async () => {
            try {
                await updateJobApplication(jobApplication._id, data);
                setEditOpen(false);
                router.refresh();
            } catch (error) {
                console.error("Failed to update application:", error);
            }
        });
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Ensure tags are an array to match JobUpdatePayload
        const processedData: JobUpdatePayload = {
            ...formData,
            tags: formData.tags.split(",").map(t => t.trim()).filter(t => t.length > 0),
            customFields: formData.customFields
                .map((field) => ({
                    key: field.key.trim(),
                    value: field.value.trim(),
                }))
                .filter((field) => field.key.length > 0),
        };
        startTransition(async () => {
            try {
                await updateJobApplication(jobApplication._id, processedData);

                const uploads: Promise<unknown>[] = [];
                if (cvFile) {
                    uploads.push(uploadJobApplicationDocument(jobApplication._id, "cv", cvFile));
                }
                if (coverLetterFile) {
                    uploads.push(uploadJobApplicationDocument(jobApplication._id, "coverLetter", coverLetterFile));
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
                        alert("Application updated, but one or more PDF uploads failed.");
                    }
                }

                const manifest = await getJobApplicationDocumentManifest(jobApplication._id);
                setDocumentManifest({
                    cv: manifest.cv,
                    coverLetter: manifest.coverLetter,
                });

                resetDocumentInputState();
                setEditOpen(false);
                router.refresh();
            } catch (error) {
                console.error("Failed to update application:", error);
            }
        });
    };

    const addCustomField = () => {
        setFormData((prev) => ({
            ...prev,
            customFields: [...prev.customFields, { key: "", value: "" }],
        }));
    };

    const updateCustomField = (
        index: number,
        field: keyof CustomField,
        value: string
    ) => {
        setFormData((prev) => ({
            ...prev,
            customFields: prev.customFields.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item
            ),
        }));
    };

    const removeCustomField = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            customFields: prev.customFields.filter((_, itemIndex) => itemIndex !== index),
        }));
    };

    const handleMove = (newColumnId: string) => {
        processUpdate({ columnId: newColumnId });
    };

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this application?")) {
            startTransition(async () => {
                try {
                    await deleteJobApplication(jobApplication._id);
                    router.refresh();
                } catch (error) {
                    console.error("Failed to delete application:", error);
                }
            });
        }
    };

    const handleRemoveDocument = (kind: "cv" | "coverLetter") => {
        startTransition(async () => {
            try {
                await deleteJobApplicationDocument(jobApplication._id, kind);
                const manifest = await getJobApplicationDocumentManifest(jobApplication._id);
                setDocumentManifest({
                    cv: manifest.cv,
                    coverLetter: manifest.coverLetter,
                });
                resetDocumentInputState();
                router.refresh();
            } catch (error) {
                console.error("Failed to delete document:", error);
            }
        });
    };

    return (
        <>
            <Card className={`group relative mb-2 border border-zinc-200 bg-white shadow-sm transition-all hover:border-zinc-300 hover:shadow-md ${isPending ? 'opacity-50' : ''}`}>
                <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => setDetailsOpen(true)}
                            className="flex-1 space-y-1.5 text-left"
                        >
                            <div>
                                <h3 className="text-[15px] font-bold leading-tight text-zinc-900">{jobApplication.position}</h3>
                                <p className="text-xs font-medium text-zinc-500">{jobApplication.company}</p>
                            </div>

                            {descriptionPreview && (
                                <p className="text-xs leading-relaxed text-zinc-400 break-words">
                                    {truncatedDescription}
                                </p>
                            )}

                            {previewTags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {previewTags.map((tag, key) => (
                                        <span key={key} className="inline-flex items-center rounded-full border border-zinc-100 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
                                            {tag}
                                        </span>
                                    ))}
                                    {hiddenTagCount > 0 && (
                                        <span className="inline-flex items-center rounded-full border border-zinc-100 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                                            +{hiddenTagCount}
                                        </span>
                                    )}
                                </div>
                            )}
                        </button>

                        <div
                            className="flex flex-col items-end justify-between gap-1"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-7 w-7 text-zinc-300 hover:bg-zinc-100 hover:text-black">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 border-zinc-200">
                                    <DropdownMenuLabel className="text-xs text-zinc-400">Manage</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setEditOpen(true)} className="cursor-pointer">
                                        <Edit2 className="mr-2 h-4 w-4 text-zinc-500" /> Edit Details
                                    </DropdownMenuItem>
                                    
                                    {columns.length > 1 && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel className="text-xs text-zinc-400">Move to...</DropdownMenuLabel>
                                            {columns.filter(c => c._id !== jobApplication.columnId).map((col) => (
                                                <DropdownMenuItem key={col._id} onClick={() => handleMove(col._id)} className="cursor-pointer">
                                                    <ArrowRight className="mr-2 h-4 w-4 text-zinc-400" /> {col.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {jobApplication.jobUrl && (
                                <a target="_blank" rel="noopener noreferrer" href={jobApplication.jobUrl} className="mt-2 text-zinc-300 transition-colors hover:text-black">
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto border-zinc-200 shadow-2xl sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold tracking-tight">{jobApplication.position}</DialogTitle>
                        <DialogDescription className="text-zinc-700">{jobApplication.company}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase text-zinc-700">Location</p>
                                <p className="text-zinc-900">{jobApplication.location || "Not specified"}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase text-zinc-700">Salary</p>
                                <p className="text-zinc-900">{jobApplication.salary || "Not specified"}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase text-zinc-700">CV Version</p>
                                <p className="text-zinc-900">{jobApplication.cvVersion || "Not specified"}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase text-zinc-700">Cover Letter Version</p>
                                <p className="text-zinc-900">{jobApplication.coverLetterVersion || "Not specified"}</p>
                            </div>
                        </div>

                        {jobApplication.description && (
                            <div>
                                <p className="mb-1 text-xs font-semibold uppercase text-zinc-700">Description</p>
                                <p className="whitespace-pre-wrap break-words text-zinc-700">{jobApplication.description}</p>
                            </div>
                        )}

                        {jobApplication.notes && (
                            <div>
                                <p className="mb-1 text-xs font-semibold uppercase text-zinc-700">Notes</p>
                                <p className="whitespace-pre-wrap break-words text-zinc-700">{jobApplication.notes}</p>
                            </div>
                        )}

                        {jobApplication.tags && jobApplication.tags.length > 0 && (
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase text-zinc-700">Tags</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {jobApplication.tags.map((tag, key) => (
                                        <span key={key} className="inline-flex items-center rounded-full border border-zinc-100 bg-zinc-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {detailsCustomFields.length > 0 && (
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase text-zinc-700">Custom Fields</p>
                                <div className="space-y-1.5">
                                    {detailsCustomFields.map((field, index) => (
                                        <div key={`details-custom-${index}`} className="grid grid-cols-[140px_1fr] gap-3">
                                            <p className="text-xs font-semibold uppercase text-zinc-600 break-words">{field.key}</p>
                                            <p className="text-zinc-700 break-words">{field.value || "Not specified"}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {jobApplication.jobUrl && (
                            <div>
                                <p className="mb-1 text-xs font-semibold uppercase text-zinc-700">Job Link</p>
                                <a
                                    href={jobApplication.jobUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-zinc-700 underline underline-offset-4 hover:text-black"
                                >
                                    Open Listing
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>
                        )}
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase text-zinc-700">Documents</p>
                            <div className="space-y-2">
                                <div className="grid grid-cols-[140px_1fr] gap-3">
                                    <p className="text-xs font-semibold uppercase text-zinc-600">CV</p>
                                    {hasCvDocument ? (
                                        <a
                                            href={`/api/job-application-documents/${jobApplication._id}/cv`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-zinc-700 underline underline-offset-4 hover:text-black"
                                        >
                                            {cvFileName || "Open CV PDF"}
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    ) : (
                                        <p className="text-zinc-500">{manifestLoading ? "Checking..." : "Not uploaded"}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-[140px_1fr] gap-3">
                                    <p className="text-xs font-semibold uppercase text-zinc-600">Cover Letter</p>
                                    {hasCoverLetterDocument ? (
                                        <a
                                            href={`/api/job-application-documents/${jobApplication._id}/coverLetter`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-zinc-700 underline underline-offset-4 hover:text-black"
                                        >
                                            {coverLetterFileName || "Open Cover Letter PDF"}
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    ) : (
                                        <p className="text-zinc-500">{manifestLoading ? "Checking..." : "Not uploaded"}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setDetailsOpen(false);
                                setEditOpen(true);
                            }}
                        >
                            Edit
                        </Button>
                        <Button type="button" onClick={() => setDetailsOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={editOpen}
                onOpenChange={(nextOpen) => {
                    setEditOpen(nextOpen);
                    if (!nextOpen) {
                        resetDocumentInputState();
                    }
                }}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto border-zinc-200 shadow-2xl sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold tracking-tight">Edit Application</DialogTitle>
                        <DialogDescription className="text-zinc-500">Update details for {jobApplication.position} at {jobApplication.company}.</DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={handleFormSubmit}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="company" className="text-xs font-bold uppercase text-zinc-500">Company</Label>
                                <Input id="company" required value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="border-zinc-200 focus:ring-black" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="position" className="text-xs font-bold uppercase text-zinc-500">Position</Label>
                                <Input id="position" required value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="border-zinc-200 focus:ring-black" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="location" className="text-xs font-bold uppercase text-zinc-500">Location</Label>
                                <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="border-zinc-200 focus:ring-black" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="salary" className="text-xs font-bold uppercase text-zinc-500">Salary</Label>
                                <Input id="salary" placeholder="$100k - $150k" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} className="border-zinc-200 focus:ring-black" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="cvVersion" className="text-xs font-bold uppercase text-zinc-500">CV Version</Label>
                                <Input id="cvVersion" value={formData.cvVersion} onChange={(e) => setFormData({ ...formData, cvVersion: e.target.value })} className="border-zinc-200 focus:ring-black" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="coverLetterVersion" className="text-xs font-bold uppercase text-zinc-500">Cover Letter Version</Label>
                                <Input id="coverLetterVersion" value={formData.coverLetterVersion} onChange={(e) => setFormData({ ...formData, coverLetterVersion: e.target.value })} className="border-zinc-200 focus:ring-black" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="jobUrl" className="text-xs font-bold uppercase text-zinc-500">Job URL</Label>
                            <Input id="jobUrl" type="url" placeholder="https://..." value={formData.jobUrl} onChange={(e) => setFormData({ ...formData, jobUrl: e.target.value })} className="border-zinc-200 focus:ring-black" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="tags" className="text-xs font-bold uppercase text-zinc-500">Tags (comma-separated)</Label>
                            <Input id="tags" placeholder="Remote, Hybrid" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="border-zinc-200 focus:ring-black" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="description" className="text-xs font-bold uppercase text-zinc-500">Description</Label>
                            <Textarea id="description" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="border-zinc-200 focus:ring-black resize-none" />
                        </div>
                        <div className="space-y-2 border-t border-zinc-100 pt-3">
                            <Label className="text-xs font-bold uppercase text-zinc-500">PDF Documents</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="editCvPdf" className="text-xs font-bold uppercase text-zinc-500">CV PDF</Label>
                                    <Input
                                        key={`edit-cv-file-${fileInputResetKey}`}
                                        id="editCvPdf"
                                        type="file"
                                        accept="application/pdf,.pdf"
                                        onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                                        className="border-zinc-200 focus:ring-black"
                                    />
                                    <div className="text-xs text-zinc-500">
                                        {cvFile
                                            ? `Ready to upload: ${cvFile.name}`
                                            : cvFileName
                                                ? `Current: ${cvFileName}`
                                                : "No CV uploaded"}
                                    </div>
                                    {hasCvDocument && !cvFile && (
                                        <div className="flex gap-2">
                                            <a
                                                href={`/api/job-application-documents/${jobApplication._id}/cv`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs underline underline-offset-4 hover:text-black"
                                            >
                                                Open
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveDocument("cv")}
                                                className="text-xs text-red-600 underline underline-offset-4 hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="editCoverLetterPdf" className="text-xs font-bold uppercase text-zinc-500">Cover Letter PDF</Label>
                                    <Input
                                        key={`edit-cover-file-${fileInputResetKey}`}
                                        id="editCoverLetterPdf"
                                        type="file"
                                        accept="application/pdf,.pdf"
                                        onChange={(e) => setCoverLetterFile(e.target.files?.[0] || null)}
                                        className="border-zinc-200 focus:ring-black"
                                    />
                                    <div className="text-xs text-zinc-500">
                                        {coverLetterFile
                                            ? `Ready to upload: ${coverLetterFile.name}`
                                            : coverLetterFileName
                                                ? `Current: ${coverLetterFileName}`
                                                : "No cover letter uploaded"}
                                    </div>
                                    {hasCoverLetterDocument && !coverLetterFile && (
                                        <div className="flex gap-2">
                                            <a
                                                href={`/api/job-application-documents/${jobApplication._id}/coverLetter`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs underline underline-offset-4 hover:text-black"
                                            >
                                                Open
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveDocument("coverLetter")}
                                                className="text-xs text-red-600 underline underline-offset-4 hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-zinc-500">
                                {manifestLoading ? "Checking existing uploads..." : "PDF uploads are optional. Max file size is 5MB."}
                            </p>
                        </div>
                        <div className="space-y-2 border-t border-zinc-100 pt-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase text-zinc-500">Custom Fields</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    Add Field
                                </Button>
                            </div>
                            {formData.customFields.length === 0 ? (
                                <p className="text-xs text-zinc-500">No custom fields yet.</p>
                            ) : (
                                <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                                    {formData.customFields.map((field, index) => (
                                        <div key={`edit-custom-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                            <Input
                                                placeholder="Field name"
                                                value={field.key}
                                                onChange={(e) => updateCustomField(index, "key", e.target.value)}
                                                className="border-zinc-200 focus:ring-black"
                                            />
                                            <Input
                                                placeholder="Value"
                                                value={field.value}
                                                onChange={(e) => updateCustomField(index, "value", e.target.value)}
                                                className="border-zinc-200 focus:ring-black"
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
                        <DialogFooter className="sticky bottom-0 border-t border-zinc-100 bg-white pt-4 pb-1">
                            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} className="text-zinc-500 hover:text-black">Cancel</Button>
                            <Button type="submit" disabled={isPending} className="bg-zinc-600 text-white hover:bg-zinc-500 px-8">
                                {isPending ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
