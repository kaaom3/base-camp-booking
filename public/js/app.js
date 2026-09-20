let selectedSlot = null;
let currentFacility = null;
const isEn = typeof currentLang !== 'undefined' && currentLang === 'en';

document.addEventListener('DOMContentLoaded', () => {
    initDatePicker();

    const savedRoom = localStorage.getItem('basecamp_room');
    if(savedRoom) {
        checkMyBooking(savedRoom);
    }

    document.getElementById('booking-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (currentFacility === 'ice_bath') {
            showCustomConfirmModal();
        } else {
            await submitBooking();
        }
    });
});

function showCustomConfirmModal() {
    const modalHtml = `
    <div id="custom-modal-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; z-index:9999; padding: 20px;">
        <div style="background:white; border-radius:16px; padding:30px 20px; max-width:400px; width:100%; text-align:center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: popIn 0.3s ease-out;">
            <div style="font-size: 50px; margin-bottom: 10px;">🧊</div>
            <h3 style="color: #00bcd4; margin-bottom: 15px; font-size: 22px;">
                ${isEn ? 'Ice Bath Fee' : 'แจ้งเตือนค่าบริการ'}
            </h3>
            <p style="color: #4a5568; margin-bottom: 25px; line-height: 1.6; font-size: 16px;">
                ${isEn ? 'There is a fee of <strong style="color:#e53e3e; font-size:18px;">50 THB</strong> per session.<br>Please pay at the front counter before using the facility.' : 'บ่อน้ำแข็งมีค่าบริการ <strong style="color:#e53e3e; font-size:18px;">50 บาท</strong> ต่อรอบ<br>กรุณาติดต่อชำระเงินที่เคาน์เตอร์ก่อนเข้าใช้งาน'}
            </p>
            <div style="display: flex; gap: 10px;">
                <button onclick="closeCustomModal()" style="flex: 1; padding: 14px; border-radius: 8px; border: 2px solid #e2e8f0; background: white; color: #4a5568; font-weight: bold; cursor: pointer; font-family: 'Kanit', sans-serif;">
                    ${isEn ? 'Cancel' : 'ยกเลิก'}
                </button>
                <button onclick="confirmCustomModal()" style="flex: 1; padding: 14px; border-radius: 8px; border: none; background: #00bcd4; color: white; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0, 188, 212, 0.2); font-family: 'Kanit', sans-serif;">
                    ${isEn ? 'Proceed' : 'ยืนยันการจอง'}
                </button>
            </div>
        </div>
    </div>
    <style>
        @keyframes popIn {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }
    </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.closeCustomModal = function() {
    const modal = document.getElementById('custom-modal-overlay');
    if (modal) modal.remove();
}

window.confirmCustomModal = async function() {
    closeCustomModal();
    await submitBooking();
}

function initDatePicker() {
    const dateInput = document.getElementById('bookingDate');
    const today = new Date();
    const minDateStr = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    dateInput.min = minDateStr;
    dateInput.value = minDateStr;
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 7);
    const maxDateStr = maxDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    dateInput.max = maxDateStr;
}

function selectFacility(fac) {
    currentFacility = fac;
    document.getElementById('facility-container').classList.add('hidden');
    document.getElementById('consent-container').classList.remove('hidden');
    
    document.getElementById('terms-game_room').style.display = 'none';
    document.getElementById('terms-ice_bath').style.display = 'none';
    document.getElementById('terms-' + fac).style.display = 'block';
    
    // Reset consent
    document.getElementById('agreeCheckbox').checked = false;
    document.getElementById('btn-consent').disabled = true;
}

function backToFacility() {
    document.getElementById('consent-container').classList.add('hidden');
    document.getElementById('booking-container').classList.add('hidden');
    document.getElementById('facility-container').classList.remove('hidden');
    currentFacility = null;
    selectedSlot = null;
}

function toggleConsentBtn() {
    const isChecked = document.getElementById('agreeCheckbox').checked;
    document.getElementById('btn-consent').disabled = !isChecked;
}

function acceptConsent() {
    document.getElementById('consent-container').classList.add('hidden');
    document.getElementById('booking-container').classList.remove('hidden');
    
    // Set headers dynamically
    const headerEl = document.querySelector('#booking-header p');
    const titleEl = document.getElementById('slot-section-title');
    const optionSelect = document.getElementById('facilityOption');
    const optionLabel = document.getElementById('facilityOptionLabel');
    
    optionSelect.innerHTML = '';
    
    if (currentFacility === 'game_room') {
        headerEl.innerText = isEn ? 'Select Game Room Time' : 'เลือกเวลาเข้าใช้ห้องเกมส์';
        titleEl.innerText = isEn ? '🎮 Game Room Slots (1 hr)' : '🎮 เลือกรอบ Game Room (1 ชม.)';
        titleEl.style.color = 'var(--primary-color)';
        titleEl.style.borderColor = 'var(--primary-color)';
        
        optionLabel.innerText = isEn ? 'Select Console' : 'เลือกเครื่องเล่น';
        optionSelect.innerHTML = `
            <option value="ps5">PlayStation 5</option>
            <option value="nintendo">Nintendo Switch</option>
        `;
    } else {
        headerEl.innerText = isEn ? 'Select Ice Bath Time' : 'เลือกเวลาแช่บ่อน้ำแข็ง';
        titleEl.innerText = isEn ? '🧊 Ice Bath Slots (1 hr)' : '🧊 เลือกรอบ Ice Bath (1 ชม.)';
        titleEl.style.color = '#00bcd4';
        titleEl.style.borderColor = '#00bcd4';
        
        optionLabel.innerText = isEn ? 'Select Gender' : 'เลือกผู้ใช้บริการ';
        optionSelect.innerHTML = `
            <option value="male">${isEn ? 'Male (ชาย)' : 'บ่อชาย (Male)'}</option>
            <option value="female">${isEn ? 'Female (หญิง)' : 'บ่อหญิง (Female)'}</option>
            <option value="both">${isEn ? 'Both (ชายและหญิง)' : 'จองทั้งคู่ ชายและหญิง (Both)'}</option>
        `;
    }
    
    loadSlots();
}

function onOptionChange() {
    selectedSlot = null;
    document.getElementById('btn-submit').disabled = true;
    loadSlots();
}

const getSelectedDateString = () => {
    return document.getElementById('bookingDate').value || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
};

function onDateChange() {
    selectedSlot = null;
    document.getElementById('btn-submit').disabled = true;
    loadSlots();
}

async function loadSlots() {
    const container = document.getElementById('slots-container');
    const selectedDate = getSelectedDateString();
    
    const loadingText = isEn ? 'Loading time slots...' : 'กำลังโหลดข้อมูลรอบเวลา...';
    container.innerHTML = `<div class="loading-state">${loadingText}</div>`;

    try {
        const selectedOption = document.getElementById('facilityOption').value;
        const res = await fetch(`https://sibling-compacted-decrease.ngrok-free.dev/api/customer/slots/available?date=${selectedDate}&facility=${currentFacility}&option=${selectedOption}`, {
            headers: {
                'ngrok-skip-browser-warning': '69420'
            }
        });
        if (!res.ok) throw new Error('Network response was not ok');
        
        const slots = await res.json();
        container.innerHTML = '';
        
        slots.forEach(slot => {
            const btn = document.createElement('div');
            btn.className = `slot-btn ${slot.isAvailable ? 'available' : 'booked'}`;
            
            const statusText = slot.isAvailable ? 'AVAILABLE' : 'BOOKED';
            
            btn.innerHTML = `
                <div class="slot-time">${slot.startTime} - ${slot.endTime}</div>
                <div class="slot-status">${statusText}</div>
            `;
            
            if (slot.isAvailable) {
                btn.onclick = () => selectSlot(slot.slotNumber, btn);
            }

            container.appendChild(btn);
        });

    } catch (error) {
        console.error(error);
        const errText = isEn ? '❌ Cannot load time slots.' : '❌ ไม่สามารถโหลดข้อมูลรอบเวลาได้';
        container.innerHTML = `<div class="loading-state" style="color:red;">${errText}</div>`;
    }
}

function selectSlot(slotNumber, btnElement) {
    document.querySelectorAll('#slots-container .slot-btn').forEach(btn => {
        btn.classList.remove('selected');
        if(btn.classList.contains('available')) {
            btn.querySelector('.slot-status').innerText = 'AVAILABLE';
        }
    });
    
    btnElement.classList.add('selected');
    btnElement.querySelector('.slot-status').innerText = 'SELECTED';
    
    selectedSlot = slotNumber;
    document.getElementById('btn-submit').disabled = false;
}

async function submitBooking() {
    if (!selectedSlot) return alert(isEn ? 'Please select a time slot' : 'กรุณาเลือกรอบเวลา');

    const roomNumber = document.getElementById('roomNumber').value;
    const displayName = document.getElementById('displayName').value;
    const selectedDate = getSelectedDateString();

    const btn = document.getElementById('btn-submit');
    const originalText = btn.innerText;
    btn.innerText = isEn ? 'PROCESSING...' : 'กำลังดำเนินการ...';
    btn.disabled = true;

    try {
        const res = await fetch('https://sibling-compacted-decrease.ngrok-free.dev/api/customer/bookings', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            },
            body: JSON.stringify({
                displayName, 
                hotelRoomNumber: roomNumber, 
                bookingDate: selectedDate, 
                slotNumber: selectedSlot, 
                facility: currentFacility,
                facilityOption: document.getElementById('facilityOption').value
            })
        });
        
        const data = await res.json();
        if (!res.ok) {
            alert(data.message || 'Error');
            btn.innerText = originalText;
            btn.disabled = false;
            return;
        }

        localStorage.setItem('basecamp_room', roomNumber);
        
        checkMyBooking(roomNumber);

    } catch (error) {
        const connErr = isEn ? 'Cannot connect to server. Please try again.' : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่';
        alert(connErr);
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function checkMyBooking(roomNumber) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    try {
        const res = await fetch(`https://sibling-compacted-decrease.ngrok-free.dev/api/customer/bookings/my-booking?hotelRoomNumber=${roomNumber}&date=${today}`, {
            headers: {
                'ngrok-skip-browser-warning': '69420'
            }
        });
        if (res.ok) {
            const data = await res.json(); 
            document.getElementById('facility-container').classList.add('hidden');
            document.getElementById('consent-container').classList.add('hidden');
            document.getElementById('booking-container').classList.add('hidden');
            showTicket(data);
        } else {
            document.getElementById('roomNumber').value = roomNumber;
        }
    } catch (error) {
        console.error(error);
    }
}

function showTicket(bookings) {
    if (!Array.isArray(bookings)) bookings = [bookings];
    
    document.getElementById('facility-container').classList.add('hidden');
    document.getElementById('consent-container').classList.add('hidden');
    document.getElementById('booking-container').classList.add('hidden');
    document.getElementById('ticket-container').classList.remove('hidden');

    const wrapper = document.getElementById('tickets-wrapper');
    wrapper.innerHTML = '';

    bookings.forEach(booking => {
        let name = "-";
        if (booking.userId && booking.userId.displayName) name = booking.userId.displayName;
        
        let optionLabel = '';
        if (booking.facilityOption === 'ps5') optionLabel = ' (PS5)';
        else if (booking.facilityOption === 'nintendo') optionLabel = ' (Nintendo)';
        else if (booking.facilityOption === 'male') optionLabel = isEn ? ' (Male)' : ' (ชาย)';
        else if (booking.facilityOption === 'female') optionLabel = isEn ? ' (Female)' : ' (หญิง)';
        else if (booking.facilityOption === 'both') optionLabel = isEn ? ' (Both)' : ' (คู่)';
        
        const facilityLabel = (booking.facility === 'ice_bath' ? (isEn ? '🧊 ICE BATH' : '🧊 บ่อน้ำแข็ง') : (isEn ? '🎮 GAME ROOM' : '🎮 ห้องเกมส์')) + optionLabel;
        const color = booking.facility === 'ice_bath' ? '#00bcd4' : 'var(--primary-color)';
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${booking.bookingRef}`;

        let feeAlertHtml = '';
        if (booking.facility === 'ice_bath') {
            feeAlertHtml = `
                <div style="margin-top: 15px; padding: 10px; background: #fff5f5; color: #c53030; border: 1px solid #feb2b2; border-radius: 8px; text-align: center; font-size: 14px; font-weight: bold;">
                    ${isEn ? '⚠️ Fee: 50 THB. Please pay at the counter.' : '⚠️ ค่าบริการ 50 บาท กรุณาชำระที่เคาน์เตอร์'}
                </div>
            `;
        }

        const ticketHtml = `
            <div style="border: 1px solid var(--border-color); border-radius: 12px; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
                <div style="background: ${color}; color: white; padding: 10px; text-align: center; font-weight: 600; font-size: 16px;">
                    ${facilityLabel}
                </div>
                <div class="ticket-body" style="padding: 20px;">
                    <div class="qr-box" style="margin-bottom: 20px; text-align: center;">
                        <img src="${qrUrl}" alt="Booking QR Code" style="width: 150px; height: 150px; display:inline-block;">
                        <p class="qr-hint" style="margin-top:10px; font-size:13px; color:var(--text-muted);">${isEn ? 'Please show this screen to staff' : 'โปรดแสดงหน้าจอนี้แก่พนักงาน'}</p>
                    </div>
                    
                    <div class="ticket-right-col" style="flex: 1; display: flex; flex-direction: column;">
                        <div class="ticket-info">
                            <div class="info-row">
                                <span class="label">${isEn ? 'Booking Ref' : 'รหัสการจอง'}</span>
                                <span class="value highlight">${booking.bookingRef}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">${isEn ? 'Guest Name' : 'ชื่อผู้จอง'}</span>
                                <span class="value">${name}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">${isEn ? 'Room' : 'ห้องพัก'}</span>
                                <span class="value">${booking.hotelRoomNumber}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">${isEn ? 'Time Slot' : 'เวลารอบ'}</span>
                                <span class="value highlight">${booking.bookingDate} | ${booking.startTime} - ${booking.endTime}</span>
                            </div>
                        </div>

                        ${feeAlertHtml}

                        <div class="alert-box" style="margin-top: ${feeAlertHtml ? '10px' : '15px'};">
                            ${isEn ? 'Please arrive 5 minutes before your session.' : 'กรุณามาถึงก่อนเวลา 5 นาที'}
                        </div>
                    </div>
                </div>
            </div>
        `;
        wrapper.innerHTML += ticketHtml;
    });
}

function resetSession() {
    localStorage.removeItem('basecamp_room');
    window.location.reload();
}
