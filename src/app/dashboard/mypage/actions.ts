"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const adminSupabase = createAdminClient();

  try {
    // 1. Find organizations owned by the user
    const { data: ownedRoles, error: rolesError } = await adminSupabase
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("role", "owner");

    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      return { error: "사용자 권한 조회 중 오류가 발생했습니다." };
    }

    if (ownedRoles && ownedRoles.length > 0) {
      const orgIds = ownedRoles.map((role) => role.organization_id);

      // 2. Delete organizations (CASCADE will handle stores, items, etc.)
      const { error: deleteOrgError } = await adminSupabase
        .from("organizations")
        .delete()
        .in("id", orgIds);

      if (deleteOrgError) {
        console.error("Error deleting organizations:", deleteOrgError);
        return { error: "조직 데이터 삭제 중 오류가 발생했습니다." };
      }
    }

    // 3. Delete user from auth.users (CASCADE will handle public.users)
    const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteUserError) {
      console.error("Error deleting user:", deleteUserError);
      return { error: "사용자 계정 삭제 중 오류가 발생했습니다." };
    }

    // 4. Sign out
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    console.error("Unexpected error during account deletion:", error);
    return { error: "계정 삭제 중 예기치 않은 오류가 발생했습니다." };
  }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;

  if (!name) {
    return { error: "이름은 필수입니다." };
  }

  const { error } = await supabase
    .from("users")
    .update({
      name,
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile:", error);
    return { error: "프로필 업데이트 중 오류가 발생했습니다." };
  }

  revalidatePath("/dashboard/mypage");
  return { success: "프로필이 업데이트되었습니다." };
}