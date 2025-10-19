import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaymentMethodService, PaymentMethod } from '../services/PaymentMethodService'
import { WithdrawalOrderService } from '../services/WithdrawalOrderService'
import Colors from '../constants/Colors'

interface WithdrawalModalProps {
  visible: boolean
  onClose: () => void
  onWithdrawalSuccess: () => void
  currentBalance: number
  userId: string
}

export default function WithdrawalModal({
  visible,
  onClose,
  onWithdrawalSuccess,
  currentBalance,
  userId
}: WithdrawalModalProps) {
  const [loading, setLoading] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [amount, setAmount] = useState('')
  const [showAddMethod, setShowAddMethod] = useState(false)

  useEffect(() => {
    if (visible) {
      loadPaymentMethods()
    }
  }, [visible])

  const loadPaymentMethods = async () => {
    try {
      const methods = await PaymentMethodService.getPaymentMethods(userId)
      setPaymentMethods(methods)
      
      // Auto-select default method if available
      const defaultMethod = methods.find(m => m.is_default)
      if (defaultMethod) {
        setSelectedMethod(defaultMethod)
      }
    } catch (error) {
      console.error('Error loading payment methods:', error)
    }
  }

  const handleWithdraw = async () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a payment method')
      return
    }

    const withdrawAmount = parseFloat(amount)
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount')
      return
    }

    if (withdrawAmount > currentBalance) {
      Alert.alert('Error', 'Insufficient balance')
      return
    }

    if (withdrawAmount < 50) {
      Alert.alert('Error', 'Minimum withdrawal amount is 50 ETB')
      return
    }

    try {
      setLoading(true)

      await WithdrawalOrderService.createWithdrawalOrder(
        userId,
        selectedMethod.id,
        withdrawAmount,
        selectedMethod.type as any,
        selectedMethod.withdrawal_details
      )

      Alert.alert(
        'Withdrawal Requested',
        'Your withdrawal request has been submitted and is pending approval.',
        [
          {
            text: 'OK',
            onPress: () => {
              onWithdrawalSuccess()
              onClose()
            }
          }
        ]
      )
    } catch (error) {
      console.error('Error creating withdrawal order:', error)
      Alert.alert('Error', 'Failed to create withdrawal request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
    }).format(amount)
  }

  const getWithdrawalMethodName = (type: string) => {
    switch (type) {
      case 'bank_account':
        return 'Bank Transfer'
      case 'mobile_money':
        return 'Mobile Money'
      case 'cash_pickup':
        return 'Cash Pickup'
      default:
        return 'Unknown'
    }
  }

  const processingFee = selectedMethod ? Math.max(parseFloat(amount) * 0.02, 10) : 0
  const netAmount = parseFloat(amount) - processingFee

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.neutral[700]} />
          </TouchableOpacity>
          <Text style={styles.title}>Withdraw Funds</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content}>
          {/* Balance Display */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(currentBalance)}</Text>
          </View>

          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Withdrawal Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>ETB</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
            <Text style={styles.amountNote}>
              Minimum: {formatCurrency(50)} • Maximum: {formatCurrency(currentBalance)}
            </Text>
          </View>

          {/* Payment Methods */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <TouchableOpacity onPress={() => setShowAddMethod(true)}>
                <Text style={styles.addButton}>+ Add Method</Text>
              </TouchableOpacity>
            </View>

            {paymentMethods.length === 0 ? (
              <View style={styles.emptyMethods}>
                <Ionicons name="card-outline" size={48} color={Colors.neutral[300]} />
                <Text style={styles.emptyTitle}>No Payment Methods</Text>
                <Text style={styles.emptySubtitle}>
                  Add a payment method to withdraw funds
                </Text>
                <TouchableOpacity
                  style={styles.addMethodButton}
                  onPress={() => setShowAddMethod(true)}
                >
                  <Text style={styles.addMethodButtonText}>Add Payment Method</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.methodsList}>
                {paymentMethods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.methodItem,
                      selectedMethod?.id === method.id && styles.methodItemSelected
                    ]}
                    onPress={() => setSelectedMethod(method)}
                  >
                    <View style={styles.methodIcon}>
                      <Ionicons
                        name={
                          method.type === 'bank_account' ? 'card-outline' :
                          method.type === 'mobile_money' ? 'phone-portrait-outline' :
                          'location-outline'
                        }
                        size={20}
                        color={selectedMethod?.id === method.id ? Colors.primary[500] : Colors.neutral[500]}
                      />
                    </View>
                    <View style={styles.methodInfo}>
                      <Text style={styles.methodName}>{method.display_name}</Text>
                      <Text style={styles.methodType}>
                        {getWithdrawalMethodName(method.type)}
                      </Text>
                    </View>
                    {method.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                    {selectedMethod?.id === method.id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Withdrawal Summary */}
          {selectedMethod && amount && !isNaN(parseFloat(amount)) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Withdrawal Summary</Text>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(parseFloat(amount))}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Method:</Text>
                  <Text style={styles.summaryValue}>{method.display_name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Processing Fee:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(processingFee)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={styles.summaryTotalLabel}>You'll Receive:</Text>
                  <Text style={styles.summaryTotalValue}>{formatCurrency(netAmount)}</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.withdrawButton,
              (!selectedMethod || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) && styles.withdrawButtonDisabled
            ]}
            onPress={handleWithdraw}
            disabled={!selectedMethod || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="arrow-up" size={20} color="#fff" />
                <Text style={styles.withdrawButtonText}>Request Withdrawal</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[700],
  },
  headerRight: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary[600],
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[600],
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[700],
  },
  amountNote: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 8,
  },
  addButton: {
    fontSize: 14,
    color: Colors.primary[500],
    fontWeight: '500',
  },
  emptyMethods: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[600],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: 24,
  },
  addMethodButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addMethodButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  methodsList: {
    gap: 8,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  methodItemSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.neutral[700],
    marginBottom: 2,
  },
  methodType: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  defaultBadge: {
    backgroundColor: Colors.success[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  defaultText: {
    fontSize: 10,
    color: Colors.success[600],
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 8,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.neutral[600],
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.neutral[700],
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[700],
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary[600],
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[500],
    paddingVertical: 16,
    borderRadius: 8,
  },
  withdrawButtonDisabled: {
    backgroundColor: Colors.neutral[300],
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
})