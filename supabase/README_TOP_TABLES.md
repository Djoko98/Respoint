# Top Tables Functionality

## Overview
The Top Tables feature shows the 10 most frequently reserved tables based on historical reservation data.

## Setup

### Option 1: Using PostgreSQL Function (Recommended)

1. In your Supabase SQL Editor, run the contents of `get_top_tables_function.sql`
2. This creates a PostgreSQL function that efficiently "explodes" the `table_ids` array and counts reservations per table
3. The app will automatically use this function for optimal performance

### Option 2: Fallback Method (No SQL Function Required)

If you prefer not to create the SQL function, the app includes a fallback mechanism that:
1. Fetches all reservation records with `table_ids`
2. Processes the arrays client-side using JavaScript
3. Counts and sorts tables to show top 10

The fallback will be used automatically if the SQL function is not available.

## How It Works

1. **Data Source**: Analyzes all historical reservations for the current user
2. **Array Processing**: Each reservation can have multiple `table_ids`, so each table ID is counted separately
3. **Filtering**: Only includes non-deleted reservations (`is_deleted = false`)
4. **Sorting**: Orders by reservation count (descending)
5. **Limit**: Shows top 10 tables
6. **Display**: Shows table names using the same `formatTableNames` function used elsewhere in the app

## Database Schema Requirements

The feature requires:
- `reservations` table with columns:
  - `user_id` (UUID)
  - `table_ids` (text array)
  - `is_deleted` (boolean)

## Visual Design

- Card layout matching other statistics cards
- 180px height with scrolling for consistency
- Shows rank (#1, #2, etc.)
- Table icon and name
- Reservation count
- Progress bar showing relative popularity
- Light transparent scrollbar matching other cards

## Benefits

- Identifies most popular seating areas
- Helps optimize restaurant layout
- Shows customer preferences
- Useful for capacity planning
- Integrates seamlessly with existing statistics 