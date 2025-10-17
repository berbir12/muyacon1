import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../contexts/SimpleAuthContext'
import { TaskerApplicationService } from '../services/TaskerApplicationService'
import Colors from '../constants/Colors'

const SKILL_CATEGORIES = [
  'Cleaning', 'Handyman', 'Delivery', 'Photography', 'Technology',
  'Gardening', 'Pet Care', 'Moving', 'Tutoring', 'Cooking'
]

export default function TaskerApplication() {
  const { user, isAuthenticated, refreshUser, isLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dateOfBirth, setDateOfBirth] = useState(new Date())
  const [availabilityDate, setAvailabilityDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showAvailabilityPicker, setShowAvailabilityPicker] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    bio: '',
    experience: '',
    skills: [] as string[],
    hourlyRate: '',
    availability: '',
    languages: [] as string[],
    certifications: [] as string[],
    portfolio: '',
    references: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    dateOfBirth: '',
    yearsOfExperience: '',
    hasTransportation: false,
    hasTools: false,
    canWorkWeekends: false,
    canWorkEvenings: false,
    maxDistance: '10'
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth')
    } else if (isAuthenticated && user) {
      // Pre-fill with user data
      setFormData(prev => ({
        ...prev,
        fullName: user.name || '',
        phone: user.phone || '',
        email: user.profile?.email || ''
      }))
    }
  }, [isAuthenticated, user, isLoading])

  // Show loading while auth is being determined
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const handleSkillToggle = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }))
  }

  const handleLanguageToggle = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }))
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name')
      return
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email')
      return
    }
    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number')
      return
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter your address')
      return
    }
    if (!formData.city.trim()) {
      Alert.alert('Error', 'Please enter your city')
      return
    }
    if (!formData.state.trim()) {
      Alert.alert('Error', 'Please enter your state')
      return
    }
    if (!formData.zipCode.trim()) {
      Alert.alert('Error', 'Please enter your zip code')
      return
    }
    if (!formData.emergencyContactName.trim()) {
      Alert.alert('Error', 'Please enter emergency contact name')
      return
    }
    if (!formData.emergencyContactPhone.trim()) {
      Alert.alert('Error', 'Please enter emergency contact phone')
      return
    }
    if (!formData.emergencyContactRelationship.trim()) {
      Alert.alert('Error', 'Please enter emergency contact relationship')
      return
    }
    if (!formData.hourlyRate.trim()) {
      Alert.alert('Error', 'Please enter your hourly rate')
      return
    }

    const rate = parseFloat(formData.hourlyRate)
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Error', 'Please enter a valid hourly rate')
      return
    }

    setLoading(true)
    try {
      if (!user) {
        Alert.alert('Error', 'User not authenticated')
        return
      }

      // Create tasker application
      const applicationData = {
        user_id: user.id,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode,
        date_of_birth: dateOfBirth.toISOString().split('T')[0],
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_phone: formData.emergencyContactPhone,
        emergency_contact_relationship: formData.emergencyContactRelationship,
        years_of_experience: parseInt(formData.yearsOfExperience) || 0,
        skills: formData.skills.length > 0 ? formData.skills : [],
        availability: [availabilityDate.toISOString().split('T')[0]],
        hourly_rate: parseFloat(formData.hourlyRate),
        certifications: formData.certifications.length > 0 ? formData.certifications : [],
        status: 'pending' as const
      }

      await TaskerApplicationService.createApplication(applicationData)

      // Refresh user data to update application status
      await refreshUser()

      Alert.alert(
        'Application Submitted!',
        'Your tasker application has been submitted for review. You will be notified once approved.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/profile')
            }
          }
        ]
      )
    } catch (error) {
      console.error('Error submitting application:', error)
      Alert.alert('Error', 'Failed to submit application. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.push('/profile')}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Become a Tasker</Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView 
              style={styles.form} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
              bounces={true}
              scrollEventThrottle={16}
            >
              {/* Personal Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor={Colors.neutral[400]}
                    value={formData.fullName}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your phone number"
                    placeholderTextColor={Colors.neutral[400]}
                    value={formData.phone}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={Colors.neutral[400]}
                    value={formData.email}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Professional Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Professional Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bio *</Text>
                  <Text style={styles.helperText}>Tell us about yourself and your experience</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Write a brief bio about yourself..."
                    placeholderTextColor={Colors.neutral[400]}
                    value={formData.bio}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                  />
                  <Text style={styles.characterCount}>{formData.bio.length}/500</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Experience *</Text>
                  <Text style={styles.helperText}>Describe your relevant work experience</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe your experience in your chosen fields..."
                    placeholderTextColor={Colors.neutral[400]}
                    value={formData.experience}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, experience: text }))}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Skills & Services *</Text>
                  <Text style={styles.helperText}>Select the services you can provide</Text>
                  <View style={styles.skillsContainer}>
                    {SKILL_CATEGORIES.map((skill) => (
                      <TouchableOpacity
                        key={skill}
                        style={[
                          styles.skillChip,
                          formData.skills.includes(skill) && styles.skillChipActive
                        ]}
                        onPress={() => handleSkillToggle(skill)}
                      >
                        <Text style={[
                          styles.skillChipText,
                          formData.skills.includes(skill) && styles.skillChipTextActive
                        ]}>
                          {skill}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Hourly Rate *</Text>
                  <Text style={styles.helperText}>What do you charge per hour?</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="25"
                      placeholderTextColor={Colors.neutral[400]}
                      value={formData.hourlyRate}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, hourlyRate: text }))}
                      keyboardType="numeric"
                    />
                    <Text style={styles.currencyText}>/hour</Text>
                  </View>
                </View>
              </View>

              {/* Availability */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Availability</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Available From *</Text>
                  <Text style={styles.helperText}>When can you start working?</Text>
                  <TouchableOpacity 
                    style={styles.input}
                    onPress={() => setShowAvailabilityPicker(true)}
                  >
                    <Text style={styles.dateText}>
                      {availabilityDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.checkboxGroup}>
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setFormData(prev => ({ ...prev, canWorkWeekends: !prev.canWorkWeekends }))}
                  >
                    <View style={[styles.checkbox, formData.canWorkWeekends && styles.checkboxActive]}>
                      {formData.canWorkWeekends && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>I can work weekends</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setFormData(prev => ({ ...prev, canWorkEvenings: !prev.canWorkEvenings }))}
                  >
                    <View style={[styles.checkbox, formData.canWorkEvenings && styles.checkboxActive]}>
                      {formData.canWorkEvenings && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>I can work evenings</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Maximum Travel Distance</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="10"
                      placeholderTextColor={Colors.neutral[400]}
                      value={formData.maxDistance}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, maxDistance: text }))}
                      keyboardType="numeric"
                    />
                    <Text style={styles.currencyText}>miles</Text>
                  </View>
                </View>
              </View>

              {/* Additional Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Additional Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Languages</Text>
                  <Text style={styles.helperText}>What languages do you speak?</Text>
                  <View style={styles.skillsContainer}>
                    {['English', 'Amharic', 'Tigrinya', 'Oromo', 'Spanish', 'French'].map((language) => (
                      <TouchableOpacity
                        key={language}
                        style={[
                          styles.skillChip,
                          formData.languages.includes(language) && styles.skillChipActive
                        ]}
                        onPress={() => handleLanguageToggle(language)}
                      >
                        <Text style={[
                          styles.skillChipText,
                          formData.languages.includes(language) && styles.skillChipTextActive
                        ]}>
                          {language}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Certifications & Documents</Text>
                  <Text style={styles.helperText}>Upload your certifications, licenses, and ID documents</Text>
                  
                  <View style={styles.fileUploadSection}>
                    <TouchableOpacity style={styles.fileUploadButton}>
                      <Ionicons name="cloud-upload-outline" size={24} color={Colors.primary[500]} />
                      <Text style={styles.fileUploadText}>Upload Certifications</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.fileUploadButton}>
                      <Ionicons name="card-outline" size={24} color={Colors.primary[500]} />
                      <Text style={styles.fileUploadText}>Upload ID (Front)</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.fileUploadButton}>
                      <Ionicons name="card-outline" size={24} color={Colors.primary[500]} />
                      <Text style={styles.fileUploadText}>Upload ID (Back)</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="List any certifications, licenses, or qualifications..."
                    placeholderTextColor={Colors.neutral[400]}
                    value={formData.certifications}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, certifications: text }))}
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Portfolio/Website</Text>
                  <Text style={styles.helperText}>Link to your portfolio or website (optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://yourportfolio.com"
                    placeholderTextColor={Colors.neutral[400]}
                    value={formData.portfolio}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, portfolio: text }))}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Personal Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Details</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Date of Birth *</Text>
                  <TouchableOpacity 
                    style={styles.input}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.dateText}>
                      {dateOfBirth.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Years of Experience</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={Colors.neutral[400]}
                    value={formData.yearsOfExperience}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, yearsOfExperience: text }))}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your address"
                    placeholderTextColor={Colors.neutral[400]}
                    value={formData.address}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your city"
                    placeholderTextColor={Colors.neutral[400]}
                    value={formData.city}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>State *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your state"
                    placeholderTextColor={Colors.neutral[400]}
                    value={formData.state}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, state: text }))}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Zip Code *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your zip code"
                    placeholderTextColor={Colors.neutral[400]}
                    value={formData.zipCode}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, zipCode: text }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Emergency Contact */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Emergency Contact</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Emergency Contact Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter emergency contact name"
                    placeholderTextColor={Colors.neutral[400]}
                    value={formData.emergencyContactName}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, emergencyContactName: text }))}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Emergency Contact Phone *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter emergency contact phone"
                    placeholderTextColor={Colors.neutral[400]}
                    value={formData.emergencyContactPhone}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, emergencyContactPhone: text }))}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Relationship *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Spouse, Parent, Sibling"
                    placeholderTextColor={Colors.neutral[400]}
                    value={formData.emergencyContactRelationship}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, emergencyContactRelationship: text }))}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>
                  {loading ? 'Submitting...' : 'Submit Application'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Date of Birth Picker */}
            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false)
                  if (selectedDate) {
                    setDateOfBirth(selectedDate)
                  }
                }}
                maximumDate={new Date()}
              />
            )}

            {/* Availability Date Picker */}
            {showAvailabilityPicker && (
              <DateTimePicker
                value={availabilityDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowAvailabilityPicker(false)
                  if (selectedDate) {
                    setAvailabilityDate(selectedDate)
                  }
                }}
                minimumDate={new Date()}
              />
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.neutral[900],
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    fontSize: 16,
    color: Colors.neutral[900],
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: Colors.neutral[500],
    textAlign: 'right',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  currencySymbol: {
    fontSize: 16,
    color: Colors.neutral[600],
    marginRight: 4,
  },
  currencyText: {
    fontSize: 16,
    color: Colors.neutral[600],
    marginLeft: 4,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    backgroundColor: Colors.background.primary,
  },
  skillChipActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  skillChipText: {
    fontSize: 14,
    color: Colors.neutral[700],
    fontWeight: '500',
  },
  skillChipTextActive: {
    color: '#fff',
  },
  checkboxGroup: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border.primary,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  checkboxLabel: {
    fontSize: 16,
    color: Colors.neutral[700],
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[500],
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 32,
    marginBottom: 40,
    gap: 8,
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.neutral[300],
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  fileUploadSection: {
    gap: 12,
    marginBottom: 16,
  },
  fileUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[50],
    borderWidth: 2,
    borderColor: Colors.primary[200],
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  fileUploadText: {
    fontSize: 14,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  dateText: {
    fontSize: 16,
    color: Colors.neutral[700],
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.neutral[600],
    marginTop: 10,
  },
})