// Booking Modal + Language Switcher (vanilla JS)

// ----------------------------
// Language switching (RU / EN)
// ----------------------------
const translations = {
    en: {
        // Main buttons
        book_main: 'Book a Room',
        order_main: 'Order Food',
        
        // Scroll and rooms
        scroll_text: 'Scroll down to check the rooms',
        rooms_title: 'Our Rooms',
        room_type_single: 'Single Room',
        room_type_double: 'Double Room',
        
        // Menu
        menu_title: 'Our Menu',
        prev_page: '← Previous',
        next_page: 'Next →',
        page: 'Page',
        of: 'of',
        order_food_whatsapp: 'Order Food',

        // Booking modal
        booking_title: 'Book a Room',
        checkin_label: 'Check-in Date',
        checkout_label: 'Check-out Date',
        roomtype_label: 'Room Type',
        roomtype_placeholder: 'Select room type',
        roomtype_small: 'Single room',
        roomtype_big: 'Double room',
        guests_label: 'Number of Guests',
        guests_placeholder: 'Select number of guests',
        guests_1: '1 Guest',
        guests_2: '2 Guests',
        guests_3: '3 Guests',
        guests_4: '4 Guests',
        name_label: 'Name',
        name_placeholder: 'Enter your name',
        surname_label: 'Surname',
        surname_placeholder: 'Enter your surname',
        phone_label: 'Phone Number',
        phone_placeholder: 'Enter your phone number',
        checkin_checkout_info: 'Check-in after 2:00 PM; Check-out before 12:00 PM',
        nights_label: 'Nights:',
        price_per_month_label: 'Price per month:',
        price_per_night_label: 'Price per night:',
        total_price_label: 'Total:',
        currency: 'Bath',
        book_submit: 'Book a Room',

        // Success modal
        success_title: 'Booking Confirmed!',
        success_message: 'Your room is booked. We will contact you via WhatsApp.',
        close: 'Close',

        // Validation messages
        err_checkin_required: 'Check-in date is required',
        err_checkout_required: 'Check-out date is required',
        err_checkout_after: 'Check-out date must be after check-in date',
        err_roomtype_required: 'Please select a room type',
        err_guests_required: 'Please select number of guests',
        err_name_required: 'Name is required',
        err_surname_required: 'Surname is required',
        err_phone_required: 'Phone number is required',
        err_phone_invalid: 'Please enter a valid phone number',
        err_prefix: 'Please fill in all required fields correctly:\\n\\n',
        no_availability: 'No available rooms for selected dates'
    },
    ru: {
        // Main buttons
        book_main: 'Забронировать номер',
        order_main: 'Заказать еду',
        
        // Scroll and rooms
        scroll_text: 'Прокрутите вниз, чтобы посмотреть номера',
        rooms_title: 'Наши номера',
        room_type_single: 'Однокомнатный номер',
        room_type_double: 'Двухкомнатный номер',
        
        // Menu
        menu_title: 'Наше меню',
        prev_page: '← Назад',
        next_page: 'Вперед →',
        page: 'Страница',
        of: 'из',
        order_food_whatsapp: 'Заказать еду',

        // Booking modal
        booking_title: 'Бронирование номера',
        checkin_label: 'Дата заезда',
        checkout_label: 'Дата выезда',
        roomtype_label: 'Тип номера',
        roomtype_placeholder: 'Выберите тип номера',
        roomtype_small: 'Одноместный номер',
        roomtype_big: 'Двухместный номер',
        guests_label: 'Количество гостей',
        guests_placeholder: 'Выберите количество гостей',
        guests_1: '1 гость',
        guests_2: '2 гостя',
        guests_3: '3 гостя',
        guests_4: '4 гостя',
        name_label: 'Имя',
        name_placeholder: 'Введите имя',
        surname_label: 'Фамилия',
        surname_placeholder: 'Введите фамилию',
        phone_label: 'Номер телефона',
        phone_placeholder: 'Введите номер телефона',
        checkin_checkout_info: 'Заезд после 14:00; Выезд до 12:00',
        nights_label: 'Ночей:',
        price_per_month_label: 'Цена за месяц:',
        price_per_night_label: 'Цена за ночь:',
        total_price_label: 'Итого:',
        currency: 'Бат',
        book_submit: 'Забронировать номер',

        // Success modal
        success_title: 'Бронирование подтверждено!',
        success_message: 'Ваш номер забронирован. Мы свяжемся с вами в WhatsApp.',
        close: 'Закрыть',

        // Validation messages
        err_checkin_required: 'Укажите дату заезда',
        err_checkout_required: 'Укажите дату выезда',
        err_checkout_after: 'Дата выезда должна быть позже даты заезда',
        err_roomtype_required: 'Выберите тип номера',
        err_guests_required: 'Выберите количество гостей',
        err_name_required: 'Укажите имя',
        err_surname_required: 'Укажите фамилию',
        err_phone_required: 'Номер телефона обязателен',
        err_phone_invalid: 'Введите корректный номер телефона',
        err_prefix: 'Пожалуйста, заполните все обязательные поля корректно:\\n\\n',
        no_availability: 'Нет доступных номеров на выбранные даты'
    },
    th: {
        // Main buttons
        book_main: 'จองห้อง',
        order_main: 'สั่งอาหาร',
        
        // Scroll and rooms
        scroll_text: 'เลื่อนลงเพื่อดูห้องพัก',
        rooms_title: 'ห้องพักของเรา',
        room_type_single: 'ห้องเดี่ยว',
        room_type_double: 'ห้องคู่',
        
        // Menu
        menu_title: 'เมนูของเรา',
        prev_page: '← ก่อนหน้า',
        next_page: 'ถัดไป →',
        page: 'หน้า',
        of: 'จาก',
        order_food_whatsapp: 'สั่งอาหาร',

        // Booking modal
        booking_title: 'จองห้องพัก',
        checkin_label: 'วันที่เช็คอิน',
        checkout_label: 'วันที่เช็คเอาท์',
        roomtype_label: 'ประเภทห้อง',
        roomtype_placeholder: 'เลือกประเภทห้อง',
        roomtype_small: 'ห้องเดี่ยว',
        roomtype_big: 'ห้องคู่',
        guests_label: 'จำนวนผู้เข้าพัก',
        guests_placeholder: 'เลือกจำนวนผู้เข้าพัก',
        guests_1: '1 ท่าน',
        guests_2: '2 ท่าน',
        guests_3: '3 ท่าน',
        guests_4: '4 ท่าน',
        name_label: 'ชื่อ',
        name_placeholder: 'กรอกชื่อของคุณ',
        surname_label: 'นามสกุล',
        surname_placeholder: 'กรอกนามสกุลของคุณ',
        phone_label: 'เบอร์โทรศัพท์',
        phone_placeholder: 'กรอกเบอร์โทรศัพท์',
        checkin_checkout_info: 'เช็คอินหลัง 14:00 น.; เช็คเอาท์ก่อน 12:00 น.',
        nights_label: 'คืน:',
        price_per_month_label: 'ราคาต่อเดือน:',
        price_per_night_label: 'ราคาต่อคืน:',
        total_price_label: 'รวม:',
        currency: 'บาท',
        book_submit: 'จองห้องพัก',

        // Success modal
        success_title: 'จองสำเร็จ!',
        success_message: 'ห้องพักของคุณได้รับการจองแล้ว เราจะติดต่อคุณทาง WhatsApp',
        close: 'ปิด',

        // Validation messages
        err_checkin_required: 'กรุณาระบุวันที่เช็คอิน',
        err_checkout_required: 'กรุณาระบุวันที่เช็คเอาท์',
        err_checkout_after: 'วันที่เช็คเอาท์ต้องอยู่หลังวันที่เช็คอิน',
        err_roomtype_required: 'กรุณาเลือกประเภทห้อง',
        err_guests_required: 'กรุณาเลือกจำนวนผู้เข้าพัก',
        err_name_required: 'กรุณากรอกชื่อ',
        err_surname_required: 'กรุณากรอกนามสกุล',
        err_phone_required: 'กรุณากรอกเบอร์โทรศัพท์',
        err_phone_invalid: 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง',
        err_prefix: 'กรุณากรอกข้อมูลในช่องที่จำเป็นให้ครบถ้วน:\\n\\n',
        no_availability: 'ไม่มีห้องว่างในวันที่เลือก'
    }
};

let currentLang = 'en';

function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) ? translations[currentLang][key] : key;
}

function applyTranslations(lang) {
    currentLang = lang;
    
    // Save selected language to localStorage
    try {
        localStorage.setItem('selectedLanguage', lang);
    } catch (e) {
        console.log('Could not save language preference:', e);
    }

    // Text nodes
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.setAttribute('placeholder', t(key));
    });

    // Update main language button text
    const langButton = document.getElementById('langButton');
    if (langButton) {
        const labels = { en: 'ENG', ru: 'RU', th: 'TH' };
        langButton.textContent = labels[lang] || lang.toUpperCase();
    }

    // Update active option styling
    document.querySelectorAll('.lang-option').forEach((option) => {
        option.classList.toggle('active', option.getAttribute('data-lang') === lang);
    });

    // Close dropdown
    const langSwitcher = document.querySelector('.lang-switcher');
    if (langSwitcher) {
        langSwitcher.classList.remove('open');
    }
    
    // Refresh guests dropdown if room type is selected (for language switch)
    const roomTypeSelect = document.getElementById('roomType');
    if (roomTypeSelect && typeof updateGuestsDropdown === 'function') {
        updateGuestsDropdown(roomTypeSelect.value);
    }
}

// Language button click handler
const langButton = document.getElementById('langButton');
const langSwitcher = document.querySelector('.lang-switcher');

if (langButton && langSwitcher) {
    langButton.addEventListener('click', (e) => {
        e.stopPropagation();
        langSwitcher.classList.toggle('open');
    });
}

// Language option click handlers
document.querySelectorAll('.lang-option').forEach((option) => {
    option.addEventListener('click', (e) => {
        e.stopPropagation();
        const lang = option.getAttribute('data-lang');
        applyTranslations(lang);
    });
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (langSwitcher && !langSwitcher.contains(e.target)) {
        langSwitcher.classList.remove('open');
    }
});

// Backend API Configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;;

// Room prices per night (Bath)
const ROOM_PRICES = { small: 700, big: 900 };
const ROOM_MONTHLY_PRICES = { small: 16000, big: 19000 };

// Get modal elements
const bookingModal = document.getElementById('bookingModal');
const bookingForm = document.getElementById('bookingForm');
const modalClose = document.querySelector('.modal-close');
const bookRoomBtn = document.getElementById('bookRoomBtn');
const toastContainer = document.getElementById('toastContainer');

// ----------------------------
// Toast notifications (survive refresh)
// ----------------------------
const LAST_TOAST_KEY = 'lastToastNotification';

function showToast(message, type = 'success', options = {}) {
    const container = toastContainer || document.getElementById('toastContainer');
    if (!container) {
        // Fallback if container is missing for any reason
        alert(message);
        return;
    }

    const toast = document.createElement('div');
    const toastTypeClass =
        type === 'error' ? 'toast-error' :
        type === 'info' ? 'toast-info' :
        'toast-success';

    toast.className = `toast ${toastTypeClass}`;

    const text = document.createElement('div');
    text.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';

    closeBtn.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
    });

    toast.appendChild(text);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    // animate in
    requestAnimationFrame(() => toast.classList.add('show'));

    const durationMs = typeof options.durationMs === 'number' ? options.durationMs : 5000;
    if (durationMs > 0) {
        setTimeout(() => {
            if (toast.isConnected) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 250);
            }
        }, durationMs);
    }
}

function persistToastForRefresh(message, type = 'success') {
    try {
        localStorage.setItem(LAST_TOAST_KEY, JSON.stringify({
            message,
            type,
            ts: Date.now()
        }));
    } catch (e) {
        // ignore
    }
}

function showPersistedToastIfAny() {
    try {
        const raw = localStorage.getItem(LAST_TOAST_KEY);
        if (!raw) return;
        const payload = JSON.parse(raw);
        // only show if it was within the last 15 seconds
        if (payload && payload.ts && (Date.now() - payload.ts) < 15000 && payload.message) {
            showToast(payload.message, payload.type || 'success', { durationMs: 6000 });
        }
        localStorage.removeItem(LAST_TOAST_KEY);
    } catch (e) {
        // ignore
    }
}

// Prevent default form submission
if (bookingForm) {
    bookingForm.onsubmit = function(e) {
        e.preventDefault();
        return false;
    };
}

// Flatpickr instances
let checkinPicker = null;
let checkoutPicker = null;
let bookedDates = [];

// Format date to YYYY-MM-DD in local timezone (avoid UTC conversion)
function formatDateForBackend(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Fetch unavailable dates from backend for a specific room type
async function fetchBookedDates(roomType) {
    if (!roomType) {
        return [];
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/booked-dates?roomType=${roomType}`);
        if (response.ok) {
            bookedDates = await response.json();
            return bookedDates;
        } else {
            console.log('Failed to fetch booked dates');
            return [];
        }
    } catch (error) {
        console.log('Error fetching booked dates:', error);
        return [];
    }
}

// Initialize Flatpickr date pickers
async function initializeDatePickers(roomType) {
    // Ensure Flatpickr is available
    if (typeof flatpickr === 'undefined') {
        console.error('Flatpickr is not loaded');
        return;
    }
    
    const checkinInput = document.getElementById('checkin');
    const checkoutInput = document.getElementById('checkout');
    
    if (!checkinInput || !checkoutInput || !roomType) return;
    
    // Enable inputs before initializing Flatpickr (Flatpickr needs enabled inputs)
    checkinInput.disabled = false;
    checkoutInput.disabled = false;
    
    // Fetch unavailable dates for this room type
    await fetchBookedDates(roomType);
    
    // Destroy existing instances if they exist
    if (checkinPicker) {
        checkinPicker.destroy();
        checkinPicker = null;
    }
    if (checkoutPicker) {
        checkoutPicker.destroy();
        checkoutPicker = null;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Initialize check-in picker
    checkinPicker = flatpickr(checkinInput, {
        minDate: today,
        dateFormat: 'Y-m-d',
        disable: bookedDates,
        onChange: function(selectedDates, dateStr) {
            // Update checkout picker when check-in changes
            if (selectedDates.length > 0) {
                const nextDay = new Date(selectedDates[0]);
                nextDay.setDate(nextDay.getDate() + 1);
                
                // Update checkout picker
                if (checkoutPicker) {
                    checkoutPicker.set('minDate', nextDay);
                    // Clear checkout if it's before new minimum
                    if (checkoutPicker.selectedDates.length > 0 && checkoutPicker.selectedDates[0] <= selectedDates[0]) {
                        checkoutPicker.clear();
                    }
                }
            }
            // Check availability
            checkAvailability();
        }
    });
    
    // Initialize checkout picker
    checkoutPicker = flatpickr(checkoutInput, {
        minDate: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        dateFormat: 'Y-m-d',
        disable: bookedDates,
        onChange: function() {
            // Check availability
            checkAvailability();
        }
    });
}

// Check if selected dates have availability
function checkAvailability() {
    const roomType = document.getElementById('roomType').value;
    const checkin = checkinPicker && checkinPicker.selectedDates.length > 0 
        ? formatDateForBackend(checkinPicker.selectedDates[0])
        : '';
    const checkout = checkoutPicker && checkoutPicker.selectedDates.length > 0 
        ? formatDateForBackend(checkoutPicker.selectedDates[0])
        : '';
    
    const submitButton = bookingForm.querySelector('button[type="submit"]');
    const availabilityMessage = document.getElementById('availabilityMessage');
    
    if (!roomType || !checkin || !checkout) {
        if (submitButton) submitButton.disabled = false;
        if (availabilityMessage) availabilityMessage.style.display = 'none';
        return;
    }
    
    // Check if any date in the range is unavailable
    const start = new Date(checkin + 'T00:00:00');
    const end = new Date(checkout + 'T00:00:00');
    let hasUnavailableDate = false;
    
    const current = new Date(start);
    while (current < end) {
        const dateStr = formatDateForBackend(current);
        if (bookedDates.includes(dateStr)) {
            hasUnavailableDate = true;
            break;
        }
        current.setDate(current.getDate() + 1);
    }
    
    if (hasUnavailableDate) {
        if (submitButton) submitButton.disabled = true;
        if (availabilityMessage) availabilityMessage.style.display = 'block';
    } else {
        if (submitButton) submitButton.disabled = false;
        if (availabilityMessage) availabilityMessage.style.display = 'none';
    }
    
    updateBookingSummary();
}

// Update booking summary (nights, price per night, total)
function updateBookingSummary() {
    const summaryEl = document.getElementById('bookingSummary');
    const nightsEl = document.getElementById('nightsCount');
    const pricePerNightEl = document.getElementById('pricePerNight');
    const pricePerMonthEl = document.getElementById('pricePerMonth');
    const monthlyPriceRow = document.getElementById('monthlyPriceRow');
    const totalEl = document.getElementById('totalPrice');
    
    if (!summaryEl || !nightsEl || !pricePerNightEl || !totalEl) return;
    
    const roomType = document.getElementById('roomType')?.value;
    const checkin = checkinPicker?.selectedDates?.[0];
    const checkout = checkoutPicker?.selectedDates?.[0];
    
    if (!roomType || !checkin || !checkout || !ROOM_PRICES[roomType]) {
        summaryEl.style.display = 'none';
        if (monthlyPriceRow) monthlyPriceRow.style.display = 'none';
        return;
    }
    
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) {
        summaryEl.style.display = 'none';
        if (monthlyPriceRow) monthlyPriceRow.style.display = 'none';
        return;
    }
    
    const pricePerNight = ROOM_PRICES[roomType];
    let total = pricePerNight * nights;

    const monthlyPrice = ROOM_MONTHLY_PRICES[roomType];
    if (monthlyPrice) {
        const fullMonths = Math.floor(nights / 30);
        const remainingDays = nights % 30;
        if (fullMonths > 0) {
            total = (fullMonths * monthlyPrice) + (remainingDays * pricePerNight);
        }
        if (pricePerMonthEl && monthlyPriceRow) {
            pricePerMonthEl.textContent = monthlyPrice.toLocaleString();
            monthlyPriceRow.style.display = 'block';
        }
    } else if (monthlyPriceRow) {
        monthlyPriceRow.style.display = 'none';
    }
    
    nightsEl.textContent = nights;
    pricePerNightEl.textContent = pricePerNight.toLocaleString();
    totalEl.textContent = total.toLocaleString();
    summaryEl.style.display = 'block';
}

// Open booking modal
function openBookingModal() {
    // Reset form
    bookingForm.reset();
    
    // Set room type to placeholder (empty value)
    const roomTypeSelect = document.getElementById('roomType');
    if (roomTypeSelect) {
        roomTypeSelect.value = '';
    }
    
    // Reset guests dropdown (no options until room type selected)
    updateGuestsDropdown('');
    
    // Hide booking summary
    const bookingSummary = document.getElementById('bookingSummary');
    if (bookingSummary) bookingSummary.style.display = 'none';
    
    // Hide availability message
    document.getElementById('availabilityMessage').style.display = 'none';
    
    // Destroy any existing pickers
    if (checkinPicker) {
        checkinPicker.destroy();
        checkinPicker = null;
    }
    if (checkoutPicker) {
        checkoutPicker.destroy();
        checkoutPicker = null;
    }
    
    // Disable date fields initially
    const checkinInput = document.getElementById('checkin');
    const checkoutInput = document.getElementById('checkout');
    if (checkinInput) {
        checkinInput.disabled = true;
        checkinInput.value = '';
    }
    if (checkoutInput) {
        checkoutInput.disabled = true;
        checkoutInput.value = '';
    }
    
    bookingModal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Close booking modal
function closeBookingModal() {
    bookingModal.classList.remove('show');
    document.body.style.overflow = ''; // Restore scrolling
}

// Close modal with X button only (no click-outside-to-close)
if (modalClose) {
    modalClose.addEventListener('click', closeBookingModal);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    showPersistedToastIfAny();
});

// Send booking to backend
async function sendBookingToBackend(checkin, checkout, roomType, guests, name, surname, phone) {
    console.log('🚀 Starting booking submission...', { checkin, checkout, roomType, guests, name, surname, phone });
    
    // Validate payload before sending
    if (!checkin || !checkout || !roomType || !guests || !name || !surname || !phone) {
        console.log('❌ Validation failed: Missing required fields');
        return { success: false, error: 'Missing required fields' };
    }
    
    try {
        const payload = {
            roomType,
            checkIn: checkin,
            checkOut: checkout,
            guests,
            name,
            surname,
            phone
        };
        
        console.log('📤 Sending POST request to:', `${BACKEND_URL}/book-room`);
        
        const response = await fetch(`${BACKEND_URL}/book-room`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            console.log('❌ Backend returned error status:', response.status);
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            return { success: false, error: errorData.error || 'Server error' };
        }
        
        const data = await response.json();
        if (data.success) {
            console.log('✅ Booking submitted successfully');
            return { success: true };
        } else {
            console.log('❌ Backend returned success: false', data);
            return { success: false, error: data.error || 'Booking failed' };
        }
    } catch (error) {
        console.log('❌ Network error sending booking:', error);
        return { success: false, error: 'Network error. Please check your connection.' };
    }
}

// Form validation and submission
let isSubmitting = false; // Prevent double submission

function handleBookingSubmit(event) {
    if (event) {
        event.preventDefault();
    }
    
    if (isSubmitting) return false;
    isSubmitting = true;
    
    const submitButton = bookRoomBtn || (bookingForm && bookingForm.querySelector('button[type="submit"]'));
    if (!submitButton) {
        isSubmitting = false;
        return false;
    }
    
    // Get form values from Flatpickr instances
    const checkin = checkinPicker && checkinPicker.selectedDates.length > 0 
        ? formatDateForBackend(checkinPicker.selectedDates[0])
        : document.getElementById('checkin').value;
    const checkout = checkoutPicker && checkoutPicker.selectedDates.length > 0 
        ? formatDateForBackend(checkoutPicker.selectedDates[0])
        : document.getElementById('checkout').value;
    const roomType = document.getElementById('roomType').value;
    const guests = document.getElementById('guests').value;
    const name = document.getElementById('name').value.trim();
    const surname = document.getElementById('surname').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    // Validation
    let isValid = true;
    const errors = [];
    
    if (!checkin) {
        errors.push(t('err_checkin_required'));
        isValid = false;
    }
    
    if (!checkout) {
        errors.push(t('err_checkout_required'));
        isValid = false;
    }
    
    if (checkin && checkout && checkout <= checkin) {
        errors.push(t('err_checkout_after'));
        isValid = false;
    }
    
    if (!roomType) {
        errors.push(t('err_roomtype_required'));
        isValid = false;
    }
    
    if (!guests) {
        errors.push(t('err_guests_required'));
        isValid = false;
    }
    
    if (!name) {
        errors.push(t('err_name_required'));
        isValid = false;
    }
    
    if (!surname) {
        errors.push(t('err_surname_required'));
        isValid = false;
    }
    
    if (!phone) {
        errors.push(t('err_phone_required'));
        isValid = false;
    } else if (!/^[0-9+\-\s()]+$/.test(phone)) {
        errors.push(t('err_phone_invalid'));
        isValid = false;
    }
    
    if (!isValid) {
        isSubmitting = false;
        alert(t('err_prefix') + errors.join('\n'));
        return false;
    }
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    submitButton.style.opacity = '0.6';
    submitButton.style.cursor = 'not-allowed';
    
    sendBookingToBackend(checkin, checkout, roomType, guests, name, surname, phone)
        .then(result => {
            
            // Re-enable button
            isSubmitting = false;
            submitButton.disabled = false;
            submitButton.textContent = originalText;
            submitButton.style.opacity = '1';
            submitButton.style.cursor = 'pointer';
            
            if (result && result.success) {
                if (bookingModal) bookingModal.classList.remove('show');
                document.body.style.overflow = '';
                window.open('booking-confirmed.html', '_blank');
            } else {
                const errorMsg = result?.error || 'Failed to submit booking. Please try again.';
                persistToastForRefresh(errorMsg, 'error');
                showToast(errorMsg, 'error', { durationMs: 8000 });
            }
        })
        .catch(error => {
            console.error('Error submitting booking:', error);
            isSubmitting = false;
            submitButton.disabled = false;
            submitButton.textContent = originalText;
            submitButton.style.opacity = '1';
            submitButton.style.cursor = 'pointer';
            
            const msg = 'An unexpected error occurred. Please try again.';
            persistToastForRefresh(msg, 'error');
            showToast(msg, 'error', { durationMs: 8000 });
        });
    
    return false;
}

if (bookRoomBtn) {
    bookRoomBtn.addEventListener('click', handleBookingSubmit);
}

// Load saved language preference or default to English
function initializeLanguage() {
    let savedLang = 'en';
    try {
        const saved = localStorage.getItem('selectedLanguage');
        if (saved === 'en' || saved === 'ru' || saved === 'th') {
            savedLang = saved;
        }
    } catch (e) {
        console.log('Could not load language preference:', e);
    }
    applyTranslations(savedLang);
}

// Initialize language on page load
initializeLanguage();

// Update guests dropdown based on room type: small (single) = 1-2, big (double) = 1-4
function updateGuestsDropdown(roomType) {
    const guestsSelect = document.getElementById('guests');
    if (!guestsSelect) return;
    
    const maxGuests = roomType === 'small' ? 2 : roomType === 'big' ? 4 : 0;
    guestsSelect.innerHTML = '';
    
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = t('guests_placeholder');
    placeholder.selected = true;
    placeholder.disabled = true;
    guestsSelect.appendChild(placeholder);
    
    if (maxGuests > 0) {
        for (let i = 1; i <= maxGuests; i++) {
            const opt = document.createElement('option');
            opt.value = String(i);
            opt.textContent = t(`guests_${i}`);
            guestsSelect.appendChild(opt);
        }
    }
}

// Room type change handler
const roomTypeSelect = document.getElementById('roomType');
if (roomTypeSelect) {
    roomTypeSelect.addEventListener('change', async function() {
        const selectedRoomType = this.value;
        const availabilityMessage = document.getElementById('availabilityMessage');
        const checkinInput = document.getElementById('checkin');
        const checkoutInput = document.getElementById('checkout');
        
        updateGuestsDropdown(selectedRoomType);
        
        if (selectedRoomType) {
            // Hide availability message initially
            availabilityMessage.style.display = 'none';
            
            // Enable date fields
            if (checkinInput) checkinInput.disabled = false;
            if (checkoutInput) checkoutInput.disabled = false;
            
            // Initialize date pickers with availability for selected room type
            await initializeDatePickers(selectedRoomType);
            
            // Re-check availability if dates are already selected
            checkAvailability();
        } else {
            // Hide availability message if no room type selected
            availabilityMessage.style.display = 'none';
            
            // Disable date fields
            if (checkinInput) checkinInput.disabled = true;
            if (checkoutInput) checkoutInput.disabled = true;
            
            // Clear date values
            if (checkinInput) checkinInput.value = '';
            if (checkoutInput) checkoutInput.value = '';
            
            // Destroy pickers if no room type selected
            if (checkinPicker) {
                checkinPicker.destroy();
                checkinPicker = null;
            }
            if (checkoutPicker) {
                checkoutPicker.destroy();
                checkoutPicker = null;
            }
        }
    });
}

// ----------------------------
// Rooms Section & Gallery
// ----------------------------
let currentRoomType = 'single';
const IMAGE_EXTENSIONS = ['png', 'jpg', 'JPG']; // Try png, then jpg/JPG (single1.JPG, single3.JPG exist)
let currentImageList = []; // Store all loaded image sources for navigation (active room type only)
let currentImageIndex = 0; // Current image index in lightbox
let roomGalleryInitialized = false;

function scrollToRooms() {
    const roomsSection = document.getElementById('roomsSection');
    if (roomsSection) {
        roomsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function initRoomGallery() {
    const gallery = document.getElementById('roomGallery');
    if (!gallery || roomGalleryInitialized) return;
    roomGalleryInitialized = true;
    
    gallery.innerHTML = '';
    
    for (let i = 1; i <= 3; i++) {
        const singleItem = document.createElement('div');
        singleItem.className = 'room-gallery-item';
        singleItem.dataset.roomType = 'single';
        singleItem.style.display = currentRoomType === 'single' ? '' : 'none';
        const singleImg = document.createElement('img');
        let singleExtIdx = 0;
        function trySingle() {
            const ext = IMAGE_EXTENSIONS[singleExtIdx];
            const src = `images/single${i}.${ext}`;
            singleImg.src = src;
            singleImg.alt = `single room ${i}`;
            singleImg.onload = () => {
                singleItem.style.cursor = 'pointer';
                singleItem.onclick = () => updateCurrentImageListAndOpen(src);
            };
            singleImg.onerror = () => {
                singleExtIdx++;
                if (singleExtIdx < IMAGE_EXTENSIONS.length) trySingle();
                else singleItem.remove();
            };
        }
        trySingle();
        singleItem.appendChild(singleImg);
        gallery.appendChild(singleItem);
        
        const doubleItem = document.createElement('div');
        doubleItem.className = 'room-gallery-item';
        doubleItem.dataset.roomType = 'double';
        doubleItem.style.display = currentRoomType === 'double' ? '' : 'none';
        const doubleImg = document.createElement('img');
        let doubleExtIdx = 0;
        function tryDouble() {
            const ext = IMAGE_EXTENSIONS[doubleExtIdx];
            const src = `images/double${i}.${ext}`;
            doubleImg.src = src;
            doubleImg.alt = `double room ${i}`;
            doubleImg.onload = () => {
                doubleItem.style.cursor = 'pointer';
                doubleItem.onclick = () => updateCurrentImageListAndOpen(src);
            };
            doubleImg.onerror = () => {
                doubleExtIdx++;
                if (doubleExtIdx < IMAGE_EXTENSIONS.length) tryDouble();
                else doubleItem.remove();
            };
        }
        tryDouble();
        doubleItem.appendChild(doubleImg);
        gallery.appendChild(doubleItem);
    }
    updateCurrentImageList();
}

function updateCurrentImageListAndOpen(src) {
    updateCurrentImageList();
    openImageLightbox(src, currentImageList.indexOf(src));
}

function updateCurrentImageList() {
    currentImageList = [];
    document.querySelectorAll(`#roomGallery .room-gallery-item[data-room-type="${currentRoomType}"] img`).forEach(img => {
        const src = img.getAttribute('src');
        if (src) {
            currentImageList.push(src);
        } else if (img.src) {
            try {
                const path = new URL(img.src).pathname;
                currentImageList.push(path.startsWith('/') ? path : '/' + path);
            } catch (_) {
                currentImageList.push(img.src);
            }
        }
    });
}

function setActiveRoomType(roomType) {
    currentRoomType = roomType;
    document.querySelectorAll('.room-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-room-type') === roomType);
    });
    document.querySelectorAll('#roomGallery .room-gallery-item').forEach(item => {
        item.style.display = item.dataset.roomType === roomType ? '' : 'none';
    });
    updateCurrentImageList();
}

if (document.getElementById('roomGallery')) {
    initRoomGallery();
}

document.querySelectorAll('.room-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        setActiveRoomType(this.getAttribute('data-room-type'));
    });
});

// Image Lightbox functions
function openImageLightbox(imageSrc, imageIndex = -1) {
    const lightbox = document.getElementById('imageLightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    
    if (lightbox && lightboxImage) {
        // Set current index
        if (imageIndex >= 0) {
            currentImageIndex = imageIndex;
        } else {
            // Find index if not provided
            currentImageIndex = currentImageList.indexOf(imageSrc);
            if (currentImageIndex < 0) currentImageIndex = 0;
        }
        
        lightboxImage.src = imageSrc;
        lightbox.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Update navigation buttons
        updateLightboxNavButtons();
    }
}

function closeImageLightbox() {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
        lightbox.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function showNextImage() {
    if (currentImageList.length > 0 && currentImageIndex < currentImageList.length - 1) {
        currentImageIndex++;
        const lightboxImage = document.getElementById('lightboxImage');
        if (lightboxImage) {
            lightboxImage.src = currentImageList[currentImageIndex];
            updateLightboxNavButtons();
        }
    }
}

function showPrevImage() {
    if (currentImageList.length > 0 && currentImageIndex > 0) {
        currentImageIndex--;
        const lightboxImage = document.getElementById('lightboxImage');
        if (lightboxImage) {
            lightboxImage.src = currentImageList[currentImageIndex];
            updateLightboxNavButtons();
        }
    }
}

function updateLightboxNavButtons() {
    const prevBtn = document.getElementById('lightboxPrevBtn');
    const nextBtn = document.getElementById('lightboxNextBtn');
    
    if (prevBtn) {
        if (currentImageList.length > 1 && currentImageIndex > 0) {
            prevBtn.style.display = 'flex';
            prevBtn.disabled = false;
        } else {
            prevBtn.style.display = 'none';
            prevBtn.disabled = true;
        }
    }
    if (nextBtn) {
        if (currentImageList.length > 1 && currentImageIndex < currentImageList.length - 1) {
            nextBtn.style.display = 'flex';
            nextBtn.disabled = false;
        } else {
            nextBtn.style.display = 'none';
            nextBtn.disabled = true;
        }
    }
}

// Initialize lightbox event listeners
document.addEventListener('DOMContentLoaded', function() {
    const lightbox = document.getElementById('imageLightbox');
    const closeBtn = document.querySelector('.image-lightbox-close');
    const prevBtn = document.getElementById('lightboxPrevBtn');
    const nextBtn = document.getElementById('lightboxNextBtn');
    
    // Close button
    if (closeBtn) {
        closeBtn.onclick = closeImageLightbox;
    }
    
    // Previous button
    if (prevBtn) {
        prevBtn.onclick = function(e) {
            e.stopPropagation();
            showPrevImage();
        };
    }
    
    // Next button
    if (nextBtn) {
        nextBtn.onclick = function(e) {
            e.stopPropagation();
            showNextImage();
        };
    }
    
    // Close on background click (but not on image or buttons)
    if (lightbox) {
        lightbox.onclick = function(e) {
            if (e.target === lightbox) {
                closeImageLightbox();
            }
        };
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (lightbox && lightbox.classList.contains('show')) {
            if (e.key === 'Escape') {
                closeImageLightbox();
            } else if (e.key === 'ArrowLeft') {
                showPrevImage();
            } else if (e.key === 'ArrowRight') {
                showNextImage();
            }
        }
    });
});

