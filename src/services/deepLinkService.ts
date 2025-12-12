import { supabase } from '../utils/supabaseClient';

/**
 * Deep Link Service
 * Handles authentication callbacks from email verification links
 * Custom URL scheme: respoint://
 */

// Parse deep link URL and extract auth parameters
export const parseDeepLinkUrl = (url: string): { 
  type: string | null; 
  accessToken: string | null;
  refreshToken: string | null;
  tokenHash: string | null;
  error: string | null;
  errorDescription: string | null;
} => {
  try {
    console.log('🔗 Parsing deep link URL:', url);
    
    // Handle both respoint:// and respoint://auth/confirm formats
    // The URL might contain hash fragments or query params
    
    let searchParams: URLSearchParams;
    
    // Check if URL contains hash fragment (Supabase often uses this)
    if (url.includes('#')) {
      const hashPart = url.split('#')[1];
      searchParams = new URLSearchParams(hashPart);
    } else if (url.includes('?')) {
      const queryPart = url.split('?')[1];
      searchParams = new URLSearchParams(queryPart);
    } else {
      // Try to parse the whole thing after the scheme
      const withoutScheme = url.replace('respoint://', '').replace('respoint:', '');
      searchParams = new URLSearchParams(withoutScheme);
    }
    
    return {
      type: searchParams.get('type'),
      accessToken: searchParams.get('access_token'),
      refreshToken: searchParams.get('refresh_token'),
      tokenHash: searchParams.get('token_hash'),
      error: searchParams.get('error'),
      errorDescription: searchParams.get('error_description'),
    };
  } catch (error) {
    console.error('❌ Error parsing deep link URL:', error);
    return {
      type: null,
      accessToken: null,
      refreshToken: null,
      tokenHash: null,
      error: 'parse_error',
      errorDescription: 'Failed to parse deep link URL',
    };
  }
};

// Handle email verification callback
export const handleAuthCallback = async (url: string): Promise<{
  success: boolean;
  type?: string;
  error?: string;
}> => {
  try {
    console.log('🔐 Handling auth callback from deep link:', url);
    
    const params = parseDeepLinkUrl(url);
    
    // Check for errors in the callback
    if (params.error) {
      console.error('❌ Auth callback error:', params.error, params.errorDescription);
      return {
        success: false,
        error: params.errorDescription || params.error,
      };
    }
    
    // Handle email confirmation (signup verification)
    if (params.type === 'signup' || params.type === 'email_confirmation') {
      console.log('✅ Email confirmation detected');
      
      // If we have access_token and refresh_token, set the session
      if (params.accessToken && params.refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
        });
        
        if (error) {
          console.error('❌ Error setting session:', error);
          return {
            success: false,
            type: 'signup',
            error: error.message,
          };
        }
        
        console.log('✅ Session set successfully after email confirmation');
        return {
          success: true,
          type: 'signup',
        };
      }
      
      // If we have token_hash, verify the OTP
      if (params.tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: params.tokenHash,
          type: 'signup',
        });
        
        if (error) {
          console.error('❌ Error verifying OTP:', error);
          return {
            success: false,
            type: 'signup',
            error: error.message,
          };
        }
        
        console.log('✅ OTP verified successfully');
        return {
          success: true,
          type: 'signup',
        };
      }
      
      return {
        success: true,
        type: 'signup',
      };
    }
    
    // Handle password recovery
    if (params.type === 'recovery') {
      console.log('🔑 Password recovery detected');
      
      if (params.accessToken && params.refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
        });
        
        if (error) {
          console.error('❌ Error setting session for recovery:', error);
          return {
            success: false,
            type: 'recovery',
            error: error.message,
          };
        }
        
        console.log('✅ Session set for password recovery');
        return {
          success: true,
          type: 'recovery',
        };
      }
      
      return {
        success: true,
        type: 'recovery',
      };
    }
    
    // Handle magic link
    if (params.type === 'magiclink') {
      console.log('🪄 Magic link detected');
      
      if (params.accessToken && params.refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
        });
        
        if (error) {
          console.error('❌ Error setting session from magic link:', error);
          return {
            success: false,
            type: 'magiclink',
            error: error.message,
          };
        }
        
        console.log('✅ Session set from magic link');
        return {
          success: true,
          type: 'magiclink',
        };
      }
    }
    
    // Unknown type - try to handle generically
    console.log('⚠️ Unknown auth callback type:', params.type);
    
    if (params.accessToken && params.refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
      });
      
      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }
      
      return {
        success: true,
        type: params.type || 'unknown',
      };
    }
    
    return {
      success: true,
      type: params.type || 'unknown',
    };
    
  } catch (error: any) {
    console.error('❌ Error handling auth callback:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
};

// Initialize deep link listener (call this from App.tsx)
export const initDeepLinkListener = async (
  onAuthSuccess: (type: string) => void,
  onAuthError: (error: string) => void
): Promise<(() => void) | null> => {
  try {
    // Check if we're in Tauri environment
    if (typeof window === 'undefined' || !window.__TAURI__) {
      console.log('⚠️ Not in Tauri environment, skipping deep link listener');
      return null;
    }
    
    const { listen } = await import('@tauri-apps/api/event');
    
    // Listen for deep link events from Tauri
    const unlisten = await listen<string[]>('deep-link://new-url', async (event) => {
      console.log('🔗 Deep link received:', event.payload);
      
      // event.payload is an array of URL strings
      const urls = event.payload;
      
      if (!urls || !Array.isArray(urls)) {
        console.log('⚠️ Invalid deep link payload:', urls);
        return;
      }
      
      for (const url of urls) {
        console.log('🔗 Processing URL:', url);
        if (typeof url === 'string' && url.startsWith('respoint://')) {
          const result = await handleAuthCallback(url);
          
          if (result.success) {
            onAuthSuccess(result.type || 'unknown');
          } else {
            onAuthError(result.error || 'Authentication failed');
          }
        }
      }
    });
    
    console.log('✅ Deep link listener initialized');
    
    // Also check for any initial deep link (app was opened via deep link)
    try {
      const { getCurrent } = await import('@tauri-apps/plugin-deep-link');
      const initialUrls = await getCurrent();
      
      if (initialUrls && Array.isArray(initialUrls) && initialUrls.length > 0) {
        console.log('🔗 Initial deep link URLs:', initialUrls);
        
        for (const urlObj of initialUrls) {
          // URL might be a Url object or string depending on version
          const url = typeof urlObj === 'string' ? urlObj : urlObj.toString();
          console.log('🔗 Processing initial URL:', url);
          
          if (url.startsWith('respoint://')) {
            const result = await handleAuthCallback(url);
            
            if (result.success) {
              onAuthSuccess(result.type || 'unknown');
            } else {
              onAuthError(result.error || 'Authentication failed');
            }
          }
        }
      }
    } catch (err) {
      console.log('ℹ️ No initial deep link or getCurrent not available:', err);
    }
    
    return unlisten;
    
  } catch (error) {
    console.error('❌ Error initializing deep link listener:', error);
    return null;
  }
};

