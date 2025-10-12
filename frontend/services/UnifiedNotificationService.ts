import { supabase } from '../lib/supabase'
import { PushNotificationService } from './PushNotificationService'
import { SimpleNotificationService } from './SimpleNotificationService'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'task' | 'message' | 'application' | 'booking' | 'payment' | 'system'
  data?: any
  is_read: boolean
  created_at: string
  updated_at: string
}

export interface NotificationSubscription {
  onNotification: (notification: Notification) => void
  onUnreadCountChange: (count: number) => void
}

export class UnifiedNotificationService {
  private static subscriptions: Set<NotificationSubscription> = new Set()
  private static isSubscribed = false
  private static currentUserId: string | null = null

  // Initialize notification service
  static async initialize(userId: string): Promise<void> {
    try {
      this.currentUserId = userId
      
      // Register for push notifications
      await PushNotificationService.registerForPushNotifications()
      
      // Subscribe to real-time notifications
      await this.subscribeToNotifications()
      
      console.log('Notification service initialized for user:', userId)
    } catch (error) {
      console.error('Error initializing notification service:', error)
    }
  }

  // Subscribe to real-time notifications
  static async subscribeToNotifications(): Promise<void> {
    if (!this.currentUserId || this.isSubscribed) return

    try {
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${this.currentUserId}`
          },
          (payload) => {
            console.log('New notification received:', payload)
            const notification = payload.new as Notification
            
            // Send push notification
            this.sendPushNotification(notification)
            
            // Notify subscribers
            this.notifySubscribers(notification)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${this.currentUserId}`
          },
          (payload) => {
            console.log('Notification updated:', payload)
            const notification = payload.new as Notification
            
            // Notify subscribers
            this.notifySubscribers(notification)
          }
        )
        .subscribe()

      this.isSubscribed = true
      console.log('Subscribed to real-time notifications')
    } catch (error) {
      console.error('Error subscribing to notifications:', error)
    }
  }

  // Unsubscribe from notifications
  static async unsubscribe(): Promise<void> {
    try {
      await supabase.removeChannel(supabase.channel('notifications'))
      this.isSubscribed = false
      this.subscriptions.clear()
      this.currentUserId = null
      console.log('Unsubscribed from notifications')
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error)
    }
  }

  // Add a subscription
  static addSubscription(subscription: NotificationSubscription): void {
    this.subscriptions.add(subscription)
  }

  // Remove a subscription
  static removeSubscription(subscription: NotificationSubscription): void {
    this.subscriptions.delete(subscription)
  }

  // Notify all subscribers
  private static notifySubscribers(notification: Notification): void {
    this.subscriptions.forEach(sub => {
      try {
        sub.onNotification(notification)
      } catch (error) {
        console.error('Error notifying subscriber:', error)
      }
    })
  }

  // Send push notification
  private static async sendPushNotification(notification: Notification): Promise<void> {
    try {
      await PushNotificationService.sendLocalNotification(
        notification.title,
        notification.message,
        {
          type: notification.type,
          data: notification.data,
          notificationId: notification.id
        }
      )
    } catch (error) {
      console.error('Error sending push notification:', error)
    }
  }

  // Get all notifications for user
  static async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting notifications:', error)
      return []
    }
  }

  // Get unread count
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }
  }

  // Create a notification
  static async createNotification(
    userId: string,
    title: string,
    message: string,
    type: Notification['type'] = 'system',
    data?: any
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type,
          data: data || {},
          is_read: false
        })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error creating notification:', error)
      return false
    }
  }

  // Delete a notification
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting notification:', error)
      return false
    }
  }

  // Clear all notifications
  static async clearAllNotifications(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error clearing all notifications:', error)
      return false
    }
  }

  // Send notification to multiple users
  static async sendToMultipleUsers(
    userIds: string[],
    title: string,
    message: string,
    type: Notification['type'] = 'system',
    data?: any
  ): Promise<boolean> {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title,
        message,
        type,
        data: data || {},
        is_read: false
      }))

      const { error } = await supabase
        .from('notifications')
        .insert(notifications)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error sending notifications to multiple users:', error)
      return false
    }
  }

  // Get notification statistics
  static async getNotificationStats(userId: string): Promise<{
    total: number
    unread: number
    byType: Record<string, number>
  }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('type, is_read')
        .eq('user_id', userId)

      if (error) throw error

      const stats = {
        total: data.length,
        unread: data.filter(n => !n.is_read).length,
        byType: {} as Record<string, number>
      }

      data.forEach(notification => {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Error getting notification stats:', error)
      return { total: 0, unread: 0, byType: {} }
    }
  }

  // Cleanup
  static async cleanup(): Promise<void> {
    await this.unsubscribe()
  }
}
