import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../contexts/AuthContext'
import Colors from '../constants/Colors'

const { width } = Dimensions.get('window')

interface Earning {
  id: string
  date: string
  amount: number
  taskTitle: string
  status: 'completed' | 'pending' | 'cancelled'
  customerName: string
}

export default function Earnings() {
  const { user } = useAuth()
  const router = useRouter()
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEarnings()
  }, [selectedPeriod])

  const loadEarnings = async () => {
    try {
      setLoading(true)
      // Mock data - replace with actual API call
      const mockEarnings: Earning[] = [
        {
          id: '1',
          date: '2024-01-15',
          amount: 150,
          taskTitle: 'House Cleaning',
          status: 'completed',
          customerName: 'John Doe',
        },
        {
          id: '2',
          date: '2024-01-14',
          amount: 200,
          taskTitle: 'Garden Maintenance',
          status: 'completed',
          customerName: 'Jane Smith',
        },
        {
          id: '3',
          date: '2024-01-13',
          amount: 100,
          taskTitle: 'Pet Walking',
          status: 'pending',
          customerName: 'Mike Johnson',
        },
        {
          id: '4',
          date: '2024-01-12',
          amount: 75,
          taskTitle: 'Delivery Service',
          status: 'completed',
          customerName: 'Sarah Wilson',
        },
      ]
      setEarnings(mockEarnings)
    } catch (error) {
      console.error('Error loading earnings:', error)
      Alert.alert('Error', 'Failed to load earnings')
    } finally {
      setLoading(false)
    }
  }

  const getTotalEarnings = () => {
    return earnings
      .filter(earning => earning.status === 'completed')
      .reduce((total, earning) => total + earning.amount, 0)
  }

  const getPendingEarnings = () => {
    return earnings
      .filter(earning => earning.status === 'pending')
      .reduce((total, earning) => total + earning.amount, 0)
  }

  const getCompletedTasks = () => {
    return earnings.filter(earning => earning.status === 'completed').length
  }

  const handleWithdraw = () => {
    Alert.alert(
      'Withdraw Earnings',
      'Withdrawal functionality will be implemented with payment integration.',
      [{ text: 'OK' }]
    )
  }

  const handleViewDetails = (earning: Earning) => {
    Alert.alert(
      'Earning Details',
      `Task: ${earning.taskTitle}\nCustomer: ${earning.customerName}\nAmount: $${earning.amount}\nStatus: ${earning.status}\nDate: ${earning.date}`,
      [{ text: 'OK' }]
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return Colors.success[500]
      case 'pending':
        return Colors.warning[500]
      case 'cancelled':
        return Colors.error[500]
      default:
        return Colors.neutral[500]
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle'
      case 'pending':
        return 'time'
      case 'cancelled':
        return 'close-circle'
      default:
        return 'help-circle'
    }
  }

  const totalEarnings = getTotalEarnings()
  const pendingEarnings = getPendingEarnings()
  const completedTasks = getCompletedTasks()

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
        <TouchableOpacity onPress={handleWithdraw} style={styles.withdrawButton}>
          <Text style={styles.withdrawText}>Withdraw</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {[
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'This Month' },
            { key: 'year', label: 'This Year' },
          ].map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.periodButtonSelected
              ]}
              onPress={() => setSelectedPeriod(period.key as any)}
            >
              <Text style={[
                styles.periodText,
                selectedPeriod === period.key && styles.periodTextSelected
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="cash-outline" size={24} color={Colors.success[500]} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statAmount}>${totalEarnings}</Text>
              <Text style={styles.statLabel}>Total Earned</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="time-outline" size={24} color={Colors.warning[500]} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statAmount}>${pendingEarnings}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="checkmark-circle-outline" size={24} color={Colors.primary[500]} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statAmount}>{completedTasks}</Text>
              <Text style={styles.statLabel}>Tasks Completed</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="trending-up-outline" size={24} color={Colors.success[500]} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statAmount}>
                ${totalEarnings > 0 ? Math.round(totalEarnings / completedTasks) : 0}
              </Text>
              <Text style={styles.statLabel}>Avg per Task</Text>
            </View>
          </View>
        </View>

        {/* Earnings List */}
        <View style={styles.earningsSection}>
          <Text style={styles.sectionTitle}>Recent Earnings</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading earnings...</Text>
            </View>
          ) : earnings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cash-outline" size={48} color={Colors.neutral[300]} />
              <Text style={styles.emptyTitle}>No Earnings Yet</Text>
              <Text style={styles.emptySubtitle}>
                Complete tasks to start earning money
              </Text>
            </View>
          ) : (
            <View style={styles.earningsList}>
              {earnings.map((earning) => (
                <TouchableOpacity
                  key={earning.id}
                  style={styles.earningItem}
                  onPress={() => handleViewDetails(earning)}
                >
                  <View style={styles.earningLeft}>
                    <View style={[
                      styles.statusIcon,
                      { backgroundColor: getStatusColor(earning.status) + '20' }
                    ]}>
                      <Ionicons 
                        name={getStatusIcon(earning.status) as any} 
                        size={20} 
                        color={getStatusColor(earning.status)} 
                      />
                    </View>
                    <View style={styles.earningInfo}>
                      <Text style={styles.taskTitle}>{earning.taskTitle}</Text>
                      <Text style={styles.customerName}>{earning.customerName}</Text>
                      <Text style={styles.earningDate}>{formatDate(earning.date)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.earningRight}>
                    <Text style={styles.earningAmount}>${earning.amount}</Text>
                    <Text style={[
                      styles.earningStatus,
                      { color: getStatusColor(earning.status) }
                    ]}>
                      {earning.status.charAt(0).toUpperCase() + earning.status.slice(1)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <View style={styles.tipCard}>
            <Ionicons name="bulb-outline" size={20} color={Colors.warning[500]} />
            <Text style={styles.tipText}>
              Complete more tasks and maintain high ratings to increase your earnings potential.
            </Text>
          </View>
        </View>
      </ScrollView>
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
  withdrawButton: {
    padding: 8,
  },
  withdrawText: {
    fontSize: 16,
    color: Colors.primary[500],
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonSelected: {
    backgroundColor: Colors.primary[500],
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.neutral[600],
  },
  periodTextSelected: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.neutral[600],
  },
  earningsSection: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.neutral[600],
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
  earningsList: {
    gap: 12,
  },
  earningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
  },
  earningLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  earningInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  customerName: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: 2,
  },
  earningDate: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  earningRight: {
    alignItems: 'flex-end',
  },
  earningAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  earningStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  tipsSection: {
    margin: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warning[50],
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning[500],
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: Colors.neutral[700],
    marginLeft: 12,
    lineHeight: 20,
  },
})
