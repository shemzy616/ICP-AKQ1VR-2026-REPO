import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import { storage } from "@/lib/storage";

export async function POST(req: Request) {
  try {
    const sessionData = await getSession();
    if (!sessionData?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessionData.user.id;
    const body = await req.json();
    const { appIds, updates } = body;

    if (!Array.isArray(appIds) || appIds.length === 0) {
      return NextResponse.json(
        { error: "appIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "updates object is required" },
        { status: 400 }
      );
    }

    const result = storage.bulkUpdateApplications(userId, appIds, updates);

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
      updatedApplications: result.updatedApplications,
    });
  } catch (error: any) {
    console.error("Error in POST /api/applications/bulk:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update applications" },
      { status: 500 }
    );
  }
}
