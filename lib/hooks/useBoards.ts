'use client';

import { useState, useEffect } from "react";
import { Board } from "../models/models.types";

export function UseBoard(initialBoard?: Board | null) {
    const [board, setBoard] = useState<Board | null>(initialBoard || null);
    const [columns, setColumns] = useState(board?.columns || []);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialBoard) {
            setBoard(initialBoard);
            setColumns(initialBoard.columns);
        }
    }, [initialBoard]);

    async function moveJob(jobApplicationId: string, newColumnId: string, newOrder: number) {
        // Function body
    }

    return { board, columns, error, setBoard, setColumns, setError, moveJob };
}