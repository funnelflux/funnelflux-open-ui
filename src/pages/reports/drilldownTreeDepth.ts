/** With N groupings, row depths are 0..N-1; depth N-1 is the last grouping (must not lazy-expand). */
export function isLastDrilldownGroupingDepth(depth: number, planLength: number): boolean {
  return planLength > 0 && depth >= planLength - 1
}
