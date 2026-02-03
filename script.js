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
        roomtype_big: 'Big room',
        roomtype_small: 'Small room',
        guests_label: 'Number of Guests',
        guests_placeholder: 'Select number of guests',
        guests_1: '1 Guest',
        guests_2: '2 Guests',
        guests_3: '3 Guests',
        guests_4: '4 Guests',
        phone_label: 'Phone Number',
        phone_placeholder: 'Enter your phone number',
        checkin_checkout_info: 'Check-in after 2:00 PM; Check-out before 12:00 PM',
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
        room_type_single: 'однокомнатный номер',
        room_type_double: 'двухкомнатный номер',
        
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
        roomtype_big: 'Большой номер',
        roomtype_small: 'Малый номер',
        guests_label: 'Количество гостей',
        guests_placeholder: 'Выберите количество гостей',
        guests_1: '1 гость',
        guests_2: '2 гостя',
        guests_3: '3 гостя',
        guests_4: '4 гостя',
        phone_label: 'Номер телефона',
        phone_placeholder: 'Введите номер телефона',
        checkin_checkout_info: 'Заезд после 14:00; Выезд до 12:00',
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
        err_phone_required: 'Номер телефона обязателен',
        err_phone_invalid: 'Введите корректный номер телефона',
        err_prefix: 'Пожалуйста, заполните все обязательные поля корректно:\\n\\n',
        no_availability: 'Нет доступных номеров на выбранные даты'
    }
};

let currentLang = 'en';

function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) ? translations[currentLang][key] : key;
}

function applyTranslations(lang) {
    currentLang = lang;

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
        langButton.textContent = lang.toUpperCase() === 'RU' ? 'RU' : 'ENG';
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
const BACKEND_URL = 'http://localhost:3001';

// Get modal elements
const bookingModal = document.getElementById('bookingModal');
const successModal = document.getElementById('successModal');
const bookingForm = document.getElementById('bookingForm');
const modalClose = document.querySelector('.modal-close');

// Flatpickr instances
let checkinPicker = null;
let checkoutPicker = null;
let bookedDates = [];

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
        ? checkinPicker.selectedDates[0].toISOString().split('T')[0]
        : '';
    const checkout = checkoutPicker && checkoutPicker.selectedDates.length > 0 
        ? checkoutPicker.selectedDates[0].toISOString().split('T')[0]
        : '';
    
    const submitButton = bookingForm.querySelector('button[type="submit"]');
    const availabilityMessage = document.getElementById('availabilityMessage');
    
    if (!roomType || !checkin || !checkout) {
        if (submitButton) submitButton.disabled = false;
        if (availabilityMessage) availabilityMessage.style.display = 'none';
        return;
    }
    
    // Check if any date in the range is unavailable
    const start = new Date(checkin);
    const end = new Date(checkout);
    let hasUnavailableDate = false;
    
    const current = new Date(start);
    while (current < end) {
        const dateStr = current.toISOString().split('T')[0];
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

// Open success modal
function openSuccessModal() {
    successModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Close success modal
function closeSuccessModal() {
    successModal.classList.remove('show');
    bookingModal.classList.remove('show');
    document.body.style.overflow = '';
    // Reset form
    bookingForm.reset();
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target === bookingModal) {
        closeBookingModal();
    }
    if (event.target === successModal) {
        closeSuccessModal();
    }
});

// Close modal with X button
if (modalClose) {
    modalClose.addEventListener('click', closeBookingModal);
}

// ----------------------------
// Food Menu Modal - Clean Rebuild
// ----------------------------
const MENU_PDF_FILE = 'menu.pdf';

// Open menu modal
function openMenuModal() {
    const menuModal = document.getElementById('menuModal');
    const menuPdfViewer = document.getElementById('menuPdfViewer');
    
    if (!menuModal || !menuPdfViewer) return;
    
    // Disable body scroll
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Load first page - use zoom to fit one page on screen
    // Calculate zoom based on viewport to ensure one page fits without horizontal scroll
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const buttonSpace = 150; // Space for button container and padding
    const availableHeight = viewportHeight - buttonSpace;
    
    // Target width that works without scrollbar (user tested: 580px works)
    const targetWidth = 580;
    
    // A4 dimensions at 100% zoom: width ~794px, height ~1123px
    // Calculate zoom based on target width
    const widthZoom = (targetWidth / 794) * 100;
    const heightZoom = (availableHeight / 1123) * 100;
    
    // Use the smaller zoom to ensure it fits both width and height
    // Use Math.floor to ensure we don't exceed viewport
    const zoomPercent = Math.min(75, Math.floor(Math.min(heightZoom, widthZoom)));
    
    // Calculate actual PDF dimensions at this zoom
    const pdfWidth = (794 * zoomPercent) / 100;
    const pdfHeight = (1123 * zoomPercent) / 100;
    
    // Set iframe size to target width to avoid horizontal scrollbar
    menuPdfViewer.style.width = `${targetWidth}px`;
    menuPdfViewer.style.height = `${pdfHeight}px`;
    
    menuPdfViewer.src = `${MENU_PDF_FILE}#page=1&toolbar=0&navpanes=0&scrollbar=0&zoom=${zoomPercent}`;
    
    // Show modal
    menuModal.classList.add('show');
}

// Close menu modal
function closeMenuModal() {
    const menuModal = document.getElementById('menuModal');
    if (menuModal) {
        menuModal.classList.remove('show');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    }
}


// WhatsApp integration - ONLY called from green button
function openWhatsAppOrder() {
    const whatsappNumber = '66957084335';
    const messageText = currentLang === 'ru' 
        ? 'Здравствуйте! Я хотел бы заказать еду из вашего меню.'
        : 'Hello! I would like to order food from your menu.';
    const message = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
}

// Initialize menu modal event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Close button
    const closeBtn = document.getElementById('menuCloseBtn');
    if (closeBtn) {
        closeBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeMenuModal();
        };
    }
    
    // Order button - ONLY this opens WhatsApp
    const orderBtn = document.getElementById('menuOrderBtn');
    if (orderBtn) {
        orderBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            openWhatsAppOrder();
        };
    }
    
    // Prevent clicks on PDF container from doing anything
    const pdfContainer = document.querySelector('.menu-pdf-container');
    if (pdfContainer) {
        pdfContainer.onclick = function(e) {
            // Only prevent if clicking on the container itself, not buttons
            if (e.target === pdfContainer || e.target.closest('iframe')) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
    }
});

// Send booking to backend
async function sendBookingToBackend(checkin, checkout, roomType, guests, phone) {
    console.log('🚀 Starting booking submission...', { checkin, checkout, roomType, guests, phone });
    
    // Validate payload before sending
    if (!checkin || !checkout || !roomType || !guests || !phone) {
        console.log('❌ Validation failed: Missing required fields');
        return { success: false, error: 'Missing required fields' };
    }
    
    try {
        const payload = {
            roomType,
            checkIn: checkin,
            checkOut: checkout,
            guests,
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

bookingForm.addEventListener('submit', function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Prevent double submission
    if (isSubmitting) {
        console.log('⚠️ Submission already in progress, ignoring duplicate click');
        return false;
    }
    
    // Get submit button
    const submitButton = bookingForm.querySelector('button[type="submit"]');
    if (!submitButton) {
        console.log('❌ Submit button not found');
        return false;
    }
    
    // Get form values from Flatpickr instances
    const checkin = checkinPicker && checkinPicker.selectedDates.length > 0 
        ? checkinPicker.selectedDates[0].toISOString().split('T')[0]
        : document.getElementById('checkin').value;
    const checkout = checkoutPicker && checkoutPicker.selectedDates.length > 0 
        ? checkoutPicker.selectedDates[0].toISOString().split('T')[0]
        : document.getElementById('checkout').value;
    const roomType = document.getElementById('roomType').value;
    const guests = document.getElementById('guests').value;
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
    
    if (!phone) {
        errors.push(t('err_phone_required'));
        isValid = false;
    } else if (!/^[0-9+\-\s()]+$/.test(phone)) {
        errors.push(t('err_phone_invalid'));
        isValid = false;
    }
    
    if (!isValid) {
        // Show validation errors
        alert(t('err_prefix') + errors.join('\n'));
        return false;
    }
    
    // Disable button and set loading state
    isSubmitting = true;
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    submitButton.style.opacity = '0.6';
    submitButton.style.cursor = 'not-allowed';
    
    // Send booking to backend
    sendBookingToBackend(checkin, checkout, roomType, guests, phone)
        .then(result => {
            // Re-enable button
            isSubmitting = false;
            submitButton.disabled = false;
            submitButton.textContent = originalText;
            submitButton.style.opacity = '1';
            submitButton.style.cursor = 'pointer';
            
            if (result.success) {
                // Close booking modal
                closeBookingModal();
                
                // Show success modal immediately
                openSuccessModal();
            } else {
                // Show error message
                const errorMsg = result.error || 'Failed to submit booking. Please try again.';
                alert(errorMsg);
            }
        })
        .catch(error => {
            // Re-enable button on error
            isSubmitting = false;
            submitButton.disabled = false;
            submitButton.textContent = originalText;
            submitButton.style.opacity = '1';
            submitButton.style.cursor = 'pointer';
            
            console.log('❌ Unexpected error:', error);
            alert('An unexpected error occurred. Please try again.');
        });
    
    return false;
});

// Prevent form submission on Enter key in input fields (except submit button)
const formInputs = bookingForm.querySelectorAll('input, select');
formInputs.forEach(function(input) {
    input.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && input.type !== 'submit') {
            event.preventDefault();
            // Move to next field or submit
            const inputs = Array.from(formInputs);
            const currentIndex = inputs.indexOf(input);
            if (currentIndex < inputs.length - 1) {
                inputs[currentIndex + 1].focus();
            } else {
                bookingForm.querySelector('button[type="submit"]').click();
            }
        }
    });
});

// Default language (ENG)
applyTranslations('en');

// Room type change handler
const roomTypeSelect = document.getElementById('roomType');
if (roomTypeSelect) {
    roomTypeSelect.addEventListener('change', async function() {
        const selectedRoomType = this.value;
        const availabilityMessage = document.getElementById('availabilityMessage');
        const checkinInput = document.getElementById('checkin');
        const checkoutInput = document.getElementById('checkout');
        
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
const maxImages = 10; // Maximum number of images to try loading
let currentImageList = []; // Store all loaded image sources for navigation
let currentImageIndex = 0; // Current image index in lightbox

function scrollToRooms() {
    const roomsSection = document.getElementById('roomsSection');
    if (roomsSection) {
        roomsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function loadRoomImages(roomType) {
    const gallery = document.getElementById('roomGallery');
    if (!gallery) return;
    
    gallery.innerHTML = ''; // Clear existing images
    currentImageList = []; // Reset image list
    
    let loadedCount = 0;
    
    // Try to load images (single1.jpg/png, single2.jpg/png, etc. or double1.jpg/png, double2.jpg/png, etc.)
    for (let i = 1; i <= maxImages; i++) {
        const img = document.createElement('div');
        img.className = 'room-gallery-item';
        
        const imageElement = document.createElement('img');
        // Try .png first, then .jpg as fallback
        const extensions = ['png', 'jpg'];
        let currentExtensionIndex = 0;
        let finalImageSrc = '';
        
        function tryLoadImage() {
            if (currentExtensionIndex < extensions.length) {
                finalImageSrc = `${roomType}${i}.${extensions[currentExtensionIndex]}`;
                imageElement.src = finalImageSrc;
                imageElement.alt = `${roomType} room ${i}`;
            }
        }
        
        imageElement.onload = function() {
            loadedCount++;
            // Add to image list for navigation
            if (finalImageSrc && !currentImageList.includes(finalImageSrc)) {
                currentImageList.push(finalImageSrc);
            }
            
            // Make image clickable to open in full size (after it loads)
            img.style.cursor = 'pointer';
            img.onclick = function() {
                const imageIndex = currentImageList.indexOf(finalImageSrc);
                openImageLightbox(finalImageSrc, imageIndex);
            };
        };
        
        imageElement.onerror = function() {
            // Try next extension
            currentExtensionIndex++;
            if (currentExtensionIndex < extensions.length) {
                tryLoadImage();
            } else {
                // If both extensions fail, remove this item
                img.remove();
            }
        };
        
        tryLoadImage();
        img.appendChild(imageElement);
        gallery.appendChild(img);
    }
}

function setActiveRoomType(roomType) {
    currentRoomType = roomType;
    
    // Update button states
    document.querySelectorAll('.room-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-room-type') === roomType);
    });
    
    // Load images for selected room type
    loadRoomImages(roomType);
}

// Room type selector event listeners
document.querySelectorAll('.room-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const roomType = this.getAttribute('data-room-type');
        setActiveRoomType(roomType);
    });
});

// Initialize with single room images
if (document.getElementById('roomGallery')) {
    loadRoomImages('single');
}

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

