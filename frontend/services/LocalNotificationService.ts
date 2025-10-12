import AsyncStorage from '@react-native-async-storage/async-storage'

export interface LocalNotification {
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

export class LocalNotificationService {
  private static STORAGE_KEY = 'local_notifications'

  // Get all notifications for a user
  static async getUserNotifications(userId: string, limit: number = 50): Promise<LocalNotification[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []

      const allNotifications: LocalNotification[] = JSON.parse(stored)
      const userNotifications = allNotifications
        .filter(n => n.user_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit)

      return userNotifications
    } catch (error) {
      console.error('Error getting local notifications:', error)
      return []
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const notifications = await this.getUserNotifications(userId)
      return notifications.filter(n => !n.is_read).length
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY)
      if (!stored) return false

      const notifications: LocalNotification[] = JSON.parse(stored)
      const updatedNotifications = notifications.map(n => 
        n.id === notificationId 
          ? { ...n, is_read: true, updated_at: new Date().toISOString() }
          : n
      )

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedNotifications))
      return true
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY)
      if (!stored) return false

      const notifications: LocalNotification[] = JSON.parse(stored)
      const updatedNotifications = notifications.map(n => 
        n.user_id === userId && !n.is_read
          ? { ...n, is_read: true, updated_at: new Date().toISOString() }
          : n
      )

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedNotifications))
      return true
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }
  }

  // Create a new notification
  static async createNotification(
    userId: string,
    title: string,
    message: string,
    type: LocalNotification['type'],
    data?: any
  ): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY)
      const notifications: LocalNotification[] = stored ? JSON.parse(stored) : []

      const newNotification: LocalNotification = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        title,
        message,
        type,
        data: data || {},
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      notifications.push(newNotification)
      
      // Keep only the last 100 notifications to prevent storage bloat
      const trimmedNotifications = notifications.slice(-100)
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedNotifications))
      return true
    } catch (error) {
      console.error('Error creating local notification:', error)
      return false
    }
  }

  // Delete a notification
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY)
      if (!stored) return false

      const notifications: LocalNotification[] = JSON.parse(stored)
      const updatedNotifications = notifications.filter(n => n.id !== notificationId)

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedNotifications))
      return true
    } catch (error) {
      console.error('Error deleting local notification:', error)
      return false
    }
  }

  // Create task-related notifications
  static async createTaskNotification(
    userId: string,
    taskTitle: string,
    type: 'created' | 'updated' | 'completed' | 'cancelled',
    taskId?: string
  ): Promise<boolean> {
    const notifications = {
      created: {
        title: 'New Task Posted',
        message: `Your task "${taskTitle}" has been posted and is now visible to taskers.`
      },
      updated: {
        title: 'Task Updated',
        message: `Your task "${taskTitle}" has been updated.`
      },
      completed: {
        title: 'Task Completed',
        message: `Your task "${taskTitle}" has been completed successfully!`
      },
      cancelled: {
        title: 'Task Cancelled',
        message: `Your task "${taskTitle}" has been cancelled.`
      }
    }

    const notification = notifications[type]
    return await this.createNotification(
      userId,
      notification.title,
      notification.message,
      'task',
      { taskId, taskTitle }
    )
  }

  // Create message notifications
  static async createMessageNotification(
    userId: string,
    senderName: string,
    message: string,
    taskTitle: string,
    taskId?: string
  ): Promise<boolean> {
    return await this.createNotification(
      userId,
      'New Message',
      `${senderName} sent you a message about "${taskTitle}": ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
      'message',
      { taskId, taskTitle, senderName }
    )
  }

  // Create application notifications
  static async createApplicationNotification(
    userId: string,
    taskTitle: string,
    type: 'received' | 'accepted' | 'rejected',
    taskerName?: string,
    taskId?: string
  ): Promise<boolean> {
    const notifications = {
      received: {
        title: 'New Application',
        message: `${taskerName} has applied for your task "${taskTitle}".`
      },
      accepted: {
        title: 'Application Accepted',
        message: `Your application for "${taskTitle}" has been accepted!`
      },
      rejected: {
        title: 'Application Rejected',
        message: `Your application for "${taskTitle}" has been rejected.`
      }
    }

    const notification = notifications[type]
    return await this.createNotification(
      userId,
      notification.title,
      notification.message,
      'application',
      { taskId, taskTitle, taskerName }
    )
  }

  // Create booking notifications
  static async createBookingNotification(
    userId: string,
    taskTitle: string,
    type: 'scheduled' | 'confirmed' | 'cancelled',
    taskId?: string
  ): Promise<boolean> {
    const notifications = {
      scheduled: {
        title: 'Task Scheduled',
        message: `Your task "${taskTitle}" has been scheduled.`
      },
      confirmed: {
        title: 'Booking Confirmed',
        message: `Your booking for "${taskTitle}" has been confirmed.`
      },
      cancelled: {
        title: 'Booking Cancelled',
        message: `Your booking for "${taskTitle}" has been cancelled.`
      }
    }

    const notification = notifications[type]
    return await this.createNotification(
      userId,
      notification.title,
      notification.message,
      'booking',
      { taskId, taskTitle }
    )
  }

  // Create payment notifications
  static async createPaymentNotification(
    userId: string,
    amount: number,
    type: 'received' | 'sent' | 'refunded',
    taskTitle?: string
  ): Promise<boolean> {
    const notifications = {
      received: {
        title: 'Payment Received',
        message: `You received $${amount}${taskTitle ? ` for "${taskTitle}"` : ''}.`
      },
      sent: {
        title: 'Payment Sent',
        message: `You sent $${amount}${taskTitle ? ` for "${taskTitle}"` : ''}.`
      },
      refunded: {
        title: 'Payment Refunded',
        message: `You received a refund of $${amount}${taskTitle ? ` for "${taskTitle}"` : ''}.`
      }
    }

    const notification = notifications[type]
    return await this.createNotification(
      userId,
      notification.title,
      notification.message,
      'payment',
      { amount, taskTitle }
    )
  }

  // Create system notifications
  static async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    data?: any
  ): Promise<boolean> {
    return await this.createNotification(
      userId,
      title,
      message,
      'system',
      data
    )
  }
}
