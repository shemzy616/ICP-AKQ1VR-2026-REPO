"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Plus, Search, Filter, RefreshCw, FileText, Ghost, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColumnItem, JobApplicationItem } from "./types";
import { KanbanColumn } from "./kanban-column";
import { ApplicationModal } from "./application-modal";
import { DashboardStats } from "./dashboard-stats";
import { QuickAddBar } from "./quick-add-bar";
import { JobDetailsModal } from "./job-details-modal";
import { ResumeModal } from "./resume-modal";
import { DeclutterModal } from "./declutter-modal";
import { FollowUpModal } from "./follow-up-modal";
import { calculatePipelineGhostingStats } from "@/lib/pipeline-radar";

interface KanbanBoardProps {
  initialColumns: ColumnItem[];
  isDemoMode?: boolean;
  onRefresh?: () => void;
}

export function KanbanBoard({
  initialColumns,
  isDemoMode = false,
  onRefresh,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<ColumnItem[]>(initialColumns);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isDeclutterModalOpen, setIsDeclutterModalOpen] = useState(false);
  const [followUpApp, setFollowUpApp] = useState<JobApplicationItem | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [hasMasterResume, setHasMasterResume] = useState(false);
  const [activeColumnId, setActiveColumnId] = useState<string>("");
  const [editingApplication, setEditingApplication] = useState<JobApplicationItem | null>(null);
  const [viewingDetailsApp, setViewingDetailsApp] = useState<JobApplicationItem | null>(null);

  // Check master resume status on mount
  useEffect(() => {
    fetch("/api/resume")
      .then((res) => res.json())
      .then((data) => {
        if (data?.exists) setHasMasterResume(true);
      })
      .catch(() => {});
  }, []);

  const handleResumeSaved = (_resumeData: any, reanalyzedCount?: number) => {
    setHasMasterResume(true);
    if (reanalyzedCount && onRefresh) {
      onRefresh();
    }
  };

  // Pipeline ghosting radar stats & archived count
  const ghostingStats = useMemo(() => {
    return calculatePipelineGhostingStats(columns);
  }, [columns]);

  const archivedCount = useMemo(() => {
    let count = 0;
    columns.forEach((col) => {
      (col.JobApplications || []).forEach((app) => {
        if (app.isArchived) count++;
      });
    });
    return count;
  }, [columns]);

  const handleArchiveToggle = async (appId: string, isArchived: boolean) => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        JobApplications: col.JobApplications.map((a) =>
          a._id === appId ? { ...a, isArchived } : a
        ),
      }))
    );

    if (!isDemoMode) {
      try {
        await fetch(`/api/applications/${appId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived }),
        });
      } catch (err) {
        console.error("Archive error:", err);
      }
    }
  };

  const handleFollowUpSaved = (updatedApp: JobApplicationItem) => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        JobApplications: col.JobApplications.map((a) =>
          a._id === updatedApp._id ? updatedApp : a
        ),
      }))
    );
  };

  // Dragging state
  const [draggedApp, setDraggedApp] = useState<JobApplicationItem | null>(null);

  // Filter applications by search, stage, and archive status
  const filteredColumns = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return columns.map((col) => {
      if (selectedStageFilter !== "all" && col._id !== selectedStageFilter) {
        return { ...col, JobApplications: [] };
      }

      const stageApps = (col.JobApplications || []).filter((app) => {
        if (!showArchived && app.isArchived) return false;
        if (showArchived && !app.isArchived) return false;
        return true;
      });

      if (!q) return { ...col, JobApplications: stageApps };

      const filteredApps = stageApps.filter((app) => {
        const matchCompany = app.company.toLowerCase().includes(q);
        const matchPosition = app.position.toLowerCase().includes(q);
        const matchLocation = app.location?.toLowerCase().includes(q);
        const matchNotes = app.notes?.toLowerCase().includes(q);
        const matchTags = app.tags?.some((t) => t.toLowerCase().includes(q));
        return matchCompany || matchPosition || matchLocation || matchNotes || matchTags;
      });

      return {
        ...col,
        JobApplications: filteredApps,
      };
    });
  }, [columns, searchQuery, selectedStageFilter, showArchived]);

  // Open modal for new app in a specific column
  const handleOpenAdd = (columnId?: string) => {
    setEditingApplication(null);
    setActiveColumnId(columnId || columns[0]?._id || "");
    setIsModalOpen(true);
  };

  // Open modal for editing existing app
  const handleOpenEdit = (app: JobApplicationItem) => {
    setEditingApplication(app);
    setActiveColumnId(app.columnId);
    setIsModalOpen(true);
  };

  // Callback when a job is added via QuickAddBar
  const handleQuickApplicationCreated = (newApp: JobApplicationItem, targetColId: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col._id === targetColId
          ? { ...col, JobApplications: [newApp, ...col.JobApplications] }
          : col
      )
    );
  };

  // Save (create or update)
  const handleSaveApplication = async (data: Partial<JobApplicationItem>) => {
    if (editingApplication) {
      // Update
      const appId = editingApplication._id;
      const targetColId = data.columnId || editingApplication.columnId;

      // Optimistic update
      setColumns((prev) => {
        return prev.map((col) => {
          if (col._id === editingApplication.columnId && targetColId !== col._id) {
            return {
              ...col,
              JobApplications: col.JobApplications.filter((a) => a._id !== appId),
            };
          }
          if (col._id === targetColId && targetColId !== editingApplication.columnId) {
            const updatedApp = {
              ...editingApplication,
              ...data,
              columnId: targetColId,
              status: col.name,
            } as JobApplicationItem;
            return {
              ...col,
              JobApplications: [updatedApp, ...col.JobApplications],
            };
          }
          if (col._id === targetColId) {
            return {
              ...col,
              JobApplications: col.JobApplications.map((a) =>
                a._id === appId ? ({ ...a, ...data } as JobApplicationItem) : a
              ),
            };
          }
          return col;
        });
      });

      if (!isDemoMode) {
        try {
          const res = await fetch(`/api/applications/${appId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error("Failed to update application on server");
        } catch (err) {
          console.error("Save error:", err);
        }
      }
    } else {
      // Create new application
      const targetColId = data.columnId || activeColumnId || columns[0]?._id;
      const tempId = "temp-" + Date.now();
      const newApp: JobApplicationItem = {
        _id: tempId,
        company: data.company!,
        position: data.position!,
        status: data.status || "Applied",
        columnId: targetColId,
        boardId: columns[0]?.boardId || "default-board",
        location: data.location,
        salary: data.salary,
        jobUrl: data.jobUrl,
        appliedDate: data.appliedDate || new Date(),
        tags: data.tags || [],
        notes: data.notes,
        order: 0,
      };

      // Optimistic add
      setColumns((prev) =>
        prev.map((col) =>
          col._id === targetColId
            ? { ...col, JobApplications: [newApp, ...col.JobApplications] }
            : col
        )
      );

      if (!isDemoMode) {
        try {
          const res = await fetch("/api/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, columnId: targetColId }),
          });
          if (res.ok) {
            const result = await res.json();
            setColumns((prev) =>
              prev.map((col) => ({
                ...col,
                JobApplications: col.JobApplications.map((a) =>
                  a._id === tempId ? result.application : a
                ),
              }))
            );
          }
        } catch (err) {
          console.error("Create error:", err);
        }
      }
    }
  };

  // Move column (via drag or menu)
  const handleMoveColumn = async (appId: string, targetColId: string) => {
    let movedApp: JobApplicationItem | null = null;
    let oldColId: string | null = null;

    setColumns((prev) => {
      for (const col of prev) {
        const found = col.JobApplications.find((a) => a._id === appId);
        if (found) {
          movedApp = found;
          oldColId = col._id;
          break;
        }
      }

      if (!movedApp || oldColId === targetColId) return prev;

      const targetCol = prev.find((c) => c._id === targetColId);
      const updatedApp = {
        ...movedApp,
        columnId: targetColId,
        status: targetCol ? targetCol.name : movedApp.status,
      };

      return prev.map((col) => {
        if (col._id === oldColId) {
          return {
            ...col,
            JobApplications: col.JobApplications.filter((a) => a._id !== appId),
          };
        }
        if (col._id === targetColId) {
          return {
            ...col,
            JobApplications: [updatedApp, ...col.JobApplications],
          };
        }
        return col;
      });
    });

    if (!isDemoMode) {
      try {
        await fetch(`/api/applications/${appId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ columnId: targetColId }),
        });
      } catch (err) {
        console.error("Move error:", err);
      }
    }
  };

  // Delete
  const handleDeleteApp = async (appId: string) => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        JobApplications: col.JobApplications.filter((a) => a._id !== appId),
      }))
    );

    if (!isDemoMode) {
      try {
        await fetch(`/api/applications/${appId}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Delete error:", err);
      }
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, app: JobApplicationItem) => {
    setDraggedApp(app);
    e.dataTransfer.setData("text/plain", app._id);
  };

  const handleDropApp = (targetColId: string) => {
    if (!draggedApp) return;
    handleMoveColumn(draggedApp._id, targetColId);
    setDraggedApp(null);
  };

  return (
    <div className="space-y-6">
      {/* 1-Click Instant URL Tracker */}
      <QuickAddBar
        columns={columns}
        onApplicationCreated={handleQuickApplicationCreated}
        isDemoMode={isDemoMode}
      />

      {/* Top Stats Overview */}
      <DashboardStats
        columns={columns}
        onOpenDeclutter={() => setIsDeclutterModalOpen(true)}
      />

      {/* Filter & Action Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-xl border border-zinc-200/80 shadow-xs">
        <div className="flex flex-1 items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search by company, title, tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs sm:text-sm bg-zinc-50/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-zinc-400 hover:text-black"
              >
                Clear
              </button>
            )}
          </div>

          {/* Stage Filter */}
          <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-500">
            <Filter className="h-3.5 w-3.5 text-zinc-400 mr-1" />
            <select
              value={selectedStageFilter}
              onChange={(e) => setSelectedStageFilter(e.target.value)}
              className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 shadow-xs focus:border-black focus:outline-hidden"
            >
              <option value="all">All Stages</option>
              {columns.map((col) => (
                <option key={col._id} value={col._id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Declutter Stale Applications Button */}
          {ghostingStats.staleApplications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeclutterModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 border-purple-200 bg-purple-50 hover:bg-purple-100 shadow-2xs"
              title="Declutter stale & ghosted applications"
            >
              <Ghost className="h-3.5 w-3.5 text-purple-600" />
              <span className="hidden sm:inline">Declutter</span>
              <span className="rounded-full bg-purple-600 text-white px-1.5 py-0.2 text-[10px] font-bold">
                {ghostingStats.staleApplications.length}
              </span>
            </Button>
          )}

          {/* Show Archived Cards Toggle */}
          {archivedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived((prev) => !prev)}
              className={`h-9 gap-1.5 text-xs font-medium ${
                showArchived ? "bg-zinc-200 text-black font-semibold" : "text-zinc-500 hover:text-black"
              }`}
            >
              <Archive className="h-3.5 w-3.5 text-zinc-500" />
              <span>{showArchived ? "Active Cards" : `Archived (${archivedCount})`}</span>
            </Button>
          )}

          {/* Master Resume Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsResumeModalOpen(true)}
            className="h-9 gap-1.5 text-xs font-semibold text-zinc-700 hover:text-black border-zinc-200 bg-white hover:border-zinc-300 shadow-2xs"
            title="Manage your Master Resume & ATS Skill Index"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Master Resume</span>
            <span className="sm:hidden">Resume</span>
            {hasMasterResume && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </Button>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-9 gap-1 text-xs text-zinc-600"
              title="Refresh board data"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => handleOpenAdd()}
            className="h-9 gap-1.5 bg-black px-4 text-xs font-semibold text-white hover:bg-zinc-800 shadow-sm transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Manual Add</span>
          </Button>
        </div>
      </div>

      {/* Kanban Columns Horizontal Container */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[500px]">
        {filteredColumns.map((col) => (
          <KanbanColumn
            key={col._id}
            column={col}
            columns={columns}
            applications={col.JobApplications || []}
            onAddClick={handleOpenAdd}
            onEditApp={handleOpenEdit}
            onDeleteApp={handleDeleteApp}
            onMoveColumn={handleMoveColumn}
            onDragStart={handleDragStart}
            onDropApp={handleDropApp}
            onViewDetails={(app) => setViewingDetailsApp(app)}
            onFollowUpClick={(app) => setFollowUpApp(app)}
            onArchiveToggle={handleArchiveToggle}
          />
        ))}
      </div>

      {/* Role Spec & Full Job Details Modal */}
      <JobDetailsModal
        isOpen={!!viewingDetailsApp}
        onClose={() => setViewingDetailsApp(null)}
        application={viewingDetailsApp}
        columns={columns}
        onEdit={(app) => {
          setViewingDetailsApp(null);
          handleOpenEdit(app);
        }}
        onDelete={(appId) => {
          handleDeleteApp(appId);
          setViewingDetailsApp(null);
        }}
        onMoveColumn={(appId, colId) => {
          handleMoveColumn(appId, colId);
          if (viewingDetailsApp) {
            setViewingDetailsApp({ ...viewingDetailsApp, columnId: colId });
          }
        }}
        onOpenResumeModal={() => {
          setViewingDetailsApp(null);
          setIsResumeModalOpen(true);
        }}
        onApplicationUpdated={(updatedApp) => {
          setViewingDetailsApp(updatedApp);
          setColumns((prev) =>
            prev.map((col) => ({
              ...col,
              JobApplications: col.JobApplications.map((a) =>
                a._id === updatedApp._id ? updatedApp : a
              ),
            }))
          );
        }}
      />

      {/* Master Resume & Skills Indexer Modal */}
      <ResumeModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        onSaved={handleResumeSaved}
      />

      {/* Modal for Creating / Editing Applications */}
      <ApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveApplication}
        columns={columns}
        defaultColumnId={activeColumnId}
        initialData={editingApplication}
      />

      {/* 1-Click Board Declutter & Ghosting Cleaner Modal */}
      <DeclutterModal
        isOpen={isDeclutterModalOpen}
        onClose={() => setIsDeclutterModalOpen(false)}
        columns={columns}
        onDeclutterComplete={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* 1-Click Follow-Up Assistant Modal */}
      <FollowUpModal
        isOpen={!!followUpApp}
        onClose={() => setFollowUpApp(null)}
        application={followUpApp}
        onFollowedUpSaved={handleFollowUpSaved}
      />
    </div>
  );
}
