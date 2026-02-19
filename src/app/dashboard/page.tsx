import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 사용자의 조직 및 매장 정보 조회
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("*, stores(*), organizations(*)")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* 조직 정보 카드 */}
        <div className="overflow-hidden rounded-lg bg-card text-card-foreground shadow border">
          <div className="p-6">
            <dt className="text-sm font-medium text-muted-foreground">
              조직 (Organization)
            </dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight">
              {userRoles?.organizations?.name || "정보 없음"}
            </dd>
          </div>
        </div>

        {/* 매장 정보 카드 */}
        <div className="overflow-hidden rounded-lg bg-card text-card-foreground shadow border">
          <div className="p-6">
            <dt className="text-sm font-medium text-muted-foreground">
              현재 매장 (Store)
            </dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight">
              {userRoles?.stores?.name || "정보 없음"}
            </dd>
          </div>
        </div>

        {/* 역할 정보 카드 */}
        <div className="overflow-hidden rounded-lg bg-card text-card-foreground shadow border">
          <div className="p-6">
            <dt className="text-sm font-medium text-muted-foreground">
              내 역할 (Role)
            </dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight">
              {userRoles?.role || "정보 없음"}
            </dd>
          </div>
        </div>
      </div>
    </div>
  );
}