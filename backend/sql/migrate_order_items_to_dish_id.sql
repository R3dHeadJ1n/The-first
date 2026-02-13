-- Migration: Replace order_items.name with order_items.dish_id
-- Run this if you have existing order_items with the old schema.
-- WARNING: This drops all order_items data. Run only if data can be discarded.

DROP TABLE IF EXISTS order_items;

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    dish_id TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price INTEGER NOT NULL CHECK (price >= 0),
    subtotal INTEGER GENERATED ALWAYS AS (quantity * price) STORED
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_dish_id ON order_items(dish_id);
