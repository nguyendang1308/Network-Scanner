import { memo } from 'react'
import { type NodeProps, type Node, Handle, Position } from '@xyflow/react'
import type { Device } from '../types'
import { RouterIcon, SwitchIcon, FirewallIcon, PCIcon, ServerIcon, MobileIcon } from './DeviceIcons'

type DeviceNodeData = Device & Record<string, unknown> & {
  diffStatus?: 'added' | 'removed' | 'changed'
  flash?: boolean
  selected?: boolean
  deviceType?: string
  onSelect?: (device: Device) => void
}
type DeviceNodeType = Node<DeviceNodeData, 'deviceNode'>

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

function getIconColor(type: string): string {
  switch (type) {
    case 'router': return 'text-blue-400'
    case 'switch': return 'text-emerald-400'
    case 'firewall': return 'text-red-400'
    case 'server': return 'text-violet-400'
    case 'mobile': return 'text-pink-400'
    default: return 'text-slate-300'
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'router': return 'Router'
    case 'switch': return 'Switch'
    case 'firewall': return 'Firewall'
    case 'server': return 'Server'
    case 'mobile': return 'Mobile'
    default: return 'PC'
  }
}

function DeviceIcon({ type, className }: { type: string; className?: string }) {
  const color = getIconColor(type)
  switch (type) {
    case 'router': return <RouterIcon className={className || `${color} w-12 h-12`} />
    case 'switch': return <SwitchIcon className={className || `${color} w-12 h-12`} />
    case 'firewall': return <FirewallIcon className={className || `${color} w-12 h-12`} />
    case 'server': return <ServerIcon className={className || `${color} w-12 h-12`} />
    case 'mobile': return <MobileIcon className={className || `${color} w-12 h-12`} />
    default: return <PCIcon className={className || `${color} w-12 h-12`} />
  }
}

const DeviceNode = memo((props: NodeProps<DeviceNodeType>) => {
  const data = props.data
  const isOnline = data.is_online
  const diff = data.diffStatus
  const flash = data.flash
  const selected = data.selected
  const type = (data.deviceType as string) || getDeviceType(data)
  const onSelect = data.onSelect as ((device: Device) => void) | undefined

  const diffRing =
    diff === 'added'
      ? 'ring-2 ring-green-400'
      : diff === 'removed'
      ? 'ring-2 ring-red-400 opacity-50'
      : diff === 'changed'
      ? 'ring-2 ring-amber-400'
      : ''

  return (
    <div
      className={[
        'flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer min-w-[120px]',
        'bg-slate-800/90 backdrop-blur border-slate-600 hover:border-slate-400',
        selected ? 'ring-2 ring-blue-500 border-blue-400' : '',
        diffRing,
        flash ? 'animate-pulse' : '',
      ].join(' ')}
      onClick={() => onSelect && onSelect(data as unknown as Device)}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-blue-400 !border-none" />
      <DeviceIcon type={type} />
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {getTypeLabel(type)}
      </span>
      <span className="text-xs font-mono text-slate-200 font-medium">{data.ip}</span>
      <span className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className={`text-[11px] font-semibold ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </span>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-blue-400 !border-none" />
    </div>
  )
})

DeviceNode.displayName = 'DeviceNode'

export default DeviceNode
