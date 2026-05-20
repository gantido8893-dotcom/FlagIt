import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  checkUsernameAvailability,
  signUp,
  signInWithGoogle,
  signInWithFacebook,
} from '../services/authService';
import type { AuthStackScreenProps } from '../navigation/AuthNavigator';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AuthStackScreenProps<'SignUp'>['navigation']>();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [usernameChecking, setUsernameChecking] = useState(false);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const toggleShowPassword = () => {
    setShowPassword((prev) => {
      const next = !prev;
      if (next) {
        setConfirmPassword('');
        setShowConfirmPassword(false);
        setConfirmPasswordError('');
      }
      return next;
    });
  };

  const handleUsernameBlur = async () => {
    const trimmed = username.trim();
    if (!trimmed) return;

    setUsernameChecking(true);
    const { available, error } = await checkUsernameAvailability(trimmed);
    setUsernameChecking(false);

    if (error) return;

    if (!available) {
      setUsernameError('Username already exists');
    } else {
      setUsernameError('');
    }
  };

  const handleSignUp = async () => {
    setEmailError('');
    setUsernameError('');
    setPasswordError('');
    setConfirmPasswordError('');

    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    let hasError = false;

    if (!trimmedEmail) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!isValidEmail(trimmedEmail)) {
      setEmailError('Enter a valid email address');
      hasError = true;
    }

    if (!trimmedUsername) {
      setUsernameError('Username is required');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      hasError = true;
    }

    if (!showPassword) {
      if (!confirmPassword) {
        setConfirmPasswordError('Please confirm your password');
        hasError = true;
      } else if (password !== confirmPassword) {
        setConfirmPasswordError('Passwords do not match');
        hasError = true;
      }
    }

    if (hasError) return;

    const { available, error: usernameCheckError } =
      await checkUsernameAvailability(trimmedUsername);
    if (!usernameCheckError && !available) {
      setUsernameError('Username already exists');
      return;
    }

    setLoading(true);
    try {
      const { user, error } = await signUp(trimmedEmail, password, trimmedUsername);
      if (error) {
        const message = error.message?.toLowerCase() ?? '';
        if (message.includes('profiles_username_idx')) {
          setUsernameError('Username already exists');
          return;
        }

        if (
          message.includes('already') &&
          (message.includes('registered') || message.includes('exists'))
        ) {
          setEmailError('Email address already taken');
          return;
        }

        Alert.alert('Sign Up Failed', error.message || 'An error occurred');
        return;
      }
      if (user) {
        Alert.alert('Success', 'Account created! Please check your email to verify your account.');
        // TODO: Navigate to login or home screen
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        Alert.alert('Error', error.message || 'Failed to sign up with Google');
      }
    } catch (error) {
      console.error('Google sign-up error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignUp = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithFacebook();
      if (error) {
        Alert.alert('Error', error.message || 'Failed to sign up with Facebook');
      }
    } catch (error) {
      console.error('Facebook sign-up error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Sign Up Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join to report and verify incidents</Text>
        </View>

        {/* Email Input */}
        <TextInput
          placeholder="Email address"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (emailError) setEmailError('');
          }}
          onBlur={() => {
            if (email && !isValidEmail(email)) {
              setEmailError('Enter a valid email address');
            }
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
          style={[styles.input, emailError ? styles.inputError : null]}
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        {/* Username Input */}
        <TextInput
          style={[styles.input, usernameError ? styles.inputError : null]}
          placeholder="Username"
          placeholderTextColor="#9CA3AF"
          value={username}
          onChangeText={(value) => {
            setUsername(value);
            if (usernameError) setUsernameError('');
          }}
          onBlur={handleUsernameBlur}
          autoCapitalize="none"
          editable={!loading}
        />
        {usernameChecking ? (
          <Text style={styles.helperText}>Checking username...</Text>
        ) : null}
        {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}

        {/* Password Input */}
        <View
          style={[styles.passwordContainer, passwordError ? styles.inputError : null]}
        >
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (passwordError) setPasswordError('');
            }}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={toggleShowPassword}
            disabled={loading}
          >
            <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        {/* Confirm Password Input */}
        {!showPassword ? (
          <View
            style={[
              styles.passwordContainer,
              confirmPasswordError ? styles.inputError : null,
            ]}
          >
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm Password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (confirmPasswordError) setConfirmPasswordError('');
              }}
              secureTextEntry={!showConfirmPassword}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
            >
              <Text style={styles.eyeIcon}>
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {!showPassword && confirmPasswordError ? (
          <Text style={styles.errorText}>{confirmPasswordError}</Text>
        ) : null}

        {/* Sign Up Button */}
        <TouchableOpacity
          style={[styles.signUpButton, loading && styles.signUpButtonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={styles.signUpButtonText}>
            {loading ? 'Creating account...' : 'Create Account'}
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Sign Up Buttons */}
        <View style={styles.socialContainer}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignUp}
            disabled={loading}
          >
            <FontAwesome name="google" size={16} color="#FFFFFF" />
            <Text style={styles.socialButtonText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleFacebookSignUp}
            disabled={loading}
          >
            <FontAwesome name="facebook-f" size={16} color="#FFFFFF" />
            <Text style={styles.socialButtonText}>Facebook</Text>
          </TouchableOpacity>
        </View>

        {/* Sign In Link */}
        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity disabled={loading} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signInLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    fontSize: 16,
    color: '#000000',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000000',
  },
  eyeButton: {
    padding: 8,
  },
  eyeIcon: {
    fontSize: 18,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  helperText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  signUpButton: {
    backgroundColor: '#2BB673',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  signUpButtonDisabled: {
    opacity: 0.7,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  socialButton: {
    flex: 1,
    backgroundColor: '#2BB673',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    color: '#6B7280',
    fontSize: 14,
  },
  signInLink: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
});
