export interface GuestbookEntry {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  visitFrequency?: string; // e.g., Weekly, Monthly, Rarely
  specialRelationNote?: string; // relation with restaurant/owner
  preferredSeating?: string; // favorite zone/table preferences
  favoriteDrinks?: string; // free text or comma-separated
  favoriteFoods?: string; // free text or comma-separated
  allergens?: string; // known allergens for the guest, free text

  // Social links
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  twitter?: string;
  website?: string;

  // Extra profile fields
  birthDate?: string; // ISO date (YYYY-MM-DD)
  location?: string; // e.g., "Belgrade, Serbia"
  favoriteWine?: string;
  foodRequests?: string;
  drinkRequests?: string;
  averageBill?: number; // average bill amount
  notes?: string; // additional wishes/preferences
  lastVisitAt?: string; // ISO string
  company?: string;
  joinDate?: string; // ISO date string
  source?: string; // e.g., InHouse, Online, Referral
  isVip?: boolean; // loyalty / important guest
  tags?: string[]; // arbitrary labels e.g., "Vegetarian", "Leaves big tips"

  // Optional simple counters (can be synced from reservations later)
  totalVisits?: number;
  cancellations?: number;
  noShows?: number;
  totalReservations?: number;
  reservationsOnline?: number;
  moneySpent?: number; // aggregate
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}


