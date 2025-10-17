import { supabase } from '../lib/supabase'
import { UnifiedNotificationService } from './UnifiedNotificationService'

export interface OnlineStatus {
  user_id: string
  is_online: boolean
  last_seen: string
  status_message?: string
}

export interface LiveUpdate {
  id: string
  type: 'task_update' | 'message' | 'application' | 'status_change' | 'location_update'
  user_id: string
  data: any
  timestamp: string
}

export interface TypingIndicator {
  user_id: string
  chat_id: string
  is_typing: boolean
  timestamp: string
}

export class RealtimeService {
  private static channels: Map<string, any> = new Map()
  private static isInitialized = false
  private static currentUserId: string | null = null

  // Initialize real-time service
  static async initialize(userId: string): Promise<void> {
    try {
      this.currentUserId = userId
      await this.subscribeToUserUpdates()
      await this.subscribeToTaskUpdates()
      await this.subscribeToChatUpdates()
      await this.subscribeToApplicationUpdates()
      this.isInitialized = true
      console.log('RealtimeService initialized for user:', userId)
    } catch (error) {
      console.error('Error initializing RealtimeService:', error)
    }
  }

  // Subscribe to user-specific updates
  private static async subscribeToUserUpdates(): Promise<void> {
    if (!this.currentUserId) return

    const channel = supabase
      .channel('user-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${this.currentUserId}`
        },
        (payload) => {
          console.log('Profile update received:', payload)
          this.handleProfileUpdate(payload)
        }
      )
      .subscribe()

    this.channels.set('user-updates', channel)
  }

  // Subscribe to task updates
  private static async subscribeToTaskUpdates(): Promise<void> {
    if (!this.currentUserId) return

    const channel = supabase
      .channel('task-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `or(customer_id.eq.${this.currentUserId},tasker_id.eq.${this.currentUserId})`
        },
        (payload) => {
          console.log('Task update received:', payload)
          this.handleTaskUpdate(payload)
        }
      )
      .subscribe()

    this.channels.set('task-updates', channel)
  }

  // Subscribe to chat updates
  private static async subscribeToChatUpdates(): Promise<void> {
    if (!this.currentUserId) return

    const channel = supabase
      .channel('chat-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id.eq.${this.currentUserId}`
        },
        (payload) => {
          console.log('Message update received:', payload)
          this.handleMessageUpdate(payload)
        }
      )
      .subscribe()

    this.channels.set('chat-updates', channel)
  }

  // Subscribe to application updates
  private static async subscribeToApplicationUpdates(): Promise<void> {
    if (!this.currentUserId) return

    const channel = supabase
      .channel('application-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_applications',
          filter: `tasker_id.eq.${this.currentUserId}`
        },
        (payload) => {
          console.log('Application update received:', payload)
          this.handleApplicationUpdate(payload)
        }
      )
      .subscribe()

    this.channels.set('application-updates', channel)
  }

  // Handle profile updates
  private static handleProfileUpdate(payload: any): void {
    const { eventType, new: newData, old: oldData } = payload

    if (eventType === 'UPDATE') {
      // Check if verification status changed
      if (newData.verification_score !== oldData.verification_score) {
        UnifiedNotificationService.createNotification(
          this.currentUserId!,
          'Verification Status Updated',
          'Your verification status has been updated.',
          'system',
          { verification_score: newData.verification_score }
        )
      }

      // Check if rating changed
      if (newData.rating !== oldData.rating) {
        UnifiedNotificationService.createNotification(
          this.currentUserId!,
          'Rating Updated',
          `Your rating has been updated to ${newData.rating} stars.`,
          'system',
          { rating: newData.rating }
        )
      }
    }
  }

  // Handle task updates
  private static handleTaskUpdate(payload: any): void {
    const { eventType, new: newData, old: oldData } = payload

    if (eventType === 'UPDATE') {
      // Check if status changed
      if (newData.status !== oldData.status) {
        const statusMessages = {
          'assigned': 'Your task has been assigned to a tasker.',
          'in_progress': 'Your task is now in progress.',
          'completed': 'Your task has been completed.',
          'cancelled': 'Your task has been cancelled.'
        }

        const message = statusMessages[newData.status as keyof typeof statusMessages]
        if (message) {
          UnifiedNotificationService.createNotification(
            this.currentUserId!,
            'Task Status Update',
            message,
            'task',
            { task_id: newData.id, status: newData.status }
          )
        }
      }

      // Check if tasker was assigned
      if (!oldData.tasker_id && newData.tasker_id) {
        UnifiedNotificationService.createNotification(
          this.currentUserId!,
          'Task Assigned',
          'A tasker has been assigned to your task.',
          'task',
          { task_id: newData.id, tasker_id: newData.tasker_id }
        )
      }
    }
  }

  // Handle message updates
  private static handleMessageUpdate(payload: any): void {
    const { eventType, new: newData } = payload

    if (eventType === 'INSERT') {
      // New message received
      UnifiedNotificationService.createNotification(
        this.currentUserId!,
        'New Message',
        newData.content || 'You have a new message.',
        'message',
        { 
          message_id: newData.id, 
          chat_id: newData.chat_id,
          sender_id: newData.sender_id 
        }
      )
    }
  }

  // Handle application updates
  private static handleApplicationUpdate(payload: any): void {
    const { eventType, new: newData, old: oldData } = payload

    if (eventType === 'UPDATE') {
      // Check if application status changed
      if (newData.status !== oldData.status) {
        const statusMessages = {
          'accepted': 'Your application has been accepted!',
          'rejected': 'Your application was not selected this time.'
        }

        const message = statusMessages[newData.status as keyof typeof statusMessages]
        if (message) {
          UnifiedNotificationService.createNotification(
            this.currentUserId!,
            'Application Update',
            message,
            'application',
            { 
              application_id: newData.id, 
              task_id: newData.task_id,
              status: newData.status 
            }
          )
        }
      }
    }
  }

  // Update user online status
  static async updateOnlineStatus(isOnline: boolean, statusMessage?: string): Promise<boolean> {
    if (!this.currentUserId) return false

    try {
      const { error } = await supabase
        .from('user_online_status')
        .upsert({
          user_id: this.currentUserId,
          is_online: isOnline,
          last_seen: new Date().toISOString(),
          status_message: statusMessage
        })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating online status:', error)
      return false
    }
  }

  // Get user online status
  static async getUserOnlineStatus(userId: string): Promise<OnlineStatus | null> {
    try {
      const { data, error } = await supabase
        .from('user_online_status')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting online status:', error)
      return null
    }
  }

  // Get multiple users' online status
  static async getMultipleUsersOnlineStatus(userIds: string[]): Promise<OnlineStatus[]> {
    try {
      const { data, error } = await supabase
        .from('user_online_status')
        .select('*')
        .in('user_id', userIds)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting multiple users online status:', error)
      return []
    }
  }

  // Send typing indicator
  static async sendTypingIndicator(chatId: string, isTyping: boolean): Promise<boolean> {
    if (!this.currentUserId) return false

    try {
      const channel = supabase.channel(`typing-${chatId}`)
      
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: this.currentUserId,
          chat_id: chatId,
          is_typing: isTyping,
          timestamp: new Date().toISOString()
        }
      })

      return true
    } catch (error) {
      console.error('Error sending typing indicator:', error)
      return false
    }
  }

  // Subscribe to typing indicators
  static subscribeToTypingIndicators(
    chatId: string,
    onTypingUpdate: (indicator: TypingIndicator) => void
  ): () => void {
    const channel = supabase.channel(`typing-${chatId}`)
    
    channel.on('broadcast', { event: 'typing' }, (payload) => {
      onTypingUpdate(payload.payload)
    })
    
    channel.subscribe()

    // Return unsubscribe function
    return () => {
      channel.unsubscribe()
    }
  }

  // Send live update
  static async sendLiveUpdate(
    type: LiveUpdate['type'],
    data: any,
    targetUserId?: string
  ): Promise<boolean> {
    if (!this.currentUserId) return false

    try {
      const update: LiveUpdate = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        user_id: this.currentUserId,
        data,
        timestamp: new Date().toISOString()
      }

      // If target user is specified, send directly to them
      if (targetUserId) {
        const channel = supabase.channel(`live-updates-${targetUserId}`)
        await channel.send({
          type: 'broadcast',
          event: 'live_update',
          payload: update
        })
      } else {
        // Broadcast to all users (for general updates)
        const channel = supabase.channel('live-updates')
        await channel.send({
          type: 'broadcast',
          event: 'live_update',
          payload: update
        })
      }

      return true
    } catch (error) {
      console.error('Error sending live update:', error)
      return false
    }
  }

  // Subscribe to live updates
  static subscribeToLiveUpdates(
    onLiveUpdate: (update: LiveUpdate) => void
  ): () => void {
    const channel = supabase.channel('live-updates')
    
    channel.on('broadcast', { event: 'live_update' }, (payload) => {
      onLiveUpdate(payload.payload)
    })
    
    channel.subscribe()

    // Return unsubscribe function
    return () => {
      channel.unsubscribe()
    }
  }

  // Subscribe to user-specific live updates
  static subscribeToUserLiveUpdates(
    userId: string,
    onLiveUpdate: (update: LiveUpdate) => void
  ): () => void {
    const channel = supabase.channel(`live-updates-${userId}`)
    
    channel.on('broadcast', { event: 'live_update' }, (payload) => {
      onLiveUpdate(payload.payload)
    })
    
    channel.subscribe()

    // Return unsubscribe function
    return () => {
      channel.unsubscribe()
    }
  }

  // Get real-time task statistics
  static async getRealtimeTaskStats(): Promise<{
    active_tasks: number
    completed_today: number
    new_applications: number
    online_taskers: number
  }> {
    try {
      // Get active tasks
      const { count: activeTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'assigned', 'in_progress'])

      // Get completed tasks today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { count: completedToday } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', today.toISOString())

      // Get new applications today
      const { count: newApplications } = await supabase
        .from('task_applications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      // Get online taskers
      const { count: onlineTaskers } = await supabase
        .from('user_online_status')
        .select('*', { count: 'exact', head: true })
        .eq('is_online', true)

      return {
        active_tasks: activeTasks || 0,
        completed_today: completedToday || 0,
        new_applications: newApplications || 0,
        online_taskers: onlineTaskers || 0
      }
    } catch (error) {
      console.error('Error getting realtime task stats:', error)
      return {
        active_tasks: 0,
        completed_today: 0,
        new_applications: 0,
        online_taskers: 0
      }
    }
  }

  // Cleanup all subscriptions
  static async cleanup(): Promise<void> {
    try {
      // Unsubscribe from all channels
      for (const [name, channel] of this.channels) {
        await channel.unsubscribe()
      }
      
      this.channels.clear()
      this.isInitialized = false
      this.currentUserId = null
      
      console.log('RealtimeService cleaned up')
    } catch (error) {
      console.error('Error cleaning up RealtimeService:', error)
    }
  }
}
