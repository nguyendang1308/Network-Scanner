import { LayoutDashboard, Cpu, Bell, Settings, UserCircle } from 'lucide-react'

interface SidebarProps {
  activeItem?: string
}

const items = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'devices', label: 'Devices', icon: Cpu },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
]

function Sidebar({ activeItem = 'devices' }: SidebarProps) {
  return (
    <div className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 shrink-0">
      {/* Logo */}
      <div className="mb-6">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
          <Cpu className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-2 w-full px-2">
        {items.map((item) => {
          const isActive = activeItem === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              title={item.label}
              className={[
                'w-full flex items-center justify-center h-10 rounded-lg transition-colors',
                isActive
                  ? 'bg-slate-800 text-blue-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
              ].join(' ')}
            >
              <Icon className="w-5 h-5" />
            </button>
          )
        })}
      </nav>

      {/* Profile */}
      <div className="mt-auto pt-4 border-t border-slate-800 w-full px-2">
        <button
          title="Profile"
          className="w-full flex items-center justify-center h-10 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
        >
          <UserCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default Sidebar
