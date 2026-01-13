import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    Platform,
    StatusBar,
    Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface SuccessToastProps {
    message: string;
    title?: string;
    type?: ToastType;
    onHide?: () => void;
}

const SuccessToast: React.FC<SuccessToastProps> = ({
    message,
    title,
    type = 'success',
    onHide,
}) => {
    const { colors, theme } = useTheme();
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const progressWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: Platform.OS === 'ios' ? 50 : 20,
                useNativeDriver: true,
                tension: 40,
                friction: 8,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Haptic feedback for a professional feel
        if (type === 'error' || type === 'warning') {
            Vibration.vibrate([0, 100, 100, 100]);
        } else {
            Vibration.vibrate(50);
        }

        // Progress bar animation
        Animated.timing(progressWidth, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: false,
        }).start();

        // Auto-hide after 4 seconds
        const timer = setTimeout(() => {
            hide();
        }, 4000);

        return () => clearTimeout(timer);
    }, []);

    const hide = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (onHide) onHide();
        });
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return 'checkmark-circle';
            case 'error':
                return 'alert-circle';
            case 'warning':
                return 'warning';
            case 'info':
                return 'information-circle';
            default:
                return 'checkmark-circle';
        }
    };

    const getIconColor = () => {
        switch (type) {
            case 'success':
                return colors.success;
            case 'error':
                return colors.error;
            case 'warning':
                return '#f59e0b';
            case 'info':
                return colors.primary;
            default:
                return colors.success;
        }
    };

    const content = (
        <View style={[
            styles.toastInner,
            {
                backgroundColor: theme === 'dark' ? 'rgba(30, 30, 45, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            }
        ]}>
            <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '20' }]}>
                <Ionicons name={getIcon()} size={28} color={getIconColor()} />
            </View>

            <View style={styles.textContainer}>
                {title && (
                    <Text style={[styles.title, { color: colors.text }]}>
                        {title}
                    </Text>
                )}
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                    {message}
                </Text>
            </View>

            <Animated.View
                style={[
                    styles.progressBar,
                    {
                        backgroundColor: getIconColor(),
                        width: progressWidth.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['80%', '100%'],
                        })
                    }
                ]}
            />
        </View>
    );

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity,
                    transform: [{ translateY }],
                },
            ]}
        >
            {content}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        zIndex: 9999,
        alignItems: 'center',
    },
    toastInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 24,
        borderWidth: 1.5,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 10,
        overflow: 'hidden',
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
        opacity: 0.9,
    },
    progressBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 4,
    },
});

export default SuccessToast;
