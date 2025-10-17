import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SimpleUserProfile } from '../types/SimpleUserProfile';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: SimpleUserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  sendVerificationCode: (phone: string) => Promise<void>;
  verifyPhoneCode: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  switchMode: (mode: 'customer' | 'tasker') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SimpleUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;
  
  // Debug logging
  useEffect(() => {
    console.log('Auth state changed - user:', user ? 'logged in' : 'not logged in');
    console.log('isAuthenticated:', isAuthenticated);
  }, [user, isAuthenticated]);

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
        await loadUserProfile(session.user.id);
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
    console.log('Loading profile for user ID:', userId);
    
    // Create profile immediately without database call
    const basicProfile: SimpleUserProfile = {
      id: userId,
      user_id: userId,
      full_name: 'Ejg',
      name: 'Ejg',
      username: 'Ejg',
      phone: '251911854765',
      role: 'customer',
      current_mode: 'customer',
      currentMode: 'customer',
      profile: {
        full_name: 'Ejg',
        username: 'Ejg',
        phone: '251911854765',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setUser(basicProfile);
    console.log('User set:', basicProfile);
  };

  const sendVerificationCode = async (phone: string, isSignUp: boolean = false, fullName?: string, username?: string) => {
    try {
      // Store sign-up data temporarily for use during verification
      if (isSignUp && fullName && username) {
        // Store in AsyncStorage for later use
        const signUpData = { fullName, username, phone };
        await AsyncStorage.setItem('pending_signup', JSON.stringify(signUpData));
        console.log('Stored sign-up data:', signUpData);
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
      });

      if (error) {
        throw error;
      }

      console.log('Verification code sent to:', phone);
    } catch (error) {
      console.error('Error sending verification code:', error);
      throw error;
    }
  };

  const verifyPhoneCode = async (phone: string, code: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: code,
        type: 'sms'
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Check if this was a sign-up with stored data
        const storedSignUpData = await AsyncStorage.getItem('pending_signup');
        let signUpData = null;
        
        if (storedSignUpData) {
          try {
            signUpData = JSON.parse(storedSignUpData);
            console.log('Found stored sign-up data:', signUpData);
            // Clear the stored data
            await AsyncStorage.removeItem('pending_signup');
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
          console.log('Profile already exists, loading it');
          await loadUserProfile(data.user.id);
        } else {
          console.log('No existing profile, creating new one with sign-up data');
          // Create profile with sign-up data
          await createUserProfileIfNotExists(data.user, signUpData);
        }
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      throw error;
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
        console.log('Profile already exists');
        return;
      }

      // Use sign-up data if available, otherwise fall back to user metadata
      let fullName = '';
      let username = '';

      if (signUpData) {
        // Use the stored sign-up data
        fullName = signUpData.fullName || '';
        username = signUpData.username || '';
        console.log('Using sign-up data:', { fullName, username, signUpData });
      } else {
        // Fall back to user metadata
        const metadata = user.raw_user_meta_data || {};
        fullName = metadata.full_name || '';
        username = metadata.username || '';
        console.log('Using user metadata:', { fullName, username, metadata });
      }

      // Create profile manually with proper data
      const { data: profile, error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          username: username || 'user_' + user.id.substring(0, 8),
          phone: user.phone || '',
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
        console.log('Profile created successfully with data:', profile);
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
        console.log('Auth state change:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Try to load existing profile first
          await loadUserProfile(session.user.id);
          
          // If no profile exists, create one
          setTimeout(async () => {
            await createUserProfileIfNotExists(session.user);
          }, 1000);
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
