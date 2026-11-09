"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ColumnItem, JobApplicationItem } from "./types";
import { ApplicationCard } from "./application-card";

interface KanbanColumnProps {
  column: ColumnItem;
  columns: ColumnItem[];
  applications: JobApplicationItem[];
  onAddClick: (columnId: string) => void;
  onEditApp: (app: JobApplicationItem) => void;
  onDeleteApp: (appId: string) => void;
  onMoveColumn: (appId: string, targetColId: string) => void;
  onDragStart: (e: React.DragEvent, app: JobApplicationItem) => void;
  onDropApp: (targetColId: string) => void;
  onViewDetails?: (app: JobApplicationItem) => void;
  onFollowUpClick?: (app: JobApplicationItem) => void;
  onArchiveToggle?: (appId: string, isArchived: boolean) => void;
}

// Stage accent colors
const STAGE_COLORS: Record<string, { dot: string; badge: string }> = {
  wishlist: { dot: "bg-purple-500", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  applied: { dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  interviewing: { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  offered: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 border-rose-200" },
};

function getStageStyle(name: string) {
  const lower = name.toLowerCase();
  for (const key of Object.keys(STAGE_COLORS)) {
    if (lower.includes(key)) return STAGE_COLORS[key];
  }
  return { dot: "bg-zinc-500", badge: "bg-zinc-50 text-zinc-700 border-zinc-200" };
}

export function KanbanColumn({
  column,
  columns,
  applications,
  onAddClick,
  onEditApp,
  onDeleteApp,
  onMoveColumn,
  onDragStart,
  onDropApp,
  onViewDetails,
  onFollowUpClick,
  onArchiveToggle,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const style = getStageStyle(column.name);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDropApp(column._id);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col rounded-2xl border transition-all duration-150 min-w-[280px] w-full max-w-[340px] shrink-0 bg-zinc-50/70 p-3 ${
        isDragOver
          ? "border-black/50 bg-zinc-100 ring-2 ring-black/10 scale-[1.01]"
          : "border-zinc-200/80"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 pt-1 px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
          <h3 className="font-semibold text-sm text-zinc-900 tracking-tight">
            {column.name}
          </h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${style.badge}`}
          >
            {applications.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onAddClick(column._id)}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-black hover:bg-black hover:text-white"
          title={`Add application to ${column.name}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cards List / Drop Target */}
      <div className="flex-1 space-y-2.5 overflow-y-auto min-h-[300px] max-h-[calc(100vh-280px)] pr-0.5">
        {applications.length === 0 ? (
          <div
            onClick={() => onAddClick(column._id)}
            className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 p-4 text-center transition-colors hover:border-zinc-500 hover:bg-white/80"
          >
            <Plus className="h-5 w-5 text-zinc-400 mb-1" />
            <p className="text-xs font-medium text-zinc-500">No applications</p>
            <p className="text-[11px] text-zinc-400">Drop here or click +</p>
          </div>
        ) : (
          applications.map((app) => (
            <ApplicationCard
              key={app._id}
              application={app}
              columns={columns}
              onEdit={onEditApp}
              onDelete={onDeleteApp}
              onMoveColumn={onMoveColumn}
              onDragStart={onDragStart}
              onViewDetails={onViewDetails}
              onFollowUpClick={onFollowUpClick}
              onArchiveToggle={onArchiveToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
