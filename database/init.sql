-- Automation of MiniShop database initialization
-- Runs automatically when PostgreSQL initializes a new database.


CREATE TABLE IF NOT EXISTS products (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


INSERT INTO products (name, description, price, stock_quantity)
VALUES
    ('Wireless Mouse', 'Ergonomic wireless computer mouse.', 20.00, 36),
    ('Mechanical Keyboard', 'Compact mechanical keyboard.', 90.00, 19),
    ('USB-C Hub', 'Multi-port USB-C connectivity hub.', 50.00, 28),
    ('Laptop Stand', 'Adjustable aluminium laptop stand.', 40.00, 15),
    ('Bluetooth Headphones', 'Wireless over-ear headphones.', 80.00, 22),
    ('Portable SSD', 'Compact external solid-state storage drive.', 60.00, 44),
    ('Webcam', 'High-definition USB webcam for video calls.', 70.00, 32),
    ('Wireless Charger', 'Convenient wireless charging pad.', 30.00, 48);
