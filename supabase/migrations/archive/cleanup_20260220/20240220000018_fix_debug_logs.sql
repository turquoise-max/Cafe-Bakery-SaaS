-- Enable RLS and allow access to debug_logs
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to debug_logs" ON public.debug_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);
  
-- Grant access to anon and authenticated (just for debugging, remove later)
GRANT ALL ON public.debug_logs TO anon, authenticated, service_role;