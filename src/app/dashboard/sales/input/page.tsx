"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, UploadCloud } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import * as XLSX from "xlsx";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const manualSalesSchema = z.object({
  date: z.date({
    required_error: "날짜를 선택해주세요.",
  }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "올바른 시간 형식을 입력해주세요 (HH:MM)",
  }),
  channel: z.enum(["pos", "baemin", "coupang", "yogiyo", "manual"]),
  amount: z.coerce.number().min(0, "금액은 0원 이상이어야 합니다."),
  memo: z.string().optional(),
});

type ManualSalesFormValues = z.infer<typeof manualSalesSchema>;

export default function SalesInputPage() {
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();

  const form = useForm({
    resolver: zodResolver(manualSalesSchema),
    defaultValues: {
      date: new Date(),
      time: "12:00",
      channel: "manual" as const,
      amount: 0,
      memo: "",
    },
  });

  async function onManualSubmit(data: ManualSalesFormValues) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      // 현재 사용자의 매장 정보 가져오기
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("store_id")
        .eq("user_id", user.id)
        .single();

      if (!userRole?.store_id) {
        toast.error("매장 정보가 없습니다.");
        return;
      }

      const { error } = await supabase.from("sales").insert({
        store_id: userRole.store_id,
        sale_date: format(data.date, "yyyy-MM-dd"),
        sale_time: data.time,
        channel: data.channel,
        total_amount: data.amount,
        // order_number: `MANUAL-${Date.now()}`, // 수기 입력용 임시 주문번호 생성 로직 필요 시 추가
      });

      if (error) throw error;

      toast.success("매출이 등록되었습니다.");
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error("매출 등록 중 오류가 발생했습니다.");
    }
  }

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    channel: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        console.log("Uploaded Data:", jsonData);
        
        // TODO: 채널별 엑셀 파싱 로직 및 DB 저장 구현 필요
        // 현재는 데이터 확인용 로그만 출력
        
        toast.success(`${jsonData.length}건의 데이터가 로드되었습니다. (DB 저장 미구현)`);
      } catch (error) {
        console.error(error);
        toast.error("파일 처리 중 오류가 발생했습니다.");
      } finally {
        setIsUploading(false);
        // input 초기화 to allow same file upload again
        const fileInput = document.getElementById(
          `file-upload-${channel}`
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">매출 데이터 입력</h3>
        <p className="text-sm text-muted-foreground">
          채널별 매출 데이터를 엑셀로 업로드하거나 수기로 입력할 수 있습니다.
        </p>
      </div>

      <Tabs defaultValue="manual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manual">수기 입력</TabsTrigger>
          <TabsTrigger value="excel">엑셀 일괄 업로드</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>매출 수기 등록</CardTitle>
              <CardDescription>
                누락된 매출이나 기타 수입을 직접 입력합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onManualSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>날짜</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: ko })
                                  ) : (
                                    <span>날짜 선택</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() ||
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>시간</FormLabel>
                          <FormControl>
                            <Input placeholder="12:00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="channel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>판매 채널</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="채널 선택" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pos">POS (매장)</SelectItem>
                              <SelectItem value="baemin">배달의민족</SelectItem>
                              <SelectItem value="coupang">쿠팡이츠</SelectItem>
                              <SelectItem value="yogiyo">요기요</SelectItem>
                              <SelectItem value="manual">기타(수기)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>매출 금액</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value as number}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="memo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>메모 (선택)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="특이사항을 입력하세요"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit">등록하기</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="excel">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { id: "pos", label: "POS 매출", desc: "영수증별 상세 내역" },
              {
                id: "baemin",
                label: "배달의민족",
                desc: "주문 내역 엑셀 파일",
              },
              {
                id: "coupang",
                label: "쿠팡이츠",
                desc: "정산 내역 엑셀 파일",
              },
            ].map((channel) => (
              <Card key={channel.id}>
                <CardHeader>
                  <CardTitle>{channel.label}</CardTitle>
                  <CardDescription>{channel.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Input
                      id={`file-upload-${channel.id}`}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={(e) => handleFileUpload(e, channel.id)}
                      disabled={isUploading}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      지원 형식: .xlsx, .xls, .csv
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}