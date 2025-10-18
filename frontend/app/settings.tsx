import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../contexts/SimpleAuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Colors from '../constants/Colors'
import { SettingsService, type AppSettings } from '../services/SettingsService'

const { width } = Dimensions.get('window')

export default function Settings() {
  const { user, logout, switchMode } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const router = useRouter()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)

  useEffect(() => {
    const load = async () => {
      const s = await SettingsService.getSettings()
      setSettings(s)
      setLoadingSettings(false)
    }
    load()
  }, [])

  const updateSettings = async (updates: Partial<AppSettings>) => {
    const success = await SettingsService.updateSettings(updates)
    if (success) {
      setSettings(prev => prev ? { ...prev, ...updates } as AppSettings : prev)
    }
  }

  const togglePushNotifications = async () => {
    if (!settings) return
    const newVal = !settings.notifications.push
    const success = await SettingsService.updateNotificationSettings({ push: newVal })
    if (success) setSettings({ ...settings, notifications: { ...settings.notifications, push: newVal } })
  }

  const toggleLocation = async () => {
    if (!settings) return
    const newVal = !settings.privacy.showLocation
    const success = await SettingsService.updatePrivacySettings({ showLocation: newVal })
    if (success) setSettings({ ...settings, privacy: { ...settings.privacy, showLocation: newVal } })
  }

  const toggleDarkMode = async () => {
    if (!settings) return
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark'
    await updateSettings({ theme: newTheme })
  }

  const toggleLanguage = async () => {
    const newLang = language === 'en' ? 'am' : 'en'
    await setLanguage(newLang)
    if (settings) {
      await updateSettings({ language: newLang })
    }
  }

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout()
            router.replace('/profile')
          }
        }
      ]
    )
  }

  const handleBecomeTasker = () => {
    if (user?.role === 'tasker' || user?.role === 'both') {
      Alert.alert('Already a Tasker', 'You are already registered as a tasker!')
      return
    }
    router.push('/tasker-application')
  }

  const handleEditProfile = () => {
    router.push('/edit-profile')
  }

  const handleSwitchMode = () => {
    if (!user) return
    
    const newMode = user.currentMode === 'customer' ? 'tasker' : 'customer'
    switchMode(newMode)
  }

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          title: 'Edit Profile',
          subtitle: 'Update your personal information',
          onPress: handleEditProfile,
          showArrow: true
        },
        {
          icon: 'shield-outline',
          title: 'Privacy & Security',
          subtitle: 'Manage your privacy settings',
          onPress: () => router.push('/privacy-security'),
          showArrow: true
        },
        {
          icon: 'notifications-outline',
          title: 'Notifications',
          subtitle: 'Manage your notification preferences',
          onPress: () => router.push('/notifications'),
          showArrow: true
        },
      ]
    },
    {
      title: 'Work',
      items: [
        {
          icon: 'briefcase-outline',
          title: user?.role === 'tasker' || user?.role === 'both' ? 'Switch to Customer' : 'Become a Tasker',
          subtitle: user?.role === 'tasker' || user?.role === 'both' 
            ? 'Switch to customer mode' 
            : 'Apply to become a tasker',
          onPress: user?.role === 'tasker' || user?.role === 'both' ? handleSwitchMode : handleBecomeTasker,
          showArrow: true,
          color: user?.role === 'tasker' || user?.role === 'both' ? Colors.neutral[600] : Colors.primary[500]
        },
        {
          icon: 'time-outline',
          title: 'Work Schedule',
          subtitle: 'Manage your availability',
          onPress: () => router.push('/work-schedule'),
          showArrow: true
        },
      ]
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'notifications-outline',
          title: 'Notifications',
          subtitle: 'Enable push notifications',
          switch: true,
          value: settings?.notifications.push ?? true,
          onToggle: togglePushNotifications
        },
        {
          icon: 'location-outline',
          title: 'Location Services',
          subtitle: 'Allow location access for better matches',
          switch: true,
          value: settings?.privacy.showLocation ?? true,
          onToggle: toggleLocation
        },
        {
          icon: 'moon-outline',
          title: 'Dark Mode',
          subtitle: 'Switch between light and dark themes',
          switch: true,
          value: (settings?.theme ?? 'system') === 'dark',
          onToggle: toggleDarkMode
        },
        {
          icon: 'language-outline',
          title: 'Language',
          subtitle: language === 'am' ? 'አማርኛ' : 'English',
          switch: true,
          value: language === 'am',
          onToggle: toggleLanguage
        }
      ]
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'chatbubble-outline',
          title: 'Contact Us',
          subtitle: 'Get in touch with our team',
          onPress: () => router.push('/contact-us'),
          showArrow: true
        },
      ]
    }
  ]

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.error[500]} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* User Info */}
      <View style={styles.userSection}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={32} color={Colors.primary[500]} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userPhone}>{user?.phone}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role === 'both' ? 'Customer & Tasker' : 
               user?.role === 'tasker' ? 'Tasker' : 'Customer'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        bounces={true}
        scrollEventThrottle={16}
      >
        {!loadingSettings && settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    itemIndex === section.items.length - 1 && styles.lastItem
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.settingLeft}>
                    <View style={styles.iconContainer}>
                      <Ionicons 
                        name={item.icon as any} 
                        size={20} 
                        color={item.color || Colors.neutral[600]} 
                      />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={[styles.settingTitle, item.color && { color: item.color }]}>
                        {item.title}
                      </Text>
                      <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                    </View>
                  </View>
                  {'switch' in item && item.switch ? (
                    <Switch
                      value={Boolean(item.value)}
                      onValueChange={item.onToggle}
                      trackColor={{ false: Colors.neutral[300], true: Colors.primary[500] }}
                      thumbColor={Colors.background.primary}
                    />
                  ) : (
                    item.showArrow && (
                      <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />
                    )
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Muyacon v1.0.0</Text>
          <Text style={styles.appCopyright}>© 2024 Muyacon. All rights reserved.</Text>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.neutral[900],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.error[50],
    gap: 6,
  },
  logoutText: {
    color: Colors.error[500],
    fontSize: 14,
    fontWeight: '600',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary[100],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    color: Colors.primary[600],
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sectionContent: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.neutral[600],
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  appVersion: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: 12,
    color: Colors.neutral[400],
  },
})
