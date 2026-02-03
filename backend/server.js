// Hotel Booking Backend Server
// Simple Node.js + Express server with in-memory storage

const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 3001;

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

// In-memory storage for bookings (must be declared before routes that use it)
let bookings = [];

// Admin routes - define BEFORE static middleware to take precedence
// Admin page route - serve admin.html
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

// Also support /admin.html for convenience
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

// Test endpoint to verify server is running
app.get('/admin/test', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
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

// GET /admin/bookings - Get all admin bookings (must be before static middleware)
app.get('/admin/bookings', (req, res) => {
    console.log('GET /admin/bookings - Request received');
    console.log('Total bookings:', bookings.length);
    
    // Ensure bookings array exists
    if (!bookings || !Array.isArray(bookings)) {
        console.error('Bookings array is not initialized!');
        return res.status(500).json({ error: 'Bookings array not initialized' });
    }
    
    const adminBookings = bookings.filter(booking => booking.source === 'admin');
    console.log('Admin bookings found:', adminBookings.length);
    
    // Sort by check-in date, then by room
    adminBookings.sort((a, b) => {
        if (a.checkIn !== b.checkIn) {
            return a.checkIn.localeCompare(b.checkIn);
        }
        return a.roomId.localeCompare(b.roomId);
    });
    
    res.json(adminBookings);
});

// DELETE /admin/booking/:id - Delete a specific booking by ID (must be before static middleware)
app.delete('/admin/booking/:id', (req, res) => {
    const bookingId = req.params.id;
    const initialLength = bookings.length;
    
    bookings = bookings.filter(booking => booking.id !== bookingId);
    
    const removed = initialLength - bookings.length;
    if (removed > 0) {
        res.json({ success: true, message: 'Booking deleted successfully' });
    } else {
        res.status(404).json({ success: false, error: 'Booking not found' });
    }
});

// Serve static files from the parent directory (where HTML files are located)
// This should be AFTER specific routes to avoid conflicts
app.use(express.static(path.join(__dirname, '..')));

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '8426189458:AAH9B4ezmtN-MRj5sSnAUbzqvyLjmUEl28o';
const TELEGRAM_CHAT_ID = '747453534';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

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

// Room inventory configuration
const ROOM_INVENTORY = {
    big: {
        total: 3,
        rooms: ['big-1', 'big-2', 'big-3']
    },
    small: {
        total: 8,
        rooms: ['small-1', 'small-2', 'small-3', 'small-4', 'small-5', 'small-6', 'small-7', 'small-8']
    }
};

// Room capacity configuration (for backward compatibility)
const ROOM_CAPACITY = {
    big: ROOM_INVENTORY.big.total,
    small: ROOM_INVENTORY.small.total
};

// Helper: Get room type from roomId
function getRoomTypeFromId(roomId) {
    return roomId.startsWith('big-') ? 'big' : 'small';
}

// POST /admin/book-room - Admin marks room as unavailable
app.post('/admin/book-room', (req, res) => {
    const { roomId, checkIn, checkOut } = req.body;
    
    if (!roomId || !checkIn || !checkOut) {
        return res.status(400).json({ success: false, error: 'roomId, checkIn, and checkOut are required' });
    }
    
    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (checkOutDate <= checkInDate) {
        return res.status(400).json({ success: false, error: 'Check-out date must be after check-in date' });
    }
    
    const roomType = getRoomTypeFromId(roomId);
    
    // Validate roomId exists in inventory
    if (!ROOM_INVENTORY[roomType].rooms.includes(roomId)) {
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
    
    bookings.push(booking);
    
    res.json({ 
        success: true, 
        message: `Marked ${roomId} as unavailable from ${checkIn} to ${checkOut}`,
        booking: booking
    });
});

// DELETE /admin/book-room - Admin removes unavailability
app.delete('/admin/book-room', (req, res) => {
    const { roomId, checkIn, checkOut } = req.body;
    
    if (!roomId || !checkIn || !checkOut) {
        return res.status(400).json({ success: false, error: 'roomId, checkIn, and checkOut are required' });
    }
    
    // Remove bookings matching roomId, checkIn, checkOut, and source='admin'
    const initialLength = bookings.length;
    bookings = bookings.filter(booking => {
        if (booking.roomId === roomId && 
            booking.source === 'admin' &&
            booking.checkIn === checkIn &&
            booking.checkOut === checkOut) {
            return false; // Remove this booking
        }
        return true; // Keep this booking
    });
    
    const removed = initialLength - bookings.length;
    res.json({ 
        success: true, 
        message: `Removed unavailability for ${roomId} from ${checkIn} to ${checkOut}`,
        removed: removed
    });
});

// Helper function to send Telegram message
function sendTelegramMessage(roomType, checkIn, checkOut, guests, phone) {
    // Format room type
    const roomTypeText = roomType === 'big' ? 'Big room' : 'Small room';
    
    // Format message
    const message = `📢 New Booking
Room: ${roomTypeText}
Check-in: ${checkIn}
Check-out: ${checkOut}
Guests: ${guests}
Phone: ${phone}`;
    
    // Send to Telegram
    const data = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message
    });
    
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    const req = https.request(TELEGRAM_API_URL, options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
            responseData += chunk;
        });
        res.on('end', () => {
            const result = JSON.parse(responseData);
            if (!result.ok) {
                console.log('Telegram API error:', result);
            }
        });
    });
    
    req.on('error', (error) => {
        console.log('Failed to send Telegram message:', error);
    });
    
    req.write(data);
    req.end();
}

// GET /booked-dates - Returns unavailable dates for a specific room type
app.get('/booked-dates', (req, res) => {
    const roomType = req.query.roomType;
    
    // Validate room type
    if (!roomType || (roomType !== 'big' && roomType !== 'small')) {
        return res.status(400).json({ 
            error: 'Invalid or missing roomType parameter. Must be "big" or "small"' 
        });
    }
    
    const capacity = ROOM_INVENTORY[roomType].total;
    const roomIds = ROOM_INVENTORY[roomType].rooms;
    
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
});

// Auto-delete expired bookings (run on server start and periodically)
function cleanupExpiredBookings() {
    const today = new Date().toISOString().split('T')[0];
    const initialLength = bookings.length;
    
    bookings = bookings.filter(booking => {
        // Keep bookings that haven't reached checkout date yet
        return booking.checkOut >= today;
    });
    
    const removed = initialLength - bookings.length;
    if (removed > 0) {
        console.log(`Cleaned up ${removed} expired booking(s)`);
    }
}

// Cleanup expired bookings every hour
setInterval(cleanupExpiredBookings, 60 * 60 * 1000);
// Run cleanup on server start
cleanupExpiredBookings();

// POST /book-room - Save booking and send Telegram message
app.post('/book-room', (req, res) => {
    const { roomType, checkIn, checkOut, guests, phone } = req.body;
    
    // Validate required fields
    if (!roomType || !checkIn || !checkOut || !guests || !phone) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields' 
        });
    }
    
    // Save booking to memory
    const booking = {
        roomType,
        checkIn,
        checkOut,
        guests,
        phone
    };
    
    bookings.push(booking);
    
    // Send Telegram message
    sendTelegramMessage(roomType, checkIn, checkOut, guests, phone);
    
    // Return success
    res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
