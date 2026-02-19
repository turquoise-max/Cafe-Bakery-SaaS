import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { InventoryItem } from "@/types/inventory";

interface InventorySummaryProps {
  data: InventoryItem[];
}

export function InventorySummary({ data }: InventorySummaryProps) {
  const totalItems = data.length;
  
  const lowStockItems = data.filter(
    (item) => item.theoretical_quantity < (item.item?.safety_stock || 0)
  );
  
  const outOfStockItems = data.filter(
    (item) => item.theoretical_quantity <= 0
  );

  // Calculate health score (simple ratio of safe items)
  const safeItems = totalItems - lowStockItems.length;
  const healthScore = totalItems > 0 ? Math.round((safeItems / totalItems) * 100) : 100;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">전체 품목</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalItems}</div>
          <p className="text-xs text-muted-foreground">
            관리 중인 총 자재/상품 수
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">안전재고 미달</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</div>
          <p className="text-xs text-muted-foreground">
            발주가 필요한 품목 수
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">품절 (Out of Stock)</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{outOfStockItems.length}</div>
          <p className="text-xs text-muted-foreground">
            즉시 조치가 필요한 품목
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">재고 건전성</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{healthScore}%</div>
          <p className="text-xs text-muted-foreground">
            안전재고 확보율
          </p>
        </CardContent>
      </Card>
    </div>
  );
}