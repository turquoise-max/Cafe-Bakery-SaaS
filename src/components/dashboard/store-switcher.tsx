"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";

interface Store {
  id: string;
  name: string;
}

interface StoreSwitcherProps {
  stores: Store[];
  currentStoreId?: string;
}

export function StoreSwitcher({ stores, currentStoreId }: StoreSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onStoreSelect = (storeId: string) => {
    router.push(`/dashboard?storeId=${storeId}`);
  };

  // Determine current value: if currentStoreId is undefined or empty, it might be 'all' if URL param isn't set but logic implies all.
  // But parent passes `storeId` from searchParams.
  const currentValue = currentStoreId || "all";

  return (
    <Select
      value={currentValue}
      onValueChange={onStoreSelect}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="매장 선택" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">🏢 전체 매장 요약</SelectItem>
        {stores.map((store) => (
          <SelectItem key={store.id} value={store.id}>
            {store.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
