import { supabase } from '../lib/supabase'
import { UnifiedNotificationService } from './UnifiedNotificationService'

export interface Chat {
  id: string
  task_id: string
  customer_id: string
  tasker_id: string
  last_message_at: string | null
  last_message_text: string | null
  last_message_sender_id: string | null
  created_at: string
  updated_at: string
  // Populated fields
  task?: {
    id: string
    title: string
    status: string
  }
  customer?: {
    id: string
    full_name: string
    avatar_url: string | null
    phone: string
  }
  tasker?: {
    id: string
    full_name: string
    avatar_url: string | null
    phone: string
  }
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  message: string
  message_type: 'text' | 'image' | 'file' | 'system'
  is_read: boolean
  created_at: string
  updated_at: string
  // Populated fields
  sender?: {
    id: string
    full_name: string
    avatar_url: string | null
    phone: string
  }
}

export class ChatService {
  // Get all chats for a user
  static async getUserChats(userId: string): Promise<Chat[]> {
    try {
      console.log('🚀 CHAT SERVICE - Getting user chats for userId:', userId)
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          task:task_id (
            id,
            title,
            status
          ),
          customer:customer_id (
            id,
            full_name,
            avatar_url,
            phone
          ),
          tasker:tasker_id (
            id,
            full_name,
            avatar_url,
            phone
          )
        `)
        .or(`customer_id.eq.${userId},tasker_id.eq.${userId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (error) {
        console.error('🚀 CHAT SERVICE - Error getting user chats:', error)
        throw error
      }

      console.log('🚀 CHAT SERVICE - Found chats:', data)

      // Get unread counts for each chat
      const chatsWithUnreadCounts = await Promise.all(
        (data || []).map(async (chat) => {
          const unreadCount = await this.getUnreadCount(chat.id, userId)
          return { ...chat, unread_count: unreadCount }
        })
      )

      return chatsWithUnreadCounts
    } catch (error) {
      console.error('Error getting user chats:', error)
      return []
    }
  }

  // Get or create a chat for a task
  static async getOrCreateChat(taskId: string, customerId: string, taskerId: string): Promise<Chat | null> {
    try {
      console.log('🚀 CHAT SERVICE - Getting or creating chat:', {
        taskId,
        customerId,
        taskerId
      })

      // First, try to find existing chat
      console.log('🚀 CHAT SERVICE - Searching for existing chat...')
      const { data: existingChat, error: findError } = await supabase
        .from('chats')
        .select(`
          *,
          task:task_id (
            id,
            title,
            status
          ),
          customer:customer_id (
            id,
            full_name,
            avatar_url,
            phone
          ),
          tasker:tasker_id (
            id,
            full_name,
            avatar_url,
            phone
          )
        `)
        .eq('task_id', taskId)
        .eq('customer_id', customerId)
        .eq('tasker_id', taskerId)
        .single()

      console.log('🚀 CHAT SERVICE - Search result:', { existingChat, findError })

      if (existingChat && !findError) {
        console.log('🚀 CHAT SERVICE - Found existing chat:', existingChat)
        return existingChat
      }

      console.log('🚀 CHAT SERVICE - No existing chat found, creating new one')

      // Create new chat if it doesn't exist
      console.log('🚀 CHAT SERVICE - Inserting new chat with data:', {
        task_id: taskId,
        customer_id: customerId,
        tasker_id: taskerId
      })
      
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          task_id: taskId,
          customer_id: customerId,
          tasker_id: taskerId
        })
        .select(`
          *,
          task:task_id (
            id,
            title,
            status
          ),
          customer:customer_id (
            id,
            full_name,
            avatar_url,
            phone
          ),
          tasker:tasker_id (
            id,
            full_name,
            avatar_url,
            phone
          )
        `)
        .single()

      if (createError) {
        console.error('🚀 CHAT SERVICE - Error creating chat:', createError)
        throw createError
      }
      
      console.log('🚀 CHAT SERVICE - Chat created successfully:', newChat)
      return newChat
    } catch (error) {
      console.error('🚀 CHAT SERVICE - Error in getOrCreateChat:', error)
      return null
    }
  }

  // Get messages for a chat
  static async getChatMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages_new')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      
      // Get sender information separately
      const messages = data || []
      const messagesWithSenders = await Promise.all(
        messages.map(async (message) => {
          const { data: senderData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, phone')
            .eq('id', message.sender_id)
            .single()
          
          return {
            ...message,
            sender: senderData
          }
        })
      )
      
      return messagesWithSenders.reverse() // Reverse to show oldest first
    } catch (error) {
      console.error('Error getting chat messages:', error)
      return []
    }
  }

  // Send a message
  static async sendMessage(chatId: string, senderId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text'): Promise<Message | null> {
    try {
      console.log('🚀 CHAT SERVICE - Sending message:', {
        chatId,
        senderId,
        content,
        messageType
      })

      const { data, error } = await supabase
        .from('messages_new')
        .insert({
          chat_id: chatId,
          sender_id: senderId,
          message: content,
          message_type: messageType
        })
        .select('*')
        .single()

      if (error) {
        console.error('🚀 CHAT SERVICE - Error inserting message:', error)
        throw error
      }

      console.log('🚀 CHAT SERVICE - Message inserted successfully:', data)
      
      // Get sender information
      const { data: senderData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone')
        .eq('id', senderId)
        .single()
      
      const messageWithSender = {
        ...data,
        sender: senderData
      }
      
      // Update chat's last message info
      await this.updateChatLastMessage(chatId, content, senderId)
      
      // Send notification to the other participant
      try {
        // Get chat details to find the other participant
        const { data: chatData } = await supabase
          .from('chats')
          .select('customer_id, tasker_id, task_id')
          .eq('id', chatId)
          .single()

        if (chatData) {
          const receiverId = chatData.customer_id === senderId ? chatData.tasker_id : chatData.customer_id
          
          if (receiverId) {
            // Get sender name for notification
            const senderName = messageWithSender.sender?.full_name || 'Unknown'
            
            await UnifiedNotificationService.notifyNewMessage(
              chatId,
              senderId,
              receiverId,
              content,
              senderName
            )
            console.log('🚀 CHAT SERVICE - Message notification sent for chat:', chatId)
          }
        }
      } catch (notificationError) {
        console.error('Error sending message notification:', notificationError)
        // Don't throw here - message should be sent even if notification fails
      }
      
      return messageWithSender
    } catch (error) {
      console.error('Error sending message:', error)
      return null
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(chatId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages_new')
        .update({
          is_read: true
        })
        .eq('chat_id', chatId)
        .neq('sender_id', userId) // Don't mark own messages as read

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error marking messages as read:', error)
      return false
    }
  }

  // Get unread count for a chat
  static async getUnreadCount(chatId: string, userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('messages_new')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .eq('is_read', false)
        .neq('sender_id', userId)

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  // Get total unread count for user
  static async getTotalUnreadCount(userId: string): Promise<number> {
    try {
      const { data: chats } = await supabase
        .from('chats')
        .select('id')
        .or(`customer_id.eq.${userId},tasker_id.eq.${userId}`)

      if (!chats || chats.length === 0) return 0

      let totalUnread = 0
      for (const chat of chats) {
        const unreadCount = await this.getUnreadCount(chat.id, userId)
        totalUnread += unreadCount
      }

      return totalUnread
    } catch (error) {
      console.error('Error getting total unread count:', error)
      return 0
    }
  }

  // Update chat last message info
  static async updateChatLastMessage(chatId: string, messageText: string, senderId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ 
          last_message_at: new Date().toISOString(),
          last_message_text: messageText,
          last_message_sender_id: senderId
        })
        .eq('id', chatId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating chat last message:', error)
      return false
    }
  }

  // Delete a message (only sender can delete)
  static async deleteMessage(messageId: string, senderId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages_new')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', senderId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting message:', error)
      return false
    }
  }

  // Get chat by ID
  static async getChatById(chatId: string): Promise<Chat | null> {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          task:task_id (
            id,
            title,
            status
          ),
          customer:customer_id (
            id,
            full_name,
            avatar_url,
            phone
          ),
          tasker:tasker_id (
            id,
            full_name,
            avatar_url,
            phone
          )
        `)
        .eq('id', chatId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting chat by ID:', error)
      return null
    }
  }

  // Get chat messages by chat ID (alias for getChatMessages)
  static async getChatMessagesByChatId(chatId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    return this.getChatMessages(chatId, limit, offset)
  }

  // Subscribe to chat for real-time updates (delegate to RealtimeChatService)
  static async subscribeToChat(chatId: string, callbacks: {
    onMessage: (message: any) => void
    onTyping?: (userId: string, isTyping: boolean) => void
    onUserOnline?: (userId: string, isOnline: boolean) => void
  }): Promise<any> {
    const { RealtimeChatService } = await import('./RealtimeChatService')
    return RealtimeChatService.subscribeToChat(chatId, callbacks)
  }

  // Unsubscribe from chat (delegate to RealtimeChatService)
  static unsubscribeFromChat(chatId: string): void {
    // This will be handled by RealtimeChatService
    const { RealtimeChatService } = require('./RealtimeChatService')
    RealtimeChatService.unsubscribeFromChat(chatId)
  }

  // Send typing indicator (placeholder - can be implemented later)
  static async sendTypingIndicator(chatId: string, isTyping: boolean): Promise<void> {
    // This is a placeholder - typing indicators can be implemented later
    console.log(`Typing indicator: ${isTyping} for chat ${chatId}`)
  }

  // Send message to chat (alias for sendMessage)
  static async sendMessageToChat(chatId: string, messageText: string, senderId: string): Promise<boolean> {
    const message = await this.sendMessage(chatId, senderId, messageText)
    return message !== null
  }
}