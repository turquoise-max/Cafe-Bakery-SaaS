"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionItem } from "@/lib/services/dashboard-data";
import { Button } from "@/components/ui/button";
import { Bell, Check, AlertTriangle } from "lucide-react";

interface ActionCenterProps {
  actions: ActionItem[];
}

export function ActionCenter({ actions }: ActionCenterProps) {
  return (
    <Card className="col-span-4 lg:col-span-3">
      <CardHeader>
        <CardTitle>액션 센터 (Action Center)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {actions.map((action) => (
            <div
              key={action.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-2 rounded-full ${
                    action.type === "low_stock"
                      ? "bg-red-100 text-red-600"
                      : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {action.type === "low_stock" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{action.message}</p>
                  <div className="flex items-center text-xs text-muted-foreground gap-2">
                    <span className="font-semibold text-foreground">
                      {action.storeName}
                    </span>
                    <span>•</span>
                    <span>{action.date}</span>
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline">
                <Check className="h-4 w-4 mr-2" />
                확인
              </Button>
            </div>
          ))}
          {actions.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              처리할 작업이 없습니다.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}