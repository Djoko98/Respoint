import React, { useContext, useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { UserContext } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import { hashPin } from '../../utils/pin';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const RoleUnlockModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, setActiveRole } = useContext(UserContext as any);
  const { currentLanguage } = useLanguage();
  const roleOptions = user?.roleConfig || [];
  const hasRoles = roleOptions.length > 0;
  const [roleId, setRoleId] = useState<string>(() => roleOptions[0]?.id || '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const label = (en: string, sr: string) => (currentLanguage === 'srb' ? sr : en);

  useEffect(() => {
    if (!roleOptions.length) {
      setRoleId('');
      return;
    }
    if (!roleId || !roleOptions.some((option) => option.id === roleId)) {
      setRoleId(roleOptions[0].id);
    }
  }, [roleOptions, roleId]);

  const selectedRole = useMemo(
    () => roleOptions.find((role) => role.id === roleId) || roleOptions[0],
    [roleOptions, roleId]
  );
  const requiresPin = Boolean(selectedRole?.pinHash);

  const handleConfirm = async () => {
    if (!selectedRole) {
      setError(label('No roles available', 'Nema dostupnih uloga'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (requiresPin) {
        if (!pin.trim()) {
          setError(label('PIN is required for this role', 'PIN je obavezan za ovu ulogu'));
          return;
        }
        if (!/^\d{1,4}$/.test(pin.trim())) {
          setError(label('PIN must contain up to 4 digits', 'PIN mora imati do 4 cifre'));
          return;
        }
        const hashed = await hashPin(pin.trim());
        if (hashed !== selectedRole.pinHash) {
          setError(label('Invalid PIN', 'Neispravan PIN'));
          return;
        }
      }
      setActiveRole(selectedRole.id);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!loading && hasRoles) {
        void handleConfirm();
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title={label('Select Role', 'Izaberite ulogu')} size="sm" hideCloseButton>
      <form
        className="p-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading && hasRoles) {
            void handleConfirm();
          }
        }}
      >
        <div>
          <label className="block text-xs text-gray-500 mb-1">{label('Role', 'Uloga')}</label>
          {roleOptions.length === 0 ? (
            <p className="text-xs text-gray-500">
              {label('No roles configured. Please add roles in Account Settings.', 'Nema konfigurisanih uloga. Dodajte ih u podešavanjima naloga.')}
            </p>
          ) : (
            <select
              className="respoint-select"
              value={roleId}
              onChange={(e) => {
                setRoleId(e.target.value);
                setPin('');
                setError('');
              }}
              onKeyDown={handleKeyDown}
              disabled={loading}
            >
              {roleOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{label('PIN', 'PIN')}</label>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              const sanitized = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPin(sanitized);
              setError('');
            }}
            className="w-full px-3 py-2 bg-[#000814] border border-gray-800 rounded text-sm text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
            placeholder={
              requiresPin ? label('Enter PIN', 'Unesite PIN') : label('PIN not required', 'PIN nije potreban')
            }
            onKeyDown={handleKeyDown}
            disabled={!requiresPin || !selectedRole}
          />
          {!requiresPin && (
            <p className="text-xs text-gray-500 mt-1">
              {label('This role has no PIN configured.', 'Ova uloga nema postavljen PIN.')}
            </p>
          )}
        </div>
        {error && (
          <div className="text-red-400 text-xs">{error}</div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={handleConfirm}
            disabled={loading || !hasRoles}
            type="submit"
            className={`px-4 py-1.5 text-sm rounded transition-colors font-medium ${
              loading || !hasRoles ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'text-blue-400 hover:bg-blue-500/10'
            }`}
          >
            {label('Unlock', 'Otključaj')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RoleUnlockModal;


