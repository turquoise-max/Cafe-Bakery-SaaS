"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InventoryDashboardItem, updatePhysicalCount } from "@/app/dashboard/inventory/actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface InventoryCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryDashboardItem | null;
}

export function InventoryCountModal({ isOpen, onClose, item }: InventoryCountModalProps) {
  const [countedQty, setCountedQty] = useState<string>("");
  const [reason, setReason] = useState<string>("adjustment");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item && isOpen) {
      setCountedQty(item.theoretical_quantity.toString());
      setReason("adjustment");
      setNotes("");
    }
  }, [item, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    const qty = parseFloat(countedQty);
    if (isNaN(qty)) {
      toast.error("유효한 수량을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updatePhysicalCount(item.item_id, qty, reason, notes);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("재고 실사가 반영되었습니다.");
        onClose();
      }
    } catch (error) {
      console.error(error);
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQty = item?.theoretical_quantity || 0;
  const newQty = parseFloat(countedQty) || 0;
  const variance = newQty - currentQty;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>재고 실사 / 조정</DialogTitle>
          <DialogDescription>
            {item?.item.name}의 실제 재고 수량을 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>현재 전산 재고</Label>
              <div className="p-2 border rounded-md bg-muted text-right font-mono">
                {currentQty.toLocaleString()} {item?.item.base_unit}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="countedQty">실사 수량</Label>
              <Input
                id="countedQty"
                type="number"
                step="0.001"
                value={countedQty}
                onChange={(e) => setCountedQty(e.target.value)}
                className="text-right font-mono"
                required
              />
            </div>
          </div>

          <div className="p-3 rounded-md bg-slate-50 border flex justify-between items-center">
            <span className="text-sm font-medium">차이 (Variance)</span>
            <span className={`font-mono font-bold ${variance < 0 ? 'text-red-600' : variance > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
              {variance > 0 ? "+" : ""}{variance.toLocaleString()} {item?.item.base_unit}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">조정 사유</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="사유 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adjustment">정기 실사 조정</SelectItem>
                <SelectItem value="waste">폐기 / 손실</SelectItem>
                <SelectItem value="theft">도난 / 분실</SelectItem>
                <SelectItem value="damage">파손</SelectItem>
                <SelectItem value="correction">입력 오류 수정</SelectItem>
                <SelectItem value="other">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">메모 (선택)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="특이사항을 입력하세요"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              조정사항 반영
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}