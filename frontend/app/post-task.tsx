import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
// Removed the problematic DateTimePicker import
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAuth } from '../contexts/SimpleAuthContext'
import { TaskService } from '../services/TaskServiceFixed'
import { SimpleNotificationService } from '../services/SimpleNotificationService'
import { PushNotificationService } from '../services/PushNotificationService'
import { supabase } from '../lib/supabase'
import Colors from '../constants/Colors'
import MultiImageUpload from '../components/MultiImageUpload'

const categories = [
  'Cleaning',
  'Handyman',
  'Delivery',
  'Photography',
  'Technology',
  'Gardening',
  'Pet Care',
  'Moving',
  'Tutoring',
  'Cooking',
  'Painting',
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Landscaping',
  'Event Planning',
  'Other'
]

export default function PostTask() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const { category } = useLocalSearchParams()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [taskImages, setTaskImages] = useState<string[]>([])
  const [taskDate, setTaskDate] = useState(new Date())
  const [taskTime, setTaskTime] = useState(() => {
    const defaultTime = new Date()
    defaultTime.setHours(0, 0, 0, 0) // Set to 12:00 AM
    return defaultTime
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth')
    }
  }, [isAuthenticated, isLoading])

  useEffect(() => {
    if (category && typeof category === 'string') {
      setSelectedCategory(category)
    }
  }, [category])

  // Show loading while auth is being determined
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const ensureUserProfile = async (userId: string): Promise<string> => {
    try {
      // Check if profile exists using the auth.users.id (user_id field)
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (profileError) {
        console.error('Error checking profile existence:', profileError)
        throw new Error(`Database error: ${profileError.message}`)
      }

      if (existingProfile) {
        console.log('Profile found:', existingProfile.id)
        return existingProfile.id
      }

      // If profile doesn't exist, throw an error instead of creating one
      throw new Error('Profile not found. Please complete your profile setup first.')
    } catch (error) {
      console.error('Error ensuring user profile:', error)
      throw error // Re-throw the error instead of returning fallback
    }
  }

  const getOrCreateCategory = async (categoryName: string): Promise<string> => {
    try {
      // First try to find existing category
      const { data: existingCategory } = await supabase
        .from('task_categories')
        .select('id')
        .eq('name', categoryName)
        .single()

      if (existingCategory) {
        return existingCategory.id
      }

      // Create new category if it doesn't exist
      const { data: newCategory, error } = await supabase
        .from('task_categories')
        .insert([{
          name: categoryName,
          slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
        description: `${categoryName} services`,
        icon: 'briefcase',
        color: '#8B5CF6',
        is_active: true
        }])
        .select('id')
        .single()

      if (error) throw error
      return newCategory.id
    } catch (error) {
      console.error('Error getting/creating category:', error)
      // Return a default category ID or create a fallback
      return '550e8400-e29b-41d4-a716-446655440000' // General category UUID
    }
  }

  const handlePostTask = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to post a task')
      return
    }

    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title')
      return
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a task description')
      return
    }
    if (!price.trim()) {
      Alert.alert('Error', 'Please enter a price range')
      return
    }
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter a location')
      return
    }
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category')
      return
    }

    setLoading(true)
    try {
      console.log('Post task - User object:', {
        id: user.id,
        user_id: user.user_id,
        full_name: user.full_name,
        phone: user.phone
      })
      
      // First ensure user profile exists and get profile ID
      const profileId = await ensureUserProfile(user.user_id)
      
      // Then get or create category
      const categoryId = await getOrCreateCategory(selectedCategory)
      
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        budget: parseFloat(price) || 0,
        address: location.trim(),
        city: 'Addis Ababa',
        state: 'Addis Ababa',
        zip_code: '1000',
        latitude: undefined,
        longitude: undefined,
        flexible_date: false, // Now we have specific date/time
        // Store as date and time strings compatible with Postgres DATE and TIME
        task_date: taskDate.toISOString().split('T')[0],
        task_time: taskTime.toISOString().split('T')[1].slice(0, 8),
        estimated_hours: 2, // Default estimate
        task_size: 'medium' as const,
        urgency: urgent ? 'urgent' as const : 'flexible' as const,
        status: 'open' as const,
        customer_id: profileId, // Use the actual profile ID
        user_id: user.user_id, // Use the auth.users.id for user_id field
        category_id: categoryId,
        requirements: [],
        attachments: [],
        tags: [selectedCategory.toLowerCase()],
        is_featured: false,
        is_urgent: urgent,
        payment_status: 'pending' as const,
        special_instructions: '',
        photos: taskImages,
        estimated_duration_hours: 2
      }

      const createdTask = await TaskService.createTask(taskData)
      
      if (!createdTask) {
        throw new Error('Failed to create task')
      }
      
      // Create notification for successful task posting
      await SimpleNotificationService.createTaskNotification(title, 'created')
      
      // Create push notification for nearby taskers
      await PushNotificationService.createTaskNotification(title, createdTask.id, user.name || 'User')
      
      Alert.alert('Success', 'Task posted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setTitle('')
            setDescription('')
            setPrice('')
            setLocation('')
            setSelectedCategory('')
            setUrgent(false)
            setTaskImages([])
            setTaskDate(new Date())
            const defaultTime = new Date()
            defaultTime.setHours(0, 0, 0, 0) // Set to 12:00 AM
            setTaskTime(defaultTime)
            
            // Redirect to Jobs tab
            router.back()
          }
        }
      ])
    } catch (error) {
      console.error('Error posting task:', error)
      Alert.alert('Error', 'Failed to post task. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
              </TouchableOpacity>
              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Post a Task</Text>
                <Text style={styles.headerSubtitle}>Tell us what you need done</Text>
              </View>
              <View style={styles.placeholder} />
            </View>

            <ScrollView 
              style={styles.form} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
              bounces={true}
              scrollEventThrottle={16}
            >
              {/* Task Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Task Title *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="create-outline" size={20} color={Colors.neutral[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., House Cleaning, Furniture Assembly"
                    placeholderTextColor={Colors.neutral[400]}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={100}
                  />
                </View>
                <Text style={styles.characterCount}>{title.length}/100</Text>
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description *</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="document-text-outline" size={20} color={Colors.neutral[400]} />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe what needs to be done in detail..."
                    placeholderTextColor={Colors.neutral[400]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                  />
                </View>
                <Text style={styles.characterCount}>{description.length}/500</Text>
              </View>

              {/* Task Date and Time */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Task Date *</Text>
                  <TouchableOpacity 
                    style={styles.inputContainer}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={Colors.neutral[400]} />
                    <Text style={styles.dateText}>
                      {taskDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Task Time *</Text>
                  <TouchableOpacity 
                    style={styles.inputContainer}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color={Colors.neutral[400]} />
                    <Text style={styles.dateText}>
                      {taskTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Price and Location Row */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Price Range *</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="cash-outline" size={20} color={Colors.neutral[400]} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., $50 - $100"
                      placeholderTextColor={Colors.neutral[400]}
                      value={price}
                      onChangeText={setPrice}
                    />
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Location *</Text>
                  
                  <View style={styles.inputContainer}>
                    <Ionicons name="location-outline" size={20} color={Colors.neutral[400]} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Addis Ababa, Bole"
                      placeholderTextColor={Colors.neutral[400]}
                      value={location}
                      onChangeText={setLocation}
                    />
                  </View>
                </View>
              </View>

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category *</Text>
                <View style={styles.categoriesGrid}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        selectedCategory === category && styles.categoryChipActive,
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          selectedCategory === category && styles.categoryChipTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Task Images */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Task Photos (Optional)</Text>
                <Text style={styles.helperText}>Add photos to help taskers understand what needs to be done</Text>
                <View style={styles.imageUploadContainer}>
                  <MultiImageUpload
                    onImagesChange={setTaskImages}
                    currentImages={taskImages}
                    maxImages={5}
                    placeholder="Add task images"
                    showPreview={true}
                  />
                </View>
              </View>

              {/* Urgent Toggle */}
              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={styles.urgentToggle}
                  onPress={() => setUrgent(!urgent)}
                >
                  <View style={[styles.toggle, urgent && styles.toggleActive]}>
                    {urgent && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <View style={styles.toggleContent}>
                    <View style={styles.toggleHeader}>
                      <Ionicons name="flash" size={20} color={urgent ? Colors.warning[500] : Colors.neutral[400]} />
                      <Text style={styles.toggleTitle}>Mark as Urgent</Text>
                    </View>
                    <Text style={styles.toggleSubtitle}>This task needs immediate attention</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Post Button */}
              <TouchableOpacity
                style={[styles.postButton, loading && styles.postButtonDisabled]}
                onPress={handlePostTask}
                disabled={loading}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.postButtonText}>
                  {loading ? 'Posting Task...' : 'Post Task'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Modern Date Picker Modal */}
            <Modal
              visible={showDatePicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Date</Text>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={styles.modalCloseButton}
                    >
                      <Ionicons name="close" size={24} color={Colors.neutral[600]} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.datePickerContainer}>
                    <View style={styles.dateDisplay}>
                      <Text style={styles.selectedDateText}>
                        {taskDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </Text>
                    </View>
                    
                    <View style={styles.dateControls}>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          const newDate = new Date(taskDate)
                          newDate.setDate(newDate.getDate() - 1)
                          if (newDate >= new Date()) {
                            setTaskDate(newDate)
                          }
                        }}
                      >
                        <Ionicons name="chevron-down" size={20} color={Colors.primary[500]} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          const newDate = new Date(taskDate)
                          newDate.setDate(newDate.getDate() + 1)
                          setTaskDate(newDate)
                        }}
                      >
                        <Ionicons name="chevron-up" size={20} color={Colors.primary[500]} />
                      </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.confirmButtonText}>Confirm Date</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Modern Time Picker Modal */}
            <Modal
              visible={showTimePicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowTimePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Time</Text>
                    <TouchableOpacity
                      onPress={() => setShowTimePicker(false)}
                      style={styles.modalCloseButton}
                    >
                      <Ionicons name="close" size={24} color={Colors.neutral[600]} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.timePickerContainer}>
                    <View style={styles.timeDisplay}>
                      <Text style={styles.selectedTimeText}>
                        {taskTime.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </Text>
                    </View>
                    
                    <View style={styles.timeControls}>
                      <View style={styles.timeControlGroup}>
                        <Text style={styles.timeLabel}>Hour</Text>
                        <View style={styles.timeButtons}>
                          <TouchableOpacity
                            style={styles.timeButton}
                            onPress={() => {
                              const newTime = new Date(taskTime)
                              newTime.setHours(newTime.getHours() + 1)
                              setTaskTime(newTime)
                            }}
                          >
                            <Ionicons name="chevron-up" size={20} color={Colors.primary[500]} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.timeButton}
                            onPress={() => {
                              const newTime = new Date(taskTime)
                              newTime.setHours(newTime.getHours() - 1)
                              setTaskTime(newTime)
                            }}
                          >
                            <Ionicons name="chevron-down" size={20} color={Colors.primary[500]} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <View style={styles.timeControlGroup}>
                        <Text style={styles.timeLabel}>Minute</Text>
                        <View style={styles.timeButtons}>
                          <TouchableOpacity
                            style={styles.timeButton}
                            onPress={() => {
                              const newTime = new Date(taskTime)
                              newTime.setMinutes(newTime.getMinutes() + 10)
                              setTaskTime(newTime)
                            }}
                          >
                            <Ionicons name="chevron-up" size={20} color={Colors.primary[500]} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.timeButton}
                            onPress={() => {
                              const newTime = new Date(taskTime)
                              newTime.setMinutes(newTime.getMinutes() - 10)
                              setTaskTime(newTime)
                            }}
                          >
                            <Ionicons name="chevron-down" size={20} color={Colors.primary[500]} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={styles.confirmButtonText}>Confirm Time</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.neutral[600],
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  inputGroup: {
    marginTop: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.neutral[900],
    marginLeft: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: Colors.neutral[500],
    textAlign: 'right',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  categoryChipText: {
    fontSize: 14,
    color: Colors.neutral[600],
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  urgentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border.primary,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  toggleActive: {
    backgroundColor: Colors.warning[500],
    borderColor: Colors.warning[500],
  },
  toggleContent: {
    flex: 1,
  },
  toggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginLeft: 8,
  },
  toggleSubtitle: {
    fontSize: 14,
    color: Colors.neutral[600],
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[500],
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 32,
    marginBottom: 40,
    gap: 8,
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  postButtonDisabled: {
    backgroundColor: Colors.neutral[300],
    shadowOpacity: 0,
    elevation: 0,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: 12,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  taskImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 2,
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary[300],
    borderStyle: 'dashed',
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: 12,
    color: Colors.primary[600],
    marginTop: 4,
    textAlign: 'center',
  },
  imageToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary[50],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  imageToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary[600],
    marginLeft: 8,
  },
  imageUploadContainer: {
    marginTop: 12,
  },
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  locationToggleText: {
    fontSize: 14,
    color: Colors.neutral[600],
    fontWeight: '500',
  },
  dateText: {
    fontSize: 16,
    color: Colors.neutral[700],
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.neutral[600],
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  modalCloseButton: {
    padding: 4,
  },
  datePickerContainer: {
    alignItems: 'center',
  },
  dateDisplay: {
    backgroundColor: Colors.primary[50],
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary[700],
    textAlign: 'center',
  },
  dateControls: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  dateButton: {
    backgroundColor: Colors.primary[100],
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  confirmButton: {
    backgroundColor: Colors.primary[500],
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timePickerContainer: {
    alignItems: 'center',
  },
  timeDisplay: {
    backgroundColor: Colors.primary[50],
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  selectedTimeText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary[700],
    textAlign: 'center',
  },
  timeControls: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 24,
  },
  timeControlGroup: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[600],
    marginBottom: 12,
  },
  timeButtons: {
    gap: 8,
  },
  timeButton: {
    backgroundColor: Colors.primary[100],
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
})