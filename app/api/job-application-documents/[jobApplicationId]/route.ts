import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import connectDB from "@/lib/db";
import { JobApplication, JobApplicationDocument } from "@/lib/models";

type JobDocumentKind = "cv" | "coverLetter";

type DocumentSummary = {
  id: string;
  fileName: string;
  size: number;
  updatedAt: string;
};

function toDocumentSummary(document: {
  _id: { toString: () => string };
  fileName?: string;
  size?: number;
  updatedAt?: Date | string;
}): DocumentSummary {
  return {
    id: document._id.toString(),
    fileName: document.fileName || "document.pdf",
    size: Number(document.size || 0),
    updatedAt: new Date(document.updatedAt || Date.now()).toISOString(),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobApplicationId: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobApplicationId } = await context.params;
  if (!jobApplicationId) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  await connectDB();

  const jobApplication = await JobApplication.findById(jobApplicationId)
    .select("_id userId")
    .lean();

  if (!jobApplication) {
    return NextResponse.json({ error: "Job application not found" }, { status: 404 });
  }

  if (jobApplication.userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documentsRaw = await JobApplicationDocument.find({
    jobApplicationId,
    userId: session.user.id,
  })
    .select("_id kind fileName size updatedAt")
    .lean();

  const cvDocumentRaw = documentsRaw.find((doc) => doc.kind === "cv");
  const coverLetterDocumentRaw = documentsRaw.find(
    (doc) => doc.kind === "coverLetter"
  );

  const cv = cvDocumentRaw ? toDocumentSummary(cvDocumentRaw) : null;
  const coverLetter = coverLetterDocumentRaw
    ? toDocumentSummary(coverLetterDocumentRaw)
    : null;

  return NextResponse.json({
    data: {
      cv,
      coverLetter,
    } as Record<JobDocumentKind, DocumentSummary | null>,
  });
}
