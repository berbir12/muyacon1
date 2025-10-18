import { supabase } from '../lib/supabase'

export interface Chat {
  id: string
  task_id: string
  customer_id: string
  tasker_id: string
  status: 'active' | 'archived' | 'blocked'
  last_message_at: string | null
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
  content: string
  message_type: 'text' | 'image' | 'file' | 'system'
  is_read: boolean
  read_at: string | null
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

      if (error) throw error

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
      // First, try to find existing chat
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

      if (existingChat && !findError) {
        return existingChat
      }

      // Create new chat if it doesn't exist
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          task_id: taskId,
          customer_id: customerId,
          tasker_id: taskerId,
          status: 'active'
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

      if (createError) throw createError
      return newChat
    } catch (error) {
      console.error('Error getting/creating chat:', error)
      return null
    }
  }

  // Get messages for a chat
  static async getChatMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            id,
            full_name,
            avatar_url,
            phone
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return (data || []).reverse() // Reverse to show oldest first
    } catch (error) {
      console.error('Error getting chat messages:', error)
      return []
    }
  }

  // Send a message
  static async sendMessage(chatId: string, senderId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text'): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: senderId,
          content,
          message_type: messageType
        })
        .select(`
          *,
          sender:sender_id (
            id,
            full_name,
            avatar_url,
            phone
          )
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error sending message:', error)
      return null
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(chatId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
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
        .from('messages')
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

  // Update chat status
  static async updateChatStatus(chatId: string, status: 'active' | 'archived' | 'blocked'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ status })
        .eq('id', chatId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating chat status:', error)
      return false
    }
  }

  // Delete a message (only sender can delete)
  static async deleteMessage(messageId: string, senderId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
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
}