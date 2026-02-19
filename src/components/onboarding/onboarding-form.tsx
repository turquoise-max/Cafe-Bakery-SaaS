'use client'

import { useActionState } from 'react'
import { createOrganizationAndStore, State } from '@/app/onboarding/actions'

const initialState: State = {
  message: null,
  errors: {},
}

export default function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(createOrganizationAndStore, initialState)

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          서비스 시작하기
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          서비스 이용을 위해 조직과 첫 번째 매장을 생성해주세요.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" action={formAction}>
          <div>
            <label htmlFor="orgName" className="block text-sm font-medium leading-6 text-gray-900">
              조직명 (회사/브랜드명)
            </label>
            <div className="mt-2">
              <input
                id="orgName"
                name="orgName"
                type="text"
                required
                placeholder="예: BSM 베이커리"
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                aria-describedby="orgName-error"
              />
            </div>
            {state.errors?.orgName && (
              <p id="orgName-error" className="mt-2 text-sm text-red-600">
                {state.errors.orgName.join(', ')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="storeName" className="block text-sm font-medium leading-6 text-gray-900">
              첫 번째 매장명
            </label>
            <div className="mt-2">
              <input
                id="storeName"
                name="storeName"
                type="text"
                required
                placeholder="예: 본점"
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                aria-describedby="storeName-error"
              />
            </div>
            {state.errors?.storeName && (
              <p id="storeName-error" className="mt-2 text-sm text-red-600">
                {state.errors.storeName.join(', ')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="storeType" className="block text-sm font-medium leading-6 text-gray-900">
              매장 유형
            </label>
            <div className="mt-2">
              <select
                id="storeType"
                name="storeType"
                required
                defaultValue="bakery_cafe"
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                aria-describedby="storeType-error"
              >
                <option value="bakery_cafe">베이커리 카페 (빵 + 음료)</option>
                <option value="cafe">카페 (음료 위주)</option>
                <option value="bakery">베이커리 (빵 위주)</option>
                <option value="restaurant">일반 식당</option>
                <option value="other">기타</option>
              </select>
            </div>
            {state.errors?.storeType && (
              <p id="storeType-error" className="mt-2 text-sm text-red-600">
                {state.errors.storeType.join(', ')}
              </p>
            )}
          </div>

          <div className="relative flex items-start">
            <div className="flex h-6 items-center">
              <input
                id="includeSampleData"
                name="includeSampleData"
                type="checkbox"
                defaultChecked={true}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
            </div>
            <div className="ml-3 text-sm leading-6">
              <label htmlFor="includeSampleData" className="font-medium text-gray-900">
                샘플 데이터 포함하기
              </label>
              <p className="text-gray-500">서비스 체험을 위해 가상의 제품, 레시피, 재고 데이터를 함께 생성합니다.</p>
            </div>
          </div>

          {state.message && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="text-sm text-red-700">{state.message}</div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-400"
            >
              {isPending ? '생성 중...' : '시작하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}