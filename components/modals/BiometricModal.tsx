import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
    Animated,
    Pressable,
    ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../../context/ThemeContext';

interface BiometricModalProps {
    visible: boolean;
    onClose: () => void;
    onAuthenticate: (type: LocalAuthentication.AuthenticationType) => void;
    biometricType?: string; 
}

const { width } = Dimensions.get('window');

export const BiometricModal: React.FC<BiometricModalProps> = ({
    visible,
    onClose,
    onAuthenticate,
}) => {
    const { colors, theme } = useTheme();
    const [supportedTypes, setSupportedTypes] = useState<LocalAuthentication.AuthenticationType[]>([]);
    const [loading, setLoading] = useState(true);
    const [scaleAnim] = useState(new Animated.Value(0.9));
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        if (visible) {
            checkSupportedBiometrics();
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            scaleAnim.setValue(0.9);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    const checkSupportedBiometrics = async () => {
        setLoading(true);
        try {
            const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
            setSupportedTypes(types);
        } finally {
            setLoading(false);
        }
    };

    const hasFace = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const hasFingerprint = supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

    const handleAuthenticate = (type: LocalAuthentication.AuthenticationType) => {
        onAuthenticate(type);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
                    <BlurView
                        intensity={theme === 'dark' ? 40 : 60}
                        tint={theme === 'dark' ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                </Pressable>

                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    <View style={[styles.glowContainer, { shadowColor: colors.primary }]}>
                        <View style={[styles.iconHeader, { backgroundColor: colors.primary + '15' }]}>
                            <MaterialCommunityIcons
                                name="shield-check-outline"
                                size={44}
                                color={colors.primary}
                            />
                        </View>
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>Biometric Access</Text>
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        Please choose a biometric method to verify your identity and continue.
                    </Text>

                    <View style={styles.buttonContainer}>
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                                    Checking biometric options...
                                </Text>
                            </View>
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={[styles.authButton, { backgroundColor: colors.primary }]}
                                    onPress={() => handleAuthenticate(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)}
                                    activeOpacity={0.8}
                                >
                                    <MaterialCommunityIcons name="face-recognition" size={26} color="#FFF" style={styles.buttonIcon} />
                                    <Text style={styles.authButtonText}>Face Unlock</Text>
                                </TouchableOpacity>

                                {hasFingerprint && (
                                    <TouchableOpacity
                                        style={[styles.authButton, { backgroundColor: colors.primary }]}
                                        onPress={() => handleAuthenticate(LocalAuthentication.AuthenticationType.FINGERPRINT)}
                                        activeOpacity={0.8}
                                    >
                                        <MaterialCommunityIcons name="fingerprint" size={26} color="#FFF" style={styles.buttonIcon} />
                                        <Text style={styles.authButtonText}>Fingerprint</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: width * 0.85,
        borderRadius: 32,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        elevation: 20,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    glowContainer: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        marginBottom: 20,
    },
    iconHeader: {
        width: 88,
        height: 88,
        borderRadius: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        fontSize: 16,
        marginTop: 10,
        textAlign: 'center',
    },
    authButton: {
        flexDirection: 'row',
        width: '100%',
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonIcon: {
        marginRight: 12,
    },
    authButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});