import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '../contexts/SimpleAuthContext'
import { ChatService, Chat } from '../services/ChatService'
import Colors from '../constants/Colors'

export default function Chats() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const loadChats = async (isRefresh = false) => {
    if (!user) return
    
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    
    try {
      console.log('Chats: Loading chats for user:', user.id, user.name)
      const fetchedChats = await ChatService.getUserChats(user.id)
      console.log('Chats: Loaded chats:', fetchedChats.length, fetchedChats)
      setChats(fetchedChats)
    } catch (error) {
      console.error('Chats: Error loading chats:', error)
      Alert.alert('Error', 'Failed to load chats')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth')
    }
  }, [isAuthenticated, isLoading])

  useEffect(() => {
    loadChats()
  }, [user])

  // Refresh chats when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadChats()
    }, [user])
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

  const handleRefresh = () => {
    loadChats(true)
  }


  const handleSearch = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const searchResults = await ChatService.searchChats(user.id, searchQuery)
      setChats(searchResults)
    } catch (error) {
      console.error('Error searching chats:', error)
      Alert.alert('Error', 'Failed to search chats')
    } finally {
      setLoading(false)
    }
  }

      const filteredChats = chats.filter(chat =>
        searchQuery === '' ||
        chat.task_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.tasker_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )

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
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>
              {user ? `Chat with your ${user.currentMode === 'customer' ? 'taskers' : 'customers'}` : 'Your conversations'}
          </Text>
        </View>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={Colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Chats List */}
      <ScrollView 
        style={styles.chatsList} 
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        bounces={true}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : (
          filteredChats.map((chat) => (
            <TouchableOpacity 
              key={chat.id} 
              style={styles.chatCard}
                  onPress={() => router.push({
                    pathname: '/chat-detail',
                    params: {
                      chatId: chat.id,
                      taskId: chat.task_id,
                      taskTitle: chat.task_title || 'Task',
                      otherUserName: user?.id === chat.customer_id ? chat.tasker_name : chat.customer_name
                    }
                  })}
            >
              <View style={styles.chatAvatar}>
                <Ionicons 
                  name={user?.id === chat.customer_id ? 'briefcase' : 'person'} 
                  size={24} 
                  color={Colors.primary[500]} 
                />
              </View>
              
              <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatTitle}>
                    {user?.id === chat.customer_id ? (chat.tasker_name || 'Tasker') : (chat.customer_name || 'Customer')}
                  </Text>
                  <Text style={styles.chatTime}>{formatTime(chat.lastMessageTime || chat.updated_at)}</Text>
                </View>
                
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {chat.task_title}
                </Text>
                
                <View style={styles.chatFooter}>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {chat.last_message || 'No messages yet'}
                  </Text>
                  {chat.unread_count > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{chat.unread_count}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        
        {!loading && filteredChats.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={Colors.neutral[300]} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'Try adjusting your search terms' 
                : 'Start a conversation by applying to a task'
              }
            </Text>
      </View>
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
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.primary,
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
  chatsList: {
    flex: 1,
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
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  chatAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginLeft: 8,
  },
  taskTitle: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: 8,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: Colors.neutral[500],
  },
  unreadBadge: {
    backgroundColor: Colors.primary[500],
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
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
  },
})
