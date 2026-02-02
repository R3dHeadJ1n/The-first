// Booking Modal + Language Switcher (vanilla JS)

// ----------------------------
// Language switching (RU / EN)
// ----------------------------
const translations = {
    en: {
        // Main buttons
        book_main: 'Book a Room',
        order_main: 'Order Food',

        // Booking modal
        booking_title: 'Book a Room',
        checkin_label: 'Check-in Date',
        checkout_label: 'Check-out Date',
        roomtype_label: 'Room Type',
        roomtype_placeholder: 'Select room type',
        roomtype_single: 'Single room — 700 THB',
        roomtype_double: 'Double room — 900 THB',
        guests_label: 'Number of Guests',
        guests_placeholder: 'Select number of guests',
        guests_1: '1 Guest',
        guests_2: '2 Guests',
        guests_3: '3 Guests',
        guests_4: '4 Guests',
        phone_label: 'Phone Number',
        phone_placeholder: 'Enter your phone number',
        book_submit: 'Book a Room',

        // Success modal
        success_title: 'Booking Confirmed!',
        success_message: 'Your room has been booked. We will contact you via WhatsApp.',
        close: 'Close',

        // Validation messages
        err_checkin_required: 'Check-in date is required',
        err_checkout_required: 'Check-out date is required',
        err_checkout_after: 'Check-out date must be after check-in date',
        err_roomtype_required: 'Please select a room type',
        err_guests_required: 'Please select number of guests',
        err_phone_required: 'Phone number is required',
        err_phone_invalid: 'Please enter a valid phone number',
        err_prefix: 'Please fill in all required fields correctly:\n\n'
    },
    ru: {
        // Main buttons
        book_main: 'Забронировать номер',
        order_main: 'Заказать еду',

        // Booking modal
        booking_title: 'Бронирование номера',
        checkin_label: 'Дата заезда',
        checkout_label: 'Дата выезда',
        roomtype_label: 'Тип номера',
        roomtype_placeholder: 'Выберите тип номера',
        roomtype_single: 'Одноместный номер — 700 THB',
        roomtype_double: 'Двухместный номер — 900 THB',
        guests_label: 'Количество гостей',
        guests_placeholder: 'Выберите количество гостей',
        guests_1: '1 гость',
        guests_2: '2 гостя',
        guests_3: '3 гостя',
        guests_4: '4 гостя',
        phone_label: 'Номер телефона',
        phone_placeholder: 'Введите номер телефона',
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
        err_prefix: 'Пожалуйста, заполните все обязательные поля корректно:\n\n'
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

    // Active button styling
    document.querySelectorAll('.lang-btn').forEach((btn) => {
        btn.classList.toggle('is-active', btn.getAttribute('data-lang') === lang);
    });
}

document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        applyTranslations(btn.getAttribute('data-lang'));
    });
});

// Get modal elements
const bookingModal = document.getElementById('bookingModal');
const successModal = document.getElementById('successModal');
const bookingForm = document.getElementById('bookingForm');
const modalClose = document.querySelector('.modal-close');

// Set minimum date to today for date pickers
const today = new Date().toISOString().split('T')[0];
document.getElementById('checkin').setAttribute('min', today);
document.getElementById('checkout').setAttribute('min', today);

// Update checkout minimum date when check-in date changes
document.getElementById('checkin').addEventListener('change', function() {
    const checkinDate = this.value;
    const checkoutInput = document.getElementById('checkout');
    if (checkinDate) {
        // Set minimum checkout date to day after check-in
        const nextDay = new Date(checkinDate);
        nextDay.setDate(nextDay.getDate() + 1);
        checkoutInput.setAttribute('min', nextDay.toISOString().split('T')[0]);
        
        // If checkout date is before new minimum, clear it
        if (checkoutInput.value && checkoutInput.value <= checkinDate) {
            checkoutInput.value = '';
        }
    }
});

// Open booking modal
function openBookingModal() {
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

// Form validation and submission
bookingForm.addEventListener('submit', function(event) {
    event.preventDefault();
    
    // Get form values
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
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
    
    if (isValid) {
        // Close booking modal
        closeBookingModal();
        
        // Show success modal after a brief delay
        setTimeout(function() {
            openSuccessModal();
        }, 300);
    } else {
        // Show validation errors (simple alert for now, can be enhanced with custom UI)
        alert(t('err_prefix') + errors.join('\n'));
    }
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
