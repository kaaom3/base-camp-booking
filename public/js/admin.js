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
    } else if (tabId === 'reports') {
        loadReportsData();
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


// ================= COMPREHENSIVE REPORTS & ANALYTICS =================

let currentReportData = null;

function formatBangkokDate(dateObj) {
    return dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}

function clearPresetHighlight() {
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
}

function applyReportPreset(preset) {
    clearPresetHighlight();
    const targetBtn = document.getElementById(`preset-${preset}`);
    if (targetBtn) targetBtn.classList.add('active');

    const now = new Date();
    const todayStr = formatBangkokDate(now);
    const [curY, curM, curD] = todayStr.split('-').map(Number);

    let startStr = '';
    let endStr = '';

    if (preset === 'today') {
        startStr = todayStr;
        endStr = todayStr;
    } else if (preset === 'yesterday') {
        const yest = new Date(curY, curM - 1, curD - 1);
        startStr = formatBangkokDate(yest);
        endStr = startStr;
    } else if (preset === '7d') {
        const d7 = new Date(curY, curM - 1, curD - 6);
        startStr = formatBangkokDate(d7);
        endStr = todayStr;
    } else if (preset === '30d') {
        const d30 = new Date(curY, curM - 1, curD - 29);
        startStr = formatBangkokDate(d30);
        endStr = todayStr;
    } else if (preset === 'this_month') {
        startStr = `${curY}-${String(curM).padStart(2, '0')}-01`;
        endStr = todayStr;
    } else if (preset === 'last_month') {
        const firstDayLastMonth = new Date(curY, curM - 2, 1);
        const lastDayLastMonth = new Date(curY, curM - 1, 0);
        startStr = formatBangkokDate(firstDayLastMonth);
        endStr = formatBangkokDate(lastDayLastMonth);
    } else if (preset === 'this_year') {
        startStr = `${curY}-01-01`;
        endStr = todayStr;
    } else {
        // 'all'
        startStr = '';
        endStr = '';
    }

    document.getElementById('reportStartDate').value = startStr;
    document.getElementById('reportEndDate').value = endStr;

    loadReportsData();
}

async function loadReportsData() {
    const startDate = document.getElementById('reportStartDate').value || '';
    const endDate = document.getElementById('reportEndDate').value || '';
    const facility = document.getElementById('reportFacility').value || 'all';

    const periodTextEl = document.getElementById('report-period-text');
    if (periodTextEl) periodTextEl.textContent = '⏳ กำลังประมวลผลข้อมูลสถิติ...';

    try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (facility) params.append('facility', facility);

        const res = await fetch(`${API_BASE}/api/admin/reports?${params.toString()}`, {
            headers: { 'ngrok-skip-browser-warning': '69420' }
        });

        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) {
            throw new Error('เซิร์ฟเวอร์ยังไม่ได้อัปเดต API รายงาน (กรุณารัน git pull และ pm2 restart บนเซิร์ฟเวอร์)');
        }

        const data = await res.json();
        currentReportData = data;

        const facNames = {
            all: 'ทุกบริการ (All Facilities)',
            game_room: '🎮 ห้องเกมส์ (Game Room)',
            ice_bath: '🧊 บ่อน้ำแข็ง (Ice Bath)',
            bicycle: '🚲 จักรยาน (Bicycle)'
        };

        const rangeLabel = (data.filters.startDate && data.filters.endDate)
            ? `${data.filters.startDate} ถึง ${data.filters.endDate}`
            : 'ทั้งหมดตั้งแต่เปิดระบบ';

        if (periodTextEl) {
            periodTextEl.textContent = `${rangeLabel} • [${facNames[facility] || 'ทุกบริการ'}]`;
        }

        const genAtEl = document.getElementById('report-generated-at');
        if (genAtEl) {
            genAtEl.textContent = `อัปเดตล่าสุด: ${new Date().toLocaleTimeString('th-TH')} น.`;
        }

        renderReportKPIs(data);
        renderReportFacilities(data);
        renderReportTimeAndHourly(data);
        renderReportDowAndMonthly(data);
        renderReportDailyAndTopRooms(data);
        filterReportRecordsTable();

    } catch (e) {
        console.error(e);
        if (periodTextEl) periodTextEl.textContent = '⚠️ ไม่สามารถโหลดรายงานได้: ' + e.message;
    }
}

function renderReportKPIs(data) {
    const container = document.getElementById('report-kpi-container');
    if (!container) return;
    const s = data.summary;

    const sameDayPct = s.totalBookings > 0 ? Math.round((s.sameDayBookings / s.totalBookings) * 100) : 0;
    const advPct = s.totalBookings > 0 ? (100 - sameDayPct) : 0;

    container.innerHTML = `
        <div class="kpi-card">
            <div class="kpi-label"><span>📌 ยอดการจองทั้งหมด (Total Bookings)</span><span>📋</span></div>
            <div class="kpi-value" style="color: var(--bc-blue);">${s.totalBookings.toLocaleString()} <span style="font-size:15px; font-weight:500;">รายการ</span></div>
            <div class="kpi-sub">สำเร็จ/เข้าใช้ <strong>${s.usedCount}</strong> • รอรับบริการ <strong>${s.bookedCount}</strong> • ยกเลิก <strong>${s.cancelledCount}</strong></div>
        </div>

        <div class="kpi-card accent-green">
            <div class="kpi-label"><span>✅ อัตราการเข้าใช้งานจริง (Utilization Rate)</span><span>📈</span></div>
            <div class="kpi-value" style="color: #059669;">${s.utilizationRate}%</div>
            <div class="kpi-sub">เข้าใช้บริการจริง <strong>${s.usedCount}</strong> จาก ${s.totalBookings} รายการ</div>
        </div>

        <div class="kpi-card accent-red">
            <div class="kpi-label"><span>❌ อัตราการยกเลิก / No-Show</span><span>⚠️</span></div>
            <div class="kpi-value" style="color: #dc2626;">${s.cancellationRate}%</div>
            <div class="kpi-sub">ถูกยกเลิก/ตัดสิทธิ์รวม <strong>${s.cancelledCount}</strong> รายการ</div>
        </div>

        <div class="kpi-card accent-orange">
            <div class="kpi-label"><span>💰 รายได้บ่อน้ำแข็งสุทธิ (Ice Bath Revenue)</span><span>🧊</span></div>
            <div class="kpi-value" style="color: var(--bc-orange);">฿${s.realizedRevenue.toLocaleString()}</div>
            <div class="kpi-sub">คาดการณ์รวม ฿${s.expectedRevenue.toLocaleString()} • เสียโอกาสจากยกเลิก ฿${s.lostRevenue.toLocaleString()}</div>
        </div>

        <div class="kpi-card accent-purple">
            <div class="kpi-label"><span>🏨 จำนวนห้องพักและผู้เข้าพักที่ใช้บริการ</span><span>👥</span></div>
            <div class="kpi-value" style="color: #7c3aed;">${s.uniqueRooms} <span style="font-size:15px; font-weight:500;">ห้อง</span> / ${s.uniqueGuests} <span style="font-size:15px; font-weight:500;">ท่าน</span></div>
            <div class="kpi-sub">เฉลี่ยห้องละ <strong>${s.avgBookingsPerRoom}</strong> ครั้ง</div>
        </div>

        <div class="kpi-card accent-cyan">
            <div class="kpi-label"><span>📅 ความหนาแน่นการใช้งานรายวัน</span><span>📊</span></div>
            <div class="kpi-value" style="color: #0891b2;">${s.avgBookingsPerActiveDay} <span style="font-size:15px; font-weight:500;">คิว/วัน</span></div>
            <div class="kpi-sub">มีการใช้งาน <strong>${s.activeDaysCount}</strong> วัน • วันสูงสุด: <strong>${s.busiestDate.date}</strong> (${s.busiestDate.count} คิว)</div>
        </div>

        <div class="kpi-card accent-yellow">
            <div class="kpi-label"><span>🔥 ช่วงเวลาและวันยอดนิยมสูงสุด (Peak Time)</span><span>⏰</span></div>
            <div class="kpi-value" style="color: #d97706; font-size: 22px;">${s.peakHour.hour} น. <span style="font-size:14px; font-weight:500;">(${s.peakHour.count} คิว)</span></div>
            <div class="kpi-sub">วันยอดฮิตประจำสัปดาห์: <strong>${s.peakDayOfWeek.dayNameTh}</strong> (${s.peakDayOfWeek.count} คิว)</div>
        </div>

        <div class="kpi-card">
            <div class="kpi-label"><span>⏳ พฤติกรรมการจองล่วงหน้า (Lead Time)</span><span>🗓️</span></div>
            <div class="kpi-value" style="color: #1e293b; font-size: 22px;">วันเดียวกัน ${sameDayPct}% / ล่วงหน้า ${advPct}%</div>
            <div class="kpi-sub">จองวันใช้งานจริง <strong>${s.sameDayBookings}</strong> ครั้ง • จองข้ามวันล่วงหน้า <strong>${s.advanceBookings}</strong> ครั้ง</div>
        </div>
    `;
}

function renderReportFacilities(data) {
    const container = document.getElementById('report-facility-cards');
    if (!container) return;

    const gr = data.facilityBreakdown.gameRoom;
    const ib = data.facilityBreakdown.iceBath;
    const bk = data.facilityBreakdown.bicycle;

    const ps5Pct = gr.total > 0 ? Math.round((gr.ps5.total / gr.total) * 100) : 0;
    const ninPct = gr.total > 0 ? Math.round((gr.nintendo.total / gr.total) * 100) : 0;

    const malePct = ib.total > 0 ? Math.round((ib.male.total / ib.total) * 100) : 0;
    const femalePct = ib.total > 0 ? Math.round((ib.female.total / ib.total) * 100) : 0;
    const bothPct = ib.total > 0 ? Math.round((ib.both.total / ib.total) * 100) : 0;

    const adultBikePct = bk.total > 0 ? Math.round((bk.adult.total / bk.total) * 100) : 0;
    const kidsBikePct = bk.total > 0 ? Math.round((bk.kids.total / bk.total) * 100) : 0;

    const perBikeRows = bk.perBike.map(pb => `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12.5px; padding:4px 0; border-bottom:1px dashed #e2e8f0;">
            <span><strong>#${pb.bikeNumber}</strong> ${pb.bikeType === 'kids' ? '🚲🧒 เด็ก (มีล้อประคอง)' : '🚴‍♂️ ผู้ใหญ่'}</span>
            <span>ยืม <strong>${pb.total}</strong> ครั้ง (สำเร็จ ${pb.used} / ยกเลิก ${pb.cancelled}) ${pb.avgRideMinutes > 0 ? `• เฉลี่ย ${pb.avgRideMinutes} นาที` : ''}</span>
        </div>
    `).join('');

    container.innerHTML = `
        <!-- 1. GAME ROOM CARD -->
        <div class="card" style="margin-bottom: 0; border-top: 5px solid var(--bc-blue);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h3 style="margin:0; color:var(--bc-blue); font-size:18px;">🎮 ห้องเกมส์ (Game Room)</h3>
                <span style="background:#eef2ff; color:var(--bc-blue); font-weight:700; padding:4px 12px; border-radius:20px; font-size:13px;">รวม ${gr.total} คิว</span>
            </div>

            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; text-align:center; background:#f8fafc; padding:10px; border-radius:10px; margin-bottom:16px; border:1px solid var(--bc-border);">
                <div>
                    <div style="font-size:11.5px; color:var(--bc-muted);">เข้าเล่นจริง</div>
                    <div style="font-size:18px; font-weight:700; color:#059669;">${gr.used}</div>
                </div>
                <div>
                    <div style="font-size:11.5px; color:var(--bc-muted);">ชั่วโมงเล่นรวม</div>
                    <div style="font-size:18px; font-weight:700; color:var(--bc-blue);">${gr.totalHoursPlayed} ชม.</div>
                </div>
                <div>
                    <div style="font-size:11.5px; color:var(--bc-muted);">ยกเลิก</div>
                    <div style="font-size:18px; font-weight:700; color:#dc2626;">${gr.cancelled}</div>
                </div>
            </div>

            <div class="stat-bar-row">
                <div class="stat-bar-header">
                    <span>🕹️ <strong>PlayStation 5 (PS5)</strong></span>
                    <span><strong>${gr.ps5.total}</strong> ครั้ง (${ps5Pct}%) • เล่นจริง ${gr.ps5.used}</span>
                </div>
                <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width:${ps5Pct}%; background:var(--bc-blue);"></div>
                </div>
            </div>

            <div class="stat-bar-row">
                <div class="stat-bar-header">
                    <span>🍄 <strong>Nintendo Switch</strong></span>
                    <span><strong>${gr.nintendo.total}</strong> ครั้ง (${ninPct}%) • เล่นจริง ${gr.nintendo.used}</span>
                </div>
                <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width:${ninPct}%; background:var(--bc-orange);"></div>
                </div>
            </div>

            <div style="margin-top:14px; font-size:12.5px; color:var(--bc-muted); background:#f8fafc; padding:8px 12px; border-radius:8px;">
                ⏰ รอบเวลายอดฮิตของห้องเกมส์: <strong style="color:var(--bc-text);">${gr.peakHour.hour} น.</strong> (${gr.peakHour.count} ครั้ง)
            </div>
        </div>

        <!-- 2. ICE BATH CARD -->
        <div class="card" style="margin-bottom: 0; border-top: 5px solid #0284c7;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h3 style="margin:0; color:#0284c7; font-size:18px;">🧊 บ่อน้ำแข็ง (Ice Bath)</h3>
                <span style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:4px 12px; border-radius:20px; font-size:13px;">รวม ${ib.total} คิว</span>
            </div>

            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; text-align:center; background:#f8fafc; padding:10px; border-radius:10px; margin-bottom:16px; border:1px solid var(--bc-border);">
                <div>
                    <div style="font-size:11.5px; color:var(--bc-muted);">ผู้ลงบ่อจริง</div>
                    <div style="font-size:18px; font-weight:700; color:#0284c7;">${ib.realizedBathers} ท่าน</div>
                </div>
                <div>
                    <div style="font-size:11.5px; color:var(--bc-muted);">รายได้สุทธิ</div>
                    <div style="font-size:18px; font-weight:700; color:#059669;">฿${ib.realizedRevenue.toLocaleString()}</div>
                </div>
                <div>
                    <div style="font-size:11.5px; color:var(--bc-muted);">ยกเลิก</div>
                    <div style="font-size:18px; font-weight:700; color:#dc2626;">${ib.cancelled} (฿${ib.lostRevenue})</div>
                </div>
            </div>

            <div class="stat-bar-row">
                <div class="stat-bar-header">
                    <span>🚹 <strong>บ่อชาย (Male - 150฿)</strong></span>
                    <span><strong>${ib.male.total}</strong> คิว (${malePct}%) • ฿${ib.male.revenue.toLocaleString()}</span>
                </div>
                <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width:${malePct}%; background:#0284c7;"></div>
                </div>
            </div>

            <div class="stat-bar-row">
                <div class="stat-bar-header">
                    <span>🚺 <strong>บ่อหญิง (Female - 150฿)</strong></span>
                    <span><strong>${ib.female.total}</strong> คิว (${femalePct}%) • ฿${ib.female.revenue.toLocaleString()}</span>
                </div>
                <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width:${femalePct}%; background:#ec4899;"></div>
                </div>
            </div>

            <div class="stat-bar-row">
                <div class="stat-bar-header">
                    <span>👫 <strong>คู่ ชาย+หญิง (Both - 300฿)</strong></span>
                    <span><strong>${ib.both.total}</strong> คิว (${bothPct}%) • ฿${ib.both.revenue.toLocaleString()}</span>
                </div>
                <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width:${bothPct}%; background:#8b5cf6;"></div>
                </div>
            </div>

            <div style="margin-top:14px; font-size:12.5px; color:var(--bc-muted); background:#f8fafc; padding:8px 12px; border-radius:8px;">
                ⏰ รอบเวลายอดฮิตของบ่อน้ำแข็ง: <strong style="color:var(--bc-text);">${ib.peakHour.hour} น.</strong> (${ib.peakHour.count} ครั้ง)
            </div>
        </div>

        <!-- 3. BICYCLE FLEET CARD -->
        <div class="card" style="margin-bottom: 0; border-top: 5px solid var(--bc-orange);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h3 style="margin:0; color:var(--bc-orange); font-size:18px;">🚲 บริการจักรยาน (Bicycles)</h3>
                <span style="background:#ffedd5; color:#c2410c; font-weight:700; padding:4px 12px; border-radius:20px; font-size:13px;">รวม ${bk.total} ครั้ง</span>
            </div>

            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; text-align:center; background:#f8fafc; padding:10px; border-radius:10px; margin-bottom:14px; border:1px solid var(--bc-border);">
                <div>
                    <div style="font-size:11.5px; color:var(--bc-muted);">รับรถ/คืนแล้ว</div>
                    <div style="font-size:18px; font-weight:700; color:#059669;">${bk.used}</div>
                </div>
                <div>
                    <div style="font-size:11.5px; color:var(--bc-muted);">เวลาปั่นเฉลี่ย</div>
                    <div style="font-size:18px; font-weight:700; color:var(--bc-orange);">${bk.rideDuration.avgMinutes} นาที</div>
                </div>
                <div>
                    <div style="font-size:11.5px; color:var(--bc-muted);">ยกเลิก/เกิน30นาที</div>
                    <div style="font-size:18px; font-weight:700; color:#dc2626;">${bk.cancelled}</div>
                </div>
            </div>

            <div class="stat-bar-row">
                <div class="stat-bar-header">
                    <span>🚴‍♂️ <strong>จักรยานผู้ใหญ่ (#1-#3)</strong></span>
                    <span><strong>${bk.adult.total}</strong> ครั้ง (${adultBikePct}%)</span>
                </div>
                <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width:${adultBikePct}%; background:var(--bc-blue);"></div>
                </div>
            </div>

            <div class="stat-bar-row">
                <div class="stat-bar-header">
                    <span>🚲🧒 <strong>จักรยานเด็ก มีล้อประคอง (#4-#5)</strong></span>
                    <span><strong>${bk.kids.total}</strong> ครั้ง (${kidsBikePct}%)</span>
                </div>
                <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width:${kidsBikePct}%; background:var(--bc-orange);"></div>
                </div>
            </div>

            <div style="margin-top:10px; background:#f8fafc; padding:8px 12px; border-radius:8px; border:1px solid var(--bc-border);">
                <div style="font-size:12px; font-weight:700; color:var(--bc-text); margin-bottom:4px;">📊 สถิติรายคัน (Bike #1 - #5):</div>
                ${perBikeRows}
            </div>
        </div>
    `;
}

function renderReportTimeAndHourly(data) {
    const todContainer = document.getElementById('report-time-of-day-grid');
    const hourlyContainer = document.getElementById('report-hourly-chart');
    if (!todContainer || !hourlyContainer) return;

    const totalAll = data.summary.totalBookings || 1;
    const periodIcons = {
        morning: '🌅',
        afternoon: '☀️',
        evening: '🌇',
        night: '🌙'
    };

    todContainer.innerHTML = data.timeOfDayBreakdown.map(p => {
        const pct = data.summary.totalBookings > 0 ? Math.round((p.total / totalAll) * 100) : 0;
        return `
            <div style="background:#f8fafc; border:1.5px solid var(--bc-border); border-radius:12px; padding:14px 16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <span style="font-weight:700; font-size:14px;">${periodIcons[p.key] || '⏰'} ${p.label}</span>
                    <span style="font-weight:700; color:var(--bc-blue); font-size:15px;">${pct}%</span>
                </div>
                <div style="font-size:22px; font-weight:700; color:var(--bc-text); margin-bottom:6px;">${p.total} <span style="font-size:13px; font-weight:500; color:var(--bc-muted);">รายการ</span></div>
                <div class="stat-bar-track" style="margin-bottom:8px;">
                    <div class="stat-bar-fill" style="width:${pct}%; background:var(--bc-blue);"></div>
                </div>
                <div style="font-size:12px; color:var(--bc-muted);">
                    🎮 เกม <strong>${p.game_room}</strong> • 🧊 น้ำแข็ง <strong>${p.ice_bath}</strong> • 🚲 จักรยาน <strong>${p.bicycle}</strong>
                </div>
            </div>
        `;
    }).join('');

    // Hourly Chart
    const maxHourly = Math.max(...data.hourlyDistribution.map(h => h.total), 1);
    hourlyContainer.innerHTML = data.hourlyDistribution.map(h => {
        const heightPct = Math.max(Math.round((h.total / maxHourly) * 125), 4);
        const isPeak = h.total === maxHourly && h.total > 0;
        return `
            <div class="hourly-col" title="${h.hour} น. : รวม ${h.total} คิว (เกม ${h.game_room}, น้ำแข็ง ${h.ice_bath}, จักรยาน ${h.bicycle})">
                <div class="hourly-val">${h.total}</div>
                <div class="hourly-bar ${isPeak ? 'peak' : ''}" style="height: ${heightPct}px;"></div>
                <div class="hourly-lbl">${h.hour.slice(0, 2)}:00</div>
            </div>
        `;
    }).join('');
}

function renderReportDowAndMonthly(data) {
    const dowContainer = document.getElementById('report-dow-container');
    const monthlyBody = document.getElementById('report-monthly-body');
    if (!dowContainer || !monthlyBody) return;

    const maxDow = Math.max(...data.dayOfWeekDistribution.map(d => d.total), 1);
    dowContainer.innerHTML = data.dayOfWeekDistribution.map(d => {
        const pct = Math.round((d.total / maxDow) * 100);
        const isWeekend = d.dayIndex === 0 || d.dayIndex === 6;
        return `
            <div class="stat-bar-row">
                <div class="stat-bar-header">
                    <span>${isWeekend ? '🔥' : '📅'} <strong>${d.dayNameTh} (${d.dayNameEn})</strong></span>
                    <span>รวม <strong>${d.total}</strong> คิว (🎮${d.game_room} / 🧊${d.ice_bath} / 🚲${d.bicycle}) • ฿${d.revenue.toLocaleString()}</span>
                </div>
                <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width:${pct}%; background:${isWeekend ? 'var(--bc-orange)' : 'var(--bc-blue)'};"></div>
                </div>
            </div>
        `;
    }).join('');

    if (data.monthlyTrend.length === 0) {
        monthlyBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888; padding:20px;">ไม่มีข้อมูลในช่วงเวลาที่เลือก</td></tr>`;
    } else {
        monthlyBody.innerHTML = [...data.monthlyTrend].reverse().map(m => `
            <tr>
                <td><strong>${m.month}</strong></td>
                <td><strong style="color:var(--bc-blue);">${m.total}</strong></td>
                <td>${m.game_room}</td>
                <td>${m.ice_bath}</td>
                <td>${m.bicycle}</td>
                <td><span style="color:#059669; font-weight:600;">${m.used}</span></td>
                <td>${m.uniqueRooms} ห้อง</td>
                <td><strong style="color:var(--bc-orange);">฿${m.revenue.toLocaleString()}</strong></td>
            </tr>
        `).join('');
    }
}

function renderReportDailyAndTopRooms(data) {
    const dailyBody = document.getElementById('report-daily-body');
    const roomsBody = document.getElementById('report-top-rooms-body');
    if (!dailyBody || !roomsBody) return;

    if (data.dailyTrend.length === 0) {
        dailyBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888; padding:20px;">ไม่มีข้อมูลรายวัน</td></tr>`;
    } else {
        dailyBody.innerHTML = [...data.dailyTrend].reverse().map(d => `
            <tr>
                <td><strong>${d.date}</strong></td>
                <td><strong style="color:var(--bc-blue);">${d.total}</strong></td>
                <td>${d.game_room}</td>
                <td>${d.ice_bath}</td>
                <td>${d.bicycle}</td>
                <td><span style="color:#059669; font-weight:600;">${d.used}</span></td>
                <td><span style="color:#dc2626;">${d.cancelled}</span></td>
                <td><strong>฿${d.revenue.toLocaleString()}</strong></td>
            </tr>
        `).join('');
    }

    if (data.topRooms.length === 0) {
        roomsBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#888; padding:20px;">ไม่มีข้อมูลห้องพัก</td></tr>`;
    } else {
        roomsBody.innerHTML = data.topRooms.map((r, idx) => {
            const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));
            return `
                <tr>
                    <td><strong>${medal}</strong></td>
                    <td><strong style="color:var(--bc-orange); font-size:15px;">ห้อง ${r.roomNumber}</strong></td>
                    <td style="font-size:12.5px; color:#475569; max-width:200px;">${r.guests.join(', ') || '-'}</td>
                    <td><strong style="color:var(--bc-blue);">${r.total} ครั้ง</strong> <span style="font-size:11.5px; color:#64748b;">(ใช้จริง ${r.used})</span></td>
                    <td style="font-size:12.5px;">🎮${r.game_room} • 🧊${r.ice_bath} • 🚲${r.bicycle}</td>
                    <td><strong style="color:#059669;">฿${r.revenue.toLocaleString()}</strong></td>
                </tr>
            `;
        }).join('');
    }
}

function filterReportRecordsTable() {
    const tbody = document.getElementById('report-records-body');
    if (!tbody || !currentReportData) return;

    const searchQ = (document.getElementById('reportSearchInput')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('reportStatusFilter')?.value || 'all';

    const filtered = currentReportData.records.filter(r => {
        if (statusFilter === 'used' && r.status !== 'completed' && r.status !== 'checked_in') return false;
        if (statusFilter === 'booked' && r.status !== 'booked') return false;
        if (statusFilter === 'cancelled' && r.status !== 'cancelled') return false;

        if (searchQ) {
            const haystack = `${r.bookingRef} ${r.hotelRoomNumber} ${r.guestName} ${r.bookingDate} ${r.facility}`.toLowerCase();
            if (!haystack.includes(searchQ)) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#888; padding:24px;">ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(r => {
        const stInfo = statusMap[r.status] || { label: r.status, color: '' };
        let timeDetail = `${r.startTime} - ${r.returnTime || r.endTime}`;
        if (r.facility === 'bicycle') {
            timeDetail = `นัดรับ ${r.startTime}`;
            if (r.checkOutTime) timeDetail += ` | รับจริง ${r.checkOutTime}`;
            if (r.returnTime) timeDetail += ` | คืน ${r.returnTime}`;
            if (r.rideDurationMins) timeDetail += ` (${r.rideDurationMins} นาที)`;
        }

        return `
            <tr>
                <td style="white-space:nowrap;">${r.bookingDate}</td>
                <td><strong>${r.bookingRef}</strong></td>
                <td>${getFacilityBadgeHtml(r)}</td>
                <td style="font-size:13px;">${timeDetail}</td>
                <td><strong style="color:var(--bc-orange);">${r.hotelRoomNumber}</strong></td>
                <td>${r.guestName}</td>
                <td><span class="status-badge ${stInfo.color}">${stInfo.label}</span></td>
                <td>${r.realizedRevenue > 0 ? `<strong style="color:#059669;">฿${r.realizedRevenue}</strong>` : '-'}</td>
            </tr>
        `;
    }).join('');
}

function exportReportCSV() {
    if (!currentReportData) {
        customAlert('กรุณารอให้ข้อมูลรายงานโหลดเสร็จสิ้นก่อนส่งออก CSV');
        return;
    }

    const s = currentReportData.summary;
    const gr = currentReportData.facilityBreakdown.gameRoom;
    const ib = currentReportData.facilityBreakdown.iceBath;
    const bk = currentReportData.facilityBreakdown.bicycle;

    const lines = [];
    const esc = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    lines.push(['รายงานสถิติการใช้งานระบบจองบริการ Base Camp Hotel'].map(esc).join(','));
    lines.push(['ช่วงเวลาที่รายงาน', `${currentReportData.filters.startDate || 'เริ่มต้น'} ถึง ${currentReportData.filters.endDate || 'ปัจจุบัน'}`].map(esc).join(','));
    lines.push(['วันที่ส่งออกรายงาน', new Date().toLocaleString('th-TH')].map(esc).join(','));
    lines.push('');

    // Summary Section
    lines.push(['=== 1. สรุปภาพรวมผู้บริหาร (Executive Summary) ==='].map(esc).join(','));
    lines.push(['ตัวชี้วัด (Metric)', 'ค่าที่ได้ (Value)'].map(esc).join(','));
    lines.push(['ยอดการจองรวมทั้งหมด (รายการ)', s.totalBookings].map(esc).join(','));
    lines.push(['เข้าใช้งานจริง Completed/Checked-in (รายการ)', s.usedCount].map(esc).join(','));
    lines.push(['รอรับบริการ Booked (รายการ)', s.bookedCount].map(esc).join(','));
    lines.push(['ยกเลิก Cancelled (รายการ)', s.cancelledCount].map(esc).join(','));
    lines.push(['อัตราการเข้าใช้งานจริง (%)', `${s.utilizationRate}%`].map(esc).join(','));
    lines.push(['อัตราการยกเลิก (%)', `${s.cancellationRate}%`].map(esc).join(','));
    lines.push(['จำนวนห้องพักที่ใช้บริการ (ห้อง)', s.uniqueRooms].map(esc).join(','));
    lines.push(['จำนวนผู้เข้าพักที่ใช้บริการ (ท่าน)', s.uniqueGuests].map(esc).join(','));
    lines.push(['เฉลี่ยการจองต่อห้องพัก (ครั้ง/ห้อง)', s.avgBookingsPerRoom].map(esc).join(','));
    lines.push(['รายได้จริงจาก Ice Bath (บาท)', s.realizedRevenue].map(esc).join(','));
    lines.push(['รายได้คาดการณ์รวม Ice Bath (บาท)', s.expectedRevenue].map(esc).join(','));
    lines.push(['รายได้ที่เสียโอกาสจากการยกเลิก Ice Bath (บาท)', s.lostRevenue].map(esc).join(','));
    lines.push(['ช่วงเวลายอดนิยมสูงสุด (Peak Hour)', `${s.peakHour.hour} น. (${s.peakHour.count} คิว)`].map(esc).join(','));
    lines.push(['วันยอดนิยมในสัปดาห์ (Peak Day)', `${s.peakDayOfWeek.dayNameTh} (${s.peakDayOfWeek.count} คิว)`].map(esc).join(','));
    lines.push('');

    // Facility Breakdown
    lines.push(['=== 2. สถิติแยกตามประเภทบริการ (Facility Breakdown) ==='].map(esc).join(','));
    lines.push(['บริการ', 'จองรวม', 'ใช้งานจริง', 'ยกเลิก', 'รายละเอียดเพิ่มเติม'].map(esc).join(','));
    lines.push(['ห้องเกมส์ (Game Room)', gr.total, gr.used, gr.cancelled, `PS5: ${gr.ps5.total} ครั้ง | Nintendo Switch: ${gr.nintendo.total} ครั้ง | รวม ${gr.totalHoursPlayed} ชม.`].map(esc).join(','));
    lines.push(['บ่อน้ำแข็ง (Ice Bath)', ib.total, ib.used, ib.cancelled, `ชาย: ${ib.male.total} | หญิง: ${ib.female.total} | คู่: ${ib.both.total} | ผู้ลงบ่อจริง ${ib.realizedBathers} ท่าน | รายได้จริง ${ib.realizedRevenue} บาท`].map(esc).join(','));
    lines.push(['จักรยาน (Bicycle Fleet)', bk.total, bk.used, bk.cancelled, `ผู้ใหญ่ (#1-#3): ${bk.adult.total} ครั้ง | เด็กมีล้อประคอง (#4-#5): ${bk.kids.total} ครั้ง | เวลาปั่นเฉลี่ย ${bk.rideDuration.avgMinutes} นาที`].map(esc).join(','));
    lines.push('');

    // Detailed Records
    lines.push(['=== 3. รายการจองละเอียดทั้งหมด (Detailed Booking Records) ==='].map(esc).join(','));
    lines.push([
        'วันที่ใช้บริการ',
        'รหัสการจอง',
        'บริการ',
        'ตัวเลือก/เครื่อง/เบอร์รถ',
        'เวลาเริ่มจอง',
        'เวลาสิ้นสุด/กำหนดคืน',
        'เวลารับรถจริง',
        'เวลาคืนรถจริง',
        'ระยะเวลาปั่น(นาที)',
        'เลขห้องพัก',
        'ชื่อผู้จอง',
        'สถานะ',
        'รายได้จริง(บาท)'
    ].map(esc).join(','));

    currentReportData.records.forEach(r => {
        lines.push([
            r.bookingDate,
            r.bookingRef,
            r.facility,
            r.facilityOption,
            r.startTime,
            r.endTime,
            r.checkOutTime,
            r.returnTime,
            r.rideDurationMins ?? '',
            r.hotelRoomNumber,
            r.guestName,
            r.status,
            r.realizedRevenue
        ].map(esc).join(','));
    });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const todayStr = formatBangkokDate(new Date());
    link.href = url;
    link.setAttribute('download', `BaseCamp_Analytics_Report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
