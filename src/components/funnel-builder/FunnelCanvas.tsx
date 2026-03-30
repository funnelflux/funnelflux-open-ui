import { useCallback, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nodeTypes } from './nodes'
import { edgeTypes } from './edges'
import { isValidConnection, getDefaultEdgeData } from './validation'
import { CanvasContextMenu } from './CanvasContextMenu'
import { NodeContextMenu } from './NodeContextMenu'
import { EdgeContextMenu } from './EdgeContextMenu'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import type { FunnelFlowNode, FunnelFlowEdge } from '@/types/funnel'
import { generateId } from '@/lib/id-generator'

interface MenuState {
  position: { x: number; y: number } | null
}

interface NodeMenuState extends MenuState {
  nodeId: string | null
}

interface EdgeMenuState extends MenuState {
  edgeId: string | null
}

export function FunnelCanvas() {
  const nodes = useFunnelEditorStore((s) => s.nodes)
  const edges = useFunnelEditorStore((s) => s.edges)
  const setNodes = useFunnelEditorStore((s) => s.setNodes)
  const setEdges = useFunnelEditorStore((s) => s.setEdges)
  const setSelectedNodeId = useFunnelEditorStore((s) => s.setSelectedNodeId)
  const setSelectedEdgeId = useFunnelEditorStore((s) => s.setSelectedEdgeId)

  const [canvasMenu, setCanvasMenu] = useState<MenuState>({ position: null })
  const [nodeMenu, setNodeMenu] = useState<NodeMenuState>({ position: null, nodeId: null })
  const [edgeMenu, setEdgeMenu] = useState<EdgeMenuState>({ position: null, edgeId: null })

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const closeAllMenus = useCallback(() => {
    setCanvasMenu({ position: null })
    setNodeMenu({ position: null, nodeId: null })
    setEdgeMenu({ position: null, edgeId: null })
  }, [])

  const onNodesChange: OnNodesChange<FunnelFlowNode> = useCallback(
    (changes) => {
      setNodes(applyNodeChanges(changes, nodes))
    },
    [nodes, setNodes],
  )

  const onEdgesChange: OnEdgesChange<FunnelFlowEdge> = useCallback(
    (changes) => {
      setEdges(applyEdgeChanges(changes, edges))
    },
    [edges, setEdges],
  )

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source)
      if (!sourceNode) return

      const edgeData = getDefaultEdgeData(sourceNode, connection.sourceHandle, edges)
      const newEdge: FunnelFlowEdge = {
        id: generateId(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: edgeData.edgeType,
        data: edgeData,
      }
      setEdges([...edges, newEdge])
    },
    [nodes, edges, setEdges],
  )

  const handleIsValidConnection = useCallback(
    (connection: Connection | FunnelFlowEdge) => {
      const conn: Connection = {
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
      }
      return isValidConnection(conn, nodes, edges)
    },
    [nodes, edges],
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: FunnelFlowNode) => {
      closeAllMenus()
      setSelectedNodeId(node.id)
    },
    [setSelectedNodeId, closeAllMenus],
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
      setCanvasMenu({ position: { x: event.clientX, y: event.clientY } })
    },
    [closeAllMenus],
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
    <div ref={reactFlowWrapper} className="flex-1 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={handleIsValidConnection}
        onNodeClick={onNodeClick}
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
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-muted/30"
      >
        <Background gap={15} size={1} />
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          zoomable
          pannable
          className="!bg-background !border"
        />
      </ReactFlow>

      {/* Context Menus */}
      <CanvasContextMenu
        position={canvasMenu.position}
        onClose={closeAllMenus}
      />
      <NodeContextMenu
        nodeId={nodeMenu.nodeId}
        position={nodeMenu.position}
        onClose={closeAllMenus}
      />
      <EdgeContextMenu
        edgeId={edgeMenu.edgeId}
        position={edgeMenu.position}
        onClose={closeAllMenus}
      />
    </div>
  )
}
