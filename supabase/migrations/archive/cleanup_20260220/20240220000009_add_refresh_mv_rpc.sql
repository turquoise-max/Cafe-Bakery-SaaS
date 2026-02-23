-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_materialized_view(view_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE 'REFRESH MATERIALIZED VIEW ' || view_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;