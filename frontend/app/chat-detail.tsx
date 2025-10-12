import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth } from '../contexts/AuthContext'
import { ChatService, Chat } from '../services/ChatService'
import { BookingService } from '../services/BookingService'
import { SimpleNotificationService } from '../services/SimpleNotificationService'
import { supabase } from '../lib/supabase'
import Colors from '../constants/Colors'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

interface Message {
  id: string
  message: string
  sender_id: string
  created_at: string
  sender_name?: string
  is_read?: boolean
  message_type?: string
  status?: 'sending' | 'sent' | 'delivered' | 'read'
}

// Using Chat interface from ChatService

export default function ChatDetail() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const { chatId, taskId, taskTitle, otherUserName } = useLocalSearchParams<{ 
    chatId: string; 
    taskId: string; 
    taskTitle: string; 
    otherUserName: string;
  }>()
  
  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [booking, setBooking] = useState<any>(null)
  const [participantName, setParticipantName] = useState<string>(otherUserName || 'Unknown')
  const [isTyping, setIsTyping] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [lastSeen, setLastSeen] = useState<string>('')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [otherUserOnline, setOtherUserOnline] = useState(false)
  
  const scrollViewRef = useRef<ScrollView>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth')
    }
  }, [isAuthenticated, isLoading])

  useEffect(() => {
    if (chatId && user?.id) {
      loadChatData()
    }
  }, [chatId, user?.id])

  useEffect(() => {
    if (otherUserName && otherUserName !== 'Unknown') {
      setParticipantName(otherUserName)
    }
  }, [otherUserName])

  // Real-time chat subscription
  useEffect(() => {
    if (chatId && user?.id && !isSubscribed) {
      subscribeToRealtimeChat()
    }

    return () => {
      if (chatId) {
        ChatService.unsubscribeFromChat(chatId)
      }
    }
  }, [chatId, user?.id, isSubscribed])

  const subscribeToRealtimeChat = async () => {
    if (!chatId) return

    try {
      await ChatService.subscribeToChat(chatId, {
        onMessage: (message) => {
          console.log('Real-time message received:', message)
          setMessages(prev => [...prev, {
            id: message.id,
            message: message.message,
            sender_id: message.sender_id,
            created_at: message.created_at,
            sender_name: message.sender_name,
            is_read: false,
            message_type: message.message_type || 'text',
            status: 'delivered'
          }])
          
          // Scroll to bottom
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }, 100)
        },
        onTyping: (userId, typing) => {
          if (userId !== user?.id) {
            setOtherUserTyping(typing)
          }
        },
        onUserOnline: (userId, online) => {
          if (userId !== user?.id) {
            setOtherUserOnline(online)
          }
        }
      })
      setIsSubscribed(true)
    } catch (error) {
      console.error('Error subscribing to real-time chat:', error)
    }
  }

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

  const loadParticipantName = async (chatData: Chat) => {
    if (!user?.id || !chatData) return

    console.log('Loading participant name for chat:', chatData)
    console.log('User ID:', user.id, 'Customer ID:', chatData.customer_id, 'Tasker ID:', chatData.tasker_id)

    try {
      // Use the names from chatData if available
      if (chatData.customer_name && chatData.tasker_name) {
        const otherName = user.id === chatData.customer_id ? chatData.tasker_name : chatData.customer_name
        console.log('Using chatData names - otherName:', otherName)
        if (otherName && otherName !== 'Unknown') {
          setParticipantName(otherName)
          return
        }
      }

      // Fallback: Determine the other participant's ID and fetch name
      const otherParticipantId = user.id === chatData.customer_id ? chatData.tasker_id : chatData.customer_id
      
      if (otherParticipantId) {
        // Fetch the participant's name from profiles
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', otherParticipantId)
          .single()

        if (!error && profile?.full_name) {
          setParticipantName(profile.full_name)
        } else {
          // Fallback based on user mode
          setParticipantName(user.currentMode === 'customer' ? 'Tasker' : 'Customer')
        }
      } else {
        // Final fallback
        setParticipantName(user.currentMode === 'customer' ? 'Tasker' : 'Customer')
      }
    } catch (error) {
      console.error('Error loading participant name:', error)
      setParticipantName(user.currentMode === 'customer' ? 'Tasker' : 'Customer')
    }
  }

  const loadChatData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      let chatData = null
      
      if (chatId) {
        // Load chat details by chatId (which is actually taskId)
        chatData = await ChatService.getChatById(chatId)
        if (!chatData) throw new Error('Chat not found')
      } else if (taskId) {
        // Create or get chat by taskId
        chatData = await ChatService.getOrCreateChat(taskId, user.id, 'temp-tasker-id')
        if (!chatData) throw new Error('Failed to create chat')
      } else {
        throw new Error('No chat or task ID provided')
      }
      
      setChat(chatData)
      console.log('Chat data loaded:', chatData)

      // Load participant name
      await loadParticipantName(chatData)

      // Load messages
      const messagesData = chatId
        ? await ChatService.getChatMessagesByChatId(chatId)
        : await ChatService.getChatMessages(taskId)
      setMessages(messagesData)

      // Mark all messages as read when opening the chat
      if (taskId) {
        await SimpleNotificationService.markAllMessagesAsRead(taskId)
      }

    } catch (error) {
      console.error('Error loading chat data:', error)
      Alert.alert('Error', 'Failed to load chat')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id || sending) return

    const messageText = newMessage.trim()
    setNewMessage('')

    // Add message optimistically to UI
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      message: messageText,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      sender_name: user.name || 'You',
      status: 'sending'
    }
    
    setMessages(prev => [...prev, tempMessage])
    scrollToBottom()

    try {
      setSending(true)
      
      let success = false
      
      if (chatId) {
        success = await ChatService.sendMessage(chatId, messageText, 'text')
      } else if (taskId) {
        success = await ChatService.sendMessageToChat(taskId, messageText, user.id)
      }
      
      if (success) {
        // Update message status to sent
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, id: `real_${Date.now()}`, status: 'sent' as const }
            : msg
        ))
        
      // Reload messages to get the real message with proper ID
      setTimeout(async () => {
        const messagesData = chatId
          ? await ChatService.getChatMessagesByChatId(chatId)
          : await ChatService.getChatMessages(taskId)
        setMessages(messagesData)
        
        // Mark the new message as read
        if (taskId && messagesData.length > 0) {
          const latestMessage = messagesData[messagesData.length - 1]
          await SimpleNotificationService.markMessageAsRead(taskId, latestMessage.id)
        }
      }, 500)
      } else {
        // Remove failed message
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
        Alert.alert('Error', 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove failed message
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
      Alert.alert('Error', 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleTyping = (text: string) => {
    setNewMessage(text)
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set typing indicator
    setIsTyping(true)
    
    // Send typing indicator to other user
    if (chatId) {
      ChatService.sendTypingIndicator(chatId, true)
    }
    
    // Clear typing indicator after 2 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      if (chatId) {
        ChatService.sendTypingIndicator(chatId, false)
      }
    }, 2000)
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  const isMyMessage = (message: Message) => {
    return message.sender_id === user?.id
  }

  const getOtherParticipantName = () => {
    // Use the fetched participant name
    return participantName
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />
      
      {/* Modern Header */}
      <View style={styles.modernHeader}>
            <TouchableOpacity onPress={() => router.push('/chats')} style={styles.headerBackButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
        
        <View style={styles.headerUserInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {getOtherParticipantName().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>{getOtherParticipantName()}</Text>
            <Text style={styles.headerStatus}>
              {isOnline ? 'Online' : lastSeen || 'Last seen recently'}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages Area */}
      <KeyboardAvoidingView 
        style={styles.messagesArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesScrollView}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="chatbubbles-outline" size={64} color={Colors.neutral[300]} />
              </View>
              <Text style={styles.emptyStateTitle}>Start a conversation</Text>
              <Text style={styles.emptyStateSubtitle}>
                Send a message to {getOtherParticipantName()} to begin chatting
              </Text>
            </View>
          ) : (
            messages.map((message, index) => {
              const showDate = index === 0 || 
                formatDate(message.created_at) !== formatDate(messages[index - 1].created_at)
              const isMyMsg = isMyMessage(message)
              const showAvatar = !isMyMsg && (
                index === messages.length - 1 || 
                isMyMessage(messages[index + 1])
              )
              
              return (
                <View key={message.id}>
                  {showDate && (
                    <View style={styles.dateSeparator}>
                      <Text style={styles.dateSeparatorText}>{formatDate(message.created_at)}</Text>
                    </View>
                  )}
                  
                  <View style={[
                    styles.messageRow,
                    isMyMsg ? styles.myMessageRow : styles.otherMessageRow
                  ]}>
                    {showAvatar && (
                      <View style={styles.messageAvatar}>
                        <Text style={styles.messageAvatarText}>
                          {getOtherParticipantName().charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    
                    <View style={[
                      styles.messageBubble,
                      isMyMsg ? styles.myMessageBubble : styles.otherMessageBubble
                    ]}>
                      <Text style={[
                        styles.messageText,
                        isMyMsg ? styles.myMessageText : styles.otherMessageText
                      ]}>
                        {message.message}
                      </Text>
                      
                      <View style={styles.messageFooter}>
                        <Text style={[
                          styles.messageTime,
                          isMyMsg ? styles.myMessageTime : styles.otherMessageTime
                        ]}>
                          {formatTime(message.created_at)}
                        </Text>
                        
                        {isMyMsg && (
                          <View style={styles.messageStatus}>
                            {message.status === 'sending' && (
                              <ActivityIndicator size="small" color={Colors.neutral[400]} />
                            )}
                            {message.status === 'sent' && (
                              <Ionicons name="checkmark" size={16} color={Colors.neutral[400]} />
                            )}
                            {message.status === 'delivered' && (
                              <Ionicons name="checkmark-done" size={16} color={Colors.neutral[400]} />
                            )}
                            {message.status === 'read' && (
                              <Ionicons name="checkmark-done" size={16} color={Colors.primary[500]} />
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              )
            })
          )}
          
          {/* Typing Indicators */}
          {isTyping && (
            <View style={styles.typingIndicator}>
              <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                  <View style={[styles.typingDot, styles.typingDot1]} />
                  <View style={[styles.typingDot, styles.typingDot2]} />
                  <View style={[styles.typingDot, styles.typingDot3]} />
                </View>
              </View>
            </View>
          )}
          
          {otherUserTyping && (
            <View style={[styles.typingIndicator, styles.otherTypingIndicator]}>
              <View style={styles.otherTypingBubble}>
                <Text style={styles.typingText}>{participantName} is typing...</Text>
                <View style={styles.typingDots}>
                  <View style={[styles.typingDot, styles.typingDot1]} />
                  <View style={[styles.typingDot, styles.typingDot2]} />
                  <View style={[styles.typingDot, styles.typingDot3]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Modern Input Area */}
        <View style={styles.inputArea}>
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.inputActionButton}>
              <Ionicons name="add" size={24} color={Colors.primary[500]} />
            </TouchableOpacity>
            
            <View style={styles.messageInputContainer}>
              <TextInput
                style={styles.messageInput}
                value={newMessage}
                onChangeText={handleTyping}
                placeholder="Message"
                placeholderTextColor={Colors.neutral[400]}
                multiline
                maxLength={1000}
                textAlignVertical="center"
              />
              
              {newMessage.length > 0 && (
                <TouchableOpacity style={styles.emojiButton}>
                  <Ionicons name="happy-outline" size={24} color={Colors.neutral[500]} />
                </TouchableOpacity>
              )}
            </View>
            
            {newMessage.trim() ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={sendMessage}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.voiceButton}>
                <Ionicons name="mic" size={24} color={Colors.primary[500]} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.neutral[600],
  },
  
  // Modern Header Styles
  modernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: Colors.primary[600],
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerBackButton: {
    padding: 8,
    marginRight: 8,
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerStatus: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  
  // Messages Area Styles
  messagesArea: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  messagesScrollView: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 20,
  },
  
  // Empty State Styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Date Separator Styles
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: Colors.neutral[500],
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  // Message Row Styles
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  
  // Message Avatar Styles
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  messageAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Message Bubble Styles
  messageBubble: {
    maxWidth: screenWidth * 0.75,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  myMessageBubble: {
    backgroundColor: Colors.primary[500],
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  
  // Message Text Styles
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: Colors.neutral[900],
  },
  
  // Message Footer Styles
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    marginRight: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: Colors.neutral[500],
  },
  messageStatus: {
    marginLeft: 4,
  },
  
  // Typing Indicator Styles
  typingIndicator: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  typingBubble: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.neutral[400],
    marginHorizontal: 2,
  },
  typingDot1: {
    animationDelay: '0s',
  },
  typingDot2: {
    animationDelay: '0.2s',
  },
  typingDot3: {
    animationDelay: '0.4s',
  },
  otherTypingIndicator: {
    justifyContent: 'flex-start',
  },
  otherTypingBubble: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: screenWidth * 0.7,
  },
  typingText: {
    fontSize: 12,
    color: Colors.neutral[600],
    marginRight: 8,
    fontStyle: 'italic',
  },
  
  // Input Area Styles
  inputArea: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 48,
  },
  inputActionButton: {
    padding: 8,
    marginRight: 4,
  },
  messageInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 4,
    minHeight: 40,
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.neutral[900],
    maxHeight: 100,
    textAlignVertical: 'center',
  },
  emojiButton: {
    padding: 4,
    marginLeft: 8,
  },
  sendButton: {
    backgroundColor: Colors.primary[500],
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButton: {
    padding: 8,
  },
})