import { supabase } from '../utils/supabaseClient';
import { ZoneLayout, ZoneLayoutDB } from '../types/table';

// Convert from DB format to application format
const mapFromDB = (dbZoneLayout: ZoneLayoutDB): ZoneLayout => ({
  id: dbZoneLayout.id,
  user_id: dbZoneLayout.user_id,
  zone_id: dbZoneLayout.zone_id,
  layout: dbZoneLayout.layout,
  updated_at: dbZoneLayout.updated_at
});

// Convert from application format to DB format
const mapToDB = (zoneLayout: Partial<ZoneLayout>): Partial<ZoneLayoutDB> => ({
  user_id: zoneLayout.user_id,
  zone_id: zoneLayout.zone_id,
  layout: zoneLayout.layout
});

export const zoneLayoutsService = {
  // Get zone layout by zone ID
  async getZoneLayout(userId: string, zoneId: string) {
    console.log('Getting zone layout:', { userId, zoneId });
    
    try {
      const { data, error } = await supabase
        .from('zone_layouts')
        .select('*')
        .eq('user_id', userId)
        .eq('zone_id', zoneId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching zone layout:', error.message);
        throw error;
      }

      if (!data) {
        console.log('📋 No zone layout found for:', zoneId);
        return null;
      }

      console.log('✅ Zone layout loaded successfully:', zoneId);
      return mapFromDB(data);
    } catch (err: any) {
      console.error('❌ Error in getZoneLayout:', err);
      throw err;
    }
  },

  // Get all zone layouts for user
  async getAllZoneLayouts(userId: string) {
    console.log('Getting all zone layouts for user:', userId);
    
    try {
      const { data, error } = await supabase
        .from('zone_layouts')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching zone layouts:', error.message);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('📋 No zone layouts found for user:', userId);
        return [];
      }

      console.log('✅ Zone layouts loaded successfully:', data.length, 'layouts');
      return data.map(mapFromDB);
    } catch (err: any) {
      console.error('❌ Error in getAllZoneLayouts:', err);
      throw err;
    }
  },

  // Create or update zone layout
  async saveZoneLayout(userId: string, zoneId: string, layout: any) {
    console.log('Saving zone layout:', { userId, zoneId });
    
    try {
      // Check if zone layout already exists
      const { data: existing, error: fetchError } = await supabase
        .from('zone_layouts')
        .select('id')
        .eq('user_id', userId)
        .eq('zone_id', zoneId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error checking existing zone layout:', fetchError.message);
        throw fetchError;
      }

      if (existing) {
        // Update existing zone layout
        console.log('📝 Updating existing zone layout');
        const { data, error } = await supabase
          .from('zone_layouts')
          .update({ layout })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating zone layout:', error.message);
          throw error;
        }

        if (!data) {
          throw new Error('Zone layout not updated');
        }

        console.log('✅ Zone layout updated successfully');
        return mapFromDB(data);
      } else {
        // Create new zone layout
        console.log('📝 Creating new zone layout');
        const newZoneLayout = mapToDB({
          user_id: userId,
          zone_id: zoneId,
          layout
        });

        const { data, error } = await supabase
          .from('zone_layouts')
          .insert(newZoneLayout)
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating zone layout:', error.message);
          throw error;
        }

        if (!data) {
          throw new Error('Zone layout not created');
        }

        console.log('✅ Zone layout created successfully');
        return mapFromDB(data);
      }
    } catch (err: any) {
      console.error('❌ Error in saveZoneLayout:', err);
      throw err;
    }
  },

  // Delete zone layout
  async deleteZoneLayout(userId: string, zoneId: string) {
    console.log('Deleting zone layout:', { userId, zoneId });
    
    try {
      const { error } = await supabase
        .from('zone_layouts')
        .delete()
        .eq('user_id', userId)
        .eq('zone_id', zoneId);

      if (error) {
        console.error('❌ Error deleting zone layout:', error.message);
        throw error;
      }

      console.log('✅ Zone layout deleted successfully');
      return true;
    } catch (err: any) {
      console.error('❌ Error in deleteZoneLayout:', err);
      throw err;
    }
  }
}; 