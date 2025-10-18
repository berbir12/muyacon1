import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '../contexts/SimpleAuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { TaskService, Task } from '../services/TaskServiceFixed'
import { TaskApplicationService } from '../services/TaskApplicationService'
import { SearchService, SearchFilters } from '../services/SearchService'
import AdvancedSearch from '../components/AdvancedSearch'
import LoadingErrorState from '../components/LoadingErrorState'
import Colors from '../constants/Colors'

const { width } = Dimensions.get('window')

const categories = ['All', 'Cleaning', 'Handyman', 'Delivery', 'Photography', 'Technology', 'Gardening', 'Moving', 'Pet Care', 'Tutoring', 'Cooking', 'Painting', 'Plumbing', 'Electrical', 'Carpentry', 'Event Planning']

const budgetRanges = [
  { label: 'jobs.any_budget', min: 0, max: Infinity },
  { label: 'jobs.under_25', min: 0, max: 25 },
  { label: 'jobs.25_50', min: 25, max: 50 },
  { label: 'jobs.50_100', min: 50, max: 100 },
  { label: 'jobs.100_200', min: 100, max: 200 },
  { label: 'jobs.over_200', min: 200, max: Infinity },
]

const sortOptions = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Price: Low to High', value: 'price_low' },
  { label: 'Price: High to Low', value: 'price_high' },
  { label: 'Distance: Nearest', value: 'distance' },
  { label: 'Urgency', value: 'urgency' },
]

export default function Jobs() {
  const { user, isAuthenticated, loading: isLoading } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [activeTab, setActiveTab] = useState('available')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [appliedTasks, setAppliedTasks] = useState<Set<string>>(new Set())
  
  // Enhanced filtering states
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBudgetRange, setSelectedBudgetRange] = useState(0)
  const [selectedSort, setSelectedSort] = useState('newest')
  const [selectedDate, setSelectedDate] = useState('any')
  const [selectedUrgency, setSelectedUrgency] = useState('any')
  const [selectedLocation, setSelectedLocation] = useState('any')
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth')
    }
  }, [isAuthenticated, isLoading])

  useEffect(() => {
    if (isAuthenticated) {
      loadTasks()
    }
  }, [activeTab, user, isAuthenticated])

  // Refresh tasks when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user) {
        loadTasks() // This will call checkAppliedTasks internally
      }
    }, [isAuthenticated, user, activeTab])
  )

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

  const loadTasks = async () => {
    if (!user) {
      console.log('Jobs: No user found, cannot load tasks')
      return
    }
    
    console.log('Jobs: Loading tasks for user:', user.id, 'user_id:', user.user_id, user.name, 'activeTab:', activeTab)
    
    setLoading(true)
    try {
      let fetchedTasks: Task[] = []
      
      if (activeTab === 'available') {
        fetchedTasks = await TaskService.getAvailableTasks(user.user_id)
      } else {
        fetchedTasks = await TaskService.getMyTasks(user.user_id)
      }
      
      console.log('Jobs: Loaded tasks:', fetchedTasks.length)
      setTasks(fetchedTasks)
      
      // Check which tasks user has already applied to
      if (activeTab === 'available' && (user.role === 'tasker' || user.role === 'both')) {
        await checkAppliedTasks(fetchedTasks)
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
      Alert.alert('Error', 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const checkAppliedTasks = async (tasks: Task[]) => {
    if (!user) return

    console.log('Jobs: Checking applied tasks for', tasks.length, 'tasks')
    const appliedSet = new Set<string>()
    
    // Check each task to see if user has applied
    for (const task of tasks) {
      try {
        const hasApplied = await TaskApplicationService.hasUserAppliedToTask(user.user_id, task.id)
        console.log(`Jobs: Task ${task.id} - hasApplied: ${hasApplied}`)
        if (hasApplied) {
          appliedSet.add(task.id)
        }
      } catch (error) {
        console.error(`Error checking application for task ${task.id}:`, error)
      }
    }
    
    console.log('Jobs: Applied tasks set:', Array.from(appliedSet))
    setAppliedTasks(appliedSet)
  }

  const handleAdvancedSearch = async (filters: SearchFilters) => {
    try {
      setLoading(true)
      setError(null)
      setSearchFilters(filters)
      
      const searchResult = await SearchService.searchTasks(filters)
      setTasks(searchResult.tasks)
    } catch (error) {
      console.error('Error in advanced search:', error)
      setError('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyToTask = async (taskId: string) => {
    if (!user) return
    
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
    
    // Find the task to get its details
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
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

  const handleSearch = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const searchResults = await TaskService.searchTasks(searchQuery, selectedCategory)
      setTasks(searchResults)
    } catch (error) {
      console.error('Error searching tasks:', error)
      Alert.alert('Error', 'Failed to search tasks')
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchQuery === '' || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'All' || 
      task.category_name?.toLowerCase() === selectedCategory.toLowerCase()
    
    const matchesBudget = selectedBudgetRange === 0 || 
      (task.budget >= budgetRanges[selectedBudgetRange].min && 
       task.budget <= budgetRanges[selectedBudgetRange].max)
    
    const matchesDate = selectedDate === 'any' || 
      (selectedDate === 'today' && task.task_date === new Date().toISOString().split('T')[0]) ||
      (selectedDate === 'tomorrow' && task.task_date === new Date(Date.now() + 86400000).toISOString().split('T')[0]) ||
      (selectedDate === 'this_week' && task.task_date && new Date(task.task_date) <= new Date(Date.now() + 7 * 86400000))
    
    const matchesUrgency = selectedUrgency === 'any' || 
      task.urgency === selectedUrgency
    
    const matchesLocation = selectedLocation === 'any' || 
      task.city?.toLowerCase().includes(selectedLocation.toLowerCase()) ||
      task.address?.toLowerCase().includes(selectedLocation.toLowerCase())
    
    return matchesSearch && matchesCategory && matchesBudget && matchesDate && matchesUrgency && matchesLocation
  }).sort((a, b) => {
    switch (selectedSort) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'price_low':
        return a.budget - b.budget
      case 'price_high':
        return b.budget - a.budget
      case 'urgency':
        const urgencyOrder = { urgent: 3, within_week: 2, flexible: 1 }
        return (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0)
      default:
        return 0
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return Colors.warning[500]
      case 'assigned': return Colors.primary[500]
      case 'in_progress': return Colors.primary[500]
      case 'completed': return Colors.success[500]
      case 'cancelled': return Colors.error[500]
      default: return Colors.neutral[500]
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending'
      case 'assigned': return 'Assigned'
      case 'in_progress': return 'In Progress'
      case 'completed': return 'Completed'
      case 'cancelled': return 'Cancelled'
      default: return 'Unknown'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
      } else {
      return `${Math.floor(diffInHours / 24)}d ago`
    }
  }

    return (
      <SafeAreaView style={styles.container}>
      {/* Header */}
        <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
              {activeTab === 'available' ? t('jobs.available') : t('jobs.my_tasks')}
          </Text>
            <Text style={styles.headerSubtitle}>
              {user ? `Hi ${user.name.split(' ')[0]}!` : 'Find your next job'}
          </Text>
        </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.createTaskButton}
              onPress={() => router.push('/post-task')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createTaskText}>{t('jobs.create_task')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('jobs.search')}
            placeholderTextColor={Colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowAdvancedSearch(true)}
          >
            <Ionicons name="search-outline" size={20} color={Colors.primary[500]} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options-outline" size={20} color={Colors.primary[500]} />
            {showFilters && <View style={styles.filterBadge} />}
          </TouchableOpacity>
            </View>
        </View>

        {/* Enhanced Filter Panel */}
        {showFilters && (
          <View style={styles.filterPanel}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {/* Budget Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('jobs.budget_range')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {budgetRanges.map((range, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.filterChip,
                        selectedBudgetRange === index && styles.filterChipActive
                      ]}
                      onPress={() => setSelectedBudgetRange(index)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedBudgetRange === index && styles.filterChipTextActive
                      ]}>
                        {t(range.label)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Sort Options */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Sort By</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {sortOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterChip,
                        selectedSort === option.value && styles.filterChipActive
                      ]}
                      onPress={() => setSelectedSort(option.value)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedSort === option.value && styles.filterChipTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Date Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[
                    { label: 'Any Date', value: 'any' },
                    { label: 'Today', value: 'today' },
                    { label: 'Tomorrow', value: 'tomorrow' },
                    { label: 'This Week', value: 'this_week' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterChip,
                        selectedDate === option.value && styles.filterChipActive
                      ]}
                      onPress={() => setSelectedDate(option.value)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedDate === option.value && styles.filterChipTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Urgency Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Urgency</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[
                    { label: 'Any', value: 'any' },
                    { label: 'Urgent', value: 'urgent' },
                    { label: 'Within Week', value: 'within_week' },
                    { label: 'Flexible', value: 'flexible' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterChip,
                        selectedUrgency === option.value && styles.filterChipActive
                      ]}
                      onPress={() => setSelectedUrgency(option.value)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedUrgency === option.value && styles.filterChipTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Clear Filters */}
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSelectedBudgetRange(0)
                  setSelectedSort('newest')
                  setSelectedDate('any')
                  setSelectedUrgency('any')
                  setSelectedLocation('any')
                }}
              >
                <Ionicons name="refresh" size={16} color={Colors.primary[500]} />
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Tasker Registration Prompt */}
        {user && user.role !== 'tasker' && user.role !== 'both' && user.tasker_application_status !== 'pending' && activeTab === 'available' && (
          <View style={styles.taskerPrompt}>
            <View style={styles.taskerPromptContent}>
              <Ionicons name="briefcase" size={18} color={Colors.primary[500]} />
              <View style={styles.taskerPromptText}>
                <Text style={styles.taskerPromptTitle}>Want to apply for tasks?</Text>
                <Text style={styles.taskerPromptSubtitle}>Become a tasker to start earning money</Text>
              </View>
              <TouchableOpacity 
                style={styles.taskerPromptButton}
                onPress={() => router.push('/tasker-application')}
              >
                <Text style={styles.taskerPromptButtonText}>Apply Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}


      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
          <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.activeTab]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>
            Available
          </Text>
          </TouchableOpacity>
          <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
            My Tasks
            </Text>
          </TouchableOpacity>
      </View>

      {/* Category Filters */}
      {activeTab === 'available' && (
        <View style={styles.filtersSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            {categories.map((category) => (
          <TouchableOpacity
                key={category}
            style={[
                  styles.filterChip,
                  selectedCategory === category && styles.filterChipActive
            ]}
                onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
                  styles.filterChipText,
                  selectedCategory === category && styles.filterChipTextActive
            ]}>
                  {category}
            </Text>
          </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tasks List */}
      <ScrollView 
        style={styles.tasksList} 
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        bounces={true}
        scrollEventThrottle={16}
      >
        <LoadingErrorState
          loading={loading}
          error={error}
          empty={!loading && filteredTasks.length === 0}
          emptyMessage="No tasks found. Try adjusting your search criteria."
          emptyIcon="briefcase-outline"
          onRetry={loadTasks}
        >
          {filteredTasks.map((task) => (
            <TouchableOpacity 
              key={task.id} 
              style={styles.taskCard}
              onPress={() => router.push({
                pathname: '/task-detail',
                params: { taskId: task.id }
              })}
            >
              {/* Task Image */}
        {task.photos && task.photos.length > 0 && (
          <View style={styles.taskImageContainer}>
            <Image
              source={{ uri: task.photos[0] }}
              style={styles.taskImage}
              resizeMode="cover"
            />
            {task.photos.length > 1 && (
              <View style={styles.imageCountBadge}>
                <Text style={styles.imageCountText}>+{task.photos.length - 1}</Text>
              </View>
            )}
          </View>
        )}

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
              <Text style={styles.taskDescription} numberOfLines={2}>
                {task.description}
            </Text>
              
              {/* Task Meta */}
              <View style={styles.taskMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={16} color={Colors.neutral[500]} />
                  <Text style={styles.metaText}>{task.address}</Text>
                </View>
                {task.task_date && (
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.primary[500]} />
                    <Text style={styles.metaText}>
                      {new Date(task.task_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                )}
                {task.task_time && (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={16} color={Colors.primary[500]} />
                    <Text style={styles.metaText}>{task.task_time}</Text>
                  </View>
                )}
                {task.flexible_date && (
                  <View style={styles.metaItem}>
                    <Ionicons name="refresh-outline" size={16} color={Colors.neutral[500]} />
                    <Text style={styles.metaText}>Flexible</Text>
                  </View>
                )}
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={Colors.neutral[500]} />
                  <Text style={styles.metaText}>{formatTime(task.created_at)}</Text>
                </View>
                {activeTab === 'available' && (
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={16} color={Colors.neutral[500]} />
                    <Text style={styles.metaText}>{task.customer_name}</Text>
                  </View>
                )}
            </View>
            
              {/* Task Footer */}
              <View style={styles.taskFooter}>
                <View style={styles.taskTags}>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{task.category_name}</Text>
              </View>
                  {activeTab === 'available' && (
                    <View style={styles.ratingTag}>
                      <Ionicons name="star" size={14} color={Colors.warning[500]} />
                      <Text style={styles.ratingText}>{task.customer_rating || 5.0}</Text>
                    </View>
                  )}
                  {activeTab === 'my' && (
                    <View style={[styles.statusTag, { backgroundColor: getStatusColor(task.status) + '15' }]}>
                      <Text style={[styles.statusTagText, { color: getStatusColor(task.status) }]}>
                        {getStatusLabel(task.status)}
                </Text>
              </View>
            )}
          </View>

                <TouchableOpacity 
                  style={[
                    styles.actionButton,
                    activeTab === 'available' && appliedTasks.has(task.id) && styles.appliedButton
                  ]}
                  onPress={() => {
                    if (activeTab === 'available') {
                      if (appliedTasks.has(task.id)) {
                        Alert.alert('Already Applied', 'You have already applied to this task.')
                      } else {
                        handleApplyToTask(task.id)
                      }
                    } else {
                      router.push({
                        pathname: '/task-applications',
                        params: { taskId: task.id }
                      })
                    }
                  }}
                >
                  <Text style={[
                    styles.actionButtonText,
                    activeTab === 'available' && appliedTasks.has(task.id) && styles.appliedButtonText
                  ]}>
                    {activeTab === 'available' 
                      ? (appliedTasks.has(task.id) ? 'Already Applied' : 'Apply')
                      : 'View Applications'
                    }
                  </Text>
                </TouchableOpacity>
        </View>
            </TouchableOpacity>
          ))}
        </LoadingErrorState>
      </ScrollView>

      {/* Advanced Search Modal */}
      <AdvancedSearch
        visible={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onSearch={handleAdvancedSearch}
        initialFilters={searchFilters}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerText: {
    flex: 1,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  createTaskText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.error[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.neutral[900],
    marginLeft: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: Colors.primary[500],
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[600],
  },
  activeTabText: {
    color: '#fff',
  },
  filtersSection: {
    paddingVertical: 16,
    backgroundColor: Colors.background.primary,
  },
  filtersScroll: {
    paddingHorizontal: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  filterChipActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  filterChipText: {
    fontSize: 14,
    color: Colors.neutral[600],
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary[50],
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary[500],
  },
  filterPanel: {
    backgroundColor: Colors.background.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterSection: {
    marginRight: 24,
    minWidth: 200,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: 8,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primary[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary[200],
    marginLeft: 16,
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary[600],
    marginLeft: 4,
  },
  tasksList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.neutral[600],
  },
  taskCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  taskImageContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  taskImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imageCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  imageCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
    flex: 1,
  },
  urgentBadge: {
    backgroundColor: Colors.error[500],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  urgentText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  taskPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.success[500],
  },
  taskDescription: {
    fontSize: 15,
    color: Colors.neutral[600],
    marginBottom: 16,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginLeft: 6,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTags: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTag: {
    backgroundColor: Colors.primary[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryTagText: {
    fontSize: 12,
    color: Colors.primary[600],
    fontWeight: '600',
  },
  ratingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.warning[700],
    marginLeft: 4,
    fontWeight: '600',
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: Colors.primary[500],
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  appliedButton: {
    backgroundColor: Colors.neutral[300],
  },
  appliedButtonText: {
    color: Colors.neutral[600],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[600],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  taskerPrompt: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: Colors.primary[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  taskerPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  taskerPromptText: {
    flex: 1,
  },
  taskerPromptTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary[700],
    marginBottom: 1,
  },
  taskerPromptSubtitle: {
    fontSize: 12,
    color: Colors.primary[600],
  },
  taskerPromptButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  taskerPromptButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
})