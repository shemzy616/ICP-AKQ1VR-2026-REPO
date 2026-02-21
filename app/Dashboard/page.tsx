import { getSession } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import KanbanBoard from "@/components/kanban-board";
import { Board } from "@/lib/models";
import initializeUserBoard from "@/lib/innit-user-board";
import { Suspense } from "react";
import Link from "next/link";

async function getBoard(userId: string) {

    'use cache'
    await connectDB();

    const boardDoc = await Board.findOne({
        userId: userId,
        name: "My Job Applications",
    }).populate({
        path: "columns",
        populate: { path: "JobApplications" },
    });

    if (!boardDoc) return null;

    const board = JSON.parse(JSON.stringify(boardDoc));
    const normalizedBoard = {
        ...board,
        columns: (board.columns || []).map((column: { JobApplications?: unknown[] }) => ({
            ...column,
            jobApplications: column.JobApplications || [],
        })),
    };

    return normalizedBoard;
}

async function DashboardPage() {
    const session = await getSession();
    if (!session?.user) {
        redirect("/sign-in");
    }

    let board = await getBoard(session.user.id);
    if (!board) {
        await initializeUserBoard(session.user.id);
        board = await getBoard(session.user.id);
    }

    if (!board) {
        return (
            <div className="min-h-screen bg-white">
                <div className="container mx-auto p-6">
                    <h1 className="text-3xl font-bold">
                        Welcome to your Dashboard, {session.user.name}!
                    </h1>
                    <p className="text-gray-600">
                        We could not load your board. Please refresh and try
                        again.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="container mx-auto p-6">
                <div className="mb-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold">
                                Welcome to your Dashboard, {session.user.name}!
                            </h1>
                            <p className="text-gray-600">
                                This is where you can manage your job applications.
                            </p>
                        </div>
                        <Link
                            href="/Dashboard/stats"
                            className="inline-flex items-center border border-zinc-200 px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-100"
                        >
                            View Stats
                        </Link>
                    </div>
                </div>
                <KanbanBoard board={JSON.parse(JSON.stringify(board))} />
            </div>
        </div>
    );

}

export default async function DashboardPageWrapper() {
    return (
        <Suspense fallback={<p>Loading...</p>}>
    <DashboardPage/>
    </Suspense>)
}
