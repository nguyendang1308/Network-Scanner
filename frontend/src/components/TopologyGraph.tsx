import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type NodeTypes,
  type Edge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useImperativeHandle, forwardRef, useEffect, useRef } from 'react'

import DeviceNode from './DeviceNode'

const nodeTypes: NodeTypes = {
  deviceNode: DeviceNode,
}

export interface TopologyGraphRef {
  zoomIn: () => void
  zoomOut: () => void
  fitView: () => void
}

interface TopologyGraphProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange?: OnNodesChange
  onEdgesChange?: OnEdgesChange
  readOnly?: boolean
}

const TopologyGraph = forwardRef<TopologyGraphRef, TopologyGraphProps>(
  function TopologyGraph({ nodes, edges, onNodesChange, onEdgesChange, readOnly }, ref) {
    const { zoomIn, zoomOut, fitView } = useReactFlow()
    const hasFitted = useRef(false)

    useImperativeHandle(ref, () => ({
      zoomIn: () => zoomIn(),
      zoomOut: () => zoomOut(),
      fitView: () => fitView({ padding: 0.15 }),
    }))

    // Only fit once when nodes first appear
    useEffect(() => {
      if (nodes.length > 0 && !hasFitted.current) {
        hasFitted.current = true
        const timer = setTimeout(() => fitView({ padding: 0.15 }), 100)
        return () => clearTimeout(timer)
      }
    }, [nodes.length, fitView])

    return (
      <div className="h-full w-full bg-slate-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          nodesDraggable={!readOnly}
          nodesConnectable={false}
          elementsSelectable={!readOnly}
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'default',
            style: { stroke: '#22c55e', strokeWidth: 3 },
            animated: true,
          }}
        >
          <Background variant={BackgroundVariant.Dots} color="#334155" gap={24} size={1.5} />
          <Controls className="!bg-slate-800 !border-slate-700 [&_button]:!bg-slate-800 [&_button]:!border-slate-700 [&_button]:!text-slate-300 [&_button:hover]:!bg-slate-700" />
        </ReactFlow>
      </div>
    )
  }
)

export default TopologyGraph
