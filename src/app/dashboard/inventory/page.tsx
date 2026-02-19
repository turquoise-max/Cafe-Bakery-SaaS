import { getInventoryDashboardData, getSuppliers } from "@/app/dashboard/inventory/actions";
import { getItems } from "@/app/dashboard/items/actions";
import { InventoryDashboard } from "@/components/inventory/inventory-dashboard";

export default async function InventoryPage() {
  const [inventoryData, items, suppliers] = await Promise.all([
    getInventoryDashboardData(),
    getItems(),
    getSuppliers(),
  ]);

  return (
    <InventoryDashboard 
      inventoryData={inventoryData}
      items={items}
      suppliers={suppliers}
    />
  );
}
