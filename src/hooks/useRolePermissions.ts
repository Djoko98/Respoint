import { useCallback, useContext, useMemo } from 'react';
import { UserContext } from '../context/UserContext';
import { RolePermissionKey, RoleConfigEntry } from '../types/user';

export const useRolePermissions = () => {
  const { user, activeRole } = useContext(UserContext);

  const activeRoleConfig: RoleConfigEntry | undefined = useMemo(() => {
    if (!user?.roleConfig?.length || !activeRole) return undefined;
    return user.roleConfig.find((role) => role.id === activeRole);
  }, [user?.roleConfig, activeRole]);

  const hasPermission = useCallback(
    (permission: RolePermissionKey) => {
      if (!activeRoleConfig) return false;
      return activeRoleConfig.permissions.includes(permission);
    },
    [activeRoleConfig]
  );

  return {
    hasPermission,
    activeRoleConfig,
    roles: user?.roleConfig || [],
  };
};

