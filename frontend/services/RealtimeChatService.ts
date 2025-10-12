import { supabase } from '../lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeMessage {
  id: string
  chat_id: string
  sender_id: string
  receiver_id?: string
  message: string
  message_type: 'text' | 'image' | 'file'
  created_at: string
  updated_at: string
  sender_name?: string
  sender_avatar?: string
}

export interface ChatSubscription {
  chatId: string
  onMessage: (message: RealtimeMessage) => void
  onTyping: (userId: string, isTyping: boolean) => void
  onUserOnline: (userId: string, isOnline: boolean) => void
}

export class RealtimeChatService {
  private static channels: Map<string, RealtimeChannel> = new Map()
  private static typingUsers: Map<string, Set<string>> = new Map()
  private static onlineUsers: Set<string> = new Set()

  // Subscribe to a chat for real-time updates
  static async subscribeToChat(chatId: string, callbacks: {
    onMessage?: (message: RealtimeMessage) => void
    onTyping?: (userId: string, isTyping: boolean) => void
    onUserOnline?: (userId: string, isOnline: boolean) => void
  }): Promise<RealtimeChannel | null> {
    try {
      // Unsubscribe from existing channel if it exists
      if (this.channels.has(chatId)) {
        await this.unsubscribeFromChat(chatId)
      }

      const channel = supabase
        .channel(`chat:${chatId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`
          },
          async (payload) => {
            console.log('New message received:', payload)
            
            if (callbacks.onMessage) {
              // Get sender details
              const { data: sender } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', payload.new.sender_id)
                .single()

              const message: RealtimeMessage = {
                id: payload.new.id,
                chat_id: payload.new.chat_id,
                sender_id: payload.new.sender_id,
                receiver_id: payload.new.receiver_id,
                message: payload.new.message,
                message_type: payload.new.message_type || 'text',
                created_at: payload.new.created_at,
                updated_at: payload.new.updated_at,
                sender_name: sender?.full_name,
                sender_avatar: sender?.avatar_url
              }

              callbacks.onMessage(message)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`
          },
          async (payload) => {
            console.log('Message updated:', payload)
            
            if (callbacks.onMessage) {
              // Get sender details
              const { data: sender } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', payload.new.sender_id)
                .single()

              const message: RealtimeMessage = {
                id: payload.new.id,
                chat_id: payload.new.chat_id,
                sender_id: payload.new.sender_id,
                receiver_id: payload.new.receiver_id,
                message: payload.new.message,
                message_type: payload.new.message_type || 'text',
                created_at: payload.new.created_at,
                updated_at: payload.new.updated_at,
                sender_name: sender?.full_name,
                sender_avatar: sender?.avatar_url
              }

              callbacks.onMessage(message)
            }
          }
        )
        .on('presence', { event: 'sync' }, () => {
          console.log('Presence synced')
          const state = channel.presenceState()
          console.log('Online users:', state)
          
          if (callbacks.onUserOnline) {
            Object.keys(state).forEach(userId => {
              if (!this.onlineUsers.has(userId)) {
                this.onlineUsers.add(userId)
                callbacks.onUserOnline(userId, true)
              }
            })
          }
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', key, newPresences)
          if (callbacks.onUserOnline) {
            callbacks.onUserOnline(key, true)
          }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left:', key, leftPresences)
          if (callbacks.onUserOnline) {
            callbacks.onUserOnline(key, false)
          }
        })
        .subscribe(async (status) => {
          console.log('Chat subscription status:', status)
          if (status === 'SUBSCRIBED') {
            // Track user presence
            await channel.track({
              user_id: (await supabase.auth.getUser()).data.user?.id,
              online_at: new Date().toISOString()
            })
          }
        })

      this.channels.set(chatId, channel)
      return channel
    } catch (error) {
      console.error('Error subscribing to chat:', error)
      return null
    }
  }

  // Unsubscribe from a chat
  static async unsubscribeFromChat(chatId: string): Promise<void> {
    try {
      const channel = this.channels.get(chatId)
      if (channel) {
        await supabase.removeChannel(channel)
        this.channels.delete(chatId)
        console.log(`Unsubscribed from chat: ${chatId}`)
      }
    } catch (error) {
      console.error('Error unsubscribing from chat:', error)
    }
  }

  // Send a message
  static async sendMessage(chatId: string, message: string, messageType: 'text' | 'image' | 'file' = 'text'): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No authenticated user')
        return false
      }

      // Get chat details to find receiver
      const { data: chat } = await supabase
        .from('chats')
        .select('customer_id, tasker_id')
        .eq('id', chatId)
        .single()

      if (!chat) {
        console.error('Chat not found')
        return false
      }

      const receiverId = user.id === chat.customer_id ? chat.tasker_id : chat.customer_id

      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          receiver_id: receiverId,
          message,
          message_type: messageType
        })

      if (error) {
        console.error('Error sending message:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  // Send typing indicator
  static async sendTypingIndicator(chatId: string, isTyping: boolean): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = this.channels.get(chatId)
      if (channel) {
        await channel.track({
          user_id: user.id,
          typing: isTyping,
          online_at: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error sending typing indicator:', error)
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(chatId: string, messageIds: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', messageIds)

      if (error) {
        console.error('Error marking messages as read:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error marking messages as read:', error)
      return false
    }
  }

  // Get unread message count for a chat
  static async getUnreadCount(chatId: string): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 0

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .neq('sender_id', user.id)
        .is('read_at', null)

      if (error) {
        console.error('Error getting unread count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  // Get all unread counts for user's chats
  static async getAllUnreadCounts(): Promise<Map<string, number>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return new Map()

      const { data: chats } = await supabase
        .from('chats')
        .select('id')
        .or(`customer_id.eq.${user.id},tasker_id.eq.${user.id}`)

      if (!chats) return new Map()

      const unreadCounts = new Map<string, number>()

      for (const chat of chats) {
        const count = await this.getUnreadCount(chat.id)
        unreadCounts.set(chat.id, count)
      }

      return unreadCounts
    } catch (error) {
      console.error('Error getting all unread counts:', error)
      return new Map()
    }
  }

  // Cleanup all subscriptions
  static async cleanup(): Promise<void> {
    try {
      for (const [chatId, channel] of this.channels) {
        await supabase.removeChannel(channel)
      }
      this.channels.clear()
      this.typingUsers.clear()
      this.onlineUsers.clear()
      console.log('Cleaned up all chat subscriptions')
    } catch (error) {
      console.error('Error cleaning up subscriptions:', error)
    }
  }

  // Get online users for a chat
  static getOnlineUsers(chatId: string): string[] {
    const channel = this.channels.get(chatId)
    if (!channel) return []

    const state = channel.presenceState()
    return Object.keys(state)
  }

  // Check if user is typing
  static isUserTyping(chatId: string, userId: string): boolean {
    const typingSet = this.typingUsers.get(chatId)
    return typingSet ? typingSet.has(userId) : false
  }

  // Check if user is online
  static isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId)
  }
}
