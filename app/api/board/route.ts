import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import { storage } from "@/lib/storage";

export async function GET() {
  try {
    const sessionData = await getSession();
    if (!sessionData?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const boardData = storage.getBoardWithColumnsAndApps(sessionData.user.id);
    return NextResponse.json(boardData);
  } catch (error: any) {
    console.error("Error in /api/board:", error);
    return NextResponse.json(
      { error: "server_error", message: error.message || "Failed to load board" },
      { status: 500 }
    );
  }
}
