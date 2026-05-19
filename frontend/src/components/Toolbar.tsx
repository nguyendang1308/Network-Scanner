import { Zap, ZoomIn, ZoomOut, Save, Search, History, LayoutGrid } from 'lucide-react'

interface ToolbarProps {
  scanning: boolean
  scanProgress: number
  onScan: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onAutoLayout: () => void
  searchQuery: string
  onSearchChange: (q: string) => void
  mode: 'live' | 'history'
  onModeChange: (mode: 'live' | 'history') => void
  liveMonitoring: boolean
  onLiveMonitoringChange: (v: boolean) => void
}

function Toolbar({
  scanning,
  onScan,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAutoLayout,
  searchQuery,
  onSearchChange,
  mode,
  onModeChange,
  liveMonitoring,
  onLiveMonitoringChange,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 h-12 bg-slate-900 border-b border-slate-800">
      {/* Left */}
      <div className="flex items-center gap-2">
        <button
          onClick={onScan}
          disabled={scanning}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            scanning
              ? 'bg-blue-500/20 text-blue-300 cursor-not-allowed'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700',
          ].join(' ')}
        >
          <Zap className={`w-3.5 h-3.5 ${scanning ? 'animate-pulse' : ''}`} />
          Auto-Scan
        </button>
        <div className="w-px h-5 bg-slate-700 mx-1" />
        <button onClick={onZoomIn} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors" title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={onZoomOut} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors" title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={onFitView} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors" title="Fit View">
          <Save className="w-4 h-4" />
        </button>
        <button onClick={onAutoLayout} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors" title="Auto Layout">
          <LayoutGrid className="w-4 h-4" />
        </button>
      </div>

      {/* Center */}
      <button
        onClick={() => onLiveMonitoringChange(!liveMonitoring)}
        className="flex items-center gap-2"
      >
        <span className="text-xs text-slate-400">Live Monitoring</span>
        <div
          className={[
            'w-9 h-5 rounded-full relative transition-colors',
            liveMonitoring ? 'bg-green-500/30' : 'bg-slate-700',
          ].join(' ')}
        >
          <div
            className={[
              'absolute top-0.5 w-4 h-4 rounded-full transition-all',
              liveMonitoring ? 'left-4.5 bg-green-400' : 'left-0.5 bg-slate-400',
            ].join(' ')}
          />
        </div>
      </button>

      {/* Right */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search IP, MAC, Vendor..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-slate-800 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 w-48 placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
          <button
            onClick={() => onModeChange('live')}
            className={[
              'flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors',
              mode === 'live' ? 'bg-slate-700 text-green-400' : 'text-slate-400 hover:text-slate-200',
            ].join(' ')}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Live
          </button>
          <button
            onClick={() => onModeChange('history')}
            className={[
              'flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors',
              mode === 'history' ? 'bg-slate-700 text-blue-400' : 'text-slate-400 hover:text-slate-200',
            ].join(' ')}
          >
            <History className="w-3 h-3" />
            History
          </button>
        </div>
      </div>
    </div>
  )
}

export default Toolbar
