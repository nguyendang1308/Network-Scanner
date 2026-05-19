import { useMemo } from 'react'
import { Monitor, Wifi, Plus, Award } from 'lucide-react'
import type { Device } from '../types'

interface StatsPanelProps {
  devices: Device[]
}

function StatsPanel({ devices }: StatsPanelProps) {
  const stats = useMemo(() => {
    const total = devices.length
    const online = devices.filter((d) => d.is_online).length

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const newToday = devices.filter((d) => {
      if (!d.first_seen) return false
      return new Date(d.first_seen) >= today
    }).length

    const vendorCounts: Record<string, number> = {}
    devices.forEach((d) => {
      if (d.vendor && d.vendor.toLowerCase() !== 'unknown') {
        vendorCounts[d.vendor] = (vendorCounts[d.vendor] || 0) + 1
      }
    })
    const topVendor = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

    return { total, online, newToday, topVendor }
  }, [devices])

  const items = [
    { label: 'Total', value: stats.total, icon: Monitor, valueColor: 'text-blue-400' },
    { label: 'Online', value: stats.online, icon: Wifi, valueColor: 'text-green-400' },
    { label: 'New Today', value: stats.newToday, icon: Plus, valueColor: 'text-amber-400' },
    { label: 'Top Vendor', value: stats.topVendor, icon: Award, valueColor: 'text-slate-100' },
  ]

  return (
    <div className="flex items-center gap-8 px-6 h-full">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
            <item.icon className="w-5 h-5 text-slate-300" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {item.label}
            </span>
            <span className={`text-xl font-bold ${item.valueColor}`}>
              {item.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StatsPanel
