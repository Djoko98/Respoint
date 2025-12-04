export type UserRole = string;

export type RolePermissionKey =
  | 'edit_layout'
  | 'manage_zones'
  | 'manage_waiters'
  | 'access_account_settings'
  | 'access_subscription'
  | 'access_statistics';

export interface RoleConfigEntry {
  id: string;
  name: string;
  permissions: RolePermissionKey[];
  pinHash?: string | null;
}

// Database interface matching the exact Supabase profiles schema
export interface ProfileDB {
  id: string; // uuid (references auth.users)
  updated_at?: string; // timestamp with time zone
  name?: string; // text
  restaurant_name?: string; // text
  role?: string; // text
}

// Application interface for easier use in components
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleConfig?: RoleConfigEntry[];
  restaurantName?: string;
  isSubscribed?: boolean;
  // Additional fields not in profiles table but used in app
  phone?: string;
  address?: string;
  logo?: string; // Base64 encoded image or URL (for header display)
  logoLightUrl?: string; // URL for light theme header/logo
  printLogoUrl?: string; // URL for print/PDF logo (used in receipts and print documents)
  timezone?: string;
  language?: string;
  autoArchive?: boolean;
  // Role PIN presence flags (derived from profiles table hash columns)
  hasAdminPin?: boolean;
  hasManagerPin?: boolean;
  hasWaiterPin?: boolean;
}
