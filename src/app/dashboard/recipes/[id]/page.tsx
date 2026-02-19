import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function RecipeDetailPage({
    params,
}: {
    params: { id: string };
}) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/recipes">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">레시피 상세</h1>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
                <p className="text-lg font-medium text-muted-foreground">
                    🚧 준비 중입니다
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                    레시피 상세보기 기능은 곧 제공될 예정입니다.
                </p>
                <Button variant="outline" className="mt-4" asChild>
                    <Link href="/dashboard/recipes">레시피 목록으로 돌아가기</Link>
                </Button>
            </div>
        </div>
    );
}
