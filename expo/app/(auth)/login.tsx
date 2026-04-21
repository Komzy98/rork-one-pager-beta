import React, { useState, useRef } from 'react';
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
  Animated,
  ActivityIndicator
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Mail, Lock, Eye, EyeOff, Settings, Trash2, UserPlus, AlertCircle, CheckCircle, Scan, Fingerprint } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/colors';
import { LoginCredentials } from '@/types/habit';
import { checkAuthRateLimit, recordAuthAttempt, formatRetryMessage } from '@/utils/authRateLimiter';

interface ValidationErrors {
  email?: string;
  password?: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, signup, createDemoUser, clearAllData, continueAsGuest, biometricAuth, loginWithGoogle, googleAuthConfig } = useAuth();
  const insets = useSafeAreaInsets();




  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<boolean>(false);
  const [biometricLoading, setBiometricLoading] = useState<boolean>(false);
  const [enableBiometricAfterLogin, setEnableBiometricAfterLogin] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const successAnimation = useRef(new Animated.Value(0)).current;

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    if (!credentials.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(credentials.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!credentials.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (credentials.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      triggerShakeAnimation();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return false;
    }
    
    return true;
  };
  
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const triggerShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true })
    ]).start();
  };
  
  const triggerSuccessAnimation = () => {
    Animated.sequence([
      Animated.timing(successAnimation, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1000),
      Animated.timing(successAnimation, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start();
  };

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'lifesync',
    path: 'auth',
  });

  console.log('🔗 Google OAuth redirect URI:', redirectUri);

  const handleGoogleSignIn = async () => {
    if (!googleAuthConfig.isConfigured) {
      Alert.alert('Not Configured', 'Google Sign-In is not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your environment variables.');
      return;
    }

    const rateCheck = checkAuthRateLimit('login');
    if (!rateCheck.allowed) {
      Alert.alert('Too Many Attempts', formatRetryMessage(rateCheck.retryAfterSeconds!));
      return;
    }

    recordAuthAttempt('login');

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setGoogleLoading(true);

    try {
      const authUrl = `${googleAuthConfig.discovery.authorizationEndpoint}?client_id=${googleAuthConfig.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent('openid email profile')}`;

      console.log('🔑 Starting Google Sign-In...');
      console.log('📎 Redirect URI:', redirectUri);

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
        console.log('👤 Google user info received:', userInfo.email);

        const loginResult = await loginWithGoogle({
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name || userInfo.email.split('@')[0],
          picture: userInfo.picture,
        });

        if (loginResult.success) {
          setLoginSuccess(true);
          triggerSuccessAnimation();

          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }

          setTimeout(() => {
            router.replace('/(tabs)/activities' as any);
          }, 1200);
        } else {
          Alert.alert('Sign In Failed', loginResult.error || 'Please try again.');
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        console.log('🚫 Google Sign-In cancelled by user');
      }
    } catch (error) {
      console.error('💥 Google Sign-In error:', error);
      Alert.alert('Error', 'Google Sign-In failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricAuth.isEnabled || !biometricAuth.isAvailable) {
      return;
    }

    const rateCheck = checkAuthRateLimit('login');
    if (!rateCheck.allowed) {
      Alert.alert('Too Many Attempts', formatRetryMessage(rateCheck.retryAfterSeconds!));
      return;
    }

    recordAuthAttempt('login');
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setBiometricLoading(true);
    
    try {
      const result = await biometricAuth.authenticateWithBiometrics();
      
      if (result.success) {
        setLoginSuccess(true);
        triggerSuccessAnimation();
        
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        setTimeout(() => {
          router.replace('/(tabs)/activities' as any);
        }, 1200);
      } else if (result.error !== 'Authentication cancelled' && result.error !== 'User chose password fallback') {
        Alert.alert('Authentication Failed', result.error || 'Please try again');
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    } catch {
      Alert.alert('Error', 'Biometric authentication failed. Please try again.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleLogin = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (!validateForm()) {
      return;
    }

    const rateCheck = checkAuthRateLimit('login');
    if (!rateCheck.allowed) {
      const msg = formatRetryMessage(rateCheck.retryAfterSeconds!);
      setErrors({ password: msg });
      triggerShakeAnimation();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    recordAuthAttempt('login');

    setIsLoading(true);
    setErrors({});
    
    try {
      const result = await login(credentials);
      if (result.success) {
        // Enable biometric if user opted in and it's available
        if (enableBiometricAfterLogin && biometricAuth.isAvailable && !biometricAuth.isEnabled) {
          await biometricAuth.enableBiometric(credentials);
        }
        
        setLoginSuccess(true);
        triggerSuccessAnimation();
        
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        setTimeout(() => {
          router.replace('/(tabs)/activities' as any);
        }, 1200);
      } else {
        const errorMessage = result.error || 'Please try again';
        setErrors({ password: errorMessage });
        triggerShakeAnimation();
        
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    } catch {
      setErrors({ password: 'Something went wrong. Please try again.' });
      triggerShakeAnimation();
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  
  const handleFieldChange = (field: keyof LoginCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  const handleFieldFocus = (field: string) => {
    setFocusedField(field);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  
  const handleFieldBlur = () => {
    setFocusedField(null);
  };

  const handleCreateDemoUser = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    try {
      // Try to create demo user with Supabase first
      const demoCredentials = {
        email: 'demo@example.com',
        password: 'demo123',
        firstName: 'Demo',
        lastName: 'User'
      };
      
      const signupResult = await signup(demoCredentials);
      
      if (signupResult.success) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        Alert.alert(
          'Demo User Created with Supabase!', 
          'Demo user created successfully in Supabase.\n\nEmail: demo@example.com\nPassword: demo123\n\nYou are now logged in!',
          [{ text: 'OK' }]
        );
      } else if (signupResult.error?.includes('already exists') || signupResult.error?.includes('email-already-in-use')) {
        // User already exists, just fill credentials
        setCredentials({ email: 'demo@example.com', password: 'demo123' });
        setErrors({});
        
        Alert.alert(
          'Demo User Already Exists', 
          'Demo user already exists in Supabase.\n\nEmail: demo@example.com\nPassword: demo123\n\nCredentials filled for you!',
          [{ text: 'OK' }]
        );
      } else {
        // Fallback to local demo user creation
        const result = await createDemoUser();
        if (result.success) {
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          
          Alert.alert(
            'Demo User Created (Local)!', 
            'Demo user created locally as Supabase signup failed.\n\nEmail: demo@example.com\nPassword: demo123',
            [
              {
                text: 'Use Demo Credentials',
                onPress: () => {
                  setCredentials({ email: 'demo@example.com', password: 'demo123' });
                  setErrors({});
                }
              },
              { text: 'OK' }
            ]
          );
        } else {
          throw new Error(result.error || 'Failed to create demo user');
        }
      }
    } catch (error: any) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Error', error.message || 'Something went wrong creating demo user');
    }
  };

  const handleClearData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will remove all users and authentication data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              Alert.alert('Success', 'All data cleared');
              setCredentials({ email: '', password: '' });
            } catch {
              Alert.alert('Error', 'Failed to clear data');
            }
          }
        }
      ]
    );
  };
  
  const handleContinueAsGuest = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setIsLoading(true);
    
    try {
      const result = await continueAsGuest();
      if (result.success) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        setTimeout(() => {
          router.replace('/(onboarding)/welcome' as any);
        }, 500);
      } else {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert('Error', result.error || 'Failed to continue as guest');
      }
    } catch {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={{ uri: 'https://r2-pub.rork.com/attachments/fjpmfu4g76ll0wi3po34f' }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Enter your credentials to continue</Text>
        </View>

        <View style={styles.form}>
          <Animated.View style={[styles.inputContainer, { transform: [{ translateX: shakeAnimation }] }]}>
            <View style={[
              styles.inputWrapper,
              focusedField === 'email' && styles.inputWrapperFocused,
              errors.email && styles.inputWrapperError
            ]}>
              <Mail 
                size={20} 
                color={errors.email ? COLORS.error : focusedField === 'email' ? COLORS.primary : COLORS.textLight} 
                style={styles.inputIcon} 
              />
              <TextInput
                ref={emailInputRef}
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={COLORS.textLight}
                value={credentials.email}
                onChangeText={(text) => handleFieldChange('email', text)}
                onFocus={() => handleFieldFocus('email')}
                onBlur={handleFieldBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                testID="email-input"
              />
              {errors.email && (
                <AlertCircle size={20} color={COLORS.error} style={styles.errorIcon} />
              )}
            </View>
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </Animated.View>

          <Animated.View style={[styles.inputContainer, { transform: [{ translateX: shakeAnimation }] }]}>
            <View style={[
              styles.inputWrapper,
              focusedField === 'password' && styles.inputWrapperFocused,
              errors.password && styles.inputWrapperError
            ]}>
              <Lock 
                size={20} 
                color={errors.password ? COLORS.error : focusedField === 'password' ? COLORS.primary : COLORS.textLight} 
                style={styles.inputIcon} 
              />
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.textLight}
                value={credentials.password}
                onChangeText={(text) => handleFieldChange('password', text)}
                onFocus={() => handleFieldFocus('password')}
                onBlur={handleFieldBlur}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                testID="password-input"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => {
                  setShowPassword(!showPassword);
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                {showPassword ? (
                  <EyeOff size={20} color={COLORS.textLight} />
                ) : (
                  <Eye size={20} color={COLORS.textLight} />
                )}
              </TouchableOpacity>
              {errors.password && (
                <AlertCircle size={20} color={COLORS.error} style={styles.errorIcon} />
              )}
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </Animated.View>

          <TouchableOpacity
            style={[
              styles.loginButton, 
              (isLoading || loginSuccess) && styles.loginButtonDisabled,
              loginSuccess && styles.loginButtonSuccess
            ]}
            onPress={handleLogin}
            disabled={isLoading || loginSuccess}
            testID="login-button"
          >
            <View style={styles.loginButtonContent}>
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.card} style={styles.loadingSpinner} />
                  <Text style={styles.loginButtonText}>Signing In...</Text>
                </>
              ) : loginSuccess ? (
                <Animated.View style={[
                  styles.successContainer,
                  { opacity: successAnimation, transform: [{ scale: successAnimation }] }
                ]}>
                  <CheckCircle size={20} color={COLORS.card} style={styles.successIcon} />
                  <Text style={styles.loginButtonText}>Success!</Text>
                </Animated.View>
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </View>
          </TouchableOpacity>
          
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.googleButtonLoading]}
            onPress={handleGoogleSignIn}
            disabled={isLoading || loginSuccess || googleLoading}
            testID="google-signin-button"
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
                {googleLoading ? 'Signing in...' : 'Continue with Google'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Biometric Login Button */}
          {biometricAuth.isAvailable && biometricAuth.isEnabled && Platform.OS !== 'web' && (
            <TouchableOpacity
              style={[styles.biometricButton, biometricLoading && styles.biometricButtonActive]}
              onPress={handleBiometricLogin}
              disabled={isLoading || loginSuccess || biometricLoading}
              testID="biometric-button"
            >
              <View style={styles.biometricButtonContent}>
                {biometricLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} style={styles.biometricIcon} />
                ) : biometricAuth.biometricType === 'FaceID' ? (
                  <Scan size={22} color={COLORS.primary} style={styles.biometricIcon} />
                ) : (
                  <Fingerprint size={22} color={COLORS.primary} style={styles.biometricIcon} />
                )}
                <Text style={styles.biometricButtonText}>
                  {biometricAuth.biometricType === 'FaceID' ? 'Sign in with Face ID' : 
                   biometricAuth.biometricType === 'TouchID' ? 'Sign in with Touch ID' :
                   'Sign in with Fingerprint'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          
          {/* Enable biometric toggle - show only if available and not yet enabled */}
          {biometricAuth.isAvailable && !biometricAuth.isEnabled && Platform.OS !== 'web' && (
            <TouchableOpacity
              style={styles.biometricToggle}
              onPress={() => {
                setEnableBiometricAfterLogin(!enableBiometricAfterLogin);
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
            >
              <View style={[styles.checkbox, enableBiometricAfterLogin && styles.checkboxChecked]}>
                {enableBiometricAfterLogin && <CheckCircle size={16} color={COLORS.card} />}
              </View>
              <Text style={styles.biometricToggleText}>
                Enable {biometricAuth.biometricType === 'FaceID' ? 'Face ID' : 
                        biometricAuth.biometricType === 'TouchID' ? 'Touch ID' : 'Fingerprint'} for future logins
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleContinueAsGuest}
            disabled={isLoading || loginSuccess}
            testID="guest-button"
          >
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </TouchableOpacity>
          
          <View style={styles.signupPrompt}>
            <Text style={styles.signupText}>Don&apos;t have an account? </Text>
            <Link href={"/(auth)/signup" as any} asChild>
              <TouchableOpacity>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Debug Panel */}
          <View style={styles.debugSection}>
            <TouchableOpacity
              style={styles.debugToggle}
              onPress={() => setShowDebugPanel(!showDebugPanel)}
            >
              <Settings size={16} color={COLORS.textLight} />
              <Text style={styles.debugToggleText}>Debug Panel</Text>
            </TouchableOpacity>
            
            {showDebugPanel && (
              <View style={styles.debugPanel}>
                <Text style={styles.debugTitle}>Development Tools</Text>
                
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={handleCreateDemoUser}
                >
                  <UserPlus size={16} color={COLORS.primary} />
                  <Text style={styles.debugButtonText}>Create Demo User</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={() => {
                    setCredentials({ email: 'demo@example.com', password: 'demo123' });
                    setErrors({});
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <Mail size={16} color={COLORS.primary} />
                  <Text style={styles.debugButtonText}>Fill Demo Credentials</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={async () => {
                    setCredentials({ email: 'demo@example.com', password: 'demo123' });
                    setErrors({});
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    
                    // Auto-login with demo credentials
                    setIsLoading(true);
                    try {
                      const result = await login({ email: 'demo@example.com', password: 'demo123' });
                      if (result.success) {
                        setLoginSuccess(true);
                        triggerSuccessAnimation();
                        
                        if (Platform.OS !== 'web') {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                        
                        setTimeout(() => {
                          router.replace('/(tabs)/activities' as any);
                        }, 1200);
                      } else {
                        Alert.alert('Login Failed', result.error || 'Please try again');
                      }
                    } catch {
                      Alert.alert('Error', 'Something went wrong. Please try again.');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  <CheckCircle size={16} color={COLORS.primary} />
                  <Text style={styles.debugButtonText}>Quick Login (Demo)</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonDanger]}
                  onPress={handleClearData}
                >
                  <Trash2 size={16} color={COLORS.error || '#ff4444'} />
                  <Text style={[styles.debugButtonText, styles.debugButtonDangerText]}>Clear All Data</Text>
                </TouchableOpacity>
                
                <Text style={styles.debugInfo}>
                  Demo credentials:{"\n"}
                  Email: demo@example.com{"\n"}
                  Password: demo123
                </Text>
              </View>
            )}
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
  },
  logo: {
    width: '100%',
    height: '100%',
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
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
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
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  signupLink: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  debugSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  debugToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  debugToggleText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 8,
  },
  debugPanel: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 8,
  },
  debugButtonDanger: {
    borderColor: COLORS.error || '#ff4444',
  },
  debugButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 8,
    fontWeight: '500',
  },
  debugButtonDangerText: {
    color: COLORS.error || '#ff4444',
  },
  debugInfo: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  keyboardContainer: {
    flex: 1,
  },
  inputWrapperFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  inputWrapperError: {
    borderColor: COLORS.error || '#ff4444',
    borderWidth: 2,
  },
  errorIcon: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error || '#ff4444',
    marginTop: 8,
    marginLeft: 16,
  },
  loginButtonSuccess: {
    backgroundColor: '#22c55e',
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    marginRight: 8,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    marginRight: 8,
  },
  biometricButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  biometricButtonActive: {
    backgroundColor: COLORS.primary + '10',
  },
  biometricButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricIcon: {
    marginRight: 8,
  },
  biometricButtonText: {
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
    marginBottom: 12,
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
  guestButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  biometricToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  biometricToggleText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
});