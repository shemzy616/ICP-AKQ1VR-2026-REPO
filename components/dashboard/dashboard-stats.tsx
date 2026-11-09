"use client";

import { Briefcase, Send, Users, Trophy, Ghost, Clock, Sparkles } from "lucide-react";
import { ColumnItem } from "./types";
import { calculatePipelineGhostingStats } from "@/lib/pipeline-radar";

interface DashboardStatsProps {
  columns: ColumnItem[];
  onOpenDeclutter?: () => void;
}

export function DashboardStats({ columns, onOpenDeclutter }: DashboardStatsProps) {
  // Aggregate stage counts
  let total = 0;
  let applied = 0;
  let interviewing = 0;
  let offered = 0;
  let rejected = 0;

  columns.forEach((col) => {
    for (const app of col.JobApplications || []) {
      if (app.isArchived) continue;
      total += 1;
      const lower = col.name.toLowerCase();
      if (lower.includes("interview")) interviewing += 1;
      else if (lower.includes("offer")) offered += 1;
      else if (lower.includes("reject")) rejected += 1;
      else if (lower.includes("applied")) applied += 1;
    }
  });

  const radarStats = calculatePipelineGhostingStats(columns);

  const stats = [
    {
      title: "Active Pipeline",
      value: total,
      icon: Briefcase,
      badge: "In Progress",
      badgeColor: "bg-zinc-100 text-zinc-700 border-zinc-200",
    },
    {
      title: "Applications Sent",
      value: applied,
      icon: Send,
      badge: radarStats.followupsDueCount > 0 ? `⚡ ${radarStats.followupsDueCount} Due` : "Applied",
      badgeColor:
        radarStats.followupsDueCount > 0
          ? "bg-amber-50 text-amber-800 border-amber-300 font-bold"
          : "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      title: "Interviews",
      value: interviewing,
      icon: Users,
      badge: "Active",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      title: "Offers",
      value: offered,
      icon: Trophy,
      badge: "Success",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
  ];

  return (
    <div className="space-y-3 mb-6">
      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs transition-all hover:border-zinc-300"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {stat.title}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-zinc-900">
                  {stat.value}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${stat.badgeColor}`}
                >
                  {stat.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ghosting & Declutter Banner if Stale Cards Exist */}
      {radarStats.staleApplications.length > 0 && onOpenDeclutter && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-purple-200/80 bg-purple-50/50 p-3 px-4 text-xs shadow-2xs">
          <div className="flex items-center gap-2 text-purple-900">
            <Ghost className="h-4 w-4 text-purple-600 shrink-0" />
            <span>
              <strong>Ghosting Radar:</strong> Detected{" "}
              <strong>{radarStats.staleApplications.length} stale applications</strong> (&gt;28 days without callback).
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenDeclutter}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-700 shadow-2xs transition-all active:scale-95"
          >
            <span>Clean & Declutter Board</span>
          </button>
        </div>
      )}
    </div>
  );
}
