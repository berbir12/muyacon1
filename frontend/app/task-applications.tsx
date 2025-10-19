import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAuth } from '../contexts/SimpleAuthContext'
import { TaskApplicationService, TaskApplication } from '../services/TaskApplicationService'
import { ProfileService } from '../services/ProfileService'
import Colors from '../constants/Colors'

export default function TaskApplications() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const { taskId } = useLocalSearchParams()
  const [applications, setApplications] = useState<TaskApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [profileModalVisible, setProfileModalVisible] = useState(false)
  const [selectedTaskerProfile, setSelectedTaskerProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth')
    } else if (isAuthenticated && taskId) {
      loadApplications()
    }
  }, [isAuthenticated, taskId, isLoading])

  // Show loading while auth is being determined
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const loadApplications = async () => {
    if (!taskId || typeof taskId !== 'string') return
    
    try {
      setLoading(true)
      const data = await TaskApplicationService.getTaskApplications(taskId)
      setApplications(data)
    } catch (error) {
      console.error('Error loading applications:', error)
      Alert.alert('Error', 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptApplication = async (applicationId: string) => {
    Alert.alert(
      'Accept Application',
      'Are you sure you want to accept this application? This will assign the task to this tasker.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            const success = await TaskApplicationService.acceptApplication(taskId as string, applicationId)
            if (success) {
              Alert.alert('Success', 'Application accepted successfully!')
              loadApplications()
            } else {
              Alert.alert('Error', 'Failed to accept application')
            }
          }
        }
      ]
    )
  }

  const handleRejectApplication = async (applicationId: string) => {
    Alert.alert(
      'Reject Application',
      'Are you sure you want to reject this application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            const success = await TaskApplicationService.rejectApplication(applicationId)
            if (success) {
              Alert.alert('Success', 'Application rejected successfully!')
              loadApplications()
            } else {
              Alert.alert('Error', 'Failed to reject application')
            }
          }
        }
      ]
    )
  }

  const handleViewProfile = async (taskerId: string) => {
    try {
      setProfileLoading(true)
      setProfileModalVisible(true)
      
      const profile = await ProfileService.getProfile(taskerId)
      setSelectedTaskerProfile(profile)
    } catch (error) {
      console.error('Error loading profile:', error)
      Alert.alert('Error', 'Failed to load tasker profile')
      setProfileModalVisible(false)
    } finally {
      setProfileLoading(false)
    }
  }

  const closeProfileModal = () => {
    setProfileModalVisible(false)
    setSelectedTaskerProfile(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return Colors.warning[500]
      case 'accepted': return Colors.success[500]
      case 'rejected': return Colors.error[500]
      case 'withdrawn': return Colors.neutral[500]
      default: return Colors.neutral[500]
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending'
      case 'accepted': return 'Accepted'
      case 'rejected': return 'Rejected'
      case 'withdrawn': return 'Withdrawn'
      default: return 'Unknown'
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Applications</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading applications...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Applications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        {applications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={Colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No Applications Yet</Text>
            <Text style={styles.emptySubtitle}>
              Applications for this task will appear here when taskers apply.
            </Text>
          </View>
        ) : (
          <View style={styles.applicationsList}>
            {applications.map((application) => (
              <View key={application.id} style={styles.applicationCard}>
                <View style={styles.applicationHeader}>
                  <View style={styles.taskerInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {application.tasker_name?.charAt(0)?.toUpperCase() || 'T'}
                      </Text>
                    </View>
                    <View style={styles.taskerDetails}>
                      <Text style={styles.taskerName}>{application.tasker_name || 'Unknown Tasker'}</Text>
                      <Text style={styles.applicationDate}>
                        Applied {new Date(application.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(application.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(application.status) }]}>
                      {getStatusLabel(application.status)}
                    </Text>
                  </View>
                </View>

                {application.message && (
                  <View style={styles.messageContainer}>
                    <Text style={styles.messageLabel}>Message:</Text>
                    <Text style={styles.messageText}>{application.message}</Text>
                  </View>
                )}

                {application.proposed_price && (
                  <View style={styles.budgetContainer}>
                    <Text style={styles.budgetLabel}>Proposed Price:</Text>
                    <Text style={styles.budgetAmount}>${application.proposed_price}</Text>
                  </View>
                )}

                {/* View Profile Button */}
                <View style={styles.profileButtonContainer}>
                  <TouchableOpacity
                    style={styles.viewProfileButton}
                    onPress={() => handleViewProfile(application.tasker_id)}
                  >
                    <Ionicons name="person-outline" size={16} color={Colors.primary[500]} />
                    <Text style={styles.viewProfileButtonText}>View Profile</Text>
                  </TouchableOpacity>
                </View>

                {application.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleRejectApplication(application.id)}
                    >
                      <Ionicons name="close" size={16} color={Colors.error[500]} />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAcceptApplication(application.id)}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Tasker Profile Modal */}
      <Modal
        visible={profileModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeProfileModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeProfileModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.neutral[600]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Tasker Profile</Text>
            <View style={styles.modalPlaceholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {profileLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary[500]} />
                <Text style={styles.loadingText}>Loading profile...</Text>
              </View>
            ) : selectedTaskerProfile ? (
              <View>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                  <View style={styles.profileAvatar}>
                    {selectedTaskerProfile.avatar_url ? (
                      <Image 
                        source={{ uri: selectedTaskerProfile.avatar_url }} 
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.profileAvatarText}>
                        {selectedTaskerProfile.full_name?.charAt(0)?.toUpperCase() || 'T'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{selectedTaskerProfile.full_name || 'Unknown'}</Text>
                    <Text style={styles.profileRole}>{selectedTaskerProfile.role || 'Tasker'}</Text>
                    {selectedTaskerProfile.rating && (
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={16} color={Colors.warning[500]} />
                        <Text style={styles.ratingText}>{selectedTaskerProfile.rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Profile Details */}
                <View style={styles.profileDetails}>
                  {selectedTaskerProfile.bio && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Bio</Text>
                      <Text style={styles.detailText}>{selectedTaskerProfile.bio}</Text>
                    </View>
                  )}

                  {selectedTaskerProfile.skills && selectedTaskerProfile.skills.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Skills</Text>
                      <View style={styles.skillsContainer}>
                        {selectedTaskerProfile.skills.map((skill: string, index: number) => (
                          <View key={index} style={styles.skillTag}>
                            <Text style={styles.skillText}>{skill}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedTaskerProfile.experience_years && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Experience</Text>
                      <Text style={styles.detailText}>{selectedTaskerProfile.experience_years} years</Text>
                    </View>
                  )}

                  {selectedTaskerProfile.location && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Location</Text>
                      <Text style={styles.detailText}>{selectedTaskerProfile.location}</Text>
                    </View>
                  )}

                  {selectedTaskerProfile.total_tasks && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Tasks Completed</Text>
                      <Text style={styles.detailText}>{selectedTaskerProfile.total_tasks}</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.errorContainer}>
                <Ionicons name="person-outline" size={48} color={Colors.neutral[400]} />
                <Text style={styles.errorText}>Profile not found</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.neutral[600],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.neutral[600],
    textAlign: 'center',
    lineHeight: 24,
  },
  applicationsList: {
    padding: 20,
  },
  applicationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  taskerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  taskerDetails: {
    flex: 1,
  },
  taskerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  applicationDate: {
    fontSize: 14,
    color: Colors.neutral[600],
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: Colors.neutral[600],
    lineHeight: 20,
  },
  budgetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[700],
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary[500],
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.error[300],
    backgroundColor: Colors.error[50],
    gap: 4,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error[500],
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.success[500],
    gap: 4,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Profile Button Styles
  profileButtonContainer: {
    marginVertical: 12,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  viewProfileButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary[500],
    marginLeft: 6,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  modalPlaceholder: {
    width: 32,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  // Profile Header Styles
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileAvatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.primary[600],
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: Colors.neutral[600],
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.neutral[700],
    marginLeft: 4,
  },
  // Profile Details Styles
  profileDetails: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.neutral[700],
    lineHeight: 20,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: Colors.primary[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary[700],
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: Colors.neutral[600],
    marginTop: 12,
  },
})
