import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Colors from '../constants/Colors'

const faqCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'play-circle-outline',
    color: Colors.primary[500]
  },
  {
    id: 'account',
    title: 'Account & Profile',
    icon: 'person-outline',
    color: Colors.success[500]
  },
  {
    id: 'payments',
    title: 'Payments & Wallet',
    icon: 'card-outline',
    color: Colors.warning[500]
  },
  {
    id: 'tasks',
    title: 'Tasks & Bookings',
    icon: 'list-outline',
    color: Colors.primary[500]
  },
  {
    id: 'safety',
    title: 'Safety & Security',
    icon: 'shield-outline',
    color: Colors.error[500]
  },
  {
    id: 'technical',
    title: 'Technical Support',
    icon: 'settings-outline',
    color: Colors.neutral[600]
  }
]

const faqData = {
  'getting-started': [
    {
      question: 'How do I create an account?',
      answer: 'Download the Muyacon app and tap "Sign Up". Enter your phone number, verify it with the SMS code, then complete your profile with your name and basic information.'
    },
    {
      question: 'What can I do on Muyacon?',
      answer: 'Muyacon is a marketplace where you can either post tasks you need done (as a customer) or offer your services to complete tasks (as a tasker). You can browse services, chat with users, make secure payments, and build your reputation.'
    },
    {
      question: 'Is Muyacon free to use?',
      answer: 'Yes, downloading and using Muyacon is completely free. We only charge a small service fee when tasks are completed successfully.'
    },
    {
      question: 'How do I switch between customer and tasker mode?',
      answer: 'Go to your profile settings and tap "Switch Mode". You can be both a customer and tasker, but you can only be in one mode at a time.'
    }
  ],
  'account': [
    {
      question: 'How do I verify my profile?',
      answer: 'Go to Profile > Verification and upload your ID document. Verified profiles get more trust from other users and appear higher in search results.'
    },
    {
      question: 'Can I change my phone number?',
      answer: 'Yes, go to Profile > Settings > Account Info and tap "Change Phone Number". You\'ll need to verify the new number with an SMS code.'
    },
    {
      question: 'How do I update my profile information?',
      answer: 'Go to Profile > Edit Profile to update your name, bio, skills, location, and profile photo.'
    },
    {
      question: 'What if I forget my password?',
      answer: 'Muyacon uses phone number verification, so you don\'t need a password. Just enter your phone number and we\'ll send you a verification code.'
    }
  ],
  'payments': [
    {
      question: 'How do I add a payment method?',
      answer: 'Go to Wallet > Payment Methods and tap "Add Payment Method". You can add bank accounts, mobile money, or set up cash pickup locations.'
    },
    {
      question: 'Is my payment information secure?',
      answer: 'Yes, all payments are processed securely through Chapa, a trusted payment processor. We never store your full payment details on our servers.'
    },
    {
      question: 'How do I withdraw my earnings?',
      answer: 'Go to Wallet > Withdraw and select your preferred withdrawal method. You can withdraw to your bank account, mobile money, or pick up cash at our office.'
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'We accept bank transfers, mobile money (Telebirr, M-Pesa), and cash pickup. All major Ethiopian banks are supported.'
    },
    {
      question: 'When will I receive my payment?',
      answer: 'For taskers, payments are released 24 hours after task completion. For customers, payments are held securely until the task is completed to your satisfaction.'
    }
  ],
  'tasks': [
    {
      question: 'How do I post a task?',
      answer: 'Tap the "+" button on the home screen, select "Post Task", fill in the task details including description, location, budget, and timeline, then publish your task.'
    },
    {
      question: 'How do I find taskers?',
      answer: 'Browse the "Find Taskers" section, use filters to narrow down by skills, location, and price range, then review profiles and ratings before making a choice.'
    },
    {
      question: 'How do I apply for tasks?',
      answer: 'Browse available tasks, tap on one you\'re interested in, read the details, and tap "Apply". Write a brief message explaining why you\'re the right person for the job.'
    },
    {
      question: 'Can I cancel a task?',
      answer: 'Yes, you can cancel tasks before they start. If you cancel after the tasker has started, cancellation fees may apply. Check our cancellation policy for details.'
    },
    {
      question: 'How do I rate and review?',
      answer: 'After a task is completed, you\'ll receive a notification to rate and review. Tap on the notification or go to the completed task to leave your feedback.'
    }
  ],
  'safety': [
    {
      question: 'How do I report inappropriate behavior?',
      answer: 'Tap the three dots menu on any profile or task, select "Report", choose the reason, and provide details. We take all reports seriously and investigate promptly.'
    },
    {
      question: 'What if I have a safety concern?',
      answer: 'If you feel unsafe at any time, contact our support team immediately. We have a 24/7 safety hotline and can help resolve issues quickly.'
    },
    {
      question: 'How do I verify a tasker is legitimate?',
      answer: 'Look for verified badges, check their ratings and reviews, and communicate through the app before meeting. Never share personal contact information before confirming the booking.'
    },
    {
      question: 'What if a tasker doesn\'t show up?',
      answer: 'Contact our support team immediately. We\'ll help you find a replacement tasker or process a full refund if needed.'
    }
  ],
  'technical': [
    {
      question: 'The app is not working properly. What should I do?',
      answer: 'Try closing and reopening the app, check your internet connection, and make sure you have the latest version. If problems persist, contact our technical support.'
    },
    {
      question: 'I\'m not receiving notifications. How do I fix this?',
      answer: 'Go to your phone settings > Apps > Muyacon > Notifications and make sure notifications are enabled. Also check that you\'ve allowed notifications in the app.'
    },
    {
      question: 'How do I update the app?',
      answer: 'Go to your app store (Google Play or App Store), search for Muyacon, and tap "Update" if an update is available.'
    },
    {
      question: 'The app is using too much data. How can I reduce it?',
      answer: 'Go to Settings > Data Usage and enable "Data Saver" mode. This will reduce image quality and limit background data usage.'
    }
  ]
}

export default function HelpScreen() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@muyacon.com?subject=Help Request')
  }

  const handleCallSupport = () => {
    Linking.openURL('tel:+251911234567')
  }

  const filteredFAQs = selectedCategory 
    ? faqData[selectedCategory as keyof typeof faqData] 
    : Object.values(faqData).flat()

  const searchResults = searchQuery 
    ? filteredFAQs.filter(faq => 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredFAQs

  const toggleFAQ = (index: number) => {
    const faqKey = `${selectedCategory || 'all'}-${index}`
    setExpandedFAQ(expandedFAQ === faqKey ? null : faqKey)
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.neutral[500]} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search help topics..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.neutral[500]}
            />
          </View>
        </View>

        {/* Categories */}
        {!searchQuery && (
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Browse by Category</Text>
            <View style={styles.categoriesGrid}>
              {faqCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    selectedCategory === category.id && styles.categoryCardSelected
                  ]}
                  onPress={() => setSelectedCategory(
                    selectedCategory === category.id ? null : category.id
                  )}
                >
                  <View style={[
                    styles.categoryIcon,
                    { backgroundColor: selectedCategory === category.id ? category.color : Colors.neutral[100] }
                  ]}>
                    <Ionicons
                      name={category.icon as any}
                      size={24}
                      color={selectedCategory === category.id ? Colors.neutral[0] : category.color}
                    />
                  </View>
                  <Text style={[
                    styles.categoryTitle,
                    selectedCategory === category.id && styles.categoryTitleSelected
                  ]}>
                    {category.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* FAQs */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>
            {searchQuery ? 'Search Results' : selectedCategory ? 'Frequently Asked Questions' : 'All Questions'}
          </Text>
          
          {searchResults.length === 0 ? (
            <View style={styles.noResults}>
              <Ionicons name="search" size={48} color={Colors.neutral[400]} />
              <Text style={styles.noResultsTitle}>No results found</Text>
              <Text style={styles.noResultsText}>
                Try searching with different keywords or browse by category
              </Text>
            </View>
          ) : (
            <View style={styles.faqList}>
              {searchResults.map((faq, index) => {
                const faqKey = `${selectedCategory || 'all'}-${index}`
                const isExpanded = expandedFAQ === faqKey
                
                return (
                  <View key={index} style={styles.faqItem}>
                    <TouchableOpacity
                      style={styles.faqQuestion}
                      onPress={() => toggleFAQ(index)}
                    >
                      <Text style={styles.faqQuestionText}>{faq.question}</Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={Colors.neutral[600]}
                      />
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={styles.faqAnswer}>
                        <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* Contact Support */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Still need help?</Text>
          <Text style={styles.contactSubtitle}>
            Our support team is here to help you 24/7
          </Text>
          
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
              <Ionicons name="mail" size={20} color={Colors.primary[500]} />
              <Text style={styles.contactButtonText}>Email Support</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.contactButton} onPress={handleCallSupport}>
              <Ionicons name="call" size={20} color={Colors.primary[500]} />
              <Text style={styles.contactButtonText}>Call Support</Text>
            </TouchableOpacity>
          </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.neutral[900],
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchSection: {
    marginTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: Colors.neutral[900],
  },
  categoriesSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.neutral[900],
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  categoryCardSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[700],
    textAlign: 'center',
  },
  categoryTitleSelected: {
    color: Colors.primary[700],
  },
  faqSection: {
    marginTop: 24,
  },
  faqList: {
    gap: 12,
  },
  faqItem: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  faqAnswerText: {
    fontSize: 14,
    color: Colors.neutral[700],
    lineHeight: 20,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[600],
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  contactSection: {
    marginTop: 32,
    marginBottom: 20,
    padding: 20,
    backgroundColor: Colors.primary[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  contactSubtitle: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: 20,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary[200],
    gap: 8,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary[700],
  },
})
