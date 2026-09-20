document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('current-date').innerText = today;

    // Set default date for admin schedule
    const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    document.getElementById('adminDate').value = dateStr;
    document.getElementById('historyDate').value = dateStr;

    loadSchedule();
    // Auto refresh every 30 seconds
    setInterval(() => {
        if (document.getElementById('tab-schedule').classList.contains('active')) {
            loadSchedule();
        }
    }, 30000);
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.add('active');

    if(tabId === 'history') {
        loadHistory();
    } else {
        loadSchedule();
    }
}

const statusMap = {
    'booked': { label: 'รอ Check-in', color: 'bg-yellow' },
    'checked_in': { label: 'กำลังเล่น', color: 'bg-blue' },
    'completed': { label: 'เสร็จสิ้น', color: 'bg-gray' },
    'cancelled': { label: 'ยกเลิก', color: 'bg-red' }
};

async function loadSchedule() {
    const selectedDate = document.getElementById('adminDate').value;
    if(!selectedDate) return;

    try {
        const res = await fetch(`https://sibling-compacted-decrease.ngrok-free.dev/api/admin/schedule?date=${selectedDate}`, {
            headers: { 'ngrok-skip-browser-warning': '69420' }
        });
        const bookings = await res.json();
        
        const tbody = document.getElementById('schedule-body');
        tbody.innerHTML = '';

        if (bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">ยังไม่มีการจองในวันที่เลือก</td></tr>';
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
                    <div style="display:flex; flex-direction:column; gap: 5px;">
                        <div style="display:flex; gap: 5px;">
                            <button class="btn-sm-doc" style="background:#3182ce; flex:1;" onclick="openDocument('${b.bookingRef}', '${b.hotelRoomNumber}', '${name}', '${b.bookingDate}', '${b.startTime}', 'th', '${b.facility}')">📄 พิมพ์ (TH)</button>
                            <button class="btn-sm-doc" style="background:#4a5568; flex:1;" onclick="openDocument('${b.bookingRef}', '${b.hotelRoomNumber}', '${name}', '${b.bookingDate}', '${b.startTime}', 'en', '${b.facility}')">📄 Print (EN)</button>
                        </div>
                        <div style="display:flex; gap: 5px;">
                            <button class="btn-sm-checkin" style="flex:1;" onclick="checkIn('${b.bookingRef}')">Check-in</button>
                            <button class="btn-cancel" style="flex:1;" onclick="cancelBooking('${b._id}')">ยกเลิก</button>
                        </div>
                    </div>
                `;
            }

            tr.innerHTML = `
                <td><strong style="color:var(--primary-color)">${b.bookingRef}</strong><br><span style="font-size:11px; background:${b.facility === 'ice_bath' ? '#00bcd4' : '#e2e8f0'}; color:${b.facility === 'ice_bath' ? 'white' : '#4a5568'}; padding:2px 6px; border-radius:4px;">${b.facility === 'ice_bath' ? 'ICE BATH' : 'GAME ROOM'}</span></td>
                <td>${b.slotNumber}</td>
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
        const res = await fetch(`https://sibling-compacted-decrease.ngrok-free.dev/api/admin/schedule?date=${selectedDate}`, {
            headers: { 'ngrok-skip-browser-warning': '69420' }
        });
        let bookings = await res.json();
        
        // กรองเฉพาะประวัติที่ใช้งานไปแล้ว (checked_in หรือ completed)
        bookings = bookings.filter(b => b.status === 'checked_in' || b.status === 'completed');

        const tbody = document.getElementById('history-body');
        tbody.innerHTML = '';

        if (bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">ไม่มีประวัติการเข้าใช้งานในวันนี้</td></tr>';
            return;
        }

        bookings.forEach(b => {
            const tr = document.createElement('tr');
            const st = statusMap[b.status] || { label: b.status, color: '' };
            
            let name = "-";
            if(b.userId && b.userId.displayName) name = b.userId.displayName;

            tr.innerHTML = `
                <td><strong>${b.bookingRef}</strong></td>
                <td>${b.startTime} - ${b.endTime}</td>
                <td>${b.hotelRoomNumber}</td>
                <td>${name}</td>
                <td><span class="badge ${st.color}">${st.label}</span></td>
                <td>
                    <div style="display:flex; gap: 5px;">
                        <button class="btn-sm-doc" style="background:#3182ce;" onclick="openDocument('${b.bookingRef}', '${b.hotelRoomNumber}', '${name}', '${b.bookingDate}', '${b.startTime}', 'th', '${b.facility}')">📄 พิมพ์ (TH)</button>
                        <button class="btn-sm-doc" style="background:#4a5568;" onclick="openDocument('${b.bookingRef}', '${b.hotelRoomNumber}', '${name}', '${b.bookingDate}', '${b.startTime}', 'en', '${b.facility}')">📄 Print (EN)</button>
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
        alert('กรุณากรอกรหัสการจอง');
        return;
    }
    await checkIn(refCode);
    refInput.value = '';
}

async function checkIn(bookingRef) {
    if(!confirm(`ยืนยันการ Check-in ให้กับรหัส: ${bookingRef} ใช่หรือไม่?`)) return;

    try {
        const res = await fetch('https://sibling-compacted-decrease.ngrok-free.dev/api/admin/bookings/check-in', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': '69420'
            },
            body: JSON.stringify({ bookingRef })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            alert('✅ Check-in สำเร็จ!');
            loadSchedule();
            loadHistory();
        } else {
            alert(`❌ ${data.message}`);
        }
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
}

async function cancelBooking(id) {
    if(!confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการจองนี้? รอบเวลาจะว่างให้คนอื่นจองทันที')) return;

    try {
        const res = await fetch(`https://sibling-compacted-decrease.ngrok-free.dev/api/admin/bookings/${id}/cancel`, {
            method: 'PUT',
            headers: { 'ngrok-skip-browser-warning': '69420' }
        });
        
        if (res.ok) {
            alert('ยกเลิกสำเร็จ');
            loadSchedule();
        } else {
            const data = await res.json();
            alert(`ข้อผิดพลาด: ${data.message}`);
        }
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
}

function openDocument(ref, room, name, date, time, lang, facility = 'game_room') {
    let title, header, printBtn, refLabel, dateLabel, timeLabel, ackText, listItems, generatedText, signatureLabel;

    if (lang === 'en') {
        title = facility === 'ice_bath' ? "Ice Bath Agreement" : "Game Room Agreement";
        header = facility === 'ice_bath' ? "ICE BATH USAGE AGREEMENT" : "GAME ROOM USAGE AGREEMENT";
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
                <li><strong>There is a 50 THB fee per session.</strong> Please pay at the counter.</li>
                <li>Session time in the room is 1 hour, but for safety, <strong>do not immerse in ice water for more than 5-10 continuous minutes.</strong></li>
                <li>Exit immediately and notify staff if you experience dizziness, shortness of breath, severe shivering, or chest pain.</li>
                <li>Never plunge alone. Always have a companion or staff member nearby.</li>
                <li>Enter and exit the bath slowly and carefully to prevent slips and falls.</li>
                <li>Users assume all risks. The hotel is not liable for any health issues or injuries resulting from rule violations.</li>
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
        title = facility === 'ice_bath' ? "เอกสารยินยอม - บ่อน้ำแข็ง" : "เอกสารยินยอม - ห้องเกมส์";
        header = facility === 'ice_bath' ? "ข้อตกลงการใช้บริการบ่อน้ำแข็ง (ICE BATH)" : "ข้อตกลงการใช้บริการห้องเกมส์ (GAME ROOM)";
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
                <li><strong>มีค่าบริการ 50 บาทต่อรอบ</strong> กรุณาชำระเงินและรับคำแนะนำที่เคาน์เตอร์ก่อนใช้บริการ</li>
                <li>กำหนดเวลาใช้บริการในห้อง 1 ชั่วโมงต่อรอบ แต่เพื่อความปลอดภัย <strong>ห้ามแช่น้ำแข็งต่อเนื่องเกิน 5-10 นาทีต่อครั้ง</strong></li>
                <li>หากมีอาการหน้ามืด หายใจไม่ออก หนาวสั่นรุนแรง หรือเจ็บหน้าอก ให้รีบขึ้นจากอ่างและแจ้งพนักงานทันที</li>
                <li>ห้ามแช่น้ำแข็งตามลำพัง ต้องมีผู้ดูแลหรือเพื่อนอยู่ด้วยเสมอ</li>
                <li>การลงและขึ้นจากอ่างต้องทำอย่างช้าๆ ระมัดระวังการลื่นล้ม</li>
                <li>ผู้ใช้บริการยอมรับความเสี่ยงด้วยตนเอง ทางโรงแรมจะไม่รับผิดชอบต่อปัญหาสุขภาพหรืออุบัติเหตุที่เกิดจากการฝ่าฝืนกฎ</li>
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
                body { font-family: 'Kanit', sans-serif; padding: 40px; color: #1a202c; line-height: 1.6; }
                .header-box { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
                .header-box img { max-height: 80px; width: auto; margin-bottom: 15px; }
                .header-box h2 { margin: 0; color: #2d3748; letter-spacing: 1px; font-size: 24px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
                .info-item { font-size: 15px; }
                .info-label { color: #718096; font-size: 13px; text-transform: uppercase; margin-bottom: 5px; }
                .info-value { font-weight: 500; font-size: 16px; }
                .terms-section { margin-bottom: 50px; }
                .terms-section h3 { font-size: 18px; color: #2d3748; margin-bottom: 15px; }
                .terms-list { padding-left: 20px; font-size: 15px; }
                .terms-list li { margin-bottom: 12px; }
                .signature-section { display: flex; justify-content: flex-end; margin-top: 60px; }
                .signature-box { text-align: center; width: 250px; }
                .signature-line { border-bottom: 1px solid #718096; margin-bottom: 10px; height: 40px; }
                .signature-name { font-size: 14px; color: #4a5568; }
                .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                
                @media print {
                    .no-print { display: none !important; }
                    body { padding: 0; }
                    .info-grid { background: white; border: 1px solid #cbd5e0; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="text-align: right; margin-bottom: 20px;">
                <button onclick="window.print()" style="background: #3182ce; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-family: 'Kanit'; font-size: 15px;">${printBtn}</button>
            </div>
            
            <div class="header-box">
                <img src="https://kaaom3.github.io/base-camp-booking/public/images/logo.png" alt="Base Camp Logo">
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
