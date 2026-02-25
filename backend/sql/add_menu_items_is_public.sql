-- Migration: Add is_public to menu_items for public menu visibility
-- When is_public = false, item is hidden from menu.html but still appears in analytics (order/name lookups).

ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_menu_items_is_public ON menu_items(is_public) WHERE is_public = true;
