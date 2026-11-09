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
    const {
      company,
      position,
      columnId,
      status,
      notes,
      location,
      salary,
      salaryText,
      responsibilities,
      requirements,
      recruiterContact,
      jobUrl,
      appliedDate,
      tags,
      description,
    } = body;

    if (!company || !position) {
      return NextResponse.json(
        { error: "Company and Position are required" },
        { status: 400 }
      );
    }

    const newApp = storage.createJobApplication(userId, {
      company,
      position,
      columnId,
      status,
      notes,
      location,
      salary,
      salaryText,
      responsibilities,
      requirements,
      recruiterContact,
      jobUrl,
      appliedDate,
      tags,
      description,
    });

    return NextResponse.json({ application: newApp }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating application:", error);
    return NextResponse.json(
      { error: "server_error", message: error.message || "Failed to create application" },
      { status: 500 }
    );
  }
}
