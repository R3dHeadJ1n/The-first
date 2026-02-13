// Hotel Booking Backend Server
// Simple Node.js + Express server with in-memory storage

const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');
const session = require('express-session');
const fs = require('fs');
const { spawn } = require('child_process');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Track server start time
const serverStartTime = new Date();

// Middleware
app.use(cors({
    origin: true,
    credentials: true
})); // Allow frontend to make requests with credentials
app.use(express.json()); // Parse JSON request bodies

// Session configuration
app.use(session({
    secret: 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'admin.sid', // Custom session name
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        sameSite: 'lax', // Helps with CORS and cookie handling
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Admin credentials (default: admin/admin)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();
    } else {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

const MENU_IMAGES_DIR = path.join(__dirname, 'uploads', 'menu');
const TELEGRAM_MESSAGES_FILE = path.join(__dirname, 'telegram-messages.json');
const TELEGRAM_ORDER_MESSAGES_FILE = path.join(__dirname, 'telegram-order-messages.json');

// Ensure menu images directory exists
if (!fs.existsSync(MENU_IMAGES_DIR)) {
    fs.mkdirSync(MENU_IMAGES_DIR, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, MENU_IMAGES_DIR);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: dishId-timestamp.extension
        const dishId = req.params.id || 'unknown';
        const ext = path.extname(file.originalname).toLowerCase();
        const timestamp = Date.now();
        cb(null, `${dishId}-${timestamp}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Accept only jpg and png
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG and PNG images are allowed'), false);
        }
    }
});

const ALLOWED_BOOKING_STATUSES = ['unconfirmed', 'confirmed', 'deleted'];
const ALLOWED_ORDER_STATUSES = ['unconfirmed', 'live', 'completed', 'deleted'];
const ORDER_STATUS_ALIASES = { declined: 'deleted' };

function normalizeBookingStatus(status, source = 'user', fallback) {
    const isAdminSource = source === 'admin';
    const defaultFallback = isAdminSource ? 'confirmed' : 'unconfirmed';
    const effectiveFallback = fallback || defaultFallback;
    if (status === undefined || status === null) {
        return effectiveFallback;
    }
    const normalized = String(status).trim().toLowerCase();
    if (!normalized) {
        return effectiveFallback;
    }
    return ALLOWED_BOOKING_STATUSES.includes(normalized) ? normalized : effectiveFallback;
}

function ensureBookingStatus(status) {
    const normalized = String(status || '').trim().toLowerCase();
    if (!ALLOWED_BOOKING_STATUSES.includes(normalized)) {
        throw new Error(`Status must be one of: ${ALLOWED_BOOKING_STATUSES.join(', ')}`);
    }
    return normalized;
}

function normalizeOrderStatus(status, fallback = 'unconfirmed') {
    if (status === undefined || status === null) {
        return fallback;
    }
    const normalized = String(status).trim().toLowerCase();
    if (!normalized) {
        return fallback;
    }
    if (ORDER_STATUS_ALIASES[normalized]) {
        return ORDER_STATUS_ALIASES[normalized];
    }
    return ALLOWED_ORDER_STATUSES.includes(normalized) ? normalized : fallback;
}

function ensureOrderStatus(status) {
    const normalized = normalizeOrderStatus(status);
    if (!ALLOWED_ORDER_STATUSES.includes(normalized)) {
        throw new Error(`Order status must be one of: ${ALLOWED_ORDER_STATUSES.join(', ')}`);
    }
    return normalized;
}

// Database helpers
function formatDateOnly(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().split('T')[0];
}

function mapBookingRow(row) {
    const checkIn = formatDateOnly(row.checkin_date);
    const checkOut = formatDateOnly(row.checkout_date);
    let total = Number(row.total);
    if (!Number.isFinite(total) && checkIn && checkOut && row.room_type) {
        total = calcNightsAndTotal(checkIn, checkOut, row.room_type).total;
    }
    const normalizedStatus = normalizeBookingStatus(row.status, row.source === 'admin' ? 'admin' : 'user');
    return {
        id: row.public_id || `booking-${row.id}`,
        roomType: row.room_type,
        roomId: row.room_id ? String(row.room_id) : null,
        checkIn,
        checkOut,
        guests: row.guests,
        name: row.first_name || '',
        surname: row.last_name || '',
        phone: row.phone || '',
        source: row.source || 'user',
        createdAt: row.created_at ? row.created_at.toISOString() : null,
        status: normalizedStatus,
        total: total || 0
    };
}

const DEFAULT_MENU_ITEMS = [
    { dishId: 'dish-1', category: 'Breakfast', name: 'Scrambled Eggs', price: 80 },
    { dishId: 'dish-2', category: 'Breakfast', name: 'Pancakes with Honey', price: 95 },
    { dishId: 'dish-3', category: 'Breakfast', name: 'Thai Omelette', price: 85 },
    { dishId: 'dish-4', category: 'Breakfast', name: 'French Toast', price: 90 },
    { dishId: 'dish-5', category: 'Breakfast', name: 'Muesli with Yogurt', price: 75 },
    { dishId: 'dish-6', category: 'Breakfast', name: 'Bacon and Eggs', price: 120 },
    { dishId: 'dish-7', category: 'Breakfast', name: 'Breakfast Set', price: 150 },
    { dishId: 'dish-8', category: 'Appetizers', name: 'Spring Rolls', price: 65 },
    { dishId: 'dish-9', category: 'Appetizers', name: 'Chicken Satay', price: 85 },
    { dishId: 'dish-10', category: 'Appetizers', name: 'Tom Yum Soup', price: 90 },
    { dishId: 'dish-11', category: 'Appetizers', name: 'Papaya Salad', price: 70 },
    { dishId: 'dish-12', category: 'Appetizers', name: 'Fish Cakes', price: 75 },
    { dishId: 'dish-13', category: 'Appetizers', name: 'Fried Calamari', price: 95 },
    { dishId: 'dish-14', category: 'Appetizers', name: 'Chicken Wings', price: 80 },
    { dishId: 'dish-15', category: 'Pizza', name: 'Margherita', price: 180 },
    { dishId: 'dish-16', category: 'Pizza', name: 'Pepperoni', price: 200 },
    { dishId: 'dish-17', category: 'Pizza', name: 'Hawaiian', price: 190 },
    { dishId: 'dish-18', category: 'Pizza', name: 'Seafood Pizza', price: 250 },
    { dishId: 'dish-19', category: 'Pizza', name: 'Vegetarian', price: 170 },
    { dishId: 'dish-20', category: 'Pizza', name: 'Thai Basil Pizza', price: 195 },
    { dishId: 'dish-21', category: 'Pizza', name: 'Four Cheese', price: 210 },
    { dishId: 'dish-22', category: 'Lunch', name: 'Pad Thai', price: 120 },
    { dishId: 'dish-23', category: 'Lunch', name: 'Fried Rice', price: 100 },
    { dishId: 'dish-24', category: 'Lunch', name: 'Khao Pad Sapparot', price: 130 },
    { dishId: 'dish-25', category: 'Lunch', name: 'Pad Krapow Moo', price: 95 },
    { dishId: 'dish-26', category: 'Lunch', name: 'Khao Soi', price: 130 },
    { dishId: 'dish-27', category: 'Lunch', name: 'Noodle Soup', price: 90 },
    { dishId: 'dish-28', category: 'Lunch', name: 'Grilled Chicken', price: 140 },
    { dishId: 'dish-29', category: 'Lunch', name: 'Beef Steak', price: 180 },
    { dishId: 'dish-30', category: 'Curry', name: 'Green Curry', price: 120 },
    { dishId: 'dish-31', category: 'Curry', name: 'Red Curry', price: 120 },
    { dishId: 'dish-32', category: 'Curry', name: 'Panang Curry', price: 130 },
    { dishId: 'dish-33', category: 'Curry', name: 'Massaman Curry', price: 130 },
    { dishId: 'dish-34', category: 'Curry', name: 'Yellow Curry', price: 115 },
    { dishId: 'dish-35', category: 'Kids', name: 'Chicken Nuggets', price: 85 },
    { dishId: 'dish-36', category: 'Kids', name: 'French Fries', price: 55 },
    { dishId: 'dish-37', category: 'Kids', name: 'Spaghetti', price: 90 },
    { dishId: 'dish-38', category: 'Kids', name: 'Fish & Chips', price: 95 },
    { dishId: 'dish-39', category: 'Kids', name: 'Mini Burger', price: 80 },
    { dishId: 'dish-40', category: 'Kids', name: 'Plain Fried Rice', price: 70 },
    { dishId: 'dish-41', category: 'Drinks', name: 'Thai Iced Tea', price: 45 },
    { dishId: 'dish-42', category: 'Drinks', name: 'Fresh Orange Juice', price: 60 },
    { dishId: 'dish-43', category: 'Drinks', name: 'Watermelon Shake', price: 65 },
    { dishId: 'dish-44', category: 'Drinks', name: 'Smoothie', price: 80 },
    { dishId: 'dish-45', category: 'Drinks', name: 'Coconut Water', price: 50 },
    { dishId: 'dish-46', category: 'Drinks', name: 'Soda', price: 35 },
    { dishId: 'dish-47', category: 'Drinks', name: 'Coffee', price: 55 },
    { dishId: 'dish-48', category: 'Drinks', name: 'Iced Coffee', price: 60 },
    { dishId: 'dish-49', category: 'Drinks', name: 'Lemonade', price: 45 },
    { dishId: 'dish-50', category: 'Drinks', name: 'Milkshake', price: 75 }
];

async function ensureMenuSeeded() {
    const result = await db.query('SELECT COUNT(*)::int AS count FROM menu_items');
    if (result.rows[0].count > 0) return;
    const insertValues = DEFAULT_MENU_ITEMS.map((item, index) => [
        item.dishId,
        item.category,
        item.name,
        item.price,
        index
    ]);
    for (const [dishId, category, name, price, order] of insertValues) {
        await db.query(
            `INSERT INTO menu_items (dish_id, category, name, price, display_order)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (dish_id) DO NOTHING`,
            [dishId, category, name, price, order]
        );
    }
}

async function syncMenuImagesFromDisk() {
    if (!fs.existsSync(MENU_IMAGES_DIR)) {
        return;
    }
    const files = fs.readdirSync(MENU_IMAGES_DIR);
    for (const filename of files) {
        const match = filename.match(/^(dish-\d+)/);
        if (!match) continue;
        const dishId = match[1];
        await db.query(
            `UPDATE menu_items
             SET image_path = $2
             WHERE dish_id = $1 AND (image_path IS NULL OR image_path = '')`,
            [dishId, filename]
        );
    }
}

// Read all bookings from database (excluding deleted ones)
async function readBookingsFromDb(includeDeleted = false) {
    try {
        const result = await db.query(
            `SELECT id, public_id, room_type, room_id, checkin_date, checkout_date, guests,
                    first_name, last_name, phone, status, source, created_at, total
             FROM bookings
             ${includeDeleted ? '' : "WHERE status <> 'deleted'"}
             ORDER BY created_at DESC`
        );
        return result.rows.map(mapBookingRow);
    } catch (error) {
        console.error('Error reading bookings from database:', error);
        return [];
    }
}

// Add a new booking (database)
async function insertBookingRecord(booking) {
    try {
        if (!booking) return false;
        const {
            id,
            roomType,
            roomId = null,
            checkIn,
            checkOut,
            guests,
            phone = '',
            source = 'user',
            createdAt = new Date().toISOString(),
            status = source === 'user' ? 'unconfirmed' : 'confirmed',
            name = '',
            surname = ''
        } = booking;

        if (!['small', 'big'].includes(roomType)) {
            throw new Error('Invalid room type');
        }

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        if (
            !checkIn ||
            !checkOut ||
            Number.isNaN(checkInDate.valueOf()) ||
            Number.isNaN(checkOutDate.valueOf()) ||
            checkOutDate <= checkInDate
        ) {
            throw new Error('Invalid date range');
        }

        if (!guests || Number.isNaN(Number(guests))) {
            throw new Error('Invalid guests count');
        }

        const checkInStr = checkInDate.toISOString().split('T')[0];
        const checkOutStr = checkOutDate.toISOString().split('T')[0];
        const { total } = calcNightsAndTotal(checkInStr, checkOutStr, roomType);

        const finalStatus = normalizeBookingStatus(status, source);

        const result = await db.query(
            `INSERT INTO bookings
             (public_id, room_type, room_id, checkin_date, checkout_date, guests,
              first_name, last_name, phone, status, source, created_at, total)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [
                id,
                roomType,
                roomId ? String(roomId) : null,
                checkInStr,
                checkOutStr,
                Number(guests),
                name,
                surname,
                phone,
                finalStatus,
                source,
                createdAt,
                total
            ]
        );

        const inserted = result.rows[0];
        return inserted ? mapBookingRow(inserted) : null;
    } catch (error) {
        console.error('Error saving booking to database:', error);
        return null;
    }
}

async function updateBookingRecord(bookingId, updates = {}) {
    try {
        if (!bookingId || !updates || typeof updates !== 'object') return null;

        const existingResult = await db.query(
            `SELECT * FROM bookings WHERE public_id = $1`,
            [bookingId]
        );
        const existingRow = existingResult.rows[0];
        if (!existingRow) return null;

        const fieldMap = {
            roomType: 'room_type',
            roomId: 'room_id',
            checkIn: 'checkin_date',
            checkOut: 'checkout_date',
            guests: 'guests',
            name: 'first_name',
            surname: 'last_name',
            phone: 'phone',
            status: 'status'
        };

        const values = [];
        const setParts = [];
        const pushField = (dbField, value) => {
            setParts.push(`${dbField} = $${values.length + 1}`);
            values.push(value);
        };

        let totalNeedsUpdate = false;
        let nextRoomType = existingRow.room_type;
        let nextCheckIn = formatDateOnly(existingRow.checkin_date);
        let nextCheckOut = formatDateOnly(existingRow.checkout_date);

        if (typeof updates.roomType === 'string') {
            const normalizedRoomType = updates.roomType.toLowerCase();
            if (!['small', 'big'].includes(normalizedRoomType)) {
                throw new Error('roomType must be "small" or "big"');
            }
            nextRoomType = normalizedRoomType;
            pushField(fieldMap.roomType, normalizedRoomType);
            totalNeedsUpdate = true;
        }

        if (updates.roomId !== undefined) {
            pushField(fieldMap.roomId, updates.roomId ? String(updates.roomId) : null);
        }

        if (updates.checkIn) {
            const checkInDate = new Date(updates.checkIn);
            if (Number.isNaN(checkInDate.valueOf())) {
                throw new Error('Invalid check-in date');
            }
            const formatted = checkInDate.toISOString().split('T')[0];
            pushField(fieldMap.checkIn, formatted);
            nextCheckIn = formatted;
            totalNeedsUpdate = true;
        }

        if (updates.checkOut) {
            const checkOutDate = new Date(updates.checkOut);
            if (Number.isNaN(checkOutDate.valueOf())) {
                throw new Error('Invalid check-out date');
            }
            const formatted = checkOutDate.toISOString().split('T')[0];
            pushField(fieldMap.checkOut, formatted);
            nextCheckOut = formatted;
            totalNeedsUpdate = true;
        }

        if (updates.checkIn || updates.checkOut || totalNeedsUpdate) {
            if (nextCheckIn && nextCheckOut) {
                const start = new Date(nextCheckIn + 'T00:00:00');
                const end = new Date(nextCheckOut + 'T00:00:00');
                if (end <= start) {
                    throw new Error('Check-out date must be after check-in date');
                }
            }
        }

        if (updates.guests !== undefined) {
            const guestsNum = Number(updates.guests);
            if (!Number.isFinite(guestsNum) || guestsNum <= 0) {
                throw new Error('Guests must be a positive number');
            }
            pushField(fieldMap.guests, guestsNum);
        }

        if (typeof updates.name === 'string') {
            pushField(fieldMap.name, updates.name.trim());
        }

        if (typeof updates.surname === 'string') {
            pushField(fieldMap.surname, updates.surname.trim());
        }

        if (typeof updates.phone === 'string') {
            pushField(fieldMap.phone, updates.phone.trim());
        }

        if (typeof updates.status === 'string') {
            const normalizedStatus = ensureBookingStatus(updates.status);
            pushField(fieldMap.status, normalizedStatus);
        }

        if (totalNeedsUpdate) {
            if (!nextCheckIn || !nextCheckOut) {
                throw new Error('Check-in and check-out dates are required to calculate total');
            }
            const { total } = calcNightsAndTotal(nextCheckIn, nextCheckOut, nextRoomType);
            pushField('total', total);
        }

        if (setParts.length === 0) {
            return mapBookingRow(existingRow);
        }

        values.push(bookingId);
        const result = await db.query(
            `UPDATE bookings
             SET ${setParts.join(', ')}
             WHERE public_id = $${values.length}
             RETURNING *`,
            values
        );

        return result.rows[0] ? mapBookingRow(result.rows[0]) : null;
    } catch (error) {
        console.error('Error updating booking:', error);
        return null;
    }
}

// Update booking status (DB)
async function updateBookingStatus(bookingId, newStatus, roomId = null) {
    try {
        const normalizedStatus = ensureBookingStatus(newStatus);
        const query = `
            UPDATE bookings
            SET status = $2,
                room_id = COALESCE($3::text, room_id)
            WHERE public_id = $1
            RETURNING public_id
        `;
        const result = await db.query(query, [bookingId, normalizedStatus, roomId]);
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error updating booking status:', error);
        return false;
    }
}

// Mark a booking as deleted (change row color to red)
async function markBookingAsDeleted(bookingId) {
    return await updateBookingStatus(bookingId, 'deleted');
}

// Admin routes - define BEFORE static middleware to take precedence
// Admin page route - serve admin.html
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

// Also support /admin.html for convenience
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

// Admin menu management page
app.get('/admin-menu.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin-menu.html'));
});

// Menu page for users
app.get('/menu.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'menu.html'));
});
app.get('/checkout.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'checkout.html'));
});

// Test endpoint to verify server is running
app.get('/admin/test', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// GET /admin/status - Get server status information
app.get('/admin/status', (req, res) => {
    try {
        const uptime = process.uptime(); // Uptime in seconds
        const uptimeHours = Math.floor(uptime / 3600);
        const uptimeMinutes = Math.floor((uptime % 3600) / 60);
        const uptimeSeconds = Math.floor(uptime % 60);
        
        const uptimeFormatted = uptimeHours > 0 
            ? `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`
            : uptimeMinutes > 0
            ? `${uptimeMinutes}m ${uptimeSeconds}s`
            : `${uptimeSeconds}s`;
        
        res.json({
            status: 'online',
            port: PORT,
            uptime: uptimeFormatted,
            uptimeSeconds: uptime,
            startTime: serverStartTime.toISOString(),
            nodeVersion: process.version,
            platform: process.platform,
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024) // MB
            }
        });
    } catch (error) {
        console.error('Error getting server status:', error);
        res.status(500).json({ status: 'error', error: 'Failed to get server status' });
    }
});

// POST /admin/restart - Restart the backend server
// Note: This will exit the process. If running with start-server.bat, it will auto-restart in the same window.
app.post('/admin/restart', async (req, res) => {
    try {
        console.log('Restart request received from admin');
        
        // Send response immediately before restarting
        res.json({ 
            success: true, 
            message: 'Backend server restart initiated. Server will exit and restart in 2 seconds.' 
        });
        
        // Give time for response to be sent, then exit
        // If running with start-server.bat wrapper, it will automatically restart in the same window
        setTimeout(() => {
            console.log('Restarting server... Exiting process.');
            console.log('If running with start-server.bat, server will restart automatically in the same window.');
            process.exit(0);
        }, 2000);
        
    } catch (error) {
        console.error('Error in restart endpoint:', error);
        res.status(500).json({ success: false, error: 'Failed to restart server' });
    }
});

// Admin login endpoint
app.post('/admin/login', (req, res) => {
    try {
        console.log('Login attempt:', { username: req.body.username, hasPassword: !!req.body.password });
        console.log('Session ID:', req.sessionID);
        
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password are required' });
        }
        
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            // Set session data
            req.session.authenticated = true;
            req.session.username = username;
            
            // Save session explicitly
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ success: false, error: 'Failed to save session: ' + err.message });
                }
                console.log('Login successful, session saved');
                res.json({ success: true });
            });
        } else {
            console.log('Login failed - invalid credentials');
            res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login endpoint error:', error);
        res.status(500).json({ success: false, error: 'Server error: ' + error.message });
    }
});

// Admin logout endpoint
app.post('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Logout failed' });
        }
        res.json({ success: true });
    });
});

// Check authentication status
app.get('/admin/check-auth', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.json({ authenticated: true });
    } else {
        res.json({ authenticated: false });
    }
});

// GET /admin/bookings - Get all confirmed/admin bookings (must be before static middleware)
app.get('/admin/bookings', async (req, res) => {
    try {
        console.log('GET /admin/bookings - Request received');
        const allBookings = await readBookingsFromDb();
        console.log('Total bookings:', allBookings.length);
        
        // Get admin bookings OR confirmed user bookings (exclude unconfirmed)
        const adminBookings = allBookings.filter(booking => 
            booking.source === 'admin' || (booking.source === 'user' && booking.status === 'confirmed')
        );
        console.log('Admin/confirmed bookings found:', adminBookings.length);
        
        // Sort by check-in date, then by room
        adminBookings.sort((a, b) => {
            if (a.checkIn !== b.checkIn) {
                return a.checkIn.localeCompare(b.checkIn);
            }
            return (a.roomId || '').localeCompare(b.roomId || '');
        });
        
        res.json(adminBookings);
    } catch (error) {
        console.error('Error getting admin bookings:', error);
        res.status(500).json({ error: 'Failed to read bookings' });
    }
});

// GET /admin/unconfirmed-bookings - Get all unconfirmed user bookings
app.get('/admin/unconfirmed-bookings', async (req, res) => {
    try {
        console.log('GET /admin/unconfirmed-bookings - Request received');
        const allBookings = await readBookingsFromDb();
        
        // Get only unconfirmed user bookings
        const unconfirmedBookings = allBookings.filter(booking => 
            booking.source === 'user' && booking.status === 'unconfirmed'
        );
        
        console.log('Unconfirmed bookings found:', unconfirmedBookings.length);
        
        // Sort by creation date (newest first)
        unconfirmedBookings.sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        res.json(unconfirmedBookings);
    } catch (error) {
        console.error('Error getting unconfirmed bookings:', error);
        res.status(500).json({ error: 'Failed to read bookings' });
    }
});

// Orders API (admin)
app.get('/admin/orders/unconfirmed', async (req, res) => {
    try {
        const data = await readOrders();
        const list = data.orders.filter(o => o.status === 'unconfirmed');
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load orders' });
    }
});

app.get('/admin/orders/live', async (req, res) => {
    try {
        const data = await readOrders();
        const list = data.orders.filter(o => o.status === 'live');
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load orders' });
    }
});

app.get('/admin/orders/all', async (req, res) => {
    try {
        const data = await readOrders();
        let list = data.orders;
        const { status, includeDeleted } = req.query;
        if (status) {
            list = list.filter(o => (o.status || '').toLowerCase() === status.toLowerCase());
        }
        if (String(includeDeleted || '').toLowerCase() !== 'true') {
            list = list.filter(o => (o.status || '').toLowerCase() !== 'deleted');
        }
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load orders' });
    }
});

app.get('/admin/bookings/all', async (req, res) => {
    try {
        const includeDeleted = String(req.query.includeDeleted || '').toLowerCase() === 'true';
        const allBookings = await readBookingsFromDb(includeDeleted);
        allBookings.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        res.json(allBookings);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load bookings' });
    }
});

app.post('/admin/bookings', async (req, res) => {
    try {
        const { roomType, roomId, checkIn, checkOut, guests, name, surname, phone, status } = req.body || {};
        if (!roomType || !checkIn || !checkOut || !guests || !name || !surname || !phone) {
            return res.status(400).json({ error: 'roomType, checkIn, checkOut, guests, name, surname, and phone are required' });
        }

        const normalizedRoomType = String(roomType).toLowerCase();
        if (!['small', 'big'].includes(normalizedRoomType)) {
            return res.status(400).json({ error: 'roomType must be "small" or "big"' });
        }

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        if (Number.isNaN(checkInDate.valueOf()) || Number.isNaN(checkOutDate.valueOf())) {
            return res.status(400).json({ error: 'Invalid dates supplied' });
        }
        if (checkOutDate <= checkInDate) {
            return res.status(400).json({ error: 'Check-out date must be after check-in date' });
        }

        const guestsCount = Number(guests);
        if (!Number.isFinite(guestsCount) || guestsCount <= 0) {
            return res.status(400).json({ error: 'Guests must be a positive number' });
        }

        const booking = {
            id: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            roomType: normalizedRoomType,
            roomId: roomId ? String(roomId) : null,
            checkIn: checkInDate.toISOString().split('T')[0],
            checkOut: checkOutDate.toISOString().split('T')[0],
            guests: guestsCount,
            name: String(name).trim(),
            surname: String(surname).trim(),
            phone: String(phone).trim(),
            source: 'admin',
            createdAt: new Date().toISOString(),
            status: normalizeBookingStatus(status, 'admin')
        };

        const created = await insertBookingRecord(booking);
        if (!created) {
            return res.status(500).json({ error: 'Failed to create booking' });
        }
        res.json({ success: true, booking: created });
    } catch (error) {
        console.error('Error creating admin booking record:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

app.put('/admin/bookings/:id', async (req, res) => {
    try {
        const bookingId = req.params.id;
        if (!bookingId) return res.status(400).json({ error: 'booking id is required' });

        const allowedKeys = ['roomType', 'roomId', 'checkIn', 'checkOut', 'guests', 'name', 'surname', 'phone', 'status'];
        const updates = {};
        allowedKeys.forEach(key => {
            if (req.body && Object.prototype.hasOwnProperty.call(req.body, key)) {
                updates[key] = req.body[key];
            }
        });

        const updated = await updateBookingRecord(bookingId, updates);
        if (!updated) {
            return res.status(404).json({ error: 'Booking not found or no changes applied' });
        }
        res.json({ success: true, booking: updated });
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

app.delete('/admin/bookings/:id', async (req, res) => {
    try {
        const bookingId = req.params.id;
        if (!bookingId) return res.status(400).json({ error: 'booking id is required' });
        const success = await markBookingAsDeleted(bookingId);
        if (!success) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json({ success: true, message: 'Booking marked as deleted' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

async function updateOrderStatus(orderId, newStatus) {
    try {
        const normalizedStatus = ensureOrderStatus(newStatus);
        const result = await db.query(
            `UPDATE orders SET status = $2 WHERE public_id = $1 RETURNING public_id`,
            [orderId, normalizedStatus]
        );
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error updating order status:', error);
        return false;
    }
}

function updateOrderTelegramMessage(orderId, newText, removeButtons = false) {
    const m = readOrderTelegramMessages()[orderId];
    if (!m || !m.chatId || !m.messageId) return;
    const payload = { chat_id: m.chatId, message_id: m.messageId, text: newText };
    if (removeButtons) payload.reply_markup = { inline_keyboard: [] };
    telegramApiRequest('editMessageText', payload);
}

function updateOrderTelegramMessageWithComplete(orderId, newText) {
    const m = readOrderTelegramMessages()[orderId];
    if (!m || !m.chatId || !m.messageId) return;
    telegramApiRequest('editMessageText', {
        chat_id: m.chatId,
        message_id: m.messageId,
        text: newText,
        reply_markup: { inline_keyboard: [[{ text: '✅ Complete', callback_data: `order_complete:${orderId}` }]] }
    });
}

app.post('/admin/orders/:id/confirm', async (req, res) => {
    try {
        const orderId = req.params.id;
        const ok = await updateOrderStatus(orderId, 'live');
        if (!ok) return res.status(404).json({ error: 'Order not found' });
        const order = await fetchOrderByPublicId(orderId);
        if (order) {
            const lines = formatOrderLines(order);
            const newText = lines.join('\n') + '\n\nStatus: Order is being prepared';
            updateOrderTelegramMessageWithComplete(orderId, newText);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to confirm order' });
    }
});

app.post('/admin/orders/:id/decline', async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await fetchOrderByPublicId(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        await updateOrderStatus(orderId, 'deleted');
        const lines = formatOrderLines(order);
        const newText = lines.join('\n') + '\n\n🔴 Status: Deleted';
        updateOrderTelegramMessage(orderId, newText, true);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

app.post('/admin/orders/:id/complete', async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await fetchOrderByPublicId(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        await updateOrderStatus(orderId, 'completed');
        const lines = formatOrderLines(order);
        const newText = lines.join('\n') + '\n\nStatus: Order completed';
        updateOrderTelegramMessage(orderId, newText, true);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to complete order' });
    }
});

app.post('/admin/orders', async (req, res) => {
    try {
        const { name, phone, communication, items = [], status } = req.body || {};
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'At least one item is required' });
        }

        const sanitizedItems = items
            .filter(item => item && (item.dish_id || item.dishId) && Number.isFinite(Number(item.quantity)) && Number.isFinite(Number(item.price)))
            .map(item => ({
                dish_id: String(item.dish_id || item.dishId).trim(),
                quantity: Number(item.quantity),
                price: Number(item.price)
            }))
            .filter(item => item.dish_id && item.quantity > 0 && item.price >= 0);

        if (sanitizedItems.length === 0) {
            return res.status(400).json({ error: 'All items must include dish_id, quantity (>0), and price (>=0)' });
        }

        const total = sanitizedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
        const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        await insertOrderWithItems({
            id: orderId,
            name: name || '',
            phone: phone || '',
            communication: communication || '',
            items: sanitizedItems,
            total,
            status: status || 'unconfirmed'
        });

        const order = await fetchOrderByPublicId(orderId);
        res.json({ success: true, order });
    } catch (error) {
        console.error('Error creating admin order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

app.put('/admin/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        if (!orderId) return res.status(400).json({ error: 'order id is required' });
        const updated = await updateOrderRecord(orderId, req.body || {});
        if (!updated) {
            return res.status(404).json({ error: 'Order not found or no changes applied' });
        }
        res.json({ success: true, order: updated });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: error.message || 'Failed to update order' });
    }
});

app.delete('/admin/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        if (!orderId) return res.status(400).json({ error: 'order id is required' });
        const updated = await updateOrderRecord(orderId, { status: 'deleted' });
        if (!updated) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ success: true, order: updated });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

app.post('/admin/clear-history', async (req, res) => {
    try {
        const cleared = await clearOrdersHistoryInDb();
        res.json({ success: cleared });
    } catch (e) {
        res.status(500).json({ error: 'Failed to clear history' });
    }
});

app.post('/admin/clear-bookings-history', async (req, res) => {
    try {
        await db.query(`DELETE FROM bookings WHERE status = 'deleted'`);
        res.json({ success: true });
    } catch (e) {
        console.error('Clear bookings history error:', e);
        res.status(500).json({ error: 'Failed to clear bookings history' });
    }
});

function formatOrderLines(order) {
    const lines = ['🍔 Order', ''];
    if (order.name) lines.push(`Name: ${order.name}`);
    if (order.phone) lines.push(`Phone: ${order.phone}`);
    if (order.communication) lines.push(`Contact: ${order.communication}`);
    if (order.name || order.phone || order.communication) lines.push('');
    (order.items || []).forEach((item, i) => {
        lines.push(`${item.quantity}x - ${i + 1}.${item.name}`);
    });
    lines.push('');
    lines.push(`Total: ${(order.total || 0).toFixed(2)} THB`);
    return lines;
}

// DELETE /admin/booking/:id - Mark booking as deleted (red row) instead of removing
app.delete('/admin/booking/:id', async (req, res) => {
    try {
        const bookingId = req.params.id;
        const success = await markBookingAsDeleted(bookingId);
        
        if (success) {
            updateTelegramBookingMessage(bookingId, 'deleted');
            res.json({ success: true, message: 'Booking marked as deleted (row colored red)' });
        } else {
            res.status(404).json({ success: false, error: 'Booking not found' });
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ success: false, error: 'Failed to delete booking' });
    }
});

// GET /admin/available-rooms - Get available rooms for a date range
app.get('/admin/available-rooms', async (req, res) => {
    try {
        const { roomType, checkIn, checkOut, excludeBookingId } = req.query;
        
        if (!roomType || !checkIn || !checkOut) {
            return res.status(400).json({ error: 'roomType, checkIn, and checkOut are required' });
        }
        
        if (roomType !== 'big' && roomType !== 'small') {
            return res.status(400).json({ error: 'roomType must be "big" or "small"' });
        }
        
        // Get all bookings
        const allBookings = await readBookingsFromDb();
        
        // Get all rooms for this type
        const allRooms = ROOM_INVENTORY[roomType].rooms;
        
        console.log(`Available rooms check: roomType=${roomType}, checkIn=${checkIn}, checkOut=${checkOut}`);
        console.log(`Total bookings from database: ${allBookings.length}`);
        console.log(`Total rooms for ${roomType}: ${allRooms.length}`, allRooms);
        
        // If no bookings at all, all rooms are available
        if (!allBookings || allBookings.length === 0) {
            console.log('No bookings found - all rooms are available');
            return res.json({ 
                availableRooms: allRooms,
                totalRooms: allRooms.length,
                bookedRooms: []
            });
        }
        
        // Get dates in the range
        const dates = getDatesBetween(checkIn, checkOut);
        console.log(`Requested dates:`, dates);
        
        // Find which rooms are booked for any date in this range
        const bookedRooms = new Set();
        let checkedBookings = 0;
        let skippedBookings = 0;
        
        allBookings.forEach(booking => {
            if (excludeBookingId && booking.id === excludeBookingId) {
                return; // Exclude this booking (e.g. when editing)
            }
            // Skip unconfirmed and deleted bookings
            const status = booking.status || 'active'; // Default to active if status is missing
            if (status === 'unconfirmed' || status === 'deleted') {
                skippedBookings++;
                console.log(`Skipping booking ${booking.id}: status=${status}`);
                return;
            }
            
            // Only check bookings of the same room type
            if (!booking.roomType || booking.roomType !== roomType) {
                return;
            }
            
            checkedBookings++;
            
            // Check if booking overlaps with the requested dates
            if (!booking.checkIn || !booking.checkOut) {
                console.log(`Booking ${booking.id} missing dates, skipping`);
                return;
            }
            
            const bookingDates = getDatesBetween(booking.checkIn, booking.checkOut);
            const hasOverlap = dates.some(date => bookingDates.includes(date));
            
            if (hasOverlap) {
                console.log(`Booking ${booking.id} overlaps: roomId=${booking.roomId || 'null'}, roomType=${booking.roomType}, status=${status}`);
                if (booking.roomId) {
                    // Specific room booking - mark this room as booked
                    bookedRooms.add(booking.roomId);
                } else {
                    // General booking (any room of this type) - mark all as booked
                    console.log(`General booking - marking all ${roomType} rooms as booked`);
                    allRooms.forEach(room => bookedRooms.add(room));
                }
            }
        });
        
        console.log(`Checked ${checkedBookings} bookings, skipped ${skippedBookings} bookings`);
        console.log(`Total rooms: ${allRooms.length}, Booked rooms: ${Array.from(bookedRooms).length}`);
        
        // Available rooms are those not in bookedRooms
        const availableRooms = allRooms.filter(room => !bookedRooms.has(room));
        
        console.log(`Available rooms: ${availableRooms.length}`, availableRooms);
        
        res.json({ 
            availableRooms: availableRooms,
            totalRooms: allRooms.length,
            bookedRooms: Array.from(bookedRooms)
        });
    } catch (error) {
        console.error('Error getting available rooms:', error);
        res.status(500).json({ error: 'Failed to get available rooms' });
    }
});

// POST /admin/confirm-booking/:id - Confirm an unconfirmed booking with room assignment
app.post('/admin/confirm-booking/:id', async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { roomId } = req.body;
        
        if (!roomId) {
            return res.status(400).json({ success: false, error: 'roomId is required' });
        }
        
        console.log('Confirming booking:', bookingId, 'with room:', roomId);
        
        const success = await updateBookingStatus(bookingId, 'confirmed', roomId);
        
        if (success) {
            updateTelegramBookingMessage(bookingId, 'confirmed');
            res.json({ success: true, message: 'Booking confirmed successfully' });
        } else {
            res.status(404).json({ success: false, error: 'Booking not found' });
        }
    } catch (error) {
        console.error('Error confirming booking:', error);
        res.status(500).json({ success: false, error: 'Failed to confirm booking' });
    }
});

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '8426189458:AAH9B4ezmtN-MRj5sSnAUbzqvyLjmUEl28o';
const TELEGRAM_CHAT_ID = '747453534';
const TELEGRAM_ADMIN_CHAT_IDS = [TELEGRAM_CHAT_ID];
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const TELEGRAM_API_URL = `${TELEGRAM_API_BASE}/sendMessage`;

// Helper function to get all dates between check-in and check-out
function getDatesBetween(checkIn, checkOut) {
    const dates = [];
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    
    // If check-in and check-out are the same (single day booking), include that date
    if (start.toISOString().split('T')[0] === end.toISOString().split('T')[0]) {
        dates.push(start.toISOString().split('T')[0]);
        return dates;
    }
    
    // Exclude check-out date (guest leaves on that day)
    const current = new Date(start);
    while (current < end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    
    return dates;
}

async function getAvailableRooms(roomType, checkIn, checkOut) {
    const allBookings = await readBookingsFromDb();
    const allRooms = ROOM_INVENTORY[roomType]?.rooms || [];
    if (!allRooms.length) return [];
    if (!allBookings?.length) return [...allRooms];
    const dates = getDatesBetween(checkIn, checkOut);
    const bookedRooms = new Set();
    allBookings.forEach((b) => {
        const status = b.status || 'active';
        if (status === 'unconfirmed' || status === 'deleted') return;
        if (!b.roomType || b.roomType !== roomType) return;
        if (!b.checkIn || !b.checkOut) return;
        const bookingDates = getDatesBetween(b.checkIn, b.checkOut);
        const hasOverlap = dates.some(d => bookingDates.includes(d));
        if (hasOverlap) {
            if (b.roomId) bookedRooms.add(b.roomId);
            else allRooms.forEach(r => bookedRooms.add(r));
        }
    });
    return allRooms.filter(r => !bookedRooms.has(r));
}

// Room inventory configuration
const ROOM_INVENTORY = {
    big: {
        total: 3,
        rooms: ['21', '31', '41']
    },
    small: {
        total: 9,
        rooms: ['22', '23', '32', '33', '42', '43', '51', '52', '53']
    }
};

// Room capacity configuration (for backward compatibility)
const ROOM_CAPACITY = {
    big: ROOM_INVENTORY.big.total,
    small: ROOM_INVENTORY.small.total
};

// Helper: Get room type from roomId
const BIG_ROOM_IDS = ['21', '31', '41'];
function getRoomTypeFromId(roomId) {
    const id = String(roomId);
    if (BIG_ROOM_IDS.includes(id)) return 'big';
    if (id.startsWith('big-')) return 'big';
    return 'small';
}

// Room prices per night (Bath) - same as frontend
const ROOM_PRICES = { small: 700, big: 900 };
const ROOM_MONTHLY_PRICES = { small: 16000, big: 19000 };

function calcNightsAndTotal(checkIn, checkOut, roomType) {
    const start = new Date(checkIn + 'T00:00:00');
    const end = new Date(checkOut + 'T00:00:00');
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const pricePerNight = ROOM_PRICES[roomType] || 0;
    let total = pricePerNight * nights;

    const monthlyPrice = ROOM_MONTHLY_PRICES[roomType];
    if (monthlyPrice) {
        const fullMonths = Math.floor(nights / 30);
        const remainingDays = nights % 30;
        if (fullMonths > 0) {
            total = (fullMonths * monthlyPrice) + (remainingDays * pricePerNight);
        }
    }

    return { nights, pricePerNight, total };
}

// POST /admin/book-room - Admin marks room as unavailable
app.post('/admin/book-room', async (req, res) => {
    try {
        console.log('POST /admin/book-room - Request received');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        
        const { roomId, checkIn, checkOut } = req.body;
        
        if (!roomId || !checkIn || !checkOut) {
            console.log('Missing required fields');
            return res.status(400).json({ success: false, error: 'roomId, checkIn, and checkOut are required' });
        }
        
        // Validate dates
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        
        if (checkOutDate <= checkInDate) {
            console.log('Invalid date range');
            return res.status(400).json({ success: false, error: 'Check-out date must be after check-in date' });
        }
        
        const roomType = getRoomTypeFromId(roomId);
        console.log('Room type:', roomType);
        
        // Validate roomId exists in inventory
        if (!ROOM_INVENTORY[roomType].rooms.includes(roomId)) {
            console.log('Invalid roomId:', roomId);
            return res.status(400).json({ success: false, error: 'Invalid roomId' });
        }
        
        // Create a single booking for the date range
        const booking = {
            id: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            roomType: roomType,
            roomId: roomId,
            checkIn: checkIn,
            checkOut: checkOut,
            source: 'admin',
            createdAt: new Date().toISOString()
        };
        
        console.log('Created booking object:', JSON.stringify(booking, null, 2));
        console.log('Calling insertBookingRecord...');
        
        const success = await insertBookingRecord(booking);
        
        console.log('insertBookingRecord returned:', success);
        
        if (success) {
            console.log('Booking saved successfully, sending success response');
            res.json({ 
                success: true, 
                message: `Marked ${roomId} as unavailable from ${checkIn} to ${checkOut}`,
                booking: booking
            });
        } else {
            console.error('Failed to save booking to database');
            res.status(500).json({ success: false, error: 'Failed to save booking. Check server console for details.' });
        }
    } catch (error) {
        console.error('Error creating admin booking:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ success: false, error: 'Server error: ' + error.message });
    }
});

// DELETE /admin/book-room - Admin removes unavailability (marks as deleted)
app.delete('/admin/book-room', async (req, res) => {
    try {
        const { roomId, checkIn, checkOut } = req.body;
        
        if (!roomId || !checkIn || !checkOut) {
            return res.status(400).json({ success: false, error: 'roomId, checkIn, and checkOut are required' });
        }
        
        // Read bookings and find matching ones
        const allBookings = await readBookingsFromDb();
        const matchingBookings = allBookings.filter(booking => {
            return booking.roomId === roomId && 
                   booking.source === 'admin' &&
                   booking.checkIn === checkIn &&
                   booking.checkOut === checkOut;
        });
        
        if (matchingBookings.length === 0) {
            return res.status(404).json({ success: false, error: 'No matching bookings found' });
        }
        
        // Mark all matching bookings as deleted
        let removed = 0;
        for (const booking of matchingBookings) {
            const success = await markBookingAsDeleted(booking.id);
            if (success) removed++;
        }
        
        res.json({ 
            success: true, 
            message: `Marked ${removed} booking(s) as deleted for ${roomId} from ${checkIn} to ${checkOut}`,
            removed: removed
        });
    } catch (error) {
        console.error('Error removing booking:', error);
        res.status(500).json({ success: false, error: 'Failed to remove booking' });
    }
});

function readTelegramMessages() {
    try {
        if (fs.existsSync(TELEGRAM_MESSAGES_FILE)) {
            return JSON.parse(fs.readFileSync(TELEGRAM_MESSAGES_FILE, 'utf8'));
        }
    } catch (e) { /* ignore */ }
    return {};
}

function saveTelegramMessage(bookingId, chatId, messageId, text) {
    const m = readTelegramMessages();
    m[bookingId] = { chatId, messageId, text };
    fs.writeFileSync(TELEGRAM_MESSAGES_FILE, JSON.stringify(m, null, 2));
}

// Food orders storage - { orders: [{ id, items, total, name, phone, communication, status, createdAt }] }
// status: 'unconfirmed' | 'live' | 'completed' | 'deleted'
async function readOrders() {
    try {
        const result = await db.query(`
            SELECT 
                o.id,
                o.public_id,
                o.customer_name,
                o.customer_phone,
                o.communication,
                o.status,
                o.total,
                o.created_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'dish_id', oi.dish_id,
                            'name', COALESCE(mi.name, oi.dish_id),
                            'quantity', oi.quantity,
                            'price', oi.price,
                            'subtotal', oi.subtotal
                        )
                    ) FILTER (WHERE oi.id IS NOT NULL),
                    '[]'
                ) AS items
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id = o.id
            LEFT JOIN menu_items mi ON mi.dish_id = oi.dish_id
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `);
        return {
            orders: result.rows.map(row => ({
                id: row.public_id,
                items: row.items || [],
                total: row.total,
                name: row.customer_name || '',
                phone: row.customer_phone || '',
                communication: row.communication || '',
                status: normalizeOrderStatus(row.status),
                createdAt: row.created_at ? row.created_at.toISOString() : null
            }))
        };
    } catch (error) {
        console.error('Error reading orders from database:', error);
        return { orders: [] };
    }
}

async function fetchOrderByPublicId(orderId) {
    const result = await db.query(
        `SELECT 
            o.id,
            o.public_id,
            o.customer_name,
            o.customer_phone,
            o.communication,
            o.status,
            o.total,
            o.created_at,
            COALESCE(
                json_agg(
                    json_build_object(
                        'dish_id', oi.dish_id,
                        'name', COALESCE(mi.name, oi.dish_id),
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'subtotal', oi.subtotal
                    )
                ) FILTER (WHERE oi.id IS NOT NULL),
                '[]'
            ) AS items
         FROM orders o
         LEFT JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN menu_items mi ON mi.dish_id = oi.dish_id
         WHERE o.public_id = $1
         GROUP BY o.id`,
        [orderId]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
        id: row.public_id,
        items: row.items || [],
        total: row.total,
        name: row.customer_name || '',
        phone: row.customer_phone || '',
        communication: row.communication || '',
        status: normalizeOrderStatus(row.status),
        createdAt: row.created_at ? row.created_at.toISOString() : null
    };
}

async function clearOrdersHistoryInDb() {
    try {
        await db.query(`UPDATE orders SET status = 'deleted' WHERE status = 'declined'`);
        await db.query(`DELETE FROM orders WHERE status IN ('completed', 'deleted')`);
        return true;
    } catch (error) {
        console.error('Failed to clear order history:', error);
        return false;
    }
}

async function insertOrderWithItems(orderPayload) {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const { id, name, phone, communication, items, total, status } = orderPayload;
        const normalizedStatus = normalizeOrderStatus(status, 'unconfirmed');
        const orderResult = await client.query(
            `INSERT INTO orders (public_id, customer_name, customer_phone, communication, total, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, public_id, created_at`,
            [id, name || '', phone || '', communication || '', total, normalizedStatus]
        );
        const orderDbId = orderResult.rows[0].id;
        for (const item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, dish_id, quantity, price)
                 VALUES ($1, $2, $3, $4)`,
                [orderDbId, item.dish_id || item.dishId, item.quantity, item.price]
            );
        }
        await client.query('COMMIT');
        return {
            id: orderResult.rows[0].public_id,
            createdAt: orderResult.rows[0].created_at,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function updateOrderRecord(orderId, updates = {}) {
    const client = await db.pool.connect();
    try {
        if (!orderId) return null;
        await client.query('BEGIN');

        const existingRes = await client.query('SELECT id FROM orders WHERE public_id = $1', [orderId]);
        if (existingRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return null;
        }
        const orderDbId = existingRes.rows[0].id;

        const setParts = [];
        const values = [];
        const pushField = (dbField, value) => {
            setParts.push(`${dbField} = $${values.length + 1}`);
            values.push(value);
        };

        if (typeof updates.name === 'string') {
            pushField('customer_name', updates.name.trim());
        }
        if (typeof updates.phone === 'string') {
            pushField('customer_phone', updates.phone.trim());
        }
        if (typeof updates.communication === 'string') {
            pushField('communication', updates.communication.trim());
        }
        if (typeof updates.status === 'string') {
            pushField('status', ensureOrderStatus(updates.status));
        }

        let itemsProvided = Array.isArray(updates.items);
        let computedTotal = null;

        if (itemsProvided) {
            const sanitizedItems = updates.items
                .filter(item => item && (item.dish_id || item.dishId) && Number.isFinite(Number(item.quantity)) && Number.isFinite(Number(item.price)))
                .map(item => ({
                    dish_id: String(item.dish_id || item.dishId).trim(),
                    quantity: Number(item.quantity),
                    price: Number(item.price)
                }))
                .filter(item => item.dish_id && item.quantity > 0 && item.price >= 0);

            if (sanitizedItems.length === 0) {
                throw new Error('Items array must include at least one valid item with dish_id');
            }

            updates.items = sanitizedItems;
            computedTotal = sanitizedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
            pushField('total', computedTotal);
        } else if (updates.total !== undefined) {
            const totalNum = Number(updates.total);
            if (!Number.isFinite(totalNum) || totalNum < 0) {
                throw new Error('Total must be a non-negative number');
            }
            pushField('total', totalNum);
        }

        if (setParts.length > 0) {
            values.push(orderId);
            await client.query(
                `UPDATE orders
                 SET ${setParts.join(', ')}
                 WHERE public_id = $${values.length}`,
                values
            );
        }

        if (itemsProvided) {
            await client.query('DELETE FROM order_items WHERE order_id = $1', [orderDbId]);
            for (const item of updates.items) {
                await client.query(
                    `INSERT INTO order_items (order_id, dish_id, quantity, price)
                     VALUES ($1, $2, $3, $4)`,
                    [orderDbId, item.dish_id, item.quantity, item.price]
                );
            }
        }

        await client.query('COMMIT');
        return await fetchOrderByPublicId(orderId);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating order:', error);
        return null;
    } finally {
        client.release();
    }
}

ensureMenuSeeded()
    .then(syncMenuImagesFromDisk)
    .catch(err => console.error('Failed to seed menu items:', err));

// Orders helpers






function readOrderTelegramMessages() {
    try {
        if (fs.existsSync(TELEGRAM_ORDER_MESSAGES_FILE)) {
            return JSON.parse(fs.readFileSync(TELEGRAM_ORDER_MESSAGES_FILE, 'utf8'));
        }
    } catch (e) { /* ignore */ }
    return {};
}

function saveOrderTelegramMessage(orderId, chatId, messageId) {
    const m = readOrderTelegramMessages();
    m[orderId] = { chatId, messageId };
    fs.writeFileSync(TELEGRAM_ORDER_MESSAGES_FILE, JSON.stringify(m, null, 2));
}

// Helper function to send Telegram message with inline Confirm/Delete buttons
function sendTelegramMessage(roomType, checkIn, checkOut, guests, name, surname, phone, bookingId) {
    const roomTypeText = roomType === 'big' ? 'Big room' : 'Small room';
    const { nights, pricePerNight, total } = calcNightsAndTotal(checkIn, checkOut, roomType);
    
    const message = `📢 New Booking
Room: ${roomTypeText}
Check-in: ${checkIn}
Check-out: ${checkOut}
Nights: ${nights}
Price per night: ${pricePerNight} Bath
Total: ${total} Bath
Guests: ${guests}
Name: ${name}
Surname: ${surname}
Phone: ${phone}`;
    
    const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        text: message
    };
    if (bookingId) {
        payload.reply_markup = {
            inline_keyboard: [
                [{ text: '✅ Confirm', callback_data: `confirm:${bookingId}` }, { text: '❌ Delete', callback_data: `delete:${bookingId}` }]
            ]
        };
    }
    const data = JSON.stringify(payload);
    
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    };
    
    const req = https.request(TELEGRAM_API_URL, options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
            try {
                const result = JSON.parse(responseData);
                if (result.ok && bookingId && result.result?.message_id) {
                    saveTelegramMessage(bookingId, TELEGRAM_CHAT_ID, result.result.message_id, message);
                } else if (!result.ok) {
                    console.log('Telegram API error:', result);
                }
            } catch (e) { /* ignore */ }
        });
    });
    req.on('error', (e) => console.log('Failed to send Telegram message:', e));
    req.write(data);
    req.end();
}

function updateTelegramBookingMessage(bookingId, newStatus) {
    const m = readTelegramMessages()[bookingId];
    if (!m || !m.text) return;
    const baseText = (m.text || '').replace(/\n\n[✅❌] Status: .+$/, '').trim();
    const newText = baseText + '\n\n' + (newStatus === 'confirmed' ? '✅ ' : '❌ ') + `Status: ${newStatus}`;
    telegramApiRequest('editMessageText', {
        chat_id: m.chatId,
        message_id: m.messageId,
        text: newText,
        reply_markup: { inline_keyboard: [] }
    });
}

// Telegram webhook: handle callback_query (Confirm/Delete buttons)
app.post('/telegram-webhook', (req, res) => {
    res.status(200).send();
    const update = req.body;
    if (update?.callback_query) processTelegramCallback(update.callback_query);
    else if (update?.message?.text) processTelegramMessage(update.message);
});

function telegramApiRequest(method, body) {
    const url = new URL(`${TELEGRAM_API_BASE}/${method}`);
    const data = JSON.stringify(body);
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    };
    const req = https.request(url, options, (res) => {
        let buf = '';
        res.on('data', (c) => { buf += c; });
        res.on('end', () => {
            try {
                const r = JSON.parse(buf);
                if (!r.ok) console.log('Telegram API error:', r);
            } catch (e) { /* ignore */ }
        });
    });
    req.on('error', (e) => console.log('Telegram request error:', e));
    req.write(data);
    req.end();
}

function telegramApiRequestAsync(method, body) {
    return new Promise((resolve) => {
        const url = new URL(`${TELEGRAM_API_BASE}/${method}`);
        const data = JSON.stringify(body);
        const options = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
        const req = https.request(url, options, (res) => {
            let buf = '';
            res.on('data', (c) => { buf += c; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(buf));
                } catch (e) {
                    resolve({ ok: false });
                }
            });
        });
        req.on('error', () => resolve({ ok: false }));
        req.write(data);
        req.end();
    });
}

async function processTelegramMessage(msg) {
    const text = (msg?.text || '').trim();
    const chatId = msg?.chat?.id;
    if (!chatId || !TELEGRAM_ADMIN_CHAT_IDS.includes(String(chatId))) return;

    if (text === '#bookings') {
        const allBookings = await readBookingsFromDb();
        const activeBookings = allBookings.filter(b => (b.status || '') !== 'deleted');
        if (activeBookings.length === 0) {
            telegramApiRequest('sendMessage', { chat_id: chatId, text: 'No active bookings.' });
            return;
        }
        const lines = ['📋 Active Bookings\n'];
        activeBookings.sort((a, b) => (a.checkIn || '').localeCompare(b.checkIn || ''));
        activeBookings.forEach((b, i) => {
            const roomTypeText = (b.roomType || '').toLowerCase() === 'big' ? 'Big room' : 'Small room';
            const roomInfo = b.roomId ? ` · ${b.roomId}` : '';
            const { nights, total } = calcNightsAndTotal(b.checkIn, b.checkOut, b.roomType || 'small');
            const nameStr = [b.name, b.surname].filter(Boolean).join(' ') || '—';
            const statusStr = b.status === 'confirmed' ? '✅' : b.status === 'unconfirmed' ? '⏳' : '';
            lines.push(`${i + 1}. ${roomTypeText}${roomInfo} · ${b.checkIn} → ${b.checkOut}`);
            lines.push(`   ${nameStr} · ${nights} nights · ${total} Bath ${statusStr}`);
            lines.push('');
        });
        const reply = lines.join('\n').trim();
        telegramApiRequest('sendMessage', { chat_id: chatId, text: reply });
    } else if (text === '#unconfirm') {
        const allBookings = await readBookingsFromDb();
        const unconfirmed = allBookings.filter(b => (b.status || '') === 'unconfirmed');
        if (unconfirmed.length === 0) {
            telegramApiRequest('sendMessage', { chat_id: chatId, text: 'No bookings waiting for confirmation.' });
            return;
        }
        const lines = ['⏳ Bookings Waiting for Confirmation\n'];
        unconfirmed.sort((a, b) => (a.checkIn || '').localeCompare(b.checkIn || ''));
        unconfirmed.forEach((b, i) => {
            const roomTypeText = (b.roomType || '').toLowerCase() === 'big' ? 'Big room' : 'Small room';
            const { nights, total } = calcNightsAndTotal(b.checkIn, b.checkOut, b.roomType || 'small');
            const nameStr = [b.name, b.surname].filter(Boolean).join(' ') || '—';
            lines.push(`${i + 1}. ${roomTypeText} · ${b.checkIn} → ${b.checkOut}`);
            lines.push(`   ${nameStr} · ${nights} nights · ${total} Bath`);
            lines.push(`   Phone: ${b.phone || '—'}`);
            lines.push('');
        });
        const reply = lines.join('\n').trim();
        telegramApiRequest('sendMessage', { chat_id: chatId, text: reply });
    } else if (text === '#orders') {
        const data = await readOrders();
        const live = data.orders.filter(o => o.status === 'live');
        if (live.length === 0) {
            telegramApiRequest('sendMessage', { chat_id: chatId, text: '🛒 No live orders.' });
            return;
        }
        const lines = ['🛒 Live Orders\n'];
        live.forEach((o, i) => {
            lines.push(`${i + 1}. ${o.name || '—'} · ${o.phone || '—'}`);
            (o.items || []).forEach(it => lines.push(`   ${it.quantity}x ${it.name}`));
            lines.push(`   Total: ${(o.total || 0).toFixed(2)} THB`);
            lines.push('');
        });
        telegramApiRequest('sendMessage', { chat_id: chatId, text: lines.join('\n').trim() });
    } else if (text === '#2confirm') {
        const data = await readOrders();
        const unconfirmed = data.orders.filter(o => o.status === 'unconfirmed');
        if (unconfirmed.length === 0) {
            telegramApiRequest('sendMessage', { chat_id: chatId, text: '⏳ No orders waiting for confirmation.' });
            return;
        }
        const lines = ['⏳ Orders to Confirm\n'];
        unconfirmed.forEach((o, i) => {
            lines.push(`${i + 1}. ${o.name || '—'} · ${o.phone || '—'}`);
            (o.items || []).forEach(it => lines.push(`   ${it.quantity}x ${it.name}`));
            lines.push(`   Total: ${(o.total || 0).toFixed(2)} THB · ID: ${o.id}`);
            lines.push('');
        });
        telegramApiRequest('sendMessage', { chat_id: chatId, text: lines.join('\n').trim() });
    } else if (text === '#allorders') {
        const data = await readOrders();
        const history = data.orders.filter(o => o.status === 'completed' || o.status === 'deleted');
        if (history.length === 0) {
            telegramApiRequest('sendMessage', { chat_id: chatId, text: '📋 No order history.' });
            return;
        }
        const lines = ['📋 All Orders History\n'];
        history.slice(0, 20).forEach((o, i) => {
            const st = o.status === 'completed' ? '✅' : '❌';
            lines.push(`${i + 1}. ${st} ${o.name || '—'} · ${(o.total || 0).toFixed(2)} THB`);
        });
        if (history.length > 20) lines.push(`\n... and ${history.length - 20} more`);
        telegramApiRequest('sendMessage', { chat_id: chatId, text: lines.join('\n').trim() });
    } else if (text === '#allbookings') {
        const allBookings = await readBookingsFromDb();
        if (allBookings.length === 0) {
            telegramApiRequest('sendMessage', { chat_id: chatId, text: '📋 No booking history.' });
            return;
        }
        const lines = ['📋 All Bookings History\n'];
        allBookings.slice(0, 20).forEach((b, i) => {
            const roomTypeText = (b.roomType || '').toLowerCase() === 'big' ? 'Big' : 'Small';
            const nameStr = [b.name, b.surname].filter(Boolean).join(' ') || '—';
            const st = b.status === 'confirmed' ? '✅' : b.status === 'deleted' ? '❌' : '⏳';
            lines.push(`${i + 1}. ${st} ${roomTypeText} · ${b.checkIn} · ${nameStr}`);
        });
        if (allBookings.length > 20) lines.push(`\n... and ${allBookings.length - 20} more`);
        telegramApiRequest('sendMessage', { chat_id: chatId, text: lines.join('\n').trim() });
    }
}

async function processTelegramCallback(cb) {
    const chatId = cb.message?.chat?.id;
    if (!TELEGRAM_ADMIN_CHAT_IDS.includes(String(chatId))) {
        telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id, text: 'Not authorized' });
        return;
    }
    const data = String(cb.data || '');
    const parts = data.split(':');
    const action = parts[0];
    const id = parts[1];
    const roomId = parts[2];

    if (!id) return;

    // Order callbacks
    const orderId = id;
    if (action === 'order_confirm') {
        const ok = await updateOrderStatus(orderId, 'live');
        const order = await fetchOrderByPublicId(orderId);
        if (ok && order) {
            const lines = formatOrderLines(order);
            const newText = lines.join('\n') + '\n\nStatus: Order is being prepared';
            updateOrderTelegramMessageWithComplete(orderId, newText);
            telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id, text: 'Order confirmed' });
        } else {
            telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id, text: 'Order not found' });
        }
        return;
    }
    if (action === 'order_decline') {
        const order = await fetchOrderByPublicId(orderId);
        if (!order) {
            telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id, text: 'Order not found' });
            return;
        }
        await updateOrderStatus(orderId, 'deleted');
        const lines = formatOrderLines(order);
        const newText = lines.join('\n') + '\n\n🔴 Status: Deleted';
        updateOrderTelegramMessage(orderId, newText, true);
        telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id, text: 'Order deleted' });
        return;
    }
    if (action === 'order_complete') {
        const order = await fetchOrderByPublicId(orderId);
        if (!order) {
            telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id, text: 'Order not found' });
            return;
        }
        await updateOrderStatus(orderId, 'completed');
        const lines = formatOrderLines(order);
        const newText = lines.join('\n') + '\n\nStatus: Order completed';
        updateOrderTelegramMessage(orderId, newText, true);
        telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id, text: 'Order completed' });
        return;
    }

    // Booking callbacks
    const bookingId = id;
    if (action === 'confirm') {
        const allBookings = await readBookingsFromDb();
        const booking = allBookings.find(b => b.id === bookingId);
        if (!booking || !booking.roomType || !booking.checkIn || !booking.checkOut) {
            telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id, text: 'Booking not found' });
            return;
        }
        const availableRooms = await getAvailableRooms(booking.roomType, booking.checkIn, booking.checkOut);
        if (availableRooms.length === 0) {
            telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id, text: 'No rooms available' });
            return;
        }
        const roomButtons = availableRooms.map(r => ({ text: r, callback_data: `room:${bookingId}:${r}` }));
        const keyboard = [];
        for (let i = 0; i < roomButtons.length; i += 2) {
            keyboard.push(roomButtons.slice(i, i + 2));
        }
        keyboard.push([{ text: '❌ Cancel', callback_data: `cancel:${bookingId}` }]);
        telegramApiRequest('editMessageText', {
            chat_id: chatId,
            message_id: cb.message.message_id,
            text: (cb.message.text || '') + '\n\n🏠 Choose room:',
            reply_markup: { inline_keyboard: keyboard }
        });
        telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id });
        return;
    }

    if (action === 'cancel') {
        const baseText = (cb.message.text || '').replace(/\n\n🏠 Choose room:.*$/, '').trim();
        telegramApiRequest('editMessageText', {
            chat_id: chatId,
            message_id: cb.message.message_id,
            text: baseText,
            reply_markup: { inline_keyboard: [[{ text: '✅ Confirm', callback_data: `confirm:${bookingId}` }, { text: '❌ Delete', callback_data: `delete:${bookingId}` }]] }
        });
        telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id });
        return;
    }

    if (action === 'room' && roomId) {
        const success = await updateBookingStatus(bookingId, 'confirmed', roomId);
        const statusText = success ? `Status: confirmed (${roomId})` : 'Update failed';
        const msg = cb.message;
        const emoji = success ? '✅' : '❌';
        const baseText = (msg.text || '').replace(/\n\n🏠 Choose room:[\s\S]*$/, '');
        const newText = baseText + '\n\n' + `${emoji} ${statusText}`;
        telegramApiRequest('editMessageText', {
            chat_id: chatId,
            message_id: msg.message_id,
            text: newText,
            reply_markup: { inline_keyboard: [] }
        });
        telegramApiRequest('answerCallbackQuery', {
            callback_query_id: cb.id,
            text: success ? `Confirmed with ${roomId}` : 'Failed to update'
        });
        return;
    }

    if (action === 'delete') {
        const success = await updateBookingStatus(bookingId, 'deleted');
        const statusText = success ? `Status: deleted` : 'Update failed';
        const msg = cb.message;
        const emoji = success ? '❌' : '❌';
        const baseText = (msg.text || '').replace(/\n\n🏠 Choose room:[\s\S]*$/, '').replace(/\n\n[✅❌] Status: .+$/, '').trim();
        const newText = baseText + '\n\n' + `${emoji} ${statusText}`;
        telegramApiRequest('editMessageText', {
            chat_id: chatId,
            message_id: msg.message_id,
            text: newText,
            reply_markup: { inline_keyboard: [] }
        });
        telegramApiRequest('answerCallbackQuery', {
            callback_query_id: cb.id,
            text: success ? `Booking deleted` : 'Failed to update'
        });
        return;
    }
}

function startTelegramPolling() {
    let offset = 0;
    const poll = async () => {
        try {
            const r = await telegramApiRequestAsync('getUpdates', { offset, timeout: 25 });
            if (!r.ok || !r.result) return;
            for (const u of r.result) {
                offset = u.update_id + 1;
                if (u.callback_query) processTelegramCallback(u.callback_query);
                else if (u.message?.text) processTelegramMessage(u.message);
            }
        } catch (e) { /* ignore */ }
    };
    poll();
    setInterval(poll, 500);
}

// Helper function to send food order to Telegram with Confirm/Decline buttons
function sendFoodOrderTelegramMessage(items, total, customerName, customerPhone, communication, orderId) {
    const now = new Date();
    const dateTimeStr = now.toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(/\//g, '-');
    
    let lines = ['🍔 New Order', ''];
    if (customerName) lines.push(`Name: ${customerName}`);
    if (customerPhone) lines.push(`Phone: ${customerPhone}`);
    if (communication) lines.push(`Contact: ${communication}`);
    if (customerName || customerPhone || communication) lines.push('');
    items.forEach((item, i) => {
        lines.push(`${item.quantity}x - ${i + 1}.${item.name}`);
    });
    lines.push('');
    lines.push(`Total: ${total.toFixed(2)} THB`);
    lines.push('');
    lines.push(dateTimeStr);
    
    const message = lines.join('\n');
    
    const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        text: message
    };
    if (orderId) {
        payload.reply_markup = {
            inline_keyboard: [
                [{ text: '✅ Confirm', callback_data: `order_confirm:${orderId}` }, { text: '❌ Delete', callback_data: `order_decline:${orderId}` }]
            ]
        };
    }
    const data = JSON.stringify(payload);
    
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    };
    
    const req = https.request(TELEGRAM_API_URL, options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
            try {
                const result = JSON.parse(responseData);
                if (result.ok && orderId && result.result?.message_id) {
                    saveOrderTelegramMessage(orderId, TELEGRAM_CHAT_ID, result.result.message_id);
                } else if (!result.ok) {
                    console.log('Telegram food order API error:', result);
                }
            } catch (e) {
                console.log('Telegram food order response parse error:', e);
            }
        });
    });
    
    req.on('error', (error) => {
        console.log('Failed to send Telegram food order:', error);
    });
    
    req.write(data);
    req.end();
}

// POST /api/order-food - Receive order, save with status unconfirmed, send to Telegram
app.post('/api/order-food', async (req, res) => {
    try {
        const { items, name: customerName, phone: customerPhone, communication } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Items array is required' });
        }

        let total = 0;
        const validItems = items.filter(item => {
            const dishId = item?.dish_id || item?.dishId;
            if (!item || !dishId || typeof item.quantity !== 'number' || typeof item.price !== 'number') {
                return false;
            }
            total += item.price * item.quantity;
            return true;
        }).map(item => ({
            dish_id: String(item.dish_id || item.dishId).trim(),
            quantity: item.quantity,
            price: item.price
        }));

        if (validItems.length === 0) {
            return res.status(400).json({ success: false, error: 'No valid order items (each item needs dish_id, quantity, price)' });
        }

        const orderId = 'ord_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
        const orderRecord = {
            id: orderId,
            items: validItems,
            total: Math.round(total),
            name: customerName || '',
            phone: customerPhone || '',
            communication: communication || '',
            status: 'unconfirmed'
        };

        await insertOrderWithItems(orderRecord);

        const order = await fetchOrderByPublicId(orderId);
        const itemsForTelegram = (order?.items || validItems).map(it => ({
            ...it,
            name: it.name || it.dish_id || 'Unknown'
        }));

        const commLabels = { phone: 'Phone call', whatsapp: 'WhatsApp', telegram: 'Telegram', line: 'Line' };
        const commLabel = commLabels[communication] || communication || '';
        sendFoodOrderTelegramMessage(itemsForTelegram, total, customerName, customerPhone, commLabel, orderId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error processing food order:', error);
        res.status(500).json({ success: false, error: 'Failed to process order' });
    }
});

// GET /booked-dates - Returns unavailable dates for a specific room type
app.get('/booked-dates', async (req, res) => {
    try {
        const roomType = req.query.roomType;
        
        // Validate room type
        if (!roomType || (roomType !== 'big' && roomType !== 'small')) {
            return res.status(400).json({ 
                error: 'Invalid or missing roomType parameter. Must be "big" or "small"' 
            });
        }
        
        const capacity = ROOM_INVENTORY[roomType].total;
        const roomIds = ROOM_INVENTORY[roomType].rooms;
        
        // Read bookings
        const bookings = await readBookingsFromDb();
        
        // Count bookings per date for this room type
        const bookingsPerDate = {};
        
        bookings.forEach(booking => {
            if (booking.roomType === roomType) {
                const dates = getDatesBetween(booking.checkIn, booking.checkOut);
                
                dates.forEach(date => {
                    if (!bookingsPerDate[date]) {
                        bookingsPerDate[date] = {
                            bookedRooms: new Set(),
                            userBookings: 0
                        };
                    }
                    
                    if (booking.roomId) {
                        // Admin booking with specific room
                        bookingsPerDate[date].bookedRooms.add(booking.roomId);
                    } else {
                        // User booking (no specific room assigned)
                        bookingsPerDate[date].userBookings++;
                    }
                });
            }
        });
        
        // Find dates where all rooms are booked
        const unavailableDates = [];
        Object.keys(bookingsPerDate).forEach(date => {
            const dateData = bookingsPerDate[date];
            const bookedCount = dateData.bookedRooms.size + dateData.userBookings;
            
            // If booked rooms + user bookings >= capacity, date is unavailable
            if (bookedCount >= capacity) {
                unavailableDates.push(date);
            }
        });
        
        // Return sorted array of unavailable dates
        res.json(unavailableDates.sort());
    } catch (error) {
        console.error('Error getting booked dates:', error);
        res.status(500).json({ error: 'Failed to read bookings' });
    }
});

// Auto-delete expired bookings (mark as deleted in database)
async function cleanupExpiredBookings() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const allBookings = await readBookingsFromDb();
        
        let removed = 0;
        for (const booking of allBookings) {
            // Mark expired bookings as deleted (checkout date has passed)
            if (booking.checkOut < today && booking.status !== 'deleted') {
                const success = await markBookingAsDeleted(booking.id);
                if (success) removed++;
            }
        }
        
        if (removed > 0) {
            console.log(`Marked ${removed} expired booking(s) as deleted in database`);
        }
    } catch (error) {
        console.error('Error cleaning up expired bookings:', error);
    }
}

// Cleanup expired bookings every hour
setInterval(() => {
    cleanupExpiredBookings().catch(err => console.error('Cleanup error:', err));
}, 60 * 60 * 1000);

// Run cleanup on server start
cleanupExpiredBookings().catch(err => console.error('Initial cleanup error:', err));

// POST /book-room - Save booking and send Telegram message
app.post('/book-room', async (req, res) => {
    try {
        const { roomType, checkIn, checkOut, guests, name, surname, phone } = req.body;
        
        if (!roomType || !checkIn || !checkOut || !guests || !name || !surname || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const normalizedRoomType = String(roomType).toLowerCase();
        if (!['small', 'big'].includes(normalizedRoomType)) {
            return res.status(400).json({ success: false, error: 'Invalid room type' });
        }

        const guestsCount = Number(guests);
        if (!Number.isFinite(guestsCount) || guestsCount <= 0) {
            return res.status(400).json({ success: false, error: 'Guests must be a positive number' });
        }

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        if (isNaN(checkInDate.valueOf()) || isNaN(checkOutDate.valueOf()) || checkOutDate <= checkInDate) {
            return res.status(400).json({ success: false, error: 'Invalid date range' });
        }
        
        // Create booking object with unconfirmed status
        const booking = {
            id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            roomType: normalizedRoomType,
            roomId: null, // User bookings don't have specific room assigned
            checkIn: checkInDate.toISOString().split('T')[0],
            checkOut: checkOutDate.toISOString().split('T')[0],
            guests: guestsCount,
            name: (name || '').trim(),
            surname: (surname || '').trim(),
            phone,
            source: 'user',
            createdAt: new Date().toISOString(),
            status: 'unconfirmed' // User bookings start as unconfirmed
        };
        
        const success = await insertBookingRecord(booking);
        
        if (!success) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to save booking' 
            });
        }
        
        // Send Telegram message with inline buttons
        sendTelegramMessage(roomType, checkIn, checkOut, guests, name, surname, phone, booking.id);
        
        // Return success
        res.json({ success: true });
    } catch (error) {
        console.error('Error creating user booking:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error: ' + error.message 
        });
    }
});

// ============================
// MENU MANAGEMENT FUNCTIONS
// ============================

// Load menu items from database
async function loadMenuItemsFromDb() {
    try {
        await ensureMenuSeeded();
        const result = await db.query(
            `SELECT dish_id, category, name, price, image_path
             FROM menu_items
             ORDER BY display_order, id`
        );
        return result.rows.map(row => ({
            id: row.dish_id,
            category: row.category,
            name: row.name,
            price: row.price,
            image: row.image_path ? `/api/menu-images/${path.basename(row.image_path)}` : null
        }));
    } catch (error) {
        console.error('Error loading menu from database:', error);
        return [];
    }
}

async function updateMenuItemRecord(dishId, newName, newPrice) {
    try {
        const result = await db.query(
            `UPDATE menu_items
             SET name = $2, price = $3
             WHERE dish_id = $1`,
            [dishId, newName, newPrice]
        );
        if (result.rowCount === 0) {
            return { success: false, error: 'Dish not found' };
        }
        return { success: true };
    } catch (error) {
        console.error('Error updating menu item:', error);
        return { success: false, error: error.message };
    }
}

// ============================
// MENU API ENDPOINTS
// ============================

// Menu cache
let menuCache = null;
let menuCacheTime = 0;
const MENU_CACHE_DURATION = 60000; // Cache for 60 seconds

// Clear menu cache (call this when menu is updated)
function clearMenuCache() {
    menuCache = null;
    menuCacheTime = 0;
}

// GET /api/menu - Get all menu items (with caching)
app.get('/api/menu', async (req, res) => {
    try {
        const now = Date.now();
        
        // Return cached menu if available and not expired
        if (menuCache && (now - menuCacheTime) < MENU_CACHE_DURATION) {
            return res.json(menuCache);
        }
        
        // Parse menu and cache it
        const menuItems = await loadMenuItemsFromDb();
        menuCache = menuItems;
        menuCacheTime = now;
        
        res.json(menuItems);
    } catch (error) {
        console.error('Error getting menu:', error);
        res.status(500).json({ error: 'Failed to load menu' });
    }
});

// POST /api/menu/:id/image - Upload/update image for a dish (admin only)
app.post('/api/menu/:id/image', (req, res, next) => {
    // Check both session and localStorage token for cross-window auth
    if (req.session && req.session.authenticated) {
        return next();
    }
    // Allow if localStorage token exists (set by admin panel)
    const authToken = req.headers['x-auth-token'];
    if (authToken) {
        // Token exists, allow request (basic check)
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
}, upload.single('image'), async (req, res) => {
    try {
        const dishId = req.params.id;

        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const existing = await db.query('SELECT image_path FROM menu_items WHERE dish_id = $1', [dishId]);
        if (existing.rowCount === 0) {
            return res.status(404).json({ error: 'Dish not found' });
        }

        const previousImage = existing.rows[0].image_path;
        if (previousImage) {
            const previousPath = path.join(MENU_IMAGES_DIR, previousImage);
            if (fs.existsSync(previousPath)) {
                fs.unlink(previousPath, () => {});
            }
        }

        await db.query(
            'UPDATE menu_items SET image_path = $2 WHERE dish_id = $1',
            [dishId, req.file.filename]
        );

        clearMenuCache();

        res.json({
            success: true,
            imageUrl: `/api/menu-images/${req.file.filename}`
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to upload image: ' + error.message });
    }
});

// Mount menu API routes - using Router ensures DELETE is properly matched
const menuApiRouter = express.Router();

const menuAuth = (req, res, next) => {
    if (req.session && req.session.authenticated) return next();
    if (req.headers['x-auth-token']) return next();
    return res.status(401).json({ error: 'Unauthorized' });
};

menuApiRouter.delete('/:id', menuAuth, async (req, res) => {
    try {
        const dishId = req.params.id;
        const result = await db.query(
            'DELETE FROM menu_items WHERE dish_id = $1 RETURNING image_path',
            [dishId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Dish not found' });
        }

        const imagePath = result.rows[0].image_path;
        if (imagePath) {
            const fullPath = path.join(MENU_IMAGES_DIR, imagePath);
            if (fs.existsSync(fullPath)) {
                fs.unlink(fullPath, () => {});
            }
        }

        clearMenuCache();

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ error: 'Failed to delete dish' });
    }
});

app.use('/api/menu', menuApiRouter);

// PUT /api/menu/:id - Update dish name and price (admin only)
app.put('/api/menu/:id', (req, res, next) => {
    // Check both session and localStorage token for cross-window auth
    if (req.session && req.session.authenticated) {
        return next();
    }
    // Allow if localStorage token exists (set by admin panel)
    const authToken = req.headers['x-auth-token'];
    if (authToken) {
        // Token exists, allow request (basic check)
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
}, async (req, res) => {
    try {
        const dishId = req.params.id;
        const { name, price } = req.body;

        if (!name || price === undefined || price === null) {
            return res.status(400).json({ error: 'Name and price are required' });
        }

        const priceNum = parseFloat(price);
        if (isNaN(priceNum)) {
            return res.status(400).json({ error: 'Invalid price' });
        }

        const result = await updateMenuItemRecord(dishId, name, priceNum);
        
        if (result.success) {
            // Clear menu cache when menu is updated
            clearMenuCache();
            res.json({ success: true });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ error: 'Failed to update menu item' });
    }
});

// Serve menu images statically
app.use('/api/menu-images', express.static(MENU_IMAGES_DIR));

// Serve static files from the parent directory (AFTER all API routes)
app.use(express.static(path.join(__dirname, '..')));

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${PORT}`);
    startTelegramPolling();
    // Parse menu on startup
    loadMenuItemsFromDb()
        .then(items => {
            console.log(`Menu loaded: ${items.length} items`);
        })
        .catch(err => console.error('Failed to preload menu items:', err));
});













