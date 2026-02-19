"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createOrganizationAndStore } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Coffee, Croissant, Utensils, Plus, Trash2, Store, Users, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Zod Schema
const onboardingSchema = z.object({
  storeName: z.string().min(1, "매장명을 입력해주세요."),
  isMultiStore: z.boolean(),
  orgName: z.string().min(1, "조직명을 입력해주세요."),
  additionalStores: z.array(
    z.object({ name: z.string().min(1, "매장명을 입력해주세요.") })
  ),
  industryType: z.enum([
    "bakery_cafe",
    "cafe",
    "bakery",
    "restaurant",
    "other",
  ]),
  invitations: z.array(
    z.object({
      email: z.string().email("올바른 이메일 형식이 아닙니다."),
      role: z.enum(["manager", "staff"]),
    })
  ),
  includeSampleData: z.boolean(),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const STEPS = [
  { id: 1, title: "매장 정보" },
  { id: 2, title: "조직 설정" }, // Conditional
  { id: 3, title: "업종 선택" },
  { id: 4, title: "팀원 초대" },
  { id: 5, title: "완료" },
];

export default function OnboardingForm() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      storeName: "",
      isMultiStore: false,
      orgName: "",
      additionalStores: [],
      industryType: "bakery_cafe",
      invitations: [],
      includeSampleData: true,
    },
    mode: "onChange",
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isValid },
  } = form;

  const isMultiStore = watch("isMultiStore");
  const storeName = watch("storeName");

  // Step 1 -> 2: Mirroring logic
  useEffect(() => {
    if (!isMultiStore && storeName) {
      setValue("orgName", storeName);
    }
  }, [storeName, isMultiStore, setValue]);

  // Field Arrays
  const {
    fields: storeFields,
    append: appendStore,
    remove: removeStore,
  } = useFieldArray({
    control,
    name: "additionalStores",
  });

  const {
    fields: inviteFields,
    append: appendInvite,
    remove: removeInvite,
  } = useFieldArray({
    control,
    name: "invitations",
  });

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ["storeName"];
    if (step === 2) fieldsToValidate = ["orgName", "additionalStores"];
    if (step === 3) fieldsToValidate = ["industryType"];
    if (step === 4) fieldsToValidate = ["invitations"];

    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      if (step === 1 && !isMultiStore) {
        setStep(3); // Skip Step 2
      } else {
        setStep((prev) => prev + 1);
      }
    }
  };

  const prevStep = () => {
    if (step === 3 && !isMultiStore) {
      setStep(1); // Back to Step 1
    } else {
      setStep((prev) => prev - 1);
    }
  };

  const onSubmit = async (data: OnboardingFormValues) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("orgName", data.orgName);
      formData.append("storeName", data.storeName);
      formData.append("storeType", data.industryType);
      formData.append("includeSampleData", String(data.includeSampleData));
      
      // JSON data for complex structures
      formData.append("additionalStores", JSON.stringify(data.additionalStores));
      formData.append("invitations", JSON.stringify(data.invitations));

      const result = await createOrganizationAndStore({}, formData);
      
      if (result.errors) {
        // Handle server-side validation errors if any
        console.error(result.errors);
        toast.error("오류가 발생했습니다. 입력을 확인해주세요.");
      } else if (result.message) {
         toast.error(result.message);
      }
      
      // Redirect is handled in server action, but if it fails/returns:
    } catch (error) {
      console.error(error);
      toast.error("알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Steps
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="storeName" className="text-lg">매장 이름이 무엇인가요?</Label>
        <Input
          id="storeName"
          {...form.register("storeName")}
          placeholder="예: 성수동 베이커리"
          className="text-lg py-6"
        />
        {errors.storeName && (
          <p className="text-sm text-red-500">{errors.storeName.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
        <div className="space-y-0.5">
          <Label className="text-base">여러 개의 매장을 관리하시나요?</Label>
          <p className="text-sm text-gray-500">
            본사/지점 구조로 관리하려면 켜주세요.
          </p>
        </div>
        <Switch
          checked={isMultiStore}
          onCheckedChange={(checked) => setValue("isMultiStore", checked)}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="orgName" className="text-lg">브랜드(조직) 이름</Label>
        <Input
          id="orgName"
          {...form.register("orgName")}
          placeholder="예: BSM F&B"
          className="text-lg py-6"
        />
        {errors.orgName && (
          <p className="text-sm text-red-500">{errors.orgName.message}</p>
        )}
      </div>

      <div className="space-y-4">
        <Label className="text-lg">추가 매장</Label>
        {storeFields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input
              {...form.register(`additionalStores.${index}.name` as const)}
              placeholder="추가 매장명 (예: 강남점)"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => removeStore(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => appendStore({ name: "" })}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" /> 매장 추가
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <Label className="text-lg">어떤 업종인가요?</Label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { id: "bakery_cafe", label: "베이커리 카페", icon: Croissant },
          { id: "cafe", label: "카페", icon: Coffee },
          { id: "restaurant", label: "식당/기타", icon: Utensils },
        ].map((type) => (
          <div
            key={type.id}
            className={cn(
              "cursor-pointer border-2 rounded-xl p-6 flex flex-col items-center gap-4 transition-all hover:border-indigo-600",
              watch("industryType") === type.id
                ? "border-indigo-600 bg-indigo-50"
                : "border-gray-200 bg-white"
            )}
            onClick={() => setValue("industryType", type.id as any)}
          >
            <type.icon
              className={cn(
                "h-10 w-10",
                watch("industryType") === type.id
                  ? "text-indigo-600"
                  : "text-gray-400"
              )}
            />
            <span
              className={cn(
                "font-medium",
                watch("industryType") === type.id
                  ? "text-indigo-900"
                  : "text-gray-600"
              )}
            >
              {type.label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-500 text-center bg-gray-50 p-3 rounded-lg">
        ℹ️ 선택하신 업종에 맞춰 기본 재료 카테고리가 자동으로 설정됩니다.
      </p>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="space-y-1">
        <Label className="text-lg">함께 일할 팀원 초대</Label>
        <p className="text-sm text-gray-500">
          팀원의 이메일을 입력하면 가입 시 자동으로 매장에 연결됩니다.
        </p>
      </div>

      <div className="space-y-3">
        {inviteFields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-start">
            <div className="grid grid-cols-3 gap-2 flex-1">
              <div className="col-span-2">
                <Input
                  {...form.register(`invitations.${index}.email` as const)}
                  placeholder="이메일 주소"
                />
                {errors.invitations?.[index]?.email && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.invitations[index]?.email?.message}
                  </p>
                )}
              </div>
              <Select
                onValueChange={(value) =>
                  setValue(`invitations.${index}.role`, value as "manager" | "staff")
                }
                defaultValue={field.role}
              >
                <SelectTrigger>
                  <SelectValue placeholder="역할" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">매니저 (운영)</SelectItem>
                  <SelectItem value="staff">스태프 (실사)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeInvite(index)}
            >
              <Trash2 className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => appendInvite({ email: "", role: "staff" })}
          className="w-full border-dashed"
        >
          <Plus className="h-4 w-4 mr-2" /> 팀원 추가하기
        </Button>
      </div>
    </div>
  );

  const renderStep5 = () => {
    const values = form.getValues();
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">설정 완료!</h3>
          <p className="text-gray-500">아래 정보로 매장을 생성하시겠습니까?</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-4">
            <Building className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">조직/브랜드</p>
              <p className="text-base font-medium text-gray-900">
                {values.orgName}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Store className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">매장</p>
              <p className="text-base font-medium text-gray-900">
                {values.storeName}
                {values.additionalStores.length > 0 &&
                  ` 외 ${values.additionalStores.length}개`}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Users className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">초대 인원</p>
              <p className="text-base font-medium text-gray-900">
                {values.invitations.length}명
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Stepper */}
        <div className="flex justify-between mb-8 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10 -translate-y-1/2" />
          {STEPS.filter(s => isMultiStore || s.id !== 2).map((s, i) => {
             // Adjust index for display if step 2 is skipped
             const displayStep = isMultiStore ? s.id : (s.id > 2 ? s.id - 1 : s.id);
             const totalSteps = isMultiStore ? 5 : 4;
             const isCompleted = step > s.id;
             const isCurrent = step === s.id;
             
             return (
              <div key={s.id} className="flex flex-col items-center bg-gray-50 px-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    isCompleted || isCurrent
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  )}
                >
                  {isMultiStore ? s.id : (s.id > 2 ? s.id - 1 : s.id)}
                </div>
                <span className={cn("text-xs mt-1 font-medium", isCurrent ? "text-indigo-600" : "text-gray-500")}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-center">
              {STEPS.find((s) => s.id === step)?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}

            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={prevStep}
                  disabled={isSubmitting}
                >
                  이전
                </Button>
              )}
              {step < 5 ? (
                <Button
                  type="button"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500"
                  onClick={nextStep}
                >
                  다음
                </Button>
              ) : (
                <Button
                  type="button"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "생성 중..." : "매장 관리 시작하기"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}