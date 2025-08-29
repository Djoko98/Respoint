# Restaurant Logo Persistence with Supabase Storage

This implementation provides complete logo persistence functionality using Supabase Storage and Database.

## ✅ Features Implemented

### 1. Logo Upload
- Upload restaurant logos to Supabase Storage
- Path structure: `logos/{restaurantId}/logo.{extension}`
- Automatic file type validation (PNG, JPG, JPEG, WebP, SVG)
- 5MB file size limit
- Automatic overwriting of existing logos

### 2. Logo Display
- Fetches and displays saved logo from database URL
- Shows logo immediately after upload
- Maintains logo visibility after app restart

### 3. Logo Removal
- Deletes logo file from Supabase Storage
- Removes logo URL from database
- Clears logo display in UI

## 🔧 Setup Instructions

### 1. Run the Supabase Setup Script
Execute the following script in your Supabase SQL Editor:

```sql
-- Copy and run the contents of supabase/setup_logo_storage.sql
```

This script will:
- Create the `restaurant-logos` storage bucket
- Set up Row Level Security (RLS) policies
- Add the `logo` column to the `profiles` table

### 2. Verify Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Confirm the `restaurant-logos` bucket exists
3. Check that it's set to public access

## 📁 File Structure

### Updated Components
- `src/components/AccountSettings/AccountSettings.tsx` - Main component with integrated Supabase functionality
- `src/context/UserContext.tsx` - Updated to fetch logo URLs from profiles
- `src/services/storageService.ts` - Complete logo storage management
- `src/services/authService.ts` - Profile update functionality

### Database Schema
```sql
-- profiles table now includes:
ALTER TABLE profiles ADD COLUMN logo TEXT;
```

### Storage Structure
```
restaurant-logos/
├── logos/
│   ├── {user-id-1}/
│   │   └── logo.png
│   ├── {user-id-2}/
│   │   └── logo.jpg
│   └── ...
```

## 🔄 How It Works

### Upload Flow
1. User selects image file in Account Settings
2. File is validated (type, size)
3. Existing logo file is deleted (if exists)
4. New file is uploaded to `logos/{userId}/logo.{ext}`
5. Public URL is returned and saved to database
6. User context is updated with new logo URL

### Display Flow
1. User Context loads profile data including logo URL
2. Account Settings displays logo from URL
3. Logo persists across sessions and app restarts

### Removal Flow
1. User clicks "Remove Logo"
2. Logo file is deleted from Supabase Storage
3. Logo URL is removed from database
4. UI updates to show "No logo" state

## 🛠 Technical Implementation

### Storage Service (`storageService.ts`)
```typescript
// Upload logo to specific path
uploadLogo(restaurantId: string, file: File): Promise<string | null>

// Delete logo from storage
deleteLogo(logoUrl: string): Promise<boolean>

// List all logos for a restaurant
getUserLogos(restaurantId: string): Promise<string[]>
```

### Auth Service Integration
- `updateProfile()` function saves logo URL to database
- Profile fetching includes logo field
- Automatic profile sync with User Context

### Row Level Security (RLS)
- Users can only upload/update/delete their own logos
- Public read access for displaying logos
- Path-based security: `logos/{userId}/logo.{ext}`

## 🔒 Security Features

1. **File Type Validation**: Only image files allowed
2. **Size Limits**: Maximum 5MB per file
3. **RLS Policies**: Users can only manage their own logos
4. **Path Security**: Enforced folder structure prevents unauthorized access

## 🚀 Usage

### For Restaurant Owners
1. Open Account Settings
2. Click "Upload Logo" 
3. Select image file (PNG, JPG, etc.)
4. Logo appears immediately and persists
5. Use "Remove Logo" to delete

### For Developers
```typescript
// Import the storage service
import { storageService } from '../services/storageService';

// Upload a logo
const logoUrl = await storageService.uploadLogo(userId, file);

// Delete a logo
await storageService.deleteLogo(logoUrl);
```

## 🧪 Testing the Implementation

### Quick Test with LogoTest Component
You can use the built-in test component to verify functionality:

1. Add the LogoTest component to any page temporarily:
```typescript
import LogoTest from './components/Debug/LogoTest';

// Add somewhere in your JSX:
<LogoTest />
```

2. The test component will show:
   - Current logo status from database
   - Upload test functionality  
   - Delete test functionality
   - Detailed console logs

### Manual Testing Steps
1. **Upload Test**:
   - Open Account Settings
   - Upload a logo image
   - Check browser console for success logs
   - Verify logo displays immediately
   - Refresh page - logo should still be there

2. **Persistence Test**:
   - Close and reopen Account Settings
   - Logo should load from database
   - Restart the application
   - Logo should still be visible

3. **Remove Test**:
   - Click "Remove Logo" button
   - Check console for deletion logs
   - Verify logo disappears from UI
   - Check Supabase Storage - file should be deleted

### What to Look For in Console
✅ **Successful Upload**:
```
✅ Logo uploaded successfully to URL: https://...
📝 Form data updated with logo URL: https://...
💾 Saving profile with logo URL: https://...
✅ Profile updated successfully: {...}
```

✅ **Successful Load**:
```
🖼️ Logo URL from database: https://...
📂 Loading Account Settings with user logo: https://...
```

## 🐛 Troubleshooting

### "Could not find column" Errors
If you see errors like "Could not find the 'address' column", your `profiles` table is missing some columns:

1. **Check existing columns**:
   - Run `supabase/check_profiles_columns.sql` in Supabase SQL Editor
   - This shows which columns currently exist

2. **Add missing columns** (optional for full functionality):
   - Run `supabase/setup_logo_storage.sql` in Supabase SQL Editor
   - This safely adds missing columns only if needed

3. **Logo will work with just the `logo` column**:
   - Only `logo` column is required for logo functionality
   - Other fields are optional (phone, address, timezone, etc.)

### Logo Not Displaying
1. Check if Supabase bucket exists and is public
2. Verify RLS policies are set up correctly
3. Ensure user has logo URL in database

### Upload Errors
1. Check file size (must be < 5MB)
2. Verify file type (PNG, JPG, JPEG, WebP, SVG only)
3. Confirm user authentication

### Storage Bucket Issues
1. Run the setup SQL script in Supabase
2. Check bucket permissions in Supabase Dashboard
3. Verify RLS policies are active

### "Partially Saved" Messages
If you see "Some fields were not saved", it means:
- Core data (name, restaurant name, logo) was saved ✅
- Optional fields (phone, address) couldn't be saved due to missing columns
- Logo functionality works, but run setup script for full Account Settings

## 📝 Notes

- Logo URLs are stored as absolute URLs in the database
- The system automatically handles file overwrites
- Compatible with both new and existing user accounts
- Maintains backward compatibility with base64 logos (if any exist)

## 🎯 Future Enhancements

Potential improvements:
- Image resizing/optimization before upload
- Multiple logo sizes (thumbnail, full)
- Logo preview before upload confirmation
- Batch logo operations
- Logo usage analytics 