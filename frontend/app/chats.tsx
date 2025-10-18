import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '../contexts/SimpleAuthContext'
import ChatListComponent from '../components/ChatListComponent'
import ChatComponent from '../components/ChatComponent'
import Colors from '../constants/Colors'

export default function Chats() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [showChatModal, setShowChatModal] = useState(false)

  useFocusEffect(
    React.useCallback(() => {
      if (!isLoading && !isAuthenticated) {
        router.replace('/auth')
      }
    }, [isAuthenticated, isLoading])
  )

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId)
    setShowChatModal(true)
  }

  const handleCloseChat = () => {
    setSelectedChatId(null)
    setShowChatModal(false)
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
      
      <Modal
        visible={showChatModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseChat}
      >
        {selectedChatId && (
          <ChatComponent
            chatId={selectedChatId}
            onClose={handleCloseChat}
          />
        )}
      </Modal>
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