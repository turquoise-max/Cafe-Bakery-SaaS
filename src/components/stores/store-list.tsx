import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getStores } from "@/app/dashboard/stores/actions";
import Link from "next/link";
import { StoreIcon } from "lucide-react";
import { StoreEditModal } from "@/components/stores/store-edit-modal";
import { StoreDeleteButton } from "@/components/stores/store-delete-button";

export default async function StoreList() {
  const stores = await getStores();

  if (stores.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <StoreIcon className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">등록된 매장이 없습니다</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            매장을 등록하고 매출과 재고를 관리해보세요.
          </p>
          <Link href="/dashboard/stores/new">
            <Button>매장 추가하기</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {stores.map((store) => (
        <Card key={store.id} className="flex flex-col">
          <CardHeader>
            <CardTitle>{store.name}</CardTitle>
            <CardDescription>{store.address}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="mt-4 text-sm text-muted-foreground">
              연락처: {store.phone || "미등록"}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <StoreEditModal store={store} />
            <StoreDeleteButton storeId={store.id} storeName={store.name} />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}