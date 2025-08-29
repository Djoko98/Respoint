import React, { useCallback, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  onSetHashes: (hashes: { admin_pin_hash?: string; manager_pin_hash?: string; waiter_pin_hash?: string }) => void;
  hasAdminPin?: boolean;
  hasManagerPin?: boolean;
  hasWaiterPin?: boolean;
  isAdmin?: boolean;
}

// Simple hash for local obfuscation before sending to DB (not cryptographically secure).
// Server-side column is treated as opaque string. Real security relies on not storing cleartext.
const hashPin = async (pin: string): Promise<string> => {
  const enc = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
};

const RolePasswordsSection: React.FC<Props> = ({ onSetHashes, hasAdminPin, hasManagerPin, hasWaiterPin, isAdmin }) => {
  const { t, currentLanguage } = useLanguage();
  const [adminPin, setAdminPin] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [waiterPin, setWaiterPin] = useState('');
  const [saving, setSaving] = useState(false);
  const canEdit = Boolean(isAdmin);
  const [isEditing, setIsEditing] = useState(canEdit ? !(hasAdminPin || hasManagerPin || hasWaiterPin) : false);

  const handleSavePins = useCallback(async () => {
    setSaving(true);
    const payload: { admin_pin_hash?: string; manager_pin_hash?: string; waiter_pin_hash?: string } = {};
    if (adminPin.trim()) payload.admin_pin_hash = await hashPin(adminPin.trim());
    if (managerPin.trim()) payload.manager_pin_hash = await hashPin(managerPin.trim());
    if (waiterPin.trim()) payload.waiter_pin_hash = await hashPin(waiterPin.trim());
    onSetHashes(payload);
    setSaving(false);
    setIsEditing(false);
    setAdminPin('');
    setManagerPin('');
    setWaiterPin('');
  }, [adminPin, managerPin, waiterPin, onSetHashes]);

  const label = (en: string, sr: string) => (currentLanguage === 'srb' ? sr : en);

  return (
    <div className="bg-[#0A1929] border border-gray-800 rounded-lg p-4">
      <h3 className="text-white text-sm font-medium mb-3">{label('Role PINs', 'PIN kodovi za uloge')}</h3>
      <p className="text-xs text-gray-400 mb-4">{label('Optional 4-8 digit PINs to unlock roles after login.', 'Opcioni PIN kodovi (4-8 cifara) za otključavanje uloga posle logovanja.')}</p>

      {!isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">{label('Admin PIN', 'Admin PIN')}</div>
            <div className="text-xs {hasAdminPin ? 'text-green-400' : 'text-gray-500'}">
              {hasAdminPin ? label('Set', 'Postavljen') : label('Not set', 'Nije postavljen')}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">{label('Manager PIN', 'Menadžer PIN')}</div>
            <div className="text-xs {hasManagerPin ? 'text-green-400' : 'text-gray-500'}">
              {hasManagerPin ? label('Set', 'Postavljen') : label('Not set', 'Nije postavljen')}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">{label('Waiter PIN', 'Konobar PIN')}</div>
            <div className="text-xs {hasWaiterPin ? 'text-green-400' : 'text-gray-500'}">
              {hasWaiterPin ? label('Set', 'Postavljen') : label('Not set', 'Nije postavljen')}
            </div>
          </div>
          {canEdit ? (
            <div className="flex justify-end pt-2">
              <button
                onClick={() => canEdit && setIsEditing(true)}
                className="px-3 py-1.5 text-xs rounded text-blue-400 hover:bg-blue-500/10"
              >
                {label('Edit', 'Izmeni')}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        canEdit ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{label('Admin PIN', 'Admin PIN')}</label>
              <input
                type="password"
                inputMode="numeric"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder={label('Enter PIN', 'Unesite PIN')}
                className="w-full px-3 py-2 bg-[#000814] border border-gray-800 rounded text-sm text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{label('Manager PIN', 'Menadžer PIN')}</label>
              <input
                type="password"
                inputMode="numeric"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                placeholder={label('Enter PIN', 'Unesite PIN')}
                className="w-full px-3 py-2 bg-[#000814] border border-gray-800 rounded text-sm text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{label('Waiter PIN', 'Konobar PIN')}</label>
              <input
                type="password"
                inputMode="numeric"
                value={waiterPin}
                onChange={(e) => setWaiterPin(e.target.value)}
                placeholder={label('Enter PIN', 'Unesite PIN')}
                className="w-full px-3 py-2 bg-[#000814] border border-gray-800 rounded text-sm text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 text-sm rounded text-gray-300 hover:bg-gray-800"
            >
              {label('Cancel', 'Otkaži')}
            </button>
            <button
              onClick={handleSavePins}
              disabled={saving}
              className={`px-4 py-1.5 text-sm rounded transition-colors font-medium ${saving ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'text-blue-400 hover:bg-blue-500/10'}`}
            >
              {label('Apply PINs', 'Primeni PIN-ove')}
            </button>
          </div>
        </>
        ) : null
      )}
    </div>
  );
};

export default RolePasswordsSection;


