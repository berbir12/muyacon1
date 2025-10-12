import { supabase } from '../lib/supabase'
import { ErrorHandlingService } from './ErrorHandlingService'

export interface Task {
  id: string
  title: string
  description: string
  budget: number
  address: string
  city: string
  state: string
  zip_code: string
  latitude?: number
  longitude?: number
  task_date?: string
  task_time?: string
  flexible_date: boolean
  estimated_hours?: number
  task_size: 'small' | 'medium' | 'large'
  urgency: 'flexible' | 'within_week' | 'urgent'
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  customer_id: string
  tasker_id?: string
  category_id: string
  images?: string[]
  requirements?: string[]
  attachments?: string[]
  tags?: string[]
  is_featured: boolean
  is_urgent: boolean
  expires_at?: string
  completed_at?: string
  cancelled_at?: string
  cancellation_reason?: string
  customer_rating?: number
  customer_review?: string
  tasker_rating?: number
  tasker_review?: string
  payment_status: 'pending' | 'partial' | 'completed' | 'refunded'
  payment_method?: string
  transaction_id?: string
  final_price?: number
  special_instructions?: string
  photos?: string[]
  estimated_duration_hours?: number
  created_at: string
  updated_at: string
  // Additional fields for display
  customer_name?: string
  tasker_name?: string
  category_name?: string
  applications_count?: number
}

export interface TaskApplication {
  id: string
  task_id: string
  tasker_id: string
  proposed_price: number
  estimated_time: number
  status: 'pending' | 'accepted' | 'rejected'
  message: string
  attachments?: string[]
  availability_date: string
  estimated_hours?: number
  created_at: string
  updated_at: string
  // Additional fields for display
  tasker_name?: string
  tasker_rating?: number
}

export class TaskService {
  // Get all available tasks (open status, not assigned to current user)
  static async getAvailableTasks(userId: string): Promise<Task[]> {
    try {
      console.log('TaskService: Getting available tasks for user:', userId)
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          profiles!tasks_customer_id_fkey(full_name),
          task_categories(name)
        `)
        .eq('status', 'open')
        .neq('customer_id', userId)
        .order('created_at', { ascending: false })

      console.log('TaskService: Query result - data:', data?.length || 0, 'error:', error)

      if (error) {
        console.error('TaskService: Database error:', error)
        throw error
      }

      const mappedTasks = data.map(task => ({
        ...task,
        customer_name: task.profiles?.full_name,
        category_name: task.task_categories?.name,
        applications_count: 0
      }))

      console.log('TaskService: Mapped tasks:', mappedTasks.length)
      return mappedTasks
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'getAvailableTasks')
      console.error('Error getting available tasks:', appError)
      return []
    }
  }

  // Get user's posted tasks
  static async getMyTasks(userId: string): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          profiles!tasks_tasker_id_fkey(full_name),
          task_categories(name)
        `)
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data.map(task => ({
        ...task,
        tasker_name: task.profiles?.full_name,
        category_name: task.task_categories?.name,
        applications_count: 0 // Will be calculated separately
      }))
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'getMyTasks')
      console.error('Error getting my tasks:', appError)
      return []
    }
  }

  // Get user's assigned tasks (as tasker)
  static async getMyAssignedTasks(userId: string): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          profiles!tasks_customer_id_fkey(full_name),
          task_categories(name)
        `)
        .eq('tasker_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data.map(task => ({
        ...task,
        customer_name: task.profiles?.full_name,
        category_name: task.task_categories?.name,
        applications_count: 0 // Will be calculated separately
      }))
    } catch (error) {
      console.error('Error getting assigned tasks:', error)
      return []
    }
  }

  // Create a new task
  static async createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'applications_count'>): Promise<Task | null> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select('*')
        .single()

      if (error) throw error

      // Get customer and category names separately
      const [customerResult, categoryResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', data.customer_id).single(),
        supabase.from('task_categories').select('name').eq('id', data.category_id).single()
      ])

      return {
        ...data,
        customer_name: customerResult.data?.full_name,
        category_name: categoryResult.data?.name,
        applications_count: 0
      }
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  }

  // Apply to a task
  static async applyToTask(taskId: string, taskerId: string, proposedPrice: number, message: string, availabilityDate: string): Promise<boolean> {
    try {
      // Check if already applied
      const { data: existingApplication } = await supabase
        .from('task_applications')
        .select('id')
        .eq('task_id', taskId)
        .eq('tasker_id', taskerId)
        .single()

      if (existingApplication) {
        return false // Already applied
      }

      // Create application
      const { error } = await supabase
        .from('task_applications')
        .insert([{
          task_id: taskId,
          tasker_id: taskerId,
          proposed_price: proposedPrice,
          estimated_time: 1, // Default to 1 hour
          message,
          availability_date: availabilityDate,
          status: 'pending'
        }])

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error applying to task:', error)
      return false
    }
  }

  // Accept an application
  static async acceptApplication(taskId: string, applicationId: string): Promise<boolean> {
    try {
      // Get application details with task info
      const { data: application, error: appError } = await supabase
        .from('task_applications')
        .select(`
          tasker_id, 
          proposed_price,
          tasks!inner(
            id,
            title,
            customer_id,
            status
          )
        `)
        .eq('id', applicationId)
        .single()

      if (appError) throw appError

      // Update task status and assign tasker
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          status: 'assigned',
          tasker_id: application.tasker_id,
          final_price: application.proposed_price,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (taskError) throw taskError

      // Update application status
      const { error: appUpdateError } = await supabase
        .from('task_applications')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      if (appUpdateError) throw appUpdateError

      // Create status update record
      const { error: statusError } = await supabase
        .from('task_status_updates')
        .insert({
          task_id: taskId,
          status: 'assigned',
          updated_by: application.tasks.customer_id,
          reason: 'Application accepted',
          notes: `Task assigned to tasker for $${application.proposed_price}`
        })

      if (statusError) {
        console.error('Error creating status update:', statusError)
        // Don't fail the whole operation for this
      }

      // Reject all other applications for this task
      const { error: rejectError } = await supabase
        .from('task_applications')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('task_id', taskId)
        .neq('id', applicationId)

      if (rejectError) {
        console.error('Error rejecting other applications:', rejectError)
        // Don't fail the whole operation for this
      }

      // Send notifications
      try {
        // Get tasker details for notification
        const { data: tasker } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', application.tasker_id)
          .single()

        // Send notification to tasker
        await supabase
          .from('notifications')
          .insert({
            user_id: application.tasker_id,
            title: 'Application Accepted!',
            message: `Your application for "${application.tasks.title}" has been accepted.`,
            type: 'application',
            data: {
              task_id: taskId,
              application_id: applicationId
            }
          })

        // Send notification to customer
        await supabase
          .from('notifications')
          .insert({
            user_id: application.tasks.customer_id,
            title: 'Task Assigned',
            message: `"${application.tasks.title}" has been assigned to ${tasker?.full_name || 'a tasker'}.`,
            type: 'task',
            data: {
              task_id: taskId,
              tasker_id: application.tasker_id
            }
          })
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError)
        // Don't fail the whole operation for this
      }

      return true
    } catch (error) {
      console.error('Error accepting application:', error)
      return false
    }
  }

  // Update task status
  static async updateTaskStatus(taskId: string, status: Task['status']): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      }

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating task status:', error)
      return false
    }
  }

  // Complete a task (with proper workflow)
  static async completeTask(taskId: string, completedBy: string, notes?: string): Promise<boolean> {
    try {
      // Get task details
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, customer_id, tasker_id, status')
        .eq('id', taskId)
        .single()

      if (taskError || !task) {
        throw new Error('Task not found')
      }

      // Check if task can be completed
      if (task.status !== 'in_progress' && task.status !== 'assigned') {
        throw new Error('Task must be in progress to be completed')
      }

      // Update task status
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (updateError) throw updateError

      // Create status update record
      const { error: statusError } = await supabase
        .from('task_status_updates')
        .insert({
          task_id: taskId,
          status: 'completed',
          updated_by: completedBy,
          reason: 'Task completed',
          notes: notes || 'Task has been completed successfully'
        })

      if (statusError) {
        console.error('Error creating status update:', statusError)
        // Don't fail the whole operation for this
      }

      // Send notifications
      try {
        const { data: tasker } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', task.tasker_id)
          .single()

        // Notify customer
        await supabase
          .from('notifications')
          .insert({
            user_id: task.customer_id,
            title: 'Task Completed!',
            message: `"${task.title}" has been completed by ${tasker?.full_name || 'the tasker'}.`,
            type: 'task',
            data: { task_id: taskId }
          })

        // Notify tasker
        if (task.tasker_id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: task.tasker_id,
              title: 'Task Completed',
              message: `You have completed "${task.title}". Great job!`,
              type: 'task',
              data: { task_id: taskId }
            })
        }
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError)
        // Don't fail the whole operation for this
      }

      return true
    } catch (error) {
      console.error('Error completing task:', error)
      return false
    }
  }

  // Cancel a task (with proper workflow)
  static async cancelTask(taskId: string, cancelledBy: string, reason: string): Promise<boolean> {
    try {
      // Get task details
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, customer_id, tasker_id, status')
        .eq('id', taskId)
        .single()

      if (taskError || !task) {
        throw new Error('Task not found')
      }

      // Update task status
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (updateError) throw updateError

      // Create status update record
      const { error: statusError } = await supabase
        .from('task_status_updates')
        .insert({
          task_id: taskId,
          status: 'cancelled',
          updated_by: cancelledBy,
          reason: 'Task cancelled',
          notes: reason
        })

      if (statusError) {
        console.error('Error creating status update:', statusError)
        // Don't fail the whole operation for this
      }

      // Send notifications
      try {
        const notificationMessage = `"${task.title}" has been cancelled. Reason: ${reason}`

        if (task.tasker_id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: task.tasker_id,
              title: 'Task Cancelled',
              message: notificationMessage,
              type: 'task',
              data: { task_id: taskId }
            })
        }

        await supabase
          .from('notifications')
          .insert({
            user_id: task.customer_id,
            title: 'Task Cancelled',
            message: notificationMessage,
            type: 'task',
            data: { task_id: taskId }
          })
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError)
        // Don't fail the whole operation for this
      }

      return true
    } catch (error) {
      console.error('Error cancelling task:', error)
      return false
    }
  }

  // Get task applications
  static async getTaskApplications(taskId: string): Promise<TaskApplication[]> {
    try {
      const { data, error } = await supabase
        .from('task_applications')
        .select(`
          *,
          profiles!task_applications_tasker_id_fkey(full_name, rating_average)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data.map(app => ({
        ...app,
        tasker_name: app.profiles?.full_name,
        tasker_rating: app.profiles?.rating_average
      }))
    } catch (error) {
      console.error('Error getting task applications:', error)
      return []
    }
  }

  // Get user's applications
  static async getMyApplications(userId: string): Promise<TaskApplication[]> {
    try {
      const { data, error } = await supabase
        .from('task_applications')
        .select(`
          *,
          tasks!task_applications_task_id_fkey(title, status, budget)
        `)
        .eq('tasker_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data.map(app => ({
        ...app,
        tasker_name: '', // Not needed for my applications
        tasker_rating: 0
      }))
    } catch (error) {
      console.error('Error getting my applications:', error)
      return []
    }
  }

  // Search tasks
  static async searchTasks(query: string, category?: string): Promise<Task[]> {
    try {
      let queryBuilder = supabase
        .from('tasks')
        .select(`
          *,
          profiles!tasks_customer_id_fkey(full_name),
          task_categories(name)
        `)
        .eq('status', 'open')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)

      if (category && category !== 'All') {
        queryBuilder = queryBuilder.eq('task_categories.name', category)
      }

      const { data, error } = await queryBuilder.order('created_at', { ascending: false })

      if (error) throw error

      return data.map(task => ({
        ...task,
        customer_name: task.profiles?.full_name,
        category_name: task.task_categories?.name,
        applications_count: 0
      }))
    } catch (error) {
      console.error('Error searching tasks:', error)
      return []
    }
  }

  // Get task categories
  static async getTaskCategories(): Promise<{ id: string; name: string; slug: string }[]> {
    try {
      const { data, error } = await supabase
        .from('task_categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting task categories:', error)
      return []
    }
  }

  // Get featured tasks
  static async getFeaturedTasks(): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          profiles!tasks_customer_id_fkey(full_name, avatar_url),
          category:task_categories(name)
        `)
        .eq('is_featured', true)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      return data?.map(task => ({
        ...task,
        customer_name: task.profiles?.full_name,
        customer_avatar: task.profiles?.avatar_url,
        category_name: task.category?.name,
      })) || []
    } catch (error) {
      console.error('Error getting featured tasks:', error)
      return []
    }
  }

  // Get recent tasks
  static async getRecentTasks(): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          profiles!tasks_customer_id_fkey(full_name, avatar_url),
          category:task_categories(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      return data?.map(task => ({
        ...task,
        customer_name: task.profiles?.full_name,
        customer_avatar: task.profiles?.avatar_url,
        category_name: task.category?.name,
      })) || []
    } catch (error) {
      console.error('Error getting recent tasks:', error)
      return []
    }
  }

  // Get a single task by ID with all details
  static async getTaskById(taskId: string): Promise<Task | null> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (error) throw error
      if (!data) return null

      // Get customer name
      const { data: customer } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.customer_id)
        .single()

      // Get tasker name if assigned
      let taskerName = ''
      if (data.tasker_id) {
        const { data: tasker } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.tasker_id)
          .single()
        taskerName = tasker?.full_name || ''
      }

      // Get category name
      const { data: category } = await supabase
        .from('task_categories')
        .select('name')
        .eq('id', data.category_id)
        .single()

      return {
        ...data,
        customer_name: customer?.full_name || '',
        tasker_name: taskerName,
        category_name: category?.name || '',
        applications_count: 0 // Will be calculated separately if needed
      }
    } catch (error) {
      console.error('Error getting task by ID:', error)
      return null
    }
  }
}