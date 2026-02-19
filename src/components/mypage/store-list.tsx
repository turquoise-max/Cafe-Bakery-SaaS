"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store } from "lucide-react";

interface StoreListProps {
  stores: {
    id: string;
    role: string;
    store: {
      name: string;
      code: string | null;
    } | null; // Allow store to be null
    organization: {
      name: string;
    } | null; // Allow organization to be null
  }[];
}

export function StoreList({ stores }: StoreListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stores.map((item) => (
        <Card key={item.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {item.store?.name || "알 수 없는 매장"}
            </CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.organization?.name || "알 수 없는 조직"}</div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary">{item.role}</Badge>
              {item.store?.code && (
                <span className="text-xs text-muted-foreground">
                  Code: {item.store.code}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      {stores.length === 0 && (
        <div className="col-span-full text-center text-muted-foreground py-8">
          소속된 매장이 없습니다.
        </div>
      )}
    </div>
  );
}