import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../contexts/SimpleAuthContext'
import Colors from '../constants/Colors'


export default function Auth() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const { sendVerificationCode, verifyPhoneCode, isAuthenticated } = useAuth()

  // Redirect away if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated])

  // Reset auth state when user logs out
  React.useEffect(() => {
    if (!isAuthenticated) {
      setVerificationCode('')
      setIsCodeSent(false)
      setLoading(false)
      setCountdown(0)
    }
  }, [isAuthenticated])

  const startCountdown = () => {
    setCountdown(60)
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const cleanPhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('0')) {
      cleaned = '251' + cleaned.substring(1)
    }
    if (!cleaned.startsWith('251')) {
      cleaned = '251' + cleaned
    }
    return '+' + cleaned
  }

  const handleSendCode = async () => {
    if (isSignUp) {
      if (!fullName.trim()) {
        Alert.alert('Error', 'Please enter your full name')
        return
      }

      if (!username.trim()) {
        Alert.alert('Error', 'Please enter a username')
        return
      }
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number')
      return
    }

    const formattedPhone = cleanPhoneNumber(phoneNumber)
    if (formattedPhone.length !== 13) {
      Alert.alert('Error', 'Please enter a valid 9-digit phone number (e.g., 0912345678)')
      return
    }

    setLoading(true)
    try {
      const result = await sendVerificationCode(formattedPhone, isSignUp, fullName, username)
      
      if (result.success) {
        Alert.alert('Success', result.message)
        setIsCodeSent(true)
        startCountdown()
      } else {
        Alert.alert('Error', result.message)
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code')
      return
    }

    setLoading(true)
    try {
      const formattedPhone = cleanPhoneNumber(phoneNumber)
      const result = await verifyPhoneCode(formattedPhone, verificationCode)
      
      if (result.success) {
        Alert.alert('Success', result.message)
        
        // Reset form state
        setVerificationCode('')
        setIsCodeSent(false)
        setPhoneNumber('')
        setFullName('')
        setUsername('')
        // Navigation will be handled by the layout redirect
      } else {
        Alert.alert('Error', result.message)
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (countdown === 0) {
      setLoading(true)
      try {
        const formattedPhone = cleanPhoneNumber(phoneNumber)
        const result = await sendVerificationCode(formattedPhone, isSignUp, fullName, username)
        
        if (result.success) {
          setVerificationCode('')
          setIsCodeSent(false)
          Alert.alert('Success', 'New verification code sent')
          startCountdown()
        } else {
          Alert.alert('Error', result.message)
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to resend verification code')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.background}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons name="phone-portrait" size={48} color={Colors.primary[500]} />
                </View>
                <Text style={styles.title}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
                <Text style={styles.subtitle}>
                  {isCodeSent
                    ? `Enter the 6-digit code sent to ${phoneNumber}`
                    : isSignUp 
                      ? 'Enter your details to get started'
                      : 'Enter your phone number to sign in'}
                </Text>
              </View>

              {/* Auth Mode Toggle */}
              {!isCodeSent && (
                <View style={styles.authToggle}>
                  <TouchableOpacity
                    style={[styles.toggleButton, !isSignUp && styles.toggleButtonActive]}
                    onPress={() => setIsSignUp(false)}
                  >
                    <Text style={[styles.toggleText, !isSignUp && styles.toggleTextActive]}>
                      Sign In
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleButton, isSignUp && styles.toggleButtonActive]}
                    onPress={() => setIsSignUp(true)}
                  >
                    <Text style={[styles.toggleText, isSignUp && styles.toggleTextActive]}>
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                </View>
              )}


              {/* Form */}
              <View style={styles.form}>
                {!isCodeSent ? (
                  <>
                    {isSignUp && (
                      <>
                        <View style={styles.inputContainer}>
                          <Ionicons name="person" size={20} color={Colors.primary[500]} />
                          <TextInput
                            style={styles.input}
                            placeholder="Enter your full name"
                            placeholderTextColor={Colors.neutral[400]}
                            value={fullName}
                            onChangeText={setFullName}
                            autoFocus
                            returnKeyType="next"
                          />
                        </View>

                        <View style={styles.inputContainer}>
                          <Ionicons name="at" size={20} color={Colors.primary[500]} />
                          <TextInput
                            style={styles.input}
                            placeholder="Enter username"
                            placeholderTextColor={Colors.neutral[400]}
                            value={username}
                            onChangeText={setUsername}
                            returnKeyType="next"
                          />
                        </View>
                      </>
                    )}

                    <View style={styles.inputContainer}>
                      <Ionicons name="call" size={20} color={Colors.primary[500]} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter phone number"
                        placeholderTextColor={Colors.neutral[400]}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        editable={true}
                        selectTextOnFocus={true}
                        autoFocus={!isSignUp}
                      />
                    </View>
                    
                    <TouchableOpacity
                      style={[styles.button, loading && styles.buttonDisabled]}
                      onPress={handleSendCode}
                      disabled={loading}
                    >
                      <Ionicons name="send" size={20} color="#fff" />
                      <Text style={styles.buttonText}>
                        {loading 
                          ? 'Sending Code...' 
                          : isSignUp 
                            ? 'Send Verification Code' 
                            : 'Sign In'
                        }
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.backToPhoneButton}
                      onPress={() => {
                        setIsCodeSent(false)
                        setVerificationCode('')
                      }}
                    >
                      <Ionicons name="arrow-back" size={20} color={Colors.primary[500]} />
                      <Text style={styles.backToPhoneText}>Change phone number</Text>
                    </TouchableOpacity>

                    <View style={styles.inputContainer}>
                      <Ionicons name="keypad" size={20} color={Colors.primary[500]} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter verification code"
                        placeholderTextColor={Colors.neutral[400]}
                        value={verificationCode}
                        onChangeText={setVerificationCode}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>
                    
                    <TouchableOpacity
                      style={[styles.button, loading && styles.buttonDisabled]}
                      onPress={handleVerifyCode}
                      disabled={loading}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.buttonText}>
                        {loading ? 'Verifying...' : 'Verify Code'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.doneButton}
                      onPress={Keyboard.dismiss}
                    >
                      <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.resendButton, countdown > 0 && styles.resendButtonDisabled]}
                      onPress={handleResendCode}
                      disabled={countdown > 0}
                    >
                      <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
                        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  keyboardView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.background.secondary,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.neutral[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.neutral[600],
    textAlign: 'center',
    lineHeight: 22,
  },
  devCodeContainer: {
    backgroundColor: Colors.primary[50],
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  devCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary[700],
    marginBottom: 8,
    textAlign: 'center',
  },
  devCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary[900],
    textAlign: 'center',
    letterSpacing: 4,
  },
  form: {
    width: '100%',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.neutral[900],
    marginLeft: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[500],
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: Colors.neutral[300],
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendText: {
    color: Colors.primary[500],
    fontSize: 14,
    fontWeight: '500',
  },
  resendTextDisabled: {
    color: Colors.neutral[400],
  },
  doneButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  doneButtonText: {
    color: Colors.neutral[600],
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 16,
  },
  authToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[100],
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary[500],
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[600],
  },
  toggleTextActive: {
    color: '#fff',
  },
  backToPhoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 20,
    gap: 8,
  },
  backToPhoneText: {
    color: Colors.primary[500],
    fontSize: 16,
    fontWeight: '500',
  },
})