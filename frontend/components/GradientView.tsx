import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Colors from '../constants/Colors'
import { BorderRadius } from '../constants/Design'

interface GradientViewProps {
  children?: React.ReactNode
  colors?: string[]
  direction?: 'horizontal' | 'vertical' | 'diagonal'
  style?: ViewStyle
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ocean' | 'emerald' | 'sunset'
  opacity?: number
}

export default function GradientView({
  children,
  colors,
  direction = 'vertical',
  style,
  variant = 'primary',
  opacity = 1,
}: GradientViewProps) {
  const getGradientColors = (): string[] => {
    if (colors) return colors

    const variantColors: Record<string, string[]> = {
      primary: Colors.gradients.primary,
      secondary: Colors.gradients.secondary,
      success: Colors.gradients.success,
      warning: Colors.gradients.warning,
      error: Colors.gradients.error,
      ocean: Colors.gradients.ocean,
      emerald: Colors.gradients.emerald,
      sunset: Colors.gradients.sunset,
    }

    return variantColors[variant] || Colors.gradients.primary
  }

  const getGradientProps = () => {
    const gradientColors = getGradientColors()
    
    if (opacity < 1) {
      return gradientColors.map(color => `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`)
    }
    
    return gradientColors
  }

  const getDirectionProps = () => {
    switch (direction) {
      case 'horizontal':
        return { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } }
      case 'diagonal':
        return { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }
      case 'vertical':
      default:
        return { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } }
    }
  }

  return (
    <LinearGradient
      colors={getGradientProps()}
      {...getDirectionProps()}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  )
}

// Predefined gradient components for common use cases
export const GradientCard = ({
  children,
  style,
  ...props
}: Omit<GradientViewProps, 'variant'>) => (
  <GradientView
    variant="primary"
    style={[styles.card, style]}
    {...props}
  >
    {children}
  </GradientView>
)

export const GradientButton = ({
  children,
  style,
  ...props
}: Omit<GradientViewProps, 'variant'>) => (
  <GradientView
    variant="primary"
    style={[styles.button, style]}
    {...props}
  >
    {children}
  </GradientView>
)

export const GradientHeader = ({
  children,
  style,
  ...props
}: Omit<GradientViewProps, 'variant'>) => (
  <GradientView
    variant="primary"
    style={[styles.header, style]}
    {...props}
  >
    {children}
  </GradientView>
)

export const SuccessGradient = ({
  children,
  style,
  ...props
}: Omit<GradientViewProps, 'variant'>) => (
  <GradientView
    variant="success"
    style={[styles.default, style]}
    {...props}
  >
    {children}
  </GradientView>
)

export const WarningGradient = ({
  children,
  style,
  ...props
}: Omit<GradientViewProps, 'variant'>) => (
  <GradientView
    variant="warning"
    style={[styles.default, style]}
    {...props}
  >
    {children}
  </GradientView>
)

export const ErrorGradient = ({
  children,
  style,
  ...props
}: Omit<GradientViewProps, 'variant'>) => (
  <GradientView
    variant="error"
    style={[styles.default, style]}
    {...props}
  >
    {children}
  </GradientView>
)

const styles = StyleSheet.create({
  container: {
    // Base gradient styles
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: 16,
  },
  button: {
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  default: {
    // Default gradient styles
  },
})
