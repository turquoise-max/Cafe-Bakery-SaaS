import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "@/components/mypage/profile-form";
import { StoreList } from "@/components/mypage/store-list";
import { Separator } from "@/components/ui/separator";

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
  }

  if (!profile) {
    // Should not happen if auth user exists, but handle just in case
    // If user exists in auth but not in public.users, we might want to create it here or show a warning
    console.warn("User profile not found for ID:", user.id);
    // return <div>User profile not found.</div>;
  }

  // Fetch user's stores
  const { data: userRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select(`
      id,
      role,
      store:stores (
        name,
        code
      ),
      organization:organizations (
        name
      )
    `)
    .eq("user_id", user.id);

  if (rolesError) {
    console.error("Error fetching user roles:", rolesError);
  }

  // Transform data for StoreList component
  const stores = userRoles?.map((role: any) => ({
    id: role.id,
    role: role.role,
    store: role.store,
    organization: role.organization,
  })) || [];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">마이 페이지</h2>
      </div>
      <Separator />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>프로필 정보</CardTitle>
              <CardDescription>
                개인 정보를 확인하고 수정할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile ? (
                <ProfileForm user={profile} />
              ) : (
                <div className="text-red-500">
                  프로필 정보를 불러올 수 없습니다. 관리자에게 문의해주세요.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>내 매장 목록</CardTitle>
              <CardDescription>
                현재 소속된 매장과 역할을 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StoreList stores={stores} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}