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
import { ETHIOPIAN_BANKS, MOBILE_MONEY_PROVIDERS, CASH_PICKUP_LOCATIONS, validateAccountNumber, validatePhoneNumber, formatAccountNumber, formatPhoneNumber } from '../constants/EthiopianBanks'
import Colors from '../constants/Colors'

interface PaymentMethodModalProps {
  visible: boolean
  onClose: () => void
  onPaymentMethodAdded: (method: PaymentMethod) => void
  userId: string
}

export default function PaymentMethodModal({ 
  visible, 
  onClose, 
  onPaymentMethodAdded, 
  userId 
}: PaymentMethodModalProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'type' | 'details'>('type')
  const [selectedType, setSelectedType] = useState<'bank_account' | 'mobile_money' | 'cash_pickup' | null>(null)
  const [selectedBank, setSelectedBank] = useState<string>('')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [showBankList, setShowBankList] = useState(false)
  const [showProviderList, setShowProviderList] = useState(false)
  const [showLocationList, setShowLocationList] = useState(false)

  const paymentTypes = [
    {
      id: 'bank_account',
      title: 'Bank Account',
      subtitle: 'Direct bank transfer',
      icon: 'card-outline',
      color: Colors.primary[500]
    },
    {
      id: 'mobile_money',
      title: 'Mobile Money',
      subtitle: 'Telebirr, M-Pesa, etc.',
      icon: 'phone-portrait-outline',
      color: Colors.success[500]
    },
    {
      id: 'cash_pickup',
      title: 'Cash Pickup',
      subtitle: 'Pick up cash at location',
      icon: 'location-outline',
      color: Colors.warning[500]
    }
  ]

  useEffect(() => {
    if (!visible) {
      resetForm()
    }
  }, [visible])

  const handleTypeSelect = (type: 'bank_account' | 'mobile_money' | 'cash_pickup') => {
    setSelectedType(type)
    setStep('details')
  }

  const handleBankSelect = (bankId: string) => {
    setSelectedBank(bankId)
    setShowBankList(false)
  }

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId)
    setShowProviderList(false)
  }

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location)
    setShowLocationList(false)
  }

  const handleSave = async () => {
    if (!selectedType) return

    // Validation
    if (selectedType === 'bank_account') {
      if (!selectedBank) {
        Alert.alert('Error', 'Please select a bank.')
        return
      }
      if (!accountNumber) {
        Alert.alert('Error', 'Please enter account number.')
        return
      }
      if (!accountHolder) {
        Alert.alert('Error', 'Please enter account holder name.')
        return
      }
      if (!validateAccountNumber(selectedBank, accountNumber)) {
        const bank = ETHIOPIAN_BANKS.find(b => b.id === selectedBank)
        Alert.alert('Error', `Account number must be ${bank?.accountNumberLength} digits.`)
        return
      }
    }

    if (selectedType === 'mobile_money') {
      if (!selectedProvider) {
        Alert.alert('Error', 'Please select a mobile money provider.')
        return
      }
      if (!phoneNumber) {
        Alert.alert('Error', 'Please enter phone number.')
        return
      }
      if (!validatePhoneNumber(selectedProvider, phoneNumber)) {
        Alert.alert('Error', 'Please enter a valid phone number (09XXXXXXXXX).')
        return
      }
    }

    if (selectedType === 'cash_pickup') {
      if (!selectedLocation) {
        Alert.alert('Error', 'Please select a pickup location.')
        return
      }
    }

    try {
      setLoading(true)

      const withdrawalDetails = getWithdrawalDetails()
      
      const method = await PaymentMethodService.addPaymentMethod(userId, selectedType, {
        last4: getLast4Digits(),
        brand: getBrandName(),
        withdrawal_details: withdrawalDetails
      })

      onPaymentMethodAdded(method)
      onClose()
      resetForm()
    } catch (error) {
      console.error('Error adding payment method:', error)
      Alert.alert('Error', 'Failed to add payment method. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getWithdrawalDetails = () => {
    switch (selectedType) {
      case 'bank_account':
        const bank = ETHIOPIAN_BANKS.find(b => b.id === selectedBank)
        return {
          account_number: accountNumber,
          bank_name: bank?.name || '',
          bank_id: selectedBank,
          account_holder_name: accountHolder
        }
      case 'mobile_money':
        const provider = MOBILE_MONEY_PROVIDERS.find(p => p.id === selectedProvider)
        return {
          phone_number: phoneNumber,
          provider: provider?.name || '',
          provider_id: selectedProvider
        }
      case 'cash_pickup':
        return {
          pickup_location: selectedLocation
        }
      default:
        return {}
    }
  }

  const getLast4Digits = () => {
    if (selectedType === 'bank_account') {
      return accountNumber.slice(-4)
    }
    if (selectedType === 'mobile_money') {
      return phoneNumber.slice(-4)
    }
    return ''
  }

  const getBrandName = () => {
    if (selectedType === 'bank_account') {
      const bank = ETHIOPIAN_BANKS.find(b => b.id === selectedBank)
      return bank?.name || ''
    }
    if (selectedType === 'mobile_money') {
      const provider = MOBILE_MONEY_PROVIDERS.find(p => p.id === selectedProvider)
      return provider?.name || ''
    }
    return ''
  }

  const resetForm = () => {
    setStep('type')
    setSelectedType(null)
    setSelectedBank('')
    setSelectedProvider('')
    setSelectedLocation('')
    setAccountNumber('')
    setAccountHolder('')
    setPhoneNumber('')
    setShowBankList(false)
    setShowProviderList(false)
    setShowLocationList(false)
  }

  const renderTypeSelection = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Payment Method</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={Colors.neutral[700]} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.subtitle}>Choose how you want to receive payments</Text>
      
      <View style={styles.typeList}>
        {paymentTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={styles.typeItem}
            onPress={() => handleTypeSelect(type.id as any)}
          >
            <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
              <Ionicons name={type.icon as any} size={24} color={type.color} />
            </View>
            <View style={styles.typeInfo}>
              <Text style={styles.typeTitle}>{type.title}</Text>
              <Text style={styles.typeSubtitle}>{type.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderDetailsForm = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('type')}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {selectedType === 'bank_account' && 'Bank Account Details'}
          {selectedType === 'mobile_money' && 'Mobile Money Details'}
          {selectedType === 'cash_pickup' && 'Pickup Location'}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={Colors.neutral[700]} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form}>
        {selectedType === 'bank_account' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Bank *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowBankList(!showBankList)}
              >
                <Text style={[styles.dropdownText, !selectedBank && styles.placeholder]}>
                  {selectedBank ? ETHIOPIAN_BANKS.find(b => b.id === selectedBank)?.name : 'Choose a bank'}
                </Text>
                <Ionicons name={showBankList ? "chevron-up" : "chevron-down"} size={20} color={Colors.neutral[500]} />
              </TouchableOpacity>
              
              {showBankList && (
                <View style={styles.dropdownList}>
                  {ETHIOPIAN_BANKS.filter(bank => bank.isActive).map((bank) => (
                    <TouchableOpacity
                      key={bank.id}
                      style={styles.dropdownItem}
                      onPress={() => handleBankSelect(bank.id)}
                    >
                      <Text style={styles.dropdownItemText}>{bank.name}</Text>
                      <Text style={styles.dropdownItemSubtext}>{bank.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Number *</Text>
              <TextInput
                style={styles.input}
                value={accountNumber}
                onChangeText={(text) => setAccountNumber(text.replace(/\D/g, ''))}
                placeholder="Enter account number"
                keyboardType="numeric"
                maxLength={13}
              />
              {selectedBank && accountNumber && (
                <Text style={styles.formatText}>
                  Format: {formatAccountNumber(selectedBank, accountNumber)}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Holder Name *</Text>
              <TextInput
                style={styles.input}
                value={accountHolder}
                onChangeText={setAccountHolder}
                placeholder="Enter account holder name"
              />
            </View>
          </>
        )}

        {selectedType === 'mobile_money' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Provider *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowProviderList(!showProviderList)}
              >
                <Text style={[styles.dropdownText, !selectedProvider && styles.placeholder]}>
                  {selectedProvider ? MOBILE_MONEY_PROVIDERS.find(p => p.id === selectedProvider)?.name : 'Choose a provider'}
                </Text>
                <Ionicons name={showProviderList ? "chevron-up" : "chevron-down"} size={20} color={Colors.neutral[500]} />
              </TouchableOpacity>
              
              {showProviderList && (
                <View style={styles.dropdownList}>
                  {MOBILE_MONEY_PROVIDERS.filter(provider => provider.isActive).map((provider) => (
                    <TouchableOpacity
                      key={provider.id}
                      style={styles.dropdownItem}
                      onPress={() => handleProviderSelect(provider.id)}
                    >
                      <Text style={styles.dropdownItemText}>{provider.name}</Text>
                      <Text style={styles.dropdownItemSubtext}>{provider.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(text.replace(/\D/g, ''))}
                placeholder="09XXXXXXXXX"
                keyboardType="phone-pad"
                maxLength={10}
              />
              {phoneNumber && (
                <Text style={styles.formatText}>
                  Format: {formatPhoneNumber(phoneNumber)}
                </Text>
              )}
            </View>
          </>
        )}

        {selectedType === 'cash_pickup' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Pickup Location *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowLocationList(!showLocationList)}
            >
              <Text style={[styles.dropdownText, !selectedLocation && styles.placeholder]}>
                {selectedLocation || 'Choose a location'}
              </Text>
              <Ionicons name={showLocationList ? "chevron-up" : "chevron-down"} size={20} color={Colors.neutral[500]} />
            </TouchableOpacity>
            
            {showLocationList && (
              <View style={styles.dropdownList}>
                {CASH_PICKUP_LOCATIONS.map((location) => (
                  <TouchableOpacity
                    key={location}
                    style={styles.dropdownItem}
                    onPress={() => handleLocationSelect(location)}
                  >
                    <Text style={styles.dropdownItemText}>{location}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.buttonText}>Save Payment Method</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {step === 'type' ? renderTypeSelection() : renderDetailsForm()}
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    flex: 1,
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
  subtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  typeList: {
    paddingHorizontal: 16,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  typeInfo: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: 4,
  },
  typeSubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.neutral[700],
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.neutral[700],
  },
  dropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.neutral[700],
  },
  placeholder: {
    color: Colors.neutral[400],
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  dropdownItemText: {
    fontSize: 16,
    color: Colors.neutral[700],
    fontWeight: '500',
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  formatText: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: Colors.primary[500],
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
})