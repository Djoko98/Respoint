import { supabase } from '../utils/supabaseClient';
import { User } from '../types/user';

// Tip za korisničke podatke u bazi
interface UserProfile {
  id: string;
  restaurant_name: string;
  name?: string;
  role?: string;
  phone?: string;
  address?: string;
  logo?: string;
  logo_light_url?: string;
  print_logo_url?: string; // Print logo URL za štampanje rezervacija
  timezone?: string;
  language?: string;
  auto_archive?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Tip za rezultat ažuriranja profila
interface UpdateProfileResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export const authService = {
  // Registracija novog korisnika
  async signUp(email: string, password: string, restaurantName: string, name?: string) {
    try {
      // Kreiraj korisnika u Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            restaurant_name: restaurantName,
            name: name || email.split('@')[0],
          }
        }
      });

      if (authError) throw authError;

      // Automatski kreiraj profil u users tabeli (Supabase trigger će to uraditi)
      // Ali možemo eksplicitno kreirati ako trigger nije postavljen
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            restaurant_name: restaurantName,
            name: name || email.split('@')[0],
            role: 'admin', // Podrazumevano admin za novog korisnika
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          // Možda već postoji zbog trigger-a, što je ok
        }
      }

      return { 
        success: true, 
        user: authData.user,
        message: 'Registracija uspešna! Proverite email za potvrdu.' 
      };
    } catch (error: any) {
      console.error('SignUp error:', error);
      return { 
        success: false, 
        error: error.message || 'Greška pri registraciji' 
      };
    }
  },

  // Prijava korisnika
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { 
        success: true, 
        user: data.user,
        session: data.session 
      };
    } catch (error: any) {
      console.error('SignIn error:', error);
      return { 
        success: false, 
        error: error.message || 'Neispravni kredencijali' 
      };
    }
  },

  // Odjava korisnika
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      return { success: true };
    } catch (error: any) {
      console.error('SignOut error:', error);
      return { 
        success: false, 
        error: error.message || 'Greška pri odjavi' 
      };
    }
  },

  // Dobavi trenutnog korisnika
  async getUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (!user) {
        return { success: false, user: null };
      }

      // Dobavi dodatne podatke iz profiles tabele (postojeća tabela)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Vrati osnovne podatke ako profil ne postoji
        return {
          success: true,
          user: {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || user.email?.split('@')[0] || '',
            restaurantName: user.user_metadata?.restaurant_name || '',
            role: 'admin' as const,
          } as User
        };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email || '',
          name: profile.name || user.email?.split('@')[0] || '',
          restaurantName: profile.restaurant_name || '',
          role: (profile.role || 'admin') as User['role'],
        } as User
      };
    } catch (error: any) {
      console.error('GetUser error:', error);
      return { 
        success: false, 
        user: null,
        error: error.message 
      };
    }
  },

  // Dobavi sesiju
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      return { success: true, session };
    } catch (error: any) {
      console.error('GetSession error:', error);
      return { 
        success: false, 
        session: null,
        error: error.message 
      };
    }
  },

  // Resetuj lozinku
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      return { 
        success: true,
        message: 'Email za resetovanje lozinke je poslat!' 
      };
    } catch (error: any) {
      console.error('ResetPassword error:', error);
      return { 
        success: false, 
        error: error.message || 'Greška pri slanju emaila' 
      };
    }
  },

  // Ažuriraj lozinku
  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      return { 
        success: true,
        message: 'Lozinka uspešno promenjena!' 
      };
    } catch (error: any) {
      console.error('UpdatePassword error:', error);
      return { 
        success: false, 
        error: error.message || 'Greška pri promeni lozinke' 
      };
    }
  },

  // Ažuriraj korisničke podatke - samo postojeće kolone
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UpdateProfileResult> {
    try {
      // Map to actual database column names and filter only existing columns
      const dbUpdates: any = {};
      
      // Only include columns that exist in profiles table
      if (updates.restaurant_name !== undefined) dbUpdates.restaurant_name = updates.restaurant_name;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.logo !== undefined) dbUpdates.logo = updates.logo;
      
      // These columns might not exist yet - try them conditionally
      const conditionalUpdates: any = {};
      if (updates.phone !== undefined) conditionalUpdates.phone = updates.phone;
      if (updates.address !== undefined) conditionalUpdates.address = updates.address;
      if (updates.print_logo_url !== undefined) conditionalUpdates.print_logo_url = updates.print_logo_url;
      // Optional theme-specific logo (column may not exist)
      if ((updates as any).logo_light_url !== undefined) conditionalUpdates.logo_light_url = (updates as any).logo_light_url;
      if (updates.timezone !== undefined) conditionalUpdates.timezone = updates.timezone;
      if (updates.language !== undefined) conditionalUpdates.language = updates.language;
      if (updates.auto_archive !== undefined) conditionalUpdates.auto_archive = updates.auto_archive;
      if ((updates as any).role_config !== undefined) (conditionalUpdates as any).role_config = (updates as any).role_config;
      // Optional role PIN hash fields (set via Account Settings). Columns may or may not exist.
      const rolePinUpdates: any = {};
      if ((updates as any).admin_pin_hash !== undefined) rolePinUpdates.admin_pin_hash = (updates as any).admin_pin_hash;
      if ((updates as any).manager_pin_hash !== undefined) rolePinUpdates.manager_pin_hash = (updates as any).manager_pin_hash;
      if ((updates as any).waiter_pin_hash !== undefined) rolePinUpdates.waiter_pin_hash = (updates as any).waiter_pin_hash;

      console.log('Updating profile with core fields:', dbUpdates);
      console.log('Conditional fields (if columns exist):', { ...conditionalUpdates, ...rolePinUpdates });

      // First try with all fields
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({ ...dbUpdates, ...conditionalUpdates, ...rolePinUpdates })
          .eq('id', userId)
          .select()
          .single();
        
        if (error) throw error;
        
        console.log('Profile updated successfully with all fields:', data);
        return { success: true, data };
      } catch (fullUpdateError: any) {
        console.log('Full update failed, trying with core fields only:', fullUpdateError.message);
        // Second attempt: core fields + role PIN hashes (skip other optional columns)
        try {
          const { data, error } = await supabase
            .from('profiles')
            .update({ ...dbUpdates, ...rolePinUpdates })
            .eq('id', userId)
            .select()
            .single();

          if (!error) {
            console.log('Profile updated successfully with core fields + role PIN hashes:', data);
            return {
              success: true,
              data,
              message: 'Some optional fields were not saved, but PIN hashes were applied.'
            };
          }
        } catch (err) {
          console.log('Core+PIN update failed:', (err as any)?.message || err);
        }

        // Final attempt: core fields only
        if (Object.keys(dbUpdates).length > 0) {
          const { data, error } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('id', userId)
            .select()
            .single();

          if (error) throw error;

          console.log('Profile updated successfully with core fields only:', data);
          return {
            success: true,
            data,
            message: 'Some fields were not saved (columns may not exist in database)'
          };
        }
        throw fullUpdateError;
      }
    } catch (error: any) {
      console.error('UpdateProfile error:', error);
      return { 
        success: false, 
        error: error.message || 'Greška pri ažuriranju profila' 
      };
    }
  },

  // Osluškuj promene autentifikacije
  onAuthStateChange(callback: (event: string, session: any) => void) {
    const { data } = supabase.auth.onAuthStateChange(callback);
    return data;
  }
}; 