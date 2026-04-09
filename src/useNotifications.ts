import { useState, useCallback, useEffect } from 'react'

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

const STORAGE_KEY = 'smart_parking_notifications'

const loadNotificationsFromStorage = (): AppNotification[] => {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return parsed.map((n: any) => ({
      ...n,
      timestamp: new Date(n.timestamp),
    }))
  } catch {
    return []
  }
}

const saveNotificationsToStorage = (notifications: AppNotification[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
  } catch {
    // ignore storage errors
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [toasts, setToasts] = useState<AppNotification[]>([])

  // Load notifications from localStorage on mount
  useEffect(() => {
    const stored = loadNotificationsFromStorage()
    setNotifications(stored)
  }, [])

  const notify = useCallback((type: NotificationType, title: string, body: string) => {
    const notification: AppNotification = {
      id: nextId++,
      type,
      title,
      body,
      timestamp: new Date(),
      read: false,
    }
    setNotifications((prev) => {
      const updated = [notification, ...prev]
      saveNotificationsToStorage(updated)
      return updated
    })
    setToasts((prev) => [...prev, notification])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== notification.id))
    }, 4000)

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }))
      saveNotificationsToStorage(updated)
      return updated
    })
  }, [])

  const clearOne = useCallback((id: number) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id)
      saveNotificationsToStorage(updated)
      return updated
    })
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    saveNotificationsToStorage([])
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, toasts, notify, markAllRead, clearOne, clearAll, unreadCount, requestPermission }
}
