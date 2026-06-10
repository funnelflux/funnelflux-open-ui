import { z } from 'zod/v4'

export const HTTP_URL_ERROR = 'Enter a valid URL starting with http:// or https://'

/** Returns true when value is a parseable http(s) URL. */
export function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  try {
    const { protocol } = new URL(trimmed)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/** Required http(s) URL for Zod schemas. Trims before validation. */
export const httpUrlStringSchema = z
  .string()
  .trim()
  .min(1, 'URL is required')
  .refine(isValidHttpUrl, { message: HTTP_URL_ERROR })

/** Optional http(s) URL — empty string allowed. */
export const optionalHttpUrlStringSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || isValidHttpUrl(value), { message: HTTP_URL_ERROR })

/** Validates a raw string; returns an error message or undefined when valid. */
export function getHttpUrlError(
  value: string,
  options: { required?: boolean } = {},
): string | undefined {
  const { required = true } = options
  const trimmed = value.trim()
  if (!trimmed) return required ? 'URL is required' : undefined
  return isValidHttpUrl(trimmed) ? undefined : HTTP_URL_ERROR
}
