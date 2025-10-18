import { supabase } from '../lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { ChatService, Chat, Message } from './ChatService'

export interface RealtimeMessage extends Message {
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
    onMessage: (message: RealtimeMessage) => void
    onTyping?: (userId: string, isTyping: boolean) => void
    onUserOnline?: (userId: string, isOnline: boolean) => void
  }): Promise<RealtimeChannel | null> {
    try {
      // Unsubscribe from existing channel if any
      this.unsubscribeFromChat(chatId)

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
            
            // Get the full message with sender details
            const message = await ChatService.getChatMessages(chatId, 1, 0)
            if (message.length > 0) {
              const fullMessage = message[0] as RealtimeMessage
              callbacks.onMessage(fullMessage)
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
            
            // Get the updated message
            const message = await ChatService.getChatMessages(chatId, 1, 0)
            if (message.length > 0) {
              const fullMessage = message[0] as RealtimeMessage
              callbacks.onMessage(fullMessage)
            }
          }
        )
        .subscribe()

      this.channels.set(chatId, channel)
      return channel
    } catch (error) {
      console.error('Error subscribing to chat:', error)
      return null
    }
  }

  // Unsubscribe from a chat
  static unsubscribeFromChat(chatId: string): void {
    const channel = this.channels.get(chatId)
    if (channel) {
      supabase.removeChannel(channel)
      this.channels.delete(chatId)
    }
  }

  // Unsubscribe from all chats
  static unsubscribeFromAllChats(): void {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    this.channels.clear()
  }

  // Send a message
  static async sendMessage(chatId: string, senderId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text'): Promise<boolean> {
    try {
      const message = await ChatService.sendMessage(chatId, senderId, content, messageType)
      return message !== null
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(chatId: string, userId: string): Promise<boolean> {
    try {
      return await ChatService.markMessagesAsRead(chatId, userId)
    } catch (error) {
      console.error('Error marking messages as read:', error)
      return false
    }
  }

  // Get unread count for a chat
  static async getUnreadCount(chatId: string, userId: string): Promise<number> {
    try {
      return await ChatService.getUnreadCount(chatId, userId)
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  // Get all unread counts for user's chats
  static async getAllUnreadCounts(userId: string): Promise<Map<string, number>> {
    try {
      const chats = await ChatService.getUserChats(userId)
      const unreadCounts = new Map<string, number>()

      for (const chat of chats) {
        const count = await this.getUnreadCount(chat.id, userId)
        unreadCounts.set(chat.id, count)
      }

      return unreadCounts
    } catch (error) {
      console.error('Error getting all unread counts:', error)
      return new Map()
    }
  }

  // Get total unread count for user
  static async getTotalUnreadCount(userId: string): Promise<number> {
    try {
      return await ChatService.getTotalUnreadCount(userId)
    } catch (error) {
      console.error('Error getting total unread count:', error)
      return 0
    }
  }

  // Get chat messages
  static async getChatMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<RealtimeMessage[]> {
    try {
      const messages = await ChatService.getChatMessages(chatId, limit, offset)
      return messages as RealtimeMessage[]
    } catch (error) {
      console.error('Error getting chat messages:', error)
      return []
    }
  }

  // Get user chats
  static async getUserChats(userId: string): Promise<Chat[]> {
    try {
      return await ChatService.getUserChats(userId)
    } catch (error) {
      console.error('Error getting user chats:', error)
      return []
    }
  }

  // Get or create chat
  static async getOrCreateChat(taskId: string, customerId: string, taskerId: string): Promise<Chat | null> {
    try {
      return await ChatService.getOrCreateChat(taskId, customerId, taskerId)
    } catch (error) {
      console.error('Error getting/creating chat:', error)
      return null
    }
  }

  // Update chat status
  static async updateChatStatus(chatId: string, status: 'active' | 'archived' | 'blocked'): Promise<boolean> {
    try {
      return await ChatService.updateChatStatus(chatId, status)
    } catch (error) {
      console.error('Error updating chat status:', error)
      return false
    }
  }

  // Delete a message
  static async deleteMessage(messageId: string, senderId: string): Promise<boolean> {
    try {
      return await ChatService.deleteMessage(messageId, senderId)
    } catch (error) {
      console.error('Error deleting message:', error)
      return false
    }
  }

  // Get chat by ID
  static async getChatById(chatId: string): Promise<Chat | null> {
    try {
      return await ChatService.getChatById(chatId)
    } catch (error) {
      console.error('Error getting chat by ID:', error)
      return null
    }
  }
}