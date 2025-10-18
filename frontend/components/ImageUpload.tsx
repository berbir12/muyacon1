import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
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
      
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images')
        return
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        
        // Upload to Supabase Storage
        const uploadResult = await ImageService.uploadImage(asset.uri, 'general-images')
        
        if (uploadResult.success && uploadResult.url) {
          onImageUploaded(uploadResult.url)
        } else {
          Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload image')
        }
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