import { supabase } from '../lib/supabase'
import { SimpleNotificationService } from './SimpleNotificationService'

export interface TaskerApplication {
  id: string
  user_id: string
  full_name: string
  phone: string
  bio: string
  skills: string[]
  experience_years: number
  id_front_url?: string
  id_back_url?: string
  skill_verifications?: { skill: string; level: string; documents: string[] }[]
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  // Additional fields for display
  user_name?: string
}

export class TaskerApplicationService {
  // Create a new tasker application or reapply if rejected
  static async createApplication(applicationData: Omit<TaskerApplication, 'id' | 'created_at' | 'updated_at' | 'user_name'>): Promise<TaskerApplication | null> {
    try {
      // Check if user already has an application
      const existingApplication = await this.getApplicationByUserId(applicationData.user_id)
      
      if (existingApplication) {
        if (existingApplication.status === 'rejected') {
          // Update existing rejected application
          const { data, error } = await supabase
            .from('tasker_applications')
            .update({
              ...applicationData,
              status: 'pending',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingApplication.id)
            .select('*')
            .single()

          if (error) throw error

          // Update user profile with application status
          await supabase
            .from('profiles')
            .update({
              tasker_application_status: 'pending',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', applicationData.user_id)

          return {
            ...data,
            user_name: applicationData.full_name
          }
        } else {
          throw new Error('User already has a pending or approved tasker application')
        }
      }

      // Create new application
      const { data, error } = await supabase
        .from('tasker_applications')
        .insert([applicationData])
        .select('*')
        .single()

      if (error) throw error

      // Update user profile with application status
      await supabase
        .from('profiles')
        .update({
          tasker_application_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', applicationData.user_id)

      return {
        ...data,
        user_name: applicationData.full_name
      }
    } catch (error) {
      console.error('Error creating tasker application:', error)
      throw error
    }
  }

  // Get all tasker applications (admin function)
  static async getAllApplications(): Promise<TaskerApplication[]> {
    try {
      const { data, error } = await supabase
        .from('tasker_applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting all applications:', error)
      return []
    }
  }

  // Get application by user ID
  static async getApplicationByUserId(userId: string): Promise<TaskerApplication | null> {
    try {
      const { data, error } = await supabase
        .from('tasker_applications')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting application by user ID:', error)
      return null
    }
  }

  // Update application status with verification integration
  static async updateApplicationStatus(applicationId: string, status: TaskerApplication['status']): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tasker_applications')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      if (error) throw error

      // Get application details for notification
      const { data: application } = await supabase
        .from('tasker_applications')
        .select('user_id, full_name, skills')
        .eq('id', applicationId)
        .single()

      if (application) {
        // Update user profile
        await supabase
          .from('profiles')
          .update({ 
            tasker_application_status: status,
            role: status === 'approved' ? 'both' : 'customer',
            updated_at: new Date().toISOString()
          })
          .eq('id', application.user_id)

        // Send notifications based on application status
        if (status === 'approved') {
          await SimpleNotificationService.notifyTaskerApproved(application.user_id, application.full_name)
        } else if (status === 'rejected') {
          await SimpleNotificationService.notifyTaskerRejected(application.user_id, application.full_name)
        }
      }

      return true
    } catch (error) {
      console.error('Error updating application status:', error)
      return false
    }
  }

  // Approve application
  static async approveApplication(applicationId: string): Promise<boolean> {
    return await this.updateApplicationStatus(applicationId, 'approved')
  }

  // Reject application
  static async rejectApplication(applicationId: string): Promise<boolean> {
    return await this.updateApplicationStatus(applicationId, 'rejected')
  }

  // Listen for tasker application status changes
  static subscribeToApplicationStatus(userId: string, onStatusChange: (status: string) => void) {
    const subscription = supabase
      .channel('tasker_application_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasker_applications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newStatus = payload.new.status
          onStatusChange(newStatus)
        }
      )
      .subscribe()

    return subscription
  }

  // Listen for profile changes (role updates)
  static subscribeToProfileChanges(userId: string, onProfileChange: (profile: any) => void) {
    console.log('Setting up profile subscription for user:', userId);
    
    const subscription = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          console.log('Profile change detected:', payload);
          onProfileChange(payload.new)
        }
      )
      .subscribe((status) => {
        console.log('Profile subscription status:', status);
      })

    return subscription
  }

  // Get application statistics
  static async getApplicationStats(): Promise<{
    total: number
    pending: number
    approved: number
    rejected: number
  }> {
    try {
      const { data, error } = await supabase
        .from('tasker_applications')
        .select('status')

      if (error) throw error

      const stats = {
        total: data.length,
        pending: data.filter(app => app.status === 'pending').length,
        approved: data.filter(app => app.status === 'approved').length,
        rejected: data.filter(app => app.status === 'rejected').length,
      }

      return stats
    } catch (error) {
      console.error('Error getting application stats:', error)
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      }
    }
  }

  // Delete application
  static async deleteApplication(applicationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tasker_applications')
        .delete()
        .eq('id', applicationId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting application:', error)
      return false
    }
  }

  // Check if user can apply to become tasker
  static async canUserApplyToBeTasker(userId: string): Promise<{
    canApply: boolean
    reasons: string[]
  }> {
    try {
      // Check if user already has an application
      const existingApplication = await this.getApplicationByUserId(userId)
      if (existingApplication && existingApplication.status !== 'rejected') {
        return {
          canApply: false,
          reasons: ['User already has a pending or approved tasker application']
        }
      }

      return {
        canApply: true,
        reasons: []
      }
    } catch (error) {
      console.error('Error checking if user can apply:', error)
      return {
        canApply: false,
        reasons: ['Error checking application eligibility']
      }
    }
  }
}