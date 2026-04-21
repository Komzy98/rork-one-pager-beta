import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator
} from 'react-native';
import { Link, router } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Mail, Lock, User, Eye, EyeOff, UserPlus, Apple } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/colors';
import { SignupCredentials } from '@/types/habit';
import { checkAuthRateLimit, recordAuthAttempt, formatRetryMessage } from '@/utils/authRateLimiter';

export default function SignupScreen() {
  const { signup, loginWithGoogle, loginWithApple, googleAuthConfig } = useAuth();
  const [credentials, setCredentials] = useState<SignupCredentials>({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [appleLoading, setAppleLoading] = useState<boolean>(false);
  const [appleAvailable, setAppleAvailable] = useState<boolean>(false);

  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
    }
  }, []);

  const handleAppleSignUp = async () => {
    const rateCheck = checkAuthRateLimit('signup');
    if (!rateCheck.allowed) {
      Alert.alert('Too Many Attempts', formatRetryMessage(rateCheck.retryAfterSeconds!));
      return;
    }
    recordAuthAttempt('signup');

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const result = await loginWithApple({
        id: credential.user,
        email: credential.email,
        fullName: credential.fullName ? {
          givenName: credential.fullName.givenName,
          familyName: credential.fullName.familyName,
        } : null,
      });

      if (result.success) {
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.replace('/(onboarding)/welcome' as any);
      } else {
        Alert.alert('Sign Up Failed', result.error || 'Please try again.');
      }
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        console.log('Apple sign-in cancelled');
      } else {
        console.error('Apple Sign-Up error:', error);
        Alert.alert('Error', 'Apple Sign-Up failed. Please try again.');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'lifesync',
    path: 'auth',
  });

  console.log('🔗 Google OAuth redirect URI:', redirectUri);

  const handleGoogleSignUp = async () => {
    if (!googleAuthConfig.isConfigured) {
      Alert.alert('Not Configured', 'Google Sign-In is not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your environment variables.');
      return;
    }

    const rateCheck = checkAuthRateLimit('signup');
    if (!rateCheck.allowed) {
      Alert.alert('Too Many Attempts', formatRetryMessage(rateCheck.retryAfterSeconds!));
      return;
    }

    recordAuthAttempt('signup');

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setGoogleLoading(true);

    try {
      const authUrl = `${googleAuthConfig.discovery.authorizationEndpoint}?client_id=${googleAuthConfig.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent('openid email profile')}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        const params = new URLSearchParams(result.url.split('#')[1] || '');
        const accessToken = params.get('access_token');

        if (!accessToken) {
          Alert.alert('Error', 'Failed to get access token from Google.');
          return;
        }

        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userInfoResponse.ok) {
          throw new Error('Failed to fetch Google user info');
        }

        const userInfo = await userInfoResponse.json();

        const loginResult = await loginWithGoogle({
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name || userInfo.email.split('@')[0],
          picture: userInfo.picture,
        });

        if (loginResult.success) {
          if (Platform.OS !== 'web') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          router.replace('/(onboarding)/welcome' as any);
        } else {
          Alert.alert('Sign Up Failed', loginResult.error || 'Please try again.');
        }
      }
    } catch (error) {
      console.error('Google Sign-Up error:', error);
      Alert.alert('Error', 'Google Sign-Up failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!credentials.firstName.trim() || !credentials.lastName.trim() || !credentials.email.trim() || !credentials.password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!credentials.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (credentials.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (credentials.password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const rateCheck = checkAuthRateLimit('signup');
    if (!rateCheck.allowed) {
      Alert.alert('Too Many Attempts', formatRetryMessage(rateCheck.retryAfterSeconds!));
      return;
    }

    recordAuthAttempt('signup');

    setIsLoading(true);
    try {
      const result = await signup(credentials);
      if (result.success) {
        router.replace('/(onboarding)/welcome' as any);
      } else {
        Alert.alert('Signup Failed', result.error || 'Please try again');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <UserPlus size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join us and start your personalised journey</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <User size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="First name"
                placeholderTextColor={COLORS.textLight}
                value={credentials.firstName}
                onChangeText={(text) => setCredentials(prev => ({ ...prev, firstName: text }))}
                autoCapitalize="words"
                testID="first-name-input"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <User size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Last name"
                placeholderTextColor={COLORS.textLight}
                value={credentials.lastName}
                onChangeText={(text) => setCredentials(prev => ({ ...prev, lastName: text }))}
                autoCapitalize="words"
                testID="last-name-input"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Mail size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={COLORS.textLight}
                value={credentials.email}
                onChangeText={(text) => setCredentials(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                testID="email-input"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Lock size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.textLight}
                value={credentials.password}
                onChangeText={(text) => setCredentials(prev => ({ ...prev, password: text }))}
                secureTextEntry={!showPassword}
                testID="password-input"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} color={COLORS.textLight} />
                ) : (
                  <Eye size={20} color={COLORS.textLight} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Lock size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={COLORS.textLight}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                testID="confirm-password-input"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color={COLORS.textLight} />
                ) : (
                  <Eye size={20} color={COLORS.textLight} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
            testID="signup-button"
          >
            <Text style={styles.signupButtonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {Platform.OS === 'ios' && appleAvailable && (
            <TouchableOpacity
              style={[styles.appleButton, appleLoading && styles.googleButtonLoading]}
              onPress={handleAppleSignUp}
              disabled={isLoading || appleLoading || googleLoading}
              testID="apple-signup-button"
              activeOpacity={0.8}
            >
              <View style={styles.googleButtonContent}>
                {appleLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.googleIcon} />
                ) : (
                  <Apple size={20} color="#FFFFFF" fill="#FFFFFF" style={styles.googleIcon} />
                )}
                <Text style={styles.appleButtonText}>
                  {appleLoading ? 'Signing up...' : 'Sign up with Apple'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.googleButtonLoading]}
            onPress={handleGoogleSignUp}
            disabled={isLoading || googleLoading || appleLoading}
            testID="google-signup-button"
          >
            <View style={styles.googleButtonContent}>
              {googleLoading ? (
                <ActivityIndicator size="small" color={COLORS.text} style={styles.googleIcon} />
              ) : (
                <Image
                  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                  style={styles.googleLogo}
                />
              )}
              <Text style={styles.googleButtonText}>
                {googleLoading ? 'Signing up...' : 'Sign up with Google'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.loginPrompt}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href={"/(auth)/login" as any} asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  eyeIcon: {
    padding: 4,
  },
  signupButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.card,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginHorizontal: 16,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  loginLink: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  googleButton: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  googleButtonLoading: {
    opacity: 0.7,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogo: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});