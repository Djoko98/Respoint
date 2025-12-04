import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { RoleConfigEntry, RolePermissionKey } from '../../types/user';
import { ROLE_PERMISSION_DEFINITIONS, MAX_ROLE_COUNT } from '../../constants/rolePermissions';
import { hashPin } from '../../utils/pin';
import { ThemeContext } from '../../context/ThemeContext';

interface Props {
  roles: RoleConfigEntry[];
  onRolesChange: (roles: RoleConfigEntry[]) => void;
  maxRoles?: number;
  isAdmin?: boolean;
  isOpen?: boolean;
}

const generateRoleId = () => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {}
  return `role-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const RolePasswordsSection: React.FC<Props> = ({
  roles,
  onRolesChange,
  maxRoles = MAX_ROLE_COUNT,
  isAdmin,
  isOpen,
}) => {
  const { currentLanguage } = useLanguage();
  const { theme } = useContext(ThemeContext);
  const isLight = theme === 'light';
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [pinErrors, setPinErrors] = useState<Record<string, string>>({});
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  const initializedRef = useRef(false);
  const wasOpenRef = useRef(false);
  const canEdit = Boolean(isAdmin);
  const roleList = Array.isArray(roles) ? roles : [];
  const permissionDefs = useMemo(() => ROLE_PERMISSION_DEFINITIONS, []);
  const disableAddRole = roleList.length >= maxRoles || !canEdit;

  useEffect(() => {
    setPinInputs((prev) => {
      const next: Record<string, string> = {};
      roleList.forEach((role) => {
        next[role.id] = prev[role.id] || '';
      });
      return next;
    });
    setPinErrors((prev) => {
      const next: Record<string, string> = {};
      roleList.forEach((role) => {
        next[role.id] = prev[role.id] || '';
      });
      return next;
    });
  }, [roles]);

  useEffect(() => {
    setExpandedRoles((prev) => {
      const next: Record<string, boolean> = {};
      const roleIds = new Set(roleList.map((role) => role.id));
      roleList.forEach((role) => {
        if (prev.hasOwnProperty(role.id)) {
          next[role.id] = prev[role.id];
        } else {
          next[role.id] = initializedRef.current ? true : false;
        }
      });
      Object.keys(prev).forEach((key) => {
        if (!roleIds.has(key)) {
          delete next[key];
        }
      });
      initializedRef.current = true;
      return next;
    });
  }, [roleList]);

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    setExpandedRoles(
      roleList.reduce((acc, role) => {
        acc[role.id] = false;
        return acc;
      }, {} as Record<string, boolean>)
    );
    wasOpenRef.current = true;
  }, [isOpen, roleList]);

  const updateRole = (roleId: string, updater: (role: RoleConfigEntry) => RoleConfigEntry) => {
    if (!canEdit) return;
    onRolesChange(roleList.map((role) => (role.id === roleId ? updater(role) : role)));
  };

  const handleRoleNameChange = (roleId: string, value: string) => {
    updateRole(roleId, (role) => ({ ...role, name: value }));
  };

  const handlePermissionToggle = (roleId: string, permission: RolePermissionKey) => {
    updateRole(roleId, (role) => {
      const set = new Set(role.permissions || []);
      if (set.has(permission)) {
        set.delete(permission);
      } else {
        set.add(permission);
      }
      return { ...role, permissions: Array.from(set) as RolePermissionKey[] };
    });
  };

  const handleAddRole = () => {
    if (disableAddRole) return;
    const index = roleList.length + 1;
    const defaultName = currentLanguage === 'srb' ? `Nova uloga ${index}` : `New role ${index}`;
    const newRole: RoleConfigEntry = {
      id: generateRoleId(),
      name: defaultName,
      permissions: [],
      pinHash: null,
    };
    onRolesChange([...roleList, newRole]);
    setExpandedRoles((prev) => ({ ...prev, [newRole.id]: true }));
  };

  const handleRemoveRole = (roleId: string) => {
    if (!canEdit || roleList.length <= 1) return;
    onRolesChange(roleList.filter((role) => role.id !== roleId));
  };

  const handlePinInputChange = (roleId: string, value: string) => {
    const sanitized = value.replace(/\D/g, '').slice(0, 4);
    setPinInputs((prev) => ({ ...prev, [roleId]: sanitized }));
    setPinErrors((prev) => ({ ...prev, [roleId]: '' }));
  };

  const handlePinApply = async (roleId: string) => {
    if (!canEdit) return;
    const pinValue = (pinInputs[roleId] || '').trim();
    if (!pinValue) {
      setPinErrors((prev) => ({
        ...prev,
        [roleId]: currentLanguage === 'srb' ? 'Unesite PIN' : 'Enter the PIN',
      }));
      return;
    }
    if (!/^\d{1,4}$/.test(pinValue)) {
      setPinErrors((prev) => ({
        ...prev,
        [roleId]: currentLanguage === 'srb' ? 'PIN može imati najviše 4 cifre' : 'PIN can have up to 4 digits',
      }));
      return;
    }
    const hashed = await hashPin(pinValue);
    updateRole(roleId, (role) => ({ ...role, pinHash: hashed }));
    setPinInputs((prev) => ({ ...prev, [roleId]: '' }));
    setPinErrors((prev) => ({ ...prev, [roleId]: '' }));
  };

  const handlePinRemove = (roleId: string) => {
    if (!canEdit) return;
    updateRole(roleId, (role) => ({ ...role, pinHash: null }));
    setPinInputs((prev) => ({ ...prev, [roleId]: '' }));
    setPinErrors((prev) => ({ ...prev, [roleId]: '' }));
  };

  const toggleRoleSection = (roleId: string) => {
    setExpandedRoles((prev) => ({
      ...prev,
      [roleId]: !prev[roleId],
    }));
  };

  const label = (en: string, sr: string) => (currentLanguage === 'srb' ? sr : en);
  const cardClasses = isLight ? 'border border-gray-200 bg-white shadow-sm' : 'border border-gray-800 bg-[#000814]';
  const arrowClasses = isLight ? 'border-gray-300 text-gray-600' : 'border-gray-700 text-gray-400';
  const summaryTextClass = isLight ? 'text-gray-600' : 'text-gray-500';
  const checkedRowClasses = isLight ? 'bg-blue-50 border-blue-200' : 'bg-[#0F1E33] border-gray-800';
  const uncheckedRowClasses = isLight ? 'border-gray-200' : 'border-transparent';
  const roleTitleClass = isLight ? 'text-gray-900' : 'text-white';
  const buttonBaseClass = 'px-3 py-1.5 text-xs rounded transition';
  const disabledButtonClass = isLight
    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
    : 'bg-gray-900 text-gray-600 cursor-not-allowed';
  const primaryButtonClass = isLight
    ? 'text-blue-400 hover:bg-blue-100 active:bg-blue-500/25'
    : 'text-blue-400 hover:bg-blue-500/10 active:bg-blue-500/20';
  const dangerButtonClass = isLight
    ? 'text-red-400 hover:bg-red-100 active:bg-red-500/25'
    : 'text-red-400 hover:bg-red-500/10 active:bg-red-500/20';

  return (
    <div className="bg-[#0A1929] border border-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-white text-sm font-medium mb-1">
            {label('Role permissions & PINs', 'Uloge, dozvole i PIN-ovi')}
          </h3>
          <p className="text-xs text-gray-400">
            {label(
              'Add up to 5 roles, pick unlocked features and assign a PIN with up to 4 digits.',
              'Dodajte do 5 uloga, odaberite otključane funkcije i postavite PIN do 4 cifre.'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddRole}
          disabled={disableAddRole}
          className={`${buttonBaseClass} ${disableAddRole ? disabledButtonClass : primaryButtonClass}`}
        >
          {disableAddRole
            ? label('Max roles reached', 'Dostignut maksimalan broj uloga')
            : label('Add role', 'Dodaj ulogu')}
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {roleList.map((role) => {
          const selections = role.permissions || [];
          const pinValue = pinInputs[role.id] || '';
          const pinError = pinErrors[role.id];
          const pinSet = Boolean(role.pinHash);
          const isExpanded = expandedRoles[role.id];
          const summary =
            selections.length > 0
              ? currentLanguage === 'srb'
                ? `${selections.length} funkcija otključano`
                : `${selections.length} features unlocked`
              : currentLanguage === 'srb'
                ? 'Nema funkcija'
                : 'No features selected';
          return (
            <div key={role.id} className={`${cardClasses} rounded-lg p-4`}>
              <button
                type="button"
                onClick={() => toggleRoleSection(role.id)}
                className="w-full flex items-center gap-3 text-left focus:outline-none group"
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${arrowClasses} transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${roleTitleClass}`}>
                    {role.name || label('Untitled role', 'Uloga bez naziva')}
                  </div>
                  <div className={`text-xs ${summaryTextClass}`}>{summary}</div>
                </div>
                <span className={`text-xs ${pinSet ? 'text-green-400' : 'text-gray-500'}`}>
                  {pinSet ? label('PIN configured', 'PIN je postavljen') : label('PIN not set', 'PIN nije postavljen')}
                </span>
              </button>

              {isExpanded && (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start md:gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">
                        {label('Role name', 'Naziv uloge')}
                      </label>
                      <input
                        type="text"
                        value={role.name}
                        onChange={(e) => handleRoleNameChange(role.id, e.target.value)}
                        disabled={!canEdit}
                        className={`w-full px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none ${
                          !canEdit ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>
                    <div className="flex mt-3 md:mt-[26px]">
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(role.id)}
                        disabled={!canEdit || roleList.length <= 1}
                        className={`${buttonBaseClass} ${
                          !canEdit || roleList.length <= 1 ? disabledButtonClass : dangerButtonClass
                        }`}
                      >
                        {label('Remove', 'Ukloni')}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2">
                      {label('Unlocked features', 'Otključane funkcije')}
                    </p>
                    <div className="space-y-2">
                      {permissionDefs.map((perm) => {
                        const checked = selections.includes(perm.key);
                        return (
                          <label
                            key={perm.key}
                            className={`flex items-start gap-3 rounded border px-2 py-2 ${
                              checked ? checkedRowClasses : uncheckedRowClasses
                            } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 accent-blue-500"
                              checked={checked}
                              disabled={!canEdit}
                              onChange={() => handlePermissionToggle(role.id, perm.key)}
                            />
                            <div>
                              <div className="text-sm text-white">
                                {currentLanguage === 'srb' ? perm.labelSr : perm.labelEn}
                              </div>
                              <p className="text-xs text-gray-500">
                                {currentLanguage === 'srb' ? perm.descriptionSr : perm.descriptionEn}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-800">
                    <label className="block text-xs text-gray-500 mb-1">
                      {label('Role PIN (numbers only, max 4 digits)', 'PIN za ulogu (samo brojevi, do 4 cifre)')}
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={pinValue}
                        onChange={(e) => handlePinInputChange(role.id, e.target.value)}
                        placeholder="••••"
                        disabled={!canEdit}
                        className={`w-24 px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-center text-sm text-white placeholder-gray-600 focus:border-gray-600 focus:outline-none ${
                          !canEdit ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handlePinApply(role.id)}
                        disabled={!canEdit}
                        className={`${buttonBaseClass} ${!canEdit ? disabledButtonClass : primaryButtonClass}`}
                      >
                        {label('Set PIN', 'Postavi PIN')}
                      </button>
                      {pinSet && (
                        <button
                          type="button"
                          onClick={() => handlePinRemove(role.id)}
                          disabled={!canEdit}
                          className={`${buttonBaseClass} ${!canEdit ? disabledButtonClass : dangerButtonClass}`}
                        >
                          {label('Remove PIN', 'Ukloni PIN')}
                        </button>
                      )}
                      <span className={`text-xs ${pinSet ? 'text-green-400' : 'text-gray-500'}`}>
                        {pinSet ? label('PIN configured', 'PIN je postavljen') : label('PIN not set', 'PIN nije postavljen')}
                      </span>
                    </div>
                    {pinError && <p className="text-xs text-red-400 mt-1">{pinError}</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RolePasswordsSection;


