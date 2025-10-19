import React, { useEffect } from 'react'
import { View, Text } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
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
  
  // Determine which tabs to show based on user role
  const isTasker = user?.currentMode === 'tasker'
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary[500],
        tabBarInactiveTintColor: Colors.neutral[400],
        tabBarStyle: isAuthenticated ? {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: Colors.neutral[200],
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
        } : { display: 'none' }, // Hide tabs during authentication
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
      
    </Tabs>
  )
}

function AppContent() {
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Hide the splash screen when auth loading is complete
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    // Show a simple loading indicator while splash screen is visible
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 18, color: '#333', marginBottom: 10 }}>Loading App...</Text>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20 }}>
          Please wait while we initialize the application
        </Text>
      </View>
    );
  }

  return <TabNavigator />;
}

export default function RootLayout() {
  useEffect(() => {
    async function prepare() {
      try {
        // Keep the splash screen visible while we fetch resources
        await SplashScreen.preventAutoHideAsync();
      } catch (e) {
        console.warn(e);
      }
    }

    prepare();
  }, []);

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