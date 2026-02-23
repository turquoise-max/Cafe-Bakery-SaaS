import { Suspense } from "react";
import { Metadata } from "next";
import StoreList from "@/components/stores/store-list";
import { StoreListSkeleton } from "@/components/stores/store-list-skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "매장 관리 | Cafe & Bakery SaaS",
  description: "매장 목록을 관리합니다.",
};

export default function StoresPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">매장 관리</h1>
          <p className="text-muted-foreground">
            매장을 등록하고 관리할 수 있습니다.
          </p>
        </div>
        <Link href="/dashboard/stores/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            매장 추가
          </Button>
        </Link>
      </div>
      
      <Suspense fallback={<StoreListSkeleton />}>
        <StoreList />
      </Suspense>
    </div>
  );
}