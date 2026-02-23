"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StorePerformance } from "@/lib/services/dashboard-data";
import { Progress } from "@/components/ui/progress";

interface StoreLeaderboardProps {
  data: StorePerformance[];
}

export function StoreLeaderboard({ data }: StoreLeaderboardProps) {
  // Find max sales for progress bar scaling
  const maxSales = Math.max(...data.map((d) => d.todaySales), 1);

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>매장별 성과 비교 (오늘)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {data.map((store) => (
            <div key={store.storeId} className="flex items-center">
              <div className="w-[120px] font-medium truncate" title={store.storeName}>
                {store.storeName}
              </div>
              <div className="flex-1 px-4">
                <Progress 
                  value={(store.todaySales / maxSales) * 100} 
                  className="h-2" 
                />
              </div>
              <div className="w-[100px] text-right font-bold">
                ₩{store.todaySales.toLocaleString()}
              </div>
              <div className="w-[80px] text-right text-sm">
                {store.issueCount > 0 ? (
                  <span className="text-red-500 font-medium">
                    ⚠️ {store.issueCount}건
                  </span>
                ) : (
                  <span className="text-green-500">정상</span>
                )}
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              데이터가 없습니다.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}