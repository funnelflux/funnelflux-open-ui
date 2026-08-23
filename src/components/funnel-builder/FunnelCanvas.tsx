import { useCallback, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  useReactFlow,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeChange,
  type EdgeChange,
  type OnConnect,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
  type FinalConnectionState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nodeTypes } from './nodes'
import { edgeTypes } from './edges'
import {
  getDefaultEdgeData,
  isValidConnection,
  pickConditionBranchForNewConnection,
  VISITOR_TAG_MAX_EXIT_CONNECTION_MESSAGE,
  visitorTagRejectedExtraExit,
} from './validation'
import { CanvasContextMenu } from './CanvasContextMenu'
import { NodeContextMenu } from './NodeContextMenu'
import { EdgeContextMenu } from './EdgeContextMenu'
import { NodePropertiesModal } from './NodePropertiesModal'
import { FunnelUrlModal } from './FunnelUrlModal'
import { NodeAdvancedSettingsModal } from './NodeAdvancedSettingsModal'
import { EdgeHandleSync } from './EdgeHandleSync'
import { useToastApi } from '@/components/ui-kit'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { cn } from '@/lib/utils'
import { NODE_TYPES, type FunnelFlowEdge, type FunnelFlowNode } from '@/types/funnel'
import { CODE_NODE_UNIFIED_TARGET_HANDLE } from '@/lib/codeNodeExits'
import { generateId } from '@/lib/id-generator'

interface MenuState {
  /** Screen coords for fixed menu position */
  screen: { x: number; y: number } | null
  /** Flow coords for placing new nodes */
  flow: { x: number; y: number } | null
  /** Bumped on each pane right-open so CanvasContextMenu remounts and picker/submenu state resets */
  openSession: number
}

interface NodeMenuState {
  position: { x: number; y: number } | null
  nodeId: string | null
}

interface EdgeMenuState {
  position: { x: number; y: number } | null
  edgeId: string | null
}

interface FunnelCanvasProps {
  variant?: 'default' | 'builder'
  className?: string
}

/** React Flow emits dimension/measurement and selection updates on mount; those are not user edits. */
function nodeChangesShouldMarkDirty(changes: NodeChange<FunnelFlowNode>[]): boolean {
  return changes.some((c) => c.type !== 'dimensions' && c.type !== 'select')
}

function edgeChangesShouldMarkDirty(changes: EdgeChange<FunnelFlowEdge>[]): boolean {
  return changes.some((c) => c.type !== 'select')
}

export function FunnelCanvas(props: FunnelCanvasProps = {}) {
  const { variant = 'default', className } = props
  const toast = useToastApi()
  const meta = useFunnelEditorStore((s) => s.meta)
  const nodes = useFunnelEditorStore((s) => s.nodes)
  const edges = useFunnelEditorStore((s) => s.edges)
  const setSelectedNodeId = useFunnelEditorStore((s) => s.setSelectedNodeId)
  const setSelectedEdgeId = useFunnelEditorStore((s) => s.setSelectedEdgeId)

  const [canvasMenu, setCanvasMenu] = useState<MenuState>({
    screen: null,
    flow: null,
    openSession: 0,
  })
  const [nodeMenu, setNodeMenu] = useState<NodeMenuState>({ position: null, nodeId: null })
  const [edgeMenu, setEdgeMenu] = useState<EdgeMenuState>({ position: null, edgeId: null })
  const [editNodeId, setEditNodeId] = useState<string | null>(null)
  const [funnelUrlOpen, setFunnelUrlOpen] = useState(false)
  const [funnelUrlNodeId, setFunnelUrlNodeId] = useState<string | null>(null)
  const [advancedNodeId, setAdvancedNodeId] = useState<string | null>(null)

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const closeAllMenus = useCallback(() => {
    setCanvasMenu((prev) => ({ ...prev, screen: null, flow: null }))
    setNodeMenu({ position: null, nodeId: null })
    setEdgeMenu({ position: null, edgeId: null })
  }, [])

  const handleSendTrafficHere = useCallback(
    (nodeId: string) => {
      const idFunnel = useFunnelEditorStore.getState().meta.idFunnel
      if (!idFunnel) {
        toast.error('Save your funnel first')
        return
      }
      setFunnelUrlNodeId(nodeId)
      setFunnelUrlOpen(true)
    },
    [toast],
  )

  /** Always apply changes to `getState().nodes` so rapid drag events cannot overwrite each other (stale closure). */
  const onNodesChange: OnNodesChange<FunnelFlowNode> = useCallback((changes) => {
    const markDirty = nodeChangesShouldMarkDirty(changes)
    useFunnelEditorStore.setState((s) => ({
      nodes: applyNodeChanges(changes, s.nodes),
      isDirty: markDirty ? true : s.isDirty,
    }))
  }, [])

  const onEdgesChange: OnEdgesChange<FunnelFlowEdge> = useCallback((changes) => {
    const markDirty = edgeChangesShouldMarkDirty(changes)
    useFunnelEditorStore.setState((s) => ({
      edges: applyEdgeChanges(changes, s.edges),
      isDirty: markDirty ? true : s.isDirty,
    }))
  }, [])

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    useFunnelEditorStore.setState((s) => {
      const sourceNode = s.nodes.find((n) => n.id === connection.source)
      if (!sourceNode) return {}

      // Lander/Offer/etc. stack `s-*` and `t-*` on the same side; dragging into the wrong pickup
      // can complete with the target node's *source* handle id → inverted edge + wrong edge type.
      const th = connection.targetHandle
      if (typeof th === 'string' && th.startsWith('s-')) {
        return {}
      }

      const isCondition = sourceNode.data.nodeType === NODE_TYPES.condition
      const conditionBranch = isCondition ? pickConditionBranchForNewConnection(connection.source, s.edges) : null
      if (isCondition && !conditionBranch) return {}

      const edgeData = getDefaultEdgeData(sourceNode, connection.sourceHandle, s.edges, {
        conditionBranch: conditionBranch ?? undefined,
      })

      const targetNodeSnap = s.nodes.find((n) => n.id === connection.target)
      const targetHandleJsPhp =
        targetNodeSnap !== undefined &&
        (targetNodeSnap.data.nodeType === NODE_TYPES.jsCode ||
          targetNodeSnap.data.nodeType === NODE_TYPES.phpCode)
      const resolvedTargetHandle =
        targetHandleJsPhp ? CODE_NODE_UNIFIED_TARGET_HANDLE : connection.targetHandle

      const newEdge: FunnelFlowEdge = {
        id: generateId(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: resolvedTargetHandle,
        type: edgeData.edgeType,
        data: edgeData,
      }
      return {
        edges: [...s.edges, newEdge],
        isDirty: true,
      }
    })
  }, [])

  const handleIsValidConnection = useCallback((connection: Connection | FunnelFlowEdge) => {
    const { nodes: nds, edges: eds } = useFunnelEditorStore.getState()
    const conn: Connection = {
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? null,
      targetHandle: connection.targetHandle ?? null,
    }
    return isValidConnection(conn, nds, eds)
  }, [])

  const handleConnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      if (connectionState.isValid !== false) return

      const releasedOnHandle = Boolean(connectionState.toNode)
      if (!releasedOnHandle) return

      const fromNodeId = connectionState.fromNode?.id
      if (typeof fromNodeId !== 'string' || !fromNodeId.length) return

      const snapshot = useFunnelEditorStore.getState()
      const draggingSourceSnapshot = snapshot.nodes.find((candidate) => candidate.id === fromNodeId)
      if (!draggingSourceSnapshot) return

      if (
        visitorTagRejectedExtraExit(draggingSourceSnapshot.data.nodeType, fromNodeId, snapshot.edges)
      ) {
        toast.warning(VISITOR_TAG_MAX_EXIT_CONNECTION_MESSAGE)
      }
    },
    [toast],
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: FunnelFlowNode) => {
      closeAllMenus()
      setSelectedNodeId(node.id)
    },
    [setSelectedNodeId, closeAllMenus],
  )

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: FunnelFlowNode) => {
      closeAllMenus()
      setEditNodeId(node.id)
    },
    [closeAllMenus],
  )

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: FunnelFlowEdge) => {
      closeAllMenus()
      setSelectedEdgeId(edge.id)
    },
    [setSelectedEdgeId, closeAllMenus],
  )

  const onPaneClick = useCallback(() => {
    closeAllMenus()
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
  }, [setSelectedNodeId, setSelectedEdgeId, closeAllMenus])

  // Context menu handlers
  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault()
      closeAllMenus()
      const flow = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      setCanvasMenu((prev) => ({
        screen: { x: event.clientX, y: event.clientY },
        flow,
        openSession: prev.openSession + 1,
      }))
    },
    [closeAllMenus, screenToFlowPosition],
  )

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: FunnelFlowNode) => {
      event.preventDefault()
      closeAllMenus()
      setNodeMenu({ position: { x: event.clientX, y: event.clientY }, nodeId: node.id })
    },
    [closeAllMenus],
  )

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: FunnelFlowEdge) => {
      event.preventDefault()
      closeAllMenus()
      setEdgeMenu({ position: { x: event.clientX, y: event.clientY }, edgeId: edge.id })
    },
    [closeAllMenus],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow-nodetype')
      if (!type) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const nodeTypeNum = Number(type) as import('@/types/funnel').NodeTypeValue
      const addNode = useFunnelEditorStore.getState().addNode
      addNode(nodeTypeNum, position, { label: '' })
    },
    [screenToFlowPosition],
  )

  return (
    <div
      ref={reactFlowWrapper}
      className={cn('relative h-full min-h-0 min-w-0', className)}
    >
      <ReactFlow
        style={{ width: '100%', height: '100%' }}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={handleIsValidConnection}
        onConnectEnd={handleConnectEnd}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode={['Backspace', 'Delete']}
        className={cn(
          variant === 'builder'
            ? 'bg-gradient-to-br from-background via-background to-primary-subtle/40'
            : 'bg-muted/30',
        )}
        defaultEdgeOptions={{
          style: { strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
          },
        }}
      >
        <EdgeHandleSync />
        <Background
          gap={variant === 'builder' ? 20 : 15}
          size={1}
          color="var(--border)"
        />
        <Controls
          position="bottom-left"
          showInteractive={false}
          className="ff-funnel-controls"
        />
      </ReactFlow>

      {/* Context Menus */}
      <CanvasContextMenu
        key={canvasMenu.screen ? `canvas-menu-${canvasMenu.openSession}` : 'canvas-menu-idle'}
        screenPosition={canvasMenu.screen}
        flowPosition={canvasMenu.flow}
        onClose={closeAllMenus}
        onPlacedNodeOpenEditor={setEditNodeId}
      />
      <NodeContextMenu
        nodeId={nodeMenu.nodeId}
        position={nodeMenu.position}
        onClose={closeAllMenus}
        onEditNode={(id) => setEditNodeId(id)}
        onSendTrafficHere={handleSendTrafficHere}
        onAdvancedNode={(id) => setAdvancedNodeId(id)}
      />
      <FunnelUrlModal
        open={funnelUrlOpen}
        onOpenChange={setFunnelUrlOpen}
        idCampaign={meta.idCampaign}
        idFunnel={meta.idFunnel}
        contextNodeId={funnelUrlNodeId ?? ''}
      />
      <NodePropertiesModal
        nodeId={editNodeId}
        open={!!editNodeId}
        onClose={() => setEditNodeId(null)}
      />
      <NodeAdvancedSettingsModal
        nodeId={advancedNodeId}
        open={!!advancedNodeId}
        onClose={() => setAdvancedNodeId(null)}
      />
      <EdgeContextMenu
        edgeId={edgeMenu.edgeId}
        position={edgeMenu.position}
        onClose={closeAllMenus}
      />
    </div>
  )
}
