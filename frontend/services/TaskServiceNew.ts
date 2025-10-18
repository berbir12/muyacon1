import { supabase } from '../lib/supabase'
import { handleError } from '../utils/errorHandler'

export interface Task {
  id: string
  title: string
  description: string
  budget: number
  address: string
  city: string
  state: string
  zip_code?: string
  latitude?: number
  longitude?: number
  task_date?: string
  task_time?: string
  flexible_date: boolean
  estimated_hours?: number
  task_size: string
  urgency: string
  status: string
  customer_id: string
  tasker_id?: string
  category_id?: string
  category?: string
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
  payment_status: string
  payment_method?: string
  transaction_id?: string
  final_price?: number
  special_instructions?: string
  photos?: string[]
  estimated_duration_hours?: number
  created_at: string
  updated_at: string
  user_id: string
  customer_name?: string
  tasker_name?: string
  category_name?: string
  applications_count?: number
}

export class TaskService {
  // Get all available tasks (open status, not created by current user)
  static async getAvailableTasks(userId: string): Promise<Task[]> {
    try {
      console.log('🚀 NEW TASK SERVICE - Getting available tasks for user:', userId)
      
      // Get all open tasks first
      const { data: allTasks, error: allTasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (allTasksError) {
        console.error('Error fetching all tasks:', allTasksError)
        throw allTasksError
      }

      // Filter out tasks created by this user
      const data = allTasks?.filter(task => task.user_id !== userId) || []
      console.log('🚀 NEW TASK SERVICE - Filtered tasks count:', data.length, 'out of', allTasks?.length || 0)

      // Get customer names separately to avoid foreign key issues
      const customerIds = [...new Set(data.map(task => task.customer_id))];
      const customerMap = await this.getProfileNames(customerIds);

      return data.map(task => ({
        ...task,
        customer_name: customerMap.get(task.customer_id) || 'Unknown',
        category_name: task.category || 'Other',
        applications_count: 0
      }))
    } catch (error) {
      console.error('🚀 NEW TASK SERVICE - Error in getAvailableTasks:', error)
      const appError = handleError(error, 'getAvailableTasks')
      throw appError
    }
  }

  // Get user's posted tasks
  static async getMyTasks(userId: string): Promise<Task[]> {
    try {
      console.log('🚀 NEW TASK SERVICE - Getting my tasks for user:', userId)
      
      // Get all tasks first
      const { data: allTasks, error: allTasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (allTasksError) {
        console.error('Error fetching all tasks for my tasks:', allTasksError)
        throw allTasksError
      }

      // Filter to get tasks created by this user
      const data = allTasks?.filter(task => task.user_id === userId) || []
      console.log('🚀 NEW TASK SERVICE - My tasks count:', data.length, 'out of', allTasks?.length || 0)

      // Get tasker names separately if any tasks have taskers
      const taskerIds = data.filter(task => task.tasker_id).map(task => task.tasker_id);
      const taskerMap = await this.getProfileNames(taskerIds);

      return data.map(task => ({
        ...task,
        tasker_name: task.tasker_id ? taskerMap.get(task.tasker_id) || 'Unknown' : undefined,
        category_name: task.category || 'Other',
        applications_count: 0
      }))
    } catch (error) {
      console.error('🚀 NEW TASK SERVICE - Error in getMyTasks:', error)
      const appError = handleError(error, 'getMyTasks')
      throw appError
    }
  }

  // Helper method to get profile names
  private static async getProfileNames(profileIds: string[]): Promise<Map<string, string>> {
    if (profileIds.length === 0) return new Map()

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', profileIds)

      if (error) {
        console.error('Error fetching profile names:', error)
        return new Map()
      }

      return new Map(profiles?.map(profile => [profile.id, profile.full_name]) || [])
    } catch (error) {
      console.error('Error in getProfileNames:', error)
      return new Map()
    }
  }

  // Create a new task
  static async createTask(taskData: any): Promise<Task | null> {
    try {
      console.log('🚀 NEW TASK SERVICE - Creating task:', taskData.title)
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single()

      if (error) {
        console.error('Error creating task:', error)
        throw error
      }

      console.log('🚀 NEW TASK SERVICE - Task created successfully:', data.id)
      return data
    } catch (error) {
      console.error('🚀 NEW TASK SERVICE - Error creating task:', error)
      const appError = handleError(error, 'createTask')
      throw appError
    }
  }

  // Get task by ID
  static async getTaskById(taskId: string): Promise<Task | null> {
    try {
      console.log('🚀 NEW TASK SERVICE - Getting task by ID:', taskId)
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (error) {
        console.error('Error getting task by ID:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('🚀 NEW TASK SERVICE - Error getting task by ID:', error)
      const appError = handleError(error, 'getTaskById')
      throw appError
    }
  }

  // Get featured tasks
  static async getFeaturedTasks(): Promise<Task[]> {
    try {
      console.log('🚀 NEW TASK SERVICE - Getting featured tasks')
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_featured', true)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error getting featured tasks:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('🚀 NEW TASK SERVICE - Error getting featured tasks:', error)
      const appError = handleError(error, 'getFeaturedTasks')
      throw appError
    }
  }

  // Apply to task
  static async applyToTask(taskId: string, taskerId: string, proposedPrice: number, message: string, availabilityDate: string, userId: string): Promise<boolean> {
    try {
      console.log('🚀 NEW TASK SERVICE - Applying to task:', taskId)
      
      // Check if already applied
      const { data: existingApplication } = await supabase
        .from('task_applications')
        .select('id')
        .eq('task_id', taskId)
        .eq('tasker_id', taskerId)
        .maybeSingle()

      if (existingApplication) {
        return false // Already applied
      }

      // Create application
      const { error } = await supabase
        .from('task_applications')
        .insert([{
          task_id: taskId,
          tasker_id: taskerId,
          user_id: userId,
          proposed_price: proposedPrice,
          estimated_time: 1, // Default to 1 hour
          message,
          availability_date: availabilityDate,
          status: 'pending'
        }])

      if (error) throw error
      return true
    } catch (error) {
      console.error('🚀 NEW TASK SERVICE - Error applying to task:', error)
      return false
    }
  }

  // Check if user has applied to task
  static async hasUserAppliedToTask(taskId: string, userId: string): Promise<boolean> {
    try {
      console.log('🚀 NEW TASK SERVICE - Checking if user applied to task:', taskId, userId)
      
      const { data, error } = await supabase
        .from('task_applications')
        .select('id')
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error checking application:', error)
        return false
      }

      return !!data
    } catch (error) {
      console.error('🚀 NEW TASK SERVICE - Error checking application:', error)
      return false
    }
  }
}
