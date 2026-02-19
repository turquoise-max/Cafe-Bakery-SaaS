"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { processInbound } from "@/app/dashboard/inventory/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Search, Truck } from "lucide-react";
import { Item } from "@/types/inventory";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect } from "react";

interface InboundFormProps {
  items: Item[];
  suppliers: any[];
  itemToAdd?: Item | null;
  onItemAdded?: () => void;
}

interface InboundItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  expiryDate?: string;
}

export function InboundForm({ items, suppliers, itemToAdd, onItemAdded }: InboundFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [inboundItems, setInboundItems] = useState<InboundItem[]>([]);

  // Filter items (Only Raw and Semi-finished usually, but sometimes Finished)
  // Let's allow all.
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddItem = (item: Item) => {
    if (inboundItems.some((i) => i.itemId === item.id)) {
      toast.error("이미 추가된 품목입니다.");
      return;
    }
    setInboundItems([
      ...inboundItems,
      {
        itemId: item.id,
        name: item.name,
        quantity: 0,
        unitPrice: item.latest_purchase_price || 0,
        unit: item.base_unit,
      },
    ]);
  };

  // Handle Quick Action from parent
  useEffect(() => {
    if (itemToAdd) {
      setInboundItems((prev) => {
        if (prev.some((i) => i.itemId === itemToAdd.id)) {
          toast.info("이미 입고 리스트에 있는 품목입니다.");
          return prev;
        }
        toast.info(`${itemToAdd.name}이(가) 입고 리스트에 추가되었습니다.`);
        return [
          ...prev,
          {
            itemId: itemToAdd.id,
            name: itemToAdd.name,
            quantity: 0,
            unitPrice: itemToAdd.latest_purchase_price || 0,
            unit: itemToAdd.base_unit,
          },
        ];
      });
      setOpen(true);
      onItemAdded?.();
    }
  }, [itemToAdd, onItemAdded]);

  const handleRemoveItem = (index: number) => {
    const newItems = [...inboundItems];
    newItems.splice(index, 1);
    setInboundItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof InboundItem, value: any) => {
    const newItems = [...inboundItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setInboundItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inboundItems.length === 0) {
      toast.error("입고할 품목을 선택해주세요.");
      return;
    }

    setLoading(true);
    try {
      const result = await processInbound(
        selectedSupplier || null,
        inboundItems.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          expiryDate: i.expiryDate,
        }))
      );

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("입고 처리가 완료되었습니다.");
      setOpen(false);
      setInboundItems([]);
      setSelectedSupplier("");
      if (onItemAdded) onItemAdded();
      router.refresh();
    } catch (error) {
      toast.error("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Truck className="mr-2 h-4 w-4" />
          입고 등록 (Quick Receive)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader>
            <DialogTitle>입고 등록</DialogTitle>
            <DialogDescription>
              거래처로부터 입고된 물품을 등록합니다. 재고가 즉시 증가합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex gap-4 py-4 min-h-0">
            {/* Left: Item Search */}
            <div className="w-1/3 border-r pr-4 flex flex-col gap-2">
              <Label>품목 검색</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="품목명/코드"
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <ScrollArea className="flex-1 border rounded-md p-2">
                <div className="space-y-1">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted flex justify-between items-center"
                      onClick={() => handleAddItem(item)}
                    >
                      <span>{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.base_unit}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Right: Inbound List */}
            <div className="w-2/3 flex flex-col gap-4">
              <div className="space-y-2">
                <Label>거래처 (선택)</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="거래처 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 border rounded-md p-2 overflow-auto">
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
                    <div className="col-span-3">품목명</div>
                    <div className="col-span-2">수량</div>
                    <div className="col-span-1">단위</div>
                    <div className="col-span-3">단가 (원)</div>
                    <div className="col-span-2">합계</div>
                    <div className="col-span-1"></div>
                  </div>
                  {inboundItems.map((item, index) => (
                    <div key={item.itemId} className="grid grid-cols-12 gap-2 items-center px-2 py-1 border-b last:border-0">
                      <div className="col-span-3 text-sm font-medium truncate">{item.name}</div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          className="h-8"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                        />
                      </div>
                      <div className="col-span-1 text-sm text-muted-foreground">{item.unit}</div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          min="0"
                          className="h-8"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, "unitPrice", Number(e.target.value))}
                        />
                      </div>
                      <div className="col-span-2 text-sm text-right">
                        {(item.quantity * item.unitPrice).toLocaleString()}
                      </div>
                      <div className="col-span-1 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {inboundItems.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      왼쪽에서 입고할 품목을 선택하세요.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 border-t pt-2">
                <div className="text-sm">총 입고 금액</div>
                <div className="text-xl font-bold">
                  {inboundItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0).toLocaleString()}원
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "처리 중..." : "입고 확정"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}