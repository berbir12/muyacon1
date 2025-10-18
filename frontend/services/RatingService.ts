import { supabase } from '../lib/supabase'
import { handleError } from '../utils/errorHandler'
import { UnifiedNotificationService } from './UnifiedNotificationService'

export interface Review {
  id: string
  task_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number // 1-5 stars
  comment: string
  review_type: 'customer_to_tasker' | 'tasker_to_customer'
  is_anonymous: boolean
  created_at: string
  updated_at: string
  reviewer_name?: string
  reviewer_avatar?: string
  task_title?: string
}

export interface RatingSummary {
  user_id: string
  average_rating: number
  total_reviews: number
  rating_breakdown: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
  recent_reviews: Review[]
}

export interface ReviewFilters {
  rating?: number
  review_type?: 'customer_to_tasker' | 'tasker_to_customer'
  is_anonymous?: boolean
  date_from?: string
  date_to?: string
}

export class RatingService {
  // Create a review
  static async createReview(
    taskId: string,
    reviewerId: string,
    revieweeId: string,
    rating: number,
    comment: string,
    reviewType: 'customer_to_tasker' | 'tasker_to_customer',
    isAnonymous: boolean = false
  ): Promise<Review | null> {
    try {
      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5')
      }

      // Check if review already exists
      const existingReview = await this.getReviewByTaskAndUsers(taskId, reviewerId, revieweeId, reviewType)
      if (existingReview) {
        throw new Error('Review already exists for this task and user combination')
      }

      // Validate that the task is completed
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('status, customer_id, assigned_tasker_id')
        .eq('id', taskId)
        .single()

      if (taskError) throw taskError
      if (task.status !== 'completed') {
        throw new Error('Can only review completed tasks')
      }

      // Validate reviewer has permission to review
      if (reviewType === 'customer_to_tasker') {
        if (task.customer_id !== reviewerId) {
          throw new Error('Only the customer can review the tasker')
        }
        if (task.assigned_tasker_id !== revieweeId) {
          throw new Error('Can only review the assigned tasker')
        }
      } else {
        if (task.assigned_tasker_id !== reviewerId) {
          throw new Error('Only the assigned tasker can review the customer')
        }
        if (task.customer_id !== revieweeId) {
          throw new Error('Can only review the customer who posted the task')
        }
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          task_id: taskId,
          reviewer_id: reviewerId,
          reviewee_id: revieweeId,
          rating,
          comment,
          review_type: reviewType,
          is_anonymous: isAnonymous
        })
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url),
          task:tasks(title)
        `)
        .single()

      if (error) throw error

      // Update user rating summary
      await this.updateUserRatingSummary(revieweeId)

      // Send notification to the person being rated
      try {
        // Get reviewer and reviewee names
        const [reviewerResult, revieweeResult] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', reviewerId).single(),
          supabase.from('profiles').select('full_name').eq('id', revieweeId).single()
        ])

        const reviewerName = reviewerResult.data?.full_name || 'Someone'
        const revieweeName = revieweeResult.data?.full_name || 'Unknown'
        const taskTitle = data.task?.title || 'a task'

        await UnifiedNotificationService.notifyTaskRated(
          taskId,
          taskTitle,
          reviewerId,
          revieweeId,
          rating,
          reviewerName,
          revieweeName
        )

        console.log('🚀 RATING SERVICE - Rating notification sent for task:', taskId)
      } catch (notificationError) {
        console.error('Error sending rating notification:', notificationError)
        // Don't throw here - rating should be saved even if notification fails
      }

      return {
        id: data.id,
        task_id: data.task_id,
        reviewer_id: data.reviewer_id,
        reviewee_id: data.reviewee_id,
        rating: data.rating,
        comment: data.comment,
        review_type: data.review_type,
        is_anonymous: data.is_anonymous,
        created_at: data.created_at,
        updated_at: data.updated_at,
        reviewer_name: data.reviewer?.name,
        reviewer_avatar: data.reviewer?.avatar_url,
        task_title: data.task?.title
      }
    } catch (error) {
      const appError = handleError(error, 'createReview')
      console.error('Error creating review:', appError)
      return null
    }
  }

  // Get review by task and users
  static async getReviewByTaskAndUsers(
    taskId: string,
    reviewerId: string,
    revieweeId: string,
    reviewType: 'customer_to_tasker' | 'tasker_to_customer'
  ): Promise<Review | null> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url),
          task:tasks(title)
        `)
        .eq('task_id', taskId)
        .eq('reviewer_id', reviewerId)
        .eq('reviewee_id', revieweeId)
        .eq('review_type', reviewType)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // No rows found
        throw error
      }

      return {
        id: data.id,
        task_id: data.task_id,
        reviewer_id: data.reviewer_id,
        reviewee_id: data.reviewee_id,
        rating: data.rating,
        comment: data.comment,
        review_type: data.review_type,
        is_anonymous: data.is_anonymous,
        created_at: data.created_at,
        updated_at: data.updated_at,
        reviewer_name: data.reviewer?.name,
        reviewer_avatar: data.reviewer?.avatar_url,
        task_title: data.task?.title
      }
    } catch (error) {
      const appError = handleError(error, 'getReviewByTaskAndUsers')
      console.error('Error getting review:', appError)
      return null
    }
  }

  // Get reviews for a user
  static async getUserReviews(
    userId: string,
    reviewType?: 'customer_to_tasker' | 'tasker_to_customer',
    limit: number = 20,
    offset: number = 0
  ): Promise<Review[]> {
    try {
      let query = supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url),
          task:tasks(title)
        `)
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (reviewType) {
        query = query.eq('review_type', reviewType)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(review => ({
        id: review.id,
        task_id: review.task_id,
        reviewer_id: review.reviewer_id,
        reviewee_id: review.reviewee_id,
        rating: review.rating,
        comment: review.comment,
        review_type: review.review_type,
        is_anonymous: review.is_anonymous,
        created_at: review.created_at,
        updated_at: review.updated_at,
        reviewer_name: review.reviewer?.name,
        reviewer_avatar: review.reviewer?.avatar_url,
        task_title: review.task?.title
      }))
    } catch (error) {
      const appError = handleError(error, 'getUserReviews')
      console.error('Error getting user reviews:', appError)
      return []
    }
  }

  // Get reviews with filters
  static async getReviewsWithFilters(
    userId: string,
    filters: ReviewFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<Review[]> {
    try {
      let query = supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url),
          task:tasks(title)
        `)
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (filters.rating) {
        query = query.eq('rating', filters.rating)
      }

      if (filters.review_type) {
        query = query.eq('review_type', filters.review_type)
      }

      if (filters.is_anonymous !== undefined) {
        query = query.eq('is_anonymous', filters.is_anonymous)
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from)
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(review => ({
        id: review.id,
        task_id: review.task_id,
        reviewer_id: review.reviewer_id,
        reviewee_id: review.reviewee_id,
        rating: review.rating,
        comment: review.comment,
        review_type: review.review_type,
        is_anonymous: review.is_anonymous,
        created_at: review.created_at,
        updated_at: review.updated_at,
        reviewer_name: review.reviewer?.name,
        reviewer_avatar: review.reviewer?.avatar_url,
        task_title: review.task?.title
      }))
    } catch (error) {
      const appError = handleError(error, 'getReviewsWithFilters')
      console.error('Error getting filtered reviews:', appError)
      return []
    }
  }

  // Get rating summary for a user
  static async getUserRatingSummary(userId: string): Promise<RatingSummary | null> {
    try {
      // Get all reviews for the user
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('rating, created_at')
        .eq('reviewee_id', userId)

      if (error) throw error

      if (!reviews || reviews.length === 0) {
        return {
          user_id: userId,
          average_rating: 0,
          total_reviews: 0,
          rating_breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          recent_reviews: []
        }
      }

      // Calculate statistics
      const totalReviews = reviews.length
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
      const averageRating = totalRating / totalReviews

      // Calculate rating breakdown
      const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      reviews.forEach(review => {
        ratingBreakdown[review.rating as keyof typeof ratingBreakdown]++
      })

      // Get recent reviews
      const recentReviews = await this.getUserReviews(userId, undefined, 5)

      return {
        user_id: userId,
        average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        total_reviews: totalReviews,
        rating_breakdown: ratingBreakdown,
        recent_reviews: recentReviews
      }
    } catch (error) {
      const appError = handleError(error, 'getUserRatingSummary')
      console.error('Error getting rating summary:', appError)
      return null
    }
  }

  // Update user rating summary (called after creating a review)
  static async updateUserRatingSummary(userId: string): Promise<boolean> {
    try {
      const ratingSummary = await this.getUserRatingSummary(userId)
      if (!ratingSummary) return false

      // Update or insert rating summary
      const { error } = await supabase
        .from('user_rating_summaries')
        .upsert({
          user_id: userId,
          average_rating: ratingSummary.average_rating,
          total_reviews: ratingSummary.total_reviews,
          rating_breakdown: ratingSummary.rating_breakdown,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      return true
    } catch (error) {
      const appError = handleError(error, 'updateUserRatingSummary')
      console.error('Error updating rating summary:', appError)
      return false
    }
  }

  // Get top-rated users
  static async getTopRatedUsers(
    userType: 'tasker' | 'customer',
    limit: number = 10
  ): Promise<Array<{ user_id: string; average_rating: number; total_reviews: number; name: string; avatar_url?: string }>> {
    try {
      const { data, error } = await supabase
        .from('user_rating_summaries')
        .select(`
          user_id,
          average_rating,
          total_reviews,
          profile:profiles!user_rating_summaries_user_id_fkey(name, avatar_url, current_mode)
        `)
        .eq('profile.current_mode', userType)
        .gte('total_reviews', 1) // Only users with at least 1 review
        .order('average_rating', { ascending: false })
        .order('total_reviews', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []).map(item => ({
        user_id: item.user_id,
        average_rating: item.average_rating,
        total_reviews: item.total_reviews,
        name: item.profile?.name || 'Anonymous',
        avatar_url: item.profile?.avatar_url
      }))
    } catch (error) {
      const appError = handleError(error, 'getTopRatedUsers')
      console.error('Error getting top-rated users:', appError)
      return []
    }
  }

  // Update a review
  static async updateReview(
    reviewId: string,
    updates: {
      rating?: number
      comment?: string
      is_anonymous?: boolean
    }
  ): Promise<Review | null> {
    try {
      if (updates.rating && (updates.rating < 1 || updates.rating > 5)) {
        throw new Error('Rating must be between 1 and 5')
      }

      const { data, error } = await supabase
        .from('reviews')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url),
          task:tasks(title)
        `)
        .single()

      if (error) throw error

      // Update rating summary if rating changed
      if (updates.rating) {
        await this.updateUserRatingSummary(data.reviewee_id)
      }

      return {
        id: data.id,
        task_id: data.task_id,
        reviewer_id: data.reviewer_id,
        reviewee_id: data.reviewee_id,
        rating: data.rating,
        comment: data.comment,
        review_type: data.review_type,
        is_anonymous: data.is_anonymous,
        created_at: data.created_at,
        updated_at: data.updated_at,
        reviewer_name: data.reviewer?.name,
        reviewer_avatar: data.reviewer?.avatar_url,
        task_title: data.task?.title
      }
    } catch (error) {
      const appError = handleError(error, 'updateReview')
      console.error('Error updating review:', appError)
      return null
    }
  }

  // Delete a review
  static async deleteReview(reviewId: string): Promise<boolean> {
    try {
      // Get review details before deleting
      const { data: review, error: getError } = await supabase
        .from('reviews')
        .select('reviewee_id')
        .eq('id', reviewId)
        .single()

      if (getError) throw getError

      // Delete the review
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)

      if (error) throw error

      // Update rating summary
      if (review) {
        await this.updateUserRatingSummary(review.reviewee_id)
      }

      return true
    } catch (error) {
      const appError = handleError(error, 'deleteReview')
      console.error('Error deleting review:', appError)
      return false
    }
  }

  // Get reviews for a specific task
  static async getTaskReviews(taskId: string): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url),
          task:tasks(title)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map(review => ({
        id: review.id,
        task_id: review.task_id,
        reviewer_id: review.reviewer_id,
        reviewee_id: review.reviewee_id,
        rating: review.rating,
        comment: review.comment,
        review_type: review.review_type,
        is_anonymous: review.is_anonymous,
        created_at: review.created_at,
        updated_at: review.updated_at,
        reviewer_name: review.reviewer?.name,
        reviewer_avatar: review.reviewer?.avatar_url,
        task_title: review.task?.title
      }))
    } catch (error) {
      const appError = handleError(error, 'getTaskReviews')
      console.error('Error getting task reviews:', appError)
      return []
    }
  }

  // Check if user can review
  static async canUserReview(
    taskId: string,
    reviewerId: string,
    revieweeId: string,
    reviewType: 'customer_to_tasker' | 'tasker_to_customer'
  ): Promise<{ canReview: boolean; reason?: string }> {
    try {
      // Check if task exists and is completed
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('status, customer_id, assigned_tasker_id')
        .eq('id', taskId)
        .single()

      if (taskError) throw taskError
      if (!task) {
        return { canReview: false, reason: 'Task not found' }
      }

      if (task.status !== 'completed') {
        return { canReview: false, reason: 'Can only review completed tasks' }
      }

      // Check if review already exists
      const existingReview = await this.getReviewByTaskAndUsers(taskId, reviewerId, revieweeId, reviewType)
      if (existingReview) {
        return { canReview: false, reason: 'Review already exists' }
      }

      // Check permissions
      if (reviewType === 'customer_to_tasker') {
        if (task.customer_id !== reviewerId) {
          return { canReview: false, reason: 'Only the customer can review the tasker' }
        }
        if (task.assigned_tasker_id !== revieweeId) {
          return { canReview: false, reason: 'Can only review the assigned tasker' }
        }
      } else {
        if (task.assigned_tasker_id !== reviewerId) {
          return { canReview: false, reason: 'Only the assigned tasker can review the customer' }
        }
        if (task.customer_id !== revieweeId) {
          return { canReview: false, reason: 'Can only review the customer who posted the task' }
        }
      }

      return { canReview: true }
    } catch (error) {
      const appError = handleError(error, 'canUserReview')
      console.error('Error checking review permissions:', appError)
      return { canReview: false, reason: 'Error checking permissions' }
    }
  }
}