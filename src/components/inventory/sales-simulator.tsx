'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash, ShoppingCart, Loader2 } from 'lucide-react'
import { toast } from "sonner"
import { getSaleItems, recordSale } from '@/app/dashboard/inventory/sales-actions'
import { getUserStore } from '@/app/dashboard/actions'

interface SaleItem {
  itemId: string
  quantity: number
}

export function SalesSimulator() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [cart, setCart] = useState<SaleItem[]>([{ itemId: '', quantity: 1 }])
  const [loading, setLoading] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)

  // Load items when dialog opens
  useEffect(() => {
    if (open) {
      async function loadData() {
        try {
          const [saleItems, store] = await Promise.all([
            getSaleItems(),
            getUserStore()
          ])
          setItems(saleItems)
          setStoreId(store?.id ?? null)
        } catch (error) {
          console.error('Error loading sales data:', error)
          toast.error("데이터 로딩 실패", {
            description: "판매 가능한 상품 목록을 불러오지 못했습니다.",
          })
        }
      }
      loadData()
    }
  }, [open])

  const addItem = () => {
    setCart([...cart, { itemId: '', quantity: 1 }])
  }

  const removeItem = (index: number) => {
    const newCart = [...cart]
    newCart.splice(index, 1)
    setCart(newCart)
  }

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const newCart = [...cart]
    if (field === 'quantity') {
      newCart[index].quantity = Number(value)
    } else {
      newCart[index].itemId = value
    }
    setCart(newCart)
  }

  const handleSale = async () => {
    if (!storeId) {
      toast.error("매장 정보 없음", {
        description: "매장 정보를 불러오지 못했습니다. 다시 시도해주세요.",
      })
      return
    }

    // Validation
    const invalidItems = cart.filter(item => !item.itemId || item.quantity <= 0)
    if (invalidItems.length > 0) {
      toast.error("입력 오류", {
        description: "모든 항목의 상품을 선택하고 수량을 입력해주세요.",
      })
      return
    }

    setLoading(true)
    try {
      const result = await recordSale(storeId, cart)
      if (result.success) {
        toast.success("판매 완료", {
          description: "판매가 기록되고 재고가 차감되었습니다.",
        })
        setCart([{ itemId: '', quantity: 1 }]) // Reset cart
        setOpen(false)
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      toast.error("오류 발생", {
        description: error.message || "판매 기록 중 오류가 발생했습니다.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          판매 시뮬레이터 (POS)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>판매 시뮬레이터</DialogTitle>
          <DialogDescription>
            판매를 기록하여 실시간 재고 차감 기능을 테스트합니다. (완제품만 선택 가능)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              판매 가능한 완제품이 없습니다. 상품 관리에서 완제품을 등록해주세요.
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Select
                    value={item.itemId}
                    onValueChange={(value) => updateItem(index, 'itemId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="상품 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({i.sale_price?.toLocaleString()}원)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-2">
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    placeholder="수량"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  disabled={cart.length === 1}
                >
                  <Trash className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))
          )}

          <Button variant="outline" onClick={addItem} type="button" className="w-full border-dashed" disabled={items.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            상품 추가
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSale} disabled={loading || items.length === 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            결제 및 재고 차감
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}