import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import connectDB from "@/lib/db";
import { JobApplication, JobApplicationDocument } from "@/lib/models";

type JobDocumentKind = "cv" | "coverLetter";

function isValidKind(value: string): value is JobDocumentKind {
  return value === "cv" || value === "coverLetter";
}

function getDocumentFieldNames(kind: JobDocumentKind) {
  if (kind === "cv") {
    return {
      idField: "cvDocumentId",
      fileNameField: "cvFileName",
    };
  }

  return {
    idField: "coverLetterDocumentId",
    fileNameField: "coverLetterFileName",
  };
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[\r\n"]/g, "_");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobApplicationId: string; kind: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobApplicationId, kind } = await context.params;
  if (!jobApplicationId || !isValidKind(kind)) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  await connectDB();

  const jobApplication = await JobApplication.findById(jobApplicationId)
    .select("_id userId cvFileName coverLetterFileName")
    .lean();

  if (!jobApplication) {
    return NextResponse.json({ error: "Job application not found" }, { status: 404 });
  }

  if (jobApplication.userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const document = await JobApplicationDocument.findOne({
    jobApplicationId,
    userId: session.user.id,
    kind,
  }).select("+data fileName contentType size");

  if (!document?.data) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const safeFileName = sanitizeFileName(
    document.fileName ||
      (kind === "cv" ? jobApplication.cvFileName : jobApplication.coverLetterFileName) ||
      `${kind}.pdf`
  );

  return new NextResponse(document.data, {
    status: 200,
    headers: {
      "Content-Type": document.contentType || "application/pdf",
      "Content-Disposition": `inline; filename="${safeFileName}"`,
      "Content-Length": String(document.size || document.data.length),
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ jobApplicationId: string; kind: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobApplicationId, kind } = await context.params;
  if (!jobApplicationId || !isValidKind(kind)) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  await connectDB();

  const { idField, fileNameField } = getDocumentFieldNames(kind);

  const jobApplication = await JobApplication.findById(jobApplicationId)
    .select("_id userId")
    .lean();

  if (!jobApplication) {
    return NextResponse.json({ error: "Job application not found" }, { status: 404 });
  }

  if (jobApplication.userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await JobApplicationDocument.deleteOne({
    jobApplicationId,
    userId: session.user.id,
    kind,
  });

  await JobApplication.findByIdAndUpdate(jobApplicationId, {
    $unset: {
      [idField]: "",
      [fileNameField]: "",
    },
  });

  revalidatePath("/Dashboard");

  return NextResponse.json({ success: true });
}
