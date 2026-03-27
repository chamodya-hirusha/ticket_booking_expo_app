import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSequence,
    Easing,
    runOnJS
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useTheme } from '../context/ThemeContext';
import * as SplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

interface Props {
    onAnimationComplete: () => void;
}

const AnimatedSplashScreen: React.FC<Props> = ({ onAnimationComplete }) => {
    const { colors, theme } = useTheme();

    const logoOpacity = useSharedValue(0);
    const logoScale = useSharedValue(0.3);
    const textOpacity = useSharedValue(0);
    const textTranslateY = useSharedValue(20);

    useEffect(() => {
        // Hide the native static splash screen immediately so our animated one is visible
        SplashScreen.hideAsync().catch(() => { });

        // Start animation sequence
        logoOpacity.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.exp) });
        logoScale.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.back(1.5)) });


        textOpacity.value = withDelay(1200, withTiming(1, { duration: 800 }));
        textTranslateY.value = withDelay(1200, withTiming(0, { duration: 800, easing: Easing.out(Easing.quad) }));

        // Complete animation after delay
        const timeout = setTimeout(() => {
            // Fade out everything before finishing
            logoOpacity.value = withTiming(0, { duration: 500 });
            textOpacity.value = withTiming(0, { duration: 500 }, () => {
                runOnJS(onAnimationComplete)();
            });
        }, 4000);

        return () => clearTimeout(timeout);
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        opacity: logoOpacity.value,
        transform: [{ scale: logoScale.value }],
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: textTranslateY.value }],
    }));


    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={[
                    theme === 'dark' ? '#0a0a1a' : '#f8f9fa',
                    theme === 'dark' ? '#1a1a2e' : '#e2e8f0',
                    theme === 'dark' ? '#0a0a1a' : '#f8f9fa',
                ]}
                style={styles.gradient}
            />


            <View style={styles.content}>
                <Animated.View style={[styles.logoContainer, logoStyle]}>
                    <Image
                        source={require('../assets/Logo.png')}
                        style={styles.logo}
                        contentFit="contain"
                    />
                </Animated.View>

                <Animated.View style={[styles.textContainer, textStyle]}>
                    <Text style={[styles.title, { color: colors.text }]}>Krowd.ch</Text>
                    <Text style={[styles.subtitle, { color: colors.primary }]}>TICKET EVENT SALE SYSTEM</Text>
                </Animated.View>
            </View>

            {/* Footer loading indicator or text */}
            <Animated.View style={[styles.footer, textStyle]}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>Powering Your Events</Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },

    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        width: 200,
        height: 100,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 42,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 5,
        textTransform: 'uppercase',
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 4,
        textTransform: 'uppercase',
        opacity: 0.8,
    },
    footer: {
        position: 'absolute',
        bottom: 50,
    },
    footerText: {
        fontSize: 14,
        letterSpacing: 1,
        fontStyle: 'italic',
    }
});

export default AnimatedSplashScreen;
