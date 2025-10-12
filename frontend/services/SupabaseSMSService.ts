import { supabase } from '../lib/supabase'

export class SupabaseSMSService {
  // Format phone number to E.164 format
  static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '')
    
    // Handle Ethiopian numbers
    if (cleaned.startsWith('0')) {
      cleaned = '251' + cleaned.substring(1)
    }
    
    // Add country code if missing
    if (!cleaned.startsWith('251') && !cleaned.startsWith('+')) {
      cleaned = '251' + cleaned
    }
    
    // Add + prefix
    return '+' + cleaned
  }

  // Validate phone number format
  static isValidPhoneNumber(phone: string): boolean {
    const formatted = this.formatPhoneNumber(phone)
    // Basic validation for Ethiopian numbers (+251XXXXXXXXX)
    return /^\+251[0-9]{9}$/.test(formatted)
  }

  // Generate a 6-digit verification code
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Send verification code via SMS
  static async sendVerificationCode(phone: string): Promise<{ success: boolean, error?: string }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone)
      
      if (!this.isValidPhoneNumber(formattedPhone)) {
        return { success: false, error: 'Invalid phone number format' }
      }

      // Generate verification code
      const code = this.generateVerificationCode()
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now

      // Store verification code in database
      const { error: insertError } = await supabase
        .from('phone_verifications')
        .insert([{
          phone_number: formattedPhone,
          verification_code: code,
          expires_at: expiresAt.toISOString(),
          used: false
        }])

      if (insertError) {
        console.error('Error storing verification code:', insertError)
        return { success: false, error: 'Failed to store verification code' }
      }

      // In development, log the code to console
      if (__DEV__) {
        console.log(`🔐 Verification code for ${formattedPhone}: ${code}`)
        console.log('📱 In production, this would be sent via SMS')
      }

      // For now, we'll simulate SMS sending
      // In production, you would integrate with a real SMS service like Twilio
      console.log(`📱 SMS would be sent to ${formattedPhone} with code: ${code}`)
      
      return { success: true }
    } catch (error) {
      console.error('Error sending verification code:', error)
      return { success: false, error: 'Failed to send verification code' }
    }
  }

  // Verify the code entered by user
  static async verifyCode(phone: string, code: string): Promise<{ success: boolean, user?: any, error?: string }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone)
      
      // Find the verification record
      const { data: verification, error: fetchError } = await supabase
        .from('phone_verifications')
        .select('*')
        .eq('phone_number', formattedPhone)
        .eq('verification_code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fetchError) {
        console.error('Error fetching verification code:', fetchError)
        return { success: false, error: 'Invalid or expired verification code' }
      }

      if (!verification) {
        return { success: false, error: 'Invalid or expired verification code' }
      }

      // Mark code as used
      const { error: updateError } = await supabase
        .from('phone_verifications')
        .update({ used: true })
        .eq('id', verification.id)

      if (updateError) {
        console.error('Error updating verification code:', updateError)
        // Don't fail the verification if we can't update the used status
      }

      // For now, we'll create a mock user for authentication
      // In production, this would integrate with Supabase Auth
      const mockUser = {
        id: 'temp-user-' + Date.now(),
        phone: formattedPhone,
        created_at: new Date().toISOString()
      }

      return { success: true, user: mockUser }
    } catch (error) {
      console.error('Error verifying code:', error)
      return { success: false, error: 'Failed to verify code' }
    }
  }

  // Clean up expired verification codes
  static async cleanupExpiredCodes(): Promise<void> {
    try {
      const { error } = await supabase
        .from('phone_verifications')
        .delete()
        .lt('expires_at', new Date().toISOString())

      if (error) {
        console.error('Error cleaning up expired codes:', error)
      }
    } catch (error) {
      console.error('Error cleaning up expired codes:', error)
    }
  }
}
