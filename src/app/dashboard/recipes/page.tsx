import { getRecipes } from "@/app/dashboard/recipes/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function RecipesPage() {
  const recipes = await getRecipes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">레시피 관리</h1>
        <Button asChild>
          <Link href="/dashboard/recipes/new">
            <Plus className="mr-2 h-4 w-4" /> 레시피 등록
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제품명</TableHead>
              <TableHead>버전</TableHead>
              <TableHead>1회 생산량</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipes.map((recipe) => {
              // Action uses aliases: output_item
              const item = recipe.output_item;
              return (
                <TableRow key={recipe.id}>
                  <TableCell className="font-medium">{item?.name}</TableCell>
                  <TableCell>v{recipe.version}</TableCell>
                  <TableCell>
                    {recipe.output_quantity} {item?.base_unit}
                  </TableCell>
                  <TableCell>
                    {recipe.is_active ? (
                      <Badge>사용중</Badge>
                    ) : (
                      <Badge variant="secondary">미사용</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/recipes/${recipe.id}`}>상세</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {recipes?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  등록된 레시피가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}