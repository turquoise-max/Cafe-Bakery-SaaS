"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Box,
  Package, // Import Package
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  Store,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const sidebarItems = [
  {
    title: "대시보드",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "품목 관리",
    href: "/dashboard/items",
    icon: Package,
  },
  {
    title: "재고 현황", // Renaming '재고 관리' to '재고 현황' to distinguish from Item Master
    href: "/dashboard/inventory",
    icon: Box, // Keep Box for Inventory Status
  },
  {
    title: "레시피 관리",
    href: "/dashboard/recipes",
    icon: BookOpen,
  },
  {
    title: "매출 분석",
    href: "/dashboard/sales",
    icon: BarChart3,
  },
  {
    title: "마이페이지",
    href: "/dashboard/mypage",
    icon: User,
  },
  {
    title: "설정",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userInfo, setUserInfo] = useState<{
    email?: string;
    role?: string;
    storeName?: string;
    orgName?: string;
  } | null>(null);

  useEffect(() => {
    async function fetchUserInfo() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role, stores(name), organizations(name)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      const roleData = userRole as any;

      setUserInfo({
        email: user.email,
        role: roleData?.role,
        storeName: Array.isArray(roleData?.stores) ? roleData.stores[0]?.name : roleData?.stores?.name,
        orgName: Array.isArray(roleData?.organizations) ? roleData.organizations[0]?.name : roleData?.organizations?.name,
      });
    }
    fetchUserInfo();
  }, [supabase]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("로그아웃 중 오류가 발생했습니다.");
    } else {
      toast.success("로그아웃되었습니다.");
      router.push("/login");
    }
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/40">
      <div className="flex h-14 items-center border-b px-6 lg:h-[60px]">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Store className="h-6 w-6" />
          <span className="">Cafe & Bakery</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-4 text-sm font-medium">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                  isActive
                    ? "bg-muted text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t space-y-4">
        {userInfo && (
          <Link href="/dashboard/mypage">
            <div className="rounded-lg bg-muted p-3 text-sm hover:bg-muted/80 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-2 font-semibold">
                <User className="h-4 w-4" />
                <span>계정 정보</span>
              </div>
              <div className="space-y-1 text-muted-foreground text-xs">
                <p className="truncate" title={userInfo.email}>{userInfo.email}</p>
                <p>조직: {userInfo.orgName || "미설정"}</p>
                <p>매장: {userInfo.storeName || "미설정"}</p>
                <p>역할: {userInfo.role || "없음"}</p>
              </div>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-primary"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </div>
  );
}