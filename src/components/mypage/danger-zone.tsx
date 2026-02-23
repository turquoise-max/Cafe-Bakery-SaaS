"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteAccount } from "@/app/dashboard/mypage/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function DangerZone() {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAccount();
      
      if (result.error) {
        toast.error("계정 삭제 실패", {
          description: result.error,
        });
        setIsDeleting(false);
      } else {
        toast.success("계정 삭제 완료", {
          description: "이용해 주셔서 감사합니다.",
        });
        // 성공 시 홈으로 이동 (Server Action에서 로그아웃 처리됨)
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("오류 발생", {
        description: "계정 삭제 중 알 수 없는 오류가 발생했습니다.",
      });
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
      <CardHeader>
        <CardTitle className="text-red-600">위험 구역</CardTitle>
        <CardDescription>
          계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
          <br />
          소유한 모든 매장 및 조직 데이터도 함께 삭제됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting}>
              {isDeleting ? (
                "삭제 중..."
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  계정 삭제
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>정말 계정을 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                이 작업은 되돌릴 수 없습니다. 귀하의 계정과 관련된 모든 데이터(매장, 매출, 재고 등)가 영구적으로 삭제됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                삭제 확인
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}