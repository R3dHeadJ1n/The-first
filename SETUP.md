# Hotel Booking System - Setup Guide

## Overview

This is a simple hotel booking system with:
- Frontend: HTML, CSS, JavaScript with Flatpickr calendar
- Backend: Node.js + Express server
- Storage: In-memory array (no database)
- Notifications: Telegram Bot API

## Setup Instructions

### 1. Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the backend server:
   ```bash
   npm start
   ```
   Or:
   ```bash
   node server.js
   ```

4. The server will run on `http://localhost:3001`

### 2. Frontend Setup

1. Open `index.html` in a web browser
2. Or use a local server (recommended):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js http-server
   npx http-server
   ```

3. Open `http://localhost:8000` (or the port you used)

## How It Works

### Booking Flow

1. User clicks "Book a Room" button
2. Modal opens with booking form
3. Calendar fetches booked dates from backend
4. Booked dates are disabled in the calendar
5. User selects available dates and fills the form
6. On submit, booking is sent to backend
7. Backend saves booking and sends Telegram notification
8. User sees success message

### API Endpoints

- **GET /booked-dates**: Returns array of booked dates
- **POST /book-room**: Saves booking and sends Telegram message

## Important Notes

- Backend must be running before using the booking form
- Bookings are stored in memory (lost on server restart)
- Make sure backend is accessible at `http://localhost:3001`
- Telegram bot token and chat ID are configured in `backend/server.js`

## Troubleshooting

- If calendar doesn't show booked dates: Check backend is running
- If booking fails: Check browser console for errors
- If Telegram messages don't arrive: Check bot token and chat ID
