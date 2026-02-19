"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryItem, ItemType } from "@/types/inventory";
import { Search, Filter, Truck, ClipboardList } from "lucide-react";
import { InventoryDashboardItem } from "@/app/dashboard/inventory/actions";

interface InventoryTableProps {
  data: InventoryDashboardItem[];
  onQuickInbound: (item: any) => void;
  onAdjustment: (item: InventoryDashboardItem) => void;
}

export function InventoryTable({ data, onQuickInbound, onAdjustment }: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<ItemType | "all">("all");

  const filteredData = data.filter((inv) => {
    const matchesSearch =
      inv.item?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.item?.code && inv.item.code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === "all" || inv.item?.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const formatQuantity = (qty: number) => {
    return qty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="품목명 또는 코드 검색"
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(val) => setTypeFilter(val as ItemType | "all")}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="유형 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            <SelectItem value="raw">원자재</SelectItem>
            <SelectItem value="semi_finished">반제품</SelectItem>
            <SelectItem value="finished">완제품</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>품목명</TableHead>
              <TableHead>코드</TableHead>
              <TableHead>유형</TableHead>
              <TableHead className="text-right">현재 재고 (이론)</TableHead>
              <TableHead className="text-right">안전재고</TableHead>
              <TableHead className="text-center">상태</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((inv) => {
              const isOutOfStock = inv.theoretical_quantity <= 0;
              // Use the pre-calculated isLowStock from the server action
              const isLowStock = inv.isLowStock;
              
              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{inv.item?.name}</span>
                      <span className="text-xs text-muted-foreground">{inv.item?.category?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{inv.item?.code || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {inv.item?.type === "raw" ? "원자재" : 
                       inv.item?.type === "semi_finished" ? "반제품" : "완제품"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatQuantity(inv.theoretical_quantity)}
                    <span className="ml-1 text-muted-foreground text-xs">{inv.item?.base_unit}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {inv.item?.safety_stock ? formatQuantity(inv.item.safety_stock) : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {isOutOfStock ? (
                      <Badge variant="destructive" className="animate-pulse">품절</Badge>
                    ) : isLowStock ? (
                      <Badge variant="secondary" className="text-yellow-600 bg-yellow-100 hover:bg-yellow-200">
                        부족
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                        적정
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => onAdjustment(inv)}
                      title="재고 실사/조정"
                      className="mr-1"
                    >
                      <ClipboardList className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => onQuickInbound(inv.item)}
                      title="입고 리스트에 추가"
                    >
                      <Truck className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredData.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  검색 결과가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}