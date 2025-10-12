import { supabase } from '../lib/supabase'
import { SimpleSMSService } from './SimpleSMSService'

export interface Profile {
  id: string
  email?: string
  full_name: string
  username: string
  avatar_url?: string
  phone: string
  bio?: string
  skills?: string[]
  available: boolean
  verification_status: 'pending' | 'verified' | 'rejected'
  address?: string
  city?: string
  state?: string
  zip_code?: string
  latitude?: number
  longitude?: number
  total_tasks_completed: number
  created_at: string
  updated_at: string
  role: 'customer' | 'tasker' | 'both'
  rating_average: number
  rating_count: number
  completed_tasks: number
  last_active: string
  portfolio_images?: string[]
  experience_years: number
  certifications?: string[]
  languages?: string[]
  response_time: string
  location?: string
  average_rating: number
  total_reviews: number
  hourly_rate?: number
  is_admin: boolean
  phone_verified: boolean
  phone_verification_code?: string
  phone_verification_expires_at?: string
}

export class ProfileService {
  // Get user profile by ID
  static async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting profile:', error)
      return null
    }
  }

  // Create or update user profile
  static async upsertProfile(profileData: Partial<Profile>): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert([profileData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error upserting profile:', error)
      throw error
    }
  }

  // Update profile
  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  // Verify phone number using Simple SMS
  static async verifyPhoneNumber(phone: string, code: string): Promise<{ success: boolean, user?: any, error?: string }> {
    try {
      // Format phone number to E.164 format
      const formattedPhone = SimpleSMSService.formatPhoneNumber(phone)
      
      // Verify code using Simple SMS service
      return await SimpleSMSService.verifyCode(formattedPhone, code)
    } catch (error) {
      console.error('Error verifying phone number:', error)
      return { success: false, error: 'Failed to verify phone number' }
    }
  }

  // Send phone verification code using Simple SMS
  static async sendPhoneVerificationCode(phone: string): Promise<{ success: boolean, error?: string }> {
    try {
      // Format phone number to E.164 format
      const formattedPhone = SimpleSMSService.formatPhoneNumber(phone)
      
      // Validate phone number
      if (!SimpleSMSService.isValidPhoneNumber(formattedPhone)) {
        return { success: false, error: 'Invalid phone number format' }
      }

      // Send SMS via Simple SMS service
      return await SimpleSMSService.sendVerificationCode(formattedPhone)
    } catch (error) {
      console.error('Error sending verification code:', error)
      return { success: false, error: 'Failed to send verification code' }
    }
  }

  // Get user by phone number
  static async getUserByPhone(phone: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .single()

      if (error) {
        // If no rows found, return null instead of throwing
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }
      return data
    } catch (error) {
      console.error('Error getting user by phone:', error)
      return null
    }
  }

  // Create user profile after phone verification
  static async createUserProfile(userId: string, phone: string, fullName: string, username?: string): Promise<Profile | null> {
    try {
      const generatedUsername = username || `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      
      const profileData = {
        id: userId,
        phone,
        full_name: fullName,
        username: generatedUsername,
        role: 'customer' as const,
        available: true,
        verification_status: 'verified' as const,
        phone_verified: true,
        total_tasks_completed: 0,
        rating_average: 0,
        rating_count: 0,
        completed_tasks: 0,
        experience_years: 0,
        average_rating: 0,
        total_reviews: 0,
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single()

      if (error) {
        console.error('Error creating user profile:', error)
        // Return a temporary profile for now
        return {
          id: userId,
          phone,
          full_name: fullName,
          username: generatedUsername,
          role: 'customer',
          available: true,
          verification_status: 'verified',
          phone_verified: true,
          total_tasks_completed: 0,
          rating_average: 0,
          rating_count: 0,
          completed_tasks: 0,
          experience_years: 0,
          average_rating: 0,
          total_reviews: 0,
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Profile
      }
      return data
    } catch (error) {
      console.error('Error creating user profile:', error)
      // Return a temporary profile as fallback
      return {
        id: userId,
        phone,
        full_name: fullName,
        username: username || `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        role: 'customer',
        available: true,
        verification_status: 'verified',
        phone_verified: true,
        total_tasks_completed: 0,
        rating_average: 0,
        rating_count: 0,
        completed_tasks: 0,
        experience_years: 0,
        average_rating: 0,
        total_reviews: 0,
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Profile
    }
  }

  // Update user role
  static async updateUserRole(userId: string, role: 'customer' | 'tasker' | 'both'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating user role:', error)
      return false
    }
  }

  // Get tasker profiles
  static async getTaskerProfiles(limit: number = 20): Promise<Profile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['tasker', 'both'])
        .eq('available', true)
        .order('rating_average', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting tasker profiles:', error)
      return []
    }
  }

  // Search profiles
  static async searchProfiles(query: string, role?: 'customer' | 'tasker' | 'both'): Promise<Profile[]> {
    try {
      let queryBuilder = supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%,bio.ilike.%${query}%`)

      if (role) {
        queryBuilder = queryBuilder.eq('role', role)
      }

      const { data, error } = await queryBuilder
        .order('rating_average', { ascending: false })
        .limit(20)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error searching profiles:', error)
      return []
    }
  }

  // Send phone verification code
  static async sendPhoneVerificationCode(phone: string): Promise<{ success: boolean, error?: string }> {
    try {
      return await SimpleSMSService.sendVerificationCode(phone)
    } catch (error) {
      console.error('Error sending phone verification code:', error)
      return { success: false, error: 'Failed to send verification code' }
    }
  }

  // Verify phone number
  static async verifyPhoneNumber(phone: string, code: string): Promise<{ success: boolean, error?: string }> {
    try {
      return await SimpleSMSService.verifyCode(phone, code)
    } catch (error) {
      console.error('Error verifying phone number:', error)
      return { success: false, error: 'Failed to verify phone number' }
    }
  }

  // Get user by phone number
  static async getUserByPhone(phone: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No profile found
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Error getting user by phone:', error)
      return null
    }
  }
}
