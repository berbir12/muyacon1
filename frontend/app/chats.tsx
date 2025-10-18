import React from 'react'
import {
  View,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '../contexts/SimpleAuthContext'
import ChatListComponent from '../components/ChatListComponent'
import Colors from '../constants/Colors'

export default function Chats() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useFocusEffect(
    React.useCallback(() => {
      if (!isLoading && !isAuthenticated) {
        router.replace('/auth')
      }
    }, [isAuthenticated, isLoading])
  )

  const handleChatSelect = (chatId: string) => {
    // Navigate to chat-detail page instead of showing modal
    router.push(`/chat-detail?chatId=${chatId}`)
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.neutral[300]} />
        </View>
      </SafeAreaView>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <SafeAreaView style={styles.container}>
      <ChatListComponent onChatSelect={handleChatSelect} />
    </SafeAreaView>
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
})