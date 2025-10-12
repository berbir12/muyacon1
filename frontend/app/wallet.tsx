import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useWallet } from '../contexts/WalletContext'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { Colors } from '../constants/Colors'
import { useToast } from '../contexts/ToastContext'

export default function WalletScreen() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { showToast } = useToast()
  const {
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
  } = useWallet()

  const [refreshing, setRefreshing] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'card' as 'card' | 'bank_account',
    last4: '',
    brand: '',
    expiry_month: '',
    expiry_year: '',
    is_default: false
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refreshWallet(),
        refreshTransactions(),
        refreshPaymentMethods()
      ])
    } catch (error) {
      console.error('Error refreshing wallet:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleAddPaymentMethod = async () => {
    if (!newPaymentMethod.last4 || !newPaymentMethod.brand) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    const success = await addPaymentMethod({
      ...newPaymentMethod,
      expiry_month: newPaymentMethod.expiry_month ? parseInt(newPaymentMethod.expiry_month) : undefined,
      expiry_year: newPaymentMethod.expiry_year ? parseInt(newPaymentMethod.expiry_year) : undefined
    })

    if (success) {
      showToast('Payment method added successfully', 'success')
      setShowAddPayment(false)
      setNewPaymentMethod({
        type: 'card',
        last4: '',
        brand: '',
        expiry_month: '',
        expiry_year: '',
        is_default: false
      })
    } else {
      showToast('Failed to add payment method', 'error')
    }
  }

  const handleRemovePaymentMethod = (id: string) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const success = await removePaymentMethod(id)
            if (success) {
              showToast('Payment method removed', 'success')
            } else {
              showToast('Failed to remove payment method', 'error')
            }
          }
        }
      ]
    )
  }

  const handleSetDefault = async (id: string) => {
    const success = await setDefaultPaymentMethod(id)
    if (success) {
      showToast('Default payment method updated', 'success')
    } else {
      showToast('Failed to update default payment method', 'error')
    }
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount', 'error')
      return
    }

    if (wallet && amount > wallet.balance) {
      showToast('Insufficient funds', 'error')
      return
    }

    // For demo purposes, using a mock bank account ID
    const success = await requestWithdrawal(amount, 'bank_account_123')
    if (success) {
      showToast('Withdrawal request submitted', 'success')
      setShowWithdraw(false)
      setWithdrawAmount('')
    } else {
      showToast('Failed to submit withdrawal request', 'error')
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return 'card'
      case 'refund':
        return 'refresh'
      case 'withdrawal':
        return 'arrow-up'
      case 'deposit':
        return 'arrow-down'
      case 'commission':
        return 'trending-up'
      default:
        return 'swap-horizontal'
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'payment':
        return Colors.error[500]
      case 'refund':
        return Colors.success[500]
      case 'withdrawal':
        return Colors.warning[500]
      case 'deposit':
        return Colors.success[500]
      case 'commission':
        return Colors.primary[500]
      default:
        return Colors.neutral[500]
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <Text style={styles.headerSubtitle}>
          {user ? `Hi ${user.name.split(' ')[0]}!` : 'Manage your payments'}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Wallet Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            {wallet ? formatAmount(wallet.balance) : '$0.00'}
          </Text>
          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowAddPayment(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Add Money</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.withdrawButton]}
              onPress={() => setShowWithdraw(true)}
            >
              <Ionicons name="arrow-up" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddPayment(true)}
            >
              <Ionicons name="add" size={20} color={Colors.primary[500]} />
            </TouchableOpacity>
          </View>

          {paymentMethods.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color={Colors.neutral[300]} />
              <Text style={styles.emptyText}>No payment methods added</Text>
              <Text style={styles.emptySubtext}>Add a payment method to get started</Text>
            </View>
          ) : (
            paymentMethods.map((method) => (
              <View key={method.id} style={styles.paymentMethodCard}>
                <View style={styles.paymentMethodInfo}>
                  <Ionicons
                    name={method.type === 'card' ? 'card' : 'business'}
                    size={24}
                    color={Colors.primary[500]}
                  />
                  <View style={styles.paymentMethodDetails}>
                    <Text style={styles.paymentMethodType}>
                      {method.type === 'card' ? 'Card' : 'Bank Account'}
                    </Text>
                    <Text style={styles.paymentMethodNumber}>
                      **** **** **** {method.last4}
                    </Text>
                    {method.brand && (
                      <Text style={styles.paymentMethodBrand}>{method.brand}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.paymentMethodActions}>
                  {method.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>Default</Text>
                    </View>
                  )}
                  {!method.is_default && (
                    <TouchableOpacity
                      style={styles.setDefaultButton}
                      onPress={() => handleSetDefault(method.id)}
                    >
                      <Text style={styles.setDefaultText}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemovePaymentMethod(method.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.error[500]} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={refreshTransactions}>
              <Ionicons name="refresh" size={20} color={Colors.primary[500]} />
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={Colors.neutral[300]} />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
            </View>
          ) : (
            transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionIcon}>
                  <Ionicons
                    name={getTransactionIcon(transaction.type)}
                    size={20}
                    color={getTransactionColor(transaction.type)}
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.created_at)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    {
                      color: transaction.type === 'withdrawal' || transaction.type === 'payment'
                        ? Colors.error[500]
                        : Colors.success[500]
                    }
                  ]}
                >
                  {transaction.type === 'withdrawal' || transaction.type === 'payment'
                    ? `-${formatAmount(transaction.amount)}`
                    : `+${formatAmount(transaction.amount)}`
                  }
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Payment Method Modal */}
      <Modal
        visible={showAddPayment}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddPayment(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Payment Method</Text>
            <TouchableOpacity onPress={handleAddPaymentMethod}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    newPaymentMethod.type === 'card' && styles.typeOptionActive
                  ]}
                  onPress={() => setNewPaymentMethod(prev => ({ ...prev, type: 'card' }))}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      newPaymentMethod.type === 'card' && styles.typeOptionTextActive
                    ]}
                  >
                    Card
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    newPaymentMethod.type === 'bank_account' && styles.typeOptionActive
                  ]}
                  onPress={() => setNewPaymentMethod(prev => ({ ...prev, type: 'bank_account' }))}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      newPaymentMethod.type === 'bank_account' && styles.typeOptionTextActive
                    ]}
                  >
                    Bank Account
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last 4 digits *</Text>
              <TextInput
                style={styles.input}
                value={newPaymentMethod.last4}
                onChangeText={(text) => setNewPaymentMethod(prev => ({ ...prev, last4: text }))}
                placeholder="1234"
                keyboardType="numeric"
                maxLength={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Brand</Text>
              <TextInput
                style={styles.input}
                value={newPaymentMethod.brand}
                onChangeText={(text) => setNewPaymentMethod(prev => ({ ...prev, brand: text }))}
                placeholder="Visa, Mastercard, etc."
              />
            </View>

            {newPaymentMethod.type === 'card' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Expiry Month</Text>
                  <TextInput
                    style={styles.input}
                    value={newPaymentMethod.expiry_month}
                    onChangeText={(text) => setNewPaymentMethod(prev => ({ ...prev, expiry_month: text }))}
                    placeholder="12"
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Expiry Year</Text>
                  <TextInput
                    style={styles.input}
                    value={newPaymentMethod.expiry_year}
                    onChangeText={(text) => setNewPaymentMethod(prev => ({ ...prev, expiry_year: text }))}
                    placeholder="2025"
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </>
            )}

            <View style={styles.checkboxGroup}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setNewPaymentMethod(prev => ({ ...prev, is_default: !prev.is_default }))}
              >
                <Ionicons
                  name={newPaymentMethod.is_default ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={newPaymentMethod.is_default ? Colors.primary[500] : Colors.neutral[400]}
                />
                <Text style={styles.checkboxText}>Set as default payment method</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        visible={showWithdraw}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowWithdraw(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Withdraw Funds</Text>
            <TouchableOpacity onPress={handleWithdraw}>
              <Text style={styles.modalSave}>Withdraw</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.withdrawInfo}>
              <Text style={styles.withdrawLabel}>Available Balance</Text>
              <Text style={styles.withdrawAmount}>
                {wallet ? formatAmount(wallet.balance) : '$0.00'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Withdrawal Amount</Text>
              <TextInput
                style={styles.input}
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.withdrawNote}>
              Withdrawals typically take 1-3 business days to process.
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.neutral[600],
  },
  header: {
    padding: 20,
    backgroundColor: Colors.background.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.neutral[900],
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.neutral[600],
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  balanceCard: {
    margin: 20,
    padding: 24,
    backgroundColor: Colors.primary[500],
    borderRadius: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    gap: 8,
  },
  withdrawButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  addButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.neutral[600],
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: 4,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodDetails: {
    marginLeft: 12,
  },
  paymentMethodType: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.neutral[900],
  },
  paymentMethodNumber: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginTop: 2,
  },
  paymentMethodBrand: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  paymentMethodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  defaultBadge: {
    backgroundColor: Colors.primary[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 12,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  setDefaultButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary[50],
    borderRadius: 6,
  },
  setDefaultText: {
    fontSize: 12,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.neutral[900],
  },
  transactionDate: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  modalCancel: {
    fontSize: 16,
    color: Colors.neutral[600],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  modalSave: {
    fontSize: 16,
    color: Colors.primary[500],
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.neutral[900],
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.neutral[900],
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: 8,
    alignItems: 'center',
  },
  typeOptionActive: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  typeOptionText: {
    fontSize: 16,
    color: Colors.neutral[600],
  },
  typeOptionTextActive: {
    color: Colors.primary[600],
    fontWeight: '500',
  },
  checkboxGroup: {
    marginTop: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxText: {
    fontSize: 16,
    color: Colors.neutral[700],
  },
  withdrawInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },
  withdrawLabel: {
    fontSize: 16,
    color: Colors.neutral[600],
    marginBottom: 8,
  },
  withdrawAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary[500],
  },
  withdrawNote: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginTop: 20,
  },
})
