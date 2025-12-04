import { RolePermissionKey, RoleConfigEntry } from '../types/user';

export interface RolePermissionDefinition {
  key: RolePermissionKey;
  labelEn: string;
  labelSr: string;
  descriptionEn: string;
  descriptionSr: string;
}

export const ROLE_PERMISSION_DEFINITIONS: RolePermissionDefinition[] = [
  {
    key: 'edit_layout',
    labelEn: 'Edit layout & tables',
    labelSr: 'Uredi raspored i stolove',
    descriptionEn: 'Allows adding, moving and deleting tables on the canvas.',
    descriptionSr: 'Dozvoljava dodavanje, pomeranje i brisanje stolova na mapi.',
  },
  {
    key: 'manage_zones',
    labelEn: 'Manage zones',
    labelSr: 'Upravljaj zonama',
    descriptionEn: 'Allows creating, renaming and sorting zones.',
    descriptionSr: 'Dozvoljava kreiranje, preimenovanje i sortiranje zona.',
  },
  {
    key: 'manage_waiters',
    labelEn: 'Manage waiters panel',
    labelSr: 'Panel za konobare',
    descriptionEn: 'Allows opening the waiter panel and assigning waiters.',
    descriptionSr: 'Dozvoljava otvaranje panela za konobare i dodelu konobara.',
  },
  {
    key: 'access_account_settings',
    labelEn: 'Account settings',
    labelSr: 'Podešavanja naloga',
    descriptionEn: 'Allows opening and editing account settings.',
    descriptionSr: 'Dozvoljava otvaranje i izmenu podešavanja naloga.',
  },
  {
    key: 'access_subscription',
    labelEn: 'Subscription & billing',
    labelSr: 'Pretplata i plaćanje',
    descriptionEn: 'Allows opening the subscription dialog.',
    descriptionSr: 'Dozvoljava pristup dijalogu za pretplatu.',
  },
  {
    key: 'access_statistics',
    labelEn: 'Statistics',
    labelSr: 'Statistika',
    descriptionEn: 'Allows opening the statistics dashboard.',
    descriptionSr: 'Dozvoljava pristup statistici.',
  },
];

export const ROLE_PERMISSION_KEYS = ROLE_PERMISSION_DEFINITIONS.map((def) => def.key);

export interface RoleTemplate extends RoleConfigEntry {}

export const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'role-admin',
    name: 'Admin',
    permissions: [...ROLE_PERMISSION_KEYS],
  },
  {
    id: 'role-manager',
    name: 'Manager',
    permissions: ROLE_PERMISSION_KEYS.filter(
      (key) => key !== 'access_account_settings' && key !== 'access_subscription'
    ),
  },
  {
    id: 'role-waiter',
    name: 'Waiter',
    permissions: [],
  },
];

export const MAX_ROLE_COUNT = 5;

export const sanitizePermissions = (permissions: RolePermissionKey[]) =>
  permissions.filter((perm): perm is RolePermissionKey => ROLE_PERMISSION_KEYS.includes(perm));

