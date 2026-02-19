'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function getUserStore() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get the store associated with the user
  // For MVP, we assume a user has one store or we pick the first one
  const { data: userRole } = await supabase
    .from('user_roles')
    .select(`
      store_id,
      stores (
        id,
        name,
        code
      )
    `)
    .eq('user_id', user.id)
    .single();

  if (!userRole || !userRole.store_id || !userRole.stores) {
    // If no store found, they might need to onboard
    // But dashboard layout should handle this redirection usually.
    return null;
  }

  // Supabase returns related data as an object if it's a one-to-one or many-to-one relationship
  // However, without generated types, TS might treat it as an array.
  // We cast it to any to bypass the error for now, assuming the relationship is correct.
  const store = userRole.stores as any;

  return {
    id: userRole.store_id,
    name: store.name,
    code: store.code
  };
}
