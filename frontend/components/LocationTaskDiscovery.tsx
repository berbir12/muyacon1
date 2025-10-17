import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocation } from '../contexts/LocationContext'
import { useAuth } from '../contexts/SimpleAuthContext'
import { Colors } from '../constants/Colors'

interface LocationTaskDiscoveryProps {
  onTaskPress?: (task: any) => void
  onLocationPress?: () => void
  maxDistance?: number
  showHeader?: boolean
}

export default function LocationTaskDiscovery({
  onTaskPress,
  onLocationPress,
  maxDistance = 25,
  showHeader = true
}: LocationTaskDiscoveryProps) {
  const { user } = useAuth()
  const {
    currentLocation,
    currentAddress,
    isLocationEnabled,
    isWatching,
    nearbyTasks,
    loading,
    error,
    requestPermission,
    getCurrentLocation,
    startWatching,
    stopWatching,
    getNearbyTasks,
    formatDistance,
    calculateDistance
  } = useLocation()

  const [refreshing, setRefreshing] = useState(false)
  const [selectedRadius, setSelectedRadius] = useState(maxDistance)

  const radiusOptions = [5, 10, 25, 50, 100]

  useEffect(() => {
    if (isLocationEnabled && currentLocation) {
      loadNearbyTasks()
    }
  }, [isLocationEnabled, currentLocation, selectedRadius])

  const loadNearbyTasks = async () => {
    if (!currentLocation) return

    try {
      await getNearbyTasks(selectedRadius)
    } catch (error) {
      console.error('Error loading nearby tasks:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      if (isLocationEnabled) {
        await loadNearbyTasks()
      } else {
        await getCurrentLocation()
      }
    } catch (error) {
      console.error('Error refreshing:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleLocationPermission = async () => {
    if (!isLocationEnabled) {
      const granted = await requestPermission()
      if (granted) {
        await loadNearbyTasks()
      }
    }
  }

  const handleStartTracking = async () => {
    if (!isWatching) {
      await startWatching()
    } else {
      stopWatching()
    }
  }

  const handleTaskPress = (task: any) => {
    onTaskPress?.(task)
  }

  const handleLocationPress = () => {
    onLocationPress?.()
  }

  const renderLocationHeader = () => {
    if (!showHeader) return null

    return (
      <View style={styles.header}>
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={20} color={Colors.primary[500]} />
          <View style={styles.locationText}>
            <Text style={styles.locationTitle}>
              {currentAddress ? 'Current Location' : 'Location Services'}
            </Text>
            <Text style={styles.locationAddress} numberOfLines={1}>
              {currentAddress?.formattedAddress || 'Location not available'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={handleLocationPress}
        >
          <Ionicons name="chevron-forward" size={20} color={Colors.neutral[500]} />
        </TouchableOpacity>
      </View>
    )
  }

  const renderLocationControls = () => {
    if (!isLocationEnabled) {
      return (
        <View style={styles.permissionPrompt}>
          <Ionicons name="location-outline" size={48} color={Colors.neutral[300]} />
          <Text style={styles.permissionTitle}>Enable Location Services</Text>
          <Text style={styles.permissionText}>
            Allow location access to discover nearby tasks and get personalized recommendations.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleLocationPermission}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="location" size={20} color="#fff" />
                <Text style={styles.permissionButtonText}>Enable Location</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <View style={styles.controls}>
        <View style={styles.radiusSelector}>
          <Text style={styles.radiusLabel}>Search Radius</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.radiusOptions}
          >
            {radiusOptions.map((radius) => (
              <TouchableOpacity
                key={radius}
                style={[
                  styles.radiusOption,
                  selectedRadius === radius && styles.radiusOptionActive
                ]}
                onPress={() => setSelectedRadius(radius)}
              >
                <Text
                  style={[
                    styles.radiusOptionText,
                    selectedRadius === radius && styles.radiusOptionTextActive
                  ]}
                >
                  {radius}km
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.trackingControls}>
          <TouchableOpacity
            style={[
              styles.trackingButton,
              isWatching && styles.trackingButtonActive
            ]}
            onPress={handleStartTracking}
          >
            <Ionicons
              name={isWatching ? 'stop' : 'play'}
              size={16}
              color={isWatching ? Colors.error[500] : Colors.primary[500]}
            />
            <Text
              style={[
                styles.trackingButtonText,
                isWatching && styles.trackingButtonTextActive
              ]}
            >
              {isWatching ? 'Stop Tracking' : 'Start Tracking'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={loading}
          >
            <Ionicons
              name="refresh"
              size={16}
              color={loading ? Colors.neutral[400] : Colors.primary[500]}
            />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderTask = (task: any) => {
    const distance = currentLocation
      ? calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          task.latitude,
          task.longitude
        )
      : task.distance_km

    return (
      <TouchableOpacity
        key={task.id}
        style={styles.taskCard}
        onPress={() => handleTaskPress(task)}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{task.task_title}</Text>
            <Text style={styles.taskLocation}>
              {task.address}, {task.city}
            </Text>
          </View>
          <View style={styles.taskMeta}>
            <Text style={styles.taskDistance}>{formatDistance(distance)}</Text>
            <Text style={styles.taskBudget}>${task.task_budget}</Text>
          </View>
        </View>

        <View style={styles.taskDetails}>
          <View style={styles.taskUrgency}>
            <Ionicons
              name="flash"
              size={14}
              color={
                task.task_urgency === 'urgent'
                  ? Colors.error[500]
                  : task.task_urgency === 'high'
                  ? Colors.warning[500]
                  : Colors.neutral[500]
              }
            />
            <Text
              style={[
                styles.urgencyText,
                {
                  color:
                    task.task_urgency === 'urgent'
                      ? Colors.error[500]
                      : task.task_urgency === 'high'
                      ? Colors.warning[500]
                      : Colors.neutral[500]
                }
              ]}
            >
              {task.task_urgency.charAt(0).toUpperCase() + task.task_urgency.slice(1)}
            </Text>
          </View>

          <View style={styles.taskStatus}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    task.task_status === 'available'
                      ? Colors.success[100]
                      : task.task_status === 'in_progress'
                      ? Colors.primary[100]
                      : Colors.neutral[100]
                }
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      task.task_status === 'available'
                        ? Colors.success[600]
                        : task.task_status === 'in_progress'
                        ? Colors.primary[600]
                        : Colors.neutral[600]
                  }
                ]}
              >
                {task.task_status.charAt(0).toUpperCase() + task.task_status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.taskFooter}>
          <View style={styles.customerInfo}>
            {task.customer_avatar ? (
              <Image
                source={{ uri: task.customer_avatar }}
                style={styles.customerAvatar}
              />
            ) : (
              <View style={styles.defaultAvatar}>
                <Ionicons name="person" size={16} color={Colors.neutral[500]} />
              </View>
            )}
            <Text style={styles.customerName}>{task.customer_name}</Text>
          </View>

          <View style={styles.taskActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="heart-outline" size={16} color={Colors.neutral[500]} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-outline" size={16} color={Colors.neutral[500]} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.emptyTitle}>Finding nearby tasks...</Text>
          <Text style={styles.emptyText}>
            Searching within {selectedRadius}km of your location
          </Text>
        </View>
      )
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error[500]} />
          <Text style={styles.emptyTitle}>Unable to load tasks</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="location-outline" size={48} color={Colors.neutral[300]} />
        <Text style={styles.emptyTitle}>No nearby tasks found</Text>
        <Text style={styles.emptyText}>
          No tasks found within {selectedRadius}km of your location. Try increasing the search radius.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRefresh}
        >
          <Text style={styles.retryButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {renderLocationHeader()}
      {renderLocationControls()}

      <ScrollView
        style={styles.tasksContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {nearbyTasks.length > 0 ? (
          <>
            <View style={styles.tasksHeader}>
              <Text style={styles.tasksTitle}>
                Nearby Tasks ({nearbyTasks.length})
              </Text>
              <Text style={styles.tasksSubtitle}>
                Within {selectedRadius}km of your location
              </Text>
            </View>
            {nearbyTasks.map(renderTask)}
          </>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </View>
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
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    marginLeft: 8,
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  locationAddress: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginTop: 2,
  },
  locationButton: {
    padding: 8,
  },
  permissionPrompt: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginTop: 16,
  },
  permissionText: {
    fontSize: 14,
    color: Colors.neutral[600],
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  radiusSelector: {
    marginBottom: 16,
  },
  radiusLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.neutral[900],
    marginBottom: 12,
  },
  radiusOptions: {
    gap: 8,
  },
  radiusOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    backgroundColor: '#fff',
  },
  radiusOptionActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  radiusOptionText: {
    fontSize: 14,
    color: Colors.neutral[600],
    fontWeight: '500',
  },
  radiusOptionTextActive: {
    color: '#fff',
  },
  trackingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary[500],
    backgroundColor: '#fff',
    gap: 6,
  },
  trackingButtonActive: {
    backgroundColor: Colors.error[50],
    borderColor: Colors.error[500],
  },
  trackingButtonText: {
    fontSize: 14,
    color: Colors.primary[500],
    fontWeight: '500',
  },
  trackingButtonTextActive: {
    color: Colors.error[500],
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
  },
  tasksContainer: {
    flex: 1,
  },
  tasksHeader: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  tasksTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  tasksSubtitle: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginTop: 4,
  },
  taskCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
  taskLocation: {
    fontSize: 14,
    color: Colors.neutral[600],
  },
  taskMeta: {
    alignItems: 'flex-end',
  },
  taskDistance: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary[600],
    marginBottom: 4,
  },
  taskBudget: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  taskDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskUrgency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  taskStatus: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  defaultAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 14,
    color: Colors.neutral[600],
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.neutral[600],
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
