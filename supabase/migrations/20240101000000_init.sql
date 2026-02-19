-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUM Types
CREATE TYPE item_type AS ENUM ('raw', 'semi_finished', 'finished');
CREATE TYPE unit_type AS ENUM ('kg', 'g', 'l', 'ml', 'ea', 'box', 'pack');
CREATE TYPE transaction_type AS ENUM (
  'purchase',      -- 입고
  'sale',          -- 판매 출고
  'adjustment',    -- 조정 (실사 후)
  'waste',         -- 폐기
  'production',    -- 생산
  'transfer'       -- 매장 간 이동
);
CREATE TYPE po_status AS ENUM ('draft', 'ordered', 'received', 'cancelled');

-- 2. Organizations (Company/Headquarters)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  business_number VARCHAR(20),

  -- Subscription Info
  subscription_plan VARCHAR(50) DEFAULT 'trial',
  subscription_status VARCHAR(20) DEFAULT 'active',
  trial_ends_at TIMESTAMP,
  subscription_started_at TIMESTAMP,
  subscription_ends_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Stores
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),

  -- Location Info
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone VARCHAR(50) DEFAULT 'Asia/Seoul',

  -- Operation Info
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  opening_date DATE,

  settings JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stores_org ON stores(organization_id);
CREATE INDEX idx_stores_code ON stores(organization_id, code);

-- 4. Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auth Info
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),

  -- Profile
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,

  -- Social Login
  google_id VARCHAR(255) UNIQUE,
  kakao_id VARCHAR(255) UNIQUE,
  naver_id VARCHAR(255) UNIQUE,

  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_social ON users(google_id, kakao_id, naver_id);

-- 5. User_Roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,

  role VARCHAR(50) NOT NULL, -- 'super_admin', 'owner', 'manager', 'staff'
  permissions JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, store_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_store ON user_roles(store_id);

-- 6. Unit Conversions
CREATE TABLE unit_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  from_unit unit_type NOT NULL,
  to_unit unit_type NOT NULL,
  conversion_factor DECIMAL(15, 6) NOT NULL,

  item_id UUID, -- Nullable for global conversions, specific item_id for item-specific conversions

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(from_unit, to_unit, item_id)
);

CREATE INDEX idx_unit_conv_from_to ON unit_conversions(from_unit, to_unit);

-- Initial Data for Unit Conversions
INSERT INTO unit_conversions (from_unit, to_unit, conversion_factor) VALUES
  ('kg', 'g', 1000),
  ('g', 'kg', 0.001),
  ('l', 'ml', 1000),
  ('ml', 'l', 0.001),
  ('box', 'ea', 12),
  ('pack', 'g', 500);