-- Migration: Add name_ru and name_th columns to menu_items
-- For multilingual dish names based on user language (en/ru/th)

ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS name_ru VARCHAR(255),
ADD COLUMN IF NOT EXISTS name_th VARCHAR(255);
