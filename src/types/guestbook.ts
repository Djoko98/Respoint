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


