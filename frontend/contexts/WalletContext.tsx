import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { PaymentService, Wallet, Transaction, PaymentMethod } from '../services/PaymentService'

interface WalletContextType {
  wallet: Wallet | null
  transactions: Transaction[]
  paymentMethods: PaymentMethod[]
  loading: boolean
  refreshWallet: () => Promise<void>
  refreshTransactions: () => Promise<void>
  refreshPaymentMethods: () => Promise<void>
  addPaymentMethod: (data: any) => Promise<boolean>
  removePaymentMethod: (id: string) => Promise<boolean>
  setDefaultPaymentMethod: (id: string) => Promise<boolean>
  processPayment: (amount: number, description: string, metadata?: any) => Promise<boolean>
  requestWithdrawal: (amount: number, bankAccountId: string) => Promise<boolean>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(false)

  // Initialize wallet when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      initializeWallet()
    } else {
      clearWallet()
    }
  }, [isAuthenticated, user?.id])

  const initializeWallet = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Get or create wallet
      let walletData = await PaymentService.getWallet(user.id)
      if (!walletData) {
        walletData = await PaymentService.createWallet(user.id)
      }

      // Load transactions and payment methods
      const [transactionsData, paymentMethodsData] = await Promise.all([
        PaymentService.getTransactions(user.id),
        PaymentService.getPaymentMethods(user.id)
      ])

      setWallet(walletData)
      setTransactions(transactionsData)
      setPaymentMethods(paymentMethodsData)
    } catch (error) {
      console.error('Error initializing wallet:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearWallet = () => {
    setWallet(null)
    setTransactions([])
    setPaymentMethods([])
  }

  const refreshWallet = useCallback(async () => {
    if (!user?.id) return

    try {
      const walletData = await PaymentService.getWallet(user.id)
      setWallet(walletData)
    } catch (error) {
      console.error('Error refreshing wallet:', error)
    }
  }, [user?.id])

  const refreshTransactions = useCallback(async () => {
    if (!user?.id) return

    try {
      const transactionsData = await PaymentService.getTransactions(user.id)
      setTransactions(transactionsData)
    } catch (error) {
      console.error('Error refreshing transactions:', error)
    }
  }, [user?.id])

  const refreshPaymentMethods = useCallback(async () => {
    if (!user?.id) return

    try {
      const paymentMethodsData = await PaymentService.getPaymentMethods(user.id)
      setPaymentMethods(paymentMethodsData)
    } catch (error) {
      console.error('Error refreshing payment methods:', error)
    }
  }, [user?.id])

  const addPaymentMethod = useCallback(async (data: any): Promise<boolean> => {
    if (!user?.id) return false

    try {
      const paymentMethod = await PaymentService.addPaymentMethod(user.id, data)
      if (paymentMethod) {
        setPaymentMethods(prev => [paymentMethod, ...prev])
        return true
      }
      return false
    } catch (error) {
      console.error('Error adding payment method:', error)
      return false
    }
  }, [user?.id])

  const removePaymentMethod = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await PaymentService.removePaymentMethod(id)
      if (success) {
        setPaymentMethods(prev => prev.filter(pm => pm.id !== id))
        return true
      }
      return false
    } catch (error) {
      console.error('Error removing payment method:', error)
      return false
    }
  }, [])

  const setDefaultPaymentMethod = useCallback(async (id: string): Promise<boolean> => {
    if (!user?.id) return false

    try {
      const success = await PaymentService.setDefaultPaymentMethod(id, user.id)
      if (success) {
        setPaymentMethods(prev => 
          prev.map(pm => ({
            ...pm,
            is_default: pm.id === id
          }))
        )
        return true
      }
      return false
    } catch (error) {
      console.error('Error setting default payment method:', error)
      return false
    }
  }, [user?.id])

  const processPayment = useCallback(async (
    amount: number,
    description: string,
    metadata?: any
  ): Promise<boolean> => {
    if (!user?.id) return false

    try {
      const defaultPaymentMethod = paymentMethods.find(pm => pm.is_default)
      if (!defaultPaymentMethod) {
        throw new Error('No default payment method found')
      }

      const paymentIntent = await PaymentService.createPaymentIntent(amount, 'USD', metadata)
      if (!paymentIntent) {
        throw new Error('Failed to create payment intent')
      }

      const transaction = await PaymentService.processPayment(
        paymentIntent.id,
        defaultPaymentMethod.id,
        amount,
        description,
        { ...metadata, user_id: user.id }
      )

      if (transaction) {
        setTransactions(prev => [transaction, ...prev])
        await refreshWallet()
        return true
      }
      return false
    } catch (error) {
      console.error('Error processing payment:', error)
      return false
    }
  }, [user?.id, paymentMethods, refreshWallet])

  const requestWithdrawal = useCallback(async (
    amount: number,
    bankAccountId: string
  ): Promise<boolean> => {
    if (!user?.id) return false

    try {
      const transaction = await PaymentService.requestWithdrawal(user.id, amount, bankAccountId)
      if (transaction) {
        setTransactions(prev => [transaction, ...prev])
        await refreshWallet()
        return true
      }
      return false
    } catch (error) {
      console.error('Error requesting withdrawal:', error)
      return false
    }
  }, [user?.id, refreshWallet])

  const value: WalletContextType = {
    wallet,
    transactions,
    paymentMethods,
    loading,
    refreshWallet,
    refreshTransactions,
    refreshPaymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    processPayment,
    requestWithdrawal
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
