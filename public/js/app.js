
const isEn = typeof currentLang !== 'undefined' && currentLang === 'en';

let currentFacility = null;
let currentOption = null;
let selectedDate = null;
let selectedSlot = null; // Used for normal selection (or Male for both)
let selectedSlot2 = null; // Used for Female when 'both' is selected

document.addEventListener('DOMContentLoaded', () => {
    updateProgress(1);
    // Set default date to today
    const dateInput = document.getElementById('globalDate');
    if (dateInput) {
        const bkkTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
        dateInput.value = bkkTime.toLocaleDateString('en-CA');
    }
});


function updateProgress(stepNumber) {
    const indicator = document.getElementById('stepIndicator');
    if (!indicator) return;
    
    if (stepNumber === 5) {
        indicator.style.display = 'none';
        return;
    } else {
        indicator.style.display = 'flex';
    }

    for (let i = 1; i <= 4; i++) {
        const item = document.getElementById('indicator-' + i);
        if (!item) continue;
        
        item.classList.remove('active', 'completed');
        if (i < stepNumber) {
            item.classList.add('completed');
        } else if (i === stepNumber) {
            item.classList.add('active');
        }
    }
}

function hideAllSteps() {
    ['step-1', 'step-2', 'step-3', 'step-4', 'ticket-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

// ================= STEP 1 -> STEP 2 =================

async function goStep2(facility) {
    const dateInput = document.getElementById('globalDate');
    if (!dateInput.value) {
        alert(isEn ? 'Please select a date' : 'กรุณาเลือกวันที่จอง');
        return;
    }
    selectedDate = dateInput.value;
    currentFacility = facility;
    
    hideAllSteps();
    document.getElementById('step-2').classList.remove('hidden');
    updateProgress(2);
    
    const loadingEl = document.getElementById('options-loading');
    const optionsEl = document.getElementById('options-container');
    loadingEl.style.display = 'block';
    optionsEl.style.display = 'none';

    try {
        const res = await fetch(`https://sibling-compacted-decrease.ngrok-free.dev/api/customer/slots/summary?date=${selectedDate}&facility=${currentFacility}`, {
            headers: { 'ngrok-skip-browser-warning': '69420' }
        });
        if (!res.ok) throw new Error('API Error');
        const summary = await res.json();
        
        loadingEl.style.display = 'none';
        optionsEl.style.display = 'flex';
        
        let html = '';
        if (facility === 'game_room') {
            document.getElementById('step2-title').innerText = isEn ? '🎮 Select Console' : '🎮 เลือกเครื่องเล่น';
            
            const ps5Avail = summary.ps5 > 0;
            const ninAvail = summary.nintendo > 0;
            
            html += `
                <button class="fac-btn fac-game" ${ps5Avail ? 'onclick="goStep3(\'ps5\')"' : 'disabled'}>
                    <div class="fac-icon">🕹️</div>
                    <div class="fac-title">PlayStation 5</div>
                    <div class="price-tag">${ps5Avail ? (isEn ? 'Available' : 'ว่าง') : (isEn ? 'FULLY BOOKED' : 'คิวเต็มแล้ว')}</div>
                </button>
                <button class="fac-btn fac-nintendo" ${ninAvail ? 'onclick="goStep3(\'nintendo\')"' : 'disabled'}>
                    <div class="fac-icon">🍄</div>
                    <div class="fac-title">Nintendo Switch</div>
                    <div class="price-tag">${ninAvail ? (isEn ? 'Available' : 'ว่าง') : (isEn ? 'FULLY BOOKED' : 'คิวเต็มแล้ว')}</div>
                </button>
            `;
        } else {
            document.getElementById('step2-title').innerText = isEn ? '🧊 Select Option' : '🧊 เลือกบ่อที่ต้องการจอง';
            
            const maleAvail = summary.male > 0;
            const femaleAvail = summary.female > 0;
            const bothAvail = maleAvail && femaleAvail;
            
            html += `
                <button class="fac-btn fac-game" ${maleAvail ? 'onclick="goStep3(\'male\')"' : 'disabled'}>
                    <div class="fac-icon">👨</div>
                    <div class="fac-title">${isEn ? 'Male Bath' : 'บ่อผู้ชาย (Male)'}</div>
                    <div class="price-tag">${maleAvail ? (isEn ? 'Available' : 'ว่าง') : (isEn ? 'FULLY BOOKED' : 'คิวเต็มแล้ว')}</div>
                </button>
                <button class="fac-btn fac-female" ${femaleAvail ? 'onclick="goStep3(\'female\')"' : 'disabled'}>
                    <div class="fac-icon">👩</div>
                    <div class="fac-title">${isEn ? 'Female Bath' : 'บ่อผู้หญิง (Female)'}</div>
                    <div class="price-tag">${femaleAvail ? (isEn ? 'Available' : 'ว่าง') : (isEn ? 'FULLY BOOKED' : 'คิวเต็มแล้ว')}</div>
                </button>
                <button class="fac-btn fac-both" ${bothAvail ? 'onclick="goStep3(\'both\')"' : 'disabled'}>
                    <div class="fac-icon">👩‍❤️‍👨</div>
                    <div class="fac-title">${isEn ? 'Couples (Both)' : 'จองทั้งคู่ ชายและหญิง'}</div>
                    <div class="price-tag">${bothAvail ? (isEn ? 'Available' : 'ว่าง') : (isEn ? 'FULLY BOOKED' : 'คิวเต็มแล้ว')}</div>
                </button>
            `;
        }
        optionsEl.innerHTML = html;
        
    } catch (err) {
        console.error(err);
        alert(isEn ? 'Error loading availability. Please try again.' : 'เกิดข้อผิดพลาดในการโหลดคิวว่าง กรุณาลองใหม่');
        goBackToStep1();
    }
}

function goBackToStep1() {
    hideAllSteps();
    document.getElementById('step-1').classList.remove('hidden');
    updateProgress(1);
    currentFacility = null;
}

// ================= STEP 2 -> STEP 3 =================

function goStep3(option) {
    currentOption = option;
    hideAllSteps();
    document.getElementById('step-3').classList.remove('hidden');
    updateProgress(3);
    
    document.getElementById('terms-game_room').style.display = 'none';
    document.getElementById('terms-ice_bath').style.display = 'none';
    document.getElementById('terms-' + currentFacility).style.display = 'block';
    
    document.getElementById('agreeCheckbox').checked = false;
    document.getElementById('btn-consent').disabled = true;
}

function toggleConsentBtn() {
    document.getElementById('btn-consent').disabled = !document.getElementById('agreeCheckbox').checked;
}

function goBackToStep2() {
    goStep2(currentFacility); // re-fetch summary just in case
}

// ================= STEP 3 -> STEP 4 =================

function goStep4() {
    hideAllSteps();
    document.getElementById('step-4').classList.remove('hidden');
    updateProgress(4);
    
    selectedSlot = null;
    selectedSlot2 = null;
    document.getElementById('btn-submit').disabled = true;
    
    document.getElementById('slots-container-2').style.display = 'none';
    
    if (currentOption === 'both') {
        document.getElementById('slot-section-title').innerText = isEn ? '1. Select Time for Male' : '1. เลือกรอบเวลา (บ่อชาย)';
    } else {
        document.getElementById('slot-section-title').innerText = isEn ? 'Select Time Slot' : 'เลือกรอบเวลา';
    }
    
    loadSlotsForOption();
}

function goBackToStep3() {
    hideAllSteps();
    document.getElementById('step-3').classList.remove('hidden');
    updateProgress(3);
}

// ================= SLOT LOGIC =================

async function fetchSlots(option, containerId, isSecondSlot = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="loading-state">${isEn ? 'Loading slots...' : 'กำลังโหลดรอบ...'}</div>`;
    
    try {
        const res = await fetch(`https://sibling-compacted-decrease.ngrok-free.dev/api/customer/slots/available?date=${selectedDate}&facility=${currentFacility}&option=${option}`, {
            headers: { 'ngrok-skip-browser-warning': '69420' }
        });
        if (!res.ok) throw new Error('Network error');
        
        const slots = await res.json();
        
        if (slots.length === 0) {
            container.innerHTML = `<div class="loading-state">${isEn ? 'No slots available' : 'ไม่มีรอบเวลาที่เปิดให้บริการ'}</div>`;
            return;
        }

        container.innerHTML = '';
        slots.forEach(slot => {
            const btn = document.createElement('button');
            btn.className = 'slot-btn';
            
            if (slot.isAvailable) {
                btn.onclick = () => selectSlot(slot.slotNumber, btn, isSecondSlot);
                btn.innerHTML = `
                    <div class="slot-time">${slot.startTime} - ${slot.endTime}</div>
                    <div class="slot-status available">${isEn ? 'AVAILABLE' : 'ว่าง'}</div>
                `;
            } else {
                btn.classList.add('booked');
                btn.disabled = true;
                btn.innerHTML = `
                    <div class="slot-time">${slot.startTime} - ${slot.endTime}</div>
                    <div class="slot-status booked">${isEn ? 'FULL' : 'เต็ม'}</div>
                `;
            }
            container.appendChild(btn);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="loading-state" style="color:red">${isEn ? 'Error loading slots' : 'โหลดข้อมูลผิดพลาด'}</div>`;
    }
}

function loadSlotsForOption() {
    if (currentOption === 'both') {
        fetchSlots('male', 'slots-container', false);
    } else {
        fetchSlots(currentOption, 'slots-container', false);
    }
}

function selectSlot(slotNumber, btnElement, isSecondSlot) {
    const container = btnElement.parentElement;
    container.querySelectorAll('.slot-btn').forEach(btn => {
        if (!btn.classList.contains('booked')) {
            btn.classList.remove('selected');
            btn.querySelector('.slot-status').innerText = isEn ? 'AVAILABLE' : 'ว่าง';
        }
    });
    
    btnElement.classList.add('selected');
    btnElement.querySelector('.slot-status').innerText = isEn ? 'SELECTED' : 'เลือกแล้ว';
    
    if (isSecondSlot) {
        selectedSlot2 = slotNumber;
        checkFormReady();
    } else {
        selectedSlot = slotNumber;
        if (currentOption === 'both') {
            // Load female slots
            document.getElementById('slots-container-2').style.display = 'block';
            document.getElementById('slots-container-2').innerHTML = `
                <h4 style="margin-bottom:10px; color:#d53f8c;">${isEn ? '2. Select Time for Female' : '2. เลือกรอบเวลา (บ่อหญิง)'}</h4>
                <div id="slots-container-female" class="slots-grid"></div>
            `;
            fetchSlots('female', 'slots-container-female', true);
            selectedSlot2 = null;
            checkFormReady();
        } else {
            checkFormReady();
        }
    }
}

function checkFormReady() {
    if (currentOption === 'both') {
        document.getElementById('btn-submit').disabled = !(selectedSlot && selectedSlot2);
    } else {
        document.getElementById('btn-submit').disabled = !selectedSlot;
    }
}

// ================= SUBMIT =================

async function showCustomConfirmModal() {
    return new Promise((resolve) => {
        const modalHtml = `
            <div id="custom-confirm-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
                <div style="background: white; border-radius: 12px; width: 100%; max-width: 400px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🧊</div>
                    <h3 style="margin-bottom: 15px; color: #2d3748;">${isEn ? 'Payment Confirmation' : 'ยืนยันค่าบริการ'}</h3>
                    <p style="margin-bottom: 25px; color: #4a5568; line-height: 1.5;">
                        ${isEn ? 'Ice Bath service has a fee of <strong>50 THB</strong> per session.<br><br>Please pay at the counter.' : 'บริการแช่บ่อน้ำแข็งมีค่าบริการ <strong>50 บาท</strong> ต่อรอบการใช้งาน<br><br>กรุณาชำระเงินที่เคาน์เตอร์'}
                    </p>
                    <div style="display: flex; gap: 10px;">
                        <button id="modal-btn-cancel" style="flex: 1; padding: 12px; border: 1px solid #cbd5e0; background: white; border-radius: 8px; color: #4a5568; font-weight: bold; cursor: pointer;">${isEn ? 'Cancel' : 'ยกเลิก'}</button>
                        <button id="modal-btn-confirm" style="flex: 1; padding: 12px; border: none; background: #00bcd4; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">${isEn ? 'Acknowledge' : 'รับทราบ'}</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('custom-confirm-modal');
        
        document.getElementById('modal-btn-cancel').onclick = () => {
            modal.remove();
            resolve(false);
        };
        
        document.getElementById('modal-btn-confirm').onclick = () => {
            modal.remove();
            resolve(true);
        };
    });
}

async function submitBooking(e) {
    e.preventDefault();
    
    if (currentFacility === 'ice_bath') {
        const confirmed = await showCustomConfirmModal();
        if (!confirmed) return;
    }

    const roomNumber = document.getElementById('roomNumber').value;
    const displayName = document.getElementById('displayName').value;

    const btn = document.getElementById('btn-submit');
    const originalText = btn.innerText;
    btn.innerText = isEn ? 'PROCESSING...' : 'กำลังดำเนินการ...';
    btn.disabled = true;

    try {
        const bookingReqs = [];
        if (currentOption === 'both') {
            bookingReqs.push({
                displayName, hotelRoomNumber: roomNumber, bookingDate: selectedDate, 
                facility: 'ice_bath', facilityOption: 'male', slotNumber: selectedSlot
            });
            bookingReqs.push({
                displayName, hotelRoomNumber: roomNumber, bookingDate: selectedDate, 
                facility: 'ice_bath', facilityOption: 'female', slotNumber: selectedSlot2
            });
        } else {
            bookingReqs.push({
                displayName, hotelRoomNumber: roomNumber, bookingDate: selectedDate, 
                facility: currentFacility, facilityOption: currentOption, slotNumber: selectedSlot
            });
        }

        const results = [];
        for (const reqData of bookingReqs) {
            const res = await fetch('https://sibling-compacted-decrease.ngrok-free.dev/api/customer/bookings', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': '69420'
                },
                body: JSON.stringify(reqData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error');
            data.booking.displayName = displayName;
            results.push(data.booking);
        }

        showTicket(results);
    } catch (error) {
        alert(error.message);
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// ================= TICKET =================

function showTicket(bookings) {
    if (!Array.isArray(bookings)) bookings = [bookings];
    
    hideAllSteps();
    document.getElementById('ticket-container').classList.remove('hidden');
    updateProgress(5);

    const wrapper = document.getElementById('tickets-wrapper');
    wrapper.innerHTML = '';

    bookings.forEach(booking => {
        let name = "-";
        if (booking.displayName) name = booking.displayName;
        else if (booking.userId && booking.userId.displayName) name = booking.userId.displayName;
        
        let optionLabel = '';
        if (booking.facilityOption === 'ps5') optionLabel = ' (PS5)';
        else if (booking.facilityOption === 'nintendo') optionLabel = ' (Nintendo)';
        else if (booking.facilityOption === 'male') optionLabel = isEn ? ' (Male)' : ' (ชาย)';
        else if (booking.facilityOption === 'female') optionLabel = isEn ? ' (Female)' : ' (หญิง)';
        
        const facilityLabel = (booking.facility === 'ice_bath' ? (isEn ? '🧊 ICE BATH' : '🧊 บ่อน้ำแข็ง') : (isEn ? '🎮 GAME ROOM' : '🎮 ห้องเกมส์')) + optionLabel;
        const color = booking.facility === 'ice_bath' ? (booking.facilityOption === 'female' ? '#d53f8c' : '#00bcd4') : 'var(--primary-color)';
        
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${booking.bookingRef}`;

        let feeAlertHtml = '';
        if (booking.facility === 'ice_bath') {
            feeAlertHtml = `
                <div style="margin-top: 15px; padding: 10px; background: #fff5f5; color: #c53030; border: 1px solid #feb2b2; border-radius: 8px; text-align: center; font-size: 14px; font-weight: bold;">
                    ${isEn ? '⚠️ Fee: 50 THB. Please pay at the counter.' : '⚠️ ค่าบริการ 50 บาท กรุณาชำระที่เคาน์เตอร์'}
                </div>
            `;
        }

        const ticketId = `ticket-${booking.bookingRef}`;
        const ticketHtml = `
            <div id="${ticketId}" style="border: 1px solid var(--border-color); border-radius: 12px; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
                <div style="background: ${color}; color: white; padding: 10px; text-align: center; font-weight: 600; font-size: 16px;">
                    ${facilityLabel}
                </div>
                <div class="ticket-body" style="padding: 20px;">
                    <div class="qr-box" style="margin-bottom: 20px; text-align: center;">
                        <img src="${qrUrl}" alt="QR Code" style="display: block; margin: 0 auto; width: 180px; height: 180px;">
                        <p style="margin-top: 10px; font-weight: 600; font-size: 18px; color: #2d3748;">${booking.bookingRef}</p>
                    </div>
                    
                    <div style="border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #718096;">${isEn ? 'Date' : 'วันที่'}</span>
                            <strong style="color: #2d3748;">${booking.bookingDate}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #718096;">${isEn ? 'Time' : 'เวลา'}</span>
                            <strong style="color: #2d3748;">${booking.startTime} - ${booking.endTime}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #718096;">${isEn ? 'Room' : 'หมายเลขห้อง'}</span>
                            <strong style="color: #2d3748;">${booking.hotelRoomNumber}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #718096;">${isEn ? 'Name' : 'ชื่อผู้จอง'}</span>
                            <strong style="color: #2d3748;">${name}</strong>
                        </div>
                    </div>
                    
                    ${feeAlertHtml}
                    
                    <div style="margin-top: 15px; text-align: center; font-size: 13px; color: #718096; background: #f8fafc; padding: 10px; border-radius: 6px;">
                        ${isEn ? '💡 Please present this screen to the staff at the counter to access the service.' : '💡 กรุณาแสดงหน้าจอนี้แก่พนักงานที่เคาน์เตอร์เพื่อเข้าใช้บริการ'}
                    </div>
                </div>
            </div>
            <button type="button" class="btn-submit" style="margin-top: 10px; background: #4a5568; padding: 12px; font-size: 16px;" onclick="downloadTicket('${ticketId}', '${booking.bookingRef}', event)">
                ${isEn ? '💾 Save Ticket to Device' : '💾 บันทึกตั๋วรูปลงเครื่อง'}
            </button>
        `;
        wrapper.innerHTML += ticketHtml;
    });
}

async function downloadTicket(elementId, ref, event) {
    const el = document.getElementById(elementId);
    if (!el) return;
    try {
        const btn = event.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ Processing...';
        btn.disabled = true;
        
        const canvas = await html2canvas(el, { useCORS: true, scale: 2, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.download = `BaseCamp-Ticket-${ref}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        btn.innerHTML = originalText;
        btn.disabled = false;
    } catch (err) {
        console.error(err);
        alert('Failed to save ticket. Please take a screenshot instead. / ไม่สามารถบันทึกได้ กรุณาแคปหน้าจอแทนครับ');
        event.currentTarget.innerHTML = '💾 Save Ticket';
        event.currentTarget.disabled = false;
    }
}

function resetSession() { window.location.reload(); }
