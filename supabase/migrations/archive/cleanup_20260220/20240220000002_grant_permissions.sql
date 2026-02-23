-- Grant permissions to authenticated users for core tables
-- This fixes "permission denied" errors when RLS is enabled but table permissions are missing

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO authenticated;

-- Grant permissions for business data tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE recipes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE recipe_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE item_options TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE purchase_order_items TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE inventory_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE inventory_lots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE physical_counts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE physical_count_items TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE sales_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE expenses TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE store_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE unit_conversions TO authenticated;

-- Also grant usage on sequences if any (for serial columns, though UUIDs are used mostly)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;