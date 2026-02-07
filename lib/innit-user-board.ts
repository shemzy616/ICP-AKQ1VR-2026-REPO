import connectDB from "./db";
import { Board, Column } from "./models";

const DEFAULT_COLUMNS = [
    { name: "Wishlist", order: 0 },
    { name: "Applied", order: 1 },
    { name: "Interviewing", order: 2 },
    { name: "Offered", order: 3 },
    { name: "Rejected", order: 4 },
];

export default async function initializeUserBoard(userId: string) {
    try {
        await connectDB();
        const existingBoard = await Board.findOne({
            userId,
            name: "My Job Applications",
        });
        if (existingBoard) {
            return existingBoard;
        }

        // create the board
        const board = await Board.create({
            name: "My Job Applications",
            userId,
            columns: [],
        });

        // create default columns
        const columns = await Promise.all(
            DEFAULT_COLUMNS.map((col) =>
                Column.create({
                    name: col.name,
                    order: col.order,
                    boardId: board._id,
                    JobApplications: [],
                })
            )
        );

        // update the board with the created columns
        board.columns = columns.map((col) => col._id);
        await board.save();
        return board;
    } catch (error) {
        throw error;
    }
}
