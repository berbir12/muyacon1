import { Alert, ToastAndroid, Platform } from 'react-native'
import { supabase } from '../lib/supabase'

export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: string
  userId?: string
  context?: string
}

export interface ErrorReport {
  error: AppError
  userAgent?: string
  appVersion?: string
  platform?: string
  stackTrace?: string
}

export class ErrorHandlingService {
  private static errorQueue: AppError[] = []
  private static isReporting = false

  // Log an error
  static logError(
    error: Error | string,
    context?: string,
    details?: any
  ): AppError {
    const appError: AppError = {
      code: this.getErrorCode(error),
      message: typeof error === 'string' ? error : error.message,
      details,
      timestamp: new Date().toISOString(),
      context
    }

    console.error('App Error:', appError)
    this.errorQueue.push(appError)

    // Report error in background
    this.reportError(appError)

    return appError
  }

  // Handle API errors
  static handleApiError(error: any, context?: string): AppError {
    let message = 'An unexpected error occurred'
    let code = 'UNKNOWN_ERROR'

    if (error?.code) {
      switch (error.code) {
        case 'PGRST116':
          message = 'No data found'
          code = 'NO_DATA_FOUND'
          break
        case 'PGRST301':
          message = 'Invalid request'
          code = 'INVALID_REQUEST'
          break
        case 'PGRST205':
          message = 'Table not found'
          code = 'TABLE_NOT_FOUND'
          break
        case '42501':
          message = 'Permission denied'
          code = 'PERMISSION_DENIED'
          break
        case '23502':
          message = 'Required field is missing'
          code = 'MISSING_REQUIRED_FIELD'
          break
        case '23503':
          message = 'Referenced record not found'
          code = 'FOREIGN_KEY_VIOLATION'
          break
        case '23505':
          message = 'Record already exists'
          code = 'DUPLICATE_RECORD'
          break
        case '42P01':
          message = 'Table does not exist'
          code = 'TABLE_NOT_EXISTS'
          break
        case '42P07':
          message = 'Table already exists'
          code = 'TABLE_EXISTS'
          break
        default:
          message = error.message || 'Database error'
          code = error.code || 'DATABASE_ERROR'
      }
    } else if (error?.message) {
      message = error.message
      code = 'API_ERROR'
    }

    return this.logError(new Error(message), context, { originalError: error })
  }

  // Handle network errors
  static handleNetworkError(error: any, context?: string): AppError {
    let message = 'Network error'
    let code = 'NETWORK_ERROR'

    if (error?.message?.includes('Network request failed')) {
      message = 'No internet connection'
      code = 'NO_INTERNET'
    } else if (error?.message?.includes('timeout')) {
      message = 'Request timed out'
      code = 'TIMEOUT'
    } else if (error?.message?.includes('Aborted')) {
      message = 'Request was cancelled'
      code = 'CANCELLED'
    }

    return this.logError(new Error(message), context, { originalError: error })
  }

  // Handle authentication errors
  static handleAuthError(error: any, context?: string): AppError {
    let message = 'Authentication error'
    let code = 'AUTH_ERROR'

    if (error?.message?.includes('Invalid login credentials')) {
      message = 'Invalid email or password'
      code = 'INVALID_CREDENTIALS'
    } else if (error?.message?.includes('Email not confirmed')) {
      message = 'Please confirm your email address'
      code = 'EMAIL_NOT_CONFIRMED'
    } else if (error?.message?.includes('User not found')) {
      message = 'User account not found'
      code = 'USER_NOT_FOUND'
    } else if (error?.message?.includes('Too many requests')) {
      message = 'Too many attempts. Please try again later'
      code = 'TOO_MANY_REQUESTS'
    }

    return this.logError(new Error(message), context, { originalError: error })
  }

  // Show user-friendly error message
  static showError(error: AppError, showAlert: boolean = true): void {
    const userMessage = this.getUserFriendlyMessage(error)

    if (showAlert) {
      Alert.alert(
        'Error',
        userMessage,
        [{ text: 'OK', style: 'default' }]
      )
    } else if (Platform.OS === 'android') {
      ToastAndroid.show(userMessage, ToastAndroid.LONG)
    }

    console.error('User Error:', userMessage)
  }

  // Show success message
  static showSuccess(message: string, showAlert: boolean = false): void {
    if (showAlert) {
      Alert.alert(
        'Success',
        message,
        [{ text: 'OK', style: 'default' }]
      )
    } else if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT)
    }

    console.log('Success:', message)
  }

  // Show warning message
  static showWarning(message: string, showAlert: boolean = false): void {
    if (showAlert) {
      Alert.alert(
        'Warning',
        message,
        [{ text: 'OK', style: 'default' }]
      )
    } else if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.LONG)
    }

    console.warn('Warning:', message)
  }

  // Show info message
  static showInfo(message: string, showAlert: boolean = false): void {
    if (showAlert) {
      Alert.alert(
        'Info',
        message,
        [{ text: 'OK', style: 'default' }]
      )
    } else if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT)
    }

    console.log('Info:', message)
  }

  // Get user-friendly error message
  private static getUserFriendlyMessage(error: AppError): string {
    switch (error.code) {
      case 'NO_INTERNET':
        return 'Please check your internet connection and try again.'
      case 'TIMEOUT':
        return 'The request is taking too long. Please try again.'
      case 'PERMISSION_DENIED':
        return 'You don\'t have permission to perform this action.'
      case 'MISSING_REQUIRED_FIELD':
        return 'Please fill in all required fields.'
      case 'DUPLICATE_RECORD':
        return 'This record already exists.'
      case 'INVALID_CREDENTIALS':
        return 'Invalid email or password. Please try again.'
      case 'EMAIL_NOT_CONFIRMED':
        return 'Please check your email and confirm your account.'
      case 'USER_NOT_FOUND':
        return 'User account not found. Please sign up first.'
      case 'TOO_MANY_REQUESTS':
        return 'Too many attempts. Please wait a moment and try again.'
      case 'NO_DATA_FOUND':
        return 'No data found for your request.'
      case 'INVALID_REQUEST':
        return 'Invalid request. Please try again.'
      case 'TABLE_NOT_FOUND':
      case 'TABLE_NOT_EXISTS':
        return 'Service temporarily unavailable. Please try again later.'
      default:
        return error.message || 'Something went wrong. Please try again.'
    }
  }

  // Get error code from error object
  private static getErrorCode(error: Error | string): string {
    if (typeof error === 'string') {
      return 'CUSTOM_ERROR'
    }

    if (error.name === 'TypeError') {
      return 'TYPE_ERROR'
    }
    if (error.name === 'ReferenceError') {
      return 'REFERENCE_ERROR'
    }
    if (error.name === 'SyntaxError') {
      return 'SYNTAX_ERROR'
    }

    return 'UNKNOWN_ERROR'
  }

  // Report error to backend
  private static async reportError(error: AppError): Promise<void> {
    if (this.isReporting) return

    try {
      this.isReporting = true

      const errorReport: ErrorReport = {
        error,
        userAgent: 'React Native App',
        appVersion: '1.0.0',
        platform: Platform.OS,
        stackTrace: error.details?.stack
      }

      // Try to report to backend
      await supabase
        .from('error_reports')
        .insert({
          error_code: error.code,
          error_message: error.message,
          error_details: error.details,
          context: error.context,
          user_id: error.userId,
          platform: Platform.OS,
          app_version: '1.0.0',
          created_at: error.timestamp
        })

      console.log('Error reported to backend')
    } catch (reportError) {
      console.error('Failed to report error:', reportError)
    } finally {
      this.isReporting = false
    }
  }

  // Get error statistics
  static getErrorStats(): {
    totalErrors: number
    errorsByCode: Record<string, number>
    recentErrors: AppError[]
  } {
    const errorsByCode: Record<string, number> = {}
    
    this.errorQueue.forEach(error => {
      errorsByCode[error.code] = (errorsByCode[error.code] || 0) + 1
    })

    return {
      totalErrors: this.errorQueue.length,
      errorsByCode,
      recentErrors: this.errorQueue.slice(-10) // Last 10 errors
    }
  }

  // Clear error queue
  static clearErrorQueue(): void {
    this.errorQueue = []
  }

  // Create a retry mechanism
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    context?: string
  ): Promise<T> {
    let lastError: AppError | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = this.handleApiError(error, context)
        
        if (attempt === maxRetries) {
          throw lastError
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }

  // Create a safe async operation wrapper
  static async safeAsync<T>(
    operation: () => Promise<T>,
    context?: string,
    fallback?: T
  ): Promise<T | null> {
    try {
      return await operation()
    } catch (error) {
      const appError = this.handleApiError(error, context)
      this.showError(appError, false)
      return fallback || null
    }
  }
}
