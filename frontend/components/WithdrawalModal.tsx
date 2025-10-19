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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { WalletService } from '../services/WalletService'
import Colors from '../constants/Colors'

interface WithdrawalModalProps {
  visible: boolean
  onClose: () => void
  taskerUserId: string
  currentBalance: number
  onWithdrawalSuccess: () => void
}

export default function WithdrawalModal({ 
  visible, 
  onClose, 
  taskerUserId, 
  currentBalance,
  onWithdrawalSuccess 
}: WithdrawalModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [accountDetails, setAccountDetails] = useState({
    accountNumber: '',
    bankName: '',
    mobileNumber: '',
    provider: '',
    pickupLocation: ''
  })
  const [loading, setLoading] = useState(false)
  const [withdrawalMethods, setWithdrawalMethods] = useState<any[]>([])

  useEffect(() => {
    if (visible) {
      loadWithdrawalMethods()
    }
  }, [visible])

  const loadWithdrawalMethods = () => {
    const methods = WalletService.getWithdrawalMethods()
    setWithdrawalMethods(methods)
  }

  const handleWithdrawal = async () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a withdrawal method')
      return
    }

    const withdrawalAmount = parseFloat(amount)
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount')
      return
    }

    if (withdrawalAmount > currentBalance) {
      Alert.alert('Error', 'Insufficient balance')
      return
    }

    const method = withdrawalMethods.find(m => m.id === selectedMethod)
    if (withdrawalAmount < method.minAmount) {
      Alert.alert('Error', `Minimum withdrawal amount is ${formatCurrency(method.minAmount)}`)
      return
    }

    if (withdrawalAmount > method.maxAmount) {
      Alert.alert('Error', `Maximum withdrawal amount is ${formatCurrency(method.maxAmount)}`)
      return
    }

    // Validate required fields based on method
    if (selectedMethod === 'bank_transfer') {
      if (!accountDetails.accountNumber || !accountDetails.bankName) {
        Alert.alert('Error', 'Please provide account number and bank name')
        return
      }
    } else if (selectedMethod === 'mobile_money') {
      if (!accountDetails.mobileNumber || !accountDetails.provider) {
        Alert.alert('Error', 'Please provide mobile number and provider')
        return
      }
    } else if (selectedMethod === 'cash_pickup') {
      if (!accountDetails.pickupLocation) {
        Alert.alert('Error', 'Please provide pickup location')
        return
      }
    }

    try {
      setLoading(true)
      const success = await WalletService.requestWithdrawal(
        taskerUserId,
        withdrawalAmount,
        selectedMethod as any,
        accountDetails
      )

      if (success) {
        Alert.alert(
          'Withdrawal Requested',
          'Your withdrawal request has been submitted. You will be notified once it\'s processed.',
          [
            {
              text: 'OK',
              onPress: () => {
                onWithdrawalSuccess()
                onClose()
                resetForm()
              }
            }
          ]
        )
      } else {
        Alert.alert('Error', 'Failed to submit withdrawal request. Please try again.')
      }
    } catch (error) {
      console.error('Error requesting withdrawal:', error)
      Alert.alert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedMethod(null)
    setAmount('')
    setAccountDetails({
      accountNumber: '',
      bankName: '',
      mobileNumber: '',
      provider: '',
      pickupLocation: ''
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getMethodIcon = (methodId: string) => {
    switch (methodId) {
      case 'bank_transfer':
        return 'bank'
      case 'mobile_money':
        return 'phone-portrait'
      case 'cash_pickup':
        return 'location'
      default:
        return 'card'
    }
  }

  const renderAccountDetailsForm = () => {
    if (!selectedMethod) return null

    switch (selectedMethod) {
      case 'bank_transfer':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Bank Account Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Account Number"
              value={accountDetails.accountNumber}
              onChangeText={(text) => setAccountDetails(prev => ({ ...prev, accountNumber: text }))}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Bank Name"
              value={accountDetails.bankName}
              onChangeText={(text) => setAccountDetails(prev => ({ ...prev, bankName: text }))}
            />
          </View>
        )
      case 'mobile_money':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Mobile Money Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Mobile Number"
              value={accountDetails.mobileNumber}
              onChangeText={(text) => setAccountDetails(prev => ({ ...prev, mobileNumber: text }))}
              keyboardType="phone-pad"
            />
            <View style={styles.providerSelector}>
              <TouchableOpacity
                style={[
                  styles.providerOption,
                  accountDetails.provider === 'telebirr' && styles.providerOptionSelected
                ]}
                onPress={() => setAccountDetails(prev => ({ ...prev, provider: 'telebirr' }))}
              >
                <Text style={[
                  styles.providerText,
                  accountDetails.provider === 'telebirr' && styles.providerTextSelected
                ]}>
                  Telebirr
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.providerOption,
                  accountDetails.provider === 'm_pesa' && styles.providerOptionSelected
                ]}
                onPress={() => setAccountDetails(prev => ({ ...prev, provider: 'm_pesa' }))}
              >
                <Text style={[
                  styles.providerText,
                  accountDetails.provider === 'm_pesa' && styles.providerTextSelected
                ]}>
                  M-Pesa
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      case 'cash_pickup':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Pickup Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter pickup location"
              value={accountDetails.pickupLocation}
              onChangeText={(text) => setAccountDetails(prev => ({ ...prev, pickupLocation: text }))}
            />
            <Text style={styles.pickupNote}>
              You will need to show a valid ID when picking up your cash.
            </Text>
          </View>
        )
      default:
        return null
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.neutral[600]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Withdrawal</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Balance Info */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(currentBalance)}</Text>
          </View>

          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Withdrawal Amount</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="Enter amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
            <Text style={styles.amountNote}>
              Minimum: {formatCurrency(selectedMethod ? withdrawalMethods.find(m => m.id === selectedMethod)?.minAmount || 0)}
            </Text>
          </View>

          {/* Withdrawal Methods */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Withdrawal Method</Text>
            <View style={styles.methodsList}>
              {withdrawalMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.methodCard,
                    selectedMethod === method.id && styles.methodCardSelected
                  ]}
                  onPress={() => setSelectedMethod(method.id)}
                >
                  <View style={styles.methodInfo}>
                    <Ionicons 
                      name={getMethodIcon(method.id)} 
                      size={24} 
                      color={selectedMethod === method.id ? Colors.primary[500] : Colors.neutral[600]} 
                    />
                    <View style={styles.methodDetails}>
                      <Text style={[
                        styles.methodName,
                        selectedMethod === method.id && styles.methodNameSelected
                      ]}>
                        {method.name}
                      </Text>
                      <Text style={styles.methodDescription}>
                        {method.description}
                      </Text>
                      <Text style={styles.methodInfo}>
                        {formatCurrency(method.minAmount)} - {formatCurrency(method.maxAmount)} • {method.processingTime}
                        {method.fee > 0 && ` • Fee: ${formatCurrency(method.fee)}`}
                      </Text>
                    </View>
                  </View>
                  {selectedMethod === method.id && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary[500]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Account Details Form */}
          {renderAccountDetailsForm()}

          {/* Summary */}
          {selectedMethod && amount && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Withdrawal Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(parseFloat(amount) || 0)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Method:</Text>
                <Text style={styles.summaryValue}>
                  {withdrawalMethods.find(m => m.id === selectedMethod)?.name}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Processing Time:</Text>
                <Text style={styles.summaryValue}>
                  {withdrawalMethods.find(m => m.id === selectedMethod)?.processingTime}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.withdrawButton,
              (!selectedMethod || !amount || loading) && styles.withdrawButtonDisabled
            ]}
            onPress={handleWithdrawal}
            disabled={!selectedMethod || !amount || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="arrow-up" size={20} color="#fff" />
                <Text style={styles.withdrawButtonText}>Request Withdrawal</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  balanceCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary[500],
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 16,
  },
  amountInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  amountNote: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 8,
  },
  methodsList: {
    gap: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodDetails: {
    marginLeft: 12,
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  methodNameSelected: {
    color: Colors.primary[700],
  },
  methodDescription: {
    fontSize: 12,
    color: Colors.neutral[600],
    marginBottom: 4,
  },
  formSection: {
    marginTop: 24,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 16,
  },
  input: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 12,
  },
  providerSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  providerOption: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  providerOptionSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  providerText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.neutral[900],
  },
  providerTextSelected: {
    color: Colors.primary[700],
  },
  pickupNote: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 8,
    fontStyle: 'italic',
  },
  summaryCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.neutral[600],
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.neutral[900],
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[500],
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  withdrawButtonDisabled: {
    backgroundColor: Colors.neutral[300],
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
