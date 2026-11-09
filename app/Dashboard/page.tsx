"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth/auth-client";
import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { ColumnItem } from "@/components/dashboard/types";
import { DEMO_COLUMNS } from "@/components/dashboard/mock-data";
import { Loader2, Sparkles, LogIn, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: session, isPending: isSessionLoading } = useSession();
  const [columns, setColumns] = useState<ColumnItem[]>(DEMO_COLUMNS);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(true);

  const fetchBoard = useCallback(async () => {
    if (!session?.user?.id) {
      setColumns(DEMO_COLUMNS);
      setIsDemoMode(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/board");
      if (res.ok) {
        const data = await res.json();
        if (data.columns && data.columns.length > 0) {
          setColumns(data.columns);
          setIsDemoMode(false);
        } else {
          setColumns(DEMO_COLUMNS);
          setIsDemoMode(false);
        }
      } else {
        setColumns(DEMO_COLUMNS);
        setIsDemoMode(true);
      }
    } catch (err: any) {
      console.warn("Could not fetch board, using demo mode:", err);
      setColumns(DEMO_COLUMNS);
      setIsDemoMode(true);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!isSessionLoading) {
      fetchBoard();
    }
  }, [isSessionLoading, fetchBoard]);

  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/40 text-zinc-950 font-sans selection:bg-black selection:text-white">
      {/* Top Banner for Unauthenticated Visitors */}
      {!session?.user && (
        <div className="bg-gradient-to-r from-zinc-900 via-black to-zinc-900 text-white px-4 py-2.5 shadow-sm">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                <strong>Demo Mode Active:</strong> You are exploring with sample applications. Sign up to save your personal pipeline.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button asChild size="sm" variant="outline" className="h-7 text-xs bg-white/10 text-white border-white/20 hover:bg-white hover:text-black">
                <Link href="/sign-in">
                  <LogIn className="h-3 w-3 mr-1" /> Log in
                </Link>
              </Button>
              <Button asChild size="sm" className="h-7 text-xs bg-white text-black hover:bg-zinc-200">
                <Link href="/sign-up">
                  Sign up free <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">
              {userName ? `Welcome back, ${userName} 👋` : "Job Application Pipeline"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Organize, track, and manage your job applications across every stage of the hiring process.
            </p>
          </div>
        </div>

        {/* Loading State or Kanban Board */}
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            <p className="text-xs font-medium text-zinc-500">Loading your board...</p>
          </div>
        ) : (
          <KanbanBoard
            initialColumns={columns}
            isDemoMode={isDemoMode}
            onRefresh={fetchBoard}
          />
        )}
      </main>
    </div>
  );
}
