import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

// TODO: Replace these with your actual Supabase URL and API key
const supabaseUrl = 'https://vhyjvrcueujjvskglvjq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoeWp2cmN1ZXVqanZza2dsdmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTM5ODMsImV4cCI6MjA3MDYyOTk4M30.qcK2qKPAWro3gwOgx5J7H0kE3cirN3K5jP58RqOO-fM'

// Create storage adapter that works on both web and native
const createStorageAdapter = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => {
        if (typeof window !== 'undefined') {
          return Promise.resolve(window.localStorage.getItem(key))
        }
        return Promise.resolve(null)
      },
      setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value)
        }
        return Promise.resolve()
      },
      removeItem: (key: string) => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key)
        }
        return Promise.resolve()
      },
    }
  } else {
    // For native platforms, use AsyncStorage
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    return AsyncStorage
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  global: {
    headers: {
      'X-Client-Info': 'muyacon-app',
    },
  },
  db: {
    schema: 'public',
  },
})

// Database types
export interface UserProfile {
  id: string
  username: string
  full_name: string
  avatar_url?: string
  role: 'customer' | 'tasker' | 'both'
  created_at: string
  updated_at?: string
  // Personal information
  phone?: string
  bio?: string
  city?: string
  state?: string
  zip_code?: string
  location?: string
  // Professional information (for taskers)
  available?: boolean
  hourly_rate?: number
  skills?: string[]
  experience_years?: number
  certifications?: string[]
  languages?: string[]
  response_time?: string
  portfolio_images?: string[]
  // Statistics and ratings
  rating_average?: number
  rating_count?: number
  completed_tasks?: number
}

export interface ServiceCategory {
  id: string
  name: string
  icon: string
  description: string
}

export interface Booking {
  id: string
  customer_id: string
  technician_id?: string
  service_type: string
  description?: string
  scheduled_at?: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  location?: {
    address: string
    lat: number
    lng: number
  }
}

export interface Message {
  id: string
  task_id: string
  sender_id: string
  receiver_id: string
  content: string
  message_type: 'text' | 'image' | 'system'
  attachments?: string[]
  read_at?: string
  created_at: string
  sender_profile?: {
    username: string
    avatar_url?: string
  }
}