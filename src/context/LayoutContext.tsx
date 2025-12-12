import React, { createContext, useState, ReactNode, useContext, useEffect, useCallback, useRef } from "react";
import { supabase } from "../utils/supabaseClient";
import { ZoneContext } from "./ZoneContext";
import { UserContext } from "./UserContext";
import { layoutsService } from "../services/layoutsService";

// Re-introducing the global Undo/Redo hook
const useUndoRedo = <T,>(initialState: T) => {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);

  // Sync ref with state
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const setState = useCallback((newState: T | ((prevState: T) => T)) => {
    setHistory(prevHistory => {
      const currentIdx = currentIndexRef.current;
      const newHistory = prevHistory.slice(0, currentIdx + 1);
      const currentState = newHistory[currentIdx];
      const finalState = typeof newState === 'function' 
        ? (newState as (prevState: T) => T)(currentState) 
        : newState;

      if (JSON.stringify(finalState) === JSON.stringify(currentState)) {
        return prevHistory;
      }

      newHistory.push(finalState);
      const newIndex = newHistory.length - 1;
      setCurrentIndex(newIndex);
      currentIndexRef.current = newIndex;
      return newHistory;
    });
  }, []);
  
  const undo = useCallback(() => {
    if (canUndo) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      currentIndexRef.current = newIndex;
    }
  }, [canUndo, currentIndex]);

  const redo = useCallback(() => {
    if (canRedo) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      currentIndexRef.current = newIndex;
    }
  }, [canRedo, currentIndex]);
  
  const reset = useCallback((state: T) => {
    setHistory([state]);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
  }, []);

  return { state: history[currentIndex], setState, undo, redo, canUndo, canRedo, reset };
};

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
  // If this element is a generated chair, it may reference the table it's attached to
  attachedToTableId?: string;
  // When true (for non-chair tables), attached chairs should move/rotate/scale/copy with the table
  chairsLocked?: boolean;
  chairGuides?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    // Optional per-side chair variant selection
    topVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    rightVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    bottomVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    leftVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    // Optional corner toggles
    cornerTL?: boolean;
    cornerTR?: boolean;
    cornerBR?: boolean;
    cornerBL?: boolean;
    // Optional per-corner variant selection
    cornerTLVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    cornerTRVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    cornerBRVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    cornerBLVariant?: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU';
    // Circular tables: seats distributed around circumference
    circleCount?: number;
    circleStartDeg?: number; // starting angle offset in degrees
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

export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
}

export interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  rotation?: number;
  width?: number;
  height?: number;
  isParagraph: boolean;
}

export interface Layout {
  tables: Table[];
  walls: Wall[];
  texts: TextElement[];
}

export interface SavedLayout {
  id: string;
  name: string;
  layout: Layout;
  created_at: string;
  zone_id: string;
  user_id: string;
  is_default?: boolean;
}

export const emptyLayout: Layout = {
  tables: [],
  walls: [],
  texts: []
};

interface ZoneLayouts {
  [zoneId: string]: Layout;
}

interface SavedLayoutsMap {
  [zoneId: string]: SavedLayout[];
}

interface LayoutContextType {
  layout: Layout;
  zoneLayouts: ZoneLayouts;
  savedLayouts: SavedLayoutsMap;
  currentLayoutId: string | null;
  setLayout: (layout: Layout) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasChanges: boolean;
  saveLayout: () => Promise<void>;
  saveLayoutAs: (name: string, isDefault?: boolean) => Promise<void>;
  loadSavedLayout: (layoutId: string) => void;
  updateSavedLayout: (layoutId: string, currentLayout?: Layout) => Promise<void>;
  deleteSavedLayout: (layoutId: string) => Promise<void>;
  getDefaultLayout: () => SavedLayout | null;
  resetLayout: () => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}

export const LayoutContext = createContext<LayoutContextType>(null!);

export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentZone, zones } = useContext(ZoneContext);
  const { user } = useContext(UserContext);
  const [isEditingInternal, setIsEditingInternal] = useState(false);
  const [currentLayoutIds, setCurrentLayoutIds] = useState<{ [zoneId: string]: string | null }>({});
  const [savedLayouts, setSavedLayouts] = useState<SavedLayoutsMap>({});
  const [zoneLayouts, setZoneLayoutsInternal] = useState<ZoneLayouts>({});
  const [layoutAtEditStart, setLayoutAtEditStart] = useState<Layout | null>(null);
  
  const { 
    state: undoRedoLayouts, 
    setState: setUndoRedoState, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    reset: resetUndoRedo
  } = useUndoRedo<ZoneLayouts>({});

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Add ref to track save in progress
  const saveInProgressRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Define layout first
  const layout = currentZone ? (undoRedoLayouts[currentZone.id] || emptyLayout) : emptyLayout;
  const currentLayoutId = currentZone ? currentLayoutIds[currentZone.id] || null : null;

  // Calculate hasChanges
  const hasChanges = isEditingInternal && layoutAtEditStart !== null && 
    JSON.stringify(layout) !== JSON.stringify(layoutAtEditStart);

  // Track layout at edit start
  useEffect(() => {
    if (isEditingInternal && !layoutAtEditStart) {
      setLayoutAtEditStart(JSON.parse(JSON.stringify(layout)));
    } else if (!isEditingInternal) {
      setLayoutAtEditStart(null);
    }
  }, [isEditingInternal, layout, layoutAtEditStart]);

  // Load only saved layouts from Supabase when user is available
  useEffect(() => {
    if (!user?.id) {
      setZoneLayoutsInternal({});
      setSavedLayouts({});
      resetUndoRedo({});
      return;
    }

    const loadSavedLayoutsOnly = async () => {
      console.log('Loading saved layouts for user:', user.id);
      
      // Only fetch saved layouts - don't load working layouts automatically
      const { data: savedLayoutsData, error: savedError } = await supabase
        .from('saved_layouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (savedError) console.error("Error fetching saved layouts", savedError);
      
      const initialSavedLayouts: SavedLayoutsMap = {};
      const initialZoneLayouts: ZoneLayouts = {};
      
      savedLayoutsData?.forEach(sl => {
        if (!initialSavedLayouts[sl.zone_id]) {
          initialSavedLayouts[sl.zone_id] = [];
        }
        // Ensure the layout data is properly structured
        const savedLayout: SavedLayout = {
          id: sl.id,
          name: sl.name,
          layout: sl.layout || { tables: [], walls: [], texts: [] },
          created_at: sl.created_at,
          zone_id: sl.zone_id,
          user_id: sl.user_id,
          is_default: sl.is_default || false
        };
        initialSavedLayouts[sl.zone_id].push(savedLayout);
        
        // Only populate zone layouts with default saved layouts
        if (sl.is_default) {
          initialZoneLayouts[sl.zone_id] = savedLayout.layout;
        }
      });
      
      setSavedLayouts(initialSavedLayouts);
      setZoneLayoutsInternal(initialZoneLayouts);
      resetUndoRedo(initialZoneLayouts);
      
      console.log('Loaded saved layouts:', initialSavedLayouts);
      console.log('Loaded default zone layouts:', initialZoneLayouts);
    };
    
    loadSavedLayoutsOnly();
  }, [user?.id, resetUndoRedo]);

  // Clean up layout data for deleted zones
  useEffect(() => {
    if (!zones || zones.length === 0) return;

    const activeZoneIds = new Set(zones.map(zone => zone.id));
    const zoneLayoutsKeys = Object.keys(zoneLayouts);
    const undoRedoLayoutsKeys = Object.keys(undoRedoLayouts);
    
    // Check if there are any zone layouts for non-existent zones
    const zoneLayoutsToDelete = zoneLayoutsKeys.filter(zoneId => !activeZoneIds.has(zoneId));
    const undoRedoLayoutsToDelete = undoRedoLayoutsKeys.filter(zoneId => !activeZoneIds.has(zoneId));
    
    if (zoneLayoutsToDelete.length > 0 || undoRedoLayoutsToDelete.length > 0) {
      console.log('🧹 Cleaning up deleted zones from layouts:', {
        zoneLayoutsToDelete,
        undoRedoLayoutsToDelete
      });
      
      // Clean up zoneLayouts
      if (zoneLayoutsToDelete.length > 0) {
        const cleanedZoneLayouts = { ...zoneLayouts };
        zoneLayoutsToDelete.forEach(zoneId => {
          delete cleanedZoneLayouts[zoneId];
        });
        setZoneLayoutsInternal(cleanedZoneLayouts);
      }
      
      // Clean up undoRedoLayouts
      if (undoRedoLayoutsToDelete.length > 0) {
        const cleanedUndoRedoLayouts = { ...undoRedoLayouts };
        undoRedoLayoutsToDelete.forEach(zoneId => {
          delete cleanedUndoRedoLayouts[zoneId];
        });
        resetUndoRedo(cleanedUndoRedoLayouts);
      }
      
      // Clean up saved layouts and current layout ids for deleted zones
      const savedLayoutsToClean = Object.keys(savedLayouts).filter(zoneId => !activeZoneIds.has(zoneId));
      if (savedLayoutsToClean.length > 0) {
        const cleanedSavedLayouts = { ...savedLayouts };
        const cleanedCurrentIds = { ...currentLayoutIds };
        savedLayoutsToClean.forEach(zoneId => {
          delete cleanedSavedLayouts[zoneId];
          delete cleanedCurrentIds[zoneId];
        });
        setSavedLayouts(cleanedSavedLayouts);
        setCurrentLayoutIds(cleanedCurrentIds);
      }
    }
  }, [zones, zoneLayouts, undoRedoLayouts, savedLayouts, currentLayoutIds, resetUndoRedo]);

  // Add window focus event listener to refresh layouts when app comes back to focus
  useEffect(() => {
    let lastRefreshTime = Date.now();
    
    const handleWindowFocus = async () => {
      console.log('🔄 Window focused - refreshing layouts');
      
      // Don't refresh layouts if currently in edit mode to preserve unsaved changes
      if (isEditingInternal) {
        console.log('⏸️ Skipping layout refresh - in edit mode');
        return;
      }
      
      // Debounce to avoid multiple calls
      const now = Date.now();
      if (now - lastRefreshTime < 2000) {
        console.log('⏳ Skipping layout refresh - too soon after last refresh');
        return;
      }
      lastRefreshTime = now;
      
      if (!user?.id) return;

      try {
        // Only re-fetch saved layouts, not working layouts
        const { data: savedLayoutsData, error: savedError } = await supabase
          .from('saved_layouts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (savedError) {
          console.error("Error refreshing saved layouts", savedError);
          // Don't throw, just log and continue with what we have
          return;
        }
        
        const refreshedSavedLayouts: SavedLayoutsMap = {};
        const refreshedZoneLayouts: ZoneLayouts = {};
        
        savedLayoutsData?.forEach(sl => {
          if (!refreshedSavedLayouts[sl.zone_id]) {
            refreshedSavedLayouts[sl.zone_id] = [];
          }
          const savedLayout: SavedLayout = {
            id: sl.id,
            name: sl.name,
            layout: sl.layout || { tables: [], walls: [], texts: [] },
            created_at: sl.created_at,
            zone_id: sl.zone_id,
            user_id: sl.user_id,
            is_default: sl.is_default || false
          };
          refreshedSavedLayouts[sl.zone_id].push(savedLayout);
          
          // Only populate zone layouts with default saved layouts
          if (sl.is_default) {
            refreshedZoneLayouts[sl.zone_id] = savedLayout.layout;
          }
        });
        
        setSavedLayouts(refreshedSavedLayouts);
        setZoneLayoutsInternal(refreshedZoneLayouts);
        resetUndoRedo(refreshedZoneLayouts);
        
        console.log('✅ Layouts refreshed on focus');
      } catch (error) {
        console.error('❌ Error refreshing layouts on focus:', error);
        // Don't throw - app should continue to work with cached data
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [user?.id, resetUndoRedo, isEditingInternal]);

  // Sync internal state with undo/redo state
  useEffect(() => {
    setZoneLayoutsInternal(undoRedoLayouts);
  }, [undoRedoLayouts]);
  
  // Reset undo/redo history when zone changes
  useEffect(() => {
    if (currentZone && !isEditingInternal) {
      const currentLayout = zoneLayouts[currentZone.id] || emptyLayout;
      resetUndoRedo({
        ...zoneLayouts,
        [currentZone.id]: currentLayout
      });
    }
  }, [currentZone?.id, isEditingInternal]);
  
  // Debounced save for working layout
  const saveWorkingLayout = useCallback((zoneId: string, layoutToSave: Layout) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      if (!user?.id) return;
      
      // Check if layout exists for this zone.
      // We intentionally avoid .single() here to prevent 406 errors when no row exists.
      const { data: existingRows, error: selectError } = await supabase
        .from('layouts')
        .select('id')
        .eq('user_id', user.id)
        .eq('zone_id', zoneId)
        .eq('is_active', true)
        .limit(1);

      if (selectError) {
        console.error('Error checking existing layout:', selectError);
        return;
      }

      const existing = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;
      
      if (existing) {
        // Update existing layout
        const { error } = await supabase
          .from('layouts')
          .update({
            data: layoutToSave,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) {
          console.error("Error updating layout:", error);
        }
      } else {
        // Create new layout
        const { error } = await supabase
          .from('layouts')
          .insert({
            user_id: user.id,
            zone_id: zoneId,
            name: 'Main Layout',
            data: layoutToSave,
            is_active: true
          });

        if (error) {
          console.error("Error creating layout:", error);
        }
      }
    }, 500); // 500ms debounce delay
  }, [user?.id]);
  
  // This is our new main setter for layouts
  const setLayout = useCallback((newLayout: Layout) => {
    if (!currentZone) return;

    const newZoneLayouts = {
      ...undoRedoLayouts,
      [currentZone.id]: newLayout,
    };
    
    setUndoRedoState(newZoneLayouts); // Update undo/redo state
    
    // Don't automatically save working layouts to DB - only save when explicitly requested
  }, [currentZone, undoRedoLayouts, setUndoRedoState]);

  const getDefaultLayout = useCallback((): SavedLayout | null => {
    if (!currentZone) return null;
    const zoneSavedLayouts = savedLayouts[currentZone.id] || [];
    // Prefer explicitly marked default; otherwise fall back to the most recent saved layout (index 0)
    return zoneSavedLayouts.find(l => l.is_default) || zoneSavedLayouts[0] || null;
  }, [currentZone, savedLayouts]);

  // When switching to a zone or when its saved layouts change (and we're not editing),
  // ensure we load the currently active layout for that zone, or fall back to its default.
  useEffect(() => {
    if (!currentZone || isEditingInternal) return;

    const zoneId = currentZone.id;
    const zoneSavedLayouts = savedLayouts[zoneId] || [];

    let targetLayout: Layout = emptyLayout;
    let targetLayoutId: string | null = null;

    // 1) Try to use currently active layout ID for this zone, if it still exists
    const activeId = currentLayoutIds[zoneId];
    if (activeId) {
      const activeLayout = zoneSavedLayouts.find(l => l.id === activeId);
      if (activeLayout) {
        targetLayout = activeLayout.layout;
        targetLayoutId = activeLayout.id;
      }
    }

    // 2) If no active layout (or it no longer exists), fall back to default for this zone
    if (!targetLayoutId) {
      const defaultLayout = zoneSavedLayouts.find(l => l.is_default) || zoneSavedLayouts[0] || null;
      if (defaultLayout) {
        targetLayout = defaultLayout.layout;
        targetLayoutId = defaultLayout.id;
      } else {
        targetLayout = emptyLayout;
        targetLayoutId = null;
      }
    }

    // 3) Push the target layout into undo/redo state for this zone,
    //    avoiding unnecessary history entries if nothing actually changed.
    setUndoRedoState(prev => {
      const safePrev = (prev || {}) as ZoneLayouts;
      const existing = safePrev[zoneId] || emptyLayout;
      try {
        if (JSON.stringify(existing) === JSON.stringify(targetLayout)) {
          // No change for this zone; return original object to avoid triggering updates.
          return safePrev;
        }
      } catch {
        // If comparison fails for any reason, fall through and apply update
      }
      return {
        ...safePrev,
        [zoneId]: targetLayout
      };
    });

    setLayoutAtEditStart(null);

    // Only update currentLayoutIds when the value for this zone actually changes
    setCurrentLayoutIds(prev => {
      const prevId = prev[zoneId] ?? null;
      if (prevId === targetLayoutId) {
        return prev;
      }
      return { ...prev, [zoneId]: targetLayoutId };
    });

    if (targetLayoutId) {
      const name = zoneSavedLayouts.find(l => l.id === targetLayoutId)?.name || '';
      console.log(`Applied layout "${name}" for zone ${currentZone.name}`);
    } else {
      console.log(`No saved layouts for zone ${currentZone.name}, using empty layout`);
    }
  }, [currentZone?.id, isEditingInternal, savedLayouts, currentLayoutIds, setUndoRedoState]);
  
  const saveLayoutAs = async (name: string, isDefault: boolean = false) => {
    if (!currentZone || !user?.id) {
      console.error('Cannot save layout: missing zone or user');
      return;
    }

    // Double-check auth session
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      console.error('No authenticated user found');
      alert('You must be logged in to save layouts');
      return;
    }

    console.log('Saving layout as:', { name, isDefault, zoneId: currentZone.id, userId: authUser.id });

    const newSavedLayout = {
      user_id: authUser.id, // Using auth user ID directly
      zone_id: currentZone.id,
      name,
      layout,
      is_default: isDefault,
    };
    
    console.log('Layout data to save:', newSavedLayout);
    
    // If setting as default, ensure no other is default for this zone
    if (isDefault) {
       await supabase
        .from('saved_layouts')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('zone_id', currentZone.id);
    }

    const { data, error } = await supabase
      .from('saved_layouts')
      .insert(newSavedLayout)
      .select()
      .single();

    if (error) {
      console.error("Error saving layout as:", error);
      alert(`Failed to save layout: ${error.message}`);
    } else if (data) {
      // Ensure the returned data is properly structured
      const newSavedLayoutData: SavedLayout = {
        id: data.id,
        name: data.name,
        layout: data.layout || { tables: [], walls: [], texts: [] },
        created_at: data.created_at,
        zone_id: data.zone_id,
        user_id: data.user_id,
        is_default: data.is_default || false
      };
      
      const updatedSavedLayouts = [...(savedLayouts[currentZone.id] || []), newSavedLayoutData];
      setSavedLayouts(prev => ({ ...prev, [currentZone.id]: updatedSavedLayouts }));
      
      // Layout just saved becomes the active one for this zone
      setCurrentLayoutIds(prev => ({ ...prev, [currentZone.id]: data.id }));
    }
  };

  const loadSavedLayout = (layoutId: string) => {
    if (!currentZone) return;
    const layoutToLoad = savedLayouts[currentZone.id]?.find(l => l.id === layoutId);
    if (layoutToLoad) {
      setLayout(layoutToLoad.layout); // This will also trigger debounced save
      setCurrentLayoutIds(prev => ({ ...prev, [currentZone.id]: layoutId }));
      // Reset layoutAtEditStart when loading a saved layout
      if (isEditingInternal) {
        setLayoutAtEditStart(JSON.parse(JSON.stringify(layoutToLoad.layout)));
      }
    }
  };

  const updateSavedLayout = async (layoutId: string, layoutToSave: Layout = layout) => {
    if (!currentZone || !user?.id) return;
    
    // Double-check auth session
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      console.error('No authenticated user found');
      alert('You must be logged in to update layouts');
      return;
    }
    
    console.log('Updating saved layout:', layoutId, 'for zone:', currentZone.id, 'user:', authUser.id);
    
    // Update the saved layout - RLS will ensure user can only update their own
    const { data, error } = await supabase
      .from('saved_layouts')
      .update({ 
        layout: layoutToSave,
        updated_at: new Date().toISOString()
      })
      .eq('id', layoutId)
      .eq('user_id', authUser.id) // Extra safety check
      .select()
      .single();

    if (error) {
      console.error("Error updating saved layout:", error);
      alert(`Failed to update layout: ${error.message}`);
    } else if (data) {
      // Ensure the returned data is properly structured
      const updatedLayout: SavedLayout = {
        id: data.id,
        name: data.name,
        layout: data.layout || { tables: [], walls: [], texts: [] },
        created_at: data.created_at,
        zone_id: data.zone_id,
        user_id: data.user_id,
        is_default: data.is_default || false
      };
      
      const updatedLayouts = savedLayouts[currentZone.id].map(l => 
        l.id === layoutId ? updatedLayout : l
      );
      setSavedLayouts(prev => ({ ...prev, [currentZone.id]: updatedLayouts }));
      
      // Also save to the active layout
      await saveWorkingLayout(currentZone.id, layoutToSave);
      
      // Reset layoutAtEditStart to reflect the saved state
      setLayoutAtEditStart(JSON.parse(JSON.stringify(layoutToSave)));
      
      console.log('Layout updated successfully');
    }
  };

  const deleteSavedLayout = async (layoutId: string) => {
    if (!currentZone || !user?.id) return;

    // Double-check auth session
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      console.error('No authenticated user found');
      alert('You must be logged in to delete layouts');
      return;
    }

    const { error } = await supabase
      .from('saved_layouts')
      .delete()
      .eq('id', layoutId)
      .eq('user_id', authUser.id); // Ensure user can only delete their own layouts

    if (error) {
      console.error("Error deleting saved layout:", error);
      alert(`Failed to delete layout: ${error.message}`);
    } else {
      const updatedLayouts = (savedLayouts[currentZone.id] || []).filter(l => l.id !== layoutId);
      setSavedLayouts(prev => ({ ...prev, [currentZone.id]: updatedLayouts }));
      
      // If we deleted the active layout for this zone, clear it
      if (currentLayoutIds[currentZone.id] === layoutId) {
        setCurrentLayoutIds(prev => ({ ...prev, [currentZone.id]: null }));
      }
    }
  };
  
  const resetLayout = () => {
    if (!currentZone) return;
    setLayout(emptyLayout);
  };
  
  // Save layout to database
  const saveLayout = useCallback(async () => {
    if (!user || !currentZone) return;
    
    // Cancel any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Prevent concurrent saves
    if (saveInProgressRef.current) {
      return;
    }
    
    // Debounce the save
    saveTimeoutRef.current = setTimeout(async () => {
      saveInProgressRef.current = true;
      
      try {
        const currentLayout = undoRedoLayouts[currentZone.id] || emptyLayout;
        await layoutsService.saveLayoutForZone(user.id, currentZone.id, currentLayout);
        // Reset layoutAtEditStart to reflect the saved state
        setLayoutAtEditStart(JSON.parse(JSON.stringify(currentLayout)));

        // After saving the working layout, also keep the default saved layout (if any) in sync
        try {
          const zoneLayoutsForZone = savedLayouts[currentZone.id] || [];
          const defaultSaved = zoneLayoutsForZone.find(l => l.is_default);
          if (defaultSaved) {
            const { data, error } = await supabase
              .from('saved_layouts')
              .update({ 
                layout: currentLayout,
                updated_at: new Date().toISOString()
              })
              .eq('id', defaultSaved.id)
              .eq('user_id', user.id)
              .select()
              .single();

            if (!error && data) {
              const updatedDefault = {
                id: data.id,
                name: data.name,
                layout: data.layout || { tables: [], walls: [], texts: [] },
                created_at: data.created_at,
                zone_id: data.zone_id,
                user_id: data.user_id,
                is_default: data.is_default || false
              };
              const updatedList = zoneLayoutsForZone.map(l => 
                l.id === updatedDefault.id ? updatedDefault : l
              );
              setSavedLayouts(prev => ({ ...prev, [currentZone.id]: updatedList }));
            } else if (error) {
              console.error('Failed to sync default saved layout with working layout:', error);
            }
          }
        } catch (syncErr) {
          console.error('Unexpected error while syncing default saved layout:', syncErr);
        }
      } catch (error) {
        console.error('Failed to save layout:', error);
        throw error;
      } finally {
        saveInProgressRef.current = false;
      }
    }, 500); // 500ms debounce
  }, [user, currentZone, undoRedoLayouts, savedLayouts]);

  // Custom setIsEditing that handles cleanup
  const setIsEditing = useCallback((editing: boolean) => {
    setIsEditingInternal(editing);
    if (!editing) {
      // Reset layoutAtEditStart when exiting edit mode
      setLayoutAtEditStart(null);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <LayoutContext.Provider value={{ 
      layout,
      zoneLayouts,
      savedLayouts,
      currentLayoutId,
      setLayout,
      undo,
      redo,
      canUndo,
      canRedo,
      hasChanges,
      saveLayout,
      saveLayoutAs,
      loadSavedLayout,
      updateSavedLayout,
      deleteSavedLayout,
      getDefaultLayout,
      resetLayout,
      isEditing: isEditingInternal,
      setIsEditing
    }}>
      {children}
    </LayoutContext.Provider>
  );
};
