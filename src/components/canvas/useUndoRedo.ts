import { useState } from 'react';

export function useUndoRedo<T>(initialState: T) {
    const [past, setPast] = useState<T[]>([]);
    const [present, setPresent] = useState<T>(initialState);
    const [future, setFuture] = useState<T[]>([]);

    const updateState = (newState: T) => {
        setPast([...past, present]);
        setPresent(newState);
        setFuture([]);
    };

    const undo = () => {
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        setFuture([present, ...future]);
        setPresent(previous);
        setPast(newPast);
    };

    const redo = () => {
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);
        setPast([...past, present]);
        setPresent(next);
        setFuture(newFuture);
    };

    return {
        state: present,
        updateState,
        undo,
        redo,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
    };
}