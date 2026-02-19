"use client";

import { useRef, useState } from "react";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChannelPieChart,
  DailySalesChart,
  MonthlyTrendChart,
  WeeklyComparisonChart,
} from "@/components/sales/charts";

// 더미 데이터 생성
const generateDailyData = () => {
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${i.toString().padStart(2, "0")}:00`,
    amount: Math.floor(Math.random() * 50000),
  }));
};

const generateChannelData = () => [
  { name: "POS", value: 400000 },
  { name: "배달의민족", value: 300000 },
  { name: "쿠팡이츠", value: 200000 },
  { name: "요기요", value: 100000 },
];

const generateWeeklyData = () => {
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  return days.map((day) => ({
    day,
    lastWeek: Math.floor(Math.random() * 500000),
    thisWeek: Math.floor(Math.random() * 500000),
  }));
};

const generateMonthlyData = () => {
  return Array.from({ length: 30 }, (_, i) => ({
    date: `${i + 1}일`,
    amount: Math.floor(Math.random() * 1000000),
  }));
};

export default function SalesPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("daily");

  const handleDownload = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current);
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `sales-report-${activeTab}-${format(
        new Date(),
        "yyyyMMdd"
      )}.png`;
      link.click();
    } catch (error) {
      console.error("이미지 저장 실패:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">매출 리포트</h3>
          <p className="text-sm text-muted-foreground">
            기간별 매출 현황을 분석하고 리포트를 다운로드하세요.
          </p>
        </div>
        <Button onClick={handleDownload} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          이미지로 저장
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">일별 리포트</TabsTrigger>
          <TabsTrigger value="weekly">주별 리포트</TabsTrigger>
          <TabsTrigger value="monthly">월별 리포트</TabsTrigger>
        </TabsList>

        <div ref={reportRef} className="bg-background p-4 rounded-lg border">
          <TabsContent value="daily" className="space-y-4 mt-0">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>시간대별 매출 추이</CardTitle>
                  <CardDescription>
                    오늘 하루 시간대별 매출 변화입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <DailySalesChart data={generateDailyData()} />
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>채널별 매출 비중</CardTitle>
                  <CardDescription>
                    판매 채널별 매출 기여도입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChannelPieChart data={generateChannelData()} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4 mt-0">
            <Card>
              <CardHeader>
                <CardTitle>주간 매출 비교</CardTitle>
                <CardDescription>
                  지난주와 이번주의 요일별 매출을 비교합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <WeeklyComparisonChart data={generateWeeklyData()} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4 mt-0">
            <Card>
              <CardHeader>
                <CardTitle>월간 매출 추이</CardTitle>
                <CardDescription>
                  이번 달 일별 매출 변화 추세입니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <MonthlyTrendChart data={generateMonthlyData()} />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}