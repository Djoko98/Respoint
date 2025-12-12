import React, { useState, useContext } from "react";
import { UserContext } from "../../context/UserContext";
import { useLanguage } from "../../context/LanguageContext";
import { authService } from "../../services/authService";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSwitchToSignup }) => {
  const { t } = useLanguage();
  const { login } = useContext(UserContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [passwordAttempts, setPasswordAttempts] = useState(0);
  const [lastAttemptEmail, setLastAttemptEmail] = useState<string | null>(null);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  // GLOBAL MODAL INPUT LOCK FIX: Delayed modal content rendering
  const [showModalContent, setShowModalContent] = useState(false);
  
  React.useEffect(() => {
    if (isOpen) {
      console.log('🚀 LoginModal opening with delayed content rendering...');
      console.log('📍 Active element on modal open:', document.activeElement);
      const timeout = setTimeout(() => setShowModalContent(true), 0);
      return () => clearTimeout(timeout);
    } else {
      setShowModalContent(false);
    }
  }, [isOpen]);

  if (!isOpen || !showModalContent) return null;

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!email.trim()) {
      errors.email = t('emailRequired');
    }
    
    if (!password.trim()) {
      errors.password = t('passwordRequired');
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        // Zatvori modal odmah nakon uspešnog login-a
        setTimeout(() => {
          onClose();
          setEmail("");
          setPassword("");
          setValidationErrors({});
          setIsLoading(false);
          setPasswordAttempts(0);
          setLastAttemptEmail(null);
        }, 100); // Mali delay da korisnik vidi da je uspešno
      } else {
        setIsLoading(false);

        if (result.reason === "email_not_found") {
          setValidationErrors(prev => ({
            ...prev,
            email: result.message || "Ovaj email ne postoji u sistemu. Proverite da li ste ga tačno uneli.",
          }));
          setError("");
          setPasswordAttempts(0);
          setLastAttemptEmail(null);
          return;
        }

        setLastAttemptEmail(prevEmail => {
          const isSameEmail = prevEmail === email;
          const newAttempts = isSameEmail ? passwordAttempts + 1 : 1;
          setPasswordAttempts(newAttempts);

          if (newAttempts > 2 && (result.reason === "invalid_password" || result.reason === "unknown")) {
            setError("Lozinka je netačna. Možete je resetovati koristeći opciju ispod.");
          } else {
            setError(result.message || "Pogrešan email ili lozinka. Pokušajte ponovo.");
          }

          return email;
        });
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleSendResetPassword = async () => {
    if (!email.trim()) {
      setValidationErrors(prev => ({
        ...prev,
        email: t('emailRequired'),
      }));
      return;
    }

    setIsSendingResetEmail(true);
    const result = await authService.resetPassword(email);

    if (result.success) {
      setError(result.message || "Email za resetovanje lozinke je poslat.");
      setResetEmailSent(true);
      setIsSendingResetEmail(false);
    } else {
      setError(result.error || "Greška pri slanju emaila za resetovanje lozinke.");
      setIsSendingResetEmail(false);
    }
  };

  React.useEffect(() => {
    try { window.dispatchEvent(new CustomEvent('modal-open')); } catch {}
    return () => { try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {} };
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-black/70 backdrop-blur-sm backdrop-brightness-75 z-[12050] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Welcome Back</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setPasswordAttempts(0);
                  if (validationErrors.email) {
                    setValidationErrors(prev => ({ ...prev, email: '' }));
                  }
                }}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                  validationErrors.email 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-700 focus:border-accent'
                }`}
                placeholder="your@email.com"
                autoFocus
              />
              {validationErrors.email && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                  if (validationErrors.password) {
                    setValidationErrors(prev => ({ ...prev, password: '' }));
                  }
                }}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                  validationErrors.password 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-700 focus:border-accent'
                }`}
                placeholder="••••••••"
              />
              {validationErrors.password && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
              )}
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

          {passwordAttempts > 2 && (
            <div className="mt-2 text-xs text-gray-400">
              <p className="mb-2">
                Ako ste zaboravili lozinku za ovaj email, možete je resetovati klikom na dugme ispod.
              </p>
              <button
                type="button"
                onClick={handleSendResetPassword}
                disabled={isSendingResetEmail || resetEmailSent}
                className="inline-flex items-center px-3 py-1.5 rounded-full border border-accent text-accent hover:bg-gray-800 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingResetEmail
                  ? "Slanje emaila..."
                  : resetEmailSent
                  ? "Email je poslat"
                  : "Resetuj lozinku"}
              </button>
            </div>
          )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? "Logging in..." : "Log In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don't have an account?{" "}
              <button
                onClick={onSwitchToSignup}
                className="text-accent hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default LoginModal; 