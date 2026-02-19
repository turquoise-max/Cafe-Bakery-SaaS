-- 1. Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES categories(id),
  display_order INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_categories_store ON categories(store_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- 2. Items (Product Master)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- Basic Info
  code VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),

  -- Classification
  type item_type NOT NULL,
  category_id UUID REFERENCES categories(id),

  -- Unit Info
  base_unit unit_type NOT NULL,
  purchase_unit unit_type,

  -- Price Info
  sale_price DECIMAL(10, 2),
  latest_purchase_price DECIMAL(10, 2),

  -- Inventory Management
  is_inventory_managed BOOLEAN DEFAULT true,
  safety_stock DECIMAL(15, 3),

  -- Metadata
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_items_store ON items(store_id);
CREATE INDEX idx_items_type ON items(store_id, type);
CREATE INDEX idx_items_code ON items(store_id, code);
CREATE INDEX idx_items_category ON items(category_id);

-- 3. Recipes (BOM Header)
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  output_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  output_quantity DECIMAL(15, 3) NOT NULL DEFAULT 1,

  -- Version Control
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  name VARCHAR(255),
  description TEXT,
  notes TEXT,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(store_id, output_item_id, version)
);

CREATE INDEX idx_recipes_output ON recipes(output_item_id);
CREATE INDEX idx_recipes_active ON recipes(store_id, output_item_id, is_active);

-- 4. Recipe_Items (BOM Details)
CREATE TABLE recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,

  input_item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantity DECIMAL(15, 3) NOT NULL,
  unit unit_type NOT NULL,

  sort_order INT DEFAULT 0,
  is_optional BOOLEAN DEFAULT false,
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recipe_items_recipe ON recipe_items(recipe_id);
CREATE INDEX idx_recipe_items_input ON recipe_items(input_item_id);

-- 5. Item_Options
CREATE TABLE item_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,

  option_name VARCHAR(100) NOT NULL,
  option_value VARCHAR(100),

  -- Additional Ingredient
  additional_ingredient_id UUID REFERENCES items(id),
  additional_quantity DECIMAL(15, 3),
  additional_unit unit_type,

  -- Additional Price
  price_adjustment DECIMAL(10, 2) DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_item_options_item ON item_options(item_id);

-- 6. Materialized View for Flattened BOM
CREATE MATERIALIZED VIEW mv_flattened_bom AS
WITH RECURSIVE bom_tree AS (
  -- Level 1: Direct Ingredients
  SELECT
    r.output_item_id AS product_id,
    ri.input_item_id AS material_id,
    ri.quantity,
    ri.unit,
    1 AS level
  FROM recipes r
  JOIN recipe_items ri ON ri.recipe_id = r.id
  WHERE r.is_active = true

  UNION ALL

  -- Level 2+: Nested Ingredients
  SELECT
    bt.product_id,
    ri.input_item_id,
    (bt.quantity * ri.quantity)::DECIMAL(15, 3),
    ri.unit,
    bt.level + 1
  FROM bom_tree bt
  JOIN items i ON i.id = bt.material_id
  JOIN recipes r ON r.output_item_id = i.id AND r.is_active = true
  JOIN recipe_items ri ON ri.recipe_id = r.id
  WHERE i.type != 'raw'
)
SELECT
  bt.product_id,
  p.name AS product_name,
  bt.material_id,
  m.name AS material_name,
  SUM(bt.quantity) AS total_quantity,
  bt.unit
FROM bom_tree bt
JOIN items p ON p.id = bt.product_id
JOIN items m ON m.id = bt.material_id
WHERE m.type = 'raw'
GROUP BY bt.product_id, p.name, bt.material_id, m.name, bt.unit;

CREATE INDEX idx_mv_bom_product ON mv_flattened_bom(product_id);
CREATE INDEX idx_mv_bom_material ON mv_flattened_bom(material_id);