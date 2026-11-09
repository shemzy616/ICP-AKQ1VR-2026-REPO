import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { storage, StoredUser, StoredSession } from "@/lib/storage";

export const SESSION_COOKIE_NAME = "job_tracker_session";

export interface SessionData {
  user: {
    id: string;
    email: string;
    name: string;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: string;
  };
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const result = storage.getSessionByToken(token);
    if (!result) return null;

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      session: {
        id: result.session.id,
        userId: result.session.userId,
        expiresAt: result.session.expiresAt,
      },
    };
  } catch (error) {
    console.error("Error retrieving session:", error);
    return null;
  }
}

export async function signOut() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      storage.deleteSession(token);
      cookieStore.delete(SESSION_COOKIE_NAME);
    }
  } catch (error) {
    console.error("Error signing out:", error);
  }
  redirect("/sign-in");
}
