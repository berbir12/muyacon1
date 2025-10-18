import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './SimpleAuthContext'
import { UnifiedNotificationService, Notification } from '../services/UnifiedNotificationService'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  refreshNotifications: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  clearAllNotifications: () => Promise<void>
  createNotification: (title: string, message: string, type?: Notification['type'], data?: any) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Initialize notification service when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.user_id) {
      initializeNotifications()
    } else {
      cleanupNotifications()
    }
  }, [isAuthenticated, user?.user_id])

  const initializeNotifications = async () => {
    if (!user?.user_id) return

    try {
      console.log('🚀 NOTIFICATION CONTEXT - Initializing notifications for user:', user.user_id)
      // Initialize the notification service
      await UnifiedNotificationService.initialize(user.user_id)

      // Add subscription for real-time updates
      const subscription = {
        onNotification: (notification: Notification) => {
          setNotifications(prev => [notification, ...prev])
          if (!notification.is_read) {
            setUnreadCount(prev => prev + 1)
          }
        },
        onUnreadCountChange: (count: number) => {
          setUnreadCount(count)
        }
      }

      UnifiedNotificationService.addSubscription(subscription)

      // Load initial notifications
      await refreshNotifications()
      console.log('✅ NOTIFICATION CONTEXT - Notifications initialized successfully')

      // Cleanup subscription on unmount
      return () => {
        UnifiedNotificationService.removeSubscription(subscription)
      }
    } catch (error) {
      console.error('Error initializing notifications:', error)
    }
  }

  const cleanupNotifications = async () => {
    try {
      await UnifiedNotificationService.cleanup()
      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error('Error cleaning up notifications:', error)
    }
  }

  const refreshNotifications = useCallback(async () => {
    if (!user?.user_id) return

    setLoading(true)
    try {
      console.log('🚀 NOTIFICATION CONTEXT - Refreshing notifications for user:', user.user_id)
      const [notificationsData, unreadCountData] = await Promise.all([
        UnifiedNotificationService.getNotifications(user.user_id),
        UnifiedNotificationService.getUnreadCount(user.user_id)
      ])

      console.log('📱 NOTIFICATION CONTEXT - Loaded notifications:', notificationsData.length, 'Unread:', unreadCountData)
      setNotifications(notificationsData)
      setUnreadCount(unreadCountData)
    } catch (error) {
      console.error('Error refreshing notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.user_id])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const success = await UnifiedNotificationService.markAsRead(notificationId)
      if (success) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!user?.user_id) return

    try {
      const success = await UnifiedNotificationService.markAllAsRead(user.user_id)
      if (success) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [user?.user_id])

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const success = await UnifiedNotificationService.deleteNotification(notificationId)
      if (success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        // Check if the deleted notification was unread
        const deletedNotification = notifications.find(n => n.id === notificationId)
        if (deletedNotification && !deletedNotification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }, [notifications])

  const clearAllNotifications = useCallback(async () => {
    if (!user?.user_id) return

    try {
      const success = await UnifiedNotificationService.clearAllNotifications(user.user_id)
      if (success) {
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error)
    }
  }, [user?.user_id])

  const createNotification = useCallback(async (
    title: string, 
    message: string, 
    type: Notification['type'] = 'system', 
    data?: any
  ) => {
    if (!user?.user_id) return

    try {
      await UnifiedNotificationService.createNotification(user.user_id, title, message, type, data)
    } catch (error) {
      console.error('Error creating notification:', error)
    }
  }, [user?.user_id])

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    createNotification
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
