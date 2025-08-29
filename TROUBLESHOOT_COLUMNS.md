# Fixing Missing Columns in Profiles Table

## 🔍 Step 1: Check Current Columns

**Option A: Using SQL Editor**
1. Go to Supabase Dashboard → SQL Editor
2. Run this query:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY column_name;
```

**Option B: Using Table Editor**
1. Go to Supabase Dashboard → Table Editor
2. Click on `profiles` table
3. Look at the column headers

## ✅ Step 2: Add Missing Columns

### Method 1: SQL Script (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste **entire** content from `supabase/add_missing_columns.sql`
3. Click "Run" button
4. Check results - should show all columns at the end

### Method 2: Manual via Table Editor
1. Go to Supabase Dashboard → Table Editor
2. Open `profiles` table
3. Click "Add Column" for each missing column:

**Required columns:**
- `logo` (type: text, nullable: true)
- `phone` (type: text, nullable: true) 
- `address` (type: text, nullable: true)
- `timezone` (type: text, nullable: true, default: 'Europe/Belgrade')
- `language` (type: text, nullable: true, default: 'eng')
- `auto_archive` (type: boolean, nullable: true, default: true)

### Method 3: Individual SQL Commands
If the full script doesn't work, run these **one by one**:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo TEXT;
```

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
```

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
```

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Belgrade';
```

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'eng';
```

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_archive BOOLEAN DEFAULT true;
```

## 🧪 Step 3: Test the Fix

1. Try saving Account Settings again
2. Should now show "Save Successful" instead of "Partially Saved"
3. All fields (phone, address, etc.) should now save properly

## 🚨 Common Issues

### "Permission denied" errors
- Make sure you're logged in as the owner/admin in Supabase Dashboard
- Try using the Table Editor method instead of SQL

### "Column already exists" errors  
- This is normal! It means some columns already exist
- The script will skip existing columns

### Still getting "Partially Saved"
- Run the verification query to see which columns actually exist
- Compare with the required list above
- Add any missing columns manually

## 🎯 What You Should See After Success

**Before fix:**
```
Columns: id, name, restaurant_name, role, updated_at
Result: "Partially Saved" message
```

**After fix:**
```
Columns: address, auto_archive, id, language, logo, name, phone, restaurant_name, role, timezone, updated_at
Result: "Save Successful" message
```

## 💡 Tips

- The `logo` column is most important for logo functionality
- Other columns are for Account Settings convenience
- Logo will work even if other columns are missing
- You can add columns gradually - start with `logo` and `phone` 