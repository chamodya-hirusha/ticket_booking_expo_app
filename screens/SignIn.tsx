import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { API_CONFIG } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ForgotPasswordModal, ResetPasswordModal, VerifyAccountModal } from '../components/modals/AuthModals';
import { BiometricModal } from '../components/modals/BiometricModal';
import { apiService } from '../services/api';
import { toast } from '../services/toast';
import { useLanguage } from '../context/LanguageContext';

const SignIn = ({ navigation }: any) => {
    const { colors, theme } = useTheme();
    const { t } = useLanguage();
    const {
        signIn,
        signInWithBiometrics,
        isBiometricSupported,
        isBiometricEnrolled,
        hasSavedCredentials,
        getBiometricTypes
    } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyEmail, setVerifyEmail] = useState('');
    const [pendingPassword, setPendingPassword] = useState('');
    const [showBiometricModal, setShowBiometricModal] = useState(false);
    const [detectedBiometricType, setDetectedBiometricType] = useState('Biometrics');
    const isPromptingBiometrics = useRef(false);

    const { completeSocialLogin } = useAuth();

    useEffect(() => {
        const initializeAuth = async () => {
            // Prefill email
            const hasSaved = await hasSavedCredentials();
            if (hasSaved) {
                const savedEmail = await SecureStore.getItemAsync('auth_email');
                if (savedEmail) {
                    setEmail(savedEmail);
                }
            }

            // Check for preferred biometric method and auto-trigger
            const supported = await isBiometricSupported();
            const enrolled = await isBiometricEnrolled();

            if (supported && enrolled && hasSaved) {
                const preferredType = await AsyncStorage.getItem('last_biometric_type');
                if (preferredType) {
                    const authType = preferredType === 'FACE'
                        ? LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
                        : LocalAuthentication.AuthenticationType.FINGERPRINT;

                    // Small delay to ensure UI is ready before system prompt
                    setTimeout(() => {
                        performBiometricAuth(authType);
                    }, 500);
                }
            }
        };
        initializeAuth();
    }, []);

    const handleSignIn = async () => {
        if (!email || !password) {
            setError(t('auth.fillAllFields'));
            return;
        }

        setIsLoading(true);
        setError('');

        const result = await signIn(email, password);
        setIsLoading(true); // Still loading for navigation

        const isUnverified =
            result.isVerified === false ||
            (!result.success && result.error && (
                result.error.toLowerCase().includes('not verified') ||
                result.error.toLowerCase().includes('verify your account') ||
                result.error.toLowerCase().includes('unverified') ||
                result.error.toLowerCase().includes('account not verified') ||
                result.error.toLowerCase().includes('05')
            ));

        if (isUnverified) {
            setIsLoading(false);
            setVerifyEmail(email);
            setPendingPassword(password);

            try {
                const resendResponse = await apiService.resendVerify(email);
                if (resendResponse.success) {
                    toast.success(t('auth.verificationSent'));
                }
            } catch (error) { }

            setShowVerifyModal(true);
        } else if (result.success) {
            // Success handled by App state
        } else {
            setIsLoading(false);
            const errorMsg = result.error || t('auth.invalidCredentials');
            setError(errorMsg);
        }
    };

    const handleBiometricAuth = async () => {
        if (isPromptingBiometrics.current) return;

        const supported = await isBiometricSupported();
        const enrolled = await isBiometricEnrolled();
        const hasSaved = await hasSavedCredentials();

        if (supported && enrolled && hasSaved) {
            const types = await getBiometricTypes();
            setDetectedBiometricType(types[0] || 'Biometrics');
            setShowBiometricModal(true);
        }
    };

    const performBiometricAuth = async (type: LocalAuthentication.AuthenticationType) => {
        setShowBiometricModal(false);
        isPromptingBiometrics.current = true;

        try {
            setIsLoading(true);
            const result = await signInWithBiometrics(type);

            const isUnverified =
                result.isVerified === false ||
                (!result.success && result.error && (
                    result.error.toLowerCase().includes('not verified') ||
                    result.error.toLowerCase().includes('verify your account') ||
                    result.error.toLowerCase().includes('unverified') ||
                    result.error.toLowerCase().includes('account not verified') ||
                    result.error.toLowerCase().includes('05')
                ));

            if (isUnverified) {
                setVerifyEmail(email);
                const savedPassword = await SecureStore.getItemAsync('auth_password');
                if (savedPassword) setPendingPassword(savedPassword);

                try {
                    await apiService.resendVerify(email);
                    toast.success(t('auth.verificationSent'));
                } catch (e) { }

                setShowVerifyModal(true);
            } else if (result.success) {
                // Save preferred biometric type on success
                const typeKey = type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION ? 'FACE' : 'FINGERPRINT';
                await AsyncStorage.setItem('last_biometric_type', typeKey);

                toast.success(t('auth.signInSuccess'));
            } else {
                const errorMsg = result.error || t('auth.biometricFailed');
                if (!errorMsg.toLowerCase().includes('cancelled') && !errorMsg.toLowerCase().includes('failed')) {
                    toast.error(errorMsg);
                }
            }
        } catch (error) {
            toast.error(t('auth.biometricUnexpectedError'));
        } finally {
            setIsLoading(false);
            isPromptingBiometrics.current = false;
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'facebook') => {
        try {
            const gatewayUrl = API_CONFIG.BASE_URL.replace(/\/api$/, '');
            const authUrl = `${gatewayUrl}/oauth2/authorization/${provider}?source=login`;
            const redirectUrl = Linking.createURL('/oauth2/redirect');

            const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

            if (result.type === 'success' && result.url) {
                const url = result.url;
                if (url.includes('token=')) {
                    const tokenParts = url.split('token=');
                    if (tokenParts.length > 1) {
                        const token = tokenParts[1].split('&')[0];
                        const loginResult = await completeSocialLogin(token);
                        if (loginResult.success) {
                            toast.success(t('auth.signInSuccess'));
                        } else {
                            setError(loginResult.error || t('auth.socialLoginFailed'));
                        }
                    }
                } else if (url.includes('error=')) {
                    const errorParts = url.split('error=');
                    const errorMsg = errorParts.length > 1 ? decodeURIComponent(errorParts[1].split('&')[0]) : t('auth.socialLoginFailed');
                    setError(errorMsg);
                }
            }
        } catch (err: any) {
            setError(t('auth.socialLoginError'));
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Image
                            source={require('../assets/Logo.png')}
                            style={styles.logo}
                            contentFit="contain"
                        />
                        <Text style={[styles.title, { color: colors.text }]}>{t('auth.welcome')}</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            {t('auth.signInToContinue')}
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('auth.email')}</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <Feather name="mail" size={20} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder={t('auth.emailPlaceholder')}
                                    placeholderTextColor={colors.placeholder}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('auth.password')}</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <Feather name="lock" size={20} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder={t('auth.passwordPlaceholder')}
                                    placeholderTextColor={colors.placeholder}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    onFocus={handleBiometricAuth}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Feather
                                        name={showPassword ? 'eye' : 'eye-off'}
                                        size={20}
                                        color={colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Error Message */}
                        {error ? (
                            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                        ) : null}

                        {/* Forgot Password */}
                        <TouchableOpacity
                            style={styles.forgotPassword}
                            onPress={() => setShowForgotPassword(true)}
                        >
                            <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                                {t('auth.forgotPassword')}
                            </Text>
                        </TouchableOpacity>

                        {/* Sign In Button */}
                        <TouchableOpacity
                            style={styles.signInButtonContainer}
                            onPress={handleSignIn}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.primary, theme === 'dark' ? '#0099ff' : '#0077cc']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.signInButton}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={theme === 'dark' ? '#000' : '#fff'} />
                                ) : (
                                    <Text style={[styles.signInButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>
                                        {t('auth.signIn')}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.dividerContainer}>
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>{t('auth.or')}</Text>
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        </View>

                        {/* Social Sign In */}
                        <View style={styles.socialContainer}>
                            <TouchableOpacity
                                style={[styles.socialButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => handleSocialLogin('google')}
                            >
                                <Feather name="globe" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.socialButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => handleSocialLogin('facebook')}
                            >
                                <Feather name="facebook" size={24} color="#1877f2" />
                            </TouchableOpacity>
                        </View>

                        {/* Sign Up Link */}
                        <View style={styles.signUpContainer}>
                            <Text style={[styles.signUpText, { color: colors.textSecondary }]}>
                                {t('auth.noAccount')}{' '}
                            </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                                <Text style={[styles.signUpLink, { color: colors.primary }]}>{t('auth.signUp')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Biometric Modal */}
            <BiometricModal
                visible={showBiometricModal}
                onClose={() => setShowBiometricModal(false)}
                onAuthenticate={performBiometricAuth}
                biometricType={detectedBiometricType}
            />

            {/* Forgot Password Modal */}
            <ForgotPasswordModal
                visible={showForgotPassword}
                onClose={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                }}
                onSwitchToResetPassword={(email) => {
                    setResetEmail(email);
                    setShowForgotPassword(false);
                    setShowResetPassword(true);
                }}
            />

            {/* Reset Password Modal */}
            <ResetPasswordModal
                visible={showResetPassword}
                onClose={() => {
                    setShowResetPassword(false);
                    setResetEmail('');
                }}
                email={resetEmail}
            />

            {/* Verify Account Modal */}
            <VerifyAccountModal
                visible={showVerifyModal}
                onClose={() => {
                    setShowVerifyModal(false);
                    setVerifyEmail('');
                    setPendingPassword('');
                }}
                email={verifyEmail}
                onVerified={async () => {
                    // After verification, try to sign in again to get updated user data
                    setShowVerifyModal(false);
                    setIsLoading(true);

                    try {
                        const loginResult = await signIn(verifyEmail, pendingPassword);
                        setIsLoading(false);

                        if (loginResult.success) {
                            setPendingPassword('');
                        } else {
                            setError(loginResult.error || t('auth.verifiedFailedSignIn'));
                            setPendingPassword('');
                        }
                    } catch (error: any) {
                        setIsLoading(false);
                        setError(t('auth.verifiedFailedSignIn'));
                        setPendingPassword('');
                    }

                    setVerifyEmail('');
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 24,
    },
    header: {
        marginBottom: 30,
        alignItems: 'center',
    },
    logo: {
        width: 180,
        height: 60,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
    },
    form: {
        flex: 1,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
    },
    errorText: {
        fontSize: 14,
        marginBottom: 12,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        fontSize: 14,
        fontWeight: '600',
    },
    signInButtonContainer: {
        marginBottom: 24,
    },
    signInButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    signInButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    divider: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 14,
        fontWeight: '600',
    },
    socialContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 32,
    },
    socialButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    signUpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signUpText: {
        fontSize: 16,
    },
    signUpLink: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default SignIn;


