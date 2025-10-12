import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../contexts/AuthContext'
import Colors from '../constants/Colors'

interface PaymentMethod {
  id: string
  type: 'card' | 'bank' | 'mobile'
  name: string
  last4?: string
  expiry?: string
  isDefault: boolean
}

export default function PaymentMethods() {
  const { user } = useAuth()
  const router = useRouter()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      name: 'Visa •••• 4242',
      last4: '4242',
      expiry: '12/25',
      isDefault: true,
    },
    {
      id: '2',
      type: 'bank',
      name: 'Commercial Bank of Ethiopia',
      last4: '1234',
      isDefault: false,
    },
  ])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMethod, setNewMethod] = useState({
    type: 'card' as 'card' | 'bank' | 'mobile',
    name: '',
    number: '',
    expiry: '',
    cvv: '',
  })

  const handleAddMethod = () => {
    if (!newMethod.name || !newMethod.number) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }

    const method: PaymentMethod = {
      id: Date.now().toString(),
      type: newMethod.type,
      name: newMethod.name,
      last4: newMethod.number.slice(-4),
      expiry: newMethod.expiry,
      isDefault: paymentMethods.length === 0,
    }

    setPaymentMethods(prev => [...prev, method])
    setShowAddModal(false)
    setNewMethod({ type: 'card', name: '', number: '', expiry: '', cvv: '' })
    Alert.alert('Success', 'Payment method added successfully')
  }

  const handleSetDefault = (id: string) => {
    setPaymentMethods(prev => 
      prev.map(method => ({
        ...method,
        isDefault: method.id === id
      }))
    )
    Alert.alert('Success', 'Default payment method updated')
  }

  const handleDeleteMethod = (id: string) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to delete this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setPaymentMethods(prev => prev.filter(method => method.id !== id))
            Alert.alert('Success', 'Payment method deleted')
          }
        }
      ]
    )
  }

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'card':
        return 'card-outline'
      case 'bank':
        return 'business-outline'
      case 'mobile':
        return 'phone-portrait-outline'
      default:
        return 'card-outline'
    }
  }

  const getMethodColor = (type: string) => {
    switch (type) {
      case 'card':
        return Colors.primary[500]
      case 'bank':
        return Colors.success[500]
      case 'mobile':
        return Colors.warning[500]
      default:
        return Colors.neutral[500]
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color={Colors.primary[500]} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={64} color={Colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No Payment Methods</Text>
            <Text style={styles.emptySubtitle}>
              Add a payment method to start making transactions
            </Text>
            <TouchableOpacity 
              style={styles.addFirstButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addFirstButtonText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.methodsList}>
            {paymentMethods.map((method, index) => (
              <View key={method.id} style={styles.methodCard}>
                <View style={styles.methodLeft}>
                  <View style={[styles.methodIcon, { backgroundColor: getMethodColor(method.type) + '20' }]}>
                    <Ionicons 
                      name={getMethodIcon(method.type) as any} 
                      size={24} 
                      color={getMethodColor(method.type)} 
                    />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    {method.last4 && (
                      <Text style={styles.methodDetails}>
                        •••• {method.last4}
                        {method.expiry && ` • Expires ${method.expiry}`}
                      </Text>
                    )}
                    {method.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.methodActions}>
                  {!method.isDefault && (
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleSetDefault(method.id)}
                    >
                      <Ionicons name="star-outline" size={20} color={Colors.neutral[600]} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleDeleteMethod(method.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.error[500]} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Ionicons name="shield-checkmark" size={20} color={Colors.success[500]} />
          <Text style={styles.securityText}>
            Your payment information is encrypted and secure. We never store your full card details.
          </Text>
        </View>
      </ScrollView>

      {/* Add Payment Method Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Payment Method</Text>
            <TouchableOpacity onPress={handleAddMethod}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payment Type</Text>
              <View style={styles.typeSelector}>
                {[
                  { key: 'card', label: 'Credit/Debit Card', icon: 'card-outline' },
                  { key: 'bank', label: 'Bank Account', icon: 'business-outline' },
                  { key: 'mobile', label: 'Mobile Money', icon: 'phone-portrait-outline' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.typeOption,
                      newMethod.type === type.key && styles.typeOptionSelected
                    ]}
                    onPress={() => setNewMethod(prev => ({ ...prev, type: type.key as any }))}
                  >
                    <Ionicons 
                      name={type.icon as any} 
                      size={20} 
                      color={newMethod.type === type.key ? Colors.primary[500] : Colors.neutral[600]} 
                    />
                    <Text style={[
                      styles.typeLabel,
                      newMethod.type === type.key && styles.typeLabelSelected
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cardholder Name</Text>
              <TextInput
                style={styles.input}
                value={newMethod.name}
                onChangeText={(text) => setNewMethod(prev => ({ ...prev, name: text }))}
                placeholder="Enter cardholder name"
                placeholderTextColor={Colors.neutral[400]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Card Number</Text>
              <TextInput
                style={styles.input}
                value={newMethod.number}
                onChangeText={(text) => setNewMethod(prev => ({ ...prev, number: text }))}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={Colors.neutral[400]}
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Expiry Date</Text>
                <TextInput
                  style={styles.input}
                  value={newMethod.expiry}
                  onChangeText={(text) => setNewMethod(prev => ({ ...prev, expiry: text }))}
                  placeholder="MM/YY"
                  placeholderTextColor={Colors.neutral[400]}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.input}
                  value={newMethod.cvv}
                  onChangeText={(text) => setNewMethod(prev => ({ ...prev, cvv: text }))}
                  placeholder="123"
                  placeholderTextColor={Colors.neutral[400]}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
          </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  addFirstButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  methodsList: {
    padding: 20,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  methodLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  methodDetails: {
    fontSize: 14,
    color: Colors.neutral[600],
  },
  defaultBadge: {
    backgroundColor: Colors.primary[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  defaultText: {
    fontSize: 12,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  methodActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success[50],
    padding: 16,
    margin: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success[500],
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    color: Colors.neutral[700],
    marginLeft: 8,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.neutral[600],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  saveText: {
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
    color: Colors.neutral[700],
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.neutral[900],
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  typeOptionSelected: {
    backgroundColor: Colors.primary[50],
    borderColor: Colors.primary[500],
  },
  typeLabel: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginLeft: 8,
  },
  typeLabelSelected: {
    color: Colors.primary[600],
    fontWeight: '500',
  },
})
