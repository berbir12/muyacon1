import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Colors from '../constants/Colors'

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
}

const FAQ_DATA: FAQ[] = [
  {
    id: '1',
    question: 'How do I become a tasker?',
    answer: 'To become a tasker, go to Settings > Work > Become a Tasker and fill out the application form. You\'ll need to provide your skills, availability, and certifications. Once approved, you can start accepting tasks.',
    category: 'Getting Started'
  },
  {
    id: '2',
    question: 'How do I post a task?',
    answer: 'Go to the Jobs tab and tap "Post a Task". Fill in the task details including title, description, location, and budget. Set your preferred date and time, then publish your task.',
    category: 'Getting Started'
  },
  {
    id: '3',
    question: 'How do I apply for a task?',
    answer: 'Browse available tasks in the Jobs tab. When you find a task you\'re interested in, tap "Apply" and provide your proposed price and any additional details. The customer will review applications and choose a tasker.',
    category: 'Getting Started'
  },
  {
    id: '4',
    question: 'How do I get paid?',
    answer: 'Payment is processed automatically after task completion. You can withdraw your earnings through the Earnings screen. We support bank transfers and mobile money.',
    category: 'Payments'
  },
  {
    id: '5',
    question: 'What if a tasker doesn\'t show up?',
    answer: 'If a tasker doesn\'t show up, you can cancel the task and get a full refund. You can also report the issue to our support team for further assistance.',
    category: 'Issues'
  },
  {
    id: '6',
    question: 'How do I rate a tasker?',
    answer: 'After task completion, you\'ll receive a notification to rate the tasker. You can also go to the task details and tap "Rate Tasker" to leave a review.',
    category: 'Reviews'
  },
  {
    id: '7',
    question: 'Can I cancel a task?',
    answer: 'Yes, you can cancel a task before it starts. If you cancel after the tasker has started, cancellation fees may apply. Check our cancellation policy for details.',
    category: 'Cancellations'
  },
  {
    id: '8',
    question: 'How do I contact support?',
    answer: 'You can contact support through the Contact Us section in Settings, or send us an email at support@muyacon.com. We typically respond within 24 hours.',
    category: 'Support'
  }
]

const CATEGORIES = ['All', 'Getting Started', 'Payments', 'Issues', 'Reviews', 'Cancellations', 'Support']

export default function HelpCenter() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)

  const filteredFAQs = FAQ_DATA.filter(faq => {
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Choose how you\'d like to contact us:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Email', onPress: () => Alert.alert('Email', 'Send us an email at support@muyacon.com') },
        { text: 'Phone', onPress: () => Alert.alert('Phone', 'Call us at +251 911 234 567') },
        { text: 'Live Chat', onPress: () => Alert.alert('Live Chat', 'Live chat feature coming soon!') }
      ]
    )
  }

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId)
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <TouchableOpacity onPress={handleContactSupport} style={styles.contactButton}>
          <Ionicons name="chatbubble-outline" size={20} color={Colors.primary[500]} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color={Colors.neutral[400]} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for help..."
              placeholderTextColor={Colors.neutral[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={Colors.neutral[400]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={handleContactSupport}>
              <Ionicons name="chatbubble-outline" size={24} color={Colors.primary[500]} />
              <Text style={styles.actionTitle}>Contact Support</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => Alert.alert('Report Issue', 'Report issue feature coming soon!')}>
              <Ionicons name="flag-outline" size={24} color={Colors.warning[500]} />
              <Text style={styles.actionTitle}>Report Issue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => Alert.alert('Feedback', 'Feedback feature coming soon!')}>
              <Ionicons name="thumbs-up-outline" size={24} color={Colors.success[500]} />
              <Text style={styles.actionTitle}>Send Feedback</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => Alert.alert('Tutorial', 'Tutorial feature coming soon!')}>
              <Ionicons name="play-circle-outline" size={24} color={Colors.info[500]} />
              <Text style={styles.actionTitle}>Watch Tutorial</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonSelected
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextSelected
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>
            Frequently Asked Questions ({filteredFAQs.length})
          </Text>
          
          {filteredFAQs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="help-circle-outline" size={48} color={Colors.neutral[300]} />
              <Text style={styles.emptyTitle}>No FAQs Found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search or category filter
              </Text>
            </View>
          ) : (
            <View style={styles.faqList}>
              {filteredFAQs.map((faq) => (
                <View key={faq.id} style={styles.faqItem}>
                  <TouchableOpacity
                    style={styles.faqQuestion}
                    onPress={() => toggleFAQ(faq.id)}
                  >
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <Ionicons 
                      name={expandedFAQ === faq.id ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={Colors.neutral[600]} 
                    />
                  </TouchableOpacity>
                  
                  {expandedFAQ === faq.id && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                      <View style={styles.faqCategory}>
                        <Text style={styles.faqCategoryText}>{faq.category}</Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <View style={styles.contactCard}>
            <Ionicons name="mail-outline" size={24} color={Colors.primary[500]} />
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Still need help?</Text>
              <Text style={styles.contactSubtitle}>
                Our support team is here to help you 24/7
              </Text>
            </View>
            <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
              <Text style={styles.contactButtonText}>Contact Us</Text>
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
  contactButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  searchContainer: {
    padding: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
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
  categoriesSection: {
    marginBottom: 24,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.background.secondary,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  categoryButtonSelected: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  categoryText: {
    fontSize: 14,
    color: Colors.neutral[600],
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  faqSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
  faqList: {
    gap: 12,
  },
  faqItem: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.neutral[900],
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },
  faqAnswerText: {
    fontSize: 14,
    color: Colors.neutral[700],
    lineHeight: 20,
    marginBottom: 12,
  },
  faqCategory: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  faqCategoryText: {
    fontSize: 12,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  contactSection: {
    paddingHorizontal: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary[500],
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 14,
    color: Colors.neutral[600],
  },
  contactButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
})
