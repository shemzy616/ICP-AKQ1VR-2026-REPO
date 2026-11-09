import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { storage } from "@/lib/storage";
import { SESSION_COOKIE_NAME, getSession } from "@/lib/auth/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ all: string[] }> }
) {
  const { all } = await params;
  const endpoint = all.join("/");

  if (endpoint === "session" || endpoint === "get-session") {
    const sessionData = await getSession();
    return NextResponse.json(sessionData || { user: null, session: null });
  }

  return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ all: string[] }> }
) {
  const { all } = await params;
  const endpoint = all.join("/");

  try {
    // --- SIGN UP ---
    if (endpoint === "sign-up" || endpoint === "sign-up/email") {
      const body = await req.json();
      const { email, password, name } = body;

      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password are required" },
          { status: 400 }
        );
      }

      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters long" },
          { status: 400 }
        );
      }

      const existingUser = storage.getUserByEmail(email);
      if (existingUser) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }

      const user = storage.createUser(email, password, name || "");
      const session = storage.createSession(user.id);

      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      return NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name },
        session: { id: session.id, userId: session.userId, expiresAt: session.expiresAt },
      });
    }

    // --- SIGN IN ---
    if (endpoint === "sign-in" || endpoint === "sign-in/email") {
      const body = await req.json();
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password are required" },
          { status: 400 }
        );
      }

      const user = storage.getUserByEmail(email);
      if (!user) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      const isValid = storage.verifyPassword(user, password);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      const session = storage.createSession(user.id);

      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });

      return NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name },
        session: { id: session.id, userId: session.userId, expiresAt: session.expiresAt },
      });
    }

    // --- SIGN OUT ---
    if (endpoint === "sign-out") {
      const cookieStore = await cookies();
      const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      if (token) {
        storage.deleteSession(token);
        cookieStore.delete(SESSION_COOKIE_NAME);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  } catch (error: any) {
    console.error(`Auth error in ${endpoint}:`, error);
    return NextResponse.json(
      { error: error.message || "Authentication error" },
      { status: 500 }
    );
  }
}
