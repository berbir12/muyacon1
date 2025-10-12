import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Dimensions 
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAuth } from '../contexts/AuthContext'
import { TaskService, Task } from '../services/TaskService'
import { TaskApplicationService } from '../services/TaskApplicationService'
import TaskStatusManager from '../components/TaskStatusManager'
import Colors from '../constants/Colors'

const { width } = Dimensions.get('window')

export default function TaskDetail() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const { taskId } = useLocalSearchParams()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasApplied, setHasApplied] = useState(false)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    // Only redirect to auth if we're sure the user is not authenticated
    // and we're not still loading the auth state
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth')
      return
    }
    
    if (isAuthenticated && taskId) {
      loadTaskDetails()
    }
  }, [taskId, isAuthenticated, isLoading])

  // Show loading while auth is being determined
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const loadTaskDetails = async () => {
    if (!taskId || !user) return

    setLoading(true)
    try {
      // Get task details
      const taskDetails = await TaskService.getTaskById(taskId as string)
      setTask(taskDetails)

      // Check if user has already applied (only for taskers)
      if (user.role === 'tasker' || user.role === 'both') {
        const applied = await TaskApplicationService.hasUserAppliedToTask(user.id, taskId as string)
        setHasApplied(applied)
      }
    } catch (error) {
      console.error('Error loading task details:', error)
      Alert.alert('Error', 'Failed to load task details')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!user || !task) return

    // Check if this is the user's own task
    if (task.customer_id === user.id) {
      console.log('Navigating to applications for task:', task.id)
      // Navigate to applications view for task owners
      router.push(`/task-applications?taskId=${task.id}`)
      return
    }

    // Check if user is a tasker
    if (user.role !== 'tasker' && user.role !== 'both') {
      Alert.alert(
        'Become a Tasker',
        'You need to become a tasker to apply for tasks. Would you like to apply now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Apply Now', 
            onPress: () => router.push('/tasker-application')
          }
        ]
      )
      return
    }

    if (hasApplied) {
      Alert.alert('Already Applied', 'You have already applied to this task.')
      return
    }

    // Navigate to application form
    router.push({
      pathname: '/apply-task',
      params: { 
        taskId: task.id,
        taskTitle: task.title,
        customerName: task.customer_name,
        budget: task.budget.toString()
      }
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/jobs')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading task details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/jobs')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error[500]} />
          <Text style={styles.errorTitle}>Task Not Found</Text>
          <Text style={styles.errorSubtitle}>This task may have been removed or doesn't exist.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/jobs')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        bounces={true}
        scrollEventThrottle={16}
      >
        {/* Task Header */}
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleRow}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            {task.is_urgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
          </View>
          <Text style={styles.taskPrice}>${task.budget}</Text>
        </View>

        {/* Task Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.taskDescription}>{task.description}</Text>
        </View>

        {/* Task Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsList}>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={20} color={Colors.neutral[500]} />
              <Text style={styles.detailText}>{task.address}</Text>
            </View>
            {task.task_date && (
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={20} color={Colors.neutral[500]} />
                <Text style={styles.detailText}>
                  Preferred Date: {new Date(task.task_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            )}
            {task.task_time && (
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={20} color={Colors.neutral[500]} />
                <Text style={styles.detailText}>
                  Preferred Time: {task.task_time}
                </Text>
              </View>
            )}
            {task.flexible_date && (
              <View style={styles.detailItem}>
                <Ionicons name="refresh-outline" size={20} color={Colors.neutral[500]} />
                <Text style={styles.detailText}>Date is flexible</Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={20} color={Colors.neutral[500]} />
              <Text style={styles.detailText}>Posted {formatTime(task.created_at)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="person-outline" size={20} color={Colors.neutral[500]} />
              <Text style={styles.detailText}>{task.customer_name}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="folder-outline" size={20} color={Colors.neutral[500]} />
              <Text style={styles.detailText}>{task.category_name}</Text>
            </View>
          </View>
        </View>

        {/* Task Status Management */}
        <TaskStatusManager
          taskId={task.id}
          currentStatus={task.status as any}
          userId={user?.id || ''}
          userRole={user?.currentMode === 'customer' ? 'customer' : 'tasker'}
          onStatusUpdate={(newStatus) => {
            setTask(prev => prev ? { ...prev, status: newStatus } : null)
          }}
          showHistory={true}
        />

        {/* Customer Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Rating</Text>
          <View style={styles.ratingContainer}>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= (task.customer_rating || 5) ? "star" : "star-outline"}
                  size={20}
                  color={Colors.warning[500]}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>{task.customer_rating || 5.0} / 5.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* Apply Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.applyButton,
            hasApplied && styles.appliedButton
          ]}
          onPress={handleApply}
          disabled={applying}
        >
          {applying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[
              styles.applyButtonText,
              hasApplied && styles.appliedButtonText
            ]}>
              {task.customer_id === user?.id 
                ? 'View Applications' 
                : (hasApplied ? 'Already Applied' : 'Apply Now')
              }
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.neutral[900],
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.neutral[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.error[600],
    marginTop: 15,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
  taskHeader: {
    backgroundColor: Colors.background.primary,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.neutral[900],
    flex: 1,
    marginRight: 10,
  },
  urgentBadge: {
    backgroundColor: Colors.error[500],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  urgentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary[600],
  },
  section: {
    backgroundColor: Colors.background.primary,
    padding: 20,
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 12,
  },
  taskDescription: {
    fontSize: 16,
    color: Colors.neutral[700],
    lineHeight: 24,
  },
  detailsList: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 16,
    color: Colors.neutral[700],
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 16,
    color: Colors.neutral[700],
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.primary,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  applyButton: {
    backgroundColor: Colors.primary[500],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  appliedButton: {
    backgroundColor: Colors.neutral[300],
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  appliedButtonText: {
    color: Colors.neutral[600],
  },
})
