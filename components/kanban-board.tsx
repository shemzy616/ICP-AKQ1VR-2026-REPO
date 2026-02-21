'use client'

import { type DragEvent, type ReactNode, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Board, Column, JobApplication } from "@/lib/models/models.types";
import {
    Award,
    Calendar,
    CheckCircle,
    Mic,
    MoreVertical,
    Search,
    Trash2,
    X,
    XCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";

import CreateJobApplicationDialog from "@/components/create-job-dialogue";
import JobApplicationCard from "./job-application-card";
import { UseBoard } from "@/lib/hooks/useBoards";
import { clearColumnApplications, deleteColumn } from "@/lib/actions/column";
import { updateJobApplication } from "@/lib/actions/job-application";

interface KanbanBoardProps {
    board: Board;
}

interface ColConfig {
    icon: ReactNode;
    color: string;
}

interface DragItem {
    jobId: string;
    sourceColumnId: string;
}

interface DropTarget {
    columnId: string;
    index: number;
}

const COLUMN_MIN_WIDTH = 280;
const COLUMN_MAX_WIDTH = 760;

const COLUMN_CONFIG: Array<ColConfig> = [
    { color: 'bg-cyan-500', icon: <Calendar className='h-4 w-4' /> },
    { color: 'bg-purple-500', icon: <CheckCircle className='h-4 w-4' /> },
    { color: 'bg-green-500', icon: <Mic className='h-4 w-4' /> },
    { color: 'bg-yellow-500', icon: <Award className='h-4 w-4' /> },
    { color: 'bg-red-500', icon: <XCircle className='h-4 w-4' /> },
];

function sortJobs(jobs: JobApplication[] = []) {
    return [...jobs].sort((a, b) => a.order - b.order);
}

function getSearchableText(job: JobApplication) {
    const customFieldText = (job.customFields || [])
        .map((field) => `${field.key || ""} ${field.value || ""}`)
        .join(" ");

    return [
        job.company || "",
        job.position || "",
        job.description || "",
        job.notes || "",
        job.location || "",
        job.salary || "",
        job.cvVersion || "",
        job.coverLetterVersion || "",
        job.cvFileName || "",
        job.coverLetterFileName || "",
        job.jobUrl || "",
        (job.tags || []).join(" "),
        customFieldText,
    ]
        .join(" ")
        .toLowerCase();
}

function matchesSearch(job: JobApplication, query: string) {
    const searchableText = getSearchableText(job);
    const tokens = query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

    return tokens.every((token) => searchableText.includes(token));
}

function moveJobLocally(
    columns: Column[],
    dragItem: DragItem,
    destinationColumnId: string,
    destinationIndex: number
) {
    const nextColumns = columns.map((col) => ({
        ...col,
        jobApplications: sortJobs(col.jobApplications),
    }));

    const sourceColumn = nextColumns.find((col) => col._id === dragItem.sourceColumnId);
    const destinationColumn = nextColumns.find((col) => col._id === destinationColumnId);
    if (!sourceColumn || !destinationColumn) {
        return null;
    }

    const sourceIndex = sourceColumn.jobApplications.findIndex((job) => job._id === dragItem.jobId);
    if (sourceIndex === -1) {
        return null;
    }

    const isSameColumn = sourceColumn._id === destinationColumn._id;
    let insertIndex = destinationIndex;
    if (isSameColumn && sourceIndex < destinationIndex) {
        insertIndex -= 1;
    }

    const [movedJob] = sourceColumn.jobApplications.splice(sourceIndex, 1);
    const boundedIndex = Math.max(0, Math.min(insertIndex, destinationColumn.jobApplications.length));
    destinationColumn.jobApplications.splice(boundedIndex, 0, {
        ...movedJob,
        columnId: destinationColumn._id,
    });

    if (isSameColumn) {
        sourceColumn.jobApplications = sourceColumn.jobApplications.map((job, index) => ({
            ...job,
            columnId: sourceColumn._id,
            order: index * 100,
        }));
    } else {
        sourceColumn.jobApplications = sourceColumn.jobApplications.map((job, index) => ({
            ...job,
            columnId: sourceColumn._id,
            order: index * 100,
        }));
        destinationColumn.jobApplications = destinationColumn.jobApplications.map((job, index) => ({
            ...job,
            columnId: destinationColumn._id,
            order: index * 100,
        }));
    }

    return {
        finalIndex: boundedIndex,
        isSameColumn,
        nextColumns,
    };
}

function DroppableColumn({
    column,
    config,
    boardId,
    sortedColumns,
    dragItem,
    dropTarget,
    onDragStart,
    onDragEnd,
    onDragOverTarget,
    onDropOnTarget,
    columnWidth,
    onResizeStart,
    isSearchActive,
}: {
    column: Column;
    config: ColConfig;
    boardId: string;
    sortedColumns: Column[];
    dragItem: DragItem | null;
    dropTarget: DropTarget | null;
    onDragStart: (event: DragEvent<HTMLDivElement>, jobId: string, sourceColumnId: string) => void;
    onDragEnd: () => void;
    onDragOverTarget: (event: DragEvent<HTMLDivElement>, columnId: string, index: number) => void;
    onDropOnTarget: (event: DragEvent<HTMLDivElement>, columnId: string, index: number) => void;
    columnWidth?: number;
    onResizeStart: (columnId: string, startX: number, startWidth: number) => void;
    isSearchActive: boolean;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const sortedJobApplications = sortJobs(column.jobApplications);

    const handleClearColumn = () => {
        if (!confirm(`Clear all applications in "${column.name}"?`)) {
            return;
        }

        startTransition(async () => {
            const result = await clearColumnApplications(column._id, boardId);
            if (result?.error) {
                console.error("Failed to clear column:", result.error);
                return;
            }
            router.refresh();
        });
    };

    const handleDeleteColumn = () => {
        if (!confirm(`Delete "${column.name}" and all applications in it?`)) {
            return;
        }

        startTransition(async () => {
            const result = await deleteColumn(column._id, boardId);
            if (result?.error) {
                console.error("Failed to delete column:", result.error);
                return;
            }
            router.refresh();
        });
    };

    return (
        <Card
            className="relative min-w-[300px] flex-shrink-0 shadow-md p-0"
            style={columnWidth ? { width: `${columnWidth}px` } : undefined}
        >
            <CardHeader className={`${config.color} text-white rounded-t-lg pb-3 pt-3`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {config.icon}
                        <CardTitle className='text-white text-base font-semibold'>
                            {column.name}
                        </CardTitle>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-white hover:bg-white/20">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={handleClearColumn} disabled={isPending}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Clear Applications
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={handleDeleteColumn} variant="destructive" disabled={isPending}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Column
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent
                className="space-y-2 pt-4 bg-gray-50/50 min-h-[400px] rounded-b-lg"
                onDragOver={(event) => {
                    if (isSearchActive) {
                        return;
                    }
                    onDragOverTarget(event, column._id, sortedJobApplications.length);
                }}
                onDrop={(event) => {
                    if (isSearchActive) {
                        return;
                    }
                    onDropOnTarget(event, column._id, sortedJobApplications.length);
                }}
            >
                {sortedJobApplications.map((app, index) => (
                    <div key={app._id} className="space-y-1">
                        <div
                            className={`h-2 rounded transition-colors ${
                                dropTarget?.columnId === column._id && dropTarget.index === index
                                    ? "bg-black/40"
                                    : "bg-transparent"
                            }`}
                            onDragOver={(event) => {
                                if (isSearchActive) {
                                    return;
                                }
                                onDragOverTarget(event, column._id, index);
                            }}
                            onDrop={(event) => {
                                if (isSearchActive) {
                                    return;
                                }
                                onDropOnTarget(event, column._id, index);
                            }}
                        />
                        <div
                            draggable={!isSearchActive}
                            onDragStart={(event) => {
                                if (isSearchActive) {
                                    return;
                                }
                                onDragStart(event, app._id, column._id);
                            }}
                            onDragEnd={onDragEnd}
                            onDragOver={(event) => {
                                if (!dragItem || isSearchActive) {
                                    return;
                                }

                                event.preventDefault();
                                const rect = event.currentTarget.getBoundingClientRect();
                                const dropIndex = event.clientY > rect.top + rect.height / 2 ? index + 1 : index;
                                onDragOverTarget(event, column._id, dropIndex);
                            }}
                            onDrop={(event) => {
                                if (!dragItem || isSearchActive) {
                                    return;
                                }

                                event.preventDefault();
                                const rect = event.currentTarget.getBoundingClientRect();
                                const dropIndex = event.clientY > rect.top + rect.height / 2 ? index + 1 : index;
                                onDropOnTarget(event, column._id, dropIndex);
                            }}
                            className={`${isSearchActive ? "cursor-default" : "cursor-grab active:cursor-grabbing"} ${
                                dragItem?.jobId === app._id ? "opacity-60" : ""
                            }`}
                        >
                            <JobCard
                                jobApplication={app}
                                columns={sortedColumns}
                            />
                        </div>
                    </div>
                ))}
                <div
                    className={`h-2 rounded transition-colors ${
                        dropTarget?.columnId === column._id && dropTarget.index === sortedJobApplications.length
                            ? "bg-black/40"
                            : "bg-transparent"
                    }`}
                    onDragOver={(event) => {
                        if (isSearchActive) {
                            return;
                        }
                        onDragOverTarget(event, column._id, sortedJobApplications.length);
                    }}
                    onDrop={(event) => {
                        if (isSearchActive) {
                            return;
                        }
                        onDropOnTarget(event, column._id, sortedJobApplications.length);
                    }}
                />
                <CreateJobApplicationDialog columnId={column._id} boardId={boardId} />
            </CardContent>
            <button
                type="button"
                aria-label={`Resize ${column.name} column`}
                title="Drag to resize column"
                onMouseDown={(event) => {
                    event.preventDefault();
                    onResizeStart(column._id, event.clientX, columnWidth ?? 300);
                }}
                className="absolute right-0 top-12 bottom-0 w-2 cursor-col-resize rounded-r-lg hover:bg-black/10"
            />
        </Card>
    );
}

function JobCard({
    jobApplication,
    columns
}: {
    jobApplication: JobApplication;
    columns: Column[];
}) {
    return (
        <div>
            <JobApplicationCard jobApplication={jobApplication} columns={columns} />
        </div>
    );
}

export default function KanbanBoard({ board }: KanbanBoardProps) {
    const router = useRouter();
    const [isMoving, startMoveTransition] = useTransition();
    const { columns, setColumns } = UseBoard(board);
    const [dragItem, setDragItem] = useState<DragItem | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [searchQuery, setSearchQuery] = useState("");
    const sortedColumns = [...(columns || [])].sort((a, b) => a.order - b.order);
    const widthStorageKey = `kanban-column-widths:${board._id}`;
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const isSearchActive = normalizedQuery.length > 0;

    const displayColumns = sortedColumns.map((col) => ({
        ...col,
        jobApplications: isSearchActive
            ? sortJobs(col.jobApplications).filter((job) => matchesSearch(job, normalizedQuery))
            : sortJobs(col.jobApplications),
    }));

    const totalMatches = displayColumns.reduce((acc, col) => acc + col.jobApplications.length, 0);

    useEffect(() => {
        try {
            const storedValue = localStorage.getItem(widthStorageKey);
            if (!storedValue) {
                return;
            }

            const parsed = JSON.parse(storedValue) as Record<string, unknown>;
            const nextWidths = Object.entries(parsed).reduce<Record<string, number>>((acc, [key, value]) => {
                if (typeof value !== "number" || !Number.isFinite(value)) {
                    return acc;
                }

                acc[key] = Math.max(COLUMN_MIN_WIDTH, Math.min(COLUMN_MAX_WIDTH, value));
                return acc;
            }, {});

            setColumnWidths(nextWidths);
        } catch (error) {
            console.error("Failed to load saved column widths:", error);
        }
    }, [widthStorageKey]);

    useEffect(() => {
        try {
            localStorage.setItem(widthStorageKey, JSON.stringify(columnWidths));
        } catch (error) {
            console.error("Failed to save column widths:", error);
        }
    }, [columnWidths, widthStorageKey]);

    const handleDragStart = (
        event: DragEvent<HTMLDivElement>,
        jobId: string,
        sourceColumnId: string
    ) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", jobId);
        setDragItem({ jobId, sourceColumnId });
    };

    const handleDragEnd = () => {
        setDragItem(null);
        setDropTarget(null);
    };

    const handleDragOverTarget = (
        event: DragEvent<HTMLDivElement>,
        columnId: string,
        index: number
    ) => {
        if (!dragItem || isMoving) {
            return;
        }

        event.preventDefault();
        if (dropTarget?.columnId === columnId && dropTarget.index === index) {
            return;
        }

        setDropTarget({ columnId, index });
    };

    const handleDropOnTarget = async (
        event: DragEvent<HTMLDivElement>,
        destinationColumnId: string,
        destinationIndex: number
    ) => {
        event.preventDefault();

        if (!dragItem || isMoving) {
            return;
        }

        const result = moveJobLocally(
            columns || [],
            dragItem,
            destinationColumnId,
            destinationIndex
        );

        setDropTarget(null);
        setDragItem(null);

        if (!result) {
            return;
        }

        setColumns(result.nextColumns);

        startMoveTransition(async () => {
            const payload = result.isSameColumn
                ? { order: result.finalIndex }
                : { columnId: destinationColumnId, order: result.finalIndex };

            const updateResult = await updateJobApplication(dragItem.jobId, payload);
            if (updateResult?.error) {
                console.error("Failed to move application:", updateResult.error);
            }

            router.refresh();
        });
    };

    const handleResizeStart = (columnId: string, startX: number, startWidth: number) => {
        const handleMouseMove = (event: globalThis.MouseEvent) => {
            const deltaX = event.clientX - startX;
            const nextWidth = Math.max(
                COLUMN_MIN_WIDTH,
                Math.min(COLUMN_MAX_WIDTH, startWidth + deltaX)
            );

            setColumnWidths((prev) => ({
                ...prev,
                [columnId]: nextWidth,
            }));
        };

        const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search company, title, CV/cover info, notes, tags, or custom fields..."
                        className="pl-9 pr-9"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                {isSearchActive && (
                    <p className="text-xs text-zinc-500">
                        {totalMatches} match{totalMatches === 1 ? "" : "es"}
                    </p>
                )}
            </div>
            {isSearchActive && (
                <p className="text-xs text-zinc-500">
                    Drag and drop is disabled while search is active.
                </p>
            )}

            <div className="flex gap-4 overflow-x-auto pb-4">
                {displayColumns.map((col, index) => {
                    const config = COLUMN_CONFIG[index] || {
                        color: "bg-gray-500",
                        icon: <Calendar className="h-4 w-4" />,
                    };
                    return (
                        <DroppableColumn
                            key={col._id}
                            column={col}
                            config={config}
                            boardId={board._id}
                            sortedColumns={sortedColumns}
                            dragItem={dragItem}
                            dropTarget={dropTarget}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragOverTarget={handleDragOverTarget}
                            onDropOnTarget={handleDropOnTarget}
                            columnWidth={columnWidths[col._id]}
                            onResizeStart={handleResizeStart}
                            isSearchActive={isSearchActive}
                        />
                    );
                })}
            </div>
        </div>
    );
}
