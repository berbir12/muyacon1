import { supabase } from '../lib/supabase'
import { SimpleNotificationService } from './SimpleNotificationService'
import { PushNotificationService } from './PushNotificationService'

export interface TaskApplication {
  id: string
  task_id: string
  tasker_id: string
  proposed_price: number
  estimated_time: number
  message: string
  availability_date: string
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  created_at: string
  updated_at: string
  // Additional fields for display
  tasker_name?: string
  tasker_avatar?: string
  task_title?: string
  customer_name?: string
}

export class TaskApplicationService {
  // Create a new application
  static async createApplication(applicationData: Omit<TaskApplication, 'id' | 'created_at' | 'updated_at' | 'tasker_name' | 'tasker_avatar' | 'task_title' | 'customer_name'>): Promise<TaskApplication | null> {
    try {
      const { data, error } = await supabase
        .from('task_applications')
        .insert([applicationData])
        .select('*')
        .single()

      if (error) throw error

      // Get tasker and task details
      const [taskerResult, taskResult] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url').eq('id', data.tasker_id).single(),
        supabase.from('tasks').select('title, customer_id').eq('id', data.task_id).single()
      ])

      // Get customer name
      let customerName = ''
      if (taskResult.data?.customer_id) {
        const customerResult = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', taskResult.data.customer_id)
          .single()
        customerName = customerResult.data?.full_name || ''
      }

      const application = {
        ...data,
        tasker_name: taskerResult.data?.full_name,
        tasker_avatar: taskerResult.data?.avatar_url,
        task_title: taskResult.data?.title,
        customer_name: customerName
      }

      // Send notification to customer
      await SimpleNotificationService.notifyTaskApplication(
        data.task_id, 
        data.tasker_id, 
        application.tasker_name || 'Tasker', 
        application.task_title || 'Task'
      )
      
      // Send push notification
      await PushNotificationService.createApplicationNotification(
        application.tasker_name || 'Tasker',
        application.task_title || 'Task',
        data.task_id
      )

      return application
    } catch (error) {
      console.error('Error creating application:', error)
      throw error
    }
  }

  // Get applications for a specific task
  static async getTaskApplications(taskId: string): Promise<TaskApplication[]> {
    try {
      const { data, error } = await supabase
        .from('task_applications')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get tasker names and avatars
      const taskerIds = [...new Set(data.map(app => app.tasker_id))]
      const { data: taskers } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', taskerIds)

      const taskerMap = new Map(taskers?.map(t => [t.id, t]) || [])

      return data.map(app => ({
        ...app,
        tasker_name: taskerMap.get(app.tasker_id)?.full_name,
        tasker_avatar: taskerMap.get(app.tasker_id)?.avatar_url,
        task_title: '', // Will be filled by caller if needed
        customer_name: '' // Will be filled by caller if needed
      }))
    } catch (error) {
      console.error('Error getting task applications:', error)
      return []
    }
  }

  // Check if user has already applied to a specific task
  static async hasUserAppliedToTask(userId: string, taskId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('task_applications')
        .select('id')
        .eq('tasker_id', userId)
        .eq('task_id', taskId)
        .limit(1)

      if (error) throw error
      return data && data.length > 0
    } catch (error) {
      console.error('Error checking if user has applied:', error)
      return false
    }
  }

  // Get applications by a specific tasker
  static async getUserApplications(userId: string): Promise<TaskApplication[]> {
    try {
      const { data, error } = await supabase
        .from('task_applications')
        .select('*')
        .eq('tasker_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get task details
      const taskIds = [...new Set(data.map(app => app.task_id))]
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, customer_id')
        .in('id', taskIds)

      // Get customer names
      const customerIds = [...new Set(tasks?.map(t => t.customer_id) || [])]
      const { data: customers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', customerIds)

      const taskMap = new Map(tasks?.map(t => [t.id, t]) || [])
      const customerMap = new Map(customers?.map(c => [c.id, c.full_name]) || [])

      return data.map(app => {
        const task = taskMap.get(app.task_id)
        return {
          ...app,
          tasker_name: '', // Not needed for user's own applications
          tasker_avatar: '', // Not needed for user's own applications
          task_title: task?.title || '',
          customer_name: task?.customer_id ? customerMap.get(task.customer_id) || '' : ''
        }
      })
    } catch (error) {
      console.error('Error getting user applications:', error)
      return []
    }
  }

  // Update application status
  static async updateApplicationStatus(applicationId: string, status: TaskApplication['status']): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('task_applications')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating application status:', error)
      return false
    }
  }

  // Accept an application (and assign task to tasker)
  static async acceptApplication(taskId: string, applicationId: string): Promise<boolean> {
    try {
      // Get application details
      const { data: application, error: fetchError } = await supabase
        .from('task_applications')
        .select('task_id, tasker_id')
        .eq('id', applicationId)
        .single()

      if (fetchError) throw fetchError

      // Update application status
      const success = await this.updateApplicationStatus(applicationId, 'accepted')
      if (!success) return false

      // Update task with assigned tasker
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          tasker_id: application.tasker_id,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', application.task_id)

      if (taskError) throw taskError

      // Reject all other applications for this task
      await supabase
        .from('task_applications')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('task_id', application.task_id)
        .neq('id', applicationId)

      // Create a chat between customer and tasker
      await this.createChatForAcceptedApplication(application.task_id, application.tasker_id)

      // Get task and customer details for notification
      const { data: task } = await supabase
        .from('tasks')
        .select('title, customer_id')
        .eq('id', application.task_id)
        .single()

      const { data: customer } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', task?.customer_id)
        .single()

      // Send notification to tasker
      await SimpleNotificationService.notifyTaskAccepted(
        application.tasker_id,
        customer?.full_name || 'Customer',
        task?.title || 'Task',
        application.task_id
      )

      return true
    } catch (error) {
      console.error('Error accepting application:', error)
      return false
    }
  }

  // Create a chat when an application is accepted
  static async createChatForAcceptedApplication(taskId: string, taskerId: string): Promise<void> {
    try {
      // Get task details to find customer
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('customer_id, title')
        .eq('id', taskId)
        .single()

      if (taskError || !task) {
        console.error('Error getting task details:', taskError)
        return
      }

      // Check if chat already exists
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('task_id', taskId)
        .eq('customer_id', task.customer_id)
        .eq('tasker_id', taskerId)
        .single()

      if (existingChat) {
        console.log('Chat already exists for this task')
        return
      }

      // Create chat
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert({
          task_id: taskId,
          customer_id: task.customer_id,
          tasker_id: taskerId
        })
        .select('id')
        .single()

      if (chatError) {
        console.error('Error creating chat:', chatError)
        return
      }

      if (!chatData) {
        console.error('No chat data returned')
        return
      }

      // Send initial message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatData.id,
          sender_id: task.customer_id,
          content: `Great! I've accepted your application for "${task.title}". Let's discuss the details!`,
          message_type: 'text'
        })

      if (messageError) {
        console.error('Error sending initial message:', messageError)
      }
    } catch (error) {
      console.error('Error creating chat for accepted application:', error)
    }
  }

  // Reject an application
  static async rejectApplication(applicationId: string): Promise<boolean> {
    try {
      // Get application details first
      const { data: application, error: fetchError } = await supabase
        .from('task_applications')
        .select('tasker_id, task_id')
        .eq('id', applicationId)
        .single()

      if (fetchError) throw fetchError

      const success = await this.updateApplicationStatus(applicationId, 'rejected')
      
      if (success) {
        // Get task and customer details for notification
        const { data: task } = await supabase
          .from('tasks')
          .select('title, customer_id')
          .eq('id', application.task_id)
          .single()

        const { data: customer } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', task?.customer_id)
          .single()

        // Send notification to tasker
        await SimpleNotificationService.notifyTaskRejected(
          application.tasker_id,
          customer?.full_name || 'Customer',
          task?.title || 'Task',
          application.task_id
        )
      }
      
      return success
    } catch (error) {
      console.error('Error rejecting application:', error)
      return false
    }
  }

  // Withdraw an application
  static async withdrawApplication(applicationId: string): Promise<boolean> {
    return await this.updateApplicationStatus(applicationId, 'withdrawn')
  }

  // Get application by ID
  static async getApplicationById(applicationId: string): Promise<TaskApplication | null> {
    try {
      const { data, error } = await supabase
        .from('task_applications')
        .select('*')
        .eq('id', applicationId)
        .single()

      if (error) throw error

      // Get tasker and task details
      const [taskerResult, taskResult] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url').eq('id', data.tasker_id).single(),
        supabase.from('tasks').select('title, customer_id').eq('id', data.task_id).single()
      ])

      // Get customer name
      let customerName = ''
      if (taskResult.data?.customer_id) {
        const customerResult = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', taskResult.data.customer_id)
          .single()
        customerName = customerResult.data?.full_name || ''
      }

      return {
        ...data,
        tasker_name: taskerResult.data?.full_name,
        tasker_avatar: taskerResult.data?.avatar_url,
        task_title: taskResult.data?.title,
        customer_name: customerName
      }
    } catch (error) {
      console.error('Error getting application by ID:', error)
      return null
    }
  }

  // Check if user has applied for a task
  static async hasUserApplied(taskId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('task_applications')
        .select('id')
        .eq('task_id', taskId)
        .eq('tasker_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error
      }

      return !!data
    } catch (error) {
      console.error('Error checking if user has applied:', error)
      return false
    }
  }

  // Get application statistics for a user
  static async getUserApplicationStats(userId: string): Promise<{
    total: number
    pending: number
    accepted: number
    rejected: number
    withdrawn: number
  }> {
    try {
      const applications = await this.getUserApplications(userId)
      
      return {
        total: applications.length,
        pending: applications.filter(app => app.status === 'pending').length,
        accepted: applications.filter(app => app.status === 'accepted').length,
        rejected: applications.filter(app => app.status === 'rejected').length,
        withdrawn: applications.filter(app => app.status === 'withdrawn').length,
      }
    } catch (error) {
      console.error('Error getting application stats:', error)
      return {
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
        withdrawn: 0,
      }
    }
  }

  // Notification helper methods
  private static async notifyTaskAccepted(taskId: string, taskerId: string): Promise<void> {
    try {
      // Get task and customer details
      const { data: task } = await supabase
        .from('tasks')
        .select('title, customer_id')
        .eq('id', taskId)
        .single()

      if (!task) return

      const { data: customer } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', task.customer_id)
        .single()

      await SimpleNotificationService.notifyTaskAccepted(
        taskerId,
        customer?.full_name || 'Customer',
        task.title,
        taskId
      )
    } catch (error) {
      console.error('Error sending task accepted notification:', error)
    }
  }

  private static async notifyTaskRejected(applicationId: string): Promise<void> {
    try {
      // Get application details
      const { data: application } = await supabase
        .from('task_applications')
        .select('task_id, tasker_id')
        .eq('id', applicationId)
        .single()

      if (!application) return

      // Get task and customer details
      const { data: task } = await supabase
        .from('tasks')
        .select('title, customer_id')
        .eq('id', application.task_id)
        .single()

      if (!task) return

      const { data: customer } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', task.customer_id)
        .single()

      await SimpleNotificationService.notifyTaskRejected(
        application.tasker_id,
        customer?.full_name || 'Customer',
        task.title,
        application.task_id
      )
    } catch (error) {
      console.error('Error sending task rejected notification:', error)
    }
  }
}
