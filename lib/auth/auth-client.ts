"use client";

import { useEffect, useState, useCallback } from "react";

export interface UserSession {
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

let sessionListeners: Array<() => void> = [];

function notifySessionChange() {
  sessionListeners.forEach((fn) => fn());
}

export function useSession() {
  const [data, setData] = useState<UserSession | null>(null);
  const [isPending, setIsPending] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const json = await res.json();
        setData(json.user ? json : null);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setIsPending(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
    sessionListeners.push(fetchSession);
    return () => {
      sessionListeners = sessionListeners.filter((fn) => fn !== fetchSession);
    };
  }, [fetchSession]);

  return { data, isPending, refetch: fetchSession };
}

export const authClient = {
  signIn: {
    email: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
      callbackURL?: string;
    }) => {
      try {
        const res = await fetch("/api/auth/sign-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: { message: data.error || "Failed to sign in" }, data: null };
        }
        notifySessionChange();
        return { data, error: null };
      } catch (err: any) {
        return { error: { message: err.message || "Failed to sign in" }, data: null };
      }
    },
  },

  signUp: {
    email: async ({
      email,
      password,
      name,
    }: {
      email: string;
      password: string;
      name: string;
    }) => {
      try {
        const res = await fetch("/api/auth/sign-up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: { message: data.error || "Failed to create account" }, data: null };
        }
        notifySessionChange();
        return { data, error: null };
      } catch (err: any) {
        return { error: { message: err.message || "Failed to create account" }, data: null };
      }
    },
  },

  signOut: async () => {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
      notifySessionChange();
      return { success: true };
    } catch {
      return { success: false };
    }
  },
};

export const { signIn, signUp, signOut } = authClient;
