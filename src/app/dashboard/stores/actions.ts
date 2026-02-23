"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getStores() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 사용자의 role 확인 (다중 매장일 수 있으므로 limit 1 사용)
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);

  const organizationId = userRoles?.[0]?.organization_id;

  if (!organizationId) {
    return [];
  }

  // organization_id에 속한 모든 매장 조회
  const { data: stores, error } = await supabase
    .from("stores")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching stores:", error);
    return [];
  }

  return stores;
}

export async function getStore(storeId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }
    
    // 권한 확인: 해당 store_id에 접근 권한이 있는지 확인
    const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, organization_id")
        .eq("user_id", user.id)
        .eq("store_id", storeId)
        .single();
    
    // store_id에 대한 직접적인 권한이 없으면 organization 레벨 권한 확인이 필요할 수 있음
    // 하지만 현재 user_roles 구조상 store_id가 null인 경우(organization admin 등)도 고려해야 함
    // 여기서는 간단하게 store 조회 시 RLS 정책을 따르도록 함 (RLS가 organization_id 기반이면 됨)

    const { data: store, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .single();

    if (error) {
        console.error("Error fetching store:", error);
        return null;
    }

    return store;
}

export async function createStore(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const phone = formData.get("phone") as string;
  const code = formData.get("code") as string;

  if (!name) {
    return { success: false, error: "매장 이름은 필수입니다." };
  }

  // 사용자의 organization_id 확인 (다중 매장 고려 limit 1)
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);

  const organizationId = userRoles?.[0]?.organization_id;

  if (!organizationId) {
    return { success: false, error: "조직 정보를 찾을 수 없습니다." };
  }

  // RLS를 우회하여 매장 생성 및 권한 부여를 한 번에 처리하는 RPC 호출
  const { error } = await supabase.rpc("create_store_v2", {
    p_organization_id: organizationId,
    p_store_name: name,
    p_store_code: code || null, // code가 빈 문자열일 수 있으므로 null 처리
    p_store_type: "general", // 기본값 설정 (TEXT 타입)
    p_address: address || null,
    p_phone: phone || null,
  });

  if (error) {
    console.error("Error creating store:", error);
    return { success: false, error: "매장 생성 중 오류가 발생했습니다." };
  }

  revalidatePath("/dashboard/stores");
  return { success: true };
}

export async function updateStore(storeId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "로그인이 필요합니다." };
    }

    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const phone = formData.get("phone") as string;
    const code = formData.get("code") as string;

    if (!name) {
        return { success: false, error: "매장 이름은 필수입니다." };
    }
    
    // 권한 확인: 해당 store_id에 대해 owner 또는 manager 권한이 있는지 확인
    const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, organization_id")
        .eq("user_id", user.id)
        .eq("store_id", storeId) 
        .maybeSingle(); // single() 대신 maybeSingle() 사용 (데이터 없을 수 있음)
    
    // store_id에 대한 직접적인 권한이 없으면 organization 레벨 권한 확인 (store_id가 null인 경우)
    let hasPermission = false;

    if (roleData && (roleData.role === 'owner' || roleData.role === 'manager' || roleData.role === 'super_admin')) {
        hasPermission = true;
    } else {
        // store_id가 null인 organization 레벨 권한 확인
        // 먼저 해당 store의 organization_id를 알아야 함
        const { data: storeData } = await supabase
            .from("stores")
            .select("organization_id")
            .eq("id", storeId)
            .single();
            
        if (storeData) {
            const { data: orgRoleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .eq("organization_id", storeData.organization_id)
                .is("store_id", null) // store_id가 null인 경우 (조직 전체 권한)
                .maybeSingle();
                
            if (orgRoleData && (orgRoleData.role === 'owner' || orgRoleData.role === 'manager' || orgRoleData.role === 'super_admin')) {
                hasPermission = true;
            }
        }
    }

    if (!hasPermission) {
        return { success: false, error: "수정 권한이 없습니다." };
    }
    
    const { error } = await supabase
        .from("stores")
        .update({
            name,
            code: code || null,
            address: address || null,
            phone: phone || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", storeId);

    if (error) {
        console.error("Error updating store:", error);
        return { success: false, error: "매장 수정 중 오류가 발생했습니다." };
    }

    revalidatePath("/dashboard/stores");
    return { success: true };
}

export async function deleteStore(storeId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "로그인이 필요합니다." };
    }
    
    // 권한 확인: 해당 store_id에 대해 owner 권한이 있는지 확인
    const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, organization_id")
        .eq("user_id", user.id)
        .eq("store_id", storeId) // 특정 매장 권한 확인
        .maybeSingle();
    
    let hasPermission = false;

    // 1. 매장 직접 권한 확인
    if (roleData && (roleData.role === 'owner' || roleData.role === 'super_admin')) {
        hasPermission = true;
    } else {
        // 2. 조직 레벨 권한 확인 (store_id가 null인 경우)
        // 먼저 해당 store의 organization_id를 조회
        const { data: storeData } = await supabase
            .from("stores")
            .select("organization_id")
            .eq("id", storeId)
            .single();
            
        if (storeData) {
            const { data: orgRoleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .eq("organization_id", storeData.organization_id)
                .is("store_id", null) // store_id가 null인 경우 (조직 전체 권한)
                .maybeSingle();
                
            if (orgRoleData && (orgRoleData.role === 'owner' || orgRoleData.role === 'super_admin')) {
                hasPermission = true;
            }
        }
    }
    
    if (!hasPermission) {
        return { success: false, error: "삭제 권한이 없습니다. (Owner 권한 필요)" };
    }

    const { error } = await supabase
        .from("stores")
        .delete()
        .eq("id", storeId);

    if (error) {
        console.error("Error deleting store:", error);
        return { success: false, error: "매장 삭제 중 오류가 발생했습니다." };
    }

    revalidatePath("/dashboard/stores");
    return { success: true };
}
