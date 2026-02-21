"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "../auth/auth";
import connectDB from "../db";
import { Board, Column, JobApplication, JobApplicationDocument } from "../models";

interface CustomFieldInput {
  key: string;
  value: string;
}

interface JobApplicationData {
  company: string;
  position: string;
  location?: string;
  cvVersion?: string;
  coverLetterVersion?: string;
  notes?: string;
  salary?: string;
  jobUrl?: string;
  columnId: string;
  boardId: string;
  tags?: string[];
  description?: string;
  customFields?: CustomFieldInput[];
}

/* --- Added strict interface for updates --- */
interface JobUpdateFields {
  company?: string;
  position?: string;
  location?: string;
  cvVersion?: string;
  coverLetterVersion?: string;
  notes?: string;
  salary?: string;
  jobUrl?: string;
  columnId?: string;
  order?: number;
  tags?: string[];
  description?: string;
  customFields?: CustomFieldInput[];
}

function normalizeCustomFields(customFields?: CustomFieldInput[]) {
  if (!customFields || !Array.isArray(customFields)) {
    return [];
  }

  return customFields
    .map((field) => ({
      key: (field.key || "").trim(),
      value: (field.value || "").trim(),
    }))
    .filter((field) => field.key.length > 0);
}

export async function createJobApplication(data: JobApplicationData) {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  await connectDB();

  const {
    company,
    position,
    location,
    cvVersion,
    coverLetterVersion,
    notes,
    salary,
    jobUrl,
    columnId,
    boardId,
    tags,
    description,
    customFields,
  } = data;

  if (!company || !position || !columnId || !boardId) {
    return { error: "Missing required fields" };
  }

  // Verify board ownership
  const board = await Board.findOne({
    _id: boardId,
    userId: session.user.id,
  });

  if (!board) {
    return { error: "Board not found" };
  }

  const column = await Column.findOne({
    _id: columnId,
    boardId: boardId,
  });

  if (!column) {
    return { error: "Column not found" };
  }

  const maxOrder = (await JobApplication.findOne({ columnId })
    .sort({ order: -1 })
    .select("order")
    .lean()) as { order: number } | null;

  const jobApplication = await JobApplication.create({
    company,
    position,
    location,
    cvVersion,
    coverLetterVersion,
    notes,
    salary,
    jobUrl,
    columnId,
    boardId,
    userId: session.user.id,
    tags: tags || [],
    description,
    customFields: normalizeCustomFields(customFields),
    status: "applied",
    order: maxOrder ? maxOrder.order + 100 : 0,
  });

  await Column.findByIdAndUpdate(columnId, {
    $push: { JobApplications: jobApplication._id },
  });

  revalidatePath("/Dashboard");

  return { data: JSON.parse(JSON.stringify(jobApplication)) };
}

export async function updateJobApplication(
  id: string,
  updates: JobUpdateFields
) {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  await connectDB();

  const jobApplication = await JobApplication.findById(id);

  if (!jobApplication) {
    return { error: "Job application not found" };
  }

  if (jobApplication.userId !== session.user.id) {
    return { error: "Unauthorized" };
  }

  const { columnId, order, ...otherUpdates } = updates;
  
  /* --- FIX: Replaced 'any' with the specific interface --- */
  const updatesToApply: JobUpdateFields = { ...otherUpdates };
  if (otherUpdates.customFields !== undefined) {
    updatesToApply.customFields = normalizeCustomFields(otherUpdates.customFields);
  }

  const currentColumnId = jobApplication.columnId.toString();
  const newColumnId = columnId?.toString();

  const isMovingToDifferentColumn = newColumnId && newColumnId !== currentColumnId;

  if (isMovingToDifferentColumn) {
    // 1. Remove from old column array
    await Column.findByIdAndUpdate(currentColumnId, {
      $pull: { JobApplications: id },
    });

    // 2. Calculate new order in target column
    const jobsInTargetColumn = await JobApplication.find({
      columnId: newColumnId,
      _id: { $ne: id },
    })
      .sort({ order: 1 })
      .lean();

    let newOrderValue: number;

    if (order !== undefined && order !== null) {
      newOrderValue = order * 100;
      const jobsThatNeedToShift = jobsInTargetColumn.slice(order);
      
      /* --- Typed the 'job' variable to satisfy the linter --- */
      for (const job of (jobsThatNeedToShift as { _id: string; order: number }[])) {
        await JobApplication.findByIdAndUpdate(job._id, {
          $set: { order: job.order + 100 },
        });
      }
    } else {
      const lastJob = jobsInTargetColumn[jobsInTargetColumn.length - 1] as { order: number } | undefined;
      newOrderValue = lastJob ? (lastJob.order || 0) + 100 : 0;
    }

    updatesToApply.columnId = newColumnId;
    updatesToApply.order = newOrderValue;

    // 3. Add to new column array
    await Column.findByIdAndUpdate(newColumnId, {
      $push: { JobApplications: id },
    });
  } else if (order !== undefined && order !== null) {
    // Logic for reordering within the same column
    updatesToApply.order = order * 100;
  }

  const updated = await JobApplication.findByIdAndUpdate(id, updatesToApply, {
    new: true,
  });

  revalidatePath("/Dashboard");

  return { data: JSON.parse(JSON.stringify(updated)) };
}

export async function deleteJobApplication(id: string) {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  await connectDB();

  const jobApplication = await JobApplication.findById(id);

  if (!jobApplication) {
    return { error: "Job application not found" };
  }

  if (jobApplication.userId !== session.user.id) {
    return { error: "Unauthorized" };
  }

  // Remove reference from Column
  await Column.findByIdAndUpdate(jobApplication.columnId, {
    $pull: { JobApplications: id },
  });

  // Remove uploaded documents for this application
  await JobApplicationDocument.deleteMany({
    jobApplicationId: jobApplication._id,
    userId: session.user.id,
  });

  // Delete the actual application
  await JobApplication.deleteOne({ _id: id });

  revalidatePath("/Dashboard");

  return { success: true };
}
