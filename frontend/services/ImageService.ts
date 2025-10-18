import * as ImagePicker from 'expo-image-picker'
import { Alert } from 'react-native'
import { supabase } from '../lib/supabase'

export interface ImageUploadResult {
  url: string
  filename: string
  size: number
  type: string
}

export class ImageService {
  // Request camera permissions
  static async requestCameraPermissions(): Promise<boolean> {
    try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    return status === 'granted'
    } catch (error) {
      console.error('Error requesting camera permissions:', error)
      return false
    }
  }

  // Request media library permissions
  static async requestMediaLibraryPermissions(): Promise<boolean> {
    try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    return status === 'granted'
    } catch (error) {
      console.error('Error requesting media library permissions:', error)
      return false
    }
  }

  // Take photo with camera
  static async takePhoto(options?: {
    allowsEditing?: boolean
    aspect?: [number, number]
    quality?: number
  }): Promise<string | null> {
    try {
      const hasPermission = await this.requestCameraPermissions()
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Please grant camera permissions to take photos.')
        return null
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: options?.allowsEditing ?? true,
        aspect: options?.aspect ?? [4, 3],
        quality: options?.quality ?? 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri
      }
      return null
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert('Error', 'Failed to take photo. Please try again.')
      return null
    }
  }

  // Pick image from library
  static async pickImage(options?: {
    allowsEditing?: boolean
    aspect?: [number, number]
    quality?: number
    allowsMultipleSelection?: boolean
    selectionLimit?: number
  }): Promise<string[] | null> {
    try {
      const hasPermission = await this.requestMediaLibraryPermissions()
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Please grant photo library permissions to select images.')
        return null
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: options?.allowsMultipleSelection ? false : (options?.allowsEditing ?? true),
        aspect: options?.aspect ?? [4, 3],
        quality: options?.quality ?? 0.8,
        allowsMultipleSelection: options?.allowsMultipleSelection ?? false,
        selectionLimit: options?.selectionLimit ?? 1,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets.map(asset => asset.uri)
      }
      return null
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to pick image. Please try again.')
      return null
    }
  }

  // Show image picker with options (camera or library)
  static async showImagePicker(
    title: string = 'Select Image',
    options?: {
      allowsEditing?: boolean
      aspect?: [number, number]
      quality?: number
      allowsMultipleSelection?: boolean
      selectionLimit?: number
    }
  ): Promise<string[] | null> {
    return new Promise((resolve) => {
      Alert.alert(
        title,
        'Choose an option',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const uri = await this.takePhoto(options)
              resolve(uri ? [uri] : null)
            }
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              const uris = await this.pickImage(options)
              resolve(uris)
            }
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null)
          }
        ]
      )
    })
  }

  // Simple image picker (just library)
  static async pickImageFromLibrary(options?: {
    allowsEditing?: boolean
    aspect?: [number, number]
    quality?: number
  }): Promise<string | null> {
    const uris = await this.pickImage({
      ...options,
      allowsMultipleSelection: false,
      selectionLimit: 1
    })
    return uris && uris.length > 0 ? uris[0] : null
  }

  // Simple camera picker
  static async pickImageFromCamera(options?: {
    allowsEditing?: boolean
    aspect?: [number, number]
    quality?: number
  }): Promise<string | null> {
    return await this.takePhoto(options)
  }

  // Upload image to Supabase Storage
  static async uploadImage(fileUri: string, folder: string = 'images'): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Create a unique filename
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 15)
      const fileExtension = fileUri.split('.').pop() || 'jpg'
      const fileName = `${timestamp}_${randomId}.${fileExtension}`
      const filePath = `${folder}/${fileName}`

      // For Expo, we'll use a simple approach with fetch and FormData
      const formData = new FormData()
      formData.append('file', {
        uri: fileUri,
        type: 'image/jpeg',
        name: fileName,
      } as any)

      // Upload to Supabase Storage using the direct upload method
      const { data, error } = await supabase.storage
        .from('tasker-documents')
        .upload(filePath, formData, {
          contentType: 'image/jpeg',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('tasker-documents')
        .getPublicUrl(filePath)

      return {
        success: true,
        url: urlData.publicUrl
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload image'
      }
    }
  }

  // Get file info
  static async getFileInfo(fileUri: string): Promise<{ type: string; size: number }> {
    try {
      // Basic file info - in a real app, you'd get this from the file system
      return {
        type: 'image/jpeg',
        size: 0
      }
    } catch (error) {
      console.error('Error getting file info:', error)
      return {
        type: 'image/jpeg',
        size: 0
      }
    }
  }
}