"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createItem, CreateItemInput } from "@/app/dashboard/items/actions";
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
import { Plus } from "lucide-react";
import { ItemType, UnitType } from "@/types/inventory";

export function ItemForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<CreateItemInput>({
    name: "",
    code: "",
    type: "raw",
    base_unit: "kg",
    safety_stock: 0,
  });

  const handleChange = (field: keyof CreateItemInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createItem(formData);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("품목이 등록되었습니다.");
      setOpen(false);
      setFormData({
        name: "",
        code: "",
        type: "raw",
        base_unit: "kg",
        safety_stock: 0,
      });
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
          <Plus className="mr-2 h-4 w-4" />
          신규 품목 등록
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>신규 품목 등록</DialogTitle>
            <DialogDescription>
              새로운 원자재, 반제품 또는 완제품을 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                품목명
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                코드 (SKU)
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleChange("code", e.target.value)}
                className="col-span-3"
                placeholder="자동 생성 가능"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                유형
              </Label>
              <Select
                value={formData.type}
                onValueChange={(val: ItemType) => handleChange("type", val)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw">원자재 (Raw)</SelectItem>
                  <SelectItem value="semi_finished">반제품 (Semi)</SelectItem>
                  <SelectItem value="finished">완제품 (Finished)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit" className="text-right">
                기본 단위
              </Label>
              <Select
                value={formData.base_unit}
                onValueChange={(val: UnitType) => handleChange("base_unit", val)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="단위 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg (킬로그램)</SelectItem>
                  <SelectItem value="g">g (그램)</SelectItem>
                  <SelectItem value="l">l (리터)</SelectItem>
                  <SelectItem value="ml">ml (밀리리터)</SelectItem>
                  <SelectItem value="ea">ea (개)</SelectItem>
                  <SelectItem value="box">box (박스)</SelectItem>
                  <SelectItem value="pack">pack (팩)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="safety_stock" className="text-right">
                안전재고
              </Label>
              <Input
                id="safety_stock"
                type="number"
                step="0.001"
                min="0"
                value={formData.safety_stock}
                onChange={(e) => handleChange("safety_stock", parseFloat(e.target.value))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}