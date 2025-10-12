import { supabase } from '../lib/supabase'
import { ErrorHandlingService } from './ErrorHandlingService'

export interface PaymentMethod {
  id: string
  type: 'card' | 'bank_account' | 'wallet'
  last4?: string
  brand?: string
  expiry_month?: number
  expiry_year?: number
  is_default: boolean
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  task_id?: string
  type: 'payment' | 'refund' | 'withdrawal' | 'deposit' | 'commission'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  payment_method_id?: string
  description: string
  metadata?: any
  created_at: string
  updated_at: string
}

export interface Wallet {
  id: string
  user_id: string
  balance: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'cancelled'
  client_secret: string
  metadata?: any
}

export class PaymentService {
  // Get user's wallet
  static async getWallet(userId: string): Promise<Wallet | null> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'getWallet')
      console.error('Error getting wallet:', appError)
      return null
    }
  }

  // Create or update wallet
  static async createWallet(userId: string, currency: string = 'USD'): Promise<Wallet | null> {
    try {
      // Check if wallet already exists
      const existingWallet = await this.getWallet(userId)
      if (existingWallet) return existingWallet

      const { data, error } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          balance: 0,
          currency,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'createWallet')
      console.error('Error creating wallet:', appError)
      return null
    }
  }

  // Get payment methods
  static async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'getPaymentMethods')
      console.error('Error getting payment methods:', appError)
      return []
    }
  }

  // Add payment method
  static async addPaymentMethod(
    userId: string,
    paymentMethodData: {
      type: 'card' | 'bank_account'
      last4: string
      brand?: string
      expiry_month?: number
      expiry_year?: number
      is_default?: boolean
    }
  ): Promise<PaymentMethod | null> {
    try {
      // If this is set as default, unset other defaults
      if (paymentMethodData.is_default) {
        await supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', userId)
      }

      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: userId,
          ...paymentMethodData
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'addPaymentMethod')
      console.error('Error adding payment method:', appError)
      return null
    }
  }

  // Remove payment method
  static async removePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', paymentMethodId)

      if (error) throw error
      return true
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'removePaymentMethod')
      console.error('Error removing payment method:', appError)
      return false
    }
  }

  // Set default payment method
  static async setDefaultPaymentMethod(paymentMethodId: string, userId: string): Promise<boolean> {
    try {
      // Unset all other defaults
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', userId)

      // Set this one as default
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', paymentMethodId)
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'setDefaultPaymentMethod')
      console.error('Error setting default payment method:', appError)
      return false
    }
  }

  // Create payment intent
  static async createPaymentIntent(
    amount: number,
    currency: string = 'USD',
    metadata?: any
  ): Promise<PaymentIntent | null> {
    try {
      // In a real implementation, this would integrate with Stripe or similar
      // For now, we'll simulate the payment intent creation
      const paymentIntent: PaymentIntent = {
        id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        status: 'requires_payment_method',
        client_secret: `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`,
        metadata
      }

      return paymentIntent
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'createPaymentIntent')
      console.error('Error creating payment intent:', appError)
      return null
    }
  }

  // Process payment
  static async processPayment(
    paymentIntentId: string,
    paymentMethodId: string,
    amount: number,
    description: string,
    metadata?: any
  ): Promise<Transaction | null> {
    try {
      // In a real implementation, this would process the payment with Stripe
      // For now, we'll simulate a successful payment
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: metadata?.user_id || '',
        task_id: metadata?.task_id,
        type: 'payment',
        amount,
        currency: 'USD',
        status: 'completed',
        payment_method_id: paymentMethodId,
        description,
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Save transaction to database
      const { error } = await supabase
        .from('transactions')
        .insert(transaction)

      if (error) throw error

      // Update wallet balance if this is a deposit
      if (metadata?.is_deposit) {
        await this.updateWalletBalance(transaction.user_id, amount, 'deposit')
      }

      return transaction
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'processPayment')
      console.error('Error processing payment:', appError)
      return null
    }
  }

  // Update wallet balance
  static async updateWalletBalance(
    userId: string,
    amount: number,
    type: 'deposit' | 'withdrawal' | 'payment' | 'refund'
  ): Promise<boolean> {
    try {
      const wallet = await this.getWallet(userId)
      if (!wallet) {
        // Create wallet if it doesn't exist
        await this.createWallet(userId)
        return this.updateWalletBalance(userId, amount, type)
      }

      let newBalance = wallet.balance
      if (type === 'deposit' || type === 'refund') {
        newBalance += amount
      } else if (type === 'withdrawal' || type === 'payment') {
        newBalance -= amount
      }

      if (newBalance < 0) {
        throw new Error('Insufficient funds')
      }

      const { error } = await supabase
        .from('wallets')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'updateWalletBalance')
      console.error('Error updating wallet balance:', appError)
      return false
    }
  }

  // Get transactions
  static async getTransactions(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return data || []
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'getTransactions')
      console.error('Error getting transactions:', appError)
      return []
    }
  }

  // Process task payment
  static async processTaskPayment(
    taskId: string,
    customerId: string,
    taskerId: string,
    amount: number,
    paymentMethodId: string
  ): Promise<Transaction | null> {
    try {
      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(amount, 'USD', {
        task_id: taskId,
        customer_id: customerId,
        tasker_id: taskerId
      })

      if (!paymentIntent) {
        throw new Error('Failed to create payment intent')
      }

      // Process payment
      const transaction = await this.processPayment(
        paymentIntent.id,
        paymentMethodId,
        amount,
        `Payment for task ${taskId}`,
        {
          task_id: taskId,
          customer_id: customerId,
          tasker_id: taskerId,
          user_id: customerId
        }
      )

      if (!transaction) {
        throw new Error('Payment processing failed')
      }

      // Update task payment status
      await supabase
        .from('tasks')
        .update({ 
          payment_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      // Create transaction for tasker (they receive the payment minus commission)
      const commission = amount * 0.1 // 10% commission
      const taskerAmount = amount - commission

      await this.createTransaction(
        taskerId,
        taskId,
        'payment',
        taskerAmount,
        `Payment received for task ${taskId}`,
        {
          task_id: taskId,
          customer_id: customerId,
          tasker_id: taskerId,
          commission
        }
      )

      return transaction
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'processTaskPayment')
      console.error('Error processing task payment:', appError)
      return null
    }
  }

  // Create transaction
  static async createTransaction(
    userId: string,
    taskId: string | undefined,
    type: Transaction['type'],
    amount: number,
    description: string,
    metadata?: any
  ): Promise<Transaction | null> {
    try {
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        task_id: taskId,
        type,
        amount,
        currency: 'USD',
        status: 'completed',
        description,
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'createTransaction')
      console.error('Error creating transaction:', appError)
      return null
    }
  }

  // Request withdrawal
  static async requestWithdrawal(
    userId: string,
    amount: number,
    bankAccountId: string
  ): Promise<Transaction | null> {
    try {
      const wallet = await this.getWallet(userId)
      if (!wallet || wallet.balance < amount) {
        throw new Error('Insufficient funds')
      }

      const transaction = await this.createTransaction(
        userId,
        undefined,
        'withdrawal',
        amount,
        `Withdrawal request for $${amount}`,
        { bank_account_id: bankAccountId }
      )

      if (transaction) {
        // Update wallet balance
        await this.updateWalletBalance(userId, amount, 'withdrawal')
      }

      return transaction
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'requestWithdrawal')
      console.error('Error requesting withdrawal:', appError)
      return null
    }
  }

  // Get payment statistics
  static async getPaymentStats(userId: string): Promise<{
    totalEarnings: number
    totalSpent: number
    pendingWithdrawals: number
    completedTransactions: number
  }> {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('type, amount, status')
        .eq('user_id', userId)

      if (error) throw error

      const stats = {
        totalEarnings: 0,
        totalSpent: 0,
        pendingWithdrawals: 0,
        completedTransactions: 0
      }

      transactions?.forEach(transaction => {
        if (transaction.status === 'completed') {
          stats.completedTransactions++
          
          if (transaction.type === 'payment' && transaction.amount > 0) {
            stats.totalEarnings += transaction.amount
          } else if (transaction.type === 'payment' && transaction.amount < 0) {
            stats.totalSpent += Math.abs(transaction.amount)
          } else if (transaction.type === 'withdrawal' && transaction.status === 'pending') {
            stats.pendingWithdrawals += transaction.amount
          }
        }
      })

      return stats
    } catch (error) {
      const appError = ErrorHandlingService.handleApiError(error, 'getPaymentStats')
      console.error('Error getting payment stats:', appError)
      return {
        totalEarnings: 0,
        totalSpent: 0,
        pendingWithdrawals: 0,
        completedTransactions: 0
      }
    }
  }
}
