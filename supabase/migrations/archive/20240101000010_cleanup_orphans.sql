-- 1. Identify and remove duplicate user_roles (keep the one with the earliest created_at)
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, organization_id 
           ORDER BY created_at ASC
         ) as row_num
  FROM user_roles
)
DELETE FROM user_roles
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- 2. Add unique constraint to prevent future duplicates
ALTER TABLE user_roles
ADD CONSTRAINT user_roles_user_org_unique UNIQUE (user_id, organization_id);

-- 3. Cleanup stores that might have been created without a valid organization link (if any)
-- (Optional, depending on your data integrity rules)
-- DELETE FROM stores WHERE organization_id NOT IN (SELECT id FROM organizations);