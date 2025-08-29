import { createClient } from '@supabase/supabase-js';

// Supabase kredencijali - direktno koristimo vrednosti jer env varijable možda ne rade
const supabaseUrl = 'https://jxqqptqlvtmlyuaiijvc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cXFwdHFsdnRtbHl1YWlpanZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyMzkyNjMsImV4cCI6MjA2NTgxNTI2M30.qCuYHdUr-7iQZZPof_R8AznMy2jJ0nrKXOY4IXf2oiE';

// Test network connectivity
const testNetworkConnectivity = async () => {
  try {
    console.log('🌐 Testing network connectivity to Supabase...')
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey
      }
    });
    console.log('✅ Network connectivity test passed:', response.status);
    return true;
  } catch (error) {
    console.error('❌ Network connectivity test failed:', error);
    return false;
  }
};

// Run connectivity test on startup
testNetworkConnectivity();

// Debug log
console.log('🔧 Supabase Config:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey.length
});

// Kreiranje Supabase klijenta sa dodatnim opcijama
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: localStorage,
    storageKey: 'sb-jxqqptqlvtmlyuaiijvc-auth-token'
  }
});

// Handle auth state changes on page load
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔄 Auth state change:', event);
  if (event === 'SIGNED_IN' && session) {
    console.log('✅ User signed in');
  }
});

// Global error handler for Supabase calls
export const handleSupabaseError = (error: any) => {
  console.error('❌ Supabase error:', error);
  
  // Check if it's an auth error
  if (error?.message?.includes('JWT') || error?.message?.includes('token')) {
    console.log('🔄 Auth error detected, attempting to refresh session...');
    // The auth state change listener in UserContext will handle this
  }
  
  return error;
};

// Wrapper function for Supabase queries with retry logic
export const executeSupabaseQuery = async (queryFn: () => Promise<any>, retries = 0) => {
  try {
    return await queryFn();
  } catch (error: any) {
    console.error('❌ Query error:', error);
    
    // We removed retry logic completely since it was causing delays
    // If there's an auth error, let the auth state handler deal with it
    throw error;
  }
}; 