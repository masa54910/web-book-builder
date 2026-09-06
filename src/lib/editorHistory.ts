"use client";

import { useCallback, useEffect, useState, useRef } from "react";

export const EDITOR_HISTORY_LIMIT = 100;
export const EDITOR_HISTORY_DEBOUNCE_MS = 420;

export type EditorHistoryStacks<T> = { past: T[]; present: T; future: T[] };
export type EditorHistoryController<T> = {
  record: (next: T) => boolean;
  flush: () => boolean;
  undo: () => T | null;
  redo: () => T | null;
  reset: (next: T) => void;
  current: () => T;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

export function createEditorHistory<T>(initial: T, limit = EDITOR_HISTORY_LIMIT, areEqual: (left: T, right: T) => boolean = Object.is): EditorHistoryController<T> {
  const stacks: EditorHistoryStacks<T> = { past: [], present: initial, future: [] };
  const safeLimit = Math.max(1, Math.floor(limit));
  const record = (next: T) => {
    if (areEqual(stacks.present, next)) return false;
    stacks.past = [...stacks.past, stacks.present].slice(-safeLimit);
    stacks.present = next;
    stacks.future = [];
    return true;
  };
  const undo = () => {
    const previous = stacks.past.pop();
    if (previous === undefined) return null;
    stacks.future = [stacks.present, ...stacks.future].slice(0, safeLimit);
    stacks.present = previous;
    return previous;
  };
  const redo = () => {
    const next = stacks.future.shift();
    if (next === undefined) return null;
    stacks.past = [...stacks.past, stacks.present].slice(-safeLimit);
    stacks.present = next;
    return next;
  };
  const reset = (next: T) => { stacks.past = []; stacks.present = next; stacks.future = []; };
  return { record, flush: () => false, undo, redo, reset, current: () => stacks.present, canUndo: () => stacks.past.length > 0, canRedo: () => stacks.future.length > 0 };
}

export type UseEditorHistoryOptions<T> = { enabled?: boolean; limit?: number; debounceMs?: number; areEqual?: (left: T, right: T) => boolean };

export function useEditorHistory<T>(snapshot: T, options: UseEditorHistoryOptions<T> = {}) {
  const { enabled = true, limit = EDITOR_HISTORY_LIMIT, debounceMs = EDITOR_HISTORY_DEBOUNCE_MS, areEqual = Object.is } = options;
  const [controller] = useState(() => createEditorHistory(snapshot, limit, areEqual));
  const pendingRef = useRef<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const [version, setVersion] = useState(0);
  const clearPendingTimer = useCallback(() => {
    if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);
  const commitPending = useCallback(() => {
    clearPendingTimer();
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending === null) return false;
    const changed = controller.record(pending);
    if (changed) setVersion((current) => current + 1);
    return changed;
  }, [clearPendingTimer, controller]);
  useEffect(() => {
    if (!enabled) return;
    if (!initializedRef.current) { controller.reset(snapshot); initializedRef.current = true; return; }
    if (areEqual(snapshot, controller.current())) return;
    pendingRef.current = snapshot;
    clearPendingTimer();
    timerRef.current = setTimeout(() => { commitPending(); }, debounceMs);
  }, [areEqual, clearPendingTimer, commitPending, controller, debounceMs, enabled, snapshot]);
  useEffect(() => () => clearPendingTimer(), [clearPendingTimer]);
  const reset = useCallback((next: T) => { clearPendingTimer(); pendingRef.current = null; controller.reset(next); initializedRef.current = true; setVersion((current) => current + 1); }, [clearPendingTimer, controller]);
  const undo = useCallback(() => { commitPending(); const previous = controller.undo(); if (previous !== null) setVersion((current) => current + 1); return previous; }, [commitPending, controller]);
  const redo = useCallback(() => { commitPending(); const next = controller.redo(); if (next !== null) setVersion((current) => current + 1); return next; }, [commitPending, controller]);
  return { undo, redo, reset, flush: commitPending, canUndo: controller.canUndo(), canRedo: controller.canRedo(), version };
}
