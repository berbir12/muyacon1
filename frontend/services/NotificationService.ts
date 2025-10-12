import { supabase } from '../lib/supabase'
import { LocalNotificationService } from './LocalNotificationService'

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

export class NotificationService {
  // Get all notifications for a user
  static async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Database error getting notifications:', error)
        // Fallback to local storage if database is not available
        console.log('Falling back to local notifications')
        return await LocalNotificationService.getUserNotifications(userId, limit)
      }
      return notifications || []
    } catch (error) {
      console.error('Error getting user notifications:', error)
      return []
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) {
        console.error('Database error getting unread count:', error)
        // Fallback to local storage if database is not available
        console.log('Falling back to local notification count')
        return await LocalNotificationService.getUnreadCount(userId)
      }
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
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) {
        console.error('Database error marking notification as read:', error)
        // Fallback to local storage if database is not available
        console.log('Falling back to local notification marking')
        return await LocalNotificationService.markAsRead(notificationId)
      }
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
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) {
        console.error('Database error marking all notifications as read:', error)
        // Fallback to local storage if database is not available
        console.log('Falling back to local notification marking all')
        return await LocalNotificationService.markAllAsRead(userId)
      }
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
    type: Notification['type'],
    data?: any
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          title,
          message,
          type,
          data: data || {},
          is_read: false
        }])

      if (error) {
        console.error('Database error creating notification:', error)
        // Fallback to local storage if database is not available
        console.log('Falling back to local notification creation')
        return await LocalNotificationService.createNotification(userId, title, message, type, data)
      }
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

      if (error) {
        console.error('Database error deleting notification:', error)
        return false
      }
      return true
    } catch (error) {
      console.error('Error deleting notification:', error)
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
