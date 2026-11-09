import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import { storage } from "@/lib/storage";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionData = await getSession();
    if (!sessionData?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = sessionData.user.id;
    const body = await req.json();

    const updatedApp = storage.updateJobApplication(id, userId, body);
    if (!updatedApp) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ application: updatedApp });
  } catch (error: any) {
    console.error("Error updating application:", error);
    return NextResponse.json(
      { error: "server_error", message: error.message || "Failed to update application" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionData = await getSession();
    if (!sessionData?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = sessionData.user.id;

    const success = storage.deleteJobApplication(id, userId);
    if (!success) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Error deleting application:", error);
    return NextResponse.json(
      { error: "server_error", message: error.message || "Failed to delete application" },
      { status: 500 }
    );
  }
}
