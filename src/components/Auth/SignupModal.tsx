import React, { useState, useContext } from "react";
import { UserContext } from "../../context/UserContext";
import { useLanguage } from "../../context/LanguageContext";
import EmailConfirmationModal from "./EmailConfirmationModal";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

const SignupModal: React.FC<SignupModalProps> = ({ isOpen, onClose, onSwitchToLogin }) => {
  const { t } = useLanguage();
  const { signup } = useContext(UserContext);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    restaurantName: ""
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // GLOBAL MODAL INPUT LOCK FIX: Delayed modal content rendering
  const [showModalContent, setShowModalContent] = useState(false);
  
  React.useEffect(() => {
    if (isOpen) {
      console.log('🚀 SignupModal opening with delayed content rendering...');
      console.log('📍 Active element on modal open:', document.activeElement);
      const timeout = setTimeout(() => setShowModalContent(true), 0);
      return () => clearTimeout(timeout);
    } else {
      setShowModalContent(false);
    }
  }, [isOpen]);

  if (!isOpen || !showModalContent) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      errors.name = t('nameRequired');
    }
    
    if (!formData.restaurantName.trim()) {
      errors.restaurantName = t('restaurantNameRequired');
    }
    
    if (!formData.email.trim()) {
      errors.email = t('emailRequired');
    }
    
    if (!formData.password.trim()) {
      errors.password = t('passwordRequired');
    }
    
    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = t('passwordRequired');
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Custom field validation
    if (!validateForm()) {
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signup(
        formData.email, 
        formData.password, 
        formData.name, 
        formData.restaurantName
      );
      
      if (result.success) {
        if (result.requiresEmailConfirmation) {
          // Prikaži email confirmation modal
          setShowEmailConfirmation(true);
        } else {
          // Korisnik je automatski prijavljen
          onClose();
          // Reset form
          setFormData({
            email: "",
            password: "",
            confirmPassword: "",
            name: "",
            restaurantName: ""
          });
        }
      } else {
        setError(result.error || "Email already exists");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailConfirmed = () => {
    setShowEmailConfirmation(false);
    onClose();
    // Reset form
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      restaurantName: ""
    });
  };

  const handleCloseEmailConfirmation = () => {
    setShowEmailConfirmation(false);
    // Vraćamo se na signup formu
  };

  if (showEmailConfirmation) {
    return (
      <EmailConfirmationModal
        isOpen={true}
        email={formData.email}
        onConfirmed={handleEmailConfirmed}
        onClose={handleCloseEmailConfirmation}
      />
    );
  }

  React.useEffect(() => {
    try { window.dispatchEvent(new CustomEvent('modal-open')); } catch {}
    return () => { try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {} };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm backdrop-brightness-75 z-[200] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Your Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                  validationErrors.name 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-700 focus:border-accent'
                }`}
                placeholder="John Doe"
                autoFocus
              />
              {validationErrors.name && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Restaurant Name
              </label>
              <input
                type="text"
                name="restaurantName"
                value={formData.restaurantName}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                  validationErrors.restaurantName 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-700 focus:border-accent'
                }`}
                placeholder="My Restaurant"
              />
              {validationErrors.restaurantName && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.restaurantName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                  validationErrors.email 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-700 focus:border-accent'
                }`}
                placeholder="your@email.com"
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
                name="password"
                value={formData.password}
                onChange={handleChange}
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

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                  validationErrors.confirmPassword 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-700 focus:border-accent'
                }`}
                placeholder="••••••••"
              />
              {validationErrors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{" "}
              <button
                onClick={onSwitchToLogin}
                className="text-accent hover:underline"
              >
                Log in
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

export default SignupModal; 