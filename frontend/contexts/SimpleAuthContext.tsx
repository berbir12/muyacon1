// simpleauthcontext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SimpleUserProfile } from '../types/SimpleUserProfile';

interface AuthContextType {
  user: SimpleUserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  isLoading: boolean; // Add this for backward compatibility
  sendVerificationCode: (phone: string, isSignUp?: boolean, fullName?: string, username?: string) => Promise<{ success: boolean; message: string }>;
  verifyPhoneCode: (phone: string, code: string) => Promise<{ success: boolean; message: string; isNewUser?: boolean }>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  switchMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SimpleUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;
  
  const normalizePhone = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '251' + cleaned.substring(1);
    if (!cleaned.startsWith('251')) cleaned = '251' + cleaned;
    return '+' + cleaned;
  };

  // Init auth state
  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        setUser(null);
        return;
      }

      if (session?.user) {
        try {
          await loadUserProfile(session.user.id);
        } catch (profileError) {
          console.error('Profile loading error:', profileError);
          // If profile doesn't exist, sign out the user
          await supabase.auth.signOut();
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth init error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId) // user_id references auth.users.id
        .maybeSingle();

      if (error) {
        console.error('Database error loading profile:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!profile) {
        console.log('No profile found for user:', userId);
        setUser(null);
        throw new Error('Profile not found');
      }

      console.log('Profile loaded successfully:', profile.full_name);
      setUser({
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        username: profile.username,
        phone: profile.phone,
        role: profile.role,
        current_mode: profile.current_mode,
        tasker_application_status: profile.tasker_application_status,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        name: profile.full_name,
        currentMode: profile.current_mode,
        profile,
      });
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      setUser(null);
      throw error;
    }
  };

  const sendVerificationCode = async (phone: string, isSignUp = false, fullName = '', username = '') => {
    const normalized = normalizePhone(phone);

    // Save signup info if it's a sign-up attempt
    if (isSignUp) {
      await AsyncStorage.setItem('pending_signup', JSON.stringify({ fullName, username, phone: normalized }));
    }

    // Send OTP without checking user existence first
    // We'll check during verification phase
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Verification code sent' };
  };

  const verifyPhoneCode = async (phone: string, code: string) => {
    try {
      const normalized = normalizePhone(phone);
      const { data, error } = await supabase.auth.verifyOtp({ phone: normalized, token: code, type: 'sms' });

      if (error) {
        console.error('OTP verification error:', error);
        return { success: false, message: error.message };
      }

      if (!data?.user) {
        console.error('No user data returned from OTP verification');
        return { success: false, message: 'Verification failed' };
      }
      
      const authUser = data.user;
      console.log('OTP verified successfully for user:', authUser.id);

      // Check pending sign-up
      const stored = await AsyncStorage.getItem('pending_signup');
      let isNewUser = false;

      if (stored) {
        try {
          const signUpData = JSON.parse(stored);
          await AsyncStorage.removeItem('pending_signup');

          console.log('Creating new profile for sign-up');
          
          // First check if profile already exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', authUser.id)
            .maybeSingle();

          if (existingProfile) {
            console.log('Profile already exists, loading it');
            await loadUserProfile(authUser.id);
            isNewUser = false;
            return { success: true, message: 'Account already exists. Signed in successfully.', isNewUser };
          }

          const { data: profile, error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: authUser.id, // Let database generate id automatically
              full_name: signUpData.fullName,
              username: signUpData.username,
              phone: signUpData.phone,
              role: 'customer',
              current_mode: 'customer',
            })
            .select()
            .single();

          if (createError) {
            console.error('Profile creation error:', createError);
            // If it's a duplicate key error, try to load existing profile
            if (createError.code === '23505') {
              console.log('Profile already exists (duplicate key), loading it');
              await loadUserProfile(authUser.id);
              isNewUser = false;
              return { success: true, message: 'Account already exists. Signed in successfully.', isNewUser };
            }
            return { success: false, message: createError.message };
          }

          await loadUserProfile(authUser.id);
          isNewUser = true;
          return { success: true, message: 'Account created successfully', isNewUser };
        } catch (signUpError) {
          console.error('Sign-up process error:', signUpError);
          return { success: false, message: 'Failed to create account. Please try again.' };
        }
      } else {
        // Sign-in flow - check if user exists first
        try {
          console.log('Checking if user exists for sign-in');
          const { data: existingProfile, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', authUser.id)
            .maybeSingle();

          if (checkError) {
            console.error('Error checking user existence during sign-in:', checkError);
            await supabase.auth.signOut();
            setUser(null);
            return { success: false, message: 'Error verifying user. Please try again.' };
          }

          if (!existingProfile) {
            console.log('No profile found for sign-in');
            await supabase.auth.signOut();
            setUser(null);
            return { success: false, message: 'User not found. Please sign up first.' };
          }

          console.log('Loading existing profile for sign-in');
          await loadUserProfile(authUser.id);
          return { success: true, message: 'Signed in successfully', isNewUser: false };
        } catch (profileError) {
          console.error('Profile loading error during sign-in:', profileError);
          await supabase.auth.signOut();
          setUser(null);
          return { success: false, message: 'No profile found. Please sign up first.' };
        }
      }
    } catch (error) {
      console.error('Unexpected error in verifyPhoneCode:', error);
      return { success: false, message: 'An unexpected error occurred. Please try again.' };
    }
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    await loadUserProfile(user.user_id);
  };

  const logout = async () => {
      await supabase.auth.signOut();
      setUser(null);
      await AsyncStorage.clear();
  };

  const switchMode = async () => {
    if (!user) {
      console.log('🚀 SWITCH MODE - No user found');
      return;
    }
    
    try {
      const currentMode = user.current_mode;
      const newMode = currentMode === 'customer' ? 'tasker' : 'customer';
      
      console.log('🚀 SWITCH MODE - Current mode:', currentMode, 'Switching to:', newMode);
      console.log('🚀 SWITCH MODE - User ID:', user.id);
      
      // Update the profile in the database
      const { error } = await supabase
        .from('profiles')
        .update({ 
          current_mode: newMode,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('🚀 SWITCH MODE - Database error:', error);
        throw error;
      }

      console.log('🚀 SWITCH MODE - Database updated successfully');

            // Update the local user state
            setUser(prev => {
              if (!prev) return null;
              const updated = { ...prev, current_mode: newMode as "tasker" | "customer" };
              console.log('🚀 SWITCH MODE - Local state updated:', updated.current_mode);
              return updated;
            });
      
      console.log(`🚀 SWITCH MODE - Mode switched to: ${newMode}`);
    } catch (error) {
      console.error('🚀 SWITCH MODE - Error switching mode:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    isLoading: loading, // Add this for backward compatibility
    sendVerificationCode,
    verifyPhoneCode,
    logout,
    refreshUserProfile,
    switchMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
