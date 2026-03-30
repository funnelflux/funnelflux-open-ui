/**
 * Generate a caller-side uint64 ID as a string.
 * Uses crypto.getRandomValues for uniqueness, formatted as a decimal string
 * matching the server's uint64 ID format.
 */
export function generateId(): string {
  const buf = new Uint32Array(2)
  crypto.getRandomValues(buf)
  // Combine two 32-bit values into a single large number (max ~18 quintillion)
  // We avoid the sign bit by masking the high word to 31 bits
  const high = (buf[0] & 0x7fffffff) >>> 0
  const low = buf[1] >>> 0
  const id = BigInt(high) * BigInt(0x100000000) + BigInt(low)
  return id.toString()
}
