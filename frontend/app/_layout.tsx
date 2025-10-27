import React, { useEffect, useState } from 'react'
import { View, Text, Image } from 'react-native'
import { Tabs, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '../contexts/SimpleAuthContext'
import { LanguageProvider } from '../contexts/LanguageContext'
import { NotificationProvider, useNotifications } from '../contexts/NotificationContext'
import { ToastProvider } from '../contexts/ToastContext'
import NotificationBadge from '../components/NotificationBadge'
import Colors from '../constants/Colors'
import * as SplashScreen from 'expo-splash-screen'

function TabNavigator() {
  const { user, isAuthenticated } = useAuth()
  const { unreadCount } = useNotifications()
  const pathname = usePathname()
  
  // Determine which tabs to show based on user role
  const isTasker = user?.current_mode === 'tasker'
  
  // Define sub-pages that should hide the bottom tabs
  const subPages = [
    '/chat-detail',
    '/tasker-portfolio',
    '/settings',
    '/task-detail',
    '/post-task',
    '/apply-task',
    '/edit-profile',
    '/tasker-application',
    '/review',
    '/reviews',
    '/privacy-security',
    '/work-schedule',
    '/contact-us',
    '/terms-of-service',
    '/privacy-policy',
    '/payment-success',
    '/wallet',
    '/help',
    '/notifications',
    '/task-applications'
  ]
  
  // Check if current page should hide tabs
  const shouldHideTabs = subPages.some(page => pathname.startsWith(page))
  
  // Debug logging
  console.log('TabNavigator render - isTasker:', isTasker, 'current_mode:', user?.current_mode, 'pathname:', pathname, 'shouldHideTabs:', shouldHideTabs)
  
  return (
    <Tabs
      key={user?.current_mode} // Force re-render when mode changes
      screenOptions={{
        tabBarActiveTintColor: Colors.primary[500],
        tabBarInactiveTintColor: Colors.neutral[400],
        tabBarStyle: isAuthenticated && !shouldHideTabs ? {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: Colors.neutral[200],
          paddingBottom: 0, // Remove padding, let SafeAreaView handle it
          paddingTop: 4,
          height: 70,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        } : { display: 'none' }, // Hide tabs during authentication or on sub-pages
        headerShown: false,
      }}
    >
      {/* Auth Tab - Hidden from tabs, only accessible when not authenticated */}
      <Tabs.Screen
        name="auth"
        options={{
          title: 'Auth',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="log-in" size={size} color={color} />
          ),
          href: null, // Hide from tab bar
        }}
      />
      
      {/* Home Tab - Always visible */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      
      {/* Jobs Tab - Always visible */}
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
        }}
      />
      
      {/* Bookings Tab - Only for Taskers */}
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
          href: isTasker ? undefined : null, // Hide for customers
        }}
      />
      
      {/* Chat Tab - Always visible */}
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      
      {/* Applications Tab - Hidden, accessible from task details */}
      <Tabs.Screen
        name="task-applications"
        options={{
          title: 'Applications',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
          href: null, // Hide from tab bar
        }}
      />
      
      {/* Hidden Tabs - Not visible in tab bar, accessible via navigation */}
      <Tabs.Screen
        name="notifications"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      
      {/* Profile Tab - Always visible */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      
      {/* Hidden Tabs - Not visible in tab bar, accessible via navigation */}
      <Tabs.Screen
        name="post-task"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      <Tabs.Screen
        name="tasker-application"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      <Tabs.Screen
        name="chat-detail"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      <Tabs.Screen
        name="task-detail"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      <Tabs.Screen
        name="apply-task"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      <Tabs.Screen
        name="review"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      <Tabs.Screen
        name="reviews"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      
      {/* New Settings Screens */}
      <Tabs.Screen
        name="privacy-security"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      
      <Tabs.Screen
        name="work-schedule"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      
      <Tabs.Screen
        name="contact-us"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      <Tabs.Screen
        name="terms-of-service"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      <Tabs.Screen
        name="privacy-policy"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      <Tabs.Screen
        name="payment-success"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      <Tabs.Screen
        name="wallet"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      <Tabs.Screen
        name="help"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      <Tabs.Screen
        name="tasker-portfolio"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
    </Tabs>
  )
}

function AppContent() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <TabNavigator />
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}