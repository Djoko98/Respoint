import React, { useState, useContext, useEffect } from 'react';
import { LayoutProvider } from './context/LayoutContext';
import { ReservationProvider, Reservation } from './context/ReservationContext';
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
import LogoTest from './components/Debug/LogoTest';
import TitleBar from './components/TitleBar/TitleBar';
import Statistics from './components/Statistics/Statistics';
import AccountSettings from './components/AccountSettings/AccountSettings';
import Subscribe from './components/Subscribe/Subscribe';
import EmailConfirmationModal from './components/Auth/EmailConfirmationModal';
import RoleUnlockModal from './components/Auth/RoleUnlockModal';
import logoImage from './assets/logo.png';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationService } from './services/notificationService';
import { updaterService } from './services/updaterService';

const PREFILL_KEY = 'respoint_reservation_prefill';

// Declare Tauri global
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

type ViewType = 'canvas' | 'dashboard' | 'statistics';

const AppContent: React.FC = () => {
  const { t } = useLanguage();
  const { isAuthenticated, login, signup, activeRole, user } = useContext(UserContext);
  useEventReattacher(); // Use the event reattacher hook
  const [selectedTool, setSelectedTool] = useState<'select' | 'table' | 'wall' | 'text' | 'delete'>('select');
  const [tableType, setTableType] = useState<'rectangle' | 'circle'>('rectangle');
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [editReservation, setEditReservation] = useState<Reservation | null>(null);
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
  const [showRoleUnlock, setShowRoleUnlock] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; notes?: string | null } | null>(null);

  // Check for auth confirmation in URL
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

  // Show role unlock after login when no activeRole is set
  useEffect(() => {
    if (isAuthenticated) {
      // ensure we check sessionStorage in case activeRole exists but storage was cleared
      const key = user?.id ? `respoint_active_role_${user.id}` : '';
      const stored = key ? sessionStorage.getItem(key) : null;
      if (!activeRole && !stored) {
        setShowRoleUnlock(true);
      } else {
        setShowRoleUnlock(false);
      }
    } else {
      setShowRoleUnlock(false);
    }
  }, [isAuthenticated, activeRole, user?.id]);

  // Check for updates right after successful login
  useEffect(() => {
    (async () => {
      if (!isAuthenticated) return;
      const handle = await updaterService.checkForUpdate();
      if (handle) {
        setUpdateInfo({ version: handle.version, notes: handle.notes });
      } else {
        setUpdateInfo(null);
      }
    })();
  }, [isAuthenticated]);

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
    const success = await login(loginEmail, loginPassword);
    if (!success) {
      setLoginError('Invalid email or password');
      setLoginLoading(false);
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
  };

  const handleAddTable = (type: 'rectangle' | 'circle') => {
    setTableType(type);
    setSelectedTool('table');
  };

  const handleOpenReservationForm = (reservation?: Reservation) => {
    console.log('🚀 Opening reservation form...');
    setEditReservation(reservation || null);
    setShowReservationForm(true);
  };

  // Open reservation form when requested globally (e.g., from Guestbook)
  useEffect(() => {
    const openHandler = () => {
      handleOpenReservationForm();
      // Dispatch prefill after a short delay to ensure form is mounted
      setTimeout(() => {
        try {
          const raw = localStorage.getItem(PREFILL_KEY);
          const payload = raw ? JSON.parse(raw) : null;
          if (payload) {
            (window as any).dispatchEvent(new CustomEvent('prefill-reservation', { detail: {
              guestName: payload.guestName || '',
              phone: payload.phone || ''
            }}));
            localStorage.removeItem(PREFILL_KEY);
          }
        } catch {}
      }, 150);
    };
    window.addEventListener('respoint-open-reservation', openHandler as any);
    return () => window.removeEventListener('respoint-open-reservation', openHandler as any);
  }, []);

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

  return (
    <div className="flex flex-col h-full w-full bg-primary">
      {/* Bottom-left update prompt */}
      {updateInfo && (
        <div className="fixed left-4 bottom-4 z-50">
          <div className="px-3 py-2 rounded-md bg-[#0A1929] border border-gray-800 shadow-lg text-sm text-gray-200 flex items-center gap-2">
            <span>Nova verzija {updateInfo.version} je dostupna.</span>
            <button
              className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500"
              onClick={async () => {
                const handle = await updaterService.checkForUpdate();
                if (handle) {
                  await notificationService.requestPermission();
                  try { await handle.downloadAndInstall(); } catch {}
                }
              }}
            >
              Ažuriraj sada
            </button>
          </div>
        </div>
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
              currentView={currentView}
              onViewChange={setCurrentView}
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
              <div className="relative flex flex-1">
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
          <div className="flex-1 flex items-center justify-center bg-[#000814]">
            <div className="w-full max-w-md px-6">
              {/* Logo and Title */}
              <div className="text-center mb-12">
                <div className="w-12 h-12 mx-auto mb-6">
                  <img 
                    src={logoImage} 
                    alt="ResPoint Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-4xl font-light text-white mb-2">ResPoint</h1>
                <p className="text-[#8891A7] text-sm">Restaurant Management System</p>
              </div>

              {/* Welcome/Login/Signup Views */}
              <div className="bg-[#0A1929]/50 backdrop-blur-sm p-8 rounded-lg border border-[#1E2A34]">
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

                    <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#2A3B4F]"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-[#061420] text-[#8891A7]">or</span>
                      </div>
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
                <div className="mt-12 text-center">
                  <div className="flex justify-center gap-12 text-[#8891A7] text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#8891A7] rounded-full"></div>
                      <span>Easy Reservations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#8891A7] rounded-full"></div>
                      <span>Table Management</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#8891A7] rounded-full"></div>
                      <span>Real-time Updates</span>
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
        onConfirmed={handleEmailConfirmed}
        onClose={() => setShowEmailConfirmation(false)}
      />

      {/* Role Unlock Modal */}
      <RoleUnlockModal
        isOpen={showRoleUnlock}
        onClose={() => setShowRoleUnlock(false)}
      />
    </div>
  );
};

function App() {
  return (
    <FocusProvider>
      <UserProvider>
        <LanguageProvider>
        <ZoneProvider>
          <ReservationProvider>
            <LayoutProvider>
              <div className="flex flex-col h-full bg-[#010A16]">
                <TitleBar />
                <div className="flex-1 min-h-0 overflow-hidden">
                  <AppContent />
                </div>
              </div>
            </LayoutProvider>
          </ReservationProvider>
        </ZoneProvider>
        </LanguageProvider>
      </UserProvider>
    </FocusProvider>
  );
}

export default App;
