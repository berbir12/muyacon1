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
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../contexts/AuthContext'
import { ProfileService } from '../services/ProfileService'
import ImageUpload from '../components/ImageUpload'
import Colors from '../constants/Colors'

const { width } = Dimensions.get('window')

export default function EditProfile() {
  const { user, login } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    bio: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    skills: [] as string[],
    languages: [] as string[],
    hourlyRate: '',
    experience: '',
    certifications: [] as string[],
    portfolio: [] as string[]
  })

  useEffect(() => {
    if (user?.profile) {
      setFormData({
        fullName: user.profile.full_name || '',
        username: user.profile.username || '',
        email: user.profile.email || '',
        phone: user.profile.phone || '',
        bio: user.profile.bio || '',
        address: user.profile.address || '',
        city: user.profile.city || '',
        state: user.profile.state || '',
        zipCode: user.profile.zip_code || '',
        skills: user.profile.skills || [],
        languages: user.profile.languages || [],
        hourlyRate: user.profile.hourly_rate?.toString() || '',
        experience: user.profile.experience_years?.toString() || '',
        certifications: user.profile.certifications || [],
        portfolio: user.profile.portfolio_images || []
      })
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return

    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name')
      return
    }

    setSaving(true)
    try {
      const updates = {
        full_name: formData.fullName,
        username: formData.username,
        email: formData.email,
        bio: formData.bio,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode,
        skills: formData.skills,
        languages: formData.languages,
        hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        experience_years: formData.experience ? parseInt(formData.experience) : 0,
        certifications: formData.certifications,
        portfolio_images: formData.portfolio
      }

      await ProfileService.updateProfile(user.id, updates)
      
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ])
    } catch (error) {
      console.error('Error updating profile:', error)
      Alert.alert('Error', 'Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSkill = () => {
    Alert.prompt(
      'Add Skill',
      'Enter a skill you can provide',
      (text) => {
        if (text && text.trim() && !formData.skills.includes(text.trim())) {
          setFormData(prev => ({
            ...prev,
            skills: [...prev.skills, text.trim()]
          }))
        }
      }
    )
  }

  const handleRemoveSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }))
  }

  const handleAddLanguage = () => {
    Alert.prompt(
      'Add Language',
      'Enter a language you speak',
      (text) => {
        if (text && text.trim() && !formData.languages.includes(text.trim())) {
          setFormData(prev => ({
            ...prev,
            languages: [...prev.languages, text.trim()]
          }))
        }
      }
    )
  }

  const handleRemoveLanguage = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== language)
    }))
  }

  const handleAddCertification = () => {
    Alert.prompt(
      'Add Certification',
      'Enter a certification you have',
      (text) => {
        if (text && text.trim() && !formData.certifications.includes(text.trim())) {
          setFormData(prev => ({
            ...prev,
            certifications: [...prev.certifications, text.trim()]
          }))
        }
      }
    )
  }

  const handleRemoveCertification = (certification: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== certification)
    }))
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/profile')}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.primary[500]} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <ImageUpload
            onImageSelected={(uri) => {
              // Handle image selection
              console.log('Selected image:', uri)
              // In a real app, you would upload this to Supabase Storage
            }}
            currentImage={user?.profile?.avatar_url}
            placeholder="Add Profile Photo"
          />
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.fullName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.neutral[400]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(text) => setFormData(prev => ({ ...prev, username: text }))}
              placeholder="Enter your username"
              placeholderTextColor={Colors.neutral[400]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              placeholder="Enter your email"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
              placeholder="Enter your phone number"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
              placeholder="Tell us about yourself"
              placeholderTextColor={Colors.neutral[400]}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={formData.address}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
              placeholder="Enter your address"
              placeholderTextColor={Colors.neutral[400]}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={formData.city}
                onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
                placeholder="City"
                placeholderTextColor={Colors.neutral[400]}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={formData.state}
                onChangeText={(text) => setFormData(prev => ({ ...prev, state: text }))}
                placeholder="State"
                placeholderTextColor={Colors.neutral[400]}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ZIP Code</Text>
            <TextInput
              style={styles.input}
              value={formData.zipCode}
              onChangeText={(text) => setFormData(prev => ({ ...prev, zipCode: text }))}
              placeholder="ZIP Code"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <Text style={styles.sectionSubtitle}>What services can you provide?</Text>
          
          <View style={styles.skillsContainer}>
            {formData.skills.map((skill, index) => (
              <View key={index} style={styles.skillChip}>
                <Text style={styles.skillText}>{skill}</Text>
                <TouchableOpacity onPress={() => handleRemoveSkill(skill)}>
                  <Ionicons name="close" size={16} color={Colors.neutral[600]} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={handleAddSkill}>
              <Ionicons name="add" size={16} color={Colors.primary[500]} />
              <Text style={styles.addButtonText}>Add Skill</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Languages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Languages</Text>
          <Text style={styles.sectionSubtitle}>What languages do you speak?</Text>
          
          <View style={styles.skillsContainer}>
            {formData.languages.map((language, index) => (
              <View key={index} style={styles.skillChip}>
                <Text style={styles.skillText}>{language}</Text>
                <TouchableOpacity onPress={() => handleRemoveLanguage(language)}>
                  <Ionicons name="close" size={16} color={Colors.neutral[600]} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={handleAddLanguage}>
              <Ionicons name="add" size={16} color={Colors.primary[500]} />
              <Text style={styles.addButtonText}>Add Language</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Professional Info (for taskers) */}
        {(user?.role === 'tasker' || user?.role === 'both') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hourly Rate</Text>
              <TextInput
                style={styles.input}
                value={formData.hourlyRate}
                onChangeText={(text) => setFormData(prev => ({ ...prev, hourlyRate: text }))}
                placeholder="Enter your hourly rate"
                placeholderTextColor={Colors.neutral[400]}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Years of Experience</Text>
              <TextInput
                style={styles.input}
                value={formData.experience}
                onChangeText={(text) => setFormData(prev => ({ ...prev, experience: text }))}
                placeholder="Enter years of experience"
                placeholderTextColor={Colors.neutral[400]}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Certifications</Text>
              <Text style={styles.sectionSubtitle}>What certifications do you have?</Text>
              
              <View style={styles.skillsContainer}>
                {formData.certifications.map((certification, index) => (
                  <View key={index} style={styles.skillChip}>
                    <Text style={styles.skillText}>{certification}</Text>
                    <TouchableOpacity onPress={() => handleRemoveCertification(certification)}>
                      <Ionicons name="close" size={16} color={Colors.neutral[600]} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addButton} onPress={handleAddCertification}>
                  <Ionicons name="add" size={16} color={Colors.primary[500]} />
                  <Text style={styles.addButtonText}>Add Certification</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.neutral[900],
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: Colors.primary[500],
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    gap: 6,
  },
  changePhotoText: {
    color: Colors.primary[500],
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.neutral[900],
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.neutral[900],
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  skillText: {
    fontSize: 14,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.primary[500],
    borderStyle: 'dashed',
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    color: Colors.primary[500],
    fontWeight: '500',
  },
})
