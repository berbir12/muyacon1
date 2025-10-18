import { supabase } from '../lib/supabase'

export interface ProfileData {
  user_id: string
  full_name: string
  username: string
  phone: string
  role?: 'customer' | 'tasker' | 'both'
  current_mode?: 'customer' | 'tasker'
}

export class ProfileManagementService {
  // Normalize phone number to a consistent format
  private static normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Ethiopian phone numbers
    if (cleaned.startsWith('0')) {
      cleaned = '251' + cleaned.substring(1);
    } else if (!cleaned.startsWith('251')) {
      cleaned = '251' + cleaned;
    }
    
    return '+' + cleaned;
  }

  // Find existing profile by user_id
  static async findProfileByUserId(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error finding profile by user_id:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in findProfileByUserId:', error);
      return null;
    }
  }

  // Find existing profile by phone number
  static async findProfileByPhone(phone: string) {
    try {
      if (!phone) {
        return null;
      }

      const normalizedPhone = this.normalizePhoneNumber(phone);
      
      // Try different phone formats
      const phoneFormats = [
        normalizedPhone,
        normalizedPhone.replace('+', ''),
        '0' + normalizedPhone.replace('+251', ''),
        normalizedPhone.replace('+251', ''),
        phone, // original format
        phone.replace('+', ''),
        '0' + phone.replace('+251', ''),
        phone.replace('+251', '')
      ];
      
      // Remove duplicates
      const uniqueFormats = [...new Set(phoneFormats)];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('phone', uniqueFormats)
        .maybeSingle();

      if (error) {
        console.error('Error finding profile by phone:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in findProfileByPhone:', error);
      return null;
    }
  }

  // Create a new profile
  static async createProfile(profileData: ProfileData) {
    try {
      console.log('Creating profile with data:', profileData);
      
      // Validate required fields
      if (!profileData.user_id || !profileData.full_name || !profileData.phone) {
        throw new Error('Missing required profile data');
      }

      const normalizedPhone = this.normalizePhoneNumber(profileData.phone);
      
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: profileData.user_id,
          full_name: profileData.full_name,
          username: profileData.username || `user_${profileData.user_id.substring(0, 8)}`,
          phone: normalizedPhone,
          role: profileData.role || 'customer',
          current_mode: profileData.current_mode || 'customer'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        throw error;
      }

      console.log('Successfully created profile:', data);
      return data;
    } catch (error) {
      console.error('Error in createProfile:', error);
      throw error;
    }
  }

  // Link existing profile to user
  static async linkProfileToUser(profileId: string, userId: string) {
    try {
      console.log('Linking profile to user:', { profileId, userId });
      
      const { error } = await supabase
        .from('profiles')
        .update({ user_id: userId })
        .eq('id', profileId);

      if (error) {
        console.error('Error linking profile to user:', error);
        throw error;
      }

      console.log('Successfully linked profile to user');
      return true;
    } catch (error) {
      console.error('Error in linkProfileToUser:', error);
      throw error;
    }
  }

  // Get profile for user (no automatic creation)
  static async getProfile(userId: string) {
    try {
      // Validate inputs
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Try to find existing profile by user_id
      const profile = await this.findProfileByUserId(userId);
      return { profile, isNew: false };
    } catch (error) {
      console.error('Error in getProfile:', error);
      return { profile: null, isNew: false };
    }
  }

  // Update profile
  static async updateProfile(profileId: string, updates: Partial<ProfileData>) {
    try {
      console.log('Updating profile:', { profileId, updates });
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      console.log('Successfully updated profile:', data);
      return data;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  }

  // Delete profile
  static async deleteProfile(profileId: string) {
    try {
      console.log('Deleting profile:', profileId);
      
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) {
        console.error('Error deleting profile:', error);
        throw error;
      }

      console.log('Successfully deleted profile');
      return true;
    } catch (error) {
      console.error('Error in deleteProfile:', error);
      throw error;
    }
  }
}
