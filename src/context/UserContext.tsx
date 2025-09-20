import React, { createContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { User, UserRole } from "../types/user";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { LoadingScreen } from '../components/common/LoadingScreen';

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  activeRole: UserRole | null;
  setActiveRole: (role: UserRole | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string, restaurantName: string) => Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string }>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  isAuthenticated: false,
  activeRole: null,
  setActiveRole: () => {},
  login: async () => false,
  signup: async () => ({ success: false }),
  logout: () => {},
  setUser: () => {},
});

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isTestingNetwork, setIsTestingNetwork] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeRole, setActiveRoleState] = useState<UserRole | null>(null);

  // Persist active role per-session (cleared on browser refresh or logout)
  useEffect(() => {
    if (user?.id) {
      const key = `respoint_active_role_${user.id}`;
      const stored = sessionStorage.getItem(key);
      if (stored === 'admin' || stored === 'manager' || stored === 'waiter') {
        setActiveRoleState(stored as UserRole);
      } else {
        setActiveRoleState(null);
      }
    } else {
      setActiveRoleState(null);
    }
  }, [user?.id]);

  const setActiveRole = (role: UserRole | null) => {
    setActiveRoleState(role);
    if (user?.id) {
      const key = `respoint_active_role_${user.id}`;
      if (role) sessionStorage.setItem(key, role);
      else sessionStorage.removeItem(key);
    }
  };

  // Test network connectivity to Supabase - move outside useEffect so it can be called from Try Again
  const testNetworkConnectivity = async (): Promise<boolean> => {
    try {
      console.log('🌐 Testing network connectivity to Supabase... (timestamp:', Date.now(), ')');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ Network test timeout after 8 seconds');
        controller.abort();
      }, 8000); // 8 second timeout - longer to be sure
      
      const response = await fetch('https://jxqqptqlvtmlyuaiijvc.supabase.co/rest/v1/', {
        method: 'HEAD',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cXFwdHFsdnRtbHl1YWlpanZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyMzkyNjMsImV4cCI6MjA2NTgxNTI2M30.qCuYHdUr-7iQZZPof_R8AznMy2jJ0nrKXOY4IXf2oiE',
        },
        signal: controller.signal,
        cache: 'no-cache' // Don't use cached response
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok || response.status === 401) {
        console.log('✅ Network connectivity test passed:', response.status, '(timestamp:', Date.now(), ')');
        
        // Additional verification - try to make a simple query to double-check
        try {
          const { error: testError } = await supabase.from('profiles').select('id').limit(1);
          if (testError) {
            console.log('⚠️ Network test passed but Supabase query failed:', testError.message);
            // Still consider it as working since we got response from Supabase server
          } else {
            console.log('✅ Supabase query test also passed');
          }
        } catch (queryError) {
          console.log('⚠️ Network test passed but Supabase query failed:', queryError);
        }
        
        return true;
      } else {
        console.log('❌ Network connectivity test failed with status:', response.status, '(timestamp:', Date.now(), ')');
        return false;
      }
    } catch (error: any) {
      console.log('❌ Network connectivity test failed with error:', error.message || error, '(timestamp:', Date.now(), ')');
      
      // Check if it's specifically a network error
      if (error.name === 'AbortError') {
        console.log('🚫 Network test was aborted due to timeout');
      } else if (error.message?.includes('fetch')) {
        console.log('🚫 Network fetch failed - likely no internet connection');
      }
      
      return false;
    }
  };

  // Initialize auth - move outside useEffect so it can be called from Try Again
  const initializeAuth = async () => {
    console.log('🔍 Initializing authentication... (timestamp:', Date.now(), ')');
    
    // Prevent multiple simultaneous initialization attempts
    if (isInitializing) {
      console.log('⚠️ Already initializing, skipping...');
      return;
    }
    
    setIsInitializing(true);
    
    // First, test network connectivity
    setIsTestingNetwork(true);
    let hasInternet = await testNetworkConnectivity();
    
    if (!hasInternet) {
      console.log('🕐 No internet connection detected, waiting 12 seconds before retry... (timestamp:', Date.now(), ')');
      setNetworkError('Checking internet connection...');
      
      // Wait 12 seconds and test again
      await new Promise(resolve => setTimeout(resolve, 12000));
      
      console.log('🔄 Re-testing internet connection after 12 seconds... (timestamp:', Date.now(), ')');
      hasInternet = await testNetworkConnectivity();
      
      if (!hasInternet) {
        console.error('❌ CRITICAL: No internet connection after 12 seconds - CANNOT PROCEED (timestamp:', Date.now(), ')');
        const errorMessage = 'No internet connection detected. Please check your network connection and try again.';
        console.log('🚨 Setting network error and STOPPING initialization:', errorMessage);
        setNetworkError(errorMessage);
        setIsTestingNetwork(false);
        setLoading(false);
        setAuthInitialized(true); // This prevents further initialization
        setIsInitializing(false);
        console.log('🛑 STOPPING - App will NOT proceed without internet');
        return; // CRITICAL: Stop here, do not continue
      } else {
        console.log('✅ Internet connection restored after retry (timestamp:', Date.now(), ')');
      }
    }
    
    // Clear network error and continue with auth if we have internet
    setNetworkError(null);
    setIsTestingNetwork(false);
    
    let initializationTimeout: NodeJS.Timeout | null = null;
    
    try {
      // Add timeout mechanism to prevent infinite loading (shorter since we have internet)
      const timeoutPromise = new Promise((_, reject) => {
        initializationTimeout = setTimeout(() => {
          console.warn('⏰ Authentication initialization timeout after 3 seconds');
          reject(new Error('Authentication initialization timeout'));
        }, 3000); // 3 second timeout
      });

      const sessionPromise = supabase.auth.getSession();
      
      const { data: { session }, error } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as any;
      
      // Clear timeout if we got here successfully
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
        initializationTimeout = null;
      }
      
      if (error) {
        console.error('❌ Error getting session:', error);
        // Don't throw here, just handle gracefully
        setUser(null);
        setLoading(false);
        setAuthInitialized(true);
        setIsInitializing(false);
        return;
      }
      
      if (session) {
        console.log('✅ Active session found');
        // Double-check internet connectivity before proceeding with profile fetch
        const internetCheck = await testNetworkConnectivity();
        if (!internetCheck) {
          console.error('❌ Lost internet connection before profile fetch');
          setNetworkError('Internet connection lost. Please check your network and try again.');
          setLoading(false);
          setAuthInitialized(true);
          setIsInitializing(false);
          return;
        }
        // Reset active role on new valid session so RoleUnlockModal shows
        try { sessionStorage.removeItem(`respoint_active_role_${session.user.id}`); } catch {}
        setActiveRoleState(null);
        await fetchUserProfile(session);
      } else {
        console.log('📋 No active session found - this is normal for first-time users');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      setUser(null);
      setIsInitializing(false);
    } finally {
      // Clean up timeout
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
        initializationTimeout = null;
      }
      
      // CRITICAL: Only set authInitialized to true if we don't have a network error
      // If we have network error, the app should stay in error state
      if (!networkError) {
        console.log('✅ Auth initialization completed successfully (timestamp:', Date.now(), ')');
        setLoading(false);
        setAuthInitialized(true);
      } else {
        console.log('🚫 Auth initialization completed with network error - staying in error state (timestamp:', Date.now(), ')');
        // Don't change loading/authInitialized state - keep showing error
      }
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let refreshTimer: NodeJS.Timeout | null = null;
    let lastRefreshTime = Date.now();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('🔔 Auth state changed:', event);
        
        if (!isMounted) return;

        try {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            // Clear active role on logout
            setActiveRole(null);
          } else if (event === 'SIGNED_IN' && session) {
            // Force role re-selection on every new sign-in
            try { sessionStorage.removeItem(`respoint_active_role_${session.user.id}`); } catch {}
            setActiveRole(null);
            await fetchUserProfile(session);
          } else if (event === 'TOKEN_REFRESHED' && session) {
            // Also clear any stale role on token refresh to be safe
            try { sessionStorage.removeItem(`respoint_active_role_${session.user.id}`); } catch {}
            setActiveRole(null);
            await fetchUserProfile(session);
          } else if (!session) {
            setUser(null);
            setActiveRole(null);
          }
        } catch (error) {
          console.error('❌ Error in auth state change handler:', error);
          setUser(null);
          setActiveRole(null);
        }
      }
    );

    // Initialize auth only once
    if (isMounted) {
      initializeAuth();
    }

    // Enhanced window focus event listener with debouncing
    const handleWindowFocus = async () => {
      console.log('🔄 Window focused - checking user session');
      
      // Debounce to avoid multiple calls
      const now = Date.now();
      if (now - lastRefreshTime < 2000) {
        console.log('⏳ Skipping focus refresh - too soon after last refresh');
        return;
      }
      lastRefreshTime = now;
      
      if (!isMounted || !user?.id) return;
      
      try {
        // Clear any existing refresh timer
        if (refreshTimer) {
          clearTimeout(refreshTimer);
          refreshTimer = null;
        }
        
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && refreshData?.session) {
          console.log('✅ Session refreshed successfully on focus');
          await fetchUserProfile(refreshData.session);
          
          // Set up a timer to refresh the session periodically while the window is focused
          refreshTimer = setTimeout(async () => {
            if (document.visibilityState === 'visible' && isMounted) {
              console.log('⏰ Periodic session refresh');
              try {
                const { data: periodicRefreshData } = await supabase.auth.refreshSession();
                if (periodicRefreshData?.session) {
                  await fetchUserProfile(periodicRefreshData.session);
                }
              } catch (error) {
                console.error('⚠️ Periodic refresh failed:', error);
              }
            }
          }, 300000); // Refresh every 5 minutes while focused
        } else {
          console.log('⚠️ Could not refresh session on focus - will rely on auth state change listener');
        }
      } catch (error) {
        console.error('⚠️ Non-critical error during focus refresh:', error);
        // Don't throw - let the app continue working
      }
    };

    // Handle visibility change separately
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && refreshTimer) {
        console.log('👀 Window hidden - clearing refresh timer');
        clearTimeout(refreshTimer);
        refreshTimer = null;
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (session: Session) => {
    console.log('👤 Fetching user profile for:', session.user.id);
    
    // Add timeout for profile fetch as well
    const profileTimeout = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Profile fetch timeout'));
      }, 10000); // Increased to 10 seconds to reduce false timeouts
    });
    
    try {
      console.log('📊 Making database query for profile...');
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
        
      const { data: profile, error } = await Promise.race([
        queryPromise,
        profileTimeout
      ]) as any;

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching profile:', error);
        // Preserve existing user (and logo) on error; if none, set minimal fallback
        setUser((prev) => prev || {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.email?.split('@')[0] || 'User',
          restaurantName: 'My Restaurant',
          role: 'admin' as UserRole,
          phone: '',
          address: '',
          logo: '',
          printLogoUrl: '', // Print logo URL za štampanje
          timezone: 'Europe/Belgrade',
          language: 'eng',
          autoArchive: true,
          hasAdminPin: false,
          hasManagerPin: false,
          hasWaiterPin: false,
        });
        return;
      }

      if (!profile) {
        console.log('📝 Creating new profile for user');
        const userData = session.user.user_metadata;
        const newProfileData = {
          id: session.user.id,
          name: userData?.name || session.user.email?.split('@')[0] || 'User',
          restaurant_name: userData?.restaurant_name || 'My Restaurant',
          role: 'admin'
        };

        const { error: insertError } = await supabase
          .from('profiles')
          .insert(newProfileData);
        
        if (insertError) {
          console.error('❌ Error creating profile:', insertError);
        }

        // Set user data regardless of insert success
        const newUser = {
          id: session.user.id,
          email: session.user.email || '',
          name: newProfileData.name,
          restaurantName: newProfileData.restaurant_name,
          role: newProfileData.role as UserRole,
          phone: '',
          address: '',
          logo: '',
          printLogoUrl: '', // Print logo URL za štampanje
          timezone: 'Europe/Belgrade',
          language: 'eng',
          autoArchive: true,
          hasAdminPin: false,
          hasManagerPin: false,
          hasWaiterPin: false,
        };
        console.log('✅ UserContext: Setting new user with profile:', newUser);
        setUser(newUser);
      } else {
        console.log('✅ Profile loaded successfully:', profile);
        console.log('🖼️ Logo URL from database:', profile.logo);
        
        const existingUser = {
          id: session.user.id,
          email: session.user.email || '',
          name: profile.name || session.user.email?.split('@')[0] || 'User',
          restaurantName: profile.restaurant_name || 'My Restaurant',
          role: (profile.role as UserRole) || 'admin',
          phone: profile.phone || '',
          address: profile.address || '',
          logo: profile.logo || '', // Logo URL se učitava iz logo kolone
          printLogoUrl: profile.print_logo_url || '', // Print logo URL za štampanje
          timezone: profile.timezone || 'Europe/Belgrade',
          language: profile.language || 'eng',
          autoArchive: profile.auto_archive ?? true,
          hasAdminPin: Boolean((profile as any).admin_pin_hash),
          hasManagerPin: Boolean((profile as any).manager_pin_hash),
          hasWaiterPin: Boolean((profile as any).waiter_pin_hash),
        };
        console.log('✅ UserContext: Setting existing user with profile:', existingUser);
        setUser(existingUser);
      }
    } catch (error) {
      console.error('❌ Unexpected error in fetchUserProfile:', error);
      // Preserve existing user (and logo) on error; if none, set minimal fallback
      setUser((prev) => prev || {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.email?.split('@')[0] || 'User',
        restaurantName: 'My Restaurant',
        role: 'admin' as UserRole,
        phone: '',
        address: '',
        logo: '',
        printLogoUrl: '', // Print logo URL za štampanje
        timezone: 'Europe/Belgrade',
        language: 'eng',
        autoArchive: true,
        hasAdminPin: false,
        hasManagerPin: false,
        hasWaiterPin: false,
      });
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 Attempting login for:', email);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("❌ Error logging in:", error.message);
        return false;
      }
      
      console.log('✅ Login successful, session will be handled by auth listener');
      return true;
    } catch (error) {
      console.error('❌ Login exception:', error);
      return false;
    }
  };

  const signup = async (email: string, password: string, name: string, restaurantName: string): Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          restaurant_name: restaurantName,
        }
      }
    });

    if (error) {
      console.error("Error signing up:", error.message);
      return { success: false, error: error.message };
    }
    
    // Check if email confirmation is required
    const requiresEmailConfirmation = !!(data.user && !data.session);
    
    return { 
      success: true, 
      requiresEmailConfirmation 
    };
  };

  const logout = async () => {
    console.log('🚪 Logging out...');
    
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("❌ Error logging out:", error.message);
      }
      
      // Clear user state (will be handled by auth state change listener)
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('❌ Unexpected error during logout:', error);
      // Fallback: clear user state manually
      setUser(null);
      setActiveRole(null);
    }
  };
  
  const updateUser = (updatedUser: User | null) => {
    setUser(updatedUser);
  };

  // Show loading only when auth is not initialized
  if (!authInitialized || loading) {
    console.log('🖥️ Rendering loading screen - authInitialized:', authInitialized, 'loading:', loading, 'networkError:', networkError, '(timestamp:', Date.now(), ')');
    
    return (
      <LoadingScreen
        isTestingNetwork={isTestingNetwork}
        networkError={networkError}
        onRetry={async () => {
                    console.log('🔄 TRY AGAIN button clicked - Retrying network connection (timestamp:', Date.now(), ')');
                    console.log('🔄 Current state before retry - networkError:', networkError, 'authInitialized:', authInitialized, 'loading:', loading);
                    
                    // Reset all state
                    setNetworkError(null);
                    setIsTestingNetwork(true);
                    setAuthInitialized(false);
                    setLoading(true);
                    
                    console.log('🔄 State reset completed, now calling initializeAuth...');
                    
                    // Call initializeAuth again to re-test network and auth
                    await initializeAuth();
                    
                    console.log('🔄 initializeAuth completed after Try Again (timestamp:', Date.now(), ')');
                  }}
        onReset={() => {
                    console.log('🔄 Manual reset triggered');
                    localStorage.clear();
                    window.location.reload();
                  }}
      />
    );
  }

  // FINAL SAFETY CHECK: Never render app if we have network error
  if (networkError) {
    console.error('🚨 CRITICAL: Attempted to render main app with network error! Redirecting to error screen (timestamp:', Date.now(), ')');
    console.error('🚨 Network error:', networkError);
    console.error('🚨 This should NOT happen - there may be a bug in the loading logic');
    
    // Force back to loading screen with error
    return (
      <LoadingScreen
        networkError={networkError}
        onRetry={async () => {
                  console.log('🔄 EMERGENCY Try Again clicked (timestamp:', Date.now(), ')');
                  setNetworkError(null);
                  setIsTestingNetwork(true);
                  setAuthInitialized(false);
                  setLoading(true);
                  await initializeAuth();
                }}
        onReset={() => {
                  console.log('🔄 EMERGENCY Reset triggered (timestamp:', Date.now(), ')');
                  localStorage.clear();
                  window.location.reload();
                }}
      />
    );
  }

  console.log('✅ Rendering main application - all checks passed (timestamp:', Date.now(), ')');

  return (
    <UserContext.Provider value={{ 
      user, 
      isAuthenticated: !!user,
      activeRole,
      setActiveRole,
      login,
      signup,
      logout,
      setUser: updateUser 
    }}>
      {children}
    </UserContext.Provider>
  );
};
