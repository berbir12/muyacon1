import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Colors from '../constants/Colors'

interface PrivacySection {
  id: string
  title: string
  content: string
}

const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: '1',
    title: '1. Information We Collect',
    content: 'We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This includes your name, email address, phone number, profile information, and payment information.'
  },
  {
    id: '2',
    title: '2. How We Use Your Information',
    content: 'We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, communicate with you about products and services, and personalize your experience.'
  },
  {
    id: '3',
    title: '3. Information Sharing',
    content: 'We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share your information with service providers who assist us in operating our platform.'
  },
  {
    id: '4',
    title: '4. Data Security',
    content: 'We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.'
  },
  {
    id: '5',
    title: '5. Location Information',
    content: 'We may collect and use location information to provide location-based services, such as matching you with nearby taskers or customers. You can control location sharing through your device settings.'
  },
  {
    id: '6',
    title: '6. Cookies and Tracking',
    content: 'We use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, and personalize content. You can control cookie preferences through your browser settings.'
  },
  {
    id: '7',
    title: '7. Third-Party Services',
    content: 'Our service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies.'
  },
  {
    id: '8',
    title: '8. Data Retention',
    content: 'We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy, unless a longer retention period is required by law.'
  },
  {
    id: '9',
    title: '9. Your Rights',
    content: 'You have the right to access, update, or delete your personal information. You can also opt out of certain communications from us. Contact us to exercise these rights.'
  },
  {
    id: '10',
    title: '10. Children\'s Privacy',
    content: 'Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will take steps to delete the information.'
  },
  {
    id: '11',
    title: '11. International Transfers',
    content: 'Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with this policy.'
  },
  {
    id: '12',
    title: '12. Changes to This Policy',
    content: 'We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.'
  },
  {
    id: '13',
    title: '13. Contact Us',
    content: 'If you have any questions about this privacy policy or our privacy practices, please contact us at privacy@muyacon.com or call +251 911 234 567.'
  }
]

export default function PrivacyPolicy() {
  const router = useRouter()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId)
  }

  const handleDownloadData = () => {
    Alert.alert(
      'Download Your Data',
      'You can request a copy of your personal data by contacting us at privacy@muyacon.com. We will provide your data within 30 days of your request.',
      [{ text: 'OK' }]
    )
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'To delete your account and all associated data, please contact our support team at support@muyacon.com. This action cannot be undone.',
      [{ text: 'OK' }]
    )
  }

  const handleUpdatePreferences = () => {
    Alert.alert(
      'Update Preferences',
      'You can update your privacy preferences in the Settings > Privacy & Security section of the app.',
      [{ text: 'OK' }]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <TouchableOpacity onPress={handleUpdatePreferences} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={20} color={Colors.primary[500]} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Introduction */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Muyacon Privacy Policy</Text>
          <Text style={styles.introSubtitle}>
            Last updated: January 15, 2024
          </Text>
          <Text style={styles.introText}>
            At Muyacon, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Your Privacy Rights</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={handleDownloadData}>
              <Ionicons name="download-outline" size={24} color={Colors.primary[500]} />
              <Text style={styles.actionTitle}>Download Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={24} color={Colors.error[500]} />
              <Text style={styles.actionTitle}>Delete Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={handleUpdatePreferences}>
              <Ionicons name="shield-outline" size={24} color={Colors.success[500]} />
              <Text style={styles.actionTitle}>Update Preferences</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => Alert.alert('Contact Us', 'Email us at privacy@muyacon.com')}>
              <Ionicons name="mail-outline" size={24} color={Colors.info[500]} />
              <Text style={styles.actionTitle}>Contact Us</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy Sections */}
        <View style={styles.privacySection}>
          <Text style={styles.sectionTitle}>Privacy Policy Details</Text>
          {PRIVACY_SECTIONS.map((section) => (
            <View key={section.id} style={styles.privacyItem}>
              <TouchableOpacity
                style={styles.privacyHeader}
                onPress={() => toggleSection(section.id)}
              >
                <Text style={styles.privacyTitle}>{section.title}</Text>
                <Ionicons 
                  name={expandedSection === section.id ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={Colors.neutral[600]} 
                />
              </TouchableOpacity>
              
              {expandedSection === section.id && (
                <View style={styles.privacyContent}>
                  <Text style={styles.privacyText}>{section.content}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Data Types */}
        <View style={styles.dataTypesSection}>
          <Text style={styles.sectionTitle}>Types of Data We Collect</Text>
          <View style={styles.dataTypesGrid}>
            <View style={styles.dataTypeCard}>
              <Ionicons name="person-outline" size={24} color={Colors.primary[500]} />
              <Text style={styles.dataTypeTitle}>Personal Info</Text>
              <Text style={styles.dataTypeDesc}>Name, email, phone</Text>
            </View>
            <View style={styles.dataTypeCard}>
              <Ionicons name="location-outline" size={24} color={Colors.success[500]} />
              <Text style={styles.dataTypeTitle}>Location</Text>
              <Text style={styles.dataTypeDesc}>GPS coordinates</Text>
            </View>
            <View style={styles.dataTypeCard}>
              <Ionicons name="card-outline" size={24} color={Colors.warning[500]} />
              <Text style={styles.dataTypeTitle}>Payment</Text>
              <Text style={styles.dataTypeDesc}>Billing information</Text>
            </View>
            <View style={styles.dataTypeCard}>
              <Ionicons name="analytics-outline" size={24} color={Colors.info[500]} />
              <Text style={styles.dataTypeTitle}>Usage</Text>
              <Text style={styles.dataTypeDesc}>App interactions</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using Muyacon, you acknowledge that you have read and understood this Privacy Policy and agree to the collection and use of your information as described.
          </Text>
          <Text style={styles.footerContact}>
            Questions about privacy? Contact us at privacy@muyacon.com
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  introSection: {
    padding: 20,
    backgroundColor: Colors.primary[50],
    margin: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary[500],
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: 16,
  },
  introText: {
    fontSize: 16,
    color: Colors.neutral[700],
    lineHeight: 24,
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.neutral[700],
    marginTop: 8,
    textAlign: 'center',
  },
  privacySection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  privacyItem: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    overflow: 'hidden',
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  privacyTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginRight: 12,
  },
  privacyContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },
  privacyText: {
    fontSize: 14,
    color: Colors.neutral[700],
    lineHeight: 20,
    marginTop: 12,
  },
  dataTypesSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  dataTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dataTypeCard: {
    width: '48%',
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  dataTypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginTop: 8,
    marginBottom: 4,
  },
  dataTypeDesc: {
    fontSize: 12,
    color: Colors.neutral[600],
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    backgroundColor: Colors.neutral[50],
    margin: 20,
    borderRadius: 12,
  },
  footerText: {
    fontSize: 14,
    color: Colors.neutral[700],
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  footerContact: {
    fontSize: 14,
    color: Colors.primary[600],
    textAlign: 'center',
    fontWeight: '500',
  },
})
