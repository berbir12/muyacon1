import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useNotifications } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/SimpleAuthContext'
import Colors from '../constants/Colors'

export default function Notifications() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  } = useNotifications()


  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth')
    }
  }, [isAuthenticated, isLoading])

  const handleRefresh = async () => {
    await refreshNotifications()
  }

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId)
  }

  const handleDelete = async (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteNotification(notificationId)
        }
      ]
    )
  }

  const handleMarkAllAsRead = () => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Mark All', 
          onPress: markAllAsRead
        }
      ]
    )
  }

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: clearAllNotifications
        }
      ]
    )
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task':
        return 'briefcase-outline'
      case 'message':
        return 'chatbubble-outline'
      case 'application':
        return 'person-add-outline'
      case 'booking':
        return 'calendar-outline'
      case 'payment':
        return 'card-outline'
      case 'system':
        return 'settings-outline'
      default:
        return 'notifications-outline'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task':
        return Colors.primary[500]
      case 'message':
        return Colors.success[500]
      case 'application':
        return Colors.warning[500]
      case 'booking':
        return Colors.primary[500]
      case 'payment':
        return Colors.success[600]
      case 'system':
        return Colors.neutral[500]
      default:
        return Colors.neutral[400]
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
            <Text style={styles.unreadCount}>{unreadCount} unread</Text>
            )}
          </View>
        <View style={styles.headerActions}>
          {notifications.length > 0 && (
            <>
          {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.actionButton}>
                  <Ionicons name="checkmark-done" size={20} color={Colors.primary[500]} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleClearAll} style={styles.actionButton}>
                <Ionicons name="trash-outline" size={20} color={Colors.error[500]} />
            </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>
              You&apos;ll see notifications about tasks, messages, and updates here.
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity 
              key={notification.id} 
              style={[
                styles.notificationCard,
                !notification.is_read && styles.unreadCard
              ]}
              onPress={() => handleMarkAsRead(notification.id)}
            >
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: getNotificationColor(notification.type) + '20' }
                  ]}>
                    <Ionicons 
                      name={getNotificationIcon(notification.type)} 
                      size={20} 
                      color={getNotificationColor(notification.type)} 
                    />
                  </View>
                  <View style={styles.notificationInfo}>
                    <Text style={[
                      styles.notificationTitle,
                      !notification.is_read && styles.unreadTitle
                  ]}>
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatTime(notification.created_at)}
                  </Text>
                  </View>
                  {!notification.is_read && (
                    <View style={styles.unreadDot} />
                  )}
                </View>
                
                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>

              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(notification.id)}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.error[500]} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.neutral[900],
  },
  unreadCount: {
    fontSize: 12,
    color: Colors.primary[500],
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.neutral[600],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
    lineHeight: 20,
  },
  notificationCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    overflow: 'hidden',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  notificationContent: {
    padding: 16,
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary[500],
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.neutral[700],
    lineHeight: 20,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 4,
    backgroundColor: Colors.error[50],
  },
})
