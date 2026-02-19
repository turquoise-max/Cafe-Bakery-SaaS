'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Search, Save, ArrowLeft } from 'lucide-react';
import { UnitType, Item } from '@/types/inventory';
import { createRecipe, calculateRecipeCost } from '@/app/dashboard/recipes/actions';
import { toast } from 'sonner';

interface RecipeBuilderProps {
  initialData?: any;
  items: Item[]; // 원자재 및 반제품 목록
  mode: 'create' | 'edit';
}

interface RecipeItem {
  input_item_id: string;
  quantity: number;
  unit: UnitType;
  input_item?: Item;
}

export function RecipeBuilder({ initialData, items, mode }: RecipeBuilderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // 기본 정보 상태
  const [name, setName] = useState(initialData?.name || '');
  const [outputItemId, setOutputItemId] = useState(initialData?.output_item_id || '');
  const [outputQuantity, setOutputQuantity] = useState(initialData?.output_quantity || 1);
  const [description, setDescription] = useState(initialData?.description || '');
  
  // 레시피 재료 목록 상태
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>(
    initialData?.recipe_items || []
  );
  const [estimatedCost, setEstimatedCost] = useState(0);

  // 재료 검색어 상태
  const [searchTerm, setSearchTerm] = useState('');

  // 완제품(finished) 및 반제품(semi_finished) 목록 필터링 (레시피 대상 품목)
  const outputCandidates = items.filter(
    (item) => item.type === 'finished' || item.type === 'semi_finished'
  );

  // 재료(raw) 및 반제품(semi_finished) 목록 필터링 (레시피 재료)
  // 자기 자신을 재료로 쓸 수는 없으므로 outputItemId가 선택되었다면 제외해야 함
  const ingredientCandidates = items.filter(
    (item) => 
      (item.type === 'raw' || item.type === 'semi_finished') && 
      item.id !== outputItemId
  ).filter((item) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddItem = (item: Item) => {
    // 이미 추가된 재료인지 확인
    if (recipeItems.some((ri) => ri.input_item_id === item.id)) {
      toast.error('이미 추가된 재료입니다.');
      return;
    }

    setRecipeItems([
      ...recipeItems,
      {
        input_item_id: item.id,
        quantity: 0,
        unit: item.base_unit,
        input_item: item,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...recipeItems];
    newItems.splice(index, 1);
    setRecipeItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof RecipeItem, value: any) => {
    const newItems = [...recipeItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setRecipeItems(newItems);
  };

  // Calculate cost when items change
  useEffect(() => {
    const calculate = async () => {
      if (recipeItems.length === 0) {
        setEstimatedCost(0);
        return;
      }
      
      const itemsForCalc = recipeItems.map(item => ({
        inputItemId: item.input_item_id,
        quantity: Number(item.quantity),
        unit: item.unit
      }));

      // In a real app, you might want to debounce this
      const cost = await calculateRecipeCost(itemsForCalc);
      setEstimatedCost(cost);
    };

    calculate();
  }, [recipeItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!outputItemId) {
      toast.error('생산할 품목을 선택해주세요.');
      return;
    }

    if (recipeItems.length === 0) {
      toast.error('최소 1개 이상의 재료를 추가해주세요.');
      return;
    }

    // 유효성 검사: 수량이 0 이하인 재료 확인
    const invalidItems = recipeItems.filter(item => item.quantity <= 0);
    if (invalidItems.length > 0) {
      toast.error('모든 재료의 수량은 0보다 커야 합니다.');
      return;
    }

    setLoading(true);

    try {
      const recipeData = {
        outputItemId,
        outputQuantity: Number(outputQuantity),
        name: name || `${outputCandidates.find(i => i.id === outputItemId)?.name} 레시피`,
        description,
        items: recipeItems.map(item => ({
          inputItemId: item.input_item_id,
          quantity: Number(item.quantity),
          unit: item.unit
        }))
      };

      if (mode === 'create') {
        const result = await createRecipe(recipeData);
        if (result.error) throw new Error(result.error);
        toast.success('레시피가 생성되었습니다.');
      } else {
        // update 로직은 아직 구현되지 않았지만 구조는 비슷함
        // const result = await updateRecipe(initialData.id, recipeData);
        // if (result.error) throw new Error(result.error);
        // toast.success('레시피가 수정되었습니다.');
        toast.info('수정 기능은 준비 중입니다.');
      }

      router.push('/dashboard/recipes');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || '레시피 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === 'create' ? '새 레시피 생성' : '레시피 수정'}
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 왼쪽: 레시피 기본 정보 및 재료 목록 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="outputItem">생산 품목 (완제품/반제품)</Label>
                <Select 
                  value={outputItemId} 
                  onValueChange={setOutputItemId}
                  disabled={mode === 'edit'} // 수정 시에는 품목 변경 불가
                >
                  <SelectTrigger>
                    <SelectValue placeholder="품목 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {outputCandidates.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.code || 'No Code'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="outputQuantity">생산 수량</Label>
                  <Input
                    id="outputQuantity"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={outputQuantity}
                    onChange={(e) => setOutputQuantity(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>단위</Label>
                  <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background text-muted-foreground">
                    {outputItemId 
                      ? items.find(i => i.id === outputItemId)?.base_unit 
                      : '-'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">레시피 명 (선택)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 크로와상 기본 레시피"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">설명 / 메모 (선택)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="조리법이나 특이사항을 입력하세요."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex flex-col">
                <CardTitle>재료 목록 (BOM)</CardTitle>
                <span className="text-sm text-muted-foreground mt-1">
                  총 {recipeItems.length}개 재료
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">예상 원가</div>
                <div className="text-xl font-bold text-primary">
                  {estimatedCost.toLocaleString()}원
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {recipeItems.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  <p>우측에서 재료를 선택하여 추가하세요.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recipeItems.map((item, index) => (
                    <div key={`${item.input_item_id}-${index}`} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className="flex-1 space-y-1">
                        <p className="font-medium leading-none">
                          {item.input_item?.name || items.find(i => i.id === item.input_item_id)?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.input_item?.code || items.find(i => i.id === item.input_item_id)?.code}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-20"
                          min="0.001"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                        />
                        <Select
                          value={item.unit}
                          onValueChange={(value) => handleItemChange(index, 'unit', value)}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="ml">ml</SelectItem>
                            <SelectItem value="l">l</SelectItem>
                            <SelectItem value="ea">ea</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive/90"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              <Save className="mr-2 h-4 w-4" />
              저장하기
            </Button>
          </div>
        </form>

        {/* 오른쪽: 재료 검색 및 추가 패널 */}
        <div className="space-y-6">
          <Card className="h-full max-h-[calc(100vh-10rem)] overflow-hidden flex flex-col">
            <CardHeader>
              <CardTitle>재료 검색</CardTitle>
              <div className="relative pt-2">
                <Search className="absolute left-2 top-4.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="재료명 또는 코드 검색..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="space-y-2">
                {ingredientCandidates.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    검색 결과가 없습니다.
                  </p>
                ) : (
                  ingredientCandidates.map((item) => {
                    const isAdded = recipeItems.some(ri => ri.input_item_id === item.id);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                          isAdded ? 'bg-muted opacity-50' : 'hover:bg-accent cursor-pointer'
                        }`}
                        onClick={() => !isAdded && handleAddItem(item)}
                      >
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded bg-secondary px-1 py-0.5">
                              {item.type === 'raw' ? '원자재' : '반제품'}
                            </span>
                            <span>{item.code}</span>
                            <span>•</span>
                            <span>기준단위: {item.base_unit}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isAdded}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}