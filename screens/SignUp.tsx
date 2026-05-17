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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { VerifyAccountModal } from '../components/modals/AuthModals';
import { toast } from '../services/toast';
import { useLanguage } from '../context/LanguageContext';

// Requirement Item Component
const RequirementItem = ({ met, text, colors }: { met: boolean; text: string; colors: any }) => (
    <View style={styles.requirementItem}>
        <Feather
            name={met ? 'check-circle' : 'circle'}
            size={14}
            color={met ? '#4CAF50' : colors.textSecondary}
        />
        <Text style={[styles.requirementText, { color: met ? '#4CAF50' : colors.textSecondary }]}>
            {text}
        </Text>
    </View>
);

const SignUp = ({ navigation }: any) => {
    const { colors, theme } = useTheme();
    const { t } = useLanguage();
    const { signUp, signIn } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyEmail, setVerifyEmail] = useState('');
    const [pendingPassword, setPendingPassword] = useState(''); 

    // Password validation function
    const validatePassword = (pwd: string): { isValid: boolean; error?: string } => {
        if (pwd.length < 6) {
            return { isValid: false, error: t('auth.reqLength') };
        }
        
        const hasUpperCase = /[A-Z]/.test(pwd);
        const hasLowerCase = /[a-z]/.test(pwd);
        const hasNumber = /[0-9]/.test(pwd);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
        
        if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
            return {
                isValid: false,
                error: t('auth.invalidPassword')
            };
        }
        
        return { isValid: true };
    };

    // Get password requirements status
    const getPasswordRequirements = (pwd: string) => {
        return {
            length: pwd.length >= 6,
            uppercase: /[A-Z]/.test(pwd),
            lowercase: /[a-z]/.test(pwd),
            number: /[0-9]/.test(pwd),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
        };
    };

    const passwordRequirements = getPasswordRequirements(password);

    const handleSignUp = async () => {
        if (!name || !email || !phone || !password || !confirmPassword) {
            setError(t('auth.fillAllFields'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('auth.passwordsDoNotMatch'));
            return;
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            setError(passwordValidation.error || t('auth.invalidPassword'));
            return;
        }

        if (!agreedToTerms) {
            setError(t('auth.agreeTerms'));
            return;
        }

        setIsLoading(true);
        setError('');

        const result = await signUp(name, email, password, phone);
        setIsLoading(false);
        
        if (result.success) {
            // Show verification modal instead of auto-login
            console.log('[SignUp] Registration successful, showing verification modal');
            setVerifyEmail(email);
            setPendingPassword(password); 
            setShowVerifyModal(true);
            // Clear form (but keep password for auto-login)
            setName('');
            setPassword('');
            setConfirmPassword('');
            setPhone('');
            setError('');
        } else {
            const errorMsg = result.error || t('auth.verifiedFailedSignIn');
            
            // Check for email already use error
            const errorMsgLower = errorMsg.toLowerCase();
            if (errorMsgLower.includes('email') && 
                (errorMsgLower.includes('already') || 
                 errorMsgLower.includes('duplicate') ||
                 errorMsgLower.includes('use') ||
                 errorMsgLower.includes('registered'))) {
                toast.error(t('auth.emailInUse'));
                setError('');
            } else {
                setError(errorMsg);
            }
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
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Feather name="arrow-left" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: colors.text }]}>{t('auth.createAccount')}</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            {t('auth.signUpToGetStarted')}
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Name Input */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('auth.name')}</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <Feather name="user" size={20} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder={t('auth.namePlaceholder')}
                                    placeholderTextColor={colors.placeholder}
                                    value={name}
                                    onChangeText={setName}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

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

                        {/* Phone Input */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('auth.phone')}</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <Feather name="phone" size={20} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder={t('auth.phonePlaceholder')}
                                    placeholderTextColor={colors.placeholder}
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                    autoCapitalize="none"
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
                                    placeholder={t('auth.createPassword')}
                                    placeholderTextColor={colors.placeholder}
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        setError(''); 
                                    }}
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
                            {/* Password Requirements */}
                            {password.length > 0 && (
                                <View style={styles.requirementsContainer}>
                                    <Text style={[styles.requirementsTitle, { color: colors.textSecondary }]}>
                                        {t('auth.passwordMustContain')}
                                    </Text>
                                    <RequirementItem
                                        met={passwordRequirements.length}
                                        text={t('auth.reqLength')}
                                        colors={colors}
                                    />
                                    <RequirementItem
                                        met={passwordRequirements.uppercase}
                                        text={t('auth.reqUppercase')}
                                        colors={colors}
                                    />
                                    <RequirementItem
                                        met={passwordRequirements.lowercase}
                                        text={t('auth.reqLowercase')}
                                        colors={colors}
                                    />
                                    <RequirementItem
                                        met={passwordRequirements.number}
                                        text={t('auth.reqNumber')}
                                        colors={colors}
                                    />
                                    <RequirementItem
                                        met={passwordRequirements.special}
                                        text={t('auth.reqSpecial')}
                                        colors={colors}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Confirm Password Input */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('auth.confirmPassword')}</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <Feather name="lock" size={20} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder={t('auth.confirmPasswordPlaceholder')}
                                    placeholderTextColor={colors.placeholder}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    <Feather
                                        name={showConfirmPassword ? 'eye' : 'eye-off'}
                                        size={20}
                                        color={colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Terms and Conditions */}
                        <TouchableOpacity
                            style={styles.termsContainer}
                            onPress={() => setAgreedToTerms(!agreedToTerms)}
                        >
                            <View style={[
                                styles.checkbox,
                                {
                                    backgroundColor: agreedToTerms ? colors.primary : 'transparent',
                                    borderColor: agreedToTerms ? colors.primary : colors.border
                                }
                            ]}>
                                {agreedToTerms && <Feather name="check" size={16} color={theme === 'dark' ? '#000' : '#fff'} />}
                            </View>
                            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                                {t('auth.iAgreeTo')}{' '}
                                <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('auth.termsAndConditions')}</Text>
                            </Text>
                        </TouchableOpacity>

                        {/* Error Message */}
                        {error ? (
                            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                        ) : null}

                        {/* Sign Up Button */}
                        <TouchableOpacity
                            style={styles.signUpButtonContainer}
                            onPress={handleSignUp}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.primary, theme === 'dark' ? '#0099ff' : '#0077cc']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.signUpButton}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={theme === 'dark' ? '#000' : '#fff'} />
                                ) : (
                                    <Text style={[styles.signUpButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>
                                        {t('auth.signUp')}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Sign In Link */}
                        <View style={styles.signInContainer}>
                            <Text style={[styles.signInText, { color: colors.textSecondary }]}>
                                {t('auth.hasAccount')}{' '}
                            </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                                <Text style={[styles.signInLink, { color: colors.primary }]}>{t('auth.signIn')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

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
                    // After verification, try to auto-login using stored password
                    setShowVerifyModal(false);
                    setIsLoading(true);
                    
                    try {
                        const loginResult = await signIn(verifyEmail, pendingPassword);
                        setIsLoading(false);
                        
                        if (loginResult.success) {
                            console.log('[SignUp] Verification and auto-login successful');
                            setPendingPassword('');
                        } else {
                            setError(t('auth.verifiedFailedSignInManual'));
                            setPendingPassword(''); 
                        }
                    } catch (error: any) {
                        setIsLoading(false);
                        setError(t('auth.verifiedFailedSignInManual'));
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
        paddingTop: 20,
        paddingBottom: 24,
    },
    header: {
        marginBottom: 32,
    },
    backButton: {
        marginBottom: 16,
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
        marginBottom: 16,
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
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    termsText: {
        flex: 1,
        fontSize: 14,
    },
    errorText: {
        fontSize: 14,
        marginBottom: 12,
    },
    signUpButtonContainer: {
        marginBottom: 24,
    },
    signUpButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    signUpButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    signInContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signInText: {
        fontSize: 16,
    },
    signInLink: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    requirementsContainer: {
        marginTop: 8,
        padding: 12,
        borderRadius: 8,
        backgroundColor: 'transparent',
    },
    requirementsTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    requirementText: {
        fontSize: 12,
    },
});

export default SignUp;


