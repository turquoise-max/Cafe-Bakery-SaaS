import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function ErrorPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">
                        오류가 발생했습니다
                    </CardTitle>
                    <CardDescription className="text-center">
                        요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button asChild className="w-full">
                        <Link href="/login">로그인 페이지로 돌아가기</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
