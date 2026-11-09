"use client";

import React from "react";
import {
  MoreVertical,
  MapPin,
  DollarSign,
  Calendar,
  ExternalLink,
  Pencil,
  Trash2,
  ArrowRightCircle,
  FileText,
  User,
  Clock,
  Archive,
  Send,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JobApplicationItem, ColumnItem } from "./types";
import { getApplicationAgeStatus } from "@/lib/pipeline-radar";

interface ApplicationCardProps {
  application: JobApplicationItem;
  columns: ColumnItem[];
  onEdit: (app: JobApplicationItem) => void;
  onDelete: (appId: string) => void;
  onMoveColumn: (appId: string, targetColId: string) => void;
  onDragStart: (e: React.DragEvent, app: JobApplicationItem) => void;
  onViewDetails?: (app: JobApplicationItem) => void;
  onFollowUpClick?: (app: JobApplicationItem) => void;
  onArchiveToggle?: (appId: string, isArchived: boolean) => void;
}

export function ApplicationCard({
  application,
  columns,
  onEdit,
  onDelete,
  onMoveColumn,
  onDragStart,
  onViewDetails,
  onFollowUpClick,
  onArchiveToggle,
}: ApplicationCardProps) {
  const formattedSalary =
    application.salaryText ||
    (application.salary
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(application.salary)
      : null);

  const formattedDate = application.appliedDate
    ? new Date(application.appliedDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const ageStatus = getApplicationAgeStatus(application);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, application)}
      onClick={() => onViewDetails?.(application)}
      className="group relative cursor-pointer rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-xs transition-all hover:border-zinc-400 hover:shadow-md active:cursor-grabbing"
    >
      {/* Header: Company & Action menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-zinc-900 truncate text-sm">
            {application.company}
          </span>
          {application.jobUrl && (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-zinc-400 hover:text-black transition-colors"
              title="Open job link"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded p-1 text-zinc-400 opacity-60 hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-800 transition-all focus:outline-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 text-xs">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails?.(application);
              }}
            >
              <FileText className="h-3.5 w-3.5 mr-2" /> View Role Spec
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit(application);
              }}
            >
              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Details
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onFollowUpClick?.(application);
              }}
            >
              <Clock className="h-3.5 w-3.5 mr-2 text-amber-600" /> Draft Follow-up Note
            </DropdownMenuItem>

            {onArchiveToggle && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onArchiveToggle(application._id, !application.isArchived);
                }}
              >
                <Archive className="h-3.5 w-3.5 mr-2 text-zinc-500" />
                {application.isArchived ? "Unarchive Card" : "Archive Card"}
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] text-zinc-400 uppercase tracking-wider">
              Move to Stage
            </DropdownMenuLabel>
            {columns.map((col) => {
              if (col._id === application.columnId) return null;
              return (
                <DropdownMenuItem
                  key={col._id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveColumn(application._id, col._id);
                  }}
                  className="gap-2"
                >
                  <ArrowRightCircle className="h-3.5 w-3.5 text-zinc-400" />
                  {col.name}
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(application._id);
              }}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Position */}
      <p className="mt-0.5 text-xs font-medium text-zinc-600 truncate">
        {application.position}
      </p>

      {/* ATS Match & Pipeline Radar Freshness Badges */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {application.fitAnalysis && application.fitAnalysis.score !== undefined && (
          <div
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border transition-colors ${
              application.fitAnalysis.score >= 75
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : application.fitAnalysis.score >= 50
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
            title={
              application.fitAnalysis.missingSkills?.length
                ? `Missing skills: ${application.fitAnalysis.missingSkills.join(", ")}`
                : "Strong keyword match against Master Resume"
            }
          >
            <span>🎯 {application.fitAnalysis.score}% ATS</span>
            {application.fitAnalysis.missingSkills && application.fitAnalysis.missingSkills.length > 0 ? (
              <span className="text-[10px] font-normal opacity-75">
                ({application.fitAnalysis.missingSkills.length})
              </span>
            ) : (
              <span className="text-[10px] font-normal text-emerald-600">✓</span>
            )}
          </div>
        )}

        {/* Pipeline Radar Age / Follow-up / Ghosting Badge */}
        {ageStatus.stage === "followup_due" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFollowUpClick?.(application);
            }}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer ${ageStatus.pillClass}`}
            title="Click to view tailored follow-up note"
          >
            <span>{ageStatus.label}</span>
          </button>
        ) : (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border ${ageStatus.pillClass}`}
            title={ageStatus.subtext}
          >
            {ageStatus.label}
          </span>
        )}
      </div>

      {/* Badges: Salary, Location, Date */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
        {formattedSalary && (
          <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-800">
            <DollarSign className="h-3 w-3 text-emerald-600" />
            {formattedSalary}
          </span>
        )}

        {application.location && (
          <span className="inline-flex items-center gap-1 truncate max-w-[120px]">
            <MapPin className="h-3 w-3 shrink-0 text-zinc-400" />
            <span className="truncate">{application.location}</span>
          </span>
        )}

        {formattedDate && (
          <span className="inline-flex items-center gap-1 text-zinc-400">
            <Calendar className="h-3 w-3 shrink-0" />
            {formattedDate}
          </span>
        )}
      </div>

      {/* Structured Info Pill: Responsibilities Count / Recruiter */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {application.responsibilities && application.responsibilities.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
            <FileText className="h-3 w-3" />
            {application.responsibilities.length} duties
          </span>
        )}

        {application.requirements && application.requirements.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
            ✓ {application.requirements.length} reqs
          </span>
        )}

        {application.recruiterContact && (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200 truncate max-w-[130px]">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{application.recruiterContact}</span>
          </span>
        )}
      </div>

      {/* Tags */}
      {application.tags && application.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {application.tags.map((tag, i) => (
            <span
              key={i}
              className="rounded-full bg-zinc-50 border border-zinc-200/70 px-2 py-0.2 text-[10px] text-zinc-600 font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Notes / Duties Preview */}
      {application.notes && (
        <p className="mt-2 text-[11px] text-zinc-500 line-clamp-2 italic bg-zinc-50/60 rounded p-1.5 border border-zinc-100">
          "{application.notes}"
        </p>
      )}
    </div>
  );
}
