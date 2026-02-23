import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyInvitationFlow() {
  console.log('Starting invitation flow verification...');

  const testEmail = `test-invite-${Date.now()}@example.com`;
  const testPassword = 'password123';
  let storeId: string;
  let userId: string | undefined;

  try {
    // 1. Get an existing store
    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('id, organization_id')
      .limit(1);

    if (storeError || !stores || stores.length === 0) {
      throw new Error('No stores found to test with.');
    }

    storeId = stores[0].id;
    console.log(`Using store: ${storeId}`);

    // Get an inviter (any user)
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
    
    if (userError || !users || users.length === 0) {
        throw new Error('No users found to act as inviter.');
    }
    const inviterId = users[0].id;
    console.log(`Using inviter: ${inviterId}`);

    // 2. Create an invitation
    console.log(`Creating invitation for ${testEmail}...`);
    const { data: invite, error: inviteError } = await supabase
      .from('store_invitations')
      .insert({
        store_id: storeId,
        email: testEmail,
        role: 'staff',
        status: 'pending',
        invited_by: inviterId
      })
      .select()
      .single();

    if (inviteError) {
      throw new Error(`Failed to create invitation: ${inviteError.message}`);
    }
    console.log('Invitation created:', invite);

    // 3. Create a new user (simulate signup)
    console.log('Creating new user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Test User',
        full_name: 'Test User'
      }
    });

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`);
    }
    userId = authUser.user.id;
    console.log(`User created: ${userId}`);

    // 4. Verify user role assignment
    console.log('Verifying user role assignment...');
    // Wait a bit for the trigger to fire
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .single();

    if (roleError) {
        // Try again just in case
        await new Promise(resolve => setTimeout(resolve, 2000));
         const { data: userRole2, error: roleError2 } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', userId)
            .eq('store_id', storeId)
            .single();
            
        if (roleError2) {
            console.error('Role verification failed:', roleError2);
            throw new Error('User role was not assigned.');
        } else {
             console.log('User role assigned successfully (on retry):', userRole2);
        }
    } else {
        console.log('User role assigned successfully:', userRole);
    }

    // 5. Verify invitation status update
    console.log('Verifying invitation status update...');
    const { data: updatedInvite, error: updatedInviteError } = await supabase
      .from('store_invitations')
      .select('*')
      .eq('id', invite.id)
      .single();

    if (updatedInviteError) {
      throw new Error(`Failed to fetch updated invitation: ${updatedInviteError.message}`);
    }

    if (updatedInvite.status === 'accepted') {
      console.log('Invitation status updated to accepted.');
    } else {
      throw new Error(`Invitation status is ${updatedInvite.status}, expected 'accepted'.`);
    }

    console.log('Invitation flow verification PASSED!');

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    // Cleanup
    if (userId) {
      console.log('Cleaning up user...');
      await supabase.auth.admin.deleteUser(userId);
    }
    // Invitation and role should be cascade deleted or manually cleaned if needed
    // But since user is deleted, role is deleted via cascade.
    // Invitation might remain 'accepted'. That's fine for test record or can be deleted.
    if (userId) {
         // Clean up the invitation as well to keep DB clean
         await supabase.from('store_invitations').delete().eq('email', testEmail);
    }
  }
}

verifyInvitationFlow();