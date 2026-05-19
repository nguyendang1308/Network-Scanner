import { useCallback } from 'react'
import { RouterIcon, SwitchIcon, FirewallIcon, PCIcon, ServerIcon } from './DeviceIcons'

const items = [
  { type: 'router', label: 'Router', Icon: RouterIcon, color: 'text-blue-400 hover:bg-blue-500/10' },
  { type: 'switch', label: 'Switch', Icon: SwitchIcon, color: 'text-emerald-400 hover:bg-emerald-500/10' },
  { type: 'firewall', label: 'Firewall', Icon: FirewallIcon, color: 'text-red-400 hover:bg-red-500/10' },
  { type: 'pc', label: 'PC', Icon: PCIcon, color: 'text-slate-300 hover:bg-slate-700' },
  { type: 'server', label: 'Server', Icon: ServerIcon, color: 'text-violet-400 hover:bg-violet-500/10' },
]

function DeviceLibrary() {
  const onDragStart = useCallback((event: React.DragEvent, type: string) => {
    event.dataTransfer.setData('application/reactflow', type)
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  return (
    <div className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 gap-3 shrink-0 select-none">
      <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Library</h3>
      {items.map((item) => (
        <div
          key={item.type}
          className={[
            'flex flex-col items-center gap-1 p-2 rounded-lg cursor-grab active:cursor-grabbing transition-colors w-16',
            'bg-slate-800/50 border border-slate-700/50',
            item.color,
          ].join(' ')}
          draggable
          onDragStart={(e) => onDragStart(e, item.type)}
        >
          <item.Icon className={`w-8 h-8 ${item.color.split(' ')[0]}`} />
          <span className="text-[9px] font-medium text-slate-400">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export default DeviceLibrary
