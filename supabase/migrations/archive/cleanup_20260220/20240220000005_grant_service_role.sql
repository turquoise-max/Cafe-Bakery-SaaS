-- Grant full permissions to service_role for all tables in public schema
-- This ensures the service_role key (used in admin scripts) has full access

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Also ensure authenticated and anon have usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;