import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions, Text } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
  appIsReady?: boolean;
}

export default function CustomSplashScreen({ onFinish, appIsReady }: SplashScreenProps) {
  useEffect(() => {
    console.log('Custom splash screen is showing');
    // The splash screen will be hidden when the app is ready
    // No fixed timer - it depends on app loading time
  }, [onFinish]);

  useEffect(() => {
    if (appIsReady) {
      console.log('App is ready, finishing splash screen');
      onFinish();
    }
  }, [appIsReady, onFinish]);

      return (
        <View style={styles.container}>
          <Image
            source={require('../assets/images/splash.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width * 0.8,
    height: height * 0.6,
    maxWidth: 400,
    maxHeight: 300,
  },
});
