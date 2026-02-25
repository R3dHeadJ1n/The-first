-- Link main dishes to optional extras (menu_items with category EXTRAS)
-- No change to orders/order_items or menu_items structure.

CREATE TABLE IF NOT EXISTS dish_extras (
    main_dish_id TEXT NOT NULL REFERENCES menu_items(dish_id) ON DELETE CASCADE,
    extra_dish_id TEXT NOT NULL REFERENCES menu_items(dish_id) ON DELETE CASCADE,
    PRIMARY KEY (main_dish_id, extra_dish_id),
    CHECK (main_dish_id <> extra_dish_id)
);

CREATE INDEX IF NOT EXISTS idx_dish_extras_main ON dish_extras(main_dish_id);
