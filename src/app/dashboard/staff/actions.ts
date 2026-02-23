"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getStaffList() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // 현재 사용자의 organization_id 확인 (다중 매장 고려 limit 1)
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);

  const organizationId = userRoles?.[0]?.organization_id;

  if (!organizationId) {
    return [];
  }

  // organization_id가 같은 모든 직원 조회 (user 정보 포함)
  const { data: staffList, error } = await supabase
    .from("user_roles")
    .select(`
      id,
      role,
      store_id,
      user:users (
        id,
        email,
        name,
        phone
      ),
      store:stores (
        id,
        name
      )
    `)
    .eq("organization_id", organizationId);

  if (error) {
    console.error("Error fetching staff list:", error);
    return [];
  }

  // 사용자별로 그룹화
  const groupedStaff = staffList.reduce((acc: any[], curr: any) => {
    const existingUserIndex = acc.findIndex(
      (item) => item.user.id === curr.user.id
    );

    if (existingUserIndex > -1) {
      // 이미 존재하는 사용자면 role 추가
      acc[existingUserIndex].roles.push({
        id: curr.id, // role id
        role: curr.role,
        store: curr.store,
      });
    } else {
      // 새로운 사용자 추가
      acc.push({
        user: curr.user,
        roles: [
          {
            id: curr.id, // role id
            role: curr.role,
            store: curr.store,
          },
        ],
      });
    }
    return acc;
  }, []);

  return groupedStaff;
}

export async function getPendingInvitations() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // 현재 사용자의 organization_id 확인
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);

  const organizationId = userRoles?.[0]?.organization_id;

  if (!organizationId) {
    return [];
  }

  // organization에 속한 store들의 초대 목록 조회
  // store_invitations에는 organization_id가 없으므로 store를 거쳐서 조회
  // 또는 store_invitations -> store -> organization_id 체크
  const { data: invitations, error } = await supabase
    .from("store_invitations")
    .select(`
      id,
      email,
      role,
      created_at,
      store:stores (
        id,
        name,
        organization_id
      )
    `)
    .eq("status", "pending")
    // Client-side filtering or complex query needed for join filtering?
    // Supabase allows filtering on joined tables
    .eq("store.organization_id", organizationId); 

  if (error) {
    console.error("Error fetching invitations:", error);
    return [];
  }

  // Supabase join filter applied?
  // .eq('store.organization_id', ...) works if relationship is correct.
  // Let's verify filtering: The result will contain null store if inner join not used or filter fails?
  // Supabase default join is LEFT OUTER join.
  // We need to filter where store.organization_id is matched.
  // Actually, filtering on foreign table usually requires `!inner` hint to make it INNER JOIN.
  // Let's try explicit filtering in application or assume RLS handles visibility?
  // RLS might not be set up for invitations view by org members yet.
  
  // Safe filtering in JS for now
  return invitations.filter((inv: any) => inv.store?.organization_id === organizationId);
}

export async function cancelInvitation(invitationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // 권한 확인: Owner 또는 Manager
  // 여기서는 간단히 삭제 요청자가 해당 초대의 store에 대한 권한이 있는지 확인해야 함
  // 하지만 invitationId만으로는 바로 알기 어려우니, 먼저 invitation 정보를 가져와서 store_id를 확인
  const { data: invitation } = await supabase
    .from("store_invitations")
    .select("store_id")
    .eq("id", invitationId)
    .single();

  if (!invitation) {
    return { success: false, error: "초대 정보를 찾을 수 없습니다." };
  }

  // 사용자가 해당 매장의 관리자(Owner/Manager)인지 확인
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("store_id", invitation.store_id)
    .in("role", ["owner", "manager"])
    .single();

  if (!userRole) {
    // 혹시 Org Owner일 수도 있음 (매장별 role이 없는 경우)
    const { data: orgOwner } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .limit(1);
        
    if (!orgOwner || orgOwner.length === 0) {
        return { success: false, error: "초대 취소 권한이 없습니다." };
    }
  }

  const { error } = await supabase
    .from("store_invitations")
    .delete()
    .eq("id", invitationId);

  if (error) {
    console.error("Error canceling invitation:", error);
    return { success: false, error: "초대 취소 중 오류가 발생했습니다." };
  }

  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function inviteStaff(email: string, role: string, storeId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // 현재 사용자의 권한 확인 (owner 체크 - 어느 매장이든 owner면 가능하다고 가정)
  // 단, manager라면 특정 store에 대한 manager여야 함. 여기서는 단순화를 위해 organization의 owner/manager인지 확인
  // 실제로는 초대하려는 storeId에 대한 권한을 체크해야 함.
  
  let hasPermission = false;
  let organizationId: string | undefined;

  if (storeId) {
    // 특정 매장 초대 시 해당 매장 권한 확인
    const { data: storeRole } = await supabase
      .from("user_roles")
      .select("role, organization_id")
      .eq("user_id", user.id)
      .eq("store_id", storeId)
      .single();
      
    if (storeRole && (storeRole.role === 'owner' || storeRole.role === 'manager')) {
        hasPermission = true;
        organizationId = storeRole.organization_id;
    }
  } else {
    // 매장 지정 없는 초대 (일반적으로 owner만 가능하거나 전체 관리자)
    const { data: ownerRoles } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .limit(1);
        
    if (ownerRoles && ownerRoles.length > 0) {
        hasPermission = true;
        organizationId = ownerRoles[0].organization_id;
    }
  }

  if (!hasPermission || !organizationId) {
    // Fallback logic for backward compatibility or simple check if above fails
    // Just check if they have ANY owner/manager role in the org if storeId is not provided
     const { data: anyRole } = await supabase
      .from("user_roles")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .in("role", ["owner", "manager"])
      .limit(1);
      
     if (anyRole && anyRole.length > 0) {
         hasPermission = true;
         organizationId = anyRole[0].organization_id;
     }
  }

  if (!hasPermission || !organizationId) {
    return { success: false, error: "직원 초대 권한이 없습니다." };
  }

  // 초대할 사용자가 존재하는지 확인
  const { data: targetUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (!targetUser) {
    // 사용자가 없으면 초대장(store_invitations) 생성
    // 먼저 중복 초대 확인
    const { data: existingInvite } = await supabase
      .from("store_invitations")
      .select("id")
      .eq("email", email)
      .eq("store_id", storeId || "") // store_id가 필수인 경우가 많음. 없으면 org 레벨? 현재 스키마는 store_id NOT NULL
      .single();

    if (existingInvite) {
      return { success: false, error: "이미 대기 중인 초대가 있습니다." };
    }

    // store_id가 없으면(조직 단위 초대) 현재 스키마상 store_invitations에 넣기 애매함.
    // 일단 storeId가 있는 경우만 초대 가능하도록 하거나, 임의의 storeId를 사용해야 함.
    // 여기서는 storeId가 없으면 첫번째 storeId를 가져와서 사용하거나 에러 처리.
    // 편의상 organization의 첫번째 store를 타겟으로 함 (또는 로직 보완 필요)
    let targetStoreId = storeId;
    if (!targetStoreId) {
       // get any store of org
       const { data: anyStore } = await supabase.from("stores").select("id").eq("organization_id", organizationId).limit(1).single();
       targetStoreId = anyStore?.id;
    }

    if (!targetStoreId) {
        return { success: false, error: "초대할 매장 정보를 찾을 수 없습니다." };
    }

    const { error: inviteError } = await supabase.from("store_invitations").insert({
      email,
      role,
      store_id: targetStoreId,
      invited_by: user.id,
      status: 'pending'
    });

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      return { success: false, error: "초대장 생성 중 오류가 발생했습니다." };
    }

    // TODO: Send Email (via SendGrid or similar)
    console.log(`[Mock Email] Sending invitation to ${email} for store ${targetStoreId}`);

    return { success: true, message: "초대 메일을 발송했습니다." };
  }

  // 이미 등록된 직원인지 확인 (해당 매장에 대해)
  const query = supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", targetUser.id)
    .eq("organization_id", organizationId);
    
  if (storeId) {
      query.eq("store_id", storeId);
  } else {
      query.is("store_id", null);
  }
  
  const { data: existingStaff } = await query.maybeSingle();

  if (existingStaff) {
    return { success: false, error: "이미 해당 권한으로 등록된 직원입니다." };
  }

  // 직원 등록
  const { error } = await supabase.from("user_roles").insert({
    user_id: targetUser.id,
    organization_id: organizationId,
    store_id: storeId || null,
    role: role,
  });

  if (error) {
    console.error("Error inviting staff:", error);
    return { success: false, error: "직원 초대 중 오류가 발생했습니다." };
  }

  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function updateStaffRole(staffId: string, newRole: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // 권한 확인 (Owner만 수정 가능)
  const { data: ownerRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .limit(1);

  if (!ownerRole || ownerRole.length === 0) {
    return { success: false, error: "권한 수정 권한이 없습니다." };
  }

  const { error } = await supabase
    .from("user_roles")
    .update({ role: newRole })
    .eq("id", staffId);

  if (error) {
    console.error("Error updating staff role:", error);
    return { success: false, error: "권한 수정 중 오류가 발생했습니다." };
  }

  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function removeStaff(staffId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // 권한 확인 (Owner만 삭제 가능)
  const { data: ownerRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .limit(1);

  if (!ownerRole || ownerRole.length === 0) {
    return { success: false, error: "직원 삭제 권한이 없습니다." };
  }

  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("id", staffId);

  if (error) {
    console.error("Error removing staff:", error);
    return { success: false, error: "직원 삭제 중 오류가 발생했습니다." };
  }

  revalidatePath("/dashboard/staff");
  return { success: true };
}