import { supabase } from '../utils/supabaseClient';
import { SavedLayout, SavedLayoutDB } from '../types/table';

// Convert from DB format to application format
const mapFromDB = (dbSavedLayout: SavedLayoutDB): SavedLayout => ({
  id: dbSavedLayout.id,
  user_id: dbSavedLayout.user_id,
  zone_id: dbSavedLayout.zone_id,
  name: dbSavedLayout.name,
  layout: dbSavedLayout.layout || { tables: [], walls: [], texts: [] },
  is_default: dbSavedLayout.is_default,
  created_at: dbSavedLayout.created_at,
  updated_at: dbSavedLayout.updated_at
});

// Convert from application format to DB format
const mapToDB = (savedLayout: Partial<SavedLayout>): Partial<SavedLayoutDB> => ({
  user_id: savedLayout.user_id,
  zone_id: savedLayout.zone_id,
  name: savedLayout.name,
  layout: savedLayout.layout,
  is_default: savedLayout.is_default
});

export const savedLayoutsService = {
  // Get all saved layouts for user
  async getAllSavedLayouts(userId: string) {
    console.log('Getting all saved layouts for user:', userId);
    
    try {
      const { data, error } = await supabase
        .from('saved_layouts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching saved layouts:', error.message);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('📋 No saved layouts found for user:', userId);
        return [];
      }

      console.log('✅ Saved layouts loaded successfully:', data.length, 'layouts');
      return data.map(mapFromDB);
    } catch (err: any) {
      console.error('❌ Error in getAllSavedLayouts:', err);
      throw err;
    }
  },

  // Get saved layouts for specific zone
  async getSavedLayoutsForZone(userId: string, zoneId: string) {
    console.log('Getting saved layouts for zone:', { userId, zoneId });
    
    try {
      const { data, error } = await supabase
        .from('saved_layouts')
        .select('*')
        .eq('user_id', userId)
        .eq('zone_id', zoneId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching saved layouts for zone:', error.message);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('📋 No saved layouts found for zone:', zoneId);
        return [];
      }

      console.log('✅ Saved layouts for zone loaded successfully:', data.length, 'layouts');
      return data.map(mapFromDB);
    } catch (err: any) {
      console.error('❌ Error in getSavedLayoutsForZone:', err);
      throw err;
    }
  },

  // Get default layout for zone
  async getDefaultLayoutForZone(userId: string, zoneId: string) {
    console.log('Getting default layout for zone:', { userId, zoneId });
    
    try {
      const { data, error } = await supabase
        .from('saved_layouts')
        .select('*')
        .eq('user_id', userId)
        .eq('zone_id', zoneId)
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching default layout:', error.message);
        throw error;
      }

      if (!data) {
        console.log('📋 No default layout found for zone:', zoneId);
        return null;
      }

      console.log('✅ Default layout loaded successfully for zone:', zoneId);
      return mapFromDB(data);
    } catch (err: any) {
      console.error('❌ Error in getDefaultLayoutForZone:', err);
      throw err;
    }
  },

  // Create saved layout
  async createSavedLayout(savedLayout: Omit<SavedLayout, 'id' | 'created_at' | 'updated_at'>) {
    console.log('Creating saved layout:', savedLayout.name);
    
    try {
      // If this is set as default, remove default from other layouts in the same zone
      if (savedLayout.is_default) {
        await this.clearDefaultForZone(savedLayout.user_id, savedLayout.zone_id);
      }

      const dbSavedLayout = mapToDB(savedLayout);
      
      const { data, error } = await supabase
        .from('saved_layouts')
        .insert(dbSavedLayout)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating saved layout:', error.message);
        throw error;
      }

      if (!data) {
        throw new Error('Saved layout not created');
      }

      console.log('✅ Saved layout created successfully:', data.name);
      return mapFromDB(data);
    } catch (err: any) {
      console.error('❌ Error in createSavedLayout:', err);
      throw err;
    }
  },

  // Update saved layout
  async updateSavedLayout(layoutId: string, updates: Partial<SavedLayout>) {
    console.log('Updating saved layout:', layoutId);
    
    try {
      // If this is being set as default, remove default from other layouts in the same zone
      if (updates.is_default && updates.user_id && updates.zone_id) {
        await this.clearDefaultForZone(updates.user_id, updates.zone_id);
      }

      const dbUpdates = mapToDB(updates);
      
      const { data, error } = await supabase
        .from('saved_layouts')
        .update(dbUpdates)
        .eq('id', layoutId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating saved layout:', error.message);
        throw error;
      }

      if (!data) {
        throw new Error('Saved layout not updated');
      }

      console.log('✅ Saved layout updated successfully');
      return mapFromDB(data);
    } catch (err: any) {
      console.error('❌ Error in updateSavedLayout:', err);
      throw err;
    }
  },

  // Delete saved layout
  async deleteSavedLayout(layoutId: string, userId: string) {
    console.log('Deleting saved layout:', layoutId);
    
    try {
      const { error } = await supabase
        .from('saved_layouts')
        .delete()
        .eq('id', layoutId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error deleting saved layout:', error.message);
        throw error;
      }

      console.log('✅ Saved layout deleted successfully');
      return true;
    } catch (err: any) {
      console.error('❌ Error in deleteSavedLayout:', err);
      throw err;
    }
  },

  // Set layout as default for zone
  async setAsDefault(layoutId: string, userId: string, zoneId: string) {
    console.log('Setting layout as default:', { layoutId, userId, zoneId });
    
    try {
      // First clear existing default
      await this.clearDefaultForZone(userId, zoneId);
      
      // Then set this layout as default
      const { data, error } = await supabase
        .from('saved_layouts')
        .update({ is_default: true })
        .eq('id', layoutId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error setting layout as default:', error.message);
        throw error;
      }

      if (!data) {
        throw new Error('Layout not set as default');
      }

      console.log('✅ Layout set as default successfully');
      return mapFromDB(data);
    } catch (err: any) {
      console.error('❌ Error in setAsDefault:', err);
      throw err;
    }
  },

  // Clear default for zone (helper method)
  async clearDefaultForZone(userId: string, zoneId: string) {
    console.log('Clearing default layouts for zone:', { userId, zoneId });
    
    try {
      const { error } = await supabase
        .from('saved_layouts')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('zone_id', zoneId)
        .eq('is_default', true);

      if (error) {
        console.error('❌ Error clearing default layouts:', error.message);
        throw error;
      }

      console.log('✅ Default layouts cleared for zone');
    } catch (err: any) {
      console.error('❌ Error in clearDefaultForZone:', err);
      throw err;
    }
  }
}; 