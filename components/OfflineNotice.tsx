import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, Animated, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const OfflineNotice = () => {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [visible, setVisible] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // In some native environments, isConnected can be null. We treat null as connected to avoid premature alerts.
      const isCurrConnected = state.isConnected !== false;
      
      setIsConnected(isCurrConnected);

      if (!isCurrConnected) {
        // Device goes offline
        setWasOffline(true);
        setVisible(true);
        // Slide down the alert banner
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 40,
          friction: 8,
        }).start();
      } else if (isCurrConnected && wasOffline) {
        // Connection restored after being offline
        setVisible(true);
        // Slide down or stay down
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 40,
          friction: 8,
        }).start();

        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        // Keep the "Back Online!" green banner visible for 3 seconds then slide it away
        timerRef.current = setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -150,
            duration: 350,
            useNativeDriver: true,
          }).start(() => {
            setVisible(false);
            setWasOffline(false);
          });
        }, 3000);
      }
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [wasOffline]);

  if (!visible) return null;

  const isDark = theme === 'dark';
  const bgColor = isConnected 
    ? colors.success 
    : (isDark ? '#e11d48' : '#ef4444'); // Deep premium rose/red for dark mode, vibrant red for light mode
  
  const textColor = '#ffffff';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: bgColor,
          paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + 8,
        },
      ]}
    >
      <Ionicons
        name={isConnected ? 'cloud-done-outline' : 'cloud-offline-outline'}
        size={18}
        color={textColor}
        style={styles.icon}
      />
      <Text style={[styles.text, { color: textColor }]}>
        {isConnected
          ? 'Back Online!'
          : 'No Internet Connection. Checking your network...'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 99999, // Ensure it floats above the header and all modals
    elevation: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});

export default OfflineNotice;
