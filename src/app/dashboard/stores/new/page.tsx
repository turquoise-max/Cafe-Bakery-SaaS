"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createStore } from "@/app/dashboard/stores/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewStorePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await createStore(formData);
      
      if (result.success) {
        toast.success("매장이 생성되었습니다.");
        router.push("/dashboard/stores");
      } else {
        toast.error(result.error || "매장 생성 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Store creation error:", error);
      toast.error("알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-6">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent hover:text-primary">
          <Link href="/dashboard/stores" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            돌아가기
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>새 매장 등록</CardTitle>
          <CardDescription>
            새로운 매장을 등록하여 관리를 시작하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">매장명</Label>
              <Input
                id="name"
                name="name"
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
                placeholder="예: GNG001"
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                매장을 식별하기 위한 고유 코드입니다. 입력하지 않으면 자동 생성됩니다.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호 (선택)</Label>
              <Input
                id="phone"
                name="phone"
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
                placeholder="서울시 강남구..."
                disabled={isSubmitting}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                asChild
                disabled={isSubmitting}
              >
                <Link href="/dashboard/stores">취소</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  "매장 생성"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}