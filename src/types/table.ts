export interface Table {
  id: string;
  number: number;
  seats: number;
  x: number;
  y: number;
  color?: string;
}

// Database interface matching the exact Supabase layouts schema
export interface LayoutDB {
  id: string; // uuid
  user_id: string; // uuid
  zone_id: string; // uuid
  name: string; // text
  data: any; // jsonb
  is_active: boolean; // boolean
  created_at?: string; // timestamp with time zone
  updated_at?: string; // timestamp with time zone
}

// Application interface for easier use in components
export interface Layout {
  id: string;
  user_id: string;
  zone_id: string;
  name: string;
  data: {
    tables: any[];
    walls: any[];
    labels: any[];
  };
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Database interface matching the exact Supabase saved_layouts schema
export interface SavedLayoutDB {
  id: string; // uuid
  user_id: string; // uuid
  zone_id: string; // uuid
  name: string; // text
  layout: any; // jsonb
  is_default: boolean; // boolean
  created_at?: string; // timestamp with time zone
  updated_at?: string; // timestamp with time zone
}

// Application interface for easier use in components
export interface SavedLayout {
  id: string;
  user_id: string;
  zone_id: string;
  name: string;
  layout: {
    tables: any[];
    walls: any[];
    texts: any[];
  };
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

// Database interface matching the exact Supabase zone_layouts schema
export interface ZoneLayoutDB {
  id: string; // uuid
  user_id: string; // uuid
  zone_id: string; // text (note: text, not uuid in zone_layouts)
  layout: any; // jsonb
  updated_at?: string; // timestamp with time zone
}

// Application interface for easier use in components
export interface ZoneLayout {
  id: string;
  user_id: string;
  zone_id: string;
  layout: any;
  updated_at?: string;
}

// Database interface matching the exact Supabase statistics schema
export interface StatisticsDB {
  id: string; // uuid
  user_id: string; // uuid
  date: string; // date
  total_reservations: number; // integer
  total_guests: number; // integer
  arrived_reservations: number; // integer (renamed from arrived_guests)
  cancelled_reservations: number; // integer
  not_arrived_reservations: number; // integer (new column)
  revenue: number; // numeric
  created_at?: string; // timestamp with time zone
  updated_at?: string; // timestamp with time zone
}

// Application interface for easier use in components
export interface Statistics {
  id: string;
  user_id: string;
  date: string;
  total_reservations: number;
  total_guests: number;
  arrived_reservations: number; // renamed from arrived_guests
  cancelled_reservations: number;
  not_arrived_reservations: number; // new field
  revenue: number;
  created_at?: string;
  updated_at?: string;
}

// Database interface matching the exact Supabase subscription_plans schema
export interface SubscriptionPlanDB {
  id: string; // uuid
  name: string; // text
  price: number; // numeric
  features: any; // jsonb
  max_reservations?: number; // integer
  max_zones?: number; // integer
  created_at?: string; // timestamp with time zone
  updated_at?: string; // timestamp with time zone
}

// Application interface for easier use in components
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  max_reservations: number | null;
  max_zones: number | null;
  created_at?: string;
  updated_at?: string;
}

// Database interface matching the exact Supabase user_subscriptions schema
export interface UserSubscriptionDB {
  id: string; // uuid
  user_id: string; // uuid
  plan_id: string; // uuid
  status: string; // text
  starts_at?: string; // timestamp with time zone
  ends_at?: string; // timestamp with time zone
  created_at?: string; // timestamp with time zone
  updated_at?: string; // timestamp with time zone
}

// Application interface for easier use in components
export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired';
  starts_at?: string;
  ends_at?: string;
  created_at?: string;
  updated_at?: string;
  plan?: SubscriptionPlan;
}
