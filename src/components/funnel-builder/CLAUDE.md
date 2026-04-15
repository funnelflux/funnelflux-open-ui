# Funnel Builder

Visual funnel editor built on `@xyflow/react`. Manages nodes (Lander, Offer,
Rotator, Condition, JsCode, PhpCode, ExternalUrl, VisitorTag, Root) and four
edge types (`weighted`, `action`, `condition`, `code`).

## Rules

1. **Source of truth is `src/store/funnelEditor.ts`** — never duplicate canvas state in component-local refs. Use the store actions for nodes/edges/selection.
2. **Position is percent, not pixel.** API stores `percentPosX`/`percentPosY`; React Flow uses pixels. Always go through `percentToPixel`/`pixelToPercent` from `@/lib/funnelCoords`. Never write raw pixel values to the API.
3. **Node types live in `nodes/index.ts`, edge types live in `edges/index.ts`.** Adding a new node/edge means: create the component, register it in the relevant `index.ts`, add the type to `@/types/funnel`, and update `validation.ts` if connectivity rules change.
4. **All connection validity goes through `validation.ts:isValidConnection`.** Do not add ad-hoc checks inside event handlers. Default edge data comes from `validation.ts:getDefaultEdgeData` — extend that function rather than special-casing in callers.
5. **Condition node handles are `'yes'` or `'no'` only**, and each handle accepts exactly one outgoing edge. Enforced in `validation.ts:33-50`.
6. **Heatmap state is read via `HeatmapContext`**, not via prop drilling. Node components subscribing to heatmap stats use `useContext(HeatmapContext)` so the canvas can toggle the overlay without re-mounting nodes.
7. **Edit modals (`LanderNodeEditModal`, `OfferNodeEditModal`, etc.) commit through store actions**, not by mutating the node prop directly.

## Architecture

```
FunnelCanvas.tsx                  ReactFlow root, wires store ↔ canvas
├── nodeTypes (nodes/index.ts)    9 node renderers
├── edgeTypes (edges/index.ts)    4 edge renderers
├── validation.ts                 isValidConnection, getDefaultEdgeData
├── HeatmapContext.ts             read-only stats overlay context
├── HeatmapOverlay.tsx            paints stats badges over nodes
├── *ContextMenu.tsx              right-click menus for canvas/node/edge
├── ConditionEditor.tsx           rule builder for Condition nodes + Global Conditions
└── *EditModal.tsx                per-node-type property editors
```

## Adding a new node type

1. Create `nodes/MyNode.tsx` extending the `BaseNode` pattern
2. Register in `nodes/index.ts` `nodeTypes` map under a unique string key
3. Add the numeric `nodeType` to `NODE_TYPES` in `@/types/funnel`
4. Teach `validation.ts:getDefaultEdgeData` what edge type to spawn from it
5. If it has special connectivity rules, add them to `validation.ts:isValidConnection`
6. Add a `*EditModal` if the node has properties beyond `label`
7. If it produces stats, wire it into `HeatmapNodeBadge` for the overlay

## Performance notes

This canvas can carry 100+ nodes. The memoization discipline in
`docs/_ai_context/performance-hooks-rules.md` applies here too — those
rules are written for `DataTable`, but the same ideas translate directly
to ReactFlow: memoize anything that flows into the `nodes`/`edges` props,
never put derived arrays (`.filter()`, `.map()`, spreads) in `useEffect`
deps, and use `useRef` for handlers that need fresh closures without
invalidating memoized children. `FunnelQuickStatsModal` uses `DataTable`
for its tabular views, so when you touch that file both sets of rules
are in scope.
