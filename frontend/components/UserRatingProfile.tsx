import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { RatingService, RatingSummary, Review } from '../services/RatingService'
import { Colors } from '../constants/Colors'

interface UserRatingProfileProps {
  userId: string
  userName: string
  userAvatar?: string
  userType: 'tasker' | 'customer'
  showFullProfile?: boolean
  onReviewPress?: (review: Review) => void
}

export default function UserRatingProfile({
  userId,
  userName,
  userAvatar,
  userType,
  showFullProfile = false,
  onReviewPress
}: UserRatingProfileProps) {
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)

  useEffect(() => {
    loadRatingData()
  }, [userId])

  const loadRatingData = async () => {
    try {
      setLoading(true)
      const [summary, userReviews] = await Promise.all([
        RatingService.getUserRatingSummary(userId),
        RatingService.getUserReviews(userId, userType === 'tasker' ? 'customer_to_tasker' : 'tasker_to_customer', 5)
      ])
      
      setRatingSummary(summary)
      setReviews(userReviews)
    } catch (error) {
      console.error('Error loading rating data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadRatingData()
    setRefreshing(false)
  }

  const loadMoreReviews = async () => {
    try {
      const moreReviews = await RatingService.getUserReviews(
        userId,
        userType === 'tasker' ? 'customer_to_tasker' : 'tasker_to_customer',
        10,
        reviews.length
      )
      setReviews(prev => [...prev, ...moreReviews])
    } catch (error) {
      console.error('Error loading more reviews:', error)
    }
  }

  const renderStars = (rating: number, size: number = 16) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={star <= rating ? Colors.warning[500] : Colors.neutral[300]}
          />
        ))}
      </View>
    )
  }

  const renderRatingBreakdown = () => {
    if (!ratingSummary) return null

    const { rating_breakdown, total_reviews } = ratingSummary

    return (
      <View style={styles.breakdownContainer}>
        <Text style={styles.breakdownTitle}>Rating Breakdown</Text>
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = rating_breakdown[rating as keyof typeof rating_breakdown]
          const percentage = total_reviews > 0 ? (count / total_reviews) * 100 : 0

          return (
            <View key={rating} style={styles.breakdownRow}>
              <Text style={styles.breakdownRating}>{rating}</Text>
              <Ionicons name="star" size={12} color={Colors.warning[500]} />
              <View style={styles.breakdownBar}>
                <View
                  style={[
                    styles.breakdownFill,
                    { width: `${percentage}%` }
                  ]}
                />
              </View>
              <Text style={styles.breakdownCount}>{count}</Text>
            </View>
          )
        })}
      </View>
    )
  }

  const renderReview = (review: Review) => (
    <TouchableOpacity
      key={review.id}
      style={styles.reviewCard}
      onPress={() => onReviewPress?.(review)}
    >
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          {review.is_anonymous ? (
            <View style={styles.anonymousAvatar}>
              <Ionicons name="person" size={16} color={Colors.neutral[500]} />
            </View>
          ) : (
            <Image
              source={{ uri: review.reviewer_avatar || 'https://via.placeholder.com/40' }}
              style={styles.reviewerAvatar}
            />
          )}
          <View style={styles.reviewerDetails}>
            <Text style={styles.reviewerName}>
              {review.is_anonymous ? 'Anonymous' : review.reviewer_name || 'Unknown'}
            </Text>
            <Text style={styles.reviewDate}>
              {new Date(review.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {renderStars(review.rating, 14)}
      </View>
      <Text style={styles.reviewComment} numberOfLines={3}>
        {review.comment}
      </Text>
      {review.task_title && (
        <Text style={styles.reviewTask}>
          Task: {review.task_title}
        </Text>
      )}
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>Loading ratings...</Text>
      </View>
    )
  }

  if (!ratingSummary || ratingSummary.total_reviews === 0) {
    return (
      <View style={styles.noReviewsContainer}>
        <Ionicons name="star-outline" size={48} color={Colors.neutral[300]} />
        <Text style={styles.noReviewsTitle}>No Reviews Yet</Text>
        <Text style={styles.noReviewsText}>
          {userName} hasn't received any reviews as a {userType} yet.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Rating Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.userInfo}>
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={styles.userAvatar} />
            ) : (
              <View style={styles.defaultAvatar}>
                <Ionicons name="person" size={24} color={Colors.neutral[500]} />
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userType}>
                {userType === 'tasker' ? 'Tasker' : 'Customer'}
              </Text>
            </View>
          </View>
          <View style={styles.ratingInfo}>
            <Text style={styles.averageRating}>
              {ratingSummary.average_rating.toFixed(1)}
            </Text>
            {renderStars(ratingSummary.average_rating, 20)}
            <Text style={styles.totalReviews}>
              {ratingSummary.total_reviews} review{ratingSummary.total_reviews !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {showFullProfile && renderRatingBreakdown()}
      </View>

      {/* Reviews List */}
      <View style={styles.reviewsSection}>
        <View style={styles.reviewsHeader}>
          <Text style={styles.reviewsTitle}>Reviews</Text>
          {reviews.length > 5 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setShowAllReviews(!showAllReviews)}
            >
              <Text style={styles.viewAllText}>
                {showAllReviews ? 'Show Less' : 'View All'}
              </Text>
              <Ionicons
                name={showAllReviews ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.primary[500]}
              />
            </TouchableOpacity>
          )}
        </View>

        {reviews.slice(0, showAllReviews ? reviews.length : 3).map(renderReview)}

        {!showAllReviews && reviews.length > 3 && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={loadMoreReviews}
          >
            <Text style={styles.loadMoreText}>
              Load More Reviews ({reviews.length - 3} remaining)
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.neutral[600],
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  noReviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginTop: 16,
  },
  noReviewsText: {
    fontSize: 14,
    color: Colors.neutral[600],
    textAlign: 'center',
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  userType: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginTop: 2,
  },
  ratingInfo: {
    alignItems: 'center',
  },
  averageRating: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.neutral[900],
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 4,
  },
  totalReviews: {
    fontSize: 14,
    color: Colors.neutral[600],
  },
  breakdownContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownRating: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.neutral[700],
    width: 20,
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.neutral[200],
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    backgroundColor: Colors.warning[500],
    borderRadius: 4,
  },
  breakdownCount: {
    fontSize: 12,
    color: Colors.neutral[600],
    width: 30,
    textAlign: 'right',
  },
  reviewsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary[500],
    fontWeight: '500',
  },
  reviewCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  anonymousAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.neutral[900],
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.neutral[700],
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewTask: {
    fontSize: 12,
    color: Colors.primary[600],
    fontStyle: 'italic',
  },
  loadMoreButton: {
    backgroundColor: Colors.primary[50],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: Colors.primary[600],
    fontWeight: '500',
  },
})
