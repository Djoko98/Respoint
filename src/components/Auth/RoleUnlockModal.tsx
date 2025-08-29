import React, { useContext, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { UserContext } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../utils/supabaseClient';
import { UserRole } from '../../types/user';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const RoleUnlockModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, setActiveRole } = useContext(UserContext as any);
  const { currentLanguage } = useLanguage();
  const [role, setRole] = useState<UserRole>('admin');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const label = (en: string, sr: string) => (currentLanguage === 'srb' ? sr : en);

  const canChooseManager = true;
  const canChooseWaiter = true;

  const hashPin = async (val: string): Promise<string> => {
    const enc = new TextEncoder().encode(val);
    const digest = await crypto.subtle.digest('SHA-256', enc);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const verifyPin = useMemo(() => async (): Promise<boolean> => {
    setError('');
    if (!user?.id) return false;
    const { data, error } = await supabase
      .from('profiles')
      .select('admin_pin_hash,manager_pin_hash,waiter_pin_hash')
      .eq('id', user.id)
      .maybeSingle();
    if (error) return false;
    const target = role === 'admin' ? (data as any)?.admin_pin_hash
                  : role === 'manager' ? (data as any)?.manager_pin_hash
                  : (data as any)?.waiter_pin_hash;
    if (!target) return false;
    const hashed = await hashPin(pin.trim());
    return hashed === target;
  }, [pin, role, user?.id, user?.role]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const ok = await verifyPin();
      if (!ok) {
        setError(label('Invalid PIN', 'Neispravan PIN'));
        setLoading(false);
        return;
      }
      setActiveRole(role);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!loading) {
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
          if (!loading) {
            void handleConfirm();
          }
        }}
      >
        <div>
          <label className="block text-xs text-gray-500 mb-1">{label('Role', 'Uloga')}</label>
          <select
            className="w-full px-3 py-2 bg-[#000814] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            onKeyDown={handleKeyDown}
          >
            <option value="admin">{label('Admin', 'Admin')}</option>
            {canChooseManager && <option value="manager">{label('Manager', 'Menadžer')}</option>}
            {canChooseWaiter && <option value="waiter">{label('Waiter', 'Konobar')}</option>}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{label('PIN', 'PIN')}</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full px-3 py-2 bg-[#000814] border border-gray-800 rounded text-sm text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
            placeholder={label('Enter PIN', 'Unesite PIN')}
            onKeyDown={handleKeyDown}
          />
        </div>
        {error && (
          <div className="text-red-400 text-xs">{error}</div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={handleConfirm}
            disabled={loading}
            type="submit"
            className={`px-4 py-1.5 text-sm rounded transition-colors font-medium ${loading ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'text-blue-400 hover:bg-blue-500/10'}`}
          >
            {label('Unlock', 'Otključaj')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RoleUnlockModal;


