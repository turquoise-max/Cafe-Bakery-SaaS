import { Metadata } from "next";

export const metadata: Metadata = {
  title: "매출 관리 | 카페 & 베이커리 SaaS",
  description: "매출 분석 및 리포트 관리",
};

export default function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">매출 관리</h2>
      </div>
      {children}
    </div>
  );
}