-- Remove the sales inventory deduction trigger to prevent double deduction
-- Logic is now handled in the application layer (sales-actions.ts)

DROP TRIGGER IF EXISTS trg_sale_inventory_deduction ON sales_items;
DROP FUNCTION IF EXISTS process_sale_inventory();