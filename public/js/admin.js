const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('ngrok')) ? '' : 'https://sibling-compacted-decrease.ngrok-free.dev';

function customAlert(msg) {
    return new Promise(resolve => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.55); z-index:1000; display:flex; justify-content:center; align-items:center; backdrop-filter: blur(4px);';
        modal.innerHTML = "<div class='modal-box' style='background: #ffffff; border-top: 6px solid #0011ff; box-shadow: 0 20px 40px rgba(0,0,0,0.18); color: #1e293b; padding: 28px; border-radius: 14px; width: 400px; max-width: 90%; text-align: center;'><h3 style='color: #0011ff; font-family: Kanit, sans-serif; margin-top: 0; font-size: 20px;'>แจ้งเตือนระบบ</h3><p style='color: #334155; margin: 18px 0; font-family: Kanit, sans-serif; font-size: 16px; line-height: 1.6;'>" + msg.replace(/\n/g, '<br>') + "</p><div style='margin-top: 24px; display: flex; justify-content: center;'><button id='alertOkBtn' style='background: #0011ff; color: #ffffff; border: none; padding: 10px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,17,255,0.25); font-family: Kanit, sans-serif; font-size: 15px; cursor: pointer; font-weight: 600;'>ตกลง</button></div></div>";
        document.body.appendChild(modal);
        document.getElementById('alertOkBtn').onclick = () => { document.body.removeChild(modal); resolve(); };
    });
}

function customConfirm(msg) {
    return new Promise(resolve => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.55); z-index:1000; display:flex; justify-content:center; align-items:center; backdrop-filter: blur(4px);';
        modal.innerHTML = "<div class='modal-box' style='background: #ffffff; border-top: 6px solid #ff3a00; box-shadow: 0 20px 40px rgba(0,0,0,0.18); color: #1e293b; padding: 28px; border-radius: 14px; width: 400px; max-width: 90%; text-align: center;'><h3 style='color: #ff3a00; font-family: Kanit, sans-serif; margin-top: 0; font-size: 20px;'>ยืนยันการทำรายการ</h3><p style='color: #334155; margin: 18px 0; font-family: Kanit, sans-serif; font-size: 16px; line-height: 1.6;'>" + msg.replace(/\n/g, '<br>') + "</p><div style='margin-top: 24px; display: flex; gap: 12px; justify-content: center;'><button id='confirmNoBtn' style='background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 10px 24px; border-radius: 10px; font-family: Kanit, sans-serif; font-size: 15px; cursor: pointer; font-weight: 500;'>ยกเลิก</button><button id='confirmYesBtn' style='background: #ff3a00; color: #ffffff; border: none; padding: 10px 26px; border-radius: 10px; box-shadow: 0 4px 12px rgba(255,58,0,0.28); font-family: Kanit, sans-serif; font-size: 15px; cursor: pointer; font-weight: 600;'>ยืนยัน</button></div></div>";
        document.body.appendChild(modal);
        document.getElementById('confirmNoBtn').onclick = () => { document.body.removeChild(modal); resolve(false); };
        document.getElementById('confirmYesBtn').onclick = () => { document.body.removeChild(modal); resolve(true); };
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('current-date').innerText = today;

    // Set default date for admin schedule
    const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    document.getElementById('adminDate').value = dateStr;
    document.getElementById('historyDate').value = dateStr;
    const bikeDateEl = document.getElementById('adminBikeDate');
    if (bikeDateEl) bikeDateEl.value = dateStr;
    const ctrlDateEl = document.getElementById('controlDate');
    if (ctrlDateEl) ctrlDateEl.value = dateStr;

    loadSchedule();
    // Auto refresh every 30 seconds
    setInterval(() => {
        if (document.getElementById('tab-schedule').classList.contains('active')) {
            loadSchedule();
        } else if (document.getElementById('tab-bicycle').classList.contains('active')) {
            loadBicycleFleet();
        }
    }, 30000);
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.add('active');

    if (tabId === 'history') {
        loadHistory();
    } else if (tabId === 'bicycle') {
        loadBicycleFleet();
    } else if (tabId === 'facility') {
        loadFacilityStatus();
    } else {
        loadSchedule();
    }
}

const statusMap = {
    'booked': { label: 'รอ Check-in', color: 'bg-yellow' },
    'checked_in': { label: 'กำลังใช้งาน', color: 'bg-blue' },
    'completed': { label: 'เสร็จสิ้น', color: 'bg-gray' },
    'cancelled': { label: 'ยกเลิก', color: 'bg-red' }
};

function getFacilityBadgeHtml(b) {
    let optLabel = '';
    if (b.facilityOption === 'ps5') optLabel = ' (PS5)';
    if (b.facilityOption === 'nintendo') optLabel = ' (Switch)';
    if (b.facilityOption === 'male') optLabel = ' (ชาย)';
    if (b.facilityOption === 'female') optLabel = ' (หญิง)';
    if (b.facilityOption === 'both') optLabel = ' (คู่)';
    if (b.facility === 'bicycle' && b.bikeNumber) optLabel = ` (คันที่ ${b.bikeNumber})`;

    if (b.facility === 'ice_bath') {
        return `<span style="font-size:11px; background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; padding:2px 8px; border-radius:12px; font-weight:600;">🧊 ICE BATH${optLabel}</span>`;
    } else if (b.facility === 'bicycle') {
        return `<span style="font-size:11px; background:#ffedd5; color:#c2410c; border:1px solid #fed7aa; padding:2px 8px; border-radius:12px; font-weight:600;">🚲 BICYCLE${optLabel}</span>`;
    } else {
        return `<span style="font-size:11px; background:#eef2ff; color:#0011ff; border:1px solid #c7d2fe; padding:2px 8px; border-radius:12px; font-weight:600;">🎮 GAME ROOM${optLabel}</span>`;
    }
}

async function loadSchedule() {
    const selectedDate = document.getElementById('adminDate').value;
    if(!selectedDate) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/schedule?date=${selectedDate}`, {
            headers: { 'ngrok-skip-browser-warning': '69420' }
        });
        const bookings = await res.json();
        
        const tbody = document.getElementById('schedule-body');
        tbody.innerHTML = '';

        if (bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 24px;">ยังไม่มีการจองในวันที่เลือก</td></tr>';
            return;
        }

        bookings.forEach(b => {
            const tr = document.createElement('tr');
            const st = statusMap[b.status] || { label: b.status, color: '' };
            
            let name = "-";
            if(b.userId && b.userId.displayName) name = b.userId.displayName;

            let actionHtml = '-';
            if (b.status === 'booked') {
                actionHtml = `
                    <div style="display:flex; flex-direction:column; gap: 6px;">
                        <div style="display:flex; gap: 6px;">
                            <button class="btn-sm-doc" style="background:#0011ff; flex:1;" onclick="openDocument('${b.bookingRef}', '${b.hotelRoomNumber}', '${name}', '${b.bookingDate}', '${b.startTime}', 'th', '${b.facility}', '${b.facilityOption || ''}')">📄 พิมพ์ (TH)</button>
                            <button class="btn-sm-doc" style="background:#475569; flex:1;" onclick="openDocument('${b.bookingRef}', '${b.hotelRoomNumber}', '${name}', '${b.bookingDate}', '${b.startTime}', 'en', '${b.facility}', '${b.facilityOption || ''}')">📄 Print (EN)</button>
                        </div>
                        <div style="display:flex; gap: 6px;">
                            <button class="btn-sm-checkin" style="flex:1;" onclick="checkIn('${b.bookingRef}')">Check-in</button>
                            <button class="btn-cancel" style="flex:1;" onclick="cancelBooking('${b._id}')">ยกเลิก</button>
                        </div>
                    </div>
                `;
            } else if (b.status === 'checked_in' && b.facility === 'bicycle') {
                actionHtml = `
                    <button class="btn-sm-checkin" style="background:#0011ff;" onclick="returnBike('${b.bookingRef}', ${b.bikeNumber || 0})">🏁 รับคืนรถ</button>
                `;
            }

            tr.innerHTML = `
                <td><strong style="color:#0011ff;">${b.bookingRef}</strong><br>${getFacilityBadgeHtml(b)}</td>
                <td>${b.facility === 'bicycle' ? '-' : b.slotNumber}</td>
                <td>${b.startTime} - ${b.endTime}</td>
                <td><strong>${b.hotelRoomNumber}</strong></td>
                <td>${name}</td>
                <td><span class="badge ${st.color}">${st.label}</span></td>
                <td>${actionHtml}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
    }
}

async function loadHistory() {
    const selectedDate = document.getElementById('historyDate').value;
    if(!selectedDate) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/schedule?date=${selectedDate}`, {
            headers: { 'ngrok-skip-browser-warning': '69420' }
        });
        let bookings = await res.json();
        
        // กรองเฉพาะประวัติที่ใช้งานไปแล้ว (checked_in หรือ completed)
        bookings = bookings.filter(b => b.status === 'checked_in' || b.status === 'completed');

        const tbody = document.getElementById('history-body');
        tbody.innerHTML = '';

        if (bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 24px;">ไม่มีประวัติการเข้าใช้งานในวันนี้</td></tr>';
            return;
        }

        bookings.forEach(b => {
            const tr = document.createElement('tr');
            const st = statusMap[b.status] || { label: b.status, color: '' };
            
            let name = "-";
            if(b.userId && b.userId.displayName) name = b.userId.displayName;

            tr.innerHTML = `
                <td><strong style="color:#0011ff;">${b.bookingRef}</strong><br>${getFacilityBadgeHtml(b)}</td>
                <td>${b.startTime} - ${b.returnTime || b.endTime}</td>
                <td><strong>${b.hotelRoomNumber}</strong></td>
                <td>${name}</td>
                <td><span class="badge ${st.color}">${st.label}</span></td>
                <td>
                    <div style="display:flex; gap: 6px;">
                        <button class="btn-sm-doc" style="background:#0011ff;" onclick="openDocument('${b.bookingRef}', '${b.hotelRoomNumber}', '${name}', '${b.bookingDate}', '${b.startTime}', 'th', '${b.facility}', '${b.facilityOption || ''}')">📄 พิมพ์ (TH)</button>
                        <button class="btn-sm-doc" style="background:#475569;" onclick="openDocument('${b.bookingRef}', '${b.hotelRoomNumber}', '${name}', '${b.bookingDate}', '${b.startTime}', 'en', '${b.facility}', '${b.facilityOption || ''}')">📄 Print (EN)</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
    }
}

async function checkInManual() {
    const refInput = document.getElementById('scan-input');
    const refCode = refInput.value.trim();
    if (!refCode) {
        await customAlert('กรุณากรอกรหัสการจอง');
        return;
    }
    await checkIn(refCode);
    refInput.value = '';
}

async function checkIn(bookingRef) {
    if(!(await customConfirm(`ยืนยันการ Check-in ให้กับรหัส: ${bookingRef} ใช่หรือไม่?`))) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/bookings/check-in`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            },
            body: JSON.stringify({ bookingRef })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            await customAlert('✅ Check-in สำเร็จ!');
            loadSchedule();
            loadHistory();
        } else {
            await customAlert(`❌ ${data.message}`);
        }
    } catch (error) {
        await customAlert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
}

async function cancelBooking(id) {
    if(!(await customConfirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการจองนี้? รอบเวลาจะว่างให้คนอื่นจองทันที'))) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/bookings/${id}/cancel`, {
            method: 'PUT',
            headers: { 'ngrok-skip-browser-warning': '69420' }
        });
        
        if (res.ok) {
            await customAlert('ยกเลิกสำเร็จ');
            loadSchedule();
        } else {
            const data = await res.json();
            await customAlert(`ข้อผิดพลาด: ${data.message}`);
        }
    } catch (error) {
        await customAlert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
}

function openDocument(ref, room, name, date, time, lang, facility = 'game_room', facilityOption = '') {
    let title, header, printBtn, refLabel, dateLabel, timeLabel, ackText, listItems, generatedText, signatureLabel;

    let optLabelEn = '';
    let optLabelTh = '';
    if (facilityOption === 'ps5') { optLabelEn = ' (PS5)'; optLabelTh = ' (PS5)'; }
    if (facilityOption === 'nintendo') { optLabelEn = ' (Switch)'; optLabelTh = ' (Switch)'; }
    if (facilityOption === 'male') { optLabelEn = ' (Male)'; optLabelTh = ' (ชาย)'; }
    if (facilityOption === 'female') { optLabelEn = ' (Female)'; optLabelTh = ' (หญิง)'; }
    if (facilityOption === 'both') { optLabelEn = ' (Couple)'; optLabelTh = ' (คู่รัก)'; }

    if (lang === 'en') {
        title = facility === 'ice_bath' ? "Ice Bath Agreement" : (facility === 'bicycle' ? "Bicycle Rental Agreement" : "Game Room Agreement");
        header = (facility === 'ice_bath' ? "ICE BATH USAGE AGREEMENT" : (facility === 'bicycle' ? "BICYCLE RENTAL AGREEMENT" : "GAME ROOM USAGE AGREEMENT")) + optLabelEn.toUpperCase();
        printBtn = "Print Document";
        refLabel = "Booking Ref:";
        dateLabel = "Date:";
        timeLabel = "Time:";
        ackText = "I have read and agree to follow all the rules and regulations stated above.";
        generatedText = "Generated by Base Camp Digital System";
        signatureLabel = "Guest Signature";
        
        if (facility === 'ice_bath') {
            listItems = `
                <li>Users must be in good health. Individuals with heart conditions, high blood pressure, asthma, or epilepsy are prohibited.</li>
                <li>Pregnant women, individuals with open wounds, or those under the influence of alcohol/drugs are strictly prohibited.</li>
                <li><strong>There is a 150 THB fee per session.</strong> Please pay at the counter.</li>
                <li>Session time in the room is 1 hour, but for safety, <strong>do not immerse in ice water for more than 5-10 continuous minutes.</strong></li>
                <li>Exit immediately and notify staff if you experience dizziness, shortness of breath, severe shivering, or chest pain.</li>
                <li>Never plunge alone. Always have a companion or staff member nearby.</li>
                <li>Enter and exit the bath slowly and carefully to prevent slips and falls.</li>
                <li>Users assume all risks. The hotel is not liable for any health issues or injuries resulting from rule violations.</li>
            `;
        } else if (facility === 'bicycle') {
            listItems = `
                <li>Bicycles are provided free of charge for hotel guests (maximum 2 bicycles per room).</li>
                <li>Please inspect the bicycle before riding and observe traffic and safety rules at all times.</li>
                <li>Always lock the bicycle when parked unattended and keep the key safe.</li>
                <li>Return the bicycle and key directly to the hotel staff when finished so other guests may use it.</li>
                <li>Guests are responsible for any loss or damage to the bicycle or key during the rental period.</li>
            `;
        } else {
            listItems = `
                <li>Bookings must be made via the hotel's online QR system.</li>
                <li>Service time is limited to 1 hour per room.</li>
                <li>Keep volume at a moderate level to avoid disturbing other guests.</li>
                <li>Choose age-appropriate games for players.</li>
                <li>Do not modify settings or unplug any equipment.</li>
                <li>Food and drinks are strictly prohibited in the game room.</li>
                <li>Guests are liable for any damages caused by negligence and must compensate at full value.</li>
            `;
        }
    } else {
        title = facility === 'ice_bath' ? "เอกสารยินยอม - บ่อน้ำแข็ง" : (facility === 'bicycle' ? "เอกสารยินยอม - ยืมจักรยาน" : "เอกสารยินยอม - ห้องเกมส์");
        header = (facility === 'ice_bath' ? "เอกสารยินยอมการใช้บริการ บ่อน้ำแข็ง" : (facility === 'bicycle' ? "เอกสารยินยอมการยืมจักรยาน" : "เอกสารยินยอมการใช้บริการ ห้องเกมส์")) + optLabelTh;
        printBtn = "พิมพ์เอกสาร";
        refLabel = "รหัสการจอง:";
        dateLabel = "วันที่:";
        timeLabel = "เวลารอบ:";
        ackText = "ข้าพเจ้าได้อ่านและยอมรับข้อตกลงและเงื่อนไขการใช้บริการด้านบนทั้งหมด";
        generatedText = "สร้างโดยระบบ Base Camp Digital System";
        signatureLabel = "ลายมือชื่อผู้ใช้บริการ";
        
        if (facility === 'ice_bath') {
            listItems = `
                <li>ผู้ใช้บริการต้องมีสุขภาพแข็งแรง ไม่มีโรคประจำตัว ห้ามผู้ที่เป็นโรคหัวใจ ความดันโลหิตสูง โรคหอบหืด หรือโรคลมชัก เข้าใช้บริการเด็ดขาด</li>
                <li>สตรีมีครรภ์ ผู้ที่มีบาดแผลเปิด หรือผู้ที่อยู่ภายใต้ฤทธิ์แอลกอฮอล์/ยาเสพติด ห้ามใช้บริการเด็ดขาด</li>
                <li><strong>มีค่าบริการ 150 บาทต่อรอบ</strong> กรุณาชำระเงินและรับคำแนะนำที่เคาน์เตอร์ก่อนใช้บริการ</li>
                <li>กำหนดเวลาใช้บริการในห้อง 1 ชั่วโมงต่อรอบ แต่เพื่อความปลอดภัย <strong>ห้ามแช่น้ำแข็งต่อเนื่องเกิน 5-10 นาทีต่อครั้ง</strong></li>
                <li>หากมีอาการหน้ามืด หายใจไม่ออก หนาวสั่นรุนแรง หรือเจ็บหน้าอก ให้รีบขึ้นจากอ่างและแจ้งพนักงานทันที</li>
                <li>ห้ามแช่น้ำแข็งตามลำพัง ต้องมีผู้ดูแลหรือเพื่อนอยู่ด้วยเสมอ</li>
                <li>การลงและขึ้นจากอ่างต้องทำอย่างช้าๆ ระมัดระวังการลื่นล้ม</li>
                <li>ผู้ใช้บริการยอมรับความเสี่ยงด้วยตนเอง ทางโรงแรมจะไม่รับผิดชอบต่อปัญหาสุขภาพหรืออุบัติเหตุที่เกิดจากการฝ่าฝืนกฎ</li>
            `;
        } else if (facility === 'bicycle') {
            listItems = `
                <li>บริการยืมจักรยานสำหรับผู้เข้าพักฟรี (จำกัดสูงสุดไม่เกิน 2 คันต่อห้องพัก)</li>
                <li>กรุณาตรวจสอบสภาพรถก่อนขับขี่ และปฏิบัติตามกฎจราจรและความปลอดภัยอย่างเคร่งครัด</li>
                <li>กรุณาล็อกรถจักรยานทุกครั้งเมื่อจอดแวะพัก และดูแลรักษากุญแจไม่ให้สูญหาย</li>
                <li>เมื่อใช้งานเสร็จสิ้น กรุณานำจักรยานพร้อมกุญแจมาส่งคืนแก่เจ้าหน้าที่โดยตรง</li>
                <li>หากเกิดความเสียหายหรือสูญหายต่อรถจักรยานหรือกุญแจ ผู้ยืมต้องรับผิดชอบตามมูลค่าจริง</li>
            `;
        } else {
            listItems = `
                <li>ท่านสามารถจองเวลาเข้าใช้บริการผ่านระบบคิวอาร์ออน์ไลน์ของโรงแรมที่จัดเตรียมไว้ให้</li>
                <li>กำหนดระยะเวลาการเข้าใช้บริการ 1 ชั่วโมงต่อห้องพัก</li>
                <li>ปรับลดระดับเสียงให้เหมาะสม เพื่อเป็นการไม่รบกวนกับผู้เข้าพักท่านอื่น</li>
                <li>กรุณาเลือกประเภทของเกมส์ให้เหมาะสมกับช่วงอายุของผู้เล่น</li>
                <li>ไม่อนุญาติดัดแปลงแก้ไข การตั้งค่า และถอดสายอุปกรณ์ใดๆ หากพบปัญหากรุณาแจ้งพนักงานทันที</li>
                <li>ไม่อนุญาตให้นำอาหารและเครื่องดื่มเข้ามารับประทานบริเวณห้องเกมส์โดยเด็ดขาด</li>
                <li>หากผู้ใช้บริการประมาทเลินเล่อเป็นเหตุให้อุปกรณ์เกิดความเสียหาย จะต้องรับผิดชอบชดใช้ค่าเสียหายตามมูลค่าจริงของอุปกรณ์นั้นๆ</li>
            `;
        }
    }

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    printWindow.document.write(`
        <html>
        <head>
            <title>${title}</title>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Kanit', sans-serif; padding: 20px; color: #1a202c; line-height: 1.5; font-size: 14px; }
                .header-box { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
                .header-box img { max-height: 80px; width: auto; margin-bottom: 15px; }
                .header-box h2 { margin: 0; color: #2d3748; letter-spacing: 1px; font-size: 24px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
                .info-item { font-size: 15px; }
                .info-label { color: #718096; font-size: 13px; text-transform: uppercase; margin-bottom: 5px; }
                .info-value { font-weight: 500; font-size: 16px; }
                .terms-section { margin-bottom: 20px; }
                .terms-section h3 { font-size: 18px; color: #2d3748; margin-bottom: 15px; }
                .terms-list { padding-left: 20px; font-size: 15px; }
                .terms-list li { margin-bottom: 12px; }
                .signature-section { display: flex; justify-content: flex-end; margin-top: 30px; }
                .signature-box { text-align: center; width: 250px; }
                .signature-line { border-bottom: 1px solid #718096; margin-bottom: 10px; height: 40px; }
                .signature-name { font-size: 14px; color: #4a5568; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                
                @page { size: A4; margin: 15mm; }
                  @media print {
                    .no-print { display: none !important; }
                    body { padding: 0; }
                    .info-grid { background: white; border: 1px solid #cbd5e0; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="text-align: right; margin-bottom: 20px;">
                <button onclick="window.print()" style="background: #0011ff; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-family: 'Kanit'; font-size: 15px;">${printBtn}</button>
            </div>
            
            <div class="header-box">
                <img src="images/logo.png" alt="Base Camp Logo">
                <h2>${header}</h2>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">${refLabel}</div>
                    <div class="info-value" style="color: #0011ff;">${ref}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Room / Name:</div>
                    <div class="info-value">${room} - ${name}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">${dateLabel}</div>
                    <div class="info-value">${date}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">${timeLabel}</div>
                    <div class="info-value">${time}</div>
                </div>
            </div>

            <div class="terms-section">
                <ol class="terms-list">
                    ${listItems}
                </ol>
            </div>

            <div style="font-size: 15px; font-weight: 500; text-align: center; background: #edf2f7; padding: 15px; border-radius: 6px;">
                ${ackText}
            </div>

            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-name">(${signatureLabel})</div>
                    <div class="signature-name" style="margin-top: 5px; font-size: 13px;">Date: ${date}</div>
                </div>
            </div>

            <div class="footer">
                ${generatedText} | Ref: ${ref}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}


// ================= FACILITY & UNIT CONTROLS =================

let currentFacilitySettings = null;
let currentTargetDate = null;

async function loadFacilityStatus() {
    const ctrlDateEl = document.getElementById('controlDate');
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    const targetDate = (ctrlDateEl && ctrlDateEl.value) ? ctrlDateEl.value : todayStr;
    currentTargetDate = targetDate;

    const displayDateEl = document.getElementById('display-target-date');
    if (displayDateEl) displayDateEl.innerText = targetDate;

    try {
        const res = await fetch(`${API_BASE}/api/admin/facility-status?date=${targetDate}`, {
            headers: { 'ngrok-skip-browser-warning': '69420' }
        });
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        
        currentFacilitySettings = data.settings;

        // Date status badge & Reset button
        const badgeEl = document.getElementById('date-status-badge');
        const resetBtn = document.getElementById('btn-reset-date');

        if (data.hasDateOverride) {
            if (badgeEl) {
                badgeEl.style.background = '#fef3c7';
                badgeEl.style.color = '#b45309';
                badgeEl.style.borderColor = '#fde68a';
                badgeEl.innerText = targetDate === todayStr ? '⚠️ มีการตั้งค่าเฉพาะวันนี้' : '⚠️ มีการตั้งค่าล่วงหน้านี้';
            }
            if (resetBtn) resetBtn.style.display = 'inline-block';
        } else {
            if (badgeEl) {
                badgeEl.style.background = '#dcfce7';
                badgeEl.style.color = '#15803d';
                badgeEl.style.borderColor = '#86efac';
                badgeEl.innerText = targetDate === todayStr ? 'เปิดบริการตามปกติ (วันนี้)' : 'เปิดบริการตามปกติ (วันล่วงหน้า)';
            }
            if (resetBtn) resetBtn.style.display = 'none';
        }

        const settings = data.settings;

        // Game Room Main
        const gameMainBtn = document.getElementById('btn-main-gameroom');
        if (gameMainBtn) updateStatusBtn(gameMainBtn, settings.gameRoom.isOpen);

        // PS5
        const ps5Btn = document.getElementById('btn-unit-ps5');
        if (ps5Btn) updateStatusBtn(ps5Btn, settings.gameRoom.ps5);

        // Nintendo Switch
        const ninBtn = document.getElementById('btn-unit-nintendo');
        if (ninBtn) updateStatusBtn(ninBtn, settings.gameRoom.nintendo);

        // Ice Bath Main
        const iceMainBtn = document.getElementById('btn-main-icebath');
        if (iceMainBtn) updateStatusBtn(iceMainBtn, settings.iceBath.isOpen);

        // Male Bath 1 & 2
        const m1Btn = document.getElementById('btn-unit-male_bath_1');
        if (m1Btn) updateStatusBtn(m1Btn, settings.iceBath.male_bath_1);

        const m2Btn = document.getElementById('btn-unit-male_bath_2');
        if (m2Btn) updateStatusBtn(m2Btn, settings.iceBath.male_bath_2);

        // Male summary
        const maleActiveCount = (settings.iceBath.male_bath_1 ? 1 : 0) + (settings.iceBath.male_bath_2 ? 1 : 0);
        const maleSummaryEl = document.getElementById('male-capacity-summary');
        if (maleSummaryEl) {
            maleSummaryEl.innerHTML = `เปิดอยู่ <strong style="color:#0284c7;">${maleActiveCount}/2</strong> บ่อ (รับได้ ${maleActiveCount} ท่าน/รอบ)`;
        }

        // Female Bath 1 & 2
        const f1Btn = document.getElementById('btn-unit-female_bath_1');
        if (f1Btn) updateStatusBtn(f1Btn, settings.iceBath.female_bath_1);

        const f2Btn = document.getElementById('btn-unit-female_bath_2');
        if (f2Btn) updateStatusBtn(f2Btn, settings.iceBath.female_bath_2);

        // Female summary
        const femaleActiveCount = (settings.iceBath.female_bath_1 ? 1 : 0) + (settings.iceBath.female_bath_2 ? 1 : 0);
        const femaleSummaryEl = document.getElementById('female-capacity-summary');
        if (femaleSummaryEl) {
            femaleSummaryEl.innerHTML = `เปิดอยู่ <strong style="color:#db2777;">${femaleActiveCount}/2</strong> บ่อ (รับได้ ${femaleActiveCount} ท่าน/รอบ)`;
        }

        // Bicycle Main
        const bikeMainBtn = document.getElementById('btn-main-bicycle');
        if (bikeMainBtn && settings.bicycle) updateStatusBtn(bikeMainBtn, settings.bicycle.isOpen);

        // Bike 1 to 5
        if (settings.bicycle) {
            for (let i = 1; i <= 5; i++) {
                const bBtn = document.getElementById('btn-unit-bike_' + i);
                if (bBtn) updateStatusBtn(bBtn, settings.bicycle['bike_' + i]);
            }
        }

        // Render Upcoming Closures table
        renderUpcomingClosures(data.upcomingClosures || []);

    } catch (error) {
        console.error(error);
        await customAlert('⚠️ ไม่สามารถโหลดสถานะบริการจากเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์ครับ');
    }
}

function renderUpcomingClosures(list) {
    const tbody = document.getElementById('upcoming-closures-body');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 20px;">ไม่มีรายการปิดล่วงหน้า (ทุกวันเปิดให้บริการตามปกติ)</td></tr>';
        return;
    }

    let html = '';
    list.forEach(item => {
        const closedParts = [];
        if (!item.gameRoom.isOpen) closedParts.push('ปิดห้องเกมส์ทั้งห้อง');
        else {
            if (!item.gameRoom.ps5) closedParts.push('PS5 (ปิด)');
            if (!item.gameRoom.nintendo) closedParts.push('Nintendo Switch (ปิด)');
        }

        if (!item.iceBath.isOpen) closedParts.push('ปิดบ่อน้ำแข็งทั้งระบบ');
        else {
            if (!item.iceBath.male_bath_1) closedParts.push('บ่อชาย #1 (ปิด)');
            if (!item.iceBath.male_bath_2) closedParts.push('บ่อชาย #2 (ปิด)');
            if (!item.iceBath.female_bath_1) closedParts.push('บ่อหญิง #1 (ปิด)');
            if (!item.iceBath.female_bath_2) closedParts.push('บ่อหญิง #2 (ปิด)');
        }

        if (item.bicycle) {
            if (!item.bicycle.isOpen) closedParts.push('ปิดจักรยานทั้งระบบ');
            else {
                for (let i = 1; i <= 5; i++) {
                    if (!item.bicycle['bike_' + i]) closedParts.push(`จักรยาน #${i} (ปิด)`);
                }
            }
        }

        const closedText = closedParts.join(', ') || 'ไม่มีรายการปิด';

        html += `
            <tr>
                <td style="font-weight: 600; color: #0011ff; white-space: nowrap;">
                    <a href="javascript:void(0)" onclick="viewClosureDate('${item.date}')" style="color:#0011ff; text-decoration: underline;">${item.date}</a>
                </td>
                <td style="color: #dc2626; font-weight: 500;">${closedText}</td>
                <td style="white-space: nowrap;">
                    <button class="btn-cancel" style="padding: 5px 12px; font-size: 12px;" onclick="resetFacilityDate('${item.date}')">เปิดคืนปกติ</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function viewClosureDate(dateStr) {
    const ctrlDateEl = document.getElementById('controlDate');
    if (ctrlDateEl) {
        ctrlDateEl.value = dateStr;
        loadFacilityStatus();
    }
}

function updateStatusBtn(btn, isOpen) {
    if (isOpen) {
        btn.className = 'btn-unit-toggle status-online';
        btn.innerHTML = '● เปิดบริการ (ONLINE)';
    } else {
        btn.className = 'btn-unit-toggle status-offline';
        btn.innerHTML = '✕ ปิดปรับปรุง (CLOSED)';
    }
}

async function toggleUnit(facilityKey, unitKey) {
    if (!currentFacilitySettings) {
        await customAlert('⚠️ ยังโหลดสถานะจากเซิร์ฟเวอร์ไม่สำเร็จ กรุณากดปุ่ม โหลดสถานะล่าสุด');
        return;
    }
    const currentVal = currentFacilitySettings[facilityKey][unitKey];
    const targetVal = !currentVal;
    const actionText = targetVal ? 'เปิดให้บริการ' : 'ปิดปรับปรุง (ห้ามจอง)';

    const unitNames = {
        'ps5': 'PlayStation 5 (PS5)',
        'nintendo': 'Nintendo Switch',
        'male_bath_1': 'บ่อแช่ผู้ชาย #1',
        'male_bath_2': 'บ่อแช่ผู้ชาย #2',
        'female_bath_1': 'บ่อแช่ผู้หญิง #1',
        'female_bath_2': 'บ่อแช่ผู้หญิง #2',
        'bike_1': 'จักรยาน เบอร์ 1',
        'bike_2': 'จักรยาน เบอร์ 2',
        'bike_3': 'จักรยาน เบอร์ 3',
        'bike_4': 'จักรยาน เบอร์ 4',
        'bike_5': 'จักรยาน เบอร์ 5'
    };
    const unitTitle = unitNames[unitKey] || unitKey;
    const targetDate = currentTargetDate || 'วันนี้';

    const confirmed = await customConfirm(`ต้องการ [${actionText}] สำหรับ "${unitTitle}"\n(สำหรับวันที่: ${targetDate}) ใช่หรือไม่?`);
    if (!confirmed) return;

    try {
        const payload = {
            date: currentTargetDate
        };
        payload[facilityKey] = {};
        payload[facilityKey][unitKey] = targetVal;

        const res = await fetch(`${API_BASE}/api/admin/facility-status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            await customAlert(`อัปเดตสถานะ "${unitTitle}" วันที่ ${targetDate} เป็น [${actionText}] สำเร็จ!`);
            loadFacilityStatus();
        } else {
            const data = await res.json();
            await customAlert(`ข้อผิดพลาด: ${data.message}`);
        }
    } catch (e) {
        console.error(e);
        await customAlert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
}

async function toggleMainFacility(facilityKey) {
    if (!currentFacilitySettings) {
        await customAlert('⚠️ ยังโหลดสถานะจากเซิร์ฟเวอร์ไม่สำเร็จ กรุณากดปุ่ม โหลดสถานะล่าสุด');
        return;
    }
    const currentVal = currentFacilitySettings[facilityKey].isOpen;
    const targetVal = !currentVal;
    const actionText = targetVal ? 'เปิดให้บริการทั้งหมด' : 'ปิดบริการทั้งระบบ';
    const facName = facilityKey === 'gameRoom' ? 'ห้องเกมส์ (Game Room)' : (facilityKey === 'iceBath' ? 'บ่อน้ำแข็ง (Ice Bath)' : 'จักรยาน (Bicycle)');
    const targetDate = currentTargetDate || 'วันนี้';

    const confirmed = await customConfirm(`ต้องการ [${actionText}] สำหรับ "${facName}"\n(สำหรับวันที่: ${targetDate}) ใช่หรือไม่?`);
    if (!confirmed) return;

    try {
        const payload = {
            date: currentTargetDate
        };
        payload[facilityKey] = { isOpen: targetVal };

        const res = await fetch(`${API_BASE}/api/admin/facility-status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            await customAlert(`อัปเดตสถานะ "${facName}" วันที่ ${targetDate} สำเร็จ!`);
            loadFacilityStatus();
        } else {
            const data = await res.json();
            await customAlert(`ข้อผิดพลาด: ${data.message}`);
        }
    } catch (e) {
        console.error(e);
        await customAlert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
}

async function resetFacilityDate(dateStr) {
    const targetDate = dateStr || currentTargetDate;
    if (!targetDate) return;

    const confirmed = await customConfirm(`ต้องการรีเซ็ตการตั้งค่าของวันที่ ${targetDate} ให้กลับเป็น "เปิดบริการตามปกติทั้งหมด" ใช่หรือไม่?`);
    if (!confirmed) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/facility-status/reset?date=${targetDate}`, {
            method: 'DELETE',
            headers: { 'ngrok-skip-browser-warning': '69420' }
        });

        if (res.ok) {
            await customAlert(`รีเซ็ตการตั้งค่าของวันที่ ${targetDate} เป็นเปิดปกติเรียบร้อย!`);
            loadFacilityStatus();
        } else {
            const data = await res.json();
            await customAlert(`ข้อผิดพลาด: ${data.message}`);
        }
    } catch (e) {
        console.error(e);
        await customAlert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
}


// ================= BICYCLE FLEET CONTROLS =================

async function loadBicycleFleet() {
    const bikeDateEl = document.getElementById('adminBikeDate');
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    const targetDate = (bikeDateEl && bikeDateEl.value) ? bikeDateEl.value : todayStr;

    try {
        const res = await fetch(`${API_BASE}/api/admin/bicycles/fleet?date=${targetDate}`, {
            headers: { 'ngrok-skip-browser-warning': '69420' }
        });
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        renderAdminBicycleFleet(data.fleet);
    } catch (e) {
        console.error(e);
    }
}

function renderAdminBicycleFleet(fleet) {
    const container = document.getElementById('admin-bicycle-fleet-list');
    if (!container) return;

    let html = '';
    fleet.forEach(b => {
        const isKids = b.bikeType === 'kids' || b.bikeNumber >= 4;
        const typeBadge = isKids 
            ? '<span style="font-size:11px; padding:3px 10px; border-radius:12px; background:#fff7ed; color:#ea580c; font-weight:700; border:1px solid #fed7aa;">🚲🧒 จักรยานเด็ก (มีล้อประคอง)</span>'
            : '<span style="font-size:11px; padding:3px 10px; border-radius:12px; background:#eef2ff; color:#0011ff; font-weight:700; border:1px solid #c7d2fe;">🚴‍♂️ จักรยานผู้ใหญ่</span>';

        const bikeIcon = isKids ? '🚲🧒' : '🚴‍♂️';

        let badgeClass = 'status-available';
        let badgeLabel = '🟢 ว่าง (พร้อมให้จอง)';
        let borderColor = '#10b981';
        let borrowerInfo = '<span style="color:#64748b;">- ยังไม่มีผู้ใช้งานในขณะนี้ -</span>';
        let actionBtn = '';

        if (b.status === 'booked' && b.booking) {
            badgeClass = 'status-booked';
            badgeLabel = '🟡 รอรับรถ (Booked)';
            borderColor = '#f59e0b';

            const pickupNotice = b.pickupDeadline 
                ? `<div style="font-size:12px; color:#c2410c; margin-top:4px; font-weight:600;">⏰ ตัดสิทธิ์อัตโนมัติหากไม่มารับภายใน <strong>${b.pickupDeadline} น.</strong> (Grace Period 30 นาที)</div>`
                : '';

            borrowerInfo = `
                <div><strong>ห้องพัก:</strong> <span style="color:#d97706; font-weight:700; font-size:16px;">${b.booking.hotelRoomNumber}</span> (${b.booking.userId?.displayName || 'ลูกค้า'})</div>
                <div style="font-size:12.5px; color:#64748b; margin-top:3px;">รหัสจอง: <strong>${b.booking.bookingRef}</strong> | เวลานัดรับ: <strong>${b.booking.startTime || '-'} น.</strong></div>
                ${pickupNotice}
            `;

            actionBtn = `
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn-checkin" style="padding: 10px 18px; font-size: 13.5px;" onclick="handoverBike('${b.booking.bookingRef}', ${b.bikeNumber})">
                        🔑 ส่งมอบรถให้ลูกค้า
                    </button>
                    <button class="btn-cancel" style="padding: 10px 14px; font-size: 13px;" onclick="cancelBookingAdmin('${b.booking.bookingRef}')">
                        ❌ ยกเลิก
                    </button>
                </div>
            `;
        } else if (b.status === 'in_use' && b.booking) {
            badgeClass = 'status-in_use';
            badgeLabel = '🔵 กำลังใช้งาน (In Use)';
            borderColor = '#0011ff';

            let deadlineAlert = '';
            if (b.nextBooking && b.returnDeadline) {
                deadlineAlert = `
                    <div style="background:#fff7ed; border-left:4px solid #ea580c; padding:6px 10px; border-radius:6px; margin-top:6px; font-size:12.5px; color:#9a3412; font-weight:600;">
                        ⚠️ มีคิวจองถัดไปเวลา <strong>${b.nextBooking.startTime} น.</strong> (ต้องส่งคืนก่อน <strong>${b.returnDeadline} น.</strong>)
                    </div>
                `;
            }

            borrowerInfo = `
                <div><strong>ห้องพัก:</strong> <span style="color:#0011ff; font-weight:700; font-size:16px;">${b.booking.hotelRoomNumber}</span> (${b.booking.userId?.displayName || 'ลูกค้า'})</div>
                <div style="font-size:12.5px; color:#64748b; margin-top:3px;">รหัสจอง: <strong>${b.booking.bookingRef}</strong> | รับรถเมื่อ: <strong>${b.booking.checkOutTime || b.booking.startTime} น.</strong></div>
                ${deadlineAlert}
            `;

            actionBtn = `
                <button class="btn-refresh" style="padding: 10px 20px; font-size: 14px; background: #10b981; box-shadow: 0 4px 12px rgba(16,185,129,0.25);" onclick="returnBike('${b.booking.bookingRef}', ${b.bikeNumber})">
                    🏁 รับคืนรถ (เปิดว่างทันที)
                </button>
            `;
        } else if (b.status === 'maintenance') {
            badgeClass = 'status-maintenance';
            badgeLabel = '🔴 ปิดซ่อมบำรุง';
            borderColor = '#ef4444';
            borrowerInfo = '<span style="color:#dc2626;">ปิดให้บริการชั่วคราว (ตั้งค่าได้ในแท็บ เปิด-ปิดบริการ)</span>';
        } else if (b.returnDeadline && b.nextBooking) {
            // Available with deadline
            badgeClass = 'status-available';
            badgeLabel = `🟢 ว่าง (ยืมได้ถึง ${b.returnDeadline} น.)`;
            borderColor = '#f59e0b';
            borrowerInfo = `
                <span style="color:#059669; font-weight:600;">พร้อมให้ยืมได้ในขณะนี้</span>
                <div style="font-size:12px; color:#b45309; margin-top:3px;">ℹ️ มีคิวจองล่วงหน้าเวลา <strong>${b.nextBooking.startTime} น.</strong> (ผู้ยืมรอบนี้ต้องคืนก่อน ${b.returnDeadline} น.)</div>
            `;
        }

        const bikeTitle = isKids ? `จักรยานเด็ก (มีล้อประคอง) คันที่ ${b.bikeNumber}` : `จักรยานผู้ใหญ่ คันที่ ${b.bikeNumber}`;

        html += `
            <div style="background:#ffffff; border:1.5px solid #e2e8f0; border-left: 6px solid ${borderColor}; border-radius:12px; padding:18px 22px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <div style="display:flex; align-items:center; gap:18px;">
                    <div style="font-size:36px; background:#f8fafc; width:64px; height:64px; display:flex; align-items:center; justify-content:center; border-radius:12px; border:1px solid #e2e8f0;">${bikeIcon}</div>
                    <div>
                        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                            <h3 style="margin:0; font-family:'Kanit',sans-serif; font-size:18px; color:#1e293b;">${bikeTitle} (BIKE #${b.bikeNumber})</h3>
                            ${typeBadge}
                            <span style="font-size:12px; padding:3px 12px; border-radius:20px; font-weight:600;" class="${badgeClass}">${badgeLabel}</span>
                        </div>
                        <div style="margin-top:6px; font-size:14px;">
                            ${borrowerInfo}
                        </div>
                    </div>
                </div>

                <div>
                    ${actionBtn}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function handoverBike(ref, bikeNum) {
    const confirmed = await customConfirm(`ยืนยันการส่งมอบกุญแจและจักรยานเบอร์ ${bikeNum} ให้ลูกค้าใช่หรือไม่?`);
    if (!confirmed) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/bicycles/handover`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            },
            body: JSON.stringify({ bookingRef: ref })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        await customAlert(data.message);
        loadBicycleFleet();
    } catch (e) {
        await customAlert(e.message);
    }
}

async function returnBike(ref, bikeNum) {
    const confirmed = await customConfirm(`ยืนยันการรับคืนจักรยานเบอร์ ${bikeNum} เรียบร้อยแล้วใช่หรือไม่?\n\n(ทันทีที่กด จักรยานเบอร์ ${bikeNum} จะกลับมาว่างพร้อมให้ลูกค้าคนต่อไปจองทันที)`);
    if (!confirmed) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/bicycles/return`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            },
            body: JSON.stringify({ bookingRef: ref })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        await customAlert(data.message);
        loadBicycleFleet();
        loadSchedule();
    } catch (e) {
        await customAlert(e.message);
    }
}
