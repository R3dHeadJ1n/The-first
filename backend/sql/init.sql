CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    public_id TEXT UNIQUE NOT NULL,
    room_type VARCHAR(10) NOT NULL CHECK (room_type IN ('small', 'big')),
    room_id VARCHAR(10),
    checkin_date DATE NOT NULL,
    checkout_date DATE NOT NULL,
    guests INTEGER NOT NULL CHECK (guests > 0),
    total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    status VARCHAR(50) DEFAULT 'unconfirmed' CHECK (status IN ('unconfirmed','confirmed','deleted')),
    source VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    CHECK (checkout_date > checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_bookings_public_id ON bookings(public_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    public_id TEXT UNIQUE NOT NULL,
    receipt_number TEXT,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    communication VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'unconfirmed' CHECK (status IN ('unconfirmed','live','completed','deleted')),
    total INTEGER NOT NULL CHECK (total >= 0),
    type VARCHAR(20) CHECK (type IN ('DINE IN', 'ROOM SERVICE', 'DELIVERY'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_receipt_number ON orders(receipt_number) WHERE receipt_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_public_id ON orders(public_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(type);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    dish_id TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price INTEGER NOT NULL CHECK (price >= 0),
    subtotal INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_dish_id ON order_items(dish_id);

CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    dish_id TEXT UNIQUE NOT NULL,
    sku TEXT,
    category VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_ru VARCHAR(255),
    name_th VARCHAR(255),
    price INTEGER NOT NULL CHECK (price >= 0),
    image_path TEXT,
    display_order INTEGER DEFAULT 0,
    is_public BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_menu_items_sku ON menu_items(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_menu_items_dish_id ON menu_items(dish_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_public ON menu_items(is_public) WHERE is_public = true;

-- Which extras (EXTRAS category) are available for each main dish
CREATE TABLE IF NOT EXISTS dish_extras (
    main_dish_id TEXT NOT NULL REFERENCES menu_items(dish_id) ON DELETE CASCADE,
    extra_dish_id TEXT NOT NULL REFERENCES menu_items(dish_id) ON DELETE CASCADE,
    PRIMARY KEY (main_dish_id, extra_dish_id),
    CHECK (main_dish_id <> extra_dish_id)
);
CREATE INDEX IF NOT EXISTS idx_dish_extras_main ON dish_extras(main_dish_id);
