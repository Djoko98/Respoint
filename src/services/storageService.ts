import { supabase } from '../utils/supabaseClient';

// Ime bucket-a za logo fajlove
const LOGO_BUCKET = 'restaurant-logos';
// Bucket za guest avatare
const AVATAR_BUCKET = 'guest-avatars';

export const storageService = {
  // Upload logo fajla
  async uploadLogo(restaurantId: string, file: File): Promise<string | null> {
    try {
      console.log('⬆️ Starting logo upload:', {
        restaurantId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      // Use fixed logo.png name as requested
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `logos/${restaurantId}/logo.${fileExt}`;
      
      console.log('📁 Upload path:', fileName);

      // Upload fajla u Supabase Storage
      const { data, error } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // This will overwrite existing logo
        });

      if (error) {
        console.error('❌ Upload error:', error);
        return null;
      }

      console.log('✅ File uploaded successfully:', data);

      // Dobavi javni URL
      const { data: { publicUrl } } = supabase.storage
        .from(LOGO_BUCKET)
        .getPublicUrl(fileName);

      console.log('🔗 Generated public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('❌ Exception in uploadLogo:', error);
      return null;
    }
  },

  // Upload print logo fajla
  async uploadPrintLogo(restaurantId: string, file: File): Promise<string | null> {
    try {
      console.log('⬆️ Starting print logo upload:', {
        restaurantId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      // Use fixed print-logo.png name for print logo
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `logos/${restaurantId}/print-logo.${fileExt}`;
      
      console.log('📁 Print logo upload path:', fileName);

      // Upload fajla u Supabase Storage
      const { data, error } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // This will overwrite existing print logo
        });

      if (error) {
        console.error('❌ Print logo upload error:', error);
        return null;
      }

      console.log('✅ Print logo uploaded successfully:', data);

      // Dobavi javni URL
      const { data: { publicUrl } } = supabase.storage
        .from(LOGO_BUCKET)
        .getPublicUrl(fileName);

      console.log('🔗 Generated print logo public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('❌ Exception in uploadPrintLogo:', error);
      return null;
    }
  },

  // Upload light-theme app logo file
  async uploadLightLogo(restaurantId: string, file: File): Promise<string | null> {
    try {
      console.log('⬆️ Starting light logo upload:', {
        restaurantId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `logos/${restaurantId}/logo-light.${fileExt}`;

      console.log('📁 Light logo upload path:', fileName);

      const { data, error } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('❌ Light logo upload error:', error);
        return null;
      }

      console.log('✅ Light logo uploaded successfully:', data);

      const { data: { publicUrl } } = supabase.storage
        .from(LOGO_BUCKET)
        .getPublicUrl(fileName);

      console.log('🔗 Generated light logo public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('❌ Exception in uploadLightLogo:', error);
      return null;
    }
  },

  // Obriši logo fajl
  async deleteLogo(logoUrl: string): Promise<boolean> {
    try {
      console.log('🗑️ Attempting to delete logo:', logoUrl);
      
      // Extract file path from Supabase Storage URL
      // URL format: https://.../storage/v1/object/public/restaurant-logos/logos/{restaurantId}/logo.{ext}
      const bucketIndex = logoUrl.indexOf('/restaurant-logos/');
      if (bucketIndex === -1) {
        console.error('❌ Invalid logo URL format:', logoUrl);
        return false;
      }
      
      // Get everything after '/restaurant-logos/'
      const filePath = logoUrl.substring(bucketIndex + '/restaurant-logos/'.length);
      console.log('📁 Extracted file path:', filePath);

      const { error } = await supabase.storage
        .from(LOGO_BUCKET)
        .remove([filePath]);

      if (error) {
        console.error('❌ Error deleting logo from storage:', error);
        return false;
      }

      console.log('✅ Logo deleted successfully from storage');
      return true;
    } catch (error) {
      console.error('❌ Error in deleteLogo:', error);
      return false;
    }
  },

  // Obriši print logo fajl
  async deletePrintLogo(printLogoUrl: string): Promise<boolean> {
    try {
      console.log('🗑️ Attempting to delete print logo:', printLogoUrl);
      
      // Extract file path from Supabase Storage URL
      const bucketIndex = printLogoUrl.indexOf('/restaurant-logos/');
      if (bucketIndex === -1) {
        console.error('❌ Invalid print logo URL format:', printLogoUrl);
        return false;
      }
      
      // Get everything after '/restaurant-logos/'
      const filePath = printLogoUrl.substring(bucketIndex + '/restaurant-logos/'.length);
      console.log('📁 Extracted print logo file path:', filePath);

      const { error } = await supabase.storage
        .from(LOGO_BUCKET)
        .remove([filePath]);

      if (error) {
        console.error('❌ Error deleting print logo from storage:', error);
        return false;
      }

      console.log('✅ Print logo deleted successfully from storage');
      return true;
    } catch (error) {
      console.error('❌ Error in deletePrintLogo:', error);
      return false;
    }
  },

  // Obriši light logo fajl
  async deleteLightLogo(lightLogoUrl: string): Promise<boolean> {
    try {
      console.log('🗑️ Attempting to delete light logo:', lightLogoUrl);

      const bucketIndex = lightLogoUrl.indexOf('/restaurant-logos/');
      if (bucketIndex === -1) {
        console.error('❌ Invalid light logo URL format:', lightLogoUrl);
        return false;
      }

      const filePath = lightLogoUrl.substring(bucketIndex + '/restaurant-logos/'.length);
      console.log('📁 Extracted light logo file path:', filePath);

      const { error } = await supabase.storage
        .from(LOGO_BUCKET)
        .remove([filePath]);

      if (error) {
        console.error('❌ Error deleting light logo from storage:', error);
        return false;
      }

      console.log('✅ Light logo deleted successfully from storage');
      return true;
    } catch (error) {
      console.error('❌ Error in deleteLightLogo:', error);
      return false;
    }
  },

  // Obriši guest avatar fajl (ako je iz našeg bucket-a)
  async deleteGuestAvatar(avatarUrl: string): Promise<boolean> {
    try {
      const marker = `/${AVATAR_BUCKET}/`;
      const idx = avatarUrl.indexOf(marker);
      if (idx === -1) return false;
      const filePath = avatarUrl.substring(idx + marker.length);
      const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([filePath]);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  }
};

// Upload guest avatar file and return public URL
export async function uploadGuestAvatar(userId: string, guestId: string, file: File): Promise<string | null> {
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `avatars/${userId}/${guestId}.${ext}`;
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true, cacheControl: '3600' });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    return publicUrl;
  } catch {
    return null;
  }
}

// Download remote image and build a File object (for CORS-safe server-side you'd proxy; here we attempt client fetch)
export async function downloadImageAsFile(url: string, fileName: string = 'avatar.jpg'): Promise<File | null> {
  try {
    const res = await fetch(url, { mode: 'no-cors' as RequestMode }).catch(() => fetch(url));
    if (!res) return null;
    const blob = await (res as any).blob?.();
    if (!blob) return null;
    return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
  } catch {
    return null;
  }
}

// Funkcije za kompatibilnost sa postojećim kodom
export const saveToStorage = <T>(key: string, data: T): void => {
  // Za kompatibilnost, čuvamo u localStorage
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  // Za kompatibilnost, čitamo iz localStorage
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
};

// Logo storage je konfigurisano u Supabase - koristi postojeću logo kolonu u profiles tabeli 