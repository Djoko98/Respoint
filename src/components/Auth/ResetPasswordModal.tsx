import React, { useState } from "react";
import { authService } from "../../services/authService";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!password.trim() || !confirmPassword.trim()) {
      setError("Lozinka je obavezna.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Lozinke se ne poklapaju.");
      return;
    }

    if (password.length < 6) {
      setError("Lozinka mora imati najmanje 6 karaktera.");
      return;
    }

    setIsSubmitting(true);
    const result = await authService.updatePassword(password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "Greška pri promeni lozinke. Pokušajte ponovo.");
      return;
    }

    setSuccessMessage("Lozinka je uspešno promenjena. Možete nastaviti sa korišćenjem aplikacije.");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-black/70 backdrop-blur-sm z-[13000] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Resetuj lozinku</h2>
          <p className="text-gray-400 text-sm mb-6 text-center">
            Unesite novu lozinku za svoj nalog. Nakon čuvanja možete nastaviti sa radom.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Nova lozinka
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Potvrdi lozinku
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            {successMessage && (
              <p className="text-green-400 text-sm">{successMessage}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition mt-2"
            >
              {isSubmitting ? "Čuvanje..." : "Sačuvaj novu lozinku"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-4 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition mt-3"
            >
              Zatvori
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordModal;


