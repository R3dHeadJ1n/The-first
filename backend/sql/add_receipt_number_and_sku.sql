-- Migration: Add receipt_number to orders (for Loyverse sync) and sku to menu_items (to match Loyverse SKU)
-- Run once. Safe to run if columns already exist.

-- Orders: receipt_number identifies Loyverse receipts; unique to avoid duplicates
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS receipt_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_receipt_number ON orders(receipt_number) WHERE receipt_number IS NOT NULL;

-- Menu items: sku matches Loyverse line_item SKU for syncing order items
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS sku TEXT;

CREATE INDEX IF NOT EXISTS idx_menu_items_sku ON menu_items(sku) WHERE sku IS NOT NULL;
