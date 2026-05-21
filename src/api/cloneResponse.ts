import type { IdNamePair } from '@/types/entities'

type CloneWire = Record<string, unknown>

/**
 * V2 clone endpoints return entity-specific keys (e.g. idFunnel/funnelName);
 * OpenAPI documents IdNamePair (id/name). Map wire payloads for UI consumers.
 */
export function idNamePairFromCloneWire(
  wire: CloneWire,
  idField: string,
  nameField: string,
): IdNamePair {
  const id = wire[idField] ?? wire.id
  const name = wire[nameField] ?? wire.name
  return {
    id: id == null ? '' : String(id),
    name: name == null ? '' : String(name),
  }
}
