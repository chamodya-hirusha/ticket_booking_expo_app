import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../../services/api';
import { handleApiError } from '../../utils/apiErrorHandler';
import { toast } from '../../services/toast';

// ========== SIGN IN MODAL ==========
interface SignInModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToSignUp?: () => void;
  onSwitchToForgotPassword?: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  visible,
  onClose,
  onSwitchToSignUp,
  onSwitchToForgotPassword,
}) => {
  const { colors, theme } = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await signIn(email, password);
    setIsLoading(false);

    if (result.success) {
      onClose();
      setEmail('');
      setPassword('');
    } else {
      setError(result.error || 'Invalid email or password');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
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
              {onSwitchToForgotPassword && (
                <TouchableOpacity style={styles.forgotPassword} onPress={onSwitchToForgotPassword}>
                  <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              )}

              {/* Sign In Button */}
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={handleSignIn}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, theme === 'dark' ? '#0099ff' : '#0077cc']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme === 'dark' ? '#000' : '#fff'} />
                  ) : (
                    <Text style={[styles.buttonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>
                      Sign In
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign Up Link */}
              {onSwitchToSignUp && (
                <View style={styles.switchContainer}>
                  <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                    Don't have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={onSwitchToSignUp}>
                    <Text style={[styles.switchLink, { color: colors.primary }]}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ========== SIGN UP MODAL ==========
interface SignUpModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToSignIn?: () => void;
  onSwitchToVerify?: (email: string) => void;
}

export const SignUpModal: React.FC<SignUpModalProps> = ({
  visible,
  onClose,
  onSwitchToSignIn,
  onSwitchToVerify,
}) => {
  const { colors, theme } = useTheme();
  const { signUp } = useAuth();
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

  const handleSignUp = async () => {
    if (!name || !email || !phone || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await signUp(name, email, password, phone);
    setIsLoading(false);

    if (result.success) {
      if (onSwitchToVerify) {
        onSwitchToVerify(email);
      } else {
        onClose();
        Alert.alert('Success', 'Account created successfully!');
      }
    } else {
      setError(result.error || 'Failed to create account. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Sign up to get started
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Name Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <Feather name="user" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.placeholder}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

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

              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <Feather name="phone" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your phone number"
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
                <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <Feather name="lock" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Create a password"
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

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <Feather name="lock" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Confirm your password"
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
                  I agree to the{' '}
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>Terms & Conditions</Text>
                </Text>
              </TouchableOpacity>

              {/* Error Message */}
              {error ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              ) : null}

              {/* Sign Up Button */}
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={handleSignUp}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, theme === 'dark' ? '#0099ff' : '#0077cc']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme === 'dark' ? '#000' : '#fff'} />
                  ) : (
                    <Text style={[styles.buttonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>
                      Sign Up
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign In Link */}
              {onSwitchToSignIn && (
                <View style={styles.switchContainer}>
                  <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                    Already have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={onSwitchToSignIn}>
                    <Text style={[styles.switchLink, { color: colors.primary }]}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ========== FORGOT PASSWORD MODAL ==========
interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToResetPassword?: (email: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  visible,
  onClose,
  onSwitchToResetPassword,
}) => {
  const { colors, theme } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess(false);

    const response = await apiService.forgotPassword(email);
    setIsLoading(false);

    if (response.success) {
      setSuccess(true);
      if (onSwitchToResetPassword) {
        setTimeout(() => {
          onSwitchToResetPassword(email);
        }, 1500);
      }
    } else {
      setError(response.error || 'Failed to send reset code. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: colors.text }]}>Forgot Password</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter your email to receive a reset code
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
                    editable={!success}
                  />
                </View>
              </View>

              {/* Success Message */}
              {success && (
                <View style={[styles.successContainer, { backgroundColor: colors.primary + '20' }]}>
                  <Feather name="check-circle" size={20} color={colors.primary} />
                  <Text style={[styles.successText, { color: colors.primary }]}>
                    Reset code sent to your email!
                  </Text>
                </View>
              )}

              {/* Error Message */}
              {error ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              ) : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={handleForgotPassword}
                disabled={isLoading || success}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, theme === 'dark' ? '#0099ff' : '#0077cc']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.button, { opacity: success ? 0.6 : 1 }]}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme === 'dark' ? '#000' : '#fff'} />
                  ) : (
                    <Text style={[styles.buttonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>
                      {success ? 'Code Sent!' : 'Send Reset Code'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ========== RESET PASSWORD MODAL ==========
interface ResetPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  email: string;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  visible,
  onClose,
  email,
}) => {
  const { colors, theme } = useTheme();
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async () => {
    if (!otp || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    const response = await apiService.resetPassword(email, password, otp);
    setIsLoading(false);

    if (response.success) {
      Alert.alert('Success', 'Password reset successfully!', [
        { text: 'OK', onPress: onClose }
      ]);
    } else {
      const errorMsg = response.error || 'Failed to reset password. Please check your OTP and try again.';
      
      // Check for same password error
      if (errorMsg.toLowerCase().includes('same password') || 
          errorMsg.toLowerCase().includes('password is the same') ||
          errorMsg.toLowerCase().includes('new password must be different')) {
        toast.error('Please use a different password. The new password must be different from your current password.');
        setError('');
      } else {
        setError(errorMsg);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter the code sent to your email and your new password
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* OTP Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Verification Code</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <Feather name="key" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={colors.placeholder}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>New Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <Feather name="lock" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter new password"
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

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm New Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <Feather name="lock" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Confirm new password"
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

              {/* Error Message */}
              {error ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              ) : null}

              {/* Reset Button */}
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={handleResetPassword}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, theme === 'dark' ? '#0099ff' : '#0077cc']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme === 'dark' ? '#000' : '#fff'} />
                  ) : (
                    <Text style={[styles.buttonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>
                      Reset Password
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ========== VERIFY ACCOUNT MODAL ==========
interface VerifyAccountModalProps {
  visible: boolean;
  onClose: () => void;
  email: string;
  onVerified?: () => void;
}

export const VerifyAccountModal: React.FC<VerifyAccountModalProps> = ({
  visible,
  onClose,
  email,
  onVerified,
}) => {
  const { colors, theme } = useTheme();
  const { signIn } = useAuth();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      console.log('[VerifyAccountModal] Modal opened for email:', email);
      setOtp('');
      setError('');
      setSuccess(false);
    }
  }, [visible, email]);

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await apiService.verifyAccount(email, otp);
      
      if (__DEV__) {
        console.log('[VerifyAccountModal] Verification response:', {
          success: response.success,
          hasData: !!response.data,
          dataKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : [],
          error: response.error,
          message: response.message,
        });
      }

      if (response.success) {
        setSuccess(true);
        
        // After verification, automatically log the user in
        // We need the password, but we don't have it here. 
        // For now, just show success and let user login manually
        // TODO: Store password temporarily or use a different flow
        
        if (onVerified) {
          setTimeout(() => {
            onVerified();
          }, 1500);
        } else {
          Alert.alert('Success', 'Account verified successfully! You can now sign in.', [
            { text: 'OK', onPress: onClose }
          ]);
        }
      } else {
        // Use handleApiError to extract user-friendly error message
        const status = response.data?._status;
        const errorMessage = handleApiError(response.data || response, status, false); // Don't show toast, show in modal
        
        setError(errorMessage);
      }
    } catch (error: any) {
      console.error('[VerifyAccountModal] Verification error:', error);
      setError(error.message || 'An error occurred during verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setError('');

    const response = await apiService.resendVerify(email);
    setIsResending(false);

    if (response.success) {
      Alert.alert('Success', 'Verification code resent to your email!');
    } else {
      setError(response.error || 'Failed to resend code. Please try again.');
    }
  };

  // Debug log
  useEffect(() => {
    console.log('[VerifyAccountModal] visible:', visible, 'email:', email);
  }, [visible, email]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Feather name="mail" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Verify Your Account</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                We've sent a 6-digit code to{'\n'}
                <Text style={{ fontWeight: '600' }}>{email}</Text>
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* OTP Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Verification Code</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <Feather name="key" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text, fontSize: 18, letterSpacing: 8, textAlign: 'center' }]}
                    placeholder="000000"
                    placeholderTextColor={colors.placeholder}
                    value={otp}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, '');
                      setOtp(numericText);
                      setError('');
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!success}
                  />
                </View>
              </View>

              {/* Success Message */}
              {success && (
                <View style={[styles.successContainer, { backgroundColor: colors.primary + '20' }]}>
                  <Feather name="check-circle" size={20} color={colors.primary} />
                  <Text style={[styles.successText, { color: colors.primary }]}>
                    Account verified successfully!
                  </Text>
                </View>
              )}

              {/* Error Message */}
              {error ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              ) : null}

              {/* Verify Button */}
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={handleVerify}
                disabled={isLoading || success}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, theme === 'dark' ? '#0099ff' : '#0077cc']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.button, { opacity: success ? 0.6 : 1 }]}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme === 'dark' ? '#000' : '#fff'} />
                  ) : (
                    <Text style={[styles.buttonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>
                      {success ? 'Verified!' : 'Verify Account'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Resend Code */}
              <TouchableOpacity
                style={styles.resendContainer}
                onPress={handleResendCode}
                disabled={isResending || success}
              >
                <Text style={[styles.resendText, { color: colors.primary }]}>
                  {isResending ? 'Sending...' : "Didn't receive code? Resend"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ========== SHARED STYLES ==========
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    width: '100%',
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
    marginTop: -8,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    marginBottom: 24,
  },
  button: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 16,
  },
  switchLink: {
    fontSize: 16,
    fontWeight: 'bold',
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
  resendContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
