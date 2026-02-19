"use client";

import { useState } from "react";
import { InventoryItem, Item } from "@/types/inventory";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { InboundForm } from "@/components/inventory/inbound-form";
import { InventorySummary } from "@/components/inventory/inventory-summary";
import { InventoryDashboardItem } from "@/app/dashboard/inventory/actions";
import { SalesSimulator } from "@/components/inventory/sales-simulator";
import { InventoryCountModal } from "@/components/inventory/inventory-count-modal";

interface InventoryDashboardProps {
  inventoryData: InventoryDashboardItem[];
  items: Item[];
  suppliers: any[];
}

export function InventoryDashboard({
  inventoryData,
  items,
  suppliers,
}: InventoryDashboardProps) {
  const [itemToAdd, setItemToAdd] = useState<Item | null>(null);
  const [selectedInventory, setSelectedInventory] = useState<InventoryDashboardItem | null>(null);
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);

  const handleQuickInbound = (item: Item) => {
    setItemToAdd(item);
    // Reset after a short delay so the effect in InboundForm triggers even for same item if needed, 
    // though effect deps on [itemToAdd] might need object change.
    // InboundForm handles null check.
    // Actually, passing same object ref might not trigger effect if using strict equality.
    // But item coming from different rows are usually same ref if data is stable? 
    // Let's copy it or just set it. 
    // Better: InboundForm's effect runs on itemToAdd change.
    // If we want to re-trigger for same item, we might need a timestamp or wrapper.
    // For MVP, setItemToAdd({ ...item }) ensures new ref.
  };

  const handleItemAdded = () => {
    setItemToAdd(null);
  };

  const handleAdjustment = (inventory: InventoryDashboardItem) => {
    setSelectedInventory(inventory);
    setIsCountModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {selectedInventory && (
        <InventoryCountModal
          isOpen={isCountModalOpen}
          onClose={() => setIsCountModalOpen(false)}
          item={selectedInventory}
        />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">재고 현황</h1>
        <div className="flex items-center gap-2">
          <SalesSimulator />
          <InboundForm 
            items={items} 
            suppliers={suppliers} 
            itemToAdd={itemToAdd} 
            onItemAdded={handleItemAdded}
          />
        </div>
      </div>

      <InventorySummary data={inventoryData} />

      <InventoryTable 
        data={inventoryData} 
        onQuickInbound={(item) => handleQuickInbound({ ...item })} 
        onAdjustment={handleAdjustment}
      />
    </div>
  );
}
