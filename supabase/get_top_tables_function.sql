-- Function to get top tables by reservation count
-- This function "explodes" the table_ids array and counts reservations per table

CREATE OR REPLACE FUNCTION get_top_tables(p_user_id UUID)
RETURNS TABLE (
  table_id TEXT,
  reservation_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest_table_id,
    COUNT(*) as count_reservations
  FROM (
    SELECT 
      unnest(table_ids) as unnest_table_id
    FROM reservations 
    WHERE user_id = p_user_id 
      AND table_ids IS NOT NULL 
      AND array_length(table_ids, 1) > 0
      AND is_deleted = false
  ) t
  GROUP BY unnest_table_id
  ORDER BY count_reservations DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_top_tables(UUID) TO authenticated; 