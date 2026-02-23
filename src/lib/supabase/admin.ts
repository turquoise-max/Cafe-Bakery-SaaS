import { createClient } from '@supabase/supabase-js';

// Note: SUPABASE_SERVICE_ROLE_KEY는 서버 사이드에서만 사용해야 합니다.
// 절대 클라이언트에 노출하지 마세요.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL or Service Role Key is missing.');
}

export const createAdminClient = () => {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};