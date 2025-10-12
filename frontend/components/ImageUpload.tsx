import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ImageService } from '../services/ImageService'
import Colors from '../constants/Colors'

interface ImageUploadProps {
  onImageUploaded: (url: string) => void
  onImageRemoved: () => void
  currentImage?: string
  placeholder?: string
}

export default function ImageUpload({
  onImageUploaded,
  onImageRemoved,
  currentImage,
  placeholder = "Tap to add image"
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)

  const handleImageSelection = async () => {
    try {
      setUploading(true)
      
      const uris = await ImageService.showImagePicker('Select Image', {
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      })

      if (uris && uris.length > 0) {
        // For now, just use the local URI
        // In a real app, you'd upload to your server here
        onImageUploaded(uris[0])
      }
    } catch (error) {
      console.error('Error selecting image:', error)
      Alert.alert('Error', 'Failed to select image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onImageRemoved }
      ]
    )
  }

  return (
    <View style={styles.container}>
      {currentImage ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: currentImage }} style={styles.image} />
          <TouchableOpacity style={styles.removeButton} onPress={removeImage}>
            <Ionicons name="close-circle" size={24} color={Colors.error?.[500] || '#ef4444'} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={[styles.uploadButton, uploading && styles.uploading]} 
          onPress={handleImageSelection}
          disabled={uploading}
        >
          <Ionicons 
            name={uploading ? "hourglass" : "camera"} 
            size={32} 
            color={uploading ? Colors.neutral?.[400] || '#9ca3af' : Colors.primary?.[500] || '#3b82f6'} 
          />
          <Text style={[styles.uploadText, uploading && styles.uploadingText]}>
            {uploading ? 'Uploading...' : placeholder}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  uploading: {
    borderColor: '#9ca3af',
    backgroundColor: '#f3f4f6',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  uploadingText: {
    color: '#9ca3af',
  },
})