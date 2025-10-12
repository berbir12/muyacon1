import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ProfileService, Profile } from '../services/ProfileService'
import { SimpleSMSService } from '../services/SimpleSMSService'
import { SimpleNotificationService } from '../services/SimpleNotificationService'
import { PushNotificationService } from '../services/PushNotificationService'
import { generateUUID } from '../utils/uuid'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface User {
  id: string
  phone: string
  name: string
  role: 'customer' | 'tasker' | 'both'
  currentMode: 'customer' | 'tasker'
  taskerApplicationStatus?: 'pending' | 'approved' | 'rejected'
  profile?: Profile
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (phone: string, name: string) => Promise<void>
  logout: () => Promise<void>
  switchMode: (mode: 'customer' | 'tasker') => Promise<void>
  sendVerificationCode: (phone: string, fullName: string, username: string) => Promise<{ success: boolean, error?: string, code?: string }>
  verifyPhoneCode: (phone: string, code: string) => Promise<boolean>
  isPhoneRegistered: (phone: string) => Promise<boolean>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      console.log('Auth: Initializing authentication...')
      
      // Check Supabase session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Auth: Session error:', sessionError)
        setUser(null)
        setIsLoading(false)
        return
      }
      
      if (session?.user) {
        console.log('Auth: Found Supabase session for user:', session.user.id)
        
        // Get or create profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (profileError) {
          console.error('Auth: Profile error:', profileError)
          // Create profile if it doesn't exist
          const newProfile = {
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || 'User',
            email: session.user.email,
            phone: session.user.phone,
            role: 'customer',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([newProfile])
          
          if (insertError) {
            console.error('Auth: Error creating profile:', insertError)
            setUser(null)
          } else {
            const userData = {
              id: session.user.id,
              phone: session.user.phone || '',
              name: newProfile.full_name,
              role: 'customer' as const,
              currentMode: 'customer' as const,
              profile: newProfile
            }
            setUser(userData)
            await AsyncStorage.setItem('user', JSON.stringify(userData))
          }
        } else {
          console.log('Auth: Found existing profile:', profile.full_name)
          const userData = {
            id: session.user.id,
            phone: session.user.phone || '',
            name: profile.full_name || 'User',
            role: profile.role || 'customer',
            currentMode: profile.role === 'tasker' ? 'tasker' : 'customer',
            profile: profile
          }
          setUser(userData)
          await AsyncStorage.setItem('user', JSON.stringify(userData))
        }
      } else {
        console.log('Auth: No Supabase session found')
        // Check local storage as fallback
        const storedUser = await AsyncStorage.getItem('user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          console.log('Auth: Found stored user (offline):', userData.id, userData.name)
          setUser(userData)
        } else {
          setUser(null)
        }
      }
    } catch (error) {
      console.error('Auth: Error initializing auth:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const sendVerificationCode = async (phone: string, fullName: string, username: string): Promise<{ success: boolean, error?: string, code?: string }> => {
    try {
      // Use SimpleSMSService to send verification code
      const result = await SimpleSMSService.sendVerificationCode(phone)
      
      if (!result.success) {
        return result
      }
      
      // Store user details for later use
      const userDetails = {
        phone,
        fullName,
        username,
        timestamp: Date.now()
      }
      
      // Store in AsyncStorage temporarily
      await AsyncStorage.setItem('temp_user_details', JSON.stringify(userDetails))
      
      return { success: true, code: result.code }
    } catch (error) {
      console.error('Error sending verification code:', error)
      return { success: false, error: 'Failed to send verification code' }
    }
  }

  const verifyPhoneCode = async (phone: string, code: string): Promise<boolean> => {
    try {
      // Use SimpleSMSService to verify the code
      const result = await SimpleSMSService.verifyCode(phone, code)
      
      if (!result.success) {
        console.error('Phone verification failed:', result.error)
        return false
      }

      // Check if user already exists
      let existingProfile = await ProfileService.getUserByPhone(phone)
      
      if (existingProfile) {
        // User exists, load their profile
        const userData = {
          id: existingProfile.id,
          phone: existingProfile.phone,
          name: existingProfile.full_name,
          role: existingProfile.role,
          currentMode: existingProfile.role === 'both' ? 'customer' : existingProfile.role,
          profile: existingProfile
        }
        
        setUser(userData)
        await AsyncStorage.setItem('user', JSON.stringify(userData))
        
        // Initialize notifications for existing user
        // Register for push notifications
        await PushNotificationService.registerForPushNotifications()
        
        console.log('Loaded existing user profile')
        return true
      }

      // New user - get stored user details
      const tempUserDetails = await AsyncStorage.getItem('temp_user_details')
      
      if (!tempUserDetails) {
        console.error('No temporary user details found')
        return false
      }

      const userDetails = JSON.parse(tempUserDetails)
      
      // Create a proper UUID for the new user
      const newUserId = generateUUID()
      
      console.log('Phone verification successful, creating new user:', newUserId)

      // Create profile for the new user
      const profile = await ProfileService.createUserProfile(
        newUserId,
        phone,
        userDetails.fullName,
        userDetails.username
      )
      
      if (profile) {
        const userData = {
          id: profile.id,
          phone: profile.phone,
          name: profile.full_name,
          role: profile.role,
          currentMode: profile.role === 'both' ? 'customer' : profile.role as 'customer' | 'tasker',
          profile
        }
        
        setUser(userData)
        await AsyncStorage.setItem('user', JSON.stringify(userData))
        
        // Initialize notifications for new user
        // Register for push notifications
        await PushNotificationService.registerForPushNotifications()
        
        console.log('Created new user profile')
      } else {
        // Fallback to temporary user if profile creation fails
        const tempUser = {
          id: newUserId,
          phone: phone,
          name: userDetails.fullName,
          role: 'customer' as const,
          currentMode: 'customer' as const,
          profile: undefined
        }
        
        setUser(tempUser)
        await AsyncStorage.setItem('user', JSON.stringify(tempUser))
        
        // Initialize notifications for temporary user
        // Register for push notifications
        await PushNotificationService.registerForPushNotifications()
        
        console.log('Created temporary user (profile creation failed)')
      }

      // Clean up temporary user details
      await AsyncStorage.removeItem('temp_user_details')

      return true
    } catch (error) {
      console.error('Error verifying phone code:', error)
      return false
    }
  }

  const isPhoneRegistered = async (phone: string): Promise<boolean> => {
    try {
      const profile = await ProfileService.getUserByPhone(phone)
      return !!profile
    } catch (error) {
      console.error('Error checking phone registration:', error)
      return false
    }
  }

  const login = async (phone: string, name: string) => {
    try {
      // Get or create profile
      let profile = await ProfileService.getUserByPhone(phone)
      
      if (!profile) {
        // Create profile for the user
        const userId = generateUUID()
        profile = await ProfileService.createUserProfile(
          userId,
          phone,
          name,
          name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000)
        )
      }
      
      if (profile) {
        const userData = {
          id: profile.id,
          phone: profile.phone,
          name: profile.full_name,
          role: profile.role,
          currentMode: profile.role === 'both' ? 'customer' : profile.role as 'customer' | 'tasker',
          profile
        }
        
        setUser(userData)
        await AsyncStorage.setItem('user', JSON.stringify(userData))
      } else {
        throw new Error('Failed to create or load user profile')
      }
    } catch (error) {
      console.error('Error logging in:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      // Clear user state first to prevent render errors
      setUser(null)
      await AsyncStorage.removeItem('user')
      // Clear any temporary data
      await AsyncStorage.removeItem('temp_user_details')
    } catch (error) {
      console.error('Error logging out:', error)
      // Even if there's an error, ensure user is logged out
      setUser(null)
    }
  }

  const switchMode = async (mode: 'customer' | 'tasker') => {
    if (!user) return
    
    try {
      // Update the user's current mode without changing their role
      const updatedUser = { ...user, currentMode: mode }
      setUser(updatedUser)
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser))
    } catch (error) {
      console.error('Error switching mode:', error)
    }
  }

  const refreshUser = async () => {
    if (!user) return
    
    try {
      // Fetch updated user profile from database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (profile) {
        const updatedUser = {
          ...user,
          role: profile.role || 'customer',
          taskerApplicationStatus: profile.tasker_application_status || 'none',
          profile: profile
        }
        
        setUser(updatedUser)
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser))
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      switchMode,
      sendVerificationCode,
      verifyPhoneCode,
      isPhoneRegistered,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}