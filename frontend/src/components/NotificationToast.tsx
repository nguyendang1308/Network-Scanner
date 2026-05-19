import { useEffect } from 'react'
import { X, Wifi, WifiOff } from 'lucide-react'
import type { Toast } from '../types'

interface NotificationToastProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
  onClickDevice: (mac: string) => void
}

function NotificationToast({ toasts, onDismiss, onClickDevice }: NotificationToastProps) {
  return (
    <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 w-72">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onClickDevice={onClickDevice}
        />
      ))}
    </div>
  )
}

function ToastItem({
  toast,
  onDismiss,
  onClickDevice,
}: {
  toast: Toast
  onDismiss: (id: string) => void
  onClickDevice: (mac: string) => void
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const icon = toast.type === 'success'
    ? <Wifi className="w-4 h-4 text-green-400" />
    : <WifiOff className="w-4 h-4 text-red-400" />
  const bg = toast.type === 'success'
    ? 'bg-slate-800/90 border-green-500/30'
    : toast.type === 'warning'
    ? 'bg-slate-800/90 border-amber-500/30'
    : 'bg-slate-800/90 border-blue-500/30'

  return (
    <div
      className={[
        'flex items-start gap-2 px-3 py-2 rounded-lg border shadow-lg cursor-pointer backdrop-blur',
        bg,
      ].join(' ')}
      onClick={() => {
        if (toast.mac) onClickDevice(toast.mac)
        onDismiss(toast.id)
      }}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-100">{toast.title}</div>
        <div className="text-[11px] text-slate-400 truncate">{toast.message}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDismiss(toast.id)
        }}
        className="text-slate-500 hover:text-slate-300"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default NotificationToast
