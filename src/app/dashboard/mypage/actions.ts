"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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