-- Migration: Add TYPE column to orders table
-- Values: DINE IN, ROOM SERVICE, DELIVERY

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS type VARCHAR(20) CHECK (type IN ('DINE IN', 'ROOM SERVICE', 'DELIVERY'));

CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(type);
