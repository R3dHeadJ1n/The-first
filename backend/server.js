// Hotel Booking Backend Server
// Simple Node.js + Express server with in-memory storage

const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors()); // Allow frontend to make requests
app.use(express.json()); // Parse JSON request bodies

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '8426189458:AAH9B4ezmtN-MRj5sSnAUbzqvyLjmUEl28o';
const TELEGRAM_CHAT_ID = '747453534';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

// In-memory storage for bookings
let bookings = [];

// Helper function to get all dates between check-in and check-out
function getDatesBetween(checkIn, checkOut) {
    const dates = [];
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    
    // Exclude check-out date (guest leaves on that day)
    const current = new Date(start);
    while (current < end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    
    return dates;
}

// Room capacity configuration
const ROOM_CAPACITY = {
    big: 1,
    small: 8
};

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
    
    const capacity = ROOM_CAPACITY[roomType];
    
    // Count bookings per date for this room type
    const bookingsPerDate = {};
    
    bookings.forEach(booking => {
        // Only count bookings of the requested room type
        if (booking.roomType === roomType) {
            const dates = getDatesBetween(booking.checkIn, booking.checkOut);
            dates.forEach(date => {
                bookingsPerDate[date] = (bookingsPerDate[date] || 0) + 1;
            });
        }
    });
    
    // Find dates where all rooms are booked (booked count >= capacity)
    const unavailableDates = [];
    Object.keys(bookingsPerDate).forEach(date => {
        if (bookingsPerDate[date] >= capacity) {
            unavailableDates.push(date);
        }
    });
    
    // Return sorted array of unavailable dates
    res.json(unavailableDates.sort());
});

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
