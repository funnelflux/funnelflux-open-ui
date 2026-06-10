import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { RowSelectionState } from "@tanstack/react-table"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: string }).message)
  }
  return 'An error occurred'
}

/** Coerce unknown API payloads to an array (PHP/JSON sometimes yields objects). */
export function asArray<T>(value: unknown): T[] {
  if (value == null) return []
  return Array.isArray(value) ? (value as T[]) : []
}

/** Row ids that are actually selected (TanStack may keep `false` entries). */
export function selectedRowIds(selection: RowSelectionState): string[] {
  return Object.entries(selection)
    .filter(([, isSelected]) => isSelected)
    .map(([id]) => id)
}
