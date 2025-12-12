// Helper functions for table display

export interface Table {
  id: string;
  number: number;
  name?: string;
  seats: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  type?: 'rectangle' | 'circle' | 'chair';
  chairVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
  rotation?: number;
  color?: string;
  status?: 'available' | 'occupied' | 'inactive';
  attachedToTableId?: string;
  chairsLocked?: boolean;
  chairGuides?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    topVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    rightVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    bottomVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    leftVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    cornerTL?: boolean;
    cornerTR?: boolean;
    cornerBR?: boolean;
    cornerBL?: boolean;
    cornerTLVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    cornerTRVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    cornerBRVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    cornerBLVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    circleCount?: number;
    circleStartDeg?: number;
    circleVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    circleVariants?: Array<'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'>;
    // Global chair sizing & spacing (applied unless overridden per seat/corner)
    chairWidthPx?: number;
    chairHeightPx?: number;
    chairSpacingPx?: number;
    // Optional per-seat size overrides by side (index-aligned with seat order)
    topSeatSizes?: Array<{ w?: number; h?: number }>;
    rightSeatSizes?: Array<{ w?: number; h?: number }>;
    bottomSeatSizes?: Array<{ w?: number; h?: number }>;
    leftSeatSizes?: Array<{ w?: number; h?: number }>;
    // Optional explicit corner sizes
    cornerTLWidthPx?: number;
    cornerTLHeightPx?: number;
    cornerTRWidthPx?: number;
    cornerTRHeightPx?: number;
    cornerBRWidthPx?: number;
    cornerBRHeightPx?: number;
    cornerBLWidthPx?: number;
    cornerBLHeightPx?: number;
    // Optional per-seat size overrides for circular tables
    circleSeatSizes?: Array<{ w?: number; h?: number }>;
  };
}

export interface ZoneLayouts {
  [zoneId: string]: {
    tables: Table[];
    walls: any[];
    texts: any[];
  };
}

/**
 * Formats table names for display, handling deleted tables gracefully
 * @param tableIds - Array of table IDs or table numbers (as strings)
 * @param zoneLayouts - Zone layouts containing table data
 * @returns Formatted string of table names or appropriate message for deleted tables
 */
export const formatTableNames = (tableIds: string[] | undefined | null, zoneLayouts: ZoneLayouts | null): string => {
  // Handle empty or null tableIds
  if (!tableIds || tableIds.length === 0) {
    return 'No tables assigned';
  }

  // Get all tables from all zones
  const allTables = Object.values(zoneLayouts || {}).flatMap(l => l.tables || []);
  
  // Map table IDs to names, filtering out deleted tables
  // Try matching by ID first, then by table number (event reservations store numbers as strings)
  const validTableNames = tableIds
    .map(id => {
      // First try to find by exact ID match
      let table = allTables.find(t => t.id === id);
      
      // If not found, try matching by table number (event reservations store numbers as strings)
      if (!table) {
        const numericId = parseInt(id, 10);
        if (!isNaN(numericId)) {
          table = allTables.find(t => t.number === numericId);
        }
        // Also try string match on number
        if (!table) {
          table = allTables.find(t => String(t.number) === id);
        }
      }
      
      return table ? (table.name || table.number?.toString() || `Table ${table.number}`) : null;
    })
    .filter(name => name !== null) as string[];

  // Ako su svi stolovi izbrisani, ne prikazujemo nikakvu poruku – ostavi prazno
  if (validTableNames.length === 0) {
    return '';
  }

  // Ako su neki stolovi izbrisani, prikazujemo samo postojeće (bez "+ deleted table" teksta)
  return validTableNames.join(', ');
};

/**
 * Gets the display name for a single table
 * @param tableId - Table ID
 * @param zoneLayouts - Zone layouts containing table data
 * @returns Table name or 'Deleted table' if not found
 */
export const getTableDisplayName = (tableId: string, zoneLayouts: ZoneLayouts | null): string => {
  const allTables = Object.values(zoneLayouts || {}).flatMap(l => l.tables || []);
  const table = allTables.find(t => t.id === tableId);
  
  if (table) {
    return table.name || table.number?.toString() || `Table ${table.number}`;
  } else {
    // Za izbrisane stolove ne prikazujemo posebnu poruku
    return '';
  }
};

/**
 * Checks if a table exists in the current layouts
 * @param tableId - Table ID to check
 * @param zoneLayouts - Zone layouts containing table data
 * @returns True if table exists, false otherwise
 */
export const tableExists = (tableId: string, zoneLayouts: ZoneLayouts | null): boolean => {
  const allTables = Object.values(zoneLayouts || {}).flatMap(l => l.tables || []);
  return allTables.some(t => t.id === tableId);
};

// Zone helper types and functions
export interface Zone {
  id: string;
  name: string;
  color?: string;
  user_id?: string;
  created_at?: string;
  order: number;
}

/**
 * Formats zone name for display, handling deleted zones gracefully
 * @param zoneId - Zone ID from reservation
 * @param zoneName - Zone name from JOIN (if available)
 * @param zones - Array of current zones
 * @returns Formatted zone name or appropriate message for deleted zones
 */
export const formatZoneName = (
  zoneId: string | undefined | null, 
  zoneName: string | undefined | null, 
  zones: Zone[] | null | undefined
): string => {
  // If no zone ID, return dash
  if (!zoneId) {
    return '-';
  }

  // If we have a zone name from JOIN, use it
  if (zoneName) {
    return zoneName;
  }

  // Try to find the zone in current zones list
  const zone = zones?.find(z => z.id === zoneId);
  if (zone) {
    return zone.name;
  }

  // Zone not found - it was deleted
  return 'Deleted zone';
};

/**
 * Checks if a zone exists in the current zones list
 * @param zoneId - Zone ID to check
 * @param zones - Array of current zones
 * @returns True if zone exists, false otherwise
 */
export const zoneExists = (zoneId: string, zones: Zone[] | null | undefined): boolean => {
  return zones?.some(z => z.id === zoneId) ?? false;
}; 