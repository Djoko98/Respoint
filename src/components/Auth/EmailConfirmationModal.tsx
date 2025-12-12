import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../utils/supabaseClient";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";

interface EmailConfirmationModalProps {
  isOpen: boolean;
  email: string;
  password?: string; // Password za automatski login nakon verifikacije
  onConfirmed: () => void;
  onClose: () => void;
}

const EmailConfirmationModal: React.FC<EmailConfirmationModalProps> = ({ 
  isOpen, 
  email, 
  password,
  onConfirmed,
  onClose 
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [countdown, setCountdown] = useState(60);
  
  // GLOBAL MODAL INPUT LOCK FIX: Delayed modal content rendering
  const [showModalContent, setShowModalContent] = useState(false);
  
  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success'
  });

  // Helper function to show alert modal
  const showAlert = useCallback((title: string, message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setAlertConfig({ title, message, type });
    setShowAlertModal(true);
  }, []);
  
  useEffect(() => {
    if (isOpen) {
      console.log('🚀 EmailConfirmationModal opening with delayed content rendering...');
      console.log('📍 Active element on modal open:', document.activeElement);
      const timeout = setTimeout(() => setShowModalContent(true), 0);
      return () => clearTimeout(timeout);
    } else {
      setShowModalContent(false);
    }
  }, [isOpen]);

  // Polling za proveru da li je email verifikovan
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'error'>('pending');

  useEffect(() => {
    if (!isOpen || !email) return;

    // Postavi listener za auth promene
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in via auth state change');
        setVerificationStatus('verified');
        onConfirmed();
      }
    });

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Polling za proveru verifikacije
    // Ako imamo password, pokušavamo login svakih 3 sekunde
    // Kada login uspe, znači da je email verifikovan
    let pollCount = 0;
    const maxPolls = 200; // Max 10 minuta (200 * 3s)
    let isVerified = false;
    
    const pollForVerification = async () => {
      if (isVerified) return true;
      
      try {
        // Ako imamo password, pokušaj login
        if (password) {
          console.log('🔄 Attempting login to check verification...');
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (data?.session && !error) {
            console.log('✅ Login successful! Email was verified.');
            isVerified = true;
            setVerificationStatus('verified');
            // Kratka pauza pre nego što zatvorimo modal
            setTimeout(() => {
              onConfirmed();
            }, 1000);
            return true;
          }
          
          // Ako je greška "Email not confirmed", nastavi polling
          if (error?.message?.toLowerCase().includes('email not confirmed')) {
            console.log('⏳ Email still not confirmed, waiting...');
            return false;
          }
          
          // Druge greške - nastavi polling
          console.log('⏳ Login attempt failed:', error?.message);
        }
        
        // Fallback: proveri postojeću sesiju
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email_confirmed_at) {
          console.log('✅ Email verified via session check!');
          isVerified = true;
          setVerificationStatus('verified');
          onConfirmed();
          return true;
        }
        
        return false;
      } catch (error) {
        console.log('Polling check failed:', error);
        return false;
      }
    };
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      if (pollCount > maxPolls || isVerified) {
        clearInterval(pollInterval);
        return;
      }
      
      await pollForVerification();
    }, 3000);
    
    // Počni polling nakon 5 sekundi (da korisnik ima vremena da klikne link)
    const initialDelay = setTimeout(() => {
      pollForVerification();
    }, 5000);

    return () => {
      authListener?.subscription.unsubscribe();
      clearInterval(timer);
      clearInterval(pollInterval);
      clearTimeout(initialDelay);
    };
  }, [isOpen, email, password, onConfirmed]);

  const handleResendEmail = async () => {
    setIsChecking(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      
      if (!error) {
        setCountdown(60); // Reset countdown
        showAlert('Email Sent', 'Confirmation email resent!', 'success');
      } else {
        showAlert('Error', 'Error resending email. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error resending email:', error);
    } finally {
      setIsChecking(false);
    }
  };

  React.useEffect(() => {
    if (!isOpen) return;
    try { window.dispatchEvent(new CustomEvent('modal-open')); } catch {}
    return () => { try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {} };
  }, [isOpen]);

  if (!isOpen || !showModalContent) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-black/70 backdrop-blur-md z-[12050] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
            <p className="text-gray-400">
              We've sent a confirmation email to:
            </p>
            <p className="text-accent font-medium mt-1">{email}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            {verificationStatus === 'pending' && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-yellow-500 font-medium">Waiting for verification...</p>
                </div>
            <p className="text-sm text-gray-300 mb-2">
              Please click the link in the email to confirm your account.
            </p>
            <p className="text-xs text-gray-500">
                  The link will open in your browser. Once verified, this app will automatically detect it and log you in.
                </p>
              </>
            )}
            {verificationStatus === 'verified' && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm text-green-500 font-medium">Email verified!</p>
                </div>
                <p className="text-sm text-gray-300">
                  Your account has been confirmed. Logging you in...
                </p>
              </>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleResendEmail}
              disabled={isChecking || countdown > 0}
              className="w-full py-2 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {countdown > 0 
                ? `Resend email in ${countdown}s` 
                : isChecking 
                ? "Sending..." 
                : "Resend confirmation email"
              }
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 px-4 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition"
            >
              Cancel
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center">
              Didn't receive the email? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      <DeleteConfirmationModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  );
};

export default EmailConfirmationModal; 