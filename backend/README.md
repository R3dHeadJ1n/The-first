# Hotel Booking Backend

Simple Node.js + Express backend server for hotel booking system.

## Setup Instructions

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   Or:
   ```bash
   node server.js
   ```

3. **Server will run on:**
   - URL: http://localhost:3001
   - Booked dates endpoint: GET http://localhost:3001/booked-dates
   - Book room endpoint: POST http://localhost:3001/book-room

## API Endpoints

### GET /booked-dates
Returns an array of all booked dates in format `YYYY-MM-DD`.

**Response:**
```json
["2026-02-10", "2026-02-11", "2026-02-15"]
```

### POST /book-room
Saves a booking and sends a Telegram notification.

**Request Body:**
```json
{
  "roomType": "single",
  "checkIn": "2026-02-10",
  "checkOut": "2026-02-12",
  "guests": "2",
  "phone": "+66123456789"
}
```

**Response:**
```json
{
  "success": true
}
```

## Notes

- Bookings are stored in memory (will be lost on server restart)
- Telegram bot token and chat ID are configured in `server.js`
- CORS is enabled to allow frontend requests
