# Multi-tenancy DB 스키마 설계

## 1. 아키텍처 선택: Shared Database, Separate Schema 방식

### 왜 이 방식을?

- **비용 효율성**: 단일 데이터베이스 인스턴스 사용
- **데이터 격리**: Row Level Security로 완전한 격리 보장
- **확장성**: 매장 수 증가에 따른 비용 선형 증가
- **백업/관리 용이**: 단일 DB 관리

---

## 2. 핵심 테넌시 테이블 구조

### 2.1 Organizations (회사/본사)

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL 친화적 식별자
  business_number VARCHAR(20), -- 사업자등록번호

  -- 구독 정보
  subscription_plan VARCHAR(50) DEFAULT 'trial', -- trial, basic, pro, enterprise
  subscription_status VARCHAR(20) DEFAULT 'active', -- active, suspended, cancelled
  trial_ends_at TIMESTAMP,
  subscription_started_at TIMESTAMP,
  subscription_ends_at TIMESTAMP,

  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 예시 데이터
-- id: '550e8400-...', name: 'BSM 베이커리', slug: 'bsm-bakery'
-- id: '7c9e6679-...', name: '파리바게뜨 본사', slug: 'paris-baguette'
```

### 2.2 Stores (매장)

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  code VARCHAR(50), -- 매장 코드 (본사 관리용)

  -- 위치 정보
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone VARCHAR(50) DEFAULT 'Asia/Seoul',

  -- 운영 정보
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  opening_date DATE,

  -- 설정
  settings JSONB DEFAULT '{}', -- 매장별 커스텀 설정

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_stores_org ON stores(organization_id);
CREATE INDEX idx_stores_code ON stores(organization_id, code);

-- 예시 데이터
-- BSM 베이커리의 포틀리에점
-- id: 'a1b2c3...', organization_id: '550e8400...', name: '포틀리에점', code: 'PTL'
```

### 2.3 Users (사용자)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 인증 정보
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- 소셜 로그인 시 NULL 가능

  -- 프로필
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,

  -- 소셜 로그인
  google_id VARCHAR(255) UNIQUE,
  kakao_id VARCHAR(255) UNIQUE,
  naver_id VARCHAR(255) UNIQUE,

  -- 메타데이터
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_social ON users(google_id, kakao_id, naver_id);
```

### 2.4 User Roles (사용자-매장-권한 연결)

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE, -- NULL이면 본사 권한

  role VARCHAR(50) NOT NULL, -- 'super_admin', 'owner', 'manager', 'staff'

  -- 권한 플래그
  permissions JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, store_id) -- 한 사용자는 한 매장에 하나의 역할만
);

-- 인덱스
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_store ON user_roles(store_id);

-- 역할별 권한 예시
/*
super_admin: 시스템 전체 관리 (개발사)
owner: 본사 관리, 구독 관리, 모든 매장 조회
manager: 매장 운영, 발주, 재고 관리
staff: 실사 입력, 기본 조회
*/
```

---

## 3. Row Level Security (RLS) 정책

### 3.1 기본 원칙

- **모든 비즈니스 테이블**에 `store_id` 또는 `organization_id` 컬럼 필수
- **RLS 정책**으로 자동 필터링
- **애플리케이션 레벨에서 추가 검증**

### 3.2 RLS 정책 예시

### Products 테이블 RLS

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  price DECIMAL(10, 2),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신이 속한 매장의 제품만 조회
CREATE POLICY products_select_policy ON products
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id
      FROM user_roles
      WHERE user_id = auth.uid() -- Supabase auth 함수
    )
  );

-- 정책: 매장 관리자 이상만 제품 추가
CREATE POLICY products_insert_policy ON products
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_id = auth.uid()
        AND store_id = products.store_id
        AND role IN ('owner', 'manager')
    )
  );
```

### Sales 테이블 RLS

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id),

  order_number VARCHAR(100),
  channel VARCHAR(50), -- 'pos', 'baemin', 'coupang'
  total_amount DECIMAL(10, 2),

  sale_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- 매장별 데이터만 조회
CREATE POLICY sales_select_policy ON sales
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id
      FROM user_roles
      WHERE user_id = auth.uid()
    )
  );
```

---

## 4. 전체 테이블 관계도

```
┌─────────────────────┐
│  Organizations      │  ← 회사/본사
│  - id               │
│  - name             │
│  - subscription_*   │
└──────────┬──────────┘
           │ 1:N
           │
┌──────────▼──────────┐
│  Stores             │  ← 매장
│  - id               │
│  - organization_id  │
│  - name             │
└──────────┬──────────┘
           │
           │ M:N (via user_roles)
           │
┌──────────▼──────────┐
│  Users              │  ← 사용자
│  - id               │
│  - email            │
│  - name             │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  User_Roles         │  ← 권한 연결
│  - user_id          │
│  - store_id         │
│  - role             │
└─────────────────────┘

[모든 비즈니스 테이블]
├── Products (store_id)
├── Ingredients (store_id)
├── Recipes (store_id)
├── Sales (store_id)
├── Inventory (store_id)
├── Purchase_Orders (store_id)
└── ... 기타 테이블
```

---

## 5. 실전 쿼리 예시

### 5.1 사용자가 속한 매장 목록 조회

```sql
SELECT s.*
FROM stores s
JOIN user_roles ur ON ur.store_id = s.id
WHERE ur.user_id = '현재_사용자_id';
```

### 5.2 매장별 오늘 매출 조회 (RLS 자동 적용)

```sql
-- 애플리케이션에서는 store_id를 명시하지 않아도 RLS가 자동 필터링
SELECT SUM(total_amount)
FROM sales
WHERE sale_date = CURRENT_DATE;
-- RLS가 자동으로 WHERE store_id IN (...) 조건 추가
```

### 5.3 본사 관리자: 전체 매장 매출 집계

```sql
SELECT s.name, SUM(sal.total_amount)
FROM stores s
JOIN sales sal ON sal.store_id = s.id
WHERE s.organization_id = '해당_본사_id'
  AND sal.sale_date >= '2025-01-01'
GROUP BY s.name;
```

---

## 6. 마이그레이션 전략

### Phase 1: 기본 테넌시 구조 (1주차)

```sql
-- 순서대로 실행
1. organizations
2. stores
3. users
4. user_roles
```

### Phase 2: 비즈니스 테이블 (2-4주차)

```sql
5. products
6. ingredients
7. recipes (BOM)
8. categories
9. suppliers
```

### Phase 3: 거래 데이터 (5-8주차)

```sql
10. sales
11. sales_items
12. inventory_transactions
13. purchase_orders
```

---

## 7. 보안 체크리스트

- [ ]  모든 테이블에 RLS 활성화
- [ ]  store_id/organization_id 컬럼 필수 확인
- [ ]  Foreign Key 제약조건 설정 (ON DELETE CASCADE)
- [ ]  인덱스 생성 (조회 성능 최적화)
- [ ]  민감 정보 암호화 (password_hash)
- [ ]  API 레벨에서 권한 재검증 (RLS는 최후 방어선)

---

## 8. 확장 시나리오

### 시나리오 1: 프랜차이즈 본사 가입

1. `organizations` 테이블에 신규 본사 등록
2. `stores` 테이블에 가맹점 N개 일괄 등록
3. 본사 관리자에게 `owner` 권한 부여
4. 각 가맹점 점장에게 `manager` 권한 부여

### 시나리오 2: 신규 매장 추가

1. 기존 `organization_id`로 새 `store` 생성
2. 점장 초대 이메일 발송
3. 가입 시 `user_roles`에 매핑

### 시나리오 3: 구독 플랜 업그레이드

1. `organizations.subscription_plan` 업데이트
2. 기능 제한 미들웨어에서 플랜 체크
3. 상위 플랜 기능 활성화

---

## 9. 성능 최적화 팁

### 인덱스 전략

```sql
-- 복합 인덱스로 조회 속도 향상
CREATE INDEX idx_sales_store_date ON sales(store_id, sale_date DESC);
CREATE INDEX idx_inventory_store_product ON inventory(store_id, product_id);

-- JSONB 컬럼 인덱스 (설정 검색용)
CREATE INDEX idx_stores_settings ON stores USING GIN(settings);
```

### 파티셔닝 고려 (대규모 데이터)

```sql
-- 매출 데이터가 수백만 건 이상일 경우
CREATE TABLE sales_2025_01 PARTITION OF sales
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

---

## 10. Next Steps

### 1주차 To-Do

1. ✅ Supabase 프로젝트 생성
2. ⬜ 위 스키마 복사 → Supabase SQL Editor 실행
3. ⬜ 테스트 데이터 삽입
    - 샘플 Organization 1개
    - 샘플 Store 2개
    - 샘플 User 3명 (각각 owner, manager, staff)
4. ⬜ RLS 정책 작동 확인
5. ⬜ Next.js에서 Supabase Client로 조회 테스트

---

## 부록: Supabase 설정 가이드

### A. RLS 정책 템플릿

```sql
-- 모든 비즈니스 테이블에 적용할 기본 템플릿
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

CREATE POLICY {table_name}_select ON {table_name}
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM user_roles WHERE user_id = auth.uid()
    )
  );
```

### B. Supabase Auth 연동

```tsx
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 현재 사용자 매장 목록 조회
export async function getUserStores() {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: stores } = await supabase
    .from('user_roles')
    .select('store_id, stores(*)')
    .eq('user_id', user?.id)

  return stores
}
```

---

## 결론

이 Multi-tenancy 스키마는:

- ✅ **확장 가능**: 100개 매장 → 10,000개 매장까지 대응
- ✅ **안전**: RLS로 데이터 섞임 원천 차단
- ✅ **유연**: 본사/매장/사용자 구조 명확히 분리
- ✅ **효율적**: 단일 DB로 비용 최적화