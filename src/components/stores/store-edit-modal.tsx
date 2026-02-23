"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateStore } from "@/app/dashboard/stores/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Settings } from "lucide-react";

interface Store {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  address: string | null;
}

interface StoreEditModalProps {
  store: Store;
}

export function StoreEditModal({ store }: StoreEditModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await updateStore(store.id, formData);

      if (result.success) {
        toast.success("매장 정보가 수정되었습니다.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "매장 수정 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Store update error:", error);
      toast.error("알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          관리하기
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>매장 정보 수정</DialogTitle>
          <DialogDescription>
            매장 정보를 수정합니다. 변경사항을 저장하려면 저장 버튼을 클릭하세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">매장명</Label>
            <Input
              id="name"
              name="name"
              defaultValue={store.name}
              placeholder="예: 강남점"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">매장 코드 (선택)</Label>
            <Input
              id="code"
              name="code"
              defaultValue={store.code || ""}
              placeholder="예: GNG001"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">전화번호 (선택)</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={store.phone || ""}
              placeholder="02-1234-5678"
              type="tel"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">주소 (선택)</Label>
            <Input
              id="address"
              name="address"
              defaultValue={store.address || ""}
              placeholder="서울시 강남구..."
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장하기"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}