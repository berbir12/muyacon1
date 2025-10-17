import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
  FlatList
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { TaskService, Task } from '../services/TaskService'
import { SearchService, SearchFilters } from '../services/SearchService'
import Colors from '../constants/Colors'

interface EnhancedTaskManagerProps {
  userId: string
  userRole: 'customer' | 'tasker'
  onTaskSelect?: (task: Task) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  onBulkAction?: (taskIds: string[], action: string) => void
}

interface FilterState {
  searchQuery: string
  category: string
  status: string
  budgetMin: number | null
  budgetMax: number | null
  dateFrom: string | null
  dateTo: string | null
  sortBy: string
  sortOrder: 'asc' | 'desc'
  showExpired: boolean
  showUrgent: boolean
}

const EnhancedTaskManager: React.FC<EnhancedTaskManagerProps> = ({
  userId,
  userRole,
  onTaskSelect,
  onTaskUpdate,
  onBulkAction
}) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    assigned: 0,
    completed: 0,
    cancelled: 0
  })

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    category: 'All',
    status: 'All',
    budgetMin: null,
    budgetMax: null,
    dateFrom: null,
    dateTo: null,
    sortBy: 'created_at',
    sortOrder: 'desc',
    showExpired: false,
    showUrgent: false
  })

  const categories = ['All', 'Cleaning', 'Handyman', 'Delivery', 'Photography', 'Technology', 'Gardening', 'Moving', 'Pet Care', 'Tutoring']
  const statuses = ['All', 'draft', 'open', 'assigned', 'in_progress', 'completed', 'cancelled']
  const sortOptions = [
    { value: 'created_at', label: 'Date Created' },
    { value: 'updated_at', label: 'Last Updated' },
    { value: 'budget', label: 'Budget' },
    { value: 'title', label: 'Title' },
    { value: 'expires_at', label: 'Expiration' }
  ]

  useEffect(() => {
    loadTasks()
    loadStats()
  }, [userId, userRole])

  useEffect(() => {
    applyFilters()
  }, [tasks, filters])

  const loadTasks = async () => {
    try {
      setLoading(true)
      let taskData: Task[] = []

      if (userRole === 'customer') {
        taskData = await TaskService.getMyTasks(userId)
      } else {
        taskData = await TaskService.getMyAssignedTasks(userId)
      }

      setTasks(taskData)
    } catch (error) {
      console.error('Error loading tasks:', error)
      Alert.alert('Error', 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const taskStats = await TaskService.getTaskStatistics(userId)
      setStats({
        total: taskStats.totalTasks,
        open: taskStats.openTasks,
        assigned: taskStats.assignedTasks,
        completed: taskStats.completedTasks,
        cancelled: taskStats.cancelledTasks
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const applyFilters = () => {
    let filtered = [...tasks]

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.address.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (filters.category !== 'All') {
      filtered = filtered.filter(task => task.category_name === filters.category)
    }

    // Status filter
    if (filters.status !== 'All') {
      filtered = filtered.filter(task => task.status === filters.status)
    }

    // Budget filter
    if (filters.budgetMin !== null) {
      filtered = filtered.filter(task => task.budget >= filters.budgetMin!)
    }
    if (filters.budgetMax !== null) {
      filtered = filtered.filter(task => task.budget <= filters.budgetMax!)
    }

    // Date filter
    if (filters.dateFrom) {
      filtered = filtered.filter(task => new Date(task.created_at) >= new Date(filters.dateFrom!))
    }
    if (filters.dateTo) {
      filtered = filtered.filter(task => new Date(task.created_at) <= new Date(filters.dateTo!))
    }

    // Expired filter
    if (!filters.showExpired) {
      const now = new Date()
      filtered = filtered.filter(task => 
        !task.expires_at || new Date(task.expires_at) > now
      )
    }

    // Urgent filter
    if (filters.showUrgent) {
      filtered = filtered.filter(task => task.is_urgent)
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[filters.sortBy as keyof Task]
      const bValue = b[filters.sortBy as keyof Task]
      
      if (filters.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    setFilteredTasks(filtered)
  }

  const handleTaskSelect = (task: Task) => {
    if (onTaskSelect) {
      onTaskSelect(task)
    }
  }

  const handleTaskToggle = (taskId: string) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(filteredTasks.map(task => task.id)))
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedTasks.size === 0) {
      Alert.alert('No Selection', 'Please select tasks to perform bulk action')
      return
    }

    const taskIds = Array.from(selectedTasks)
    setBulkActionLoading(true)

    try {
      let result: any = { success: 0, failed: 0, errors: [] }

      switch (action) {
        case 'delete':
          result = await TaskService.bulkDeleteTasks(taskIds, userId)
          break
        case 'publish':
          result = await TaskService.bulkUpdateTaskStatus(taskIds, 'open', userId)
          break
        case 'cancel':
          result = await TaskService.bulkUpdateTaskStatus(taskIds, 'cancelled', userId)
          break
        default:
          throw new Error('Unknown action')
      }

      if (result.success > 0) {
        Alert.alert(
          'Success',
          `${result.success} tasks ${action}ed successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}`
        )
        setSelectedTasks(new Set())
        loadTasks()
        loadStats()
      } else {
        Alert.alert('Error', 'Failed to perform bulk action')
      }
    } catch (error) {
      console.error('Error performing bulk action:', error)
      Alert.alert('Error', 'Failed to perform bulk action')
    } finally {
      setBulkActionLoading(false)
      setShowBulkActions(false)
    }
  }

  const handleTaskStatusUpdate = async (taskId: string, newStatus: Task['status']) => {
    try {
      const success = await TaskService.updateTaskStatus(taskId, newStatus, userId)
      if (success) {
        loadTasks()
        loadStats()
        if (onTaskUpdate) {
          onTaskUpdate(taskId, { status: newStatus })
        }
      } else {
        Alert.alert('Error', 'Failed to update task status')
      }
    } catch (error) {
      console.error('Error updating task status:', error)
      Alert.alert('Error', 'Failed to update task status')
    }
  }

  const renderTaskCard = ({ item: task }: { item: Task }) => (
    <TouchableOpacity
      style={[
        styles.taskCard,
        selectedTasks.has(task.id) && styles.selectedTaskCard
      ]}
      onPress={() => handleTaskSelect(task)}
      onLongPress={() => handleTaskToggle(task.id)}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle} numberOfLines={1}>
            {task.title}
          </Text>
          <Text style={styles.taskPrice}>${task.budget}</Text>
        </View>
        <View style={styles.taskActions}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => handleTaskToggle(task.id)}
          >
            <Ionicons
              name={selectedTasks.has(task.id) ? 'checkbox' : 'square-outline'}
              size={20}
              color={selectedTasks.has(task.id) ? Colors.primary[500] : Colors.neutral[400]}
            />
          </TouchableOpacity>
          <View style={[styles.statusBadge, styles[`status_${task.status}`]]}>
            <Text style={styles.statusText}>{task.status}</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.taskDescription} numberOfLines={2}>
        {task.description}
      </Text>
      
      <View style={styles.taskFooter}>
        <Text style={styles.taskDate}>
          {new Date(task.created_at).toLocaleDateString()}
        </Text>
        <Text style={styles.taskCategory}>{task.category_name}</Text>
        {task.is_urgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>URGENT</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.filterModal}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filters</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={24} color={Colors.neutral[900]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.filterContent}>
          {/* Search */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Search</Text>
            <TextInput
              style={styles.searchInput}
              value={filters.searchQuery}
              onChangeText={(text) => setFilters({ ...filters, searchQuery: text })}
              placeholder="Search tasks..."
            />
          </View>

          {/* Category */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterChip,
                    filters.category === category && styles.filterChipActive
                  ]}
                  onPress={() => setFilters({ ...filters, category })}
                >
                  <Text style={[
                    styles.filterChipText,
                    filters.category === category && styles.filterChipTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Status */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {statuses.map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    filters.status === status && styles.filterChipActive
                  ]}
                  onPress={() => setFilters({ ...filters, status })}
                >
                  <Text style={[
                    styles.filterChipText,
                    filters.status === status && styles.filterChipTextActive
                  ]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Budget Range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Budget Range</Text>
            <View style={styles.budgetInputs}>
              <TextInput
                style={styles.budgetInput}
                value={filters.budgetMin?.toString() || ''}
                onChangeText={(text) => setFilters({ 
                  ...filters, 
                  budgetMin: text ? parseFloat(text) : null 
                })}
                placeholder="Min"
                keyboardType="numeric"
              />
              <Text style={styles.budgetSeparator}>-</Text>
              <TextInput
                style={styles.budgetInput}
                value={filters.budgetMax?.toString() || ''}
                onChangeText={(text) => setFilters({ 
                  ...filters, 
                  budgetMax: text ? parseFloat(text) : null 
                })}
                placeholder="Max"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Sort By</Text>
            <View style={styles.sortContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {sortOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterChip,
                      filters.sortBy === option.value && styles.filterChipActive
                    ]}
                    onPress={() => setFilters({ ...filters, sortBy: option.value })}
                  >
                    <Text style={[
                      styles.filterChipText,
                      filters.sortBy === option.value && styles.filterChipTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.sortOrderButton}
                onPress={() => setFilters({ 
                  ...filters, 
                  sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
                })}
              >
                <Ionicons
                  name={filters.sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                  size={16}
                  color={Colors.neutral[600]}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Toggle Options */}
          <View style={styles.filterSection}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Show Expired Tasks</Text>
              <Switch
                value={filters.showExpired}
                onValueChange={(value) => setFilters({ ...filters, showExpired: value })}
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Show Only Urgent</Text>
              <Switch
                value={filters.showUrgent}
                onValueChange={(value) => setFilters({ ...filters, showUrgent: value })}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.filterFooter}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setFilters({
              searchQuery: '',
              category: 'All',
              status: 'All',
              budgetMin: null,
              budgetMax: null,
              dateFrom: null,
              dateTo: null,
              sortBy: 'created_at',
              sortOrder: 'desc',
              showExpired: false,
              showUrgent: false
            })}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.open}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.assigned}</Text>
          <Text style={styles.statLabel}>Assigned</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={20} color={Colors.primary[500]} />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>

        {selectedTasks.size > 0 && (
          <TouchableOpacity
            style={styles.bulkButton}
            onPress={() => setShowBulkActions(true)}
          >
            <Text style={styles.bulkButtonText}>
              {selectedTasks.size} Selected
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.selectAllButton}
          onPress={handleSelectAll}
        >
          <Text style={styles.selectAllButtonText}>
            {selectedTasks.size === filteredTasks.length ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tasks List */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTaskCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.tasksList}
        showsVerticalScrollIndicator={false}
      />

      {/* Filter Modal */}
      {renderFilterModal()}

      {/* Bulk Actions Modal */}
      <Modal
        visible={showBulkActions}
        transparent
        animationType="fade"
      >
        <View style={styles.bulkModalOverlay}>
          <View style={styles.bulkModal}>
            <Text style={styles.bulkModalTitle}>Bulk Actions</Text>
            <Text style={styles.bulkModalSubtitle}>
              {selectedTasks.size} tasks selected
            </Text>

            <View style={styles.bulkActions}>
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction('publish')}
                disabled={bulkActionLoading}
              >
                <Ionicons name="eye" size={20} color={Colors.primary[500]} />
                <Text style={styles.bulkActionText}>Publish</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction('cancel')}
                disabled={bulkActionLoading}
              >
                <Ionicons name="close-circle" size={20} color={Colors.error[500]} />
                <Text style={styles.bulkActionText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction('delete')}
                disabled={bulkActionLoading}
              >
                <Ionicons name="trash" size={20} color={Colors.error[500]} />
                <Text style={styles.bulkActionText}>Delete</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bulkModalFooter}>
              <TouchableOpacity
                style={styles.cancelBulkButton}
                onPress={() => setShowBulkActions(false)}
              >
                <Text style={styles.cancelBulkButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary[600],
  },
  statLabel: {
    fontSize: 12,
    color: Colors.neutral[600],
    marginTop: 4,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primary[50],
    borderRadius: 8,
    marginRight: 12,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  bulkButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primary[500],
    borderRadius: 8,
    marginRight: 12,
  },
  bulkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.neutral[100],
    borderRadius: 8,
  },
  selectAllButtonText: {
    color: Colors.neutral[700],
    fontSize: 14,
    fontWeight: '500',
  },
  tasksList: {
    padding: 20,
  },
  taskCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  selectedTaskCard: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  taskPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary[600],
  },
  taskActions: {
    alignItems: 'flex-end',
  },
  checkbox: {
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  status_draft: {
    backgroundColor: Colors.neutral[200],
  },
  status_open: {
    backgroundColor: Colors.success[100],
  },
  status_assigned: {
    backgroundColor: Colors.warning[100],
  },
  status_in_progress: {
    backgroundColor: Colors.primary[100],
  },
  status_completed: {
    backgroundColor: Colors.success[200],
  },
  status_cancelled: {
    backgroundColor: Colors.error[100],
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.neutral[700],
    textTransform: 'capitalize',
  },
  taskDescription: {
    fontSize: 14,
    color: Colors.neutral[600],
    lineHeight: 20,
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskDate: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  taskCategory: {
    fontSize: 12,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  urgentBadge: {
    backgroundColor: Colors.error[500],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  filterModal: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.neutral[900],
  },
  filterContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: Colors.background.secondary,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary[500],
  },
  filterChipText: {
    fontSize: 14,
    color: Colors.neutral[700],
  },
  filterChipTextActive: {
    color: '#fff',
  },
  budgetInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: Colors.background.secondary,
  },
  budgetSeparator: {
    marginHorizontal: 12,
    fontSize: 16,
    color: Colors.neutral[600],
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortOrderButton: {
    padding: 8,
    marginLeft: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: Colors.neutral[700],
  },
  filterFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  clearButtonText: {
    fontSize: 16,
    color: Colors.neutral[700],
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary[500],
  },
  applyButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  bulkModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulkModal: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    minWidth: 300,
  },
  bulkModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.neutral[900],
    textAlign: 'center',
    marginBottom: 8,
  },
  bulkModalSubtitle: {
    fontSize: 14,
    color: Colors.neutral[600],
    textAlign: 'center',
    marginBottom: 20,
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  bulkActionButton: {
    alignItems: 'center',
    padding: 12,
  },
  bulkActionText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.neutral[700],
  },
  bulkModalFooter: {
    alignItems: 'center',
  },
  cancelBulkButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelBulkButtonText: {
    fontSize: 16,
    color: Colors.neutral[600],
  },
})

export default EnhancedTaskManager
