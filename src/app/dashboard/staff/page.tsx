import { Metadata } from "next";
import { getStaffList, getPendingInvitations } from "./actions";
import { StaffList } from "@/components/staff/staff-list";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "직원 관리",
  description: "매장의 직원 목록을 관리하고 권한을 설정합니다.",
};

export default async function StaffPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 현재 사용자의 역할 확인 (다중 매장 고려 limit 1, 또는 전체 조회 후 최고 권한 확인)
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  // 사용자가 가진 역할 중 가장 높은 권한을 UI 표시용으로 사용
  // owner > manager > staff
  let currentUserRole = "staff";
  if (userRoles?.some(r => r.role === 'owner')) {
    currentUserRole = "owner";
  } else if (userRoles?.some(r => r.role === 'manager')) {
    currentUserRole = "manager";
  }

  // 직원 목록 가져오기
  const staffList = await getStaffList();
  
  // 대기 중인 초대 목록 가져오기
  const invitations = await getPendingInvitations();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">직원 관리</h2>
      </div>
      <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
        <StaffList 
          initialStaffList={staffList} 
          initialInvitations={invitations} 
          currentUserRole={currentUserRole} 
        />
      </div>
    </div>
  );
}