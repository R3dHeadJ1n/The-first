CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    public_id TEXT UNIQUE NOT NULL,
    room_type VARCHAR(10) NOT NULL CHECK (room_type IN ('small', 'big')),
    room_id VARCHAR(10),
    checkin_date DATE NOT NULL,
    checkout_date DATE NOT NULL,
    guests INTEGER NOT NULL CHECK (guests > 0),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    status VARCHAR(50) DEFAULT 'unconfirmed',
    source VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    CHECK (checkout_date > checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_bookings_public_id ON bookings(public_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    public_id TEXT UNIQUE NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    communication VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'unconfirmed',
    total INTEGER NOT NULL CHECK (total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_public_id ON orders(public_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price INTEGER NOT NULL CHECK (price >= 0),
    subtotal INTEGER GENERATED ALWAYS AS (quantity * price) STORED
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    dish_id TEXT UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    image_path TEXT,
    display_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_menu_items_dish_id ON menu_items(dish_id);
