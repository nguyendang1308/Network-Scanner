import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { type Node, ReactFlowProvider, applyNodeChanges } from '@xyflow/react'
import TopologyGraph, { type TopologyGraphRef } from './components/TopologyGraph'
import SnapshotTimeline from './components/SnapshotTimeline'
import StatsPanel from './components/StatsPanel'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import DeviceDetails from './components/DeviceDetails'
import DeviceLibrary from './components/DeviceLibrary'
import NotificationToast from './components/NotificationToast'
import useWebSocket from './hooks/useWebSocket'
import api from './api/client'
import type { Device, Snapshot, SnapshotTopology, DiffResult, WSEvent, Toast } from './types'
import type { NodeChange } from '@xyflow/react'
import { runAutoLayout } from './utils/autoLayout'

const COLS = 8
const NODE_WIDTH = 140
const NODE_HEIGHT = 110

function isRandomizedMac(mac: string | null): boolean {
  if (!mac) return false
  const firstByte = parseInt(mac.substring(0, 2), 16)
  return (firstByte & 0x02) === 0x02
}

function getDeviceType(device: Device): 'router' | 'switch' | 'firewall' | 'pc' | 'server' | 'mobile' {
  const name = (device.hostname || device.vendor || '').toLowerCase()
  if (name.includes('router') || device.ip.endsWith('.1')) return 'router'
  if (name.includes('switch')) return 'switch'
  if (name.includes('firewall')) return 'firewall'
  if (name.includes('server')) return 'server'
  if (isRandomizedMac(device.mac)) return 'mobile'
  return 'pc'
}

function getNodeId(device: Device, level: number, indexInLevel: number): string {
  return device.mac || `device-${device.id}-l${level}-${indexInLevel}`
}

function getDeviceLevel(device: Device): number {
  const t = getDeviceType(device)
  if (t === 'router') return 0
  if (t === 'switch' || t === 'firewall') return 1
  return 2
}

function layoutDevices(
  devices: Device[],
  onSelect: (d: Device) => void,
  selectedMac: string | null
): Node[] {
  const levels: Device[][] = [[], [], []]
  devices.forEach((d) => {
    levels[getDeviceLevel(d)].push(d)
  })

  const nodes: Node[] = []
  let currentY = 0

  // Level 0: routers
  if (levels[0].length > 0) {
    const totalWidth = (levels[0].length - 1) * NODE_WIDTH
    const startX = -totalWidth / 2
    levels[0].forEach((dev, i) => {
      nodes.push({
        id: getNodeId(dev, 0, i),
        type: 'deviceNode',
        position: { x: startX + i * NODE_WIDTH, y: currentY },
        data: {
          ...dev,
          deviceType: getDeviceType(dev),
          flash: false,
          selected: selectedMac ? dev.mac === selectedMac : false,
          onSelect,
        } as unknown as Record<string, unknown>,
      })
    })
    currentY += NODE_HEIGHT + 40
  }

  // Level 1: switches/firewalls
  if (levels[1].length > 0) {
    const totalWidth = (levels[1].length - 1) * NODE_WIDTH
    const startX = -totalWidth / 2
    levels[1].forEach((dev, i) => {
      nodes.push({
        id: getNodeId(dev, 1, i),
        type: 'deviceNode',
        position: { x: startX + i * NODE_WIDTH, y: currentY },
        data: {
          ...dev,
          deviceType: getDeviceType(dev),
          flash: false,
          selected: selectedMac ? dev.mac === selectedMac : false,
          onSelect,
        } as unknown as Record<string, unknown>,
      })
    })
    currentY += NODE_HEIGHT + 40
  }

  // Level 2: pcs/servers in grid
  if (levels[2].length > 0) {
    const gridWidth = (Math.min(levels[2].length, COLS) - 1) * NODE_WIDTH
    const startX = -gridWidth / 2
    levels[2].forEach((dev, i) => {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      nodes.push({
        id: getNodeId(dev, 2, i),
        type: 'deviceNode',
        position: { x: startX + col * NODE_WIDTH, y: currentY + row * NODE_HEIGHT },
        data: {
          ...dev,
          deviceType: getDeviceType(dev),
          flash: false,
          selected: selectedMac ? dev.mac === selectedMac : false,
          onSelect,
        } as unknown as Record<string, unknown>,
      })
    })
  }

  return nodes
}

function applyDiffToNodes(nodes: Node[], diff: DiffResult | null): Node[] {
  if (!diff) return nodes
  const addedMacs = new Set(diff.added.map((d) => d.mac).filter(Boolean))
  const removedMacs = new Set(diff.removed.map((d) => d.mac).filter(Boolean))
  const changedMacs = new Set(diff.changed.map((c) => c.current.mac).filter(Boolean))

  return nodes.map((n) => {
    const mac = n.data?.mac as string | null
    let diffStatus: 'added' | 'removed' | 'changed' | undefined
    if (mac && addedMacs.has(mac)) diffStatus = 'added'
    else if (mac && removedMacs.has(mac)) diffStatus = 'removed'
    else if (mac && changedMacs.has(mac)) diffStatus = 'changed'
    return {
      ...n,
      data: { ...n.data, diffStatus },
    }
  })
}

function App() {
  const [mode, setMode] = useState<'live' | 'history'>('live')
  const [devices, setDevices] = useState<Device[]>([])
  const [nodes, setNodes] = useState<Node[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [historyBanner, setHistoryBanner] = useState<string | null>(null)
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [liveMonitoring, setLiveMonitoring] = useState(true)

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const graphRef = useRef<TopologyGraphRef>(null)

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws/network/1'
  const { lastMessage, readyState } = useWebSocket(wsUrl)
  const wsConnected = readyState === WebSocket.OPEN

  const handleSelectDevice = useCallback((dev: Device) => {
    setSelectedDevice(dev)
  }, [])

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Only apply position changes to avoid infinite loops with selection
    const positionChanges = changes.filter((c) => c.type === 'position')
    if (positionChanges.length === 0) return
    setNodes((prev) => applyNodeChanges(changes, prev))
  }, [])

  const handleAutoLayout = useCallback(() => {
    setNodes((prev) => {
      const onlineNodes = prev.filter((n) => (n.data as unknown as Device).is_online)
      const routerNode = onlineNodes.find((n) => {
        const d = n.data as unknown as Device & { deviceType?: string }
        return d.deviceType === 'router' || d.ip?.endsWith('.1')
      })
      if (!routerNode || onlineNodes.length < 2) return prev
      const layoutEdges = onlineNodes
        .filter((n) => n.id !== routerNode.id)
        .map((n) => ({
          id: `e-${routerNode.id}-${n.id}`,
          source: routerNode.id,
          target: n.id,
        }))
      const laidOut = runAutoLayout(onlineNodes, layoutEdges)
      const posMap = new Map(laidOut.map((n) => [n.id, n.position]))
      return prev.map((n) => {
        const pos = posMap.get(n.id)
        return pos ? { ...n, position: pos } : n
      })
    })
    setTimeout(() => graphRef.current?.fitView(), 100)
  }, [])

  const fetchDevices = useCallback(async () => {
    try {
      const res = await api.get<Device[]>('/devices')
      setDevices(res.data)
    } catch {
      // ignore polling errors
    }
  }, [])

  // Build nodes when devices change in live mode
  useEffect(() => {
    if (mode === 'live') {
      setNodes(layoutDevices(devices, handleSelectDevice, selectedDevice?.mac || null))
      setDiffResult(null)
      setHistoryBanner(null)
    }
  }, [devices, mode, handleSelectDevice, selectedDevice?.mac])

  // Initial fetch once on mount
  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  // Fallback polling devices only when WS disconnected
  useEffect(() => {
    if (mode === 'live' && !wsConnected) {
      pollRef.current = setInterval(() => {
        fetchDevices()
      }, 30000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [mode, wsConnected, fetchDevices])

  // Handle WS messages
  useEffect(() => {
    if (!lastMessage) return
    try {
      const msg = JSON.parse(lastMessage) as WSEvent
      if (msg.event === 'scan_start') {
        setScanning(true)
        setScanProgress(0)
      } else if (msg.event === 'scan_progress' && typeof msg.percent === 'number') {
        setScanProgress(msg.percent)
      } else if (msg.event === 'scan_complete') {
        setScanning(false)
        setScanProgress(100)
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current)
        if (liveMonitoring) fetchDevices()
      } else if (msg.event === 'new_device' && msg.device) {
        const dev = msg.device
        setDevices((prev) => {
          const exists = prev.find((d) => d.mac === dev.mac)
          if (exists) return prev.map((d) => (d.mac === dev.mac ? { ...d, ...dev, is_online: true } : d))
          return [...prev, { ...dev, id: Date.now(), is_online: true } as Device]
        })
        if (mode === 'live' && liveMonitoring) {
          const newNode = layoutDevices([dev as Device], handleSelectDevice, selectedDevice?.mac || null)[0]
          if (newNode) {
            setNodes((prev) => {
              const exists = prev.find((n) => (n.data as unknown as Device)?.mac === dev.mac)
              if (exists) {
                return prev.map((n) =>
                  (n.data as unknown as Device)?.mac === dev.mac
                    ? { ...n, data: { ...n.data, ...dev, is_online: true, flash: true } }
                    : n
                )
              }
              return [...prev, { ...newNode, data: { ...newNode.data, flash: true } }]
            })

            setTimeout(() => {
              setNodes((prev) =>
                prev.map((n) =>
                  (n.data as unknown as Device)?.mac === dev.mac
                    ? { ...n, data: { ...n.data, flash: false } }
                    : n
                )
              )
            }, 2000)
          }
        }
        addToast({
          id: `new-${dev.mac}-${Date.now()}`,
          title: 'New device found',
          message: `${dev.ip} (${dev.vendor || 'Unknown'})`,
          type: 'success',
          mac: dev.mac,
        })

      } else if (msg.event === 'device_offline' && msg.mac && liveMonitoring) {
        setDevices((prev) =>
          prev.map((d) => (d.mac === msg.mac ? { ...d, is_online: false } : d))
        )
        setNodes((prev) =>
          prev.map((n) =>
            (n.data as unknown as Device)?.mac === msg.mac
              ? { ...n, data: { ...n.data, is_online: false } }
              : n
          )
        )
        addToast({
          id: `off-${msg.mac}-${Date.now()}`,
          title: 'Device offline',
          message: msg.mac,
          type: 'warning',
          mac: msg.mac,
        })

      } else if (msg.event === 'device_online' && msg.mac && liveMonitoring) {
        setDevices((prev) =>
          prev.map((d) => (d.mac === msg.mac ? { ...d, is_online: true } : d))
        )
        setNodes((prev) =>
          prev.map((n) =>
            (n.data as unknown as Device)?.mac === msg.mac
              ? { ...n, data: { ...n.data, is_online: true } }
              : n
          )
        )
      }
    } catch {
      // ignore malformed messages
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage, mode, devices, selectedDevice?.mac, handleSelectDevice, liveMonitoring])

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev, toast])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleScan = async () => {
    setScanning(true)
    setScanProgress(0)
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current)
    scanTimeoutRef.current = setTimeout(() => {
      setScanning(false)
      setScanProgress(0)
    }, 120000)
    try {
      const res = await api.post('/networks/1/scan')
      console.log('Scan triggered:', res.data)
    } catch (err) {
      console.warn('Scan trigger failed:', err)
      setScanning(false)
      setScanProgress(0)
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current)
    }
  }

  const handleSnapshotSelect = useCallback((snapshot: Snapshot | null) => {
    if (!snapshot) {
      setHistoryBanner(null)
      setNodes([])
      setDiffResult(null)
      return
    }
    const topology: SnapshotTopology = JSON.parse(snapshot.topology_json)
    setNodes(layoutDevices(topology.devices, handleSelectDevice, selectedDevice?.mac || null))
    setHistoryBanner(`Viewing snapshot from ${new Date(snapshot.captured_at).toLocaleString()}`)
    setDiffResult(null)
  }, [handleSelectDevice, selectedDevice?.mac])

  const handleSnapshotCompare = useCallback(async (a: Snapshot, b: Snapshot) => {
    try {
      const res = await api.get<DiffResult>(`/snapshots/${a.id}/diff?compare_to=${b.id}`)
      setDiffResult(res.data)
      const topologyA: SnapshotTopology = JSON.parse(a.topology_json)
      const topologyB: SnapshotTopology = JSON.parse(b.topology_json)
      const allDevices = [...topologyA.devices]
      const seen = new Set(allDevices.map((d) => d.mac))
      topologyB.devices.forEach((d) => {
        if (!seen.has(d.mac)) allDevices.push(d)
      })
      setNodes(applyDiffToNodes(layoutDevices(allDevices, handleSelectDevice, selectedDevice?.mac || null), res.data))
      setHistoryBanner(`Comparing snapshot ${a.id} vs ${b.id}`)
    } catch (err) {
      console.warn('Diff failed:', err)
    }
  }, [handleSelectDevice, selectedDevice?.mac])

  // Filter nodes by search and hide offline
  const searchFiltered = searchQuery.trim()
    ? nodes.filter((n) => {
        const d = n.data as unknown as Device
        const q = searchQuery.toLowerCase()
        return (
          d.ip.toLowerCase().includes(q) ||
          (d.mac && d.mac.toLowerCase().includes(q)) ||
          (d.vendor && d.vendor.toLowerCase().includes(q)) ||
          (d.hostname && d.hostname.toLowerCase().includes(q))
        )
      })
    : nodes

  const onlineNodes = searchFiltered.filter((n) => (n.data as unknown as Device).is_online)

  const displayNodes = diffResult ? applyDiffToNodes(onlineNodes, diffResult) : onlineNodes

  const displayEdges = useMemo(() => {
    const routerNode = displayNodes.find((n) => {
      const d = n.data as unknown as Device & { deviceType?: string }
      return d.deviceType === 'router' || d.ip?.endsWith('.1')
    })
    if (!routerNode || displayNodes.length < 2) return []
    return displayNodes
      .filter((n) => n.id !== routerNode.id)
      .map((n) => ({
        id: `e-${routerNode.id}-${n.id}`,
        source: routerNode.id,
        target: n.id,
        type: 'default' as const,
        animated: true,
        style: {
          stroke: '#22c55e',
          strokeWidth: 4,
        },
      }))
  }, [displayNodes])

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-200 flex overflow-hidden">
      <Sidebar activeItem="devices" />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Stats bar */}
        <div className="h-16 bg-slate-900 border-b border-slate-800 shrink-0">
          <StatsPanel devices={devices} />
        </div>

        {/* Toolbar */}
        <Toolbar
          scanning={scanning}
          scanProgress={scanProgress}
          onScan={handleScan}
          onZoomIn={() => graphRef.current?.zoomIn()}
          onZoomOut={() => graphRef.current?.zoomOut()}
          onFitView={() => graphRef.current?.fitView()}
          onAutoLayout={handleAutoLayout}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          mode={mode}
          onModeChange={setMode}
          liveMonitoring={liveMonitoring}
          onLiveMonitoringChange={setLiveMonitoring}
        />

        {/* Scan progress bar */}
        {scanning && (
          <div className="h-1 bg-slate-800 shrink-0">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        )}

        {/* History banner */}
        {historyBanner && (
          <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs font-medium shrink-0">
            {historyBanner}
          </div>
        )}

        {/* Main content: library + canvas + details */}
        <div className="flex-1 flex overflow-hidden relative">
          <DeviceLibrary />
          <div className="flex-1 relative">
            <ReactFlowProvider>
              <TopologyGraph
                ref={graphRef}
                nodes={displayNodes}
                edges={displayEdges}
                readOnly={mode === 'history'}
                onNodesChange={handleNodesChange}
              />
            </ReactFlowProvider>

            {/* Toasts */}
            <NotificationToast
              toasts={toasts}
              onDismiss={dismissToast}
              onClickDevice={(mac) => {
                const dev = devices.find((d) => d.mac === mac)
                if (dev) setSelectedDevice(dev)
              }}
            />


          </div>

          {/* Device details panel */}
          {selectedDevice && (
            <DeviceDetails
              device={selectedDevice}
              onClose={() => setSelectedDevice(null)}
            />
          )}
        </div>

        {/* Snapshot timeline (history only) */}
        {mode === 'history' && (
          <SnapshotTimeline
            onSelect={handleSnapshotSelect}
            onCompare={handleSnapshotCompare}
          />
        )}
      </div>
    </div>
  )
}

export default App
