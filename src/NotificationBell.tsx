import { useState } from 'react'
import { type AppNotification, type NotificationType } from './useNotifications'

const typeIcon: Record<NotificationType, string> = {
  payment: '💳',
  expiry: '⏰',
  ev_disconnect: '⚡',
}

const typeBg: Record<NotificationType, string> = {
  payment: 'bg-emerald-100',
  expiry: 'bg-amber-100',
  ev_disconnect: 'bg-sky-100',
}

function timeAgo(date: Date) {
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

interface NotificationBellProps {
  notifications: AppNotification[]
  unreadCount: number
  onOpen: () => void
  onClearOne: (id: number) => void
  onClearAll: () => void
}

export default function NotificationBell({ notifications, unreadCount, onOpen, onClearOne, onClearAll }: NotificationBellProps) {
  const [open, setOpen] = useState(false)

  function toggle() {
    if (!open) onOpen()
    setOpen((v) => !v)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className={`relative flex flex-col items-center gap-1 px-6 py-2 text-xs font-semibold transition ${open ? 'text-slate-950' : 'text-slate-400 hover:text-slate-600'}`}
        aria-label="Notifications"
      >
        <span className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        Alerts
        {open && <span className="h-1 w-1 rounded-full bg-slate-950" />}
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* panel — fixed above the nav bar, centered with safe side margins */}
          <div className="fixed bottom-[72px] left-3 right-3 z-50 mx-auto max-w-md rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-950">Notifications</p>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    {unreadCount} new
                  </span>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="text-xs text-slate-400 hover:text-rose-500 transition font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-slate-400">No notifications yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <li key={n.id} className={`flex gap-3 px-4 py-3 ${n.read ? '' : 'bg-slate-50'}`}>
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${typeBg[n.type]}`}>
                        {typeIcon[n.type]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{n.body}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.timestamp)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onClearOne(n.id)}
                        className="mt-0.5 shrink-0 rounded-full p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition"
                        aria-label="Dismiss"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
