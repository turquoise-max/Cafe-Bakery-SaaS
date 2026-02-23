"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Trash, UserCog } from "lucide-react";
import { InviteStaffModal } from "@/components/staff/invite-staff-modal";
import { updateStaffRole, removeStaff, cancelInvitation } from "@/app/dashboard/staff/actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StaffListProps {
  initialStaffList: any[];
  initialInvitations?: any[];
  currentUserRole: string;
}

export function StaffList({ 
  initialStaffList, 
  initialInvitations = [], 
  currentUserRole 
}: StaffListProps) {
  const [staffList, setStaffList] = useState(initialStaffList);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // 역할 뱃지 색상
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <Badge className="bg-purple-500">소유자</Badge>;
      case "manager":
        return <Badge className="bg-blue-500">매니저</Badge>;
      case "staff":
        return <Badge variant="secondary">스태프</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const handleUpdateRole = async (staffId: string, newRole: string) => {
    try {
      const result = await updateStaffRole(staffId, newRole);
      if (result.success) {
        toast.success("권한이 수정되었습니다.");
        // 목록 업데이트 (낙관적 업데이트 또는 다시 불러오기 등)
        // 여기서는 페이지 리로드가 발생하므로 상태 업데이트는 생략 가능하나,
        // 부드러운 UX를 위해 상태도 업데이트 가능
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("권한 수정 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;

    try {
      const result = await removeStaff(selectedStaff.id);
      if (result.success) {
        toast.success("직원이 삭제되었습니다.");
        setShowDeleteDialog(false);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("직원 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm("정말 초대를 취소하시겠습니까?")) return;

    try {
      const result = await cancelInvitation(invitationId);
      if (result.success) {
        toast.success("초대가 취소되었습니다.");
        setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("초대 취소 중 오류가 발생했습니다.");
    }
  };

  const isOwner = currentUserRole === "owner";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">직원 및 초대 관리</h2>
        {(isOwner || currentUserRole === "manager") && <InviteStaffModal />}
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="active">활동 중인 직원 ({staffList.length})</TabsTrigger>
          <TabsTrigger value="invited">초대 중 ({invitations.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-4">
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>소속 매장</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      등록된 직원이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  staffList.map((staffGroup) => (
                    <TableRow key={staffGroup.user.id}>
                      <TableCell className="font-medium">{staffGroup.user?.name || "이름 없음"}</TableCell>
                      <TableCell>{staffGroup.user?.email}</TableCell>
                      <TableCell>
                        {/* 역할이 모두 동일하면 하나만 표시, 아니면 각각 표시 */}
                        {(() => {
                          const distinctRoles = Array.from(new Set(staffGroup.roles.map((r: any) => r.role)));
                          if (distinctRoles.length === 1) {
                            return getRoleBadge(distinctRoles[0] as string);
                          }
                          return (
                            <div className="flex flex-col gap-1">
                              {staffGroup.roles.map((role: any) => (
                                <div key={role.id} className="flex items-center gap-2">
                                  {getRoleBadge(role.role)}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {staffGroup.roles.map((role: any) => (
                            <div key={role.id}>
                              {role.store ? (
                                <Badge variant="outline">{role.store.name}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">전체 매장</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* 오너만 다른 직원의 권한 수정/삭제 가능. 본인은 제외 */}
                        {/* 첫 번째 역할을 기준으로 드롭다운 표시 (개선 필요: 역할별 관리) */}
                        {isOwner && staffGroup.roles[0].role !== "owner" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">메뉴 열기</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>관리 (대표 권한)</DropdownMenuLabel>
                              {/* 현재는 첫 번째 역할에 대해서만 동작하도록 임시 처리 */}
                              <DropdownMenuItem onClick={() => handleUpdateRole(staffGroup.roles[0].id, "manager")}>
                                <UserCog className="mr-2 h-4 w-4" /> 매니저로 변경
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateRole(staffGroup.roles[0].id, "staff")}>
                                <UserCog className="mr-2 h-4 w-4" /> 스태프로 변경
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => {
                                  setSelectedStaff({ id: staffGroup.roles[0].id, user: staffGroup.user });
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash className="mr-2 h-4 w-4" /> 직원 삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="invited" className="mt-4">
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이메일</TableHead>
                  <TableHead>초대된 역할</TableHead>
                  <TableHead>초대된 매장</TableHead>
                  <TableHead>초대 일시</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      대기 중인 초대가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                      <TableCell>
                        {invitation.store ? (
                          <Badge variant="outline">{invitation.store.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">전체 매장</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invitation.created_at), "yyyy-MM-dd HH:mm", {
                          locale: ko,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {(isOwner || currentUserRole === "manager") && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelInvitation(invitation.id)}
                          >
                            초대 취소
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStaff?.user?.name}님을 직원 목록에서 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStaff} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}