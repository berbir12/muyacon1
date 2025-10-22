import { supabase } from '../lib/supabase'
import { handleError } from '../utils/errorHandler'

export interface Rating {
  id: string
  task_id: string
  customer_id: string
  technician_id: string
  rating: number
  review: string
  created_at: string
  updated_at: string
  customer_user_id: string
  technician_user_id: string
}

export interface CreateRatingRequest {
  task_id: string
  customer_id: string
  technician_id: string
  rating: number
  review: string
  customer_user_id: string
  technician_user_id: string
}

export class RatingService {
  // Create a new rating and review
  static async createRating(ratingData: CreateRatingRequest): Promise<Rating | null> {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .insert([{
          task_id: ratingData.task_id,
          customer_id: ratingData.customer_id,
          technician_id: ratingData.technician_id,
          rating: ratingData.rating,
          review: ratingData.review,
          customer_user_id: ratingData.customer_user_id,
          technician_user_id: ratingData.technician_user_id
        }])
        .select()
        .single()

      if (error) throw error

      return data

    } catch (error) {
      const appError = handleError(error, 'createRating')
      console.error('Error creating rating:', appError)
      return null
    }
  }

  // Get ratings for a specific task
  static async getTaskRatings(taskId: string): Promise<Rating[]> {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []

    } catch (error) {
      const appError = handleError(error, 'getTaskRatings')
      console.error('Error getting task ratings:', appError)
      return []
    }
  }

  // Get ratings for a specific technician
  static async getTechnicianRatings(technicianId: string): Promise<Rating[]> {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('technician_id', technicianId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []

    } catch (error) {
      const appError = handleError(error, 'getTechnicianRatings')
      console.error('Error getting technician ratings:', appError)
      return []
    }
  }

  // Check if customer has already rated a task
  static async hasCustomerRatedTask(taskId: string, customerUserId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('id')
        .eq('task_id', taskId)
        .eq('customer_user_id', customerUserId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return !!data

    } catch (error) {
      const appError = handleError(error, 'hasCustomerRatedTask')
      console.error('Error checking if customer rated task:', appError)
      return false
    }
  }

  // Update task status after rating is submitted
  static async updateTaskAfterRating(taskId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) throw error

      // Delete chat and all messages for this task when completed
      try {
        const { ChatService } = await import('./ChatService')
        const chatDeleted = await ChatService.deleteChatByTaskId(taskId)
        if (chatDeleted) {
          console.log('✅ Chat deleted successfully for completed task after rating:', taskId)
        }
      } catch (chatError) {
        console.error('Error deleting chat for completed task after rating:', chatError)
        // Don't fail the main operation if chat deletion fails
      }

      return true

    } catch (error) {
      const appError = handleError(error, 'updateTaskAfterRating')
      console.error('Error updating task after rating:', appError)
      return false
    }
  }

  // Get average rating for a technician
  static async getTechnicianAverageRating(technicianId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('rating')
        .eq('technician_id', technicianId)

      if (error) throw error

      if (!data || data.length === 0) return 0

      const totalRating = data.reduce((sum, rating) => sum + rating.rating, 0)
      return totalRating / data.length

    } catch (error) {
      const appError = handleError(error, 'getTechnicianAverageRating')
      console.error('Error getting technician average rating:', appError)
      return 0
    }
  }

  // Update technician's profile rating
  static async updateTechnicianProfileRating(technicianId: string): Promise<boolean> {
    try {
      const averageRating = await this.getTechnicianAverageRating(technicianId)
      
      const { error } = await supabase
        .from('profiles')
        .update({
          rating: averageRating,
          updated_at: new Date().toISOString()
        })
        .eq('id', technicianId)

      if (error) throw error

      return true

    } catch (error) {
      const appError = handleError(error, 'updateTechnicianProfileRating')
      console.error('Error updating technician profile rating:', appError)
      return false
    }
  }
}