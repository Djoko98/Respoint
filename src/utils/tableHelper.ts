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
  type?: 'rectangle' | 'circle';
  rotation?: number;
  color?: string;
  status?: 'available' | 'occupied' | 'inactive';
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
 * @param tableIds - Array of table IDs
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
  const validTableNames = tableIds
    .map(id => {
      const table = allTables.find(t => t.id === id);
      return table ? (table.name || table.number?.toString() || `Table ${table.number}`) : null;
    })
    .filter(name => name !== null) as string[];

  // Handle the case where some or all tables are deleted
  const deletedTablesCount = tableIds.length - validTableNames.length;
  
  if (validTableNames.length === 0) {
    // All tables are deleted
    return deletedTablesCount === 1 ? 'Table deleted' : 'Tables deleted';
  } else if (deletedTablesCount > 0) {
    // Some tables are deleted
    const deletedText = deletedTablesCount === 1 ? '1 deleted table' : `${deletedTablesCount} deleted tables`;
    return `${validTableNames.join(', ')} + ${deletedText}`;
  } else {
    // All tables exist
    return validTableNames.join(', ');
  }
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
    return 'Deleted table';
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