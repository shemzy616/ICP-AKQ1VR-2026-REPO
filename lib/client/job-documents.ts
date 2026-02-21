export type JobDocumentKind = "cv" | "coverLetter";

interface JobDocumentSummary {
  id: string;
  fileName: string;
  size: number;
  updatedAt: string;
}

interface UploadJobDocumentResponse {
  data?: {
    id: string;
    kind: JobDocumentKind;
    fileName: string;
    size: number;
    updatedAt: string;
  };
  error?: string;
}

interface DeleteJobDocumentResponse {
  success?: boolean;
  error?: string;
}

interface JobDocumentManifestResponse {
  data?: {
    cv: JobDocumentSummary | null;
    coverLetter: JobDocumentSummary | null;
  };
  error?: string;
}

export async function uploadJobApplicationDocument(
  jobApplicationId: string,
  kind: JobDocumentKind,
  file: File
) {
  const formData = new FormData();
  formData.append("jobApplicationId", jobApplicationId);
  formData.append("kind", kind);
  formData.append("file", file);

  const response = await fetch("/api/job-application-documents/upload", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as UploadJobDocumentResponse;
  if (!response.ok || payload.error) {
    throw new Error(payload.error || "Failed to upload document");
  }

  return payload.data;
}

export async function deleteJobApplicationDocument(
  jobApplicationId: string,
  kind: JobDocumentKind
) {
  const response = await fetch(
    `/api/job-application-documents/${jobApplicationId}/${kind}`,
    {
      method: "DELETE",
    }
  );

  const payload = (await response.json()) as DeleteJobDocumentResponse;
  if (!response.ok || payload.error) {
    throw new Error(payload.error || "Failed to delete document");
  }

  return payload.success === true;
}

export async function getJobApplicationDocumentManifest(jobApplicationId: string) {
  const response = await fetch(`/api/job-application-documents/${jobApplicationId}`, {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json()) as JobDocumentManifestResponse;
  if (!response.ok || payload.error) {
    throw new Error(payload.error || "Failed to load document manifest");
  }

  return payload.data || { cv: null, coverLetter: null };
}
