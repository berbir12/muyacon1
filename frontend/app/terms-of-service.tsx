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

interface TermsSection {
  id: string
  title: string
  content: string
}

const TERMS_SECTIONS: TermsSection[] = [
  {
    id: '1',
    title: '1. Acceptance of Terms',
    content: 'By accessing and using the Muyacon mobile application ("App"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.'
  },
  {
    id: '2',
    title: '2. Description of Service',
    content: 'Muyacon is a platform that connects customers with taskers for various services including but not limited to cleaning, maintenance, delivery, and other household tasks. We facilitate the connection between service providers and customers but are not directly involved in the actual service delivery.'
  },
  {
    id: '3',
    title: '3. User Accounts',
    content: 'To use our service, you must create an account. You are responsible for maintaining the confidentiality of your account information and password. You agree to accept responsibility for all activities that occur under your account.'
  },
  {
    id: '4',
    title: '4. User Responsibilities',
    content: 'Users must provide accurate and complete information. You are responsible for your own safety and the safety of others when using our services. Any illegal activities or violation of these terms will result in immediate account termination.'
  },
  {
    id: '5',
    title: '5. Payment Terms',
    content: 'Payment for services is processed through our secure payment system. All payments are final unless there is a valid dispute. Refunds are subject to our refund policy and may take 5-10 business days to process.'
  },
  {
    id: '6',
    title: '6. Service Provider Responsibilities',
    content: 'Taskers must provide services in a professional manner, arrive on time, and complete tasks as described. They must have the necessary skills and equipment to perform the requested services safely and effectively.'
  },
  {
    id: '7',
    title: '7. Customer Responsibilities',
    content: 'Customers must provide accurate task descriptions, be available during scheduled times, and provide a safe working environment. Payment must be made promptly upon service completion.'
  },
  {
    id: '8',
    title: '8. Cancellation Policy',
    content: 'Cancellations made more than 24 hours in advance are free. Cancellations made within 24 hours may incur a fee. Same-day cancellations may result in full charge. Emergency cancellations will be reviewed on a case-by-case basis.'
  },
  {
    id: '9',
    title: '9. Dispute Resolution',
    content: 'Any disputes between users should first be reported to our support team. We will attempt to mediate disputes fairly. If mediation fails, disputes may be resolved through binding arbitration.'
  },
  {
    id: '10',
    title: '10. Limitation of Liability',
    content: 'Muyacon shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses resulting from your use of the service.'
  },
  {
    id: '11',
    title: '11. Privacy Policy',
    content: 'Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service, to understand our practices. We collect and use your information as described in our Privacy Policy.'
  },
  {
    id: '12',
    title: '12. Prohibited Uses',
    content: 'You may not use our service for any unlawful purpose or to solicit others to perform unlawful acts. You may not violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances.'
  },
  {
    id: '13',
    title: '13. Intellectual Property',
    content: 'The service and its original content, features, and functionality are and will remain the exclusive property of Muyacon and its licensors. The service is protected by copyright, trademark, and other laws.'
  },
  {
    id: '14',
    title: '14. Termination',
    content: 'We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the service will cease immediately.'
  },
  {
    id: '15',
    title: '15. Changes to Terms',
    content: 'We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.'
  },
  {
    id: '16',
    title: '16. Contact Information',
    content: 'If you have any questions about these Terms of Service, please contact us at support@muyacon.com or call +251 911 234 567.'
  }
]

export default function TermsOfService() {
  const router = useRouter()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId)
  }

  const handleAcceptTerms = () => {
    Alert.alert(
      'Terms Accepted',
      'Thank you for accepting our Terms of Service. You can view these terms anytime in the Settings.',
      [{ text: 'OK' }]
    )
  }

  const handlePrintTerms = () => {
    Alert.alert(
      'Print Terms',
      'Print functionality will be available in a future update. For now, you can take a screenshot or copy the text.',
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <TouchableOpacity onPress={handlePrintTerms} style={styles.printButton}>
          <Ionicons name="print-outline" size={20} color={Colors.primary[500]} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Introduction */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Muyacon Terms of Service</Text>
          <Text style={styles.introSubtitle}>
            Last updated: January 15, 2024
          </Text>
          <Text style={styles.introText}>
            Welcome to Muyacon! These Terms of Service ("Terms") govern your use of our mobile application and services. Please read these terms carefully before using our service.
          </Text>
        </View>

        {/* Terms Sections */}
        <View style={styles.termsSection}>
          {TERMS_SECTIONS.map((section) => (
            <View key={section.id} style={styles.termItem}>
              <TouchableOpacity
                style={styles.termHeader}
                onPress={() => toggleSection(section.id)}
              >
                <Text style={styles.termTitle}>{section.title}</Text>
                <Ionicons 
                  name={expandedSection === section.id ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={Colors.neutral[600]} 
                />
              </TouchableOpacity>
              
              {expandedSection === section.id && (
                <View style={styles.termContent}>
                  <Text style={styles.termText}>{section.content}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptTerms}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.acceptButtonText}>I Accept These Terms</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.declineButton} onPress={() => router.back()}>
            <Ionicons name="close-circle" size={20} color={Colors.error[500]} />
            <Text style={styles.declineButtonText}>I Do Not Accept</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using Muyacon, you acknowledge that you have read and understood these Terms of Service and agree to be bound by them.
          </Text>
          <Text style={styles.footerContact}>
            Questions? Contact us at support@muyacon.com
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
  printButton: {
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
  termsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  termItem: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    overflow: 'hidden',
  },
  termHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  termTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginRight: 12,
  },
  termContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },
  termText: {
    fontSize: 14,
    color: Colors.neutral[700],
    lineHeight: 20,
    marginTop: 12,
  },
  actionSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success[500],
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error[500],
  },
  declineButtonText: {
    color: Colors.error[500],
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
