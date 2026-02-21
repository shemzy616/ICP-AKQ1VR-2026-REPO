"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "../auth/auth";
import connectDB from "../db";
import { Board, Column, JobApplication } from "../models";

async function ensureColumnAccess(columnId: string, boardId: string) {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" as const };
  }

  await connectDB();

  const board = await Board.findOne({
    _id: boardId,
    userId: session.user.id,
  }).select("_id");

  if (!board) {
    return { error: "Board not found" as const };
  }

  const column = await Column.findOne({
    _id: columnId,
    boardId,
  }).select("_id");

  if (!column) {
    return { error: "Column not found" as const };
  }

  return { board, column };
}

export async function clearColumnApplications(columnId: string, boardId: string) {
  const access = await ensureColumnAccess(columnId, boardId);
  if ("error" in access) {
    return { error: access.error };
  }

  await JobApplication.deleteMany({ columnId });
  await Column.findByIdAndUpdate(columnId, {
    $set: { JobApplications: [] },
  });

  revalidatePath("/Dashboard");
  return { success: true };
}

export async function deleteColumn(columnId: string, boardId: string) {
  const access = await ensureColumnAccess(columnId, boardId);
  if ("error" in access) {
    return { error: access.error };
  }

  const columnCount = await Column.countDocuments({ boardId });
  if (columnCount <= 1) {
    return { error: "You must keep at least one column" };
  }

  await JobApplication.deleteMany({ columnId });
  await Board.findByIdAndUpdate(boardId, {
    $pull: { columns: columnId },
  });
  await Column.deleteOne({ _id: columnId });

  revalidatePath("/Dashboard");
  return { success: true };
}
