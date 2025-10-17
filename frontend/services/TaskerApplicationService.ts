import { supabase } from '../lib/supabase'
import { SimpleNotificationService } from './SimpleNotificationService'
import { ProfileVerificationService, VerificationDocument, SkillVerification } from './ProfileVerificationService'

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
  // Create a new tasker application with verification integration
  static async createApplication(applicationData: Omit<TaskerApplication, 'id' | 'created_at' | 'updated_at' | 'user_name'>): Promise<TaskerApplication | null> {
    try {
      // Check if user already has a pending or approved application
      const existingApplication = await this.getApplicationByUserId(applicationData.user_id)
      if (existingApplication && existingApplication.status !== 'rejected') {
        throw new Error('User already has a pending or approved tasker application')
      }

      // Check verification requirements before allowing application
      const verificationCheck = await ProfileVerificationService.checkVerificationRequirements(
        applicationData.user_id, 
        'tasker'
      )

      if (!verificationCheck.meets) {
        throw new Error(`Verification requirements not met: ${verificationCheck.missing.join(', ')}`)
      }

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

      // Create verification documents for ID verification
      if (applicationData.id_front_url) {
        await ProfileVerificationService.uploadVerificationDocument(
          applicationData.user_id,
          'id_card',
          'ID Card Front',
          applicationData.id_front_url
        )
      }

      if (applicationData.id_back_url) {
        await ProfileVerificationService.uploadVerificationDocument(
          applicationData.user_id,
          'id_card',
          'ID Card Back',
          applicationData.id_back_url
        )
      }

      // Create skill verifications for each skill
      for (const skill of applicationData.skills) {
        await ProfileVerificationService.addSkillVerification(
          applicationData.user_id,
          skill,
          'General', // Default category
          'intermediate', // Default proficiency level
          'self_claimed', // Initial verification method
          undefined // No document initially
        )
      }

      // Create verification documents for certifications
      for (const certification of applicationData.certifications) {
        await ProfileVerificationService.uploadVerificationDocument(
          applicationData.user_id,
          'certificate',
          certification,
          '' // Placeholder - would need actual file URL
        )
      }

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
            role: status === 'approved' ? 'tasker' : 'customer',
            updated_at: new Date().toISOString()
          })
          .eq('id', application.user_id)

        // Handle verification status based on application status
        if (status === 'approved') {
          // Approve all verification documents for this user
          const documents = await ProfileVerificationService.getUserVerificationDocuments(application.user_id)
          for (const doc of documents) {
            if (doc.status === 'pending') {
              await ProfileVerificationService.approveVerificationDocument(doc.id, 'system')
            }
          }

          // Approve all skill verifications for this user
          const skills = await ProfileVerificationService.getUserSkillVerifications(application.user_id)
          for (const skill of skills) {
            if (skill.status === 'pending') {
              await ProfileVerificationService.approveSkillVerification(skill.id, 'system')
            }
          }

          // Update verification status to reflect approval
          await ProfileVerificationService.updateVerificationStatus(application.user_id, {
            identity_verified: true,
            skills_verified: true,
            overall_verification_score: 90, // High score for approved taskers
            verification_badge: 'verified'
          })

          await SimpleNotificationService.notifyTaskerApproved(application.user_id, application.full_name)
        } else if (status === 'rejected') {
          // Reject all pending verification documents
          const documents = await ProfileVerificationService.getUserVerificationDocuments(application.user_id)
          for (const doc of documents) {
            if (doc.status === 'pending') {
              await ProfileVerificationService.rejectVerificationDocument(
                doc.id, 
                'system', 
                'Tasker application was rejected'
              )
            }
          }

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

  // Get application with verification status
  static async getApplicationWithVerificationStatus(applicationId: string): Promise<{
    application: TaskerApplication | null
    verificationStatus: any
    verificationDocuments: VerificationDocument[]
    skillVerifications: SkillVerification[]
  }> {
    try {
      // Get application
      const { data: application, error: appError } = await supabase
        .from('tasker_applications')
        .select('*')
        .eq('id', applicationId)
        .single()

      if (appError) throw appError

      if (!application) {
        return {
          application: null,
          verificationStatus: null,
          verificationDocuments: [],
          skillVerifications: []
        }
      }

      // Get verification status
      const verificationStatus = await ProfileVerificationService.getVerificationStatus(application.user_id)
      
      // Get verification documents
      const verificationDocuments = await ProfileVerificationService.getUserVerificationDocuments(application.user_id)
      
      // Get skill verifications
      const skillVerifications = await ProfileVerificationService.getUserSkillVerifications(application.user_id)

      return {
        application,
        verificationStatus,
        verificationDocuments,
        skillVerifications
      }
    } catch (error) {
      console.error('Error getting application with verification status:', error)
      return {
        application: null,
        verificationStatus: null,
        verificationDocuments: [],
        skillVerifications: []
      }
    }
  }

  // Check if user can apply to become tasker
  static async canUserApplyToBeTasker(userId: string): Promise<{
    canApply: boolean
    reasons: string[]
    verificationStatus: any
  }> {
    try {
      // Check if user already has an application
      const existingApplication = await this.getApplicationByUserId(userId)
      if (existingApplication && existingApplication.status !== 'rejected') {
        return {
          canApply: false,
          reasons: ['User already has a pending or approved tasker application'],
          verificationStatus: null
        }
      }

      // Check verification requirements
      const verificationCheck = await ProfileVerificationService.checkVerificationRequirements(userId, 'tasker')
      const verificationStatus = await ProfileVerificationService.getVerificationStatus(userId)

      return {
        canApply: verificationCheck.meets,
        reasons: verificationCheck.missing,
        verificationStatus
      }
    } catch (error) {
      console.error('Error checking if user can apply:', error)
      return {
        canApply: false,
        reasons: ['Error checking application eligibility'],
        verificationStatus: null
      }
    }
  }

  // Get application requirements for user
  static async getApplicationRequirements(userId: string): Promise<{
    basicRequirements: string[]
    verificationRequirements: string[]
    missingRequirements: string[]
    currentVerificationScore: number
  }> {
    try {
      const verificationCheck = await ProfileVerificationService.checkVerificationRequirements(userId, 'tasker')
      const verificationStatus = await ProfileVerificationService.getVerificationStatus(userId)

      const basicRequirements = [
        'Valid phone number',
        'Complete profile information',
        'At least 18 years old',
        'Emergency contact information',
        'Skills and experience details'
      ]

      const verificationRequirements = [
        'Phone verification',
        'Email verification',
        'Identity document verification',
        'Skill verification',
        'Background check'
      ]

      return {
        basicRequirements,
        verificationRequirements,
        missingRequirements: verificationCheck.missing,
        currentVerificationScore: verificationStatus?.overall_verification_score || 0
      }
    } catch (error) {
      console.error('Error getting application requirements:', error)
      return {
        basicRequirements: [],
        verificationRequirements: [],
        missingRequirements: ['Error loading requirements'],
        currentVerificationScore: 0
      }
    }
  }

  // Update application with additional verification documents
  static async updateApplicationWithVerification(
    applicationId: string,
    additionalDocuments: { type: VerificationDocument['document_type'], name: string, fileUrl: string }[]
  ): Promise<boolean> {
    try {
      // Get application to get user_id
      const { data: application, error: appError } = await supabase
        .from('tasker_applications')
        .select('user_id')
        .eq('id', applicationId)
        .single()

      if (appError) throw appError
      if (!application) return false

      // Upload additional verification documents
      for (const doc of additionalDocuments) {
        await ProfileVerificationService.uploadVerificationDocument(
          application.user_id,
          doc.type,
          doc.name,
          doc.fileUrl
        )
      }

      return true
    } catch (error) {
      console.error('Error updating application with verification:', error)
      return false
    }
  }
}