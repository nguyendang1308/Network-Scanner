import { useEffect, useState } from 'react'
import { Clock, GitCompare, X, HardDrive } from 'lucide-react'
import api from '../api/client'
import type { Snapshot } from '../types'

interface SnapshotTimelineProps {
  onSelect: (snapshot: Snapshot | null) => void
  onCompare: (a: Snapshot, b: Snapshot) => void
}

function countDevices(topologyJson: string): number {
  try {
    const parsed = JSON.parse(topologyJson)
    return parsed.devices?.length || 0
  } catch {
    return 0
  }
}

function SnapshotTimeline({ onSelect, onCompare }: SnapshotTimelineProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [compareMode, setCompareMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [activeId, setActiveId] = useState<number | null>(null)

  useEffect(() => {
    api.get('/snapshots?limit=10')
      .then((res) => setSnapshots(res.data))
      .catch(() => setSnapshots([]))
  }, [])

  const handleClick = (snap: Snapshot) => {
    if (compareMode) {
      const next = new Set(selectedIds)
      if (next.has(snap.id)) {
        next.delete(snap.id)
      } else if (next.size < 2) {
        next.add(snap.id)
      }
      setSelectedIds(next)
      if (next.size === 2) {
        const [a, b] = snapshots.filter((s) => next.has(s.id))
        onCompare(a, b)
      }
      return
    }
    setActiveId(snap.id)
    onSelect(snap)
  }

  const clearCompare = () => {
    setSelectedIds(new Set())
    setCompareMode(false)
    onSelect(null)
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-100">Snapshots</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCompareMode((v) => !v)
              setSelectedIds(new Set())
            }}
            className={[
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
              compareMode
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700',
            ].join(' ')}
          >
            <GitCompare className="w-3.5 h-3.5" />
            Compare
          </button>
          {compareMode && (
            <button
              onClick={clearCompare}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 font-medium"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {snapshots.map((snap) => {
          const isActive = activeId === snap.id
          const isSelected = selectedIds.has(snap.id)
          const deviceCount = countDevices(snap.topology_json)
          const dateObj = new Date(snap.captured_at)
          return (
            <button
              key={snap.id}
              onClick={() => handleClick(snap)}
              className={[
                'flex-shrink-0 text-left px-4 py-3 rounded-xl border transition-all min-w-[200px]',
                isSelected
                  ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30 text-blue-100'
                  : isActive
                  ? 'bg-slate-800 border-slate-600 border-l-4 border-l-blue-500 text-slate-100'
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600',
              ].join(' ')}
            >
              <div className="font-semibold text-sm">
                {dateObj.toLocaleTimeString()}
              </div>
              <div className="text-xs text-slate-400 mb-1.5">
                {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <HardDrive className="w-3 h-3" />
                {deviceCount} device{deviceCount !== 1 ? 's' : ''}
              </div>
            </button>
          )
        })}
        {snapshots.length === 0 && (
          <div className="text-sm text-slate-500 italic">No snapshots yet</div>
        )}
      </div>
    </div>
  )
}

export default SnapshotTimeline
