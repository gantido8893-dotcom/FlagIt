import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error)
    return String(error.message);
  return 'An unknown error occurred';
}

function getAuthCodeFromUrl(url: string): string | null {
  const match = url.match(/[?&#]code=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getOAuthRedirectUri() {
  return AuthSession.makeRedirectUri({ path: 'oauth' });
}

function getEmailRedirectUri() {
  return AuthSession.makeRedirectUri({ path: 'auth' });
}

async function clearAuthFlowState() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const flowKeys = keys.filter(
      (key) => key.includes('code-verifier') || key.includes('flow_state'),
    );
    if (flowKeys.length > 0) {
      await AsyncStorage.multiRemove(flowKeys);
    }
  } catch (error) {
    console.warn('Failed to clear auth flow state:', error);
  }
}

export async function signUp(email: string, password: string, username: string) {
  try {
    const redirectUri = getEmailRedirectUri();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username }, emailRedirectTo: redirectUri },
    });
    if (error) throw error;
    return { user: data.user, error: null as null };
  } catch (error) {
    console.error('Sign up error:', error);
    return { user: null, error: new Error(getErrorMessage(error)) };
  }
}

export async function checkUsernameAvailability(username: string) {
  const trimmed = username.trim();
  if (!trimmed) {
    return { available: false, error: new Error('Username is required') };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', trimmed)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { available: !data, error: null as null };
  } catch (error) {
    const message = getErrorMessage(error).toLowerCase();
    if (message.includes('permission') || message.includes('not authorized')) {
      return { available: true, error: null as null };
    }

    console.error('Username check error:', error);
    return { available: false, error: new Error(getErrorMessage(error)) };
  }
}

export async function handleAuthRedirect(url: string) {
  try {
    const authCode = getAuthCodeFromUrl(url);
    if (!authCode) {
      return { handled: false, error: null as null };
    }

    const { error } = await supabase.auth.exchangeCodeForSession(authCode);
    if (error) throw error;
    return { handled: true, error: null as null };
  } catch (error) {
    console.error('Auth redirect error:', error);
    return { handled: true, error: new Error(getErrorMessage(error)) };
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { user: data.user, error: null as null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { user: null, error: new Error(getErrorMessage(error)) };
  }
}

/*  
Shared helper for OAuth providers pls dont change. 
VEERY VERRRYY SENSITIVE + havnet figured out 
facebook auth yet. Thank you. it will work when I say it works. 
*/
async function signInWithOAuthProvider(provider: 'google' | 'facebook') {
  try {
    await clearAuthFlowState();
    const redirectUri = getOAuthRedirectUri();
    console.log(`[${provider}] redirectUri:`, redirectUri);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error('No OAuth URL returned from Supabase');

    // ── Expo Go nuance: WebBrowser can flush AsyncStorage while open.
    // Snapshot every PKCE key Supabase just wrote so we can restore them
    // after the browser closes, before we call exchangeCodeForSession.
    const allKeys = await AsyncStorage.getAllKeys();
    const pkceKeys = allKeys.filter(
      (k) => k.includes('code-verifier') || k.includes('flow_state'),
    );
    const pkceSnapshot = await AsyncStorage.multiGet(pkceKeys);
    const validSnapshot = pkceSnapshot.filter(
      (entry): entry is [string, string] => entry[1] !== null,
    );

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    console.log(`[${provider}] browser result:`, result);

    // Restore PKCE keys regardless of browser outcome
    if (validSnapshot.length > 0) {
      await AsyncStorage.multiSet(validSnapshot);
    }

    if (result.type === 'success') {
      const authCode = getAuthCodeFromUrl(result.url);
      if (!authCode) throw new Error('No auth code found in redirect URL');

      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(authCode);
      if (sessionError) throw sessionError;
    } else if (result.type === 'cancel') {
      throw new Error('Sign-in was cancelled');
    }

    return { error: null as null };
  } catch (error) {
    console.error(`${provider} sign-in error:`, error);
    return { error: new Error(getErrorMessage(error)) };
  }
}

export async function signInWithGoogle() {
  return signInWithOAuthProvider('google');
}

export async function signInWithFacebook() {
  return signInWithOAuthProvider('facebook');
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null as null };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error: new Error(getErrorMessage(error)) };
  }
}

export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user: data.user, error: null as null };
  } catch (error) {
    console.error('Get user error:', error);
    return { user: null, error: new Error(getErrorMessage(error)) };
  }
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session?.user?.email);
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email || '',
        username: session.user.user_metadata?.username,
      });
    } else {
      callback(null);
    }
  });
  return data?.subscription.unsubscribe;
}