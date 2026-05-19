import { X } from 'lucide-react'
import type { Device } from '../types'

interface DeviceDetailsProps {
  device: Device | null
  onClose: () => void
}

function isRandomizedMac(mac: string | null): boolean {
  if (!mac) return false
  const firstByte = parseInt(mac.substring(0, 2), 16)
  return (firstByte & 0x02) === 0x02
}

function getDeviceType(device: Device): string {
  const name = (device.hostname || device.vendor || '').toLowerCase()
  if (name.includes('router') || device.ip.endsWith('.1')) return 'Router'
  if (name.includes('switch')) return 'Switch'
  if (name.includes('firewall')) return 'Firewall'
  if (name.includes('server')) return 'Server'
  if (isRandomizedMac(device.mac)) return 'Mobile'
  return 'PC'
}

function DeviceDetails({ device, onClose }: DeviceDetailsProps) {
  if (!device) {
    return (
      <div className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col items-center justify-center text-slate-500 text-sm shrink-0">
        <span>Select a device to view details</span>
      </div>
    )
  }

  const typeLabel = getDeviceType(device)

  const rows = [
    { label: 'Device', value: `${typeLabel} (${device.ip})` },
    { label: 'IP', value: device.ip },
    { label: 'MAC', value: device.mac || '—' },
    { label: 'Status', value: device.is_online ? 'Online' : 'Offline', isStatus: true },
    { label: 'Vendor', value: device.vendor || '—' },
    { label: 'OS Guess', value: device.os_guess || '—' },
    { label: 'First Seen', value: device.first_seen ? new Date(device.first_seen).toLocaleDateString() : '—' },
    { label: 'Last Seen', value: device.last_seen ? new Date(device.last_seen).toLocaleDateString() : '—' },
  ]

  return (
    <div className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-100">Device Details</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-slate-800/50 last:border-0">
            <span className="text-xs text-slate-400">{row.label}</span>
            {row.isStatus ? (
              <span className="flex items-center gap-1.5 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${device.is_online ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className={device.is_online ? 'text-green-400' : 'text-red-400'}>{row.value}</span>
              </span>
            ) : (
              <span className={`text-xs ${row.label === 'IP' || row.label === 'MAC' ? 'font-mono text-slate-200' : 'text-slate-200'}`}>
                {row.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default DeviceDetails
