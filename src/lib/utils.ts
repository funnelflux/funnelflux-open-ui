import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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
