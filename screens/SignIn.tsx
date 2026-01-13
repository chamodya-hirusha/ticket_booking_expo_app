import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { API_CONFIG } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ForgotPasswordModal, ResetPasswordModal, VerifyAccountModal } from '../components/modals/AuthModals';
import { apiService } from '../services/api';
import { toast } from '../services/toast';

const SignIn = ({ navigation }: any) => {
    const { colors, theme } = useTheme();
    const { signIn } = useAuth();
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

    const { completeSocialLogin } = useAuth();

    const handleSignIn = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        setError('');

        const result = await signIn(email, password);
        setIsLoading(false);

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
            // Account not verified, send verification code ONCE and show verify modal
            setVerifyEmail(email);
            setPendingPassword(password); 

            // Automatically send verification code email (only once)
            try {
                const resendResponse = await apiService.resendVerify(email);
                if (resendResponse.success) {
                    toast.success('Verification code sent to your email');
                }
            } catch (error) {
                // Still show modal even if resend fails (user can resend from modal)
            }

            setShowVerifyModal(true);
        } else if (result.success) {
            // Account verified, navigation will be handled by App.tsx based on auth state
        } else {
            // Other errors - check for specific error messages
            const errorMsg = result.error || 'Invalid email or password';

            const isIgnoredError = errorMsg.toLowerCase().includes('invalid credentials');

            if (isIgnoredError) {
                // Silently ignore this error - it's a normal invalid login attempt
                setError('Invalid email or password');
            } else if (errorMsg.toLowerCase().includes('email') &&
                (errorMsg.toLowerCase().includes('already') ||
                    errorMsg.toLowerCase().includes('duplicate') ||
                    errorMsg.toLowerCase().includes('use'))) {
                // Check for email already use error
                toast.error('Email already in use. Please use a different email.');
            } else {
                setError(errorMsg);
            }
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'facebook') => {
        try {
            // Use the gateway URL (base URL without /api suffix)
            const gatewayUrl = API_CONFIG.BASE_URL.replace(/\/api$/, '');
            const authUrl = `${gatewayUrl}/oauth2/authorization/${provider}?source=login`;

            const redirectUrl = Linking.createURL('/oauth2/redirect');

            if (__DEV__) {
                console.log(`[SignIn] Starting ${provider} login with WebBrowser:`, authUrl);
                console.log(`[SignIn] Expected redirect URL:`, redirectUrl);
            }

            const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

            if (__DEV__) {
                console.log(`[SignIn] WebBrowser result type:`, result.type);
            }

            if (result.type === 'success' && result.url) {
                // The result.url contains the full redirection URL including the token
                const url = result.url;
                if (__DEV__) {
                    console.log(`[SignIn] Successful redirect URL:`, url);
                }

                if (url.includes('token=')) {
                    const tokenParts = url.split('token=');
                    if (tokenParts.length > 1) {
                        const token = tokenParts[1].split('&')[0];

                        if (__DEV__) {
                            console.log('[SignIn] Token extracted from WebBrowser redirect, length:', token.length);
                        }

                        const loginResult = await completeSocialLogin(token);
                        if (loginResult.success) {
                            toast.success('Signed in successfully!');
                        } else {
                            setError(loginResult.error || 'Failed to complete social login');
                        }
                    }
                } else if (url.includes('error=')) {
                    const errorParts = url.split('error=');
                    const errorMsg = errorParts.length > 1 ? decodeURIComponent(errorParts[1].split('&')[0]) : 'Social login failed';
                    setError(errorMsg);
                }
            } else if (result.type === 'cancel') {
                if (__DEV__) {
                    console.log('[SignIn] Social login cancelled by user');
                }
            }
        } catch (err: any) {
            console.error('[SignIn] WebBrowser error:', err);
            setError('An error occurred during social login. Please try again.');
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
                        <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Sign in to continue
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <Feather name="mail" size={20} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="Enter your email"
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
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <Feather name="lock" size={20} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="Enter your password"
                                    placeholderTextColor={colors.placeholder}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
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
                                Forgot Password?
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
                                        Sign In
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.dividerContainer}>
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
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
                                Don't have an account?{' '}
                            </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                                <Text style={[styles.signUpLink, { color: colors.primary }]}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

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
                            setError(loginResult.error || 'Account verified but failed to sign in. Please try again.');
                            setPendingPassword(''); 
                        }
                    } catch (error: any) {
                        setIsLoading(false);
                        setError('Account verified but failed to sign in. Please try again.');
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
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
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


