const Booking = require('../models/Booking');
const SystemSetting = require('../models/SystemSetting');

// ดูตารางการจองของวันนี้
exports.getSchedule = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ message: 'กรุณาระบุวันที่ (date)' });

        const bookings = await Booking.find({ bookingDate: date })
            .populate('userId', 'displayName hotelRoomNumber')
            .sort({ slotNumber: 1, createdAt: -1 });

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// เช็คอิน (สแกน QR)
exports.checkIn = async (req, res) => {
    try {
        const { bookingRef } = req.body;
        if (!bookingRef) return res.status(400).json({ message: 'กรุณาระบุรหัสการจอง (bookingRef)' });

        const booking = await Booking.findOne({ bookingRef });
        if (!booking) return res.status(404).json({ message: 'ไม่พบข้อมูลการจองนี้' });

        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'การจองนี้ถูกยกเลิกไปแล้ว' });
        }
        if (booking.status === 'completed') {
            return res.status(400).json({ message: 'การจองนี้เล่นเสร็จสิ้นหรือคืนรถไปแล้ว' });
        }
        if (booking.status === 'checked_in') {
            return res.status(400).json({ message: 'รายการนี้ทำการ Check-in / ส่งมอบไปแล้ว' });
        }

        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

        // เช็คว่าการจองเป็นของวันนี้หรือไม่
        if (booking.bookingDate !== todayStr) {
            return res.status(400).json({ message: `ยังไม่ถึงวันที่จอง (คิวนี้ของวันที่ ${booking.bookingDate})` });
        }

        const bkkTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
        const currentMinutes = bkkTime.getHours() * 60 + bkkTime.getMinutes();
        const timeStr = now.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });

        // สำหรับห้องเกมส์ และบ่อน้ำแข็ง ให้เช็คเวลาว่ามาก่อนเวลาเกิน 15 นาที หรือไม่
        if (booking.facility !== 'bicycle') {
            const [startH, startM] = (booking.startTime || '00:00').split(':').map(Number);
            const startMinutes = startH * 60 + startM;

            if (currentMinutes < startMinutes - 15) {
                return res.status(400).json({ message: `ยังไม่ถึงรอบเวลา (รอบ ${booking.startTime} สามารถ Check-in ได้ก่อนเวลา 15 นาที)` });
            }
        } else {
            booking.checkOutTime = timeStr;
        }

        booking.status = 'checked_in';
        await booking.save();

        res.json({ message: 'Check-in สำเร็จ', booking });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// พนักงานยกเลิกการจอง
exports.cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        
        const booking = await Booking.findById(id);
        if (!booking) return res.status(404).json({ message: 'ไม่พบการจอง' });

        booking.status = 'cancelled';
        await booking.save();

        res.json({ message: 'ยกเลิกการจองสำเร็จ', booking });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ดึงสถานะเปิด-ปิด บริการและเครื่องเล่น (รองรับการระบุวันที่ date)
exports.getFacilityStatus = async (req, res) => {
    try {
        const { date } = req.query;
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        const targetDate = date || todayStr;

        const settings = await SystemSetting.getSettingsForDate(targetDate);
        const upcomingClosures = await SystemSetting.getUpcomingClosures(todayStr);
        const hasDateOverride = settings.date === targetDate;

        res.json({
            settings,
            targetDate,
            hasDateOverride,
            upcomingClosures
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// อัปเดตสถานะเปิด-ปิด บริการและเครื่องเล่น (รองรับการระบุวันที่ date)
exports.updateFacilityStatus = async (req, res) => {
    try {
        const { date, gameRoom, iceBath, bicycle, note } = req.body;
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        const targetDate = date || todayStr;

        let settings = await SystemSetting.findOne({ date: targetDate });
        if (!settings) {
            const defaultSettings = await SystemSetting.getSettings();
            settings = new SystemSetting({
                date: targetDate,
                gameRoom: { ...defaultSettings.gameRoom.toObject() },
                iceBath: { ...defaultSettings.iceBath.toObject() },
                bicycle: { ...(defaultSettings.bicycle ? defaultSettings.bicycle.toObject() : {}) }
            });
        }

        if (gameRoom) {
            if (typeof gameRoom.isOpen === 'boolean') settings.gameRoom.isOpen = gameRoom.isOpen;
            if (typeof gameRoom.ps5 === 'boolean') settings.gameRoom.ps5 = gameRoom.ps5;
            if (typeof gameRoom.nintendo === 'boolean') settings.gameRoom.nintendo = gameRoom.nintendo;
        }

        if (iceBath) {
            if (typeof iceBath.isOpen === 'boolean') settings.iceBath.isOpen = iceBath.isOpen;
            if (typeof iceBath.male_bath_1 === 'boolean') settings.iceBath.male_bath_1 = iceBath.male_bath_1;
            if (typeof iceBath.male_bath_2 === 'boolean') settings.iceBath.male_bath_2 = iceBath.male_bath_2;
            if (typeof iceBath.female_bath_1 === 'boolean') settings.iceBath.female_bath_1 = iceBath.female_bath_1;
            if (typeof iceBath.female_bath_2 === 'boolean') settings.iceBath.female_bath_2 = iceBath.female_bath_2;
        }

        if (bicycle) {
            if (!settings.bicycle) settings.bicycle = {};
            if (typeof bicycle.isOpen === 'boolean') settings.bicycle.isOpen = bicycle.isOpen;
            if (typeof bicycle.bike_1 === 'boolean') settings.bicycle.bike_1 = bicycle.bike_1;
            if (typeof bicycle.bike_2 === 'boolean') settings.bicycle.bike_2 = bicycle.bike_2;
            if (typeof bicycle.bike_3 === 'boolean') settings.bicycle.bike_3 = bicycle.bike_3;
            if (typeof bicycle.bike_4 === 'boolean') settings.bicycle.bike_4 = bicycle.bike_4;
            if (typeof bicycle.bike_5 === 'boolean') settings.bicycle.bike_5 = bicycle.bike_5;
        }

        if (typeof note === 'string') settings.note = note;
        settings.updatedAt = new Date();
        await settings.save();

        const upcomingClosures = await SystemSetting.getUpcomingClosures(todayStr);

        res.json({ 
            message: `อัปเดตสถานะบริการสำหรับวันที่ ${targetDate} สำเร็จ`, 
            settings,
            upcomingClosures
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// รีเซ็ตการปิดล่วงหน้าของวันที่ระบุ ให้กลับเป็นเปิดบริการปกติ
exports.resetFacilityStatus = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date || date === 'default') {
            return res.status(400).json({ message: 'กรุณาระบุวันที่ที่ต้องการรีเซ็ต' });
        }

        await SystemSetting.deleteOne({ date });
        
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        const upcomingClosures = await SystemSetting.getUpcomingClosures(todayStr);

        res.json({ 
            message: `รีเซ็ตการตั้งค่าของวันที่ ${date} กลับเป็นเปิดปกติเรียบร้อย`,
            upcomingClosures
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= BICYCLE FLEET CONTROLS =================

// ================= BICYCLE FLEET CONTROLS (ADMIN) =================

// Helper: Time conversions and auto-cancel
const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};

const minutesToTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const getBangkokDateTime = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const timeStr = formatter.format(now);
    const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    return { dateStr, timeStr, now };
};

const autoCancelExpiredBicycles = async (targetDate) => {
    try {
        const { dateStr, timeStr } = getBangkokDateTime();
        if (targetDate && targetDate !== dateStr) return 0;

        const currentMins = timeToMinutes(timeStr);
        const bookedList = await Booking.find({
            bookingDate: dateStr,
            facility: 'bicycle',
            status: 'booked'
        });

        let cancelledCount = 0;
        for (const b of bookedList) {
            const startMins = timeToMinutes(b.startTime);
            if (currentMins > startMins + 30) {
                b.status = 'cancelled';
                await b.save();
                cancelledCount++;
                console.log(`[Admin Cron] Bicycle ${b.bookingRef} auto-cancelled (> 30 mins no-show)`);
            }
        }
        return cancelledCount;
    } catch (err) {
        console.error('autoCancelExpiredBicycles error:', err);
        return 0;
    }
};

// ดึงสถานะจักรยาน 5 คันสำหรับหน้า Admin Dashboard
exports.getBicycleFleet = async (req, res) => {
    try {
        const { date } = req.query;
        const { dateStr: todayStr, timeStr: nowTimeStr } = getBangkokDateTime();
        const targetDate = date || todayStr;
        const isToday = targetDate === todayStr;

        // Auto-cancel late bookings
        if (isToday) {
            await autoCancelExpiredBicycles(todayStr);
        }

        const settings = await SystemSetting.getSettingsForDate(targetDate);
        const bikeSettings = settings.bicycle || {
            isOpen: true, bike_1: true, bike_2: true, bike_3: true, bike_4: true, bike_5: true
        };

        const activeBookings = await Booking.find({
            bookingDate: targetDate,
            facility: 'bicycle',
            status: { $in: ['booked', 'checked_in'] }
        }).populate('userId', 'displayName hotelRoomNumber').sort({ startTime: 1 });

        const currentMinutes = isToday ? timeToMinutes(nowTimeStr) : 0;

        const fleet = [];
        for (let i = 1; i <= 5; i++) {
            const key = `bike_${i}`;
            const isEnabled = bikeSettings.isOpen && bikeSettings[key];
            const bikeType = i <= 3 ? 'adult' : 'kids';
            const hasTrainingWheels = i >= 4;

            const bikeBookings = activeBookings.filter(b => b.bikeNumber === i);

            let status = 'available';
            let mainBooking = null;
            let nextBooking = null;
            let returnDeadline = null;
            let pickupDeadline = null;
            let note = '';

            if (!isEnabled) {
                status = 'maintenance';
                note = 'ปิดปรับปรุง (ตั้งค่าในแท็บ เปิด-ปิดบริการ)';
            } else if (bikeBookings.length > 0) {
                const inUseBooking = bikeBookings.find(b => b.status === 'checked_in');
                const bookedList = bikeBookings.filter(b => b.status === 'booked');

                if (inUseBooking) {
                    status = 'in_use';
                    mainBooking = inUseBooking;
                    if (bookedList.length > 0) {
                        nextBooking = bookedList[0];
                        returnDeadline = minutesToTime(timeToMinutes(nextBooking.startTime) - 30);
                        note = `มีคิวจองถัดไปเวลา ${nextBooking.startTime} น. (กำหนดคืนก่อน ${returnDeadline} น.)`;
                    }
                } else if (bookedList.length > 0) {
                    const earliest = bookedList[0];
                    const startMins = timeToMinutes(earliest.startTime);

                    if (isToday) {
                        if (currentMinutes < startMins - 30) {
                            // Available to borrow until 30 mins before reservation
                            status = 'available';
                            nextBooking = earliest;
                            returnDeadline = minutesToTime(startMins - 30);
                            note = `ว่าง (ยืมได้ถึง ${returnDeadline} น. เนื่องจากมีคิวจอง ${earliest.startTime} น.)`;
                        } else if (currentMinutes <= startMins + 30) {
                            // Holding for guest
                            status = 'booked';
                            mainBooking = earliest;
                            pickupDeadline = minutesToTime(startMins + 30);
                            note = `รอรับรถรอบ ${earliest.startTime} น. (ตัดสิทธิ์หากไม่มาภายใน ${pickupDeadline} น.)`;
                        } else {
                            status = 'available';
                        }
                    } else {
                        // Future date
                        status = 'booked';
                        mainBooking = earliest;
                        note = `มีคิวจองล่วงหน้าเวลา ${earliest.startTime} น.`;
                    }
                }
            }

            fleet.push({
                bikeNumber: i,
                code: key,
                name: i <= 3 ? `จักรยานผู้ใหญ่ คันที่ ${i}` : `จักรยานเด็ก (มีล้อประคอง) คันที่ ${i}`,
                bikeType,
                hasTrainingWheels,
                status,
                booking: mainBooking,
                nextBooking,
                returnDeadline,
                pickupDeadline,
                note
            });
        }

        res.json({
            targetDate,
            currentTime: nowTimeStr,
            bicycleOpen: bikeSettings.isOpen,
            fleet
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ส่งมอบจักรยานให้ลูกค้า (Check-out / Handover)
exports.handoverBicycle = async (req, res) => {
    try {
        const { bookingRef, id } = req.body;
        const query = id ? { _id: id } : { bookingRef };
        const booking = await Booking.findOne(query);

        if (!booking) return res.status(404).json({ message: 'ไม่พบข้อมูลการจอง' });
        if (booking.facility !== 'bicycle') return res.status(400).json({ message: 'รายการนี้ไม่ใช่จักรยาน' });
        if (booking.status === 'cancelled') return res.status(400).json({ message: 'การจองนี้ถูกยกเลิกแล้ว' });
        if (booking.status === 'completed') return res.status(400).json({ message: 'จักรยานคันนี้ส่งคืนเรียบร้อยแล้ว' });
        if (booking.status === 'checked_in') return res.status(400).json({ message: 'จักรยานคันนี้ส่งมอบไปแล้ว' });

        const { timeStr } = getBangkokDateTime();

        booking.status = 'checked_in';
        booking.checkOutTime = timeStr;
        await booking.save();

        res.json({ message: `ส่งมอบจักรยานเบอร์ ${booking.bikeNumber} สำเร็จ`, booking });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// รับคืนจักรยาน (Return) -> ทันทีที่รับคืน คันนั้นจะเปิดว่างให้จองต่อได้ทันที
exports.returnBicycle = async (req, res) => {
    try {
        const { bookingRef, id } = req.body;
        const query = id ? { _id: id } : { bookingRef };
        const booking = await Booking.findOne(query);

        if (!booking) return res.status(404).json({ message: 'ไม่พบข้อมูลการจอง' });
        if (booking.facility !== 'bicycle') return res.status(400).json({ message: 'รายการนี้ไม่ใช่จักรยาน' });
        if (booking.status === 'completed') return res.status(400).json({ message: 'จักรยานคันนี้บันทึกรับคืนไปแล้ว' });

        const { timeStr } = getBangkokDateTime();

        booking.status = 'completed';
        booking.returnTime = timeStr;
        await booking.save();

        res.json({ message: `รับคืนจักรยานเบอร์ ${booking.bikeNumber} เรียบร้อย (เปิดว่างทันที)`, booking });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
