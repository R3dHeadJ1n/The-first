// Hotel Booking Backend Server
// Simple Node.js + Express server with in-memory storage

const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');
const session = require('express-session');
const ExcelJS = require('exceljs');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = 3001;

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

// Excel file path for storing bookings
const BOOKINGS_FILE = path.join(__dirname, 'bookings.xlsx');

// Excel file operations
async function initializeExcelFile() {
    const workbook = new ExcelJS.Workbook();
    
    // Check if file exists
    if (fs.existsSync(BOOKINGS_FILE)) {
        try {
            await workbook.xlsx.readFile(BOOKINGS_FILE);
            // Verify worksheet exists
            let worksheet = workbook.getWorksheet('Bookings');
            if (!worksheet) {
                // Create worksheet if it doesn't exist
                worksheet = workbook.addWorksheet('Bookings');
                worksheet.columns = [
                    { header: 'ID', key: 'id', width: 30 },
                    { header: 'Room Type', key: 'roomType', width: 15 },
                    { header: 'Room ID', key: 'roomId', width: 15 },
                    { header: 'Check-in', key: 'checkIn', width: 15 },
                    { header: 'Check-out', key: 'checkOut', width: 15 },
                    { header: 'Guests', key: 'guests', width: 10 },
                    { header: 'Phone', key: 'phone', width: 20 },
                    { header: 'Source', key: 'source', width: 15 },
                    { header: 'Created At', key: 'createdAt', width: 25 },
                    { header: 'Status', key: 'status', width: 10 }
                ];
                
                // Style header row
                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE0E0E0' }
                };
            }
        } catch (readError) {
            console.error('Error reading Excel file, creating new one:', readError);
            // If file is corrupted, create new one
            const worksheet = workbook.addWorksheet('Bookings');
            worksheet.columns = [
                { header: 'ID', key: 'id', width: 30 },
                { header: 'Room Type', key: 'roomType', width: 15 },
                { header: 'Room ID', key: 'roomId', width: 15 },
                { header: 'Check-in', key: 'checkIn', width: 15 },
                { header: 'Check-out', key: 'checkOut', width: 15 },
                { header: 'Guests', key: 'guests', width: 10 },
                { header: 'Phone', key: 'phone', width: 20 },
                { header: 'Source', key: 'source', width: 15 },
                { header: 'Created At', key: 'createdAt', width: 25 },
                { header: 'Status', key: 'status', width: 10 }
            ];
            
            // Style header row
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
        }
    } else {
        // Create new workbook with headers
        const worksheet = workbook.addWorksheet('Bookings');
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 30 },
            { header: 'Room Type', key: 'roomType', width: 15 },
            { header: 'Room ID', key: 'roomId', width: 15 },
            { header: 'Check-in', key: 'checkIn', width: 15 },
            { header: 'Check-out', key: 'checkOut', width: 15 },
            { header: 'Guests', key: 'guests', width: 10 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'Source', key: 'source', width: 15 },
            { header: 'Created At', key: 'createdAt', width: 25 },
            { header: 'Status', key: 'status', width: 10 }
        ];
        
        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };
    }
    
    return workbook;
}

// Read all bookings from Excel (excluding deleted ones)
async function readBookingsFromExcel() {
    try {
        console.log('Reading bookings from Excel file:', BOOKINGS_FILE);
        const workbook = await initializeExcelFile();
        const worksheet = workbook.getWorksheet('Bookings');
        
        if (!worksheet) {
            console.error('Worksheet "Bookings" not found');
            return [];
        }
        
        const bookings = [];
        let rowCount = 0;
        
        // Start from row 2 (skip header)
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            rowCount++;
            if (rowNumber === 1) {
                console.log('Header row found');
                return; // Skip header
            }
            
            try {
                // Read by column index (more reliable than keys)
                const status = row.getCell(10).value; // Status column (10th column, 1-indexed)
                // Skip deleted bookings (status = 'deleted')
                if (status === 'deleted') {
                    console.log(`Row ${rowNumber}: Skipping deleted booking`);
                    return;
                }
                
                const booking = {
                    id: row.getCell(1).value,           // ID
                    roomType: row.getCell(2).value,     // Room Type
                    roomId: row.getCell(3).value,        // Room ID
                    checkIn: row.getCell(4).value,       // Check-in
                    checkOut: row.getCell(5).value,      // Check-out
                    guests: row.getCell(6).value || null, // Guests
                    phone: row.getCell(7).value || null, // Phone
                    source: row.getCell(8).value,        // Source
                    createdAt: row.getCell(9).value,     // Created At
                    status: status || 'active'
                };
                
                console.log(`Row ${rowNumber}: Found booking:`, booking.id, booking.roomId, booking.checkIn);
                bookings.push(booking);
            } catch (rowError) {
                console.error(`Error reading row ${rowNumber}:`, rowError);
            }
        });
        
        console.log(`Active bookings found: ${bookings.length}`);
        return bookings;
    } catch (error) {
        console.error('Error reading bookings from Excel:', error);
        console.error('Error stack:', error.stack);
        return [];
    }
}

// Add a new booking to Excel
async function addBookingToExcel(booking) {
    try {
        console.log('addBookingToExcel called with:', JSON.stringify(booking, null, 2));
        const workbook = await initializeExcelFile();
        let worksheet = workbook.getWorksheet('Bookings');
        
        if (!worksheet) {
            console.error('Worksheet "Bookings" not found after initialization');
            return false;
        }
        
        // Ensure columns are defined (important for existing files)
        if (!worksheet.columns || worksheet.columns.length === 0) {
            console.log('Setting up columns for worksheet');
            worksheet.columns = [
                { header: 'ID', key: 'id', width: 30 },
                { header: 'Room Type', key: 'roomType', width: 15 },
                { header: 'Room ID', key: 'roomId', width: 15 },
                { header: 'Check-in', key: 'checkIn', width: 15 },
                { header: 'Check-out', key: 'checkOut', width: 15 },
                { header: 'Guests', key: 'guests', width: 10 },
                { header: 'Phone', key: 'phone', width: 20 },
                { header: 'Source', key: 'source', width: 15 },
                { header: 'Created At', key: 'createdAt', width: 25 },
                { header: 'Status', key: 'status', width: 10 }
            ];
        }
        
        // Add new row using column indices (more reliable)
        const newRow = worksheet.addRow([]);
        newRow.getCell(1).value = booking.id;
        newRow.getCell(2).value = booking.roomType;
        newRow.getCell(3).value = booking.roomId || '';
        newRow.getCell(4).value = booking.checkIn;
        newRow.getCell(5).value = booking.checkOut;
        newRow.getCell(6).value = booking.guests || '';
        newRow.getCell(7).value = booking.phone || '';
        newRow.getCell(8).value = booking.source;
        newRow.getCell(9).value = booking.createdAt;
        newRow.getCell(10).value = booking.status || 'active';
        
        // Style the new row
        newRow.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });
        
        console.log('Writing to Excel file:', BOOKINGS_FILE);
        console.log('Row count before write:', worksheet.rowCount);
        console.log('Worksheet name:', worksheet.name);
        console.log('Number of columns:', worksheet.columnCount);
        
        // Write the file
        try {
            await workbook.xlsx.writeFile(BOOKINGS_FILE);
            console.log('File write completed successfully');
        } catch (writeError) {
            console.error('Error during file write:', writeError);
            throw writeError;
        }
        
        // Verify file was written
        if (fs.existsSync(BOOKINGS_FILE)) {
            const stats = fs.statSync(BOOKINGS_FILE);
            console.log('File exists, size:', stats.size, 'bytes');
        } else {
            console.error('ERROR: File was not created!');
            return false;
        }
        
        // Re-read to verify
        const verifyWorkbook = new ExcelJS.Workbook();
        await verifyWorkbook.xlsx.readFile(BOOKINGS_FILE);
        const verifyWorksheet = verifyWorkbook.getWorksheet('Bookings');
        console.log('Verification - Row count after write:', verifyWorksheet ? verifyWorksheet.rowCount : 'worksheet not found');
        
        console.log('Successfully added booking to Excel:', booking.id);
        return true;
    } catch (error) {
        console.error('Error adding booking to Excel:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Booking data:', JSON.stringify(booking, null, 2));
        console.error('File path:', BOOKINGS_FILE);
        
        // Check if file is locked (common issue on Windows)
        if (error.message && (error.message.includes('EBUSY') || error.message.includes('locked'))) {
            console.error('File is locked. Make sure bookings.xlsx is not open in Excel.');
        }
        
        // Check if directory exists
        const dir = path.dirname(BOOKINGS_FILE);
        if (!fs.existsSync(dir)) {
            console.error('Directory does not exist:', dir);
        }
        return false;
    }
}

// Update booking status in Excel (optionally update roomId)
async function updateBookingStatus(bookingId, newStatus, roomId = null) {
    try {
        const workbook = await initializeExcelFile();
        const worksheet = workbook.getWorksheet('Bookings');
        
        // Find the row with matching ID
        let found = false;
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header
            
            // Check ID column (1st column)
            if (row.getCell(1).value === bookingId) {
                // Update status in Status column (10th column)
                row.getCell(10).value = newStatus;
                
                // If roomId is provided, update it in Room ID column (3rd column)
                if (roomId !== null) {
                    row.getCell(3).value = roomId;
                }
                
                // If marking as deleted, change row background color to red
                if (newStatus === 'deleted') {
                    row.eachCell((cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFF0000' } // Red
                        };
                    });
                } else if (newStatus === 'confirmed') {
                    // If confirming, change row background color to green
                    row.eachCell((cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FF00FF00' } // Green
                        };
                    });
                } else {
                    // Remove any background color for other statuses
                    row.eachCell((cell) => {
                        cell.fill = null;
                    });
                }
                
                found = true;
            }
        });
        
        if (found) {
            await workbook.xlsx.writeFile(BOOKINGS_FILE);
            return true;
        }
        
        return false;
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
        const allBookings = await readBookingsFromExcel();
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
        res.status(500).json({ error: 'Failed to read bookings from Excel' });
    }
});

// GET /admin/unconfirmed-bookings - Get all unconfirmed user bookings
app.get('/admin/unconfirmed-bookings', async (req, res) => {
    try {
        console.log('GET /admin/unconfirmed-bookings - Request received');
        const allBookings = await readBookingsFromExcel();
        
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
        res.status(500).json({ error: 'Failed to read bookings from Excel' });
    }
});

// DELETE /admin/booking/:id - Mark booking as deleted (red row) instead of removing
app.delete('/admin/booking/:id', async (req, res) => {
    try {
        const bookingId = req.params.id;
        const success = await markBookingAsDeleted(bookingId);
        
        if (success) {
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
        const { roomType, checkIn, checkOut } = req.query;
        
        if (!roomType || !checkIn || !checkOut) {
            return res.status(400).json({ error: 'roomType, checkIn, and checkOut are required' });
        }
        
        if (roomType !== 'big' && roomType !== 'small') {
            return res.status(400).json({ error: 'roomType must be "big" or "small"' });
        }
        
        // Get all bookings
        const allBookings = await readBookingsFromExcel();
        
        // Get all rooms for this type
        const allRooms = ROOM_INVENTORY[roomType].rooms;
        
        console.log(`Available rooms check: roomType=${roomType}, checkIn=${checkIn}, checkOut=${checkOut}`);
        console.log(`Total bookings from Excel: ${allBookings.length}`);
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
            res.json({ success: true, message: 'Booking confirmed successfully' });
        } else {
            res.status(404).json({ success: false, error: 'Booking not found' });
        }
    } catch (error) {
        console.error('Error confirming booking:', error);
        res.status(500).json({ success: false, error: 'Failed to confirm booking' });
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
        console.log('Calling addBookingToExcel...');
        
        // Add to Excel
        const success = await addBookingToExcel(booking);
        
        console.log('addBookingToExcel returned:', success);
        
        if (success) {
            console.log('Booking saved successfully, sending success response');
            res.json({ 
                success: true, 
                message: `Marked ${roomId} as unavailable from ${checkIn} to ${checkOut}`,
                booking: booking
            });
        } else {
            console.error('Failed to save booking to Excel');
            res.status(500).json({ success: false, error: 'Failed to save booking to Excel. Check server console for details.' });
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
        const allBookings = await readBookingsFromExcel();
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
        
        // Read bookings from Excel
        const bookings = await readBookingsFromExcel();
        
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
        res.status(500).json({ error: 'Failed to read bookings from Excel' });
    }
});

// Auto-delete expired bookings (mark as deleted in Excel)
async function cleanupExpiredBookings() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const allBookings = await readBookingsFromExcel();
        
        let removed = 0;
        for (const booking of allBookings) {
            // Mark expired bookings as deleted (checkout date has passed)
            if (booking.checkOut < today && booking.status !== 'deleted') {
                const success = await markBookingAsDeleted(booking.id);
                if (success) removed++;
            }
        }
        
        if (removed > 0) {
            console.log(`Marked ${removed} expired booking(s) as deleted in Excel`);
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
        const { roomType, checkIn, checkOut, guests, phone } = req.body;
        
        // Validate required fields
        if (!roomType || !checkIn || !checkOut || !guests || !phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }
        
        // Create booking object with unconfirmed status
        const booking = {
            id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            roomType,
            roomId: null, // User bookings don't have specific room assigned
            checkIn,
            checkOut,
            guests,
            phone,
            source: 'user',
            createdAt: new Date().toISOString(),
            status: 'unconfirmed' // User bookings start as unconfirmed
        };
        
        // Save booking to Excel
        const success = await addBookingToExcel(booking);
        
        if (!success) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to save booking to Excel' 
            });
        }
        
        // Send Telegram message
        sendTelegramMessage(roomType, checkIn, checkOut, guests, phone);
        
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

// Start server
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
