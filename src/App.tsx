import React, { useState, useContext, useEffect, useRef } from 'react';
import { LayoutProvider } from './context/LayoutContext';
import { ReservationContext } from './context/ReservationContext';
import { ReservationProvider } from './context/ReservationContext';
import { EventProvider, EventContext } from './context/EventContext';
import { UserProvider, UserContext } from './context/UserContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ZoneProvider } from './context/ZoneContext';
import { FocusProvider } from './context/FocusContext';
import { useEventReattacher } from './hooks/useEventReattacher';
import Header from './components/Header/Header';
import Sidebar from './components/Sidebar/Sidebar';
import Canvas from './components/Canvas/Canvas';
import CanvasErrorBoundary from './components/Canvas/CanvasErrorBoundary';
import Dashboard from './components/Dashboard/Dashboard';
import { supabase } from './utils/supabaseClient';
import { syncAssignedWaitersFromServer, syncAllAssignedWaitersFromServer } from './utils/waiters';
import ZoneTabs from './components/ZoneTabs/ZoneTabs';
import AuthDebug from './components/Debug/AuthDebug';
import TitleBar from './components/TitleBar/TitleBar';
import AccountSettings from './components/AccountSettings/AccountSettings';
import Subscribe from './components/Subscribe/Subscribe';
import EmailConfirmationModal from './components/Auth/EmailConfirmationModal';
import RoleUnlockModal from './components/Auth/RoleUnlockModal';
import ResetPasswordModal from './components/Auth/ResetPasswordModal';
import logoImage from './assets/logo.png';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext, ThemeProvider } from './context/ThemeContext';
import { updaterService, AvailableUpdateHandle } from './services/updaterService';
import UpdateAvailableModal from './components/Updates/UpdateAvailableModal';
import { authService } from './services/authService';
import { initDeepLinkListener } from './services/deepLinkService';

const PREFILL_KEY = 'respoint_reservation_prefill';

// Declare Tauri global
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

type ViewType = 'canvas' | 'dashboard' | 'statistics';

const AppContent: React.FC = () => {
  const { t, currentLanguage } = useLanguage();
  const { isAuthenticated, login, signup, activeRole, user, setActiveRole } = useContext(UserContext);
  const { reservations } = useContext(ReservationContext);
  const { theme } = useContext(ThemeContext);
  const { fetchEventsByDate } = useContext(EventContext);
  useEventReattacher(); // Use the event reattacher hook

  // Enable F12 and Ctrl+Shift+I to open DevTools
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('plugin:webview|internal_toggle_devtools');
        } catch (err) {
          console.log('DevTools toggle not available:', err);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [selectedTool, setSelectedTool] = useState<'select' | 'table' | 'wall' | 'text' | 'chair' | 'delete'>('select');
  const [tableType, setTableType] = useState<'rectangle' | 'circle'>('rectangle');
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [editReservation, setEditReservation] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<ViewType>("canvas");
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [welcomeView, setWelcomeView] = useState<'welcome' | 'login' | 'signup'>('welcome');
  
  // Login form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginValidationErrors, setLoginValidationErrors] = useState<{[key: string]: string}>({});
  const [loginPasswordAttempts, setLoginPasswordAttempts] = useState(0);
  const [lastLoginEmailAttempt, setLastLoginEmailAttempt] = useState<string | null>(null);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  // Signup form states
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupRestaurantName, setSignupRestaurantName] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupValidationErrors, setSignupValidationErrors] = useState<{[key: string]: string}>({});
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [confirmationPassword, setConfirmationPassword] = useState('');
  const [showRoleUnlock, setShowRoleUnlock] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdateHandle | null>(null);
  const [hasDismissedUpdateForSession, setHasDismissedUpdateForSession] = useState(false);
  const lastSystemDateRef = useRef<string>(new Date().toDateString());

  // Check for auth confirmation in URL (web fallback)
  useEffect(() => {
    // Check if we have auth confirmation in the URL
    const checkAuthConfirmation = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token_hash = urlParams.get('token_hash');
      const type = urlParams.get('type');
      
      if (token_hash && type === 'signup') {
        console.log('🔐 Email confirmation detected in URL');
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // The supabase client should automatically handle the token
        // Just show a success message
        if (!isAuthenticated) {
          setWelcomeView('login');
          setLoginError('Email confirmed! Please log in with your credentials.');
        }
      }
    };
    
    checkAuthConfirmation();
  }, [isAuthenticated]);

  // Initialize deep link listener for handling email verification from desktop app
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    
    const setupDeepLinkListener = async () => {
      unlistenFn = await initDeepLinkListener(
        // On auth success
        (type) => {
          console.log('✅ Deep link auth success:', type);
          
          if (type === 'signup' || type === 'email_confirmation') {
            // Email verified successfully - user should now be logged in automatically
            // The Supabase auth state change listener will handle the rest
            console.log('📧 Email verified via deep link! User should be logged in automatically.');
          } else if (type === 'recovery') {
            // Password recovery - show password reset modal
            console.log('🔑 Password recovery via deep link');
            window.dispatchEvent(new CustomEvent('respoint-password-recovery'));
          }
        },
        // On auth error
        (error) => {
          console.error('❌ Deep link auth error:', error);
          setWelcomeView('login');
          setLoginError(`Verification failed: ${error}`);
        }
      );
    };
    
    setupDeepLinkListener();
    
    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  // Listen for Supabase password recovery event and open reset modal
  useEffect(() => {
    const handler = () => setShowPasswordResetModal(true);
    window.addEventListener('respoint-password-recovery', handler);
    return () => window.removeEventListener('respoint-password-recovery', handler);
  }, []);

  // Initial sync of assigned waiters after login/startup so other devices pull existing assignments
  useEffect(() => {
    (async () => {
      try {
        if (!isAuthenticated || !user?.id) return;
        await syncAllAssignedWaitersFromServer();
        try { window.dispatchEvent(new CustomEvent('respoint-waiter-assigned', { detail: { reservationId: null, name: null } })); } catch {}
      } catch {}
    })();
  }, [isAuthenticated, user?.id]);

  // Show role unlock after login when no activeRole is set.
  // If the account has no role PINs configured, skip the modal and enter with default role.
  const roleSignature = user?.roleConfig?.map((role) => `${role.id}:${role.pinHash ? 1 : 0}`).join('|') || '';

  useEffect(() => {
    if (!isAuthenticated) {
      setShowRoleUnlock(false);
      return;
    }

    const key = user?.id ? `respoint_active_role_${user.id}` : '';
    const stored = key ? sessionStorage.getItem(key) : null;

    if (activeRole || stored) {
      setShowRoleUnlock(false);
      return;
    }

    const roleOptions = user?.roleConfig || [];
    const firstRoleId = roleOptions[0]?.id;
    const hasAnyPin = roleOptions.some((role) => role.pinHash);

    if (!hasAnyPin && firstRoleId) {
      setActiveRole(firstRoleId);
      setShowRoleUnlock(false);
      return;
    }

    if (!roleOptions.length) {
      setShowRoleUnlock(false);
      return;
    }

    setShowRoleUnlock(true);
  }, [isAuthenticated, activeRole, user?.id, roleSignature, setActiveRole]);

  // Restore per-session dismissal flag for update UI
  useEffect(() => {
    try {
      const flag = sessionStorage.getItem('respoint_update_dismissed');
      if (flag === '1') {
        setHasDismissedUpdateForSession(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Check for app updates once on startup (UI handled via UpdateAvailableModal; actual install happens on click)
  useEffect(() => {
    (async () => {
      console.log("APP: Starting update check from App.tsx...");
      try {
        const handle = await updaterService.checkForUpdate();
        console.log("APP: Update check result:", handle);
        if (handle) {
          console.log("APP: Update available! Version:", handle.version);
          setAvailableUpdate(handle);
        } else {
          console.log("APP: No update available or check returned null");
          setAvailableUpdate(null);
        }
      } catch (err) {
        console.error("APP: Update check failed with error:", err);
        setAvailableUpdate(null);
      }
    })();
  }, []);

  // Automatically jump header calendar to today's date when the day changes
  useEffect(() => {
    const checkForDateChange = () => {
      const now = new Date();
      const nowStr = now.toDateString();
      if (nowStr !== lastSystemDateRef.current) {
        // System day has rolled over
        const selectedStr = selectedDate.toDateString();
        // If user je bio na "starom" današnjem datumu, prebaci ga na novi današnji dan
        if (selectedStr === lastSystemDateRef.current) {
          setSelectedDate(now);
        }
        lastSystemDateRef.current = nowStr;
      }
    };

    // Provera jednom u minutu je sasvim dovoljna
    const intervalId = window.setInterval(checkForDateChange, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [selectedDate]);

  // Sync Event list with currently selected date
  useEffect(() => {
    void fetchEventsByDate(selectedDate);
  }, [selectedDate, fetchEventsByDate]);

  // Auto-zoom for small screens to preserve desktop layout without reflow (applies only to content area, not TitleBar)
  useEffect(() => {
    const BASE_W = 1280;
    const BASE_H = 768;
    const MIN_PERCENT = 60; // keep consistent size across resolutions
    const applyAutoZoom = () => {
      try {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const scale = Math.min(w / BASE_W, h / BASE_H, 1);
        const percent = Math.max(MIN_PERCENT, Math.floor(scale * 100));
        const root = document.getElementById('app-zoom-root');
        if (root) {
          (root as HTMLElement).style.zoom = `${percent}%`;
        }
        try { localStorage.setItem('app-zoom-level', String(percent)); } catch {}
      } catch {}
    };
    applyAutoZoom();
    window.addEventListener('resize', applyAutoZoom);
    return () => window.removeEventListener('resize', applyAutoZoom);
  }, []);

  const validateLoginForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!loginEmail.trim()) {
      errors.email = t('emailRequired');
    }
    
    if (!loginPassword.trim()) {
      errors.password = t('passwordRequired');
    }
    
    setLoginValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (!validateLoginForm()) {
      return;
    }
    
    setLoginLoading(true);

    const result = await login(loginEmail, loginPassword);

    if (result.success) {
      setLoginLoading(false);
      setLoginPasswordAttempts(0);
      setLastLoginEmailAttempt(null);
      return;
    }

    setLoginLoading(false);

    // Ako Supabase/DB kažu da email ne postoji – prikaži poruku ispod email polja
    if (result.reason === 'email_not_found') {
      setLoginValidationErrors(prev => ({
        ...prev,
        email: result.message || 'Ovaj email ne postoji u sistemu. Proverite da li ste ga tačno uneli.',
      }));
      setLoginError('');
      setLoginPasswordAttempts(0);
      setLastLoginEmailAttempt(null);
      return;
    }

    // Pogrešna lozinka ili generična greška – brojimo pokušaje po email adresi
    setLastLoginEmailAttempt(prevEmail => {
      const isSameEmail = prevEmail === loginEmail;
      const newAttempts = isSameEmail ? loginPasswordAttempts + 1 : 1;
      setLoginPasswordAttempts(newAttempts);

      if (newAttempts > 2 && (result.reason === 'invalid_password' || result.reason === 'unknown')) {
        setLoginError('Lozinka je netačna. Možete je resetovati koristeći opciju ispod.');
      } else {
        setLoginError(result.message || 'Pogrešan email ili lozinka. Pokušajte ponovo.');
      }

      return loginEmail;
    });
  };

  const handleSendResetPassword = async () => {
    if (!loginEmail.trim()) {
      setLoginValidationErrors(prev => ({
        ...prev,
        email: t('emailRequired'),
      }));
      return;
    }

    setIsSendingResetEmail(true);
    const result = await authService.resetPassword(loginEmail);

    if (result.success) {
      setLoginError(result.message || 'Email za resetovanje lozinke je poslat.');
      setResetEmailSent(true);
      setIsSendingResetEmail(false);
    } else {
      setLoginError(result.error || 'Greška pri slanju emaila za resetovanje lozinke.');
      setIsSendingResetEmail(false);
    }
  };

  const validateSignupForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!signupRestaurantName.trim()) {
      errors.restaurantName = t('restaurantNameRequired');
    }
    
    if (!signupName.trim()) {
      errors.name = t('nameRequired');
    }
    
    if (!signupEmail.trim()) {
      errors.email = t('emailRequired');
    }
    
    if (!signupPassword.trim()) {
      errors.password = t('passwordRequired');
    }
    
    setSignupValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    
    if (!validateSignupForm()) {
      return;
    }
    
    setSignupLoading(true);
    const result = await signup(signupEmail, signupPassword, signupName, signupRestaurantName);
    if (!result.success) {
      setSignupError(result.error || 'Signup failed');
      setSignupLoading(false);
    } else if (result.requiresEmailConfirmation) {
      setConfirmationEmail(signupEmail);
      setConfirmationPassword(signupPassword); // Sačuvaj password za automatski login
      setShowEmailConfirmation(true);
      setSignupLoading(false);
      setSignupEmail('');
      setSignupPassword('');
      setSignupName('');
      setSignupRestaurantName('');
      setSignupValidationErrors({});
      setWelcomeView('welcome');
    }
  };

  const handleEmailConfirmed = () => {
    setShowEmailConfirmation(false);
    setConfirmationPassword(''); // Očisti password iz memorije
  };

  const handleAddTable = (type: 'rectangle' | 'circle') => {
    setTableType(type);
    setSelectedTool('table');
  };

  const handleOpenReservationForm = (reservation?: any) => {
    console.log('🚀 Opening reservation form...');
    try {
      window.dispatchEvent(
        new CustomEvent('respoint-open-regular-reservation-form')
      );
    } catch {}
    setEditReservation(reservation || null);
    setShowReservationForm(true);
  };

  // When event reservation modal opens, close regular reservation form
  useEffect(() => {
    const handler = () => {
      setShowReservationForm(false);
      setEditReservation(null);
    };
    window.addEventListener('respoint-open-event-reservation-form', handler as any);
    return () => window.removeEventListener('respoint-open-event-reservation-form', handler as any);
  }, []);

  // Open reservation form when requested globally (e.g., from Guestbook)
  useEffect(() => {
    const openHandler = (e?: CustomEvent) => {
      const id = (e as any)?.detail?.reservationId as string | undefined;
      if (id) {
        const res = reservations.find(r => r.id === id) || null;
        handleOpenReservationForm(res || undefined);
        return;
      }
      handleOpenReservationForm();
      // Dispatch prefill after a short delay to ensure form is mounted
      setTimeout(() => {
        try {
          const raw = localStorage.getItem(PREFILL_KEY);
          const payload = raw ? JSON.parse(raw) : null;
          if (payload) {
            (window as any).dispatchEvent(new CustomEvent('prefill-reservation', { detail: {
              guestName: payload.guestName || '',
              phone: payload.phone || '',
              tableNumbers: Array.isArray(payload.tableNumbers) ? payload.tableNumbers : []
            }}));
            localStorage.removeItem(PREFILL_KEY);
          }
        } catch {}
      }, 150);
    };
    window.addEventListener('respoint-open-reservation', openHandler as any);
    return () => window.removeEventListener('respoint-open-reservation', openHandler as any);
  }, [reservations]);

  const handleCloseReservationForm = () => {
    setShowReservationForm(false);
    setEditReservation(null);
  };

  // Realtime sync for reservation_waiters → dispatch global event to refresh UIs
  React.useEffect(() => {
    let channel: any;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
      channel = supabase
        .channel(`reservation_waiters_${user.id}`)
        // Avoid server-side filter so DELETE events are not dropped; filter in callback instead
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservation_waiters' }, async (payload) => {
          try {
            const rNew: any = (payload as any).new;
            const rOld: any = (payload as any).old;
            const r: any = rNew || rOld;
            if (!r) return;
            const reservationId = (r.reservation_id as string | undefined) || undefined;
            if (reservationId) {
              try { await syncAssignedWaitersFromServer(reservationId); } catch {}
              window.dispatchEvent(new CustomEvent('respoint-waiter-assigned', { detail: { reservationId, name: null } }));
            } else {
              // Fallback: rebuild entire cache if reservation_id is missing from payload
              try { await syncAllAssignedWaitersFromServer(); } catch {}
              window.dispatchEvent(new CustomEvent('respoint-waiter-assigned', { detail: { reservationId: null, name: null } }));
            }
          } catch {}
        })
        .subscribe();
    })();
    return () => { if (channel) try { supabase.removeChannel(channel); } catch {} };
  }, [user?.id]);

  const handleDismissUpdateForSession = () => {
    setHasDismissedUpdateForSession(true);
    try {
      sessionStorage.setItem('respoint_update_dismissed', '1');
    } catch {
      // ignore storage errors
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-primary">
      {/* Update Modal (uses Tauri updater under the hood) */}
      {availableUpdate && !hasDismissedUpdateForSession && (
        <UpdateAvailableModal
          isOpen={true}
          version={availableUpdate.version}
          notes={availableUpdate.notes}
          onInstall={availableUpdate.downloadAndInstall}
          onLater={handleDismissUpdateForSession}
        />
      )}
      <AuthDebug />
      
      {isAuthenticated ? (
        <>
          <Header 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar 
              onAddReservation={() => handleOpenReservationForm()}
              selectedDate={selectedDate}
              onEditReservation={handleOpenReservationForm}
            />
            
            {/* Right side with Zone Tabs and Canvas */}
            <div className="flex flex-col flex-1">
              {/* Zone Tabs Row - only over canvas area */}
              <div className="bg-[#000814] border-b border-gray-800 py-3">
                <div className="flex justify-center">
                  <ZoneTabs />
                </div>
              </div>

              {/* Canvas area */}
              <div id="canvas-overlay-root" className="relative flex flex-1">
                <CanvasErrorBoundary>
                  <Canvas 
                    selectedTool={selectedTool}
                    onToolChange={setSelectedTool}
                    onAddTable={handleAddTable}
                    tableType={tableType}
                    onUndo={() => {}} // Will be handled by context
                    onRedo={() => {}} // Will be handled by context
                    onResetLayout={() => {}} // Will be handled by context
                    showReservationForm={showReservationForm}
                    onCloseReservationForm={handleCloseReservationForm}
                    selectedDate={selectedDate}
                    editReservation={editReservation}
                  />
                </CanvasErrorBoundary>
                <Dashboard selectedDate={selectedDate} />
              </div>
            </div>
            <AccountSettings isOpen={showAccountSettings} onClose={() => setShowAccountSettings(false)} />
            <Subscribe isOpen={showSubscribe} onClose={() => setShowSubscribe(false)} />
          </div>
        </>
      ) : (
        <>
          {/* Welcome screen without header */}
          <div
            className="flex-1 flex items-center justify-center bg-[#000814] relative"
            style={{
              backgroundImage: "url('/login-bg.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* Dark overlay for readability over the background image */}
            <div className="absolute inset-0 bg-[#000814]/70" />
            <div className="w-full max-w-md px-6">
              {/* Logo and Title */}
              <div className="text-center mb-12 relative z-10">
                <div className="w-16 h-16 mx-auto mb-6">
                  <img 
                    src={logoImage} 
                    alt="ResPoint Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-4xl font-light text-white mb-2 login-title">ResPoint</h1>
                <p className="text-[#8891A7] text-sm login-subtitle">Restaurant Management System</p>
              </div>

              {/* Welcome/Login/Signup Views */}
              <div className="bg-[#0A1929]/50 backdrop-blur-sm p-8 rounded-lg border border-[#1E2A34] relative z-10">
                <AnimatePresence mode="wait">
                {welcomeView === 'welcome' && (
                    <motion.div
                      key="welcome"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h2 className="text-2xl font-medium text-white mb-8 text-center">Welcome Back</h2>
                    
                    <button
                      onClick={() => {
                        setWelcomeView('login');
                        setLoginValidationErrors({});
                      }}
                      className="w-full py-3.5 bg-[#3B82F6] text-white rounded-full hover:bg-[#2563EB] transition-all duration-200 font-medium hover:shadow-lg hover:shadow-[#3B82F6]/20"
                    >
                      Log In to Your Account
                    </button>

                    <div className="my-8 flex items-center">
                      <div className="flex-1 border-t border-[#2A3B4F]"></div>
                      <span className="mx-4 text-sm text-[#8891A7]">or</span>
                      <div className="flex-1 border-t border-[#2A3B4F]"></div>
                    </div>

                    <div className="text-center">
                      <p className="text-[#8891A7] mb-4 text-sm">New to ResPoint?</p>
                      <button
                        onClick={() => {
                          setWelcomeView('signup');
                          setSignupValidationErrors({});
                        }}
                        className="w-full py-3.5 bg-transparent text-white rounded-full transition-all duration-200 font-medium border border-[#2A3B4F] hover:bg-[#1E2A34] hover:border-[#3A4B5F]"
                      >
                        Create New Account
                      </button>
                    </div>
                    </motion.div>
                )}

                {welcomeView === 'login' && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-2xl font-medium text-white mb-8 text-center">Log In</h2>
                    
                    <form onSubmit={handleLogin}>
                      <div className="mb-5">
                        <label className="block text-[#8891A7] text-sm mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => {
                            setLoginEmail(e.target.value);
                            if (loginValidationErrors.email) {
                              setLoginValidationErrors(prev => ({ ...prev, email: '' }));
                            }
                          }}
                          className={`w-full px-4 py-3 bg-[#0A1929]/30 border rounded-lg text-white placeholder-[#4A5568] focus:outline-none transition-colors ${
                            loginValidationErrors.email 
                              ? 'border-red-500 focus:border-red-500' 
                              : 'border-[#2A3B4F] focus:border-[#3B82F6]'
                          }`}
                          placeholder="your@email.com"
                        />
                        {loginValidationErrors.email && (
                          <p className="text-red-500 text-xs mt-1">{loginValidationErrors.email}</p>
                        )}
                      </div>

                      <div className="mb-6">
                        <label className="block text-[#8891A7] text-sm mb-2">
                          Password
                        </label>
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => {
                            setLoginPassword(e.target.value);
                            if (loginValidationErrors.password) {
                              setLoginValidationErrors(prev => ({ ...prev, password: '' }));
                            }
                          }}
                          className={`w-full px-4 py-3 bg-[#0A1929]/30 border rounded-lg text-white placeholder-[#4A5568] focus:outline-none transition-colors ${
                            loginValidationErrors.password 
                              ? 'border-red-500 focus:border-red-500' 
                              : 'border-[#2A3B4F] focus:border-[#3B82F6]'
                          }`}
                          placeholder="••••••••"
                        />
                        {loginValidationErrors.password && (
                          <p className="text-red-500 text-xs mt-1">{loginValidationErrors.password}</p>
                        )}
                      </div>

                      {loginError && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                          {loginError}
                        </div>
                      )}

                      {/* Forgot password link - always visible */}
                      <div className="mb-4 text-right">
                        <button
                          type="button"
                          onClick={handleSendResetPassword}
                          disabled={isSendingResetEmail || resetEmailSent || !loginEmail.trim()}
                          className="text-xs text-[#3B82F6] hover:text-[#60A5FA] hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSendingResetEmail
                            ? 'Sending...'
                            : resetEmailSent
                            ? '✓ Email sent!'
                            : 'Forgot password?'}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full py-3.5 bg-[#3B82F6] text-white rounded-full hover:bg-[#2563EB] transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#3B82F6]/20"
                      >
                        {loginLoading ? 'Logging in...' : 'Log In'}
                      </button>
                    </form>

                    <div className="mt-6 text-center">
                      <button
                        onClick={() => {
                          setWelcomeView('welcome');
                          setLoginValidationErrors({});
                        }}
                        className="text-[#8891A7] hover:text-white text-sm transition-colors"
                      >
                        ← Back
                      </button>
                    </div>
                  </motion.div>
                )}

                {welcomeView === 'signup' && (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-2xl font-medium text-white mb-8 text-center">Create Account</h2>
                    
                    <form onSubmit={handleSignup}>
                      <div className="mb-5">
                        <label className="block text-[#8891A7] text-sm mb-2">
                          Restaurant Name
                        </label>
                        <input
                          type="text"
                          value={signupRestaurantName}
                          onChange={(e) => {
                            setSignupRestaurantName(e.target.value);
                            if (signupValidationErrors.restaurantName) {
                              setSignupValidationErrors(prev => ({ ...prev, restaurantName: '' }));
                            }
                          }}
                          className={`w-full px-4 py-3 bg-[#0A1929]/30 border rounded-lg text-white placeholder-[#4A5568] focus:outline-none transition-colors ${
                            signupValidationErrors.restaurantName 
                              ? 'border-red-500 focus:border-red-500' 
                              : 'border-[#2A3B4F] focus:border-[#3B82F6]'
                          }`}
                          placeholder="Your Restaurant"
                        />
                        {signupValidationErrors.restaurantName && (
                          <p className="text-red-500 text-xs mt-1">{signupValidationErrors.restaurantName}</p>
                        )}
                      </div>

                      <div className="mb-5">
                        <label className="block text-[#8891A7] text-sm mb-2">
                          Your Name
                        </label>
                        <input
                          type="text"
                          value={signupName}
                          onChange={(e) => {
                            setSignupName(e.target.value);
                            if (signupValidationErrors.name) {
                              setSignupValidationErrors(prev => ({ ...prev, name: '' }));
                            }
                          }}
                          className={`w-full px-4 py-3 bg-[#0A1929]/30 border rounded-lg text-white placeholder-[#4A5568] focus:outline-none transition-colors ${
                            signupValidationErrors.name 
                              ? 'border-red-500 focus:border-red-500' 
                              : 'border-[#2A3B4F] focus:border-[#3B82F6]'
                          }`}
                          placeholder="Your full name"
                        />
                        {signupValidationErrors.name && (
                          <p className="text-red-500 text-xs mt-1">{signupValidationErrors.name}</p>
                        )}
                      </div>

                      <div className="mb-5">
                        <label className="block text-[#8891A7] text-sm mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={signupEmail}
                          onChange={(e) => {
                            setSignupEmail(e.target.value);
                            if (signupValidationErrors.email) {
                              setSignupValidationErrors(prev => ({ ...prev, email: '' }));
                            }
                          }}
                          className={`w-full px-4 py-3 bg-[#0A1929]/30 border rounded-lg text-white placeholder-[#4A5568] focus:outline-none transition-colors ${
                            signupValidationErrors.email 
                              ? 'border-red-500 focus:border-red-500' 
                              : 'border-[#2A3B4F] focus:border-[#3B82F6]'
                          }`}
                          placeholder="your@email.com"
                        />
                        {signupValidationErrors.email && (
                          <p className="text-red-500 text-xs mt-1">{signupValidationErrors.email}</p>
                        )}
                      </div>

                      <div className="mb-6">
                        <label className="block text-[#8891A7] text-sm mb-2">
                          Password
                        </label>
                        <input
                          type="password"
                          value={signupPassword}
                          onChange={(e) => {
                            setSignupPassword(e.target.value);
                            if (signupValidationErrors.password) {
                              setSignupValidationErrors(prev => ({ ...prev, password: '' }));
                            }
                          }}
                          className={`w-full px-4 py-3 bg-[#0A1929]/30 border rounded-lg text-white placeholder-[#4A5568] focus:outline-none transition-colors ${
                            signupValidationErrors.password 
                              ? 'border-red-500 focus:border-red-500' 
                              : 'border-[#2A3B4F] focus:border-[#3B82F6]'
                          }`}
                          placeholder="••••••••"
                        />
                        {signupValidationErrors.password && (
                          <p className="text-red-500 text-xs mt-1">{signupValidationErrors.password}</p>
                        )}
                      </div>

                      {signupError && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                          {signupError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={signupLoading}
                        className="w-full py-3.5 bg-[#3B82F6] text-white rounded-full hover:bg-[#2563EB] transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#3B82F6]/20"
                      >
                        {signupLoading ? 'Creating account...' : 'Create Account'}
                      </button>
                    </form>

                    <div className="mt-6 text-center">
                      <button
                        onClick={() => {
                          setWelcomeView('welcome');
                          setSignupValidationErrors({});
                        }}
                        className="text-[#8891A7] hover:text-white text-sm transition-colors"
                      >
                        ← Back
                      </button>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>

              {/* Features - only show on welcome view */}
              {welcomeView === 'welcome' && (
                <div className="mt-12 text-center relative z-10">
                  <div className="flex justify-center gap-12 text-[#8891A7] text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#8891A7] rounded-full login-feature-dot"></div>
                      <span className="login-feature-text">Easy Reservations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#8891A7] rounded-full login-feature-dot"></div>
                      <span className="login-feature-text">Table Management</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#8891A7] rounded-full login-feature-dot"></div>
                      <span className="login-feature-text">Real-time Updates</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Email Confirmation Modal */}
      <EmailConfirmationModal
        isOpen={showEmailConfirmation}
        email={confirmationEmail}
        password={confirmationPassword}
        onConfirmed={handleEmailConfirmed}
        onClose={() => {
          setShowEmailConfirmation(false);
          setConfirmationPassword(''); // Očisti password iz memorije
        }}
      />

      {/* Role Unlock Modal */}
      <RoleUnlockModal
        isOpen={showRoleUnlock}
        onClose={() => setShowRoleUnlock(false)}
      />

      {/* Password Reset Modal */}
      <ResetPasswordModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
      />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <FocusProvider>
        <div className="flex flex-col h-full bg-[#010A16]">
          {/* Title bar is always visible, even while UserProvider shows loading screens */}
          <TitleBar />
          <UserProvider>
            <LanguageProvider>
              <ZoneProvider>
                <ReservationProvider>
                  <EventProvider>
                    <LayoutProvider>
                      <div id="app-zoom-root" className="flex-1 min-h-0 overflow-hidden">
                        <AppContent />
                      </div>
                    </LayoutProvider>
                  </EventProvider>
                </ReservationProvider>
              </ZoneProvider>
            </LanguageProvider>
          </UserProvider>
        </div>
      </FocusProvider>
    </ThemeProvider>
  );
}

export default App;
