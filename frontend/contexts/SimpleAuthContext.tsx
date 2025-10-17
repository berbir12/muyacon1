import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SimpleUserProfile } from '../types/SimpleUserProfile';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: SimpleUserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  sendVerificationCode: (phone: string, isSignUp?: boolean, fullName?: string, username?: string) => Promise<{ success: boolean; message: string }>;
  verifyPhoneCode: (phone: string, code: string) => Promise<{ success: boolean; message: string; isNewUser?: boolean }>;
  logout: () => Promise<void>;
  switchMode: (mode: 'customer' | 'tasker') => Promise<void>;
  checkUserExists: (phone: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SimpleUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;
  

  // Normalize phone number to a consistent format
  const normalizePhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Ethiopian phone numbers
    if (cleaned.startsWith('0')) {
      cleaned = '251' + cleaned.substring(1);
    } else if (!cleaned.startsWith('251')) {
      cleaned = '251' + cleaned;
    }
    
    return '+' + cleaned;
  };

  // Initialize auth state
  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      setLoading(true);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Create a basic profile without database calls to avoid permission issues
        const basicProfile: SimpleUserProfile = {
          id: session.user.id,
          user_id: session.user.id,
          full_name: session.user.user_metadata?.full_name || 'User',
          name: session.user.user_metadata?.full_name || 'User',
          username: session.user.user_metadata?.username || 'user_' + session.user.id.substring(0, 8),
          phone: session.user.phone || '',
          role: 'customer',
          current_mode: 'customer',
          currentMode: 'customer',
          profile: {
            full_name: session.user.user_metadata?.full_name || 'User',
            username: session.user.user_metadata?.username || 'user_' + session.user.id.substring(0, 8),
            phone: session.user.phone || '',
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser(basicProfile);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth init error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      // Load actual profile from database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If profile doesn't exist, create a basic one
        const basicProfile: SimpleUserProfile = {
          id: userId,
          user_id: userId,
          full_name: 'User',
          name: 'User',
          username: 'user_' + userId.substring(0, 8),
          phone: '',
          role: 'customer',
          current_mode: 'customer',
          currentMode: 'customer',
          profile: {
            full_name: 'User',
            username: 'user_' + userId.substring(0, 8),
            phone: '',
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser(basicProfile);
        return;
      }

      if (profile) {
        const userProfile: SimpleUserProfile = {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name || 'User',
          name: profile.full_name || 'User',
          username: profile.username || 'user_' + userId.substring(0, 8),
          phone: profile.phone || '',
          role: profile.role || 'customer',
          current_mode: profile.current_mode || 'customer',
          currentMode: profile.current_mode || 'customer',
          profile: {
            full_name: profile.full_name || 'User',
            username: profile.username || 'user_' + userId.substring(0, 8),
            phone: profile.phone || '',
          },
          created_at: profile.created_at || new Date().toISOString(),
          updated_at: profile.updated_at || new Date().toISOString(),
        };
        
        setUser(userProfile);
      }
    } catch (error) {
      // Fallback to basic profile
      const basicProfile: SimpleUserProfile = {
        id: userId,
        user_id: userId,
        full_name: 'User',
        name: 'User',
        username: 'user_' + userId.substring(0, 8),
        phone: '',
        role: 'customer',
        current_mode: 'customer',
        currentMode: 'customer',
        profile: {
          full_name: 'User',
          username: 'user_' + userId.substring(0, 8),
          phone: '',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser(basicProfile);
    }
  };

  const checkUserExists = async (phone: string): Promise<boolean> => {
    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      
      // Try multiple phone number formats
      const phoneFormats = [
        normalizedPhone, // Normalized format
        normalizedPhone.replace('+', ''), // Without +
        normalizedPhone.replace('+251', '0'), // Ethiopian format
        normalizedPhone.replace('+251', ''), // Without country code
        phone, // Original format
        phone.replace('+', ''), // Original without +
        phone.replace('+251', '0'), // Original Ethiopian format
        phone.replace('+251', ''), // Original without country code
      ];
      
      // Check each format
      for (const format of phoneFormats) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, phone')
          .eq('phone', format)
          .maybeSingle();

        if (error) {
          // If it's a permission error, return true to allow sign-in
          if (error.code === '42501') {
            return true;
          }
          continue;
        }

        if (data) {
          return true;
        }
      }
      
      // If we get a permission error, assume user exists to allow sign-in
      const { error: searchError } = await supabase
        .from('profiles')
        .select('id, phone')
        .limit(1);

      if (searchError && searchError.code === '42501') {
        return true;
      }

      return false;
    } catch (error) {
      // If there's any error, assume user exists to allow sign-in
      return true;
    }
  };


  const sendVerificationCode = async (phone: string, isSignUp: boolean = false, fullName?: string, username?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      
      // Check if user exists for sign-in flow
      if (!isSignUp) {
        const userExists = await checkUserExists(normalizedPhone);
        if (!userExists) {
          return {
            success: false,
            message: 'User not found. Please sign up first.'
          };
        }
      } else {
        // Check if user already exists for sign-up flow
        const userExists = await checkUserExists(normalizedPhone);
        if (userExists) {
          return {
            success: false,
            message: 'User already registered. Please sign in instead.'
          };
        }
      }

      // Store sign-up data temporarily for use during verification
      if (isSignUp && fullName && username) {
        const signUpData = { fullName, username, phone: normalizedPhone };
        await AsyncStorage.setItem('pending_signup', JSON.stringify(signUpData));
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'Verification code sent! Please check your phone.'
      };
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      return {
        success: false,
        message: error.message || 'Failed to send verification code. Please try again.'
      };
    }
  };

  const verifyPhoneCode = async (phone: string, code: string): Promise<{ success: boolean; message: string; isNewUser?: boolean }> => {
    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token: code,
        type: 'sms'
      });

      if (error) {
        return {
          success: false,
          message: 'Invalid verification code. Please try again.'
        };
      }

      if (data.user) {
        // Check if this was a sign-up with stored data
        const storedSignUpData = await AsyncStorage.getItem('pending_signup');
        let signUpData = null;
        let isNewUser = false;
        
        if (storedSignUpData) {
          try {
            signUpData = JSON.parse(storedSignUpData);
            // Clear the stored data
            await AsyncStorage.removeItem('pending_signup');
            isNewUser = true;
          } catch (e) {
            console.error('Error parsing stored sign-up data:', e);
          }
        }

        // Check if profile already exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (existingProfile) {
          await loadUserProfile(data.user.id);
          return {
            success: true,
            message: 'Welcome back! You have successfully signed in.',
            isNewUser: false
          };
        } else {
          // Create profile with sign-up data
          await createUserProfileIfNotExists(data.user, signUpData);
          return {
            success: true,
            message: 'Welcome! Your account has been created successfully.',
            isNewUser: true
          };
        }
      }

      return {
        success: false,
        message: 'Verification failed. Please try again.'
      };
    } catch (error: any) {
      console.error('Error verifying code:', error);
      return {
        success: false,
        message: error.message || 'Verification failed. Please try again.'
      };
    }
  };

  const createUserProfileIfNotExists = async (user: any, signUpData: any = null) => {
    try {
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        return;
      }

      // Use sign-up data if available, otherwise fall back to user metadata
      let fullName = '';
      let username = '';

      if (signUpData) {
        // Use the stored sign-up data
        fullName = signUpData.fullName || '';
        username = signUpData.username || '';
      } else {
        // Fall back to user metadata
        const metadata = user.raw_user_meta_data || {};
        fullName = metadata.full_name || '';
        username = metadata.username || '';
      }

      // Create profile manually with proper data
      const normalizedPhone = normalizePhoneNumber(user.phone || '');
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          username: username || 'user_' + user.id.substring(0, 8),
          phone: normalizedPhone,
          full_name: fullName || '',
          current_mode: 'customer', // Default to customer mode
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return;
      }

      if (profile) {
        // Load the newly created profile
        await loadUserProfile(user.id);
      }
    } catch (error) {
      console.error('Error in createUserProfileIfNotExists:', error);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const switchMode = async (mode: 'customer' | 'tasker') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ current_mode: mode })
        .eq('user_id', user.user_id);

      if (error) {
        throw error;
      }

      // Update local state
      setUser(prev => prev ? { ...prev, current_mode: mode } : null);
    } catch (error) {
      console.error('Error switching mode:', error);
      throw error;
    }
  };

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Create basic profile without database calls
          const basicProfile: SimpleUserProfile = {
            id: session.user.id,
            user_id: session.user.id,
            full_name: session.user.user_metadata?.full_name || 'User',
            name: session.user.user_metadata?.full_name || 'User',
            username: session.user.user_metadata?.username || 'user_' + session.user.id.substring(0, 8),
            phone: session.user.phone || '',
            role: 'customer',
            current_mode: 'customer',
            currentMode: 'customer',
            profile: {
              full_name: session.user.user_metadata?.full_name || 'User',
              username: session.user.user_metadata?.username || 'user_' + session.user.id.substring(0, 8),
              phone: session.user.phone || '',
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setUser(basicProfile);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    sendVerificationCode,
    verifyPhoneCode,
    logout,
    switchMode,
    checkUserExists,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
