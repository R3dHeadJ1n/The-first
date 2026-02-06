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
const multer = require('multer');

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

// Menu file paths
const MENU_FILE = path.join(__dirname, 'menu.xlsx');
const MENU_IMAGES_DIR = path.join(__dirname, 'uploads', 'menu');
const MENU_IMAGES_MAPPING_FILE = path.join(__dirname, 'menu-images.json');
const TELEGRAM_MESSAGES_FILE = path.join(__dirname, 'telegram-messages.json');
const FOOD_ORDERS_FILE = path.join(__dirname, 'food-orders.json');
const FOOD_ORDERS_EXCEL_FILE = path.join(__dirname, 'orders.xlsx');
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
                    { header: 'Status', key: 'status', width: 10 },
                    { header: 'Name', key: 'name', width: 20 },
                    { header: 'Surname', key: 'surname', width: 20 }
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
                { header: 'Status', key: 'status', width: 10 },
                { header: 'Name', key: 'name', width: 20 },
                { header: 'Surname', key: 'surname', width: 20 }
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
            { header: 'Status', key: 'status', width: 10 },
            { header: 'Name', key: 'name', width: 20 },
            { header: 'Surname', key: 'surname', width: 20 }
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
                    status: status || 'active',
                    name: (row.getCell(11) && row.getCell(11).value) ? String(row.getCell(11).value) : null,
                    surname: (row.getCell(12) && row.getCell(12).value) ? String(row.getCell(12).value) : null
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
                { header: 'Status', key: 'status', width: 10 },
                { header: 'Name', key: 'name', width: 20 },
                { header: 'Surname', key: 'surname', width: 20 }
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
        newRow.getCell(11).value = booking.name || '';
        newRow.getCell(12).value = booking.surname || '';
        
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

// Orders API (admin)
app.get('/admin/orders/unconfirmed', (req, res) => {
    try {
        const data = readOrders();
        const list = data.orders.filter(o => o.status === 'unconfirmed');
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load orders' });
    }
});

app.get('/admin/orders/live', (req, res) => {
    try {
        const data = readOrders();
        const list = data.orders.filter(o => o.status === 'live');
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load orders' });
    }
});

app.get('/admin/orders/all', (req, res) => {
    try {
        const data = readOrders();
        const list = data.orders.filter(o => o.status === 'completed' || o.status === 'declined');
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load orders' });
    }
});

app.get('/admin/bookings/all', async (req, res) => {
    try {
        const allBookings = await readBookingsFromExcel();
        allBookings.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        res.json(allBookings);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load bookings' });
    }
});

function updateOrderStatus(orderId, newStatus) {
    const data = readOrders();
    const order = data.orders.find(o => o.id === orderId);
    if (!order) return false;
    order.status = newStatus;
    saveOrders(data);
    updateOrderStatusInExcel(orderId, newStatus).catch(e => console.error('Excel update error:', e));
    return true;
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

app.post('/admin/orders/:id/confirm', (req, res) => {
    try {
        const orderId = req.params.id;
        const ok = updateOrderStatus(orderId, 'live');
        if (!ok) return res.status(404).json({ error: 'Order not found' });
        const data = readOrders();
        const order = data.orders.find(o => o.id === orderId);
        const lines = formatOrderLines(order);
        const newText = lines.join('\n') + '\n\n✅ Status: Order is being prepared';
        updateOrderTelegramMessageWithComplete(orderId, newText);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to confirm order' });
    }
});

app.post('/admin/orders/:id/decline', (req, res) => {
    try {
        const orderId = req.params.id;
        const data = readOrders();
        const order = data.orders.find(o => o.id === orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        updateOrderStatus(orderId, 'declined');
        const lines = formatOrderLines(order);
        const newText = lines.join('\n') + '\n\n❌ Status: Declined';
        updateOrderTelegramMessage(orderId, newText, true);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to decline order' });
    }
});

app.post('/admin/orders/:id/complete', (req, res) => {
    try {
        const orderId = req.params.id;
        const data = readOrders();
        const order = data.orders.find(o => o.id === orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        updateOrderStatus(orderId, 'completed');
        const lines = formatOrderLines(order);
        const newText = lines.join('\n') + '\n\n✅ Status: Order completed';
        updateOrderTelegramMessage(orderId, newText, true);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to complete order' });
    }
});

app.post('/admin/clear-history', (req, res) => {
    try {
        const data = readOrders();
        data.orders = data.orders.filter(o => o.status === 'unconfirmed' || o.status === 'live');
        saveOrders(data);
        clearOrdersHistoryInExcel().catch(e => console.error('Excel clear error:', e));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to clear history' });
    }
});

app.post('/admin/clear-bookings-history', async (req, res) => {
    try {
        const workbook = await initializeExcelFile();
        const worksheet = workbook.getWorksheet('Bookings');
        if (!worksheet) return res.status(500).json({ error: 'Worksheet not found' });
        const rowsToRemove = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return;
            const status = row.getCell(10).value;
            if (status === 'deleted') rowsToRemove.push(rowNumber);
        });
        for (let i = rowsToRemove.length - 1; i >= 0; i--) {
            worksheet.spliceRows(rowsToRemove[i], 1);
        }
        await workbook.xlsx.writeFile(BOOKINGS_FILE);
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
    const allBookings = await readBookingsFromExcel();
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

function calcNightsAndTotal(checkIn, checkOut, roomType) {
    const start = new Date(checkIn + 'T00:00:00');
    const end = new Date(checkOut + 'T00:00:00');
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const pricePerNight = ROOM_PRICES[roomType] || 0;
    const total = pricePerNight * nights;
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
// status: 'unconfirmed' | 'live' | 'completed' | 'declined'
function readOrders() {
    try {
        if (fs.existsSync(FOOD_ORDERS_FILE)) {
            const d = JSON.parse(fs.readFileSync(FOOD_ORDERS_FILE, 'utf8'));
            return { orders: Array.isArray(d.orders) ? d.orders : [] };
        }
    } catch (e) { /* ignore */ }
    return { orders: [] };
}

function saveOrders(data) {
    fs.writeFileSync(FOOD_ORDERS_FILE, JSON.stringify(data, null, 2));
}

// Orders Excel file operations
const ORDERS_EXCEL_COLS = {
    id: 1, name: 2, phone: 3, communication: 4, items: 5, total: 6, status: 7, createdAt: 8
};

function formatOrderItemsForExcel(items) {
    if (!items || !Array.isArray(items)) return '';
    return items.map(it => `${it.quantity}x ${it.name} (${(it.price * it.quantity).toFixed(2)} THB)`).join('; ');
}

async function initializeOrdersExcelFile() {
    const workbook = new ExcelJS.Workbook();
    if (fs.existsSync(FOOD_ORDERS_EXCEL_FILE)) {
        try {
            await workbook.xlsx.readFile(FOOD_ORDERS_EXCEL_FILE);
            let worksheet = workbook.getWorksheet('Orders');
            if (!worksheet) {
                worksheet = workbook.addWorksheet('Orders');
                worksheet.columns = [
                    { header: 'ID', key: 'id', width: 35 },
                    { header: 'Customer Name', key: 'name', width: 20 },
                    { header: 'Phone', key: 'phone', width: 20 },
                    { header: 'Communication', key: 'communication', width: 15 },
                    { header: 'Items', key: 'items', width: 50 },
                    { header: 'Total (THB)', key: 'total', width: 12 },
                    { header: 'Status', key: 'status', width: 12 },
                    { header: 'Created At', key: 'createdAt', width: 25 }
                ];
                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            }
        } catch (e) {
            console.error('Error reading orders Excel, creating new:', e);
            const worksheet = workbook.addWorksheet('Orders');
            worksheet.columns = [
                { header: 'ID', key: 'id', width: 35 },
                { header: 'Customer Name', key: 'name', width: 20 },
                { header: 'Phone', key: 'phone', width: 20 },
                { header: 'Communication', key: 'communication', width: 15 },
                { header: 'Items', key: 'items', width: 50 },
                { header: 'Total (THB)', key: 'total', width: 12 },
                { header: 'Status', key: 'status', width: 12 },
                { header: 'Created At', key: 'createdAt', width: 25 }
            ];
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        }
    } else {
        const worksheet = workbook.addWorksheet('Orders');
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 35 },
            { header: 'Customer Name', key: 'name', width: 20 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'Communication', key: 'communication', width: 15 },
            { header: 'Items', key: 'items', width: 50 },
            { header: 'Total (THB)', key: 'total', width: 12 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Created At', key: 'createdAt', width: 25 }
        ];
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    }
    return workbook;
}

async function addOrderToExcel(order) {
    try {
        const workbook = await initializeOrdersExcelFile();
        const worksheet = workbook.getWorksheet('Orders');
        if (!worksheet) return;
        const itemsStr = formatOrderItemsForExcel(order.items);
        worksheet.addRow({
            id: order.id,
            name: order.name || '',
            phone: order.phone || '',
            communication: order.communication || '',
            items: itemsStr,
            total: order.total || 0,
            status: order.status || 'unconfirmed',
            createdAt: order.createdAt || new Date().toISOString()
        });
        await workbook.xlsx.writeFile(FOOD_ORDERS_EXCEL_FILE);
    } catch (e) {
        console.error('Error adding order to Excel:', e);
    }
}

async function updateOrderStatusInExcel(orderId, newStatus) {
    try {
        const workbook = await initializeOrdersExcelFile();
        const worksheet = workbook.getWorksheet('Orders');
        if (!worksheet) return;
        let found = false;
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return;
            if (String(row.getCell(ORDERS_EXCEL_COLS.id).value) === orderId) {
                row.getCell(ORDERS_EXCEL_COLS.status).value = newStatus;
                found = true;
            }
        });
        if (found) await workbook.xlsx.writeFile(FOOD_ORDERS_EXCEL_FILE);
    } catch (e) {
        console.error('Error updating order status in Excel:', e);
    }
}

async function clearOrdersHistoryInExcel() {
    try {
        const workbook = await initializeOrdersExcelFile();
        const worksheet = workbook.getWorksheet('Orders');
        if (!worksheet) return;
        const rowsToRemove = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return;
            const status = String(row.getCell(ORDERS_EXCEL_COLS.status).value || '');
            if (status === 'completed' || status === 'declined') rowsToRemove.push(rowNumber);
        });
        for (let i = rowsToRemove.length - 1; i >= 0; i--) {
            worksheet.spliceRows(rowsToRemove[i], 1);
        }
        await workbook.xlsx.writeFile(FOOD_ORDERS_EXCEL_FILE);
    } catch (e) {
        console.error('Error clearing orders history in Excel:', e);
    }
}

async function migrateOrdersToExcel() {
    if (fs.existsSync(FOOD_ORDERS_EXCEL_FILE)) return; // Excel already exists, skip migration
    const data = readOrders();
    if (!data.orders || data.orders.length === 0) return;
    try {
        const workbook = await initializeOrdersExcelFile();
        const worksheet = workbook.getWorksheet('Orders');
        if (!worksheet) return;
        for (const order of data.orders) {
            const itemsStr = formatOrderItemsForExcel(order.items);
            worksheet.addRow({
                id: order.id,
                name: order.name || '',
                phone: order.phone || '',
                communication: order.communication || '',
                items: itemsStr,
                total: order.total || 0,
                status: order.status || 'unconfirmed',
                createdAt: order.createdAt || new Date().toISOString()
            });
        }
        await workbook.xlsx.writeFile(FOOD_ORDERS_EXCEL_FILE);
        console.log('Migrated', data.orders.length, 'orders to Excel');
    } catch (e) {
        console.error('Error migrating orders to Excel:', e);
    }
}

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
        const allBookings = await readBookingsFromExcel();
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
        const allBookings = await readBookingsFromExcel();
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
        const data = readOrders();
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
        const data = readOrders();
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
        const data = readOrders();
        const history = data.orders.filter(o => o.status === 'completed' || o.status === 'declined');
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
        const allBookings = await readBookingsFromExcel();
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
    if (action === 'order_confirm') {
        const ok = updateOrderStatus(id, 'live');
        const order = readOrders().orders.find(o => o.id === id);
        if (ok && order) {
            const lines = formatOrderLines(order);
            const newText = lines.join('\n') + '\n\n✅ Status: Order is being prepared';
            updateOrderTelegramMessageWithComplete(id, newText);
            telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id, text: 'Order confirmed' });
        } else {
            telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id, text: 'Order not found' });
        }
        return;
    }
    if (action === 'order_decline') {
        const order = readOrders().orders.find(o => o.id === id);
        if (order) {
            updateOrderStatus(id, 'declined');
            const lines = formatOrderLines(order);
            const newText = lines.join('\n') + '\n\n❌ Status: Declined';
            updateOrderTelegramMessage(id, newText, true);
            telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id, text: 'Order declined' });
        } else {
            telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id, text: 'Order not found' });
        }
        return;
    }
    if (action === 'order_complete') {
        const order = readOrders().orders.find(o => o.id === id);
        if (order) {
            updateOrderStatus(id, 'completed');
            const lines = formatOrderLines(order);
            const newText = lines.join('\n') + '\n\n✅ Status: Order completed';
            updateOrderTelegramMessage(id, newText, true);
            telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id, text: 'Order completed' });
        } else {
            telegramApiRequest('answerCallbackQuery', { callback_query_id: cb.id, text: 'Order not found' });
        }
        return;
    }

    // Booking callbacks
    const bookingId = id;
    if (action === 'confirm') {
        const allBookings = await readBookingsFromExcel();
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
                [{ text: '✅ Confirm', callback_data: `order_confirm:${orderId}` }, { text: '❌ Decline', callback_data: `order_decline:${orderId}` }]
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
app.post('/api/order-food', (req, res) => {
    try {
        const { items, name: customerName, phone: customerPhone, communication } = req.body;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Items array is required' });
        }
        
        let total = 0;
        const validItems = items.filter(item => {
            if (!item || !item.name || typeof item.quantity !== 'number' || typeof item.price !== 'number') {
                return false;
            }
            total += item.price * item.quantity;
            return true;
        });
        
        if (validItems.length === 0) {
            return res.status(400).json({ success: false, error: 'No valid order items' });
        }
        
        const orderId = 'ord_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
        const data = readOrders();
        const order = {
            id: orderId,
            items: validItems,
            total,
            name: customerName || '',
            phone: customerPhone || '',
            communication: communication || '',
            status: 'unconfirmed',
            createdAt: new Date().toISOString()
        };
        data.orders.push(order);
        saveOrders(data);
        addOrderToExcel(order).catch(e => console.error('Excel write error:', e));
        
        const commLabels = { phone: 'Phone call', whatsapp: 'WhatsApp', telegram: 'Telegram', line: 'Line' };
        const commLabel = commLabels[communication] || communication || '';
        sendFoodOrderTelegramMessage(validItems, total, customerName, customerPhone, commLabel, orderId);
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
        const { roomType, checkIn, checkOut, guests, name, surname, phone } = req.body;
        
        // Validate required fields
        if (!roomType || !checkIn || !checkOut || !guests || !name || !surname || !phone) {
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
            name: (name || '').trim(),
            surname: (surname || '').trim(),
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

// Read image mappings from JSON file
function readImageMappings() {
    try {
        if (fs.existsSync(MENU_IMAGES_MAPPING_FILE)) {
            const data = fs.readFileSync(MENU_IMAGES_MAPPING_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error reading image mappings:', error);
    }
    return {};
}

// Save image mappings to JSON file
function saveImageMappings(mappings) {
    try {
        fs.writeFileSync(MENU_IMAGES_MAPPING_FILE, JSON.stringify(mappings, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving image mappings:', error);
        return false;
    }
}

// Parse menu from Excel file
async function parseMenuFromExcel() {
    try {
        if (!fs.existsSync(MENU_FILE)) {
            console.log('Menu file not found:', MENU_FILE);
            return [];
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(MENU_FILE);
        
        // Get first worksheet
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            console.log('No worksheet found in menu file');
            return [];
        }

        const menuItems = [];
        const imageMappings = readImageMappings();
        let idCounter = 1;

        // Read rows (skip header row if exists)
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            // Skip header row (row 1)
            if (rowNumber === 1) return;

            try {
                // Column A (1) = Category, Column B (2) = Name, Column C (3) = Price
                const categoryCell = row.getCell(1);
                const nameCell = row.getCell(2);
                const priceCell = row.getCell(3);

                const name = nameCell.value;
                const price = priceCell.value;

                // Skip rows with empty name or price
                if (!name || name === '' || price === null || price === undefined || price === '') {
                    return;
                }

                const category = (categoryCell.value && String(categoryCell.value).trim()) || 'Other';

                // Extract English name (if there are multiple languages, take first/English part)
                let englishName = String(name).trim();
                if (englishName.includes('|')) {
                    englishName = englishName.split('|')[0].trim();
                }
                if (englishName.includes('/')) {
                    englishName = englishName.split('/')[0].trim();
                }

                // Convert price to number
                let priceNum = parseFloat(price);
                if (isNaN(priceNum)) {
                    const priceMatch = String(price).match(/[\d.]+/);
                    if (priceMatch) {
                        priceNum = parseFloat(priceMatch[0]);
                    } else {
                        console.log(`Skipping row ${rowNumber}: Invalid price: ${price}`);
                        return;
                    }
                }

                const dishId = `dish-${idCounter++}`;
                const imagePath = imageMappings[dishId] || null;

                menuItems.push({
                    id: dishId,
                    category,
                    name: englishName,
                    price: priceNum,
                    image: imagePath ? `/api/menu-images/${path.basename(imagePath)}` : null,
                    rowNumber: rowNumber
                });

                // Store dishId -> rowNumber mapping in image mappings file
                if (!imageMappings._rowMapping) {
                    imageMappings._rowMapping = {};
                }
                imageMappings._rowMapping[dishId] = rowNumber;
            } catch (rowError) {
                console.error(`Error parsing row ${rowNumber}:`, rowError);
            }
        });

        // Save row mappings
        saveImageMappings(imageMappings);

        console.log(`Parsed ${menuItems.length} menu items from Excel`);
        return menuItems;
    } catch (error) {
        console.error('Error parsing menu from Excel:', error);
        return [];
    }
}

// Update menu item name/price in Excel
async function updateMenuItemInExcel(dishId, newName, newPrice) {
    try {
        if (!fs.existsSync(MENU_FILE)) {
            return { success: false, error: 'Menu file not found' };
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(MENU_FILE);
        const worksheet = workbook.worksheets[0];
        
        if (!worksheet) {
            return { success: false, error: 'No worksheet found' };
        }

        // Get row number from mapping
        const imageMappings = readImageMappings();
        const rowNumber = imageMappings._rowMapping?.[dishId];

        if (!rowNumber) {
            return { success: false, error: 'Dish row number not found. Please reload menu.' };
        }

        // Update column B (name) and column C (price)
        const row = worksheet.getRow(rowNumber);
        row.getCell(2).value = newName;
        row.getCell(3).value = newPrice;

        await workbook.xlsx.writeFile(MENU_FILE);
        return { success: true };
    } catch (error) {
        console.error('Error updating menu item in Excel:', error);
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
        const menuItems = await parseMenuFromExcel();
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

        const imageMappings = readImageMappings();
        imageMappings[dishId] = req.file.path;
        saveImageMappings(imageMappings);
        
        // Clear menu cache when image is updated
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
        if (!fs.existsSync(MENU_FILE)) {
            return res.status(404).json({ error: 'Menu file not found' });
        }
        let imageMappings = readImageMappings();
        let rowNumber = imageMappings._rowMapping?.[dishId];

        if (!rowNumber) {
            await parseMenuFromExcel();
            imageMappings = readImageMappings();
            rowNumber = imageMappings._rowMapping?.[dishId];
        }

        if (!rowNumber) {
            return res.status(404).json({ error: 'Dish not found' });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(MENU_FILE);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            return res.status(500).json({ error: 'No worksheet found' });
        }

        worksheet.spliceRows(rowNumber, 1);

        delete imageMappings[dishId];
        if (imageMappings._rowMapping) {
            delete imageMappings._rowMapping[dishId];
            for (const id in imageMappings._rowMapping) {
                if (imageMappings._rowMapping[id] > rowNumber) {
                    imageMappings._rowMapping[id]--;
                }
            }
        }
        saveImageMappings(imageMappings);
        await workbook.xlsx.writeFile(MENU_FILE);
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

        const result = await updateMenuItemInExcel(dishId, name, priceNum);
        
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
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    startTelegramPolling();
    // Parse menu on startup
    parseMenuFromExcel().then(items => {
        console.log(`Menu loaded: ${items.length} items`);
    });
    // Migrate existing orders from JSON to Excel on first run
    migrateOrdersToExcel().catch(e => console.error('Orders migration error:', e));
});
