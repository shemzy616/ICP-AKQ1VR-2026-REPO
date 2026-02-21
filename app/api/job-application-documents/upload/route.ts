import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import connectDB from "@/lib/db";
import { JobApplication, JobApplicationDocument } from "@/lib/models";

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;

type JobDocumentKind = "cv" | "coverLetter";

function isValidKind(value: string): value is JobDocumentKind {
  return value === "cv" || value === "coverLetter";
}

function getApplicationUpdateForKind(kind: JobDocumentKind, documentId: string, fileName: string) {
  if (kind === "cv") {
    return {
      cvDocumentId: documentId,
      cvFileName: fileName,
    };
  }

  return {
    coverLetterDocumentId: documentId,
    coverLetterFileName: fileName,
  };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const jobApplicationId = (formData.get("jobApplicationId") || "").toString();
  const kindValue = (formData.get("kind") || "").toString();
  const file = formData.get("file");

  if (!jobApplicationId || !isValidKind(kindValue)) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const fileName = file.name || "document.pdf";
  const isPdfByType = file.type === "application/pdf";
  const isPdfByName = fileName.toLowerCase().endsWith(".pdf");

  if (!isPdfByType && !isPdfByName) {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    return NextResponse.json(
      { error: "PDF is too large. Max size is 5MB." },
      { status: 400 }
    );
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

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const jobDocument = await JobApplicationDocument.findOneAndUpdate(
    {
      jobApplicationId,
      userId: session.user.id,
      kind: kindValue,
    },
    {
      $set: {
        fileName,
        contentType: "application/pdf",
        size: file.size,
        data: fileBuffer,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).select("_id fileName size updatedAt");

  await JobApplication.findByIdAndUpdate(jobApplicationId, {
    $set: getApplicationUpdateForKind(
      kindValue,
      jobDocument._id.toString(),
      fileName
    ),
  });

  revalidatePath("/Dashboard");

  return NextResponse.json({
    data: {
      id: jobDocument._id.toString(),
      kind: kindValue,
      fileName: jobDocument.fileName,
      size: jobDocument.size,
      updatedAt: jobDocument.updatedAt,
    },
  });
}
