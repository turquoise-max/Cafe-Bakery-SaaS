import { getItems } from "@/app/dashboard/items/actions";
import { ItemForm } from "@/components/items/item-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ItemsPage() {
  const items = await getItems();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">품목 관리 (Items)</h1>
        <ItemForm />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 품목 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">원자재 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {items.filter((i) => i.type === "raw").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">완제품 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {items.filter((i) => i.type === "finished").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>품목명</TableHead>
              <TableHead>코드</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead className="text-right">기본 단위</TableHead>
              <TableHead className="text-right">안전재고</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.code || "-"}</TableCell>
                <TableCell>
                  <Badge variant={item.type === "raw" ? "default" : "secondary"}>
                    {item.type === "raw"
                      ? "원자재"
                      : item.type === "semi_finished"
                      ? "반제품"
                      : "완제품"}
                  </Badge>
                </TableCell>
                <TableCell>{item.category?.name || "-"}</TableCell>
                <TableCell className="text-right">{item.base_unit}</TableCell>
                <TableCell className="text-right">
                  {item.safety_stock?.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  등록된 품목이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}