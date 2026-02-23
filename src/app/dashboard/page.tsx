import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StoreSwitcher } from "@/components/dashboard/store-switcher";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { StoreLeaderboard } from "@/components/dashboard/store-leaderboard";
import { ActionCenter } from "@/components/dashboard/action-center";
import { getDashboardData } from "@/lib/services/dashboard-data";

interface PageProps {
  searchParams: Promise<{ storeId?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { storeId } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch User Roles (Stores)
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("*, stores(*), organizations(*)")
    .eq("user_id", user.id);

  // Extract stores list
  const stores = userRoles?.map((role: any) => {
    // Handle array or object result from join
    const storeData = Array.isArray(role.stores) ? role.stores[0] : role.stores;
    return {
      id: storeData?.id || "",
      name: storeData?.name || "알 수 없는 매장",
    };
  }) || [];

  // Determine current context (All stores or specific store)
  const currentStoreId = storeId === "all" ? undefined : storeId;
  
  // 2. Fetch Dashboard Data
  const dashboardData = await getDashboardData(currentStoreId);

  // Default org name
  const orgName = userRoles?.[0]?.organizations?.name || "My Organization";

  return (
    <div className="space-y-8">
      {/* 1. Global Context Filter */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {orgName} 현황을 한눈에 확인하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">매장 보기:</span>
          <StoreSwitcher stores={stores} currentStoreId={storeId} />
        </div>
      </div>

      {/* 2. Summary Cards */}
      <SummaryCards summary={dashboardData.summary} />

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* 3. Store Performance Comparison (Left/Center) */}
        <StoreLeaderboard data={dashboardData.leaderboard} />

        {/* 4. Action Center (Right) */}
        <ActionCenter actions={dashboardData.actions} />
      </div>
    </div>
  );
}
