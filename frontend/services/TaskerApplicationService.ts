import { supabase } from '../lib/supabase'
import { SimpleNotificationService } from './SimpleNotificationService'

export interface TaskerApplication {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip_code: string
  date_of_birth: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relationship: string
  years_of_experience: number
  skills: string[]
  availability: string[]
  hourly_rate: number
  certifications: string[]
  id_front_url?: string
  id_back_url?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  // Additional fields for display
  user_name?: string
}

export class TaskerApplicationService {
  // Create a new tasker application
  static async createApplication(applicationData: Omit<TaskerApplication, 'id' | 'created_at' | 'updated_at' | 'user_name'>): Promise<TaskerApplication | null> {
    try {
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
        .eq('id', applicationData.user_id)

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
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting application by user ID:', error)
      return null
    }
  }

  // Update application status
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
        .select('user_id, full_name')
        .eq('id', applicationId)
        .single()

      if (application) {
        // Update user profile
        await supabase
          .from('profiles')
          .update({ 
            tasker_application_status: status,
            role: status === 'approved' ? 'tasker' : 'customer',
            updated_at: new Date().toISOString()
          })
          .eq('id', application.user_id)

        // Send notification
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
}