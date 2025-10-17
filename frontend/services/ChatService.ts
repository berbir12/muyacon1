import { supabase } from '../lib/supabase'
import { SimpleNotificationService } from './SimpleNotificationService'
import { PushNotificationService } from './PushNotificationService'
import { RealtimeChatService, RealtimeMessage } from './RealtimeChatService'

export interface ChatMessage {
  id: string
  task_id: string
  sender_id: string
  message: string
  message_type?: 'text' | 'image' | 'file'
  created_at: string
  updated_at: string
  read_at?: string
  // Additional fields for display
  sender_name?: string
  sender_avatar?: string
}

export interface Chat {
  id: string
  task_id: string
  customer_id: string
  tasker_id: string
  created_at: string
  updated_at: string
  status?: string
  // Additional fields for display
  task_title?: string
  customer_name?: string
  tasker_name?: string
  last_message?: string
  last_message_time?: string
  unread_count?: number
}

export class ChatService {
  // Get all chats for a user
  static async getUserChats(userId: string): Promise<Chat[]> {
    try {
      console.log('ChatService: Getting chats for user:', userId)
      
      // Get tasks where user is either customer or tasker
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          customer_id,
          created_at,
          updated_at
        `)
        .eq('customer_id', userId)

      console.log('ChatService: Found tasks:', tasks?.length || 0, 'error:', tasksError)

      if (tasksError) {
        console.error('ChatService: Database error:', tasksError)
        throw tasksError
      }

      const chats: Chat[] = []
      
      for (const task of tasks || []) {
        // Get customer name
        const { data: customerData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', task.customer_id)
          .single()

        // For now, set tasker as null since tasker_id column doesn't exist yet
        let taskerName = null

        // Get latest message for this task
        const { data: latestMessage } = await supabase
          .from('messages')
          .select('*')
          .eq('task_id', task.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Get unread count
        const unreadCount = await SimpleNotificationService.getUnreadMessageCount(task.id, userId)

        chats.push({
          id: task.id,
          task_id: task.id,
          customer_id: task.customer_id,
          tasker_id: null, // Will be set when tasker is assigned
          created_at: task.created_at || new Date().toISOString(),
          updated_at: latestMessage?.created_at || task.updated_at || new Date().toISOString(),
          task_title: task.title,
          customer_name: customerData?.full_name,
          tasker_name: taskerName,
          last_message: latestMessage?.message || 'Task posted, waiting for applications',
          last_message_time: latestMessage?.created_at || task.updated_at || new Date().toISOString(),
          unread_count: unreadCount
        })
      }

      // Sort by last message time
      return chats.sort((a, b) => 
        new Date(b.last_message_time || b.updated_at).getTime() - 
        new Date(a.last_message_time || a.updated_at).getTime()
      )
    } catch (error) {
      console.error('Error getting user chats:', error)
      return []
    }
  }

  // Get or create chat between customer and tasker for a task
  static async getOrCreateChat(taskId: string, customerId: string, taskerId: string): Promise<Chat | null> {
    try {
      // Get task details
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          customer_id,
          created_at,
          updated_at
        `)
        .eq('id', taskId)
        .single()

      if (taskError) throw taskError

      // Get customer and tasker names
      const [customerResult, taskerResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', customerId).single(),
        supabase.from('profiles').select('full_name').eq('id', taskerId).single()
      ])

      return {
        id: taskId, // Use task ID directly as chat ID
        task_id: taskId,
        customer_id: customerId,
        tasker_id: taskerId,
        created_at: task.created_at || new Date().toISOString(),
        updated_at: task.updated_at || new Date().toISOString(),
        task_title: task.title,
        customer_name: customerResult.data?.full_name,
        tasker_name: taskerResult.data?.full_name,
        last_message: '',
        last_message_time: task.updated_at || new Date().toISOString(),
        unread_count: 0
      }
    } catch (error) {
      console.error('Error creating chat:', error)
      throw error
    }
  }

  // Send a message
  static async sendMessage(taskId: string, senderId: string, message: string): Promise<ChatMessage | null> {
    try {
      // Get task details to find the other participant
      const { data: task } = await supabase
        .from('tasks')
        .select('customer_id')
        .eq('id', taskId)
        .single()

      if (!task) {
        throw new Error('Task not found')
      }

      // For now, only customer can send messages (no tasker assigned yet)
      const recipientId = task.customer_id === senderId ? null : task.customer_id
      
      if (!recipientId) {
        throw new Error('No recipient found for this task')
      }

      // Get or create chat
      const chat = await this.getOrCreateChat(taskId, task.customer_id, null)
      if (!chat) {
        throw new Error('Failed to create chat')
      }

      const messageData = {
        task_id: taskId,
        sender_id: senderId,
        message: message,
        message_type: 'text'
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single()

      if (error) throw error

      // Get sender profile for display
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', senderId)
        .single()

      const chatMessage = {
        id: data.id,
        task_id: taskId,
        sender_id: senderId,
        message,
        created_at: data.created_at,
        updated_at: data.updated_at,
        sender_name: profile?.full_name,
        sender_avatar: profile?.avatar_url
      }

      // Send notification to the other participant
      await this.notifyNewMessage(taskId, senderId, message, profile?.full_name || 'User')

      return chatMessage
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  // Get messages for a chat
  static async getChatMessages(taskId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Get sender profiles
      const senderIds = [...new Set(data.map(msg => msg.sender_id).filter(Boolean))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds)

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

      return data.map(msg => ({
        id: msg.id,
        task_id: taskId,
        sender_id: msg.sender_id || '',
        message: msg.message || '',
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        sender_name: profileMap.get(msg.sender_id)?.full_name,
        sender_avatar: profileMap.get(msg.sender_id)?.avatar_url
      }))
    } catch (error) {
      console.error('Error getting chat messages:', error)
      return []
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(taskId: string, userId: string): Promise<void> {
    try {
      // In a real implementation, you would track read status
      // For now, we'll just log the action
      console.log(`Marking messages as read for task ${taskId} by user ${userId}`)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  // Search chats
  static async searchChats(userId: string, query: string): Promise<Chat[]> {
    try {
      const chats = await this.getUserChats(userId)
      return chats.filter(chat => 
        chat.task_title?.toLowerCase().includes(query.toLowerCase()) ||
        chat.customer_name?.toLowerCase().includes(query.toLowerCase()) ||
        chat.tasker_name?.toLowerCase().includes(query.toLowerCase())
      )
    } catch (error) {
      console.error('Error searching chats:', error)
      return []
    }
  }

  // Archive chat (not implemented in current schema)
  static async archiveChat(chatId: string): Promise<boolean> {
    try {
      // Archive functionality would need to be implemented in the database
      console.log(`Archiving chat ${chatId}`)
      return true
    } catch (error) {
      console.error('Error archiving chat:', error)
      return false
    }
  }

  // Send notification for new message
  private static async notifyNewMessage(taskId: string, senderId: string, message: string, senderName: string): Promise<void> {
    try {
      // Get task details to find the other participant
      const { data: task } = await supabase
        .from('tasks')
        .select('customer_id, title')
        .eq('id', taskId)
        .single()

      if (!task) return

      // For now, only customer can send messages (no tasker assigned yet)
      const recipientId = task.customer_id === senderId ? null : task.customer_id
      
      if (!recipientId) return

      await SimpleNotificationService.createMessageNotification(
        senderName,
        message,
        task.title
      )
    } catch (error) {
      console.error('Error sending new message notification:', error)
    }
  }

  // Get chat by ID (using task ID)
  static async getChatById(taskId: string): Promise<Chat | null> {
    try {
      // Get task details
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          customer_id,
          created_at,
          updated_at
        `)
        .eq('id', taskId)
        .single()

      if (taskError) throw taskError

      // Get customer name
      const customerResult = await supabase.from('profiles').select('full_name').eq('id', task.customer_id).single()

      console.log('Customer result:', customerResult)

      return {
        id: task.id,
        task_id: task.id,
        customer_id: task.customer_id,
        tasker_id: null, // Will be set when tasker is assigned
        created_at: task.created_at || new Date().toISOString(),
        updated_at: task.updated_at || new Date().toISOString(),
        task_title: task.title,
        customer_name: customerResult.data?.full_name,
        tasker_name: null, // Will be set when tasker is assigned
        last_message: '',
        last_message_time: task.updated_at || new Date().toISOString(),
        unread_count: 0
      }
    } catch (error) {
      console.error('Error getting chat by ID:', error)
      return null
    }
  }

  // Get chat messages by task ID
  static async getChatMessagesByChatId(taskId: string): Promise<ChatMessage[]> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          task_id,
          sender_id,
          message,
          created_at,
          updated_at,
          profiles!messages_sender_id_fkey(
            id,
            full_name
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (error) throw error

      return (messages || []).map(msg => ({
        id: msg.id,
        task_id: taskId,
        sender_id: msg.sender_id,
        message: msg.message,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        sender_name: msg.profiles?.full_name || 'Unknown'
      }))
    } catch (error) {
      console.error('Error getting chat messages by task ID:', error)
      return []
    }
  }

  // Send message to chat (using task ID)
  static async sendMessageToChat(taskId: string, content: string, senderId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          task_id: taskId,
          sender_id: senderId,
          message: content.trim()
        }])

      if (error) throw error
      
          // Create notification for the recipient
          // Get task details to find the other participant
          const { data: task } = await supabase
            .from('tasks')
            .select('customer_id, title')
            .eq('id', taskId)
            .single()

          if (task) {
            // Get sender name
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', senderId)
              .single()

            if (senderProfile) {
              // Create simple notification
              await SimpleNotificationService.createMessageNotification(
                senderProfile.full_name,
                content,
                task.title
              )
              
              // Create push notification
              await PushNotificationService.createMessageNotification(
                senderProfile.full_name,
                content,
                task.title,
                taskId
              )
            }
          }
      
      return true
    } catch (error) {
      console.error('Error sending message to chat:', error)
      return false
    }
  }

  // Real-time chat methods
  static async subscribeToChat(chatId: string, callbacks: {
    onMessage?: (message: ChatMessage) => void
    onTyping?: (userId: string, isTyping: boolean) => void
    onUserOnline?: (userId: string, isOnline: boolean) => void
  }): Promise<void> {
    try {
      await RealtimeChatService.subscribeToChat(chatId, {
        onMessage: async (realtimeMessage: RealtimeMessage) => {
          if (callbacks.onMessage) {
            // Convert RealtimeMessage to ChatMessage
            const chatMessage: ChatMessage = {
              id: realtimeMessage.id,
              task_id: '', // Will be filled by caller if needed
              sender_id: realtimeMessage.sender_id,
              message: realtimeMessage.message,
              message_type: realtimeMessage.message_type,
              created_at: realtimeMessage.created_at,
              updated_at: realtimeMessage.updated_at,
              sender_name: realtimeMessage.sender_name,
              sender_avatar: realtimeMessage.sender_avatar
            }
            callbacks.onMessage(chatMessage)
          }
        },
        onTyping: callbacks.onTyping,
        onUserOnline: callbacks.onUserOnline
      })
    } catch (error) {
      console.error('Error subscribing to chat:', error)
    }
  }

  static async unsubscribeFromChat(chatId: string): Promise<void> {
    try {
      await RealtimeChatService.unsubscribeFromChat(chatId)
    } catch (error) {
      console.error('Error unsubscribing from chat:', error)
    }
  }

  static async sendTypingIndicator(chatId: string, isTyping: boolean): Promise<void> {
    try {
      await RealtimeChatService.sendTypingIndicator(chatId, isTyping)
    } catch (error) {
      console.error('Error sending typing indicator:', error)
    }
  }

  static async markMessagesAsRead(chatId: string, messageIds: string[]): Promise<boolean> {
    try {
      return await RealtimeChatService.markMessagesAsRead(chatId, messageIds)
    } catch (error) {
      console.error('Error marking messages as read:', error)
      return false
    }
  }

  static async getUnreadCount(chatId: string): Promise<number> {
    try {
      return await RealtimeChatService.getUnreadCount(chatId)
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  static async getAllUnreadCounts(): Promise<Map<string, number>> {
    try {
      return await RealtimeChatService.getAllUnreadCounts()
    } catch (error) {
      console.error('Error getting all unread counts:', error)
      return new Map()
    }
  }

  static async cleanup(): Promise<void> {
    try {
      await RealtimeChatService.cleanup()
    } catch (error) {
      console.error('Error cleaning up subscriptions:', error)
    }
  }
}