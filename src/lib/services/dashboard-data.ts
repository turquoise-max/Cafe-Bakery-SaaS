import { createClient } from "@/lib/supabase/server";

export interface DashboardSummary {
  totalSales: number;
  totalStores: number;
  totalStaff: number;
  lowStockCount: number;
}

export interface StorePerformance {
  storeId: string;
  storeName: string;
  todaySales: number;
  issueCount: number;
}

export interface ActionItem {
  id: string;
  type: "invitation" | "low_stock";
  message: string;
  storeName: string;
  date: string;
}

export async function getDashboardData(storeId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // 1. Get User's Stores (Roles)
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("store_id, stores(id, name)")
    .eq("user_id", user.id);

  if (!userRoles || userRoles.length === 0) {
    return {
      summary: { totalSales: 0, totalStores: 0, totalStaff: 0, lowStockCount: 0 },
      leaderboard: [],
      actions: [],
    };
  }

  // Filter stores if storeId is provided (Context Filter)
  const targetStoreIds = storeId
    ? [storeId]
    : userRoles.map((r) => r.store_id).filter(Boolean) as string[];

  // 2. Fetch Data in Parallel

  // A. Sales (Today)
  const today = new Date().toISOString().split("T")[0];
  const { data: salesData } = await supabase
    .from("sales")
    .select("store_id, total_amount")
    .in("store_id", targetStoreIds)
    .eq("sale_date", today);

  const totalSales = salesData?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;

  // B. Staff Count (Unique Users)
  // We need to count distinct users across all stores.
  // Instead of count(), we fetch user_ids and use a Set to count unique users.
  const { data: staffRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("store_id", targetStoreIds);
  
  const uniqueStaffIds = new Set(staffRoles?.map(r => r.user_id));
  const staffCount = uniqueStaffIds.size;

  // C. Low Stock Alerts
  // Join inventory and items to check safety stock
  const { data: lowStockData } = await supabase
    .from("inventory")
    .select("store_id, theoretical_quantity, items(safety_stock, name)")
    .in("store_id", targetStoreIds);

  let lowStockCount = 0;
  const lowStockItems: any[] = [];

  lowStockData?.forEach((inv: any) => {
    if (inv.items && inv.theoretical_quantity < inv.items.safety_stock) {
      lowStockCount++;
      lowStockItems.push({
        storeId: inv.store_id,
        itemName: inv.items.name,
      });
    }
  });

  // D. Pending Invitations
  const { data: invitations } = await supabase
    .from("store_invitations")
    .select("store_id, email, created_at, stores(name)")
    .in("store_id", targetStoreIds)
    .eq("status", "pending");

  // 3. Construct Response

  // Summary
  const summary: DashboardSummary = {
    totalSales,
    totalStores: targetStoreIds.length,
    totalStaff: staffCount || 0,
    lowStockCount,
  };

  // Leaderboard (Per Store Performance)
  // Map store names to IDs
  const storeMap = new Map<string, string>();
  userRoles.forEach((r: any) => {
    const store = Array.isArray(r.stores) ? r.stores[0] : r.stores;
    if (store && r.store_id) storeMap.set(r.store_id, store.name);
  });

  const leaderboard: StorePerformance[] = targetStoreIds.map(id => {
    const storeSales = salesData
      ?.filter(s => s.store_id === id)
      .reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
    
    // Count issues for this store (low stock)
    const storeIssues = lowStockItems.filter(i => i.storeId === id).length;

    return {
      storeId: id,
      storeName: storeMap.get(id) || "Unknown",
      todaySales: storeSales,
      issueCount: storeIssues
    };
  }).sort((a, b) => b.todaySales - a.todaySales); // Sort by sales desc

  // Action Items
  const actions: ActionItem[] = [];

  // Add Invitations
  invitations?.forEach((inv: any) => {
    actions.push({
      id: `inv-${inv.email}`,
      type: "invitation",
      message: `초대 대기: ${inv.email}`,
      storeName: inv.stores?.name || "Unknown",
      date: new Date(inv.created_at).toLocaleDateString(),
    });
  });

  // Add Low Stock (Limit to 5)
  lowStockItems.slice(0, 5).forEach((item, idx) => {
    actions.push({
      id: `stock-${idx}`,
      type: "low_stock",
      message: `재고 부족: ${item.itemName}`,
      storeName: storeMap.get(item.storeId) || "Unknown",
      date: today,
    });
  });

  return { summary, leaderboard, actions };
}