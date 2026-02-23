"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Loader2 } from "lucide-react";
import { deleteStore } from "@/app/dashboard/stores/actions";
import { toast } from "sonner";

interface StoreDeleteButtonProps {
  storeId: string;
  storeName: string;
}

export function StoreDeleteButton({ storeId, storeName }: StoreDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (inputValue !== storeName) return;

    setIsDeleting(true);
    try {
      const result = await deleteStore(storeId);
      if (result.success) {
        toast.success("매장이 삭제되었습니다.");
        setIsOpen(false);
      } else {
        toast.error(result.error || "매장 삭제 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Delete store error:", error);
      toast.error("알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>매장을 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            이 작업은 되돌릴 수 없습니다. 매장에 연결된 모든 데이터(재고, 매출, 직원 등)가 영구적으로 삭제됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <Label htmlFor="confirm-store-name" className="mb-2 block text-sm font-medium">
            삭제를 확인하려면 <span className="font-bold text-destructive">{storeName}</span>을(를) 입력하세요.
          </Label>
          <Input
            id="confirm-store-name"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={storeName}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={inputValue !== storeName || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                삭제 중...
              </>
            ) : (
              "매장 삭제"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}