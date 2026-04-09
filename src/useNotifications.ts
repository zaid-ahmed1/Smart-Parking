import { useState, useCallback } from 'react'

export type NotificationType = 'payment' | 'expiry' | 'ev_disconnect'

export interface AppNotification {
  id: number
  type: NotificationType
  title: string
  body: string
  timestamp: Date
  read: boolean
}

let nextId = 0

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [toasts, setToasts] = useState<AppNotification[]>([])

  const notify = useCallback((type: NotificationType, title: string, body: string) => {
    const notification: AppNotification = {
      id: nextId++,
      type,
      title,
      body,
      timestamp: new Date(),
      read: false,
    }
    setNotifications((prev) => [notification, ...prev])
    setToasts((prev) => [...prev, notification])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== notification.id))
    }, 4000)

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearOne = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, toasts, notify, markAllRead, clearOne, clearAll, unreadCount, requestPermission }
}
