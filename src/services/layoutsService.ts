import { supabase, executeSupabaseQuery } from '../utils/supabaseClient';

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
  created_at: string;
  updated_at: string;
}

export const layoutsService = {
  // Učitaj layout za zonu
  async getLayoutByZone(zoneId: string) {
    console.log('Getting layout for zone:', zoneId);
    
    return executeSupabaseQuery(async () => {
      const { data, error } = await supabase
        .from('layouts')
        .select('*')
        .eq('zone_id', zoneId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error getting layout:', error);
        throw error;
      }

      // Return the first layout if exists, otherwise null
      return data && data.length > 0 ? data[0] : null;
    });
  },

  // Kreiraj novi layout
  async createLayout(layout: Omit<Layout, 'id' | 'created_at' | 'updated_at'>) {
    console.log('Creating layout:', layout);
    
    return executeSupabaseQuery(async () => {
      const { data, error } = await supabase
        .from('layouts')
        .insert(layout)
        .select()
        .single();

      if (error) {
        console.error('Error creating layout:', error);
        throw error;
      }

      console.log('Layout created:', data);
      return data;
    });
  },

  // Ažuriraj layout
  async updateLayout(layoutId: string, updates: Partial<Layout>) {
    console.log('Updating layout:', layoutId, updates);
    
    return executeSupabaseQuery(async () => {
      const { data, error } = await supabase
        .from('layouts')
        .update(updates)
        .eq('id', layoutId)
        .select()
        .single();

      if (error) {
        console.error('Error updating layout:', error);
        throw error;
      }

      console.log('Layout updated:', data);
      return data;
    });
  },

  // Save layout for zone (create or update)
  async saveLayoutForZone(userId: string, zoneId: string, layoutData: any) {
    console.log('Saving layout for zone:', { userId, zoneId });
    
    return executeSupabaseQuery(async () => {
      // First, check if a layout exists for this zone
      const { data: existingLayout, error: fetchError } = await supabase
        .from('layouts')
        .select('id')
        .eq('user_id', userId)
        .eq('zone_id', zoneId)
        .eq('is_active', true)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing layout:', fetchError);
        throw fetchError;
      }

      if (existingLayout) {
        // Update existing layout
        return await this.updateLayout(existingLayout.id, {
          data: layoutData,
          updated_at: new Date().toISOString()
        });
      } else {
        // Create new layout
        return await this.createLayout({
          user_id: userId,
          zone_id: zoneId,
          name: 'Main Layout',
          data: layoutData,
          is_active: true
        });
      }
    });
  }
}; 