import React, { createContext, useState, ReactNode, useEffect, useContext } from "react";
import { supabase } from "../utils/supabaseClient";
import { UserContext } from "./UserContext";

export interface Zone {
  id: string; // This will now be a uuid from Postgres
  name: string;
  color?: string;
  user_id?: string; // To associate with a user
  created_at?: string;
  order: number;
}

interface ZoneContextType {
  zones: Zone[];
  setZones: (zones: Zone[]) => void;
  currentZone: Zone | null;
  setCurrentZone: (zone: Zone | null) => void;
  addZone: (name: string, color?: string) => void;
  updateZone: (id: string, name: string, color?: string) => void;
  deleteZone: (id: string) => void;
  reorderZones: (zones: Zone[]) => Promise<void>;
  refreshZones: () => Promise<void>;
  showZoneModal: boolean;
  setShowZoneModal: (show: boolean) => void;
}

export const ZoneContext = createContext<ZoneContextType>({
  zones: [],
  setZones: () => {},
  currentZone: null,
  setCurrentZone: () => {},
  addZone: () => {},
  updateZone: () => {},
  deleteZone: () => {},
  reorderZones: async () => {},
  refreshZones: async () => {},
  showZoneModal: false,
  setShowZoneModal: () => {},
});

export const ZoneProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useContext(UserContext);
  const [zones, setZones] = useState<Zone[]>([]);
  const [currentZone, setCurrentZone] = useState<Zone | null>(null);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Refresh zones function to be called after operations
  const refreshZones = async () => {
    if (!user?.id) {
      setZones([]);
      setCurrentZone(null);
      return;
    }

    console.log('🔄 Refreshing zones...');
    const { data: loadedZones, error } = await supabase
      .from('zones')
      .select('*')
      .eq('user_id', user.id)
      .order('order', { ascending: true });

    if (error) {
      console.error('❌ Error refreshing zones:', error);
    } else if (loadedZones) {
      console.log('✅ Zones refreshed:', loadedZones);
      setZones(loadedZones);
      
      // If current zone is no longer available, set to first zone
      if (currentZone && !loadedZones.find(z => z.id === currentZone.id)) {
        setCurrentZone(loadedZones[0] || null);
      }
    }
  };

  // Load zones when user changes
  useEffect(() => {
    const fetchZones = async () => {
      if (!user?.id) {
        setZones([]);
        setCurrentZone(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data: loadedZones, error } = await supabase
        .from('zones')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true });

      if (error) {
        console.error('❌ Error fetching zones:', error);
        setZones([]);
      } else if (loadedZones && loadedZones.length > 0) {
        console.log('✅ Loaded zones:', loadedZones);
        setZones(loadedZones);
        setCurrentZone(loadedZones[0]);
      } else {
        // No zones found for user, create default ones
        console.log('📝 No zones found, creating default ones...');
        const defaultZones = [
          { name: "Dining room", color: "#4a5568", user_id: user.id, order: 1 },
          { name: "Patio", color: "#38a169", user_id: user.id, order: 2 },
        ];
        
        const { data: newZones, error: insertError } = await supabase
          .from('zones')
          .insert(defaultZones)
          .select()
          .order('order', { ascending: true });

        if (insertError) {
          console.error("❌ Error creating default zones:", insertError);
          alert(`Error creating zones: ${insertError.message}. Please run SQL scripts in Supabase.`);
          setZones([]);
        } else if (newZones) {
          console.log('✅ Created default zones:', newZones);
          setZones(newZones);
          setCurrentZone(newZones[0] || null);
        }
      }
      setLoading(false);
    };

    fetchZones();
  }, [user?.id]);

  // Add window focus event listener to refresh zones when app comes back to focus
  useEffect(() => {
    let lastRefreshTime = Date.now();
    
    const handleWindowFocus = async () => {
      console.log('🔄 Window focused - refreshing zones');
      
      // Debounce to avoid multiple calls
      const now = Date.now();
      if (now - lastRefreshTime < 2000) {
        console.log('⏳ Skipping zone refresh - too soon after last refresh');
        return;
      }
      lastRefreshTime = now;
      
      if (user?.id) {
        // Just try to refresh zones without checking session
        // If there's an auth error, the service will handle it
        await refreshZones();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [user?.id, refreshZones]);

  const addZone = async (name: string, color?: string) => {
    if (!user?.id) {
      console.error("❌ No user ID, cannot add zone");
      alert("You must be logged in to add zones");
      return;
    }

    console.log("📝 Adding zone:", name);

    // Get the next order number
    const maxOrder = zones.length > 0 ? Math.max(...zones.map(z => z.order)) : 0;
    const newOrder = maxOrder + 1;

    const zoneData = {
      name,
      color: color || "#4a5568",
      user_id: user.id,
      order: newOrder
    };

    const { data: newZone, error } = await supabase
      .from('zones') 
      .insert(zoneData)
      .select()
      .single();
    
    if (error) {
      console.error("❌ Error adding zone:", error);
      alert(`Error adding zone: ${error.message}. Make sure to run Supabase scripts first.`);
    } else if (newZone) {
      console.log("✅ Zone added:", newZone);
      // Refresh zones to ensure consistent state
      await refreshZones();
    }
  };

  const updateZone = async (id: string, name: string, color?: string) => {
    if (!user?.id) {
      console.error("❌ No user ID, cannot update zone");
      alert("You must be logged in to update zones");
      return;
    }

    console.log("📝 Updating zone:", id, name);

    const updateData: { name: string; color?: string } = { name };
    if (color) updateData.color = color;

    const { error } = await supabase
      .from('zones')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error("❌ Error updating zone:", error);
      alert(`Error updating zone: ${error.message}`);
    } else {
      console.log("✅ Zone updated:", id);
      // Refresh zones to ensure consistent state
      await refreshZones();
    }
  };

  const deleteZone = async (id: string) => {
    if (!user?.id) {
      console.error("❌ No user ID, cannot delete zone");
      alert("You must be logged in to delete zones");
      return;
    }

    console.log("📝 Deleting zone and all related data:", id);

    try {
      // First, delete all saved layouts for this zone
      console.log("🗑️ Deleting saved layouts for zone:", id);
      const { error: savedLayoutsError } = await supabase
        .from('saved_layouts')
        .delete()
        .eq('zone_id', id)
        .eq('user_id', user.id);
      
      if (savedLayoutsError) {
        console.error("❌ Error deleting saved layouts:", savedLayoutsError);
        throw savedLayoutsError;
      }

      // Delete active layouts for this zone
      console.log("🗑️ Deleting active layouts for zone:", id);
      const { error: layoutsError } = await supabase
        .from('layouts')
        .delete()
        .eq('zone_id', id)
        .eq('user_id', user.id);
      
      if (layoutsError) {
        console.error("❌ Error deleting layouts:", layoutsError);
        throw layoutsError;
      }

      // Delete zone layouts for this zone
      console.log("🗑️ Deleting zone layouts for zone:", id);
      const { error: zoneLayoutsError } = await supabase
        .from('zone_layouts')
        .delete()
        .eq('zone_id', id)
        .eq('user_id', user.id);
      
      if (zoneLayoutsError) {
        console.error("❌ Error deleting zone layouts:", zoneLayoutsError);
        throw zoneLayoutsError;
      }

      // Delete any reservations for this zone (soft delete if is_deleted column exists)
      console.log("🗑️ Soft deleting reservations for zone:", id);
      const { error: reservationsError } = await supabase
        .from('reservations')
        .update({ is_deleted: true })
        .eq('zone_id', id)
        .eq('user_id', user.id);
      
      if (reservationsError) {
        console.warn("⚠️ Warning: Could not soft delete reservations:", reservationsError);
        // Don't throw here - continue with zone deletion even if reservation update fails
      }

      // Finally, delete the zone itself
      console.log("🗑️ Deleting zone:", id);
      const { error: zoneError } = await supabase
        .from('zones')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (zoneError) {
        console.error("❌ Error deleting zone:", zoneError);
        throw zoneError;
      }

      console.log("✅ Zone and all related data deleted successfully:", id);
      // Refresh zones to ensure consistent state
      await refreshZones();

    } catch (error: any) {
      console.error("❌ Error during zone deletion process:", error);
      alert(`Error deleting zone: ${error.message}`);
    }
  };

  const reorderZones = async (reorderedZones: Zone[]) => {
    if (!user?.id) {
      console.error("❌ No user ID, cannot reorder zones");
      throw new Error("User not authenticated");
    }

    console.log("📝 Reordering zones:", reorderedZones.map(z => ({ id: z.id, name: z.name, order: z.order })));

    try {
      // Update zones in batch with new order values
      const updates = reorderedZones.map((zone, index) => ({
        id: zone.id,
        order: index + 1
      }));

      // Use Promise.all for better performance
      const updatePromises = updates.map(update => 
        supabase
          .from('zones')
          .update({ order: update.order })
          .eq('id', update.id)
          .eq('user_id', user.id)
      );

      const results = await Promise.all(updatePromises);
      
      // Check if any updates failed
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} zones`);
      }

      console.log("✅ Zones reordered successfully");
      
      // Refresh zones from database to ensure consistency
      await refreshZones();
      
    } catch (error) {
      console.error("❌ Error reordering zones:", error);
      throw error; // Re-throw to allow calling component to handle
    }
  };

  return (
    <ZoneContext.Provider value={{ 
      zones, 
      setZones, 
      currentZone, 
      setCurrentZone,
      addZone,
      updateZone,
      deleteZone,
      reorderZones,
      refreshZones,
      showZoneModal,
      setShowZoneModal
    }}>
      {!loading && children}
    </ZoneContext.Provider>
  );
};
