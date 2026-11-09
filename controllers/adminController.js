const Booking = require('../models/Booking');
const User = require('../models/User');
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


// ================= COMPREHENSIVE ANALYTICS & REPORTS =================

exports.getReports = async (req, res) => {
    try {
        const { startDate, endDate, facility } = req.query;

        const query = {};
        if (startDate && endDate) {
            query.bookingDate = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            query.bookingDate = { $gte: startDate };
        } else if (endDate) {
            query.bookingDate = { $lte: endDate };
        }

        if (facility && facility !== 'all') {
            query.facility = facility;
        }

        const bookings = await Booking.find(query)
            .populate('userId', 'displayName hotelRoomNumber')
            .sort({ bookingDate: -1, startTime: -1 });

        const dayNamesTh = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
        const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Summary counters
        let totalBookings = bookings.length;
        let usedCount = 0; // checked_in + completed
        let completedCount = 0;
        let checkedInCount = 0;
        let bookedCount = 0;
        let cancelledCount = 0;

        let realizedRevenue = 0;
        let expectedRevenue = 0;
        let lostRevenue = 0;

        let sameDayBookings = 0;
        let advanceBookings = 0;

        const uniqueRoomSet = new Set();
        const uniqueGuestSet = new Set();
        const activeDateSet = new Set();

        // Facility Breakdown structures
        const gameRoomStats = {
            total: 0, used: 0, booked: 0, cancelled: 0,
            ps5: { total: 0, used: 0, booked: 0, cancelled: 0 },
            nintendo: { total: 0, used: 0, booked: 0, cancelled: 0 },
            totalHoursPlayed: 0,
            byHour: {}
        };

        const iceBathStats = {
            total: 0, used: 0, booked: 0, cancelled: 0,
            male: { total: 0, used: 0, booked: 0, cancelled: 0, revenue: 0 },
            female: { total: 0, used: 0, booked: 0, cancelled: 0, revenue: 0 },
            both: { total: 0, used: 0, booked: 0, cancelled: 0, revenue: 0 },
            totalBathers: 0,
            realizedBathers: 0,
            realizedRevenue: 0,
            expectedRevenue: 0,
            lostRevenue: 0,
            byHour: {}
        };

        const perBikeMap = {};
        for (let i = 1; i <= 5; i++) {
            const isKids = i >= 4;
            perBikeMap[i] = {
                bikeNumber: i,
                name: isKids ? `จักรยานเด็ก (มีล้อประคอง) คันที่ ${i}` : `จักรยานผู้ใหญ่ คันที่ ${i}`,
                bikeType: isKids ? 'kids' : 'adult',
                total: 0,
                used: 0,
                booked: 0,
                cancelled: 0,
                measuredSessions: 0,
                totalRideMinutes: 0,
                avgRideMinutes: 0
            };
        }

        const bicycleStats = {
            total: 0, completed: 0, inUse: 0, used: 0, booked: 0, cancelled: 0,
            adult: { total: 0, used: 0, booked: 0, cancelled: 0 },
            kids: { total: 0, used: 0, booked: 0, cancelled: 0 },
            withDeadlineCount: 0,
            rideDuration: {
                measuredSessions: 0,
                totalMinutes: 0,
                avgMinutes: 0,
                maxMinutes: 0,
                minMinutes: null
            },
            perBike: [],
            byHour: {}
        };

        // Time of Day Periods
        const timeOfDay = {
            morning: { key: 'morning', label: 'ช่วงเช้า (06:00 - 11:59)', total: 0, game_room: 0, ice_bath: 0, bicycle: 0, used: 0, cancelled: 0 },
            afternoon: { key: 'afternoon', label: 'ช่วงบ่าย (12:00 - 15:59)', total: 0, game_room: 0, ice_bath: 0, bicycle: 0, used: 0, cancelled: 0 },
            evening: { key: 'evening', label: 'ช่วงเย็น (16:00 - 18:59)', total: 0, game_room: 0, ice_bath: 0, bicycle: 0, used: 0, cancelled: 0 },
            night: { key: 'night', label: 'ช่วงค่ำ (19:00 - 23:59)', total: 0, game_room: 0, ice_bath: 0, bicycle: 0, used: 0, cancelled: 0 }
        };

        // Hourly Distribution (07:00 - 22:00)
        const hourlyMap = {};
        for (let h = 7; h <= 22; h++) {
            const hKey = `${String(h).padStart(2, '0')}:00`;
            hourlyMap[hKey] = { hour: hKey, total: 0, game_room: 0, ice_bath: 0, bicycle: 0, used: 0, cancelled: 0 };
        }

        // Day of Week Distribution (0 - 6)
        const dowList = [];
        for (let d = 0; d < 7; d++) {
            dowList.push({
                dayIndex: d,
                dayNameTh: dayNamesTh[d],
                dayNameEn: dayNamesEn[d],
                total: 0,
                game_room: 0,
                ice_bath: 0,
                bicycle: 0,
                used: 0,
                cancelled: 0,
                revenue: 0
            });
        }

        // Daily & Monthly maps
        const dailyMap = {};
        const monthlyMap = {};
        const roomMap = {};

        const records = [];

        for (const b of bookings) {
            const room = (b.hotelRoomNumber || '-').trim();
            const guestName = (b.userId && b.userId.displayName) ? b.userId.displayName.trim() : 'ลูกค้า';
            const bDate = b.bookingDate || '';
            const fac = b.facility || 'game_room';
            const opt = b.facilityOption || '';
            const st = b.status || 'booked';
            const isUsed = st === 'checked_in' || st === 'completed';
            const isCancelled = st === 'cancelled';

            if (room && room !== '-') uniqueRoomSet.add(room);
            if (guestName) uniqueGuestSet.add(`${room}:${guestName}`);
            if (bDate) activeDateSet.add(bDate);

            if (isUsed) usedCount++;
            if (st === 'completed') completedCount++;
            if (st === 'checked_in') checkedInCount++;
            if (st === 'booked') bookedCount++;
            if (isCancelled) cancelledCount++;

            // Lead time (Same-day vs Advance)
            if (b.createdAt && bDate) {
                const createdDateStr = new Date(b.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
                if (createdDateStr < bDate) {
                    advanceBookings++;
                } else {
                    sameDayBookings++;
                }
            } else {
                sameDayBookings++;
            }

            // Hour extraction
            let hourInt = 10;
            if (b.startTime && b.startTime.includes(':')) {
                hourInt = parseInt(b.startTime.split(':')[0], 10);
                if (isNaN(hourInt)) hourInt = 10;
            }
            const hourKey = `${String(hourInt).padStart(2, '0')}:00`;
            if (!hourlyMap[hourKey]) {
                hourlyMap[hourKey] = { hour: hourKey, total: 0, game_room: 0, ice_bath: 0, bicycle: 0, used: 0, cancelled: 0 };
            }
            hourlyMap[hourKey].total++;
            if (hourlyMap[hourKey][fac] !== undefined) hourlyMap[hourKey][fac]++;
            if (isUsed) hourlyMap[hourKey].used++;
            if (isCancelled) hourlyMap[hourKey].cancelled++;

            // Time of day bucket
            let periodKey = 'morning';
            if (hourInt >= 6 && hourInt < 12) periodKey = 'morning';
            else if (hourInt >= 12 && hourInt < 16) periodKey = 'afternoon';
            else if (hourInt >= 16 && hourInt < 19) periodKey = 'evening';
            else periodKey = 'night';

            timeOfDay[periodKey].total++;
            if (timeOfDay[periodKey][fac] !== undefined) timeOfDay[periodKey][fac]++;
            if (isUsed) timeOfDay[periodKey].used++;
            if (isCancelled) timeOfDay[periodKey].cancelled++;

            // Revenue calculation for Ice Bath
            let bookingRevenue = 0;
            let batherCount = 0;
            if (fac === 'ice_bath') {
                batherCount = opt === 'both' ? 2 : 1;
                bookingRevenue = batherCount * 150;
                if (isUsed) {
                    realizedRevenue += bookingRevenue;
                }
                if (!isCancelled) {
                    expectedRevenue += bookingRevenue;
                } else {
                    lostRevenue += bookingRevenue;
                }
            }

            // Facility Specific Stats
            let rideDurationMins = null;
            if (fac === 'game_room') {
                gameRoomStats.total++;
                if (isUsed) {
                    gameRoomStats.used++;
                    gameRoomStats.totalHoursPlayed++;
                }
                if (st === 'booked') gameRoomStats.booked++;
                if (isCancelled) gameRoomStats.cancelled++;

                const consoleKey = opt === 'nintendo' ? 'nintendo' : 'ps5';
                gameRoomStats[consoleKey].total++;
                if (isUsed) gameRoomStats[consoleKey].used++;
                if (st === 'booked') gameRoomStats[consoleKey].booked++;
                if (isCancelled) gameRoomStats[consoleKey].cancelled++;

                gameRoomStats.byHour[hourKey] = (gameRoomStats.byHour[hourKey] || 0) + 1;
            } else if (fac === 'ice_bath') {
                iceBathStats.total++;
                if (isUsed) {
                    iceBathStats.used++;
                    iceBathStats.realizedBathers += batherCount;
                    iceBathStats.realizedRevenue += bookingRevenue;
                }
                if (st === 'booked') iceBathStats.booked++;
                if (!isCancelled) {
                    iceBathStats.totalBathers += batherCount;
                    iceBathStats.expectedRevenue += bookingRevenue;
                } else {
                    iceBathStats.cancelled++;
                    iceBathStats.lostRevenue += bookingRevenue;
                }

                const bathType = (opt === 'female' || opt === 'both') ? opt : 'male';
                iceBathStats[bathType].total++;
                if (isUsed) {
                    iceBathStats[bathType].used++;
                    iceBathStats[bathType].revenue += bookingRevenue;
                }
                if (st === 'booked') iceBathStats[bathType].booked++;
                if (isCancelled) iceBathStats[bathType].cancelled++;

                iceBathStats.byHour[hourKey] = (iceBathStats.byHour[hourKey] || 0) + 1;
            } else if (fac === 'bicycle') {
                bicycleStats.total++;
                if (st === 'completed') bicycleStats.completed++;
                if (st === 'checked_in') bicycleStats.inUse++;
                if (isUsed) bicycleStats.used++;
                if (st === 'booked') bicycleStats.booked++;
                if (isCancelled) bicycleStats.cancelled++;
                if (b.returnDeadline) bicycleStats.withDeadlineCount++;

                const bNum = Number(b.bikeNumber) || (opt.startsWith('bike_') ? Number(opt.replace('bike_', '')) : 1);
                const isKids = bNum >= 4 || b.bikeType === 'kids';
                const catKey = isKids ? 'kids' : 'adult';

                bicycleStats[catKey].total++;
                if (isUsed) bicycleStats[catKey].used++;
                if (st === 'booked') bicycleStats[catKey].booked++;
                if (isCancelled) bicycleStats[catKey].cancelled++;

                if (perBikeMap[bNum]) {
                    perBikeMap[bNum].total++;
                    if (isUsed) perBikeMap[bNum].used++;
                    if (st === 'booked') perBikeMap[bNum].booked++;
                    if (isCancelled) perBikeMap[bNum].cancelled++;
                }

                // Calculate ride duration if returnTime is present
                const startRef = b.checkOutTime || b.startTime;
                if (st === 'completed' && startRef && b.returnTime) {
                    const sMins = timeToMinutes(startRef);
                    const rMins = timeToMinutes(b.returnTime);
                    if (rMins >= sMins && (rMins - sMins) <= 720) {
                        rideDurationMins = Math.max(1, rMins - sMins);
                        bicycleStats.rideDuration.measuredSessions++;
                        bicycleStats.rideDuration.totalMinutes += rideDurationMins;
                        if (rideDurationMins > bicycleStats.rideDuration.maxMinutes) {
                            bicycleStats.rideDuration.maxMinutes = rideDurationMins;
                        }
                        if (bicycleStats.rideDuration.minMinutes === null || rideDurationMins < bicycleStats.rideDuration.minMinutes) {
                            bicycleStats.rideDuration.minMinutes = rideDurationMins;
                        }
                        if (perBikeMap[bNum]) {
                            perBikeMap[bNum].measuredSessions++;
                            perBikeMap[bNum].totalRideMinutes += rideDurationMins;
                        }
                    }
                }

                bicycleStats.byHour[hourKey] = (bicycleStats.byHour[hourKey] || 0) + 1;
            }

            // Day of week
            if (bDate && /^\d{4}-\d{2}-\d{2}$/.test(bDate)) {
                const [y, m, d] = bDate.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const dow = dateObj.getDay();
                if (dowList[dow]) {
                    dowList[dow].total++;
                    if (dowList[dow][fac] !== undefined) dowList[dow][fac]++;
                    if (isUsed) dowList[dow].used++;
                    if (isCancelled) dowList[dow].cancelled++;
                    if (isUsed) dowList[dow].revenue += bookingRevenue;
                }
            }

            // Daily Trend
            if (bDate) {
                if (!dailyMap[bDate]) {
                    dailyMap[bDate] = {
                        date: bDate,
                        total: 0,
                        game_room: 0,
                        ice_bath: 0,
                        bicycle: 0,
                        used: 0,
                        booked: 0,
                        cancelled: 0,
                        revenue: 0,
                        roomsSet: new Set()
                    };
                }
                dailyMap[bDate].total++;
                if (dailyMap[bDate][fac] !== undefined) dailyMap[bDate][fac]++;
                if (isUsed) dailyMap[bDate].used++;
                if (st === 'booked') dailyMap[bDate].booked++;
                if (isCancelled) dailyMap[bDate].cancelled++;
                if (isUsed) dailyMap[bDate].revenue += bookingRevenue;
                if (room && room !== '-') dailyMap[bDate].roomsSet.add(room);

                // Monthly Trend
                const monthKey = bDate.slice(0, 7); // YYYY-MM
                if (!monthlyMap[monthKey]) {
                    monthlyMap[monthKey] = {
                        month: monthKey,
                        total: 0,
                        game_room: 0,
                        ice_bath: 0,
                        bicycle: 0,
                        used: 0,
                        cancelled: 0,
                        revenue: 0,
                        roomsSet: new Set()
                    };
                }
                monthlyMap[monthKey].total++;
                if (monthlyMap[monthKey][fac] !== undefined) monthlyMap[monthKey][fac]++;
                if (isUsed) monthlyMap[monthKey].used++;
                if (isCancelled) monthlyMap[monthKey].cancelled++;
                if (isUsed) monthlyMap[monthKey].revenue += bookingRevenue;
                if (room && room !== '-') monthlyMap[monthKey].roomsSet.add(room);
            }

            // Room Leaderboard
            if (room && room !== '-') {
                if (!roomMap[room]) {
                    roomMap[room] = {
                        roomNumber: room,
                        guestsSet: new Set(),
                        total: 0,
                        used: 0,
                        cancelled: 0,
                        game_room: 0,
                        ice_bath: 0,
                        bicycle: 0,
                        revenue: 0
                    };
                }
                roomMap[room].total++;
                if (guestName) roomMap[room].guestsSet.add(guestName);
                if (isUsed) roomMap[room].used++;
                if (isCancelled) roomMap[room].cancelled++;
                if (roomMap[room][fac] !== undefined) roomMap[room][fac]++;
                if (isUsed) roomMap[room].revenue += bookingRevenue;
            }

            // Push record for table / CSV export
            records.push({
                bookingRef: b.bookingRef,
                bookingDate: bDate,
                startTime: b.startTime || '-',
                endTime: b.endTime || '-',
                checkOutTime: b.checkOutTime || '',
                returnTime: b.returnTime || '',
                returnDeadline: b.returnDeadline || '',
                hotelRoomNumber: room,
                guestName,
                facility: fac,
                facilityOption: opt,
                bikeNumber: b.bikeNumber || null,
                bikeType: b.bikeType || (b.bikeNumber ? (b.bikeNumber >= 4 ? 'kids' : 'adult') : ''),
                status: st,
                revenue: isCancelled ? 0 : bookingRevenue,
                realizedRevenue: isUsed ? bookingRevenue : 0,
                rideDurationMins,
                createdAt: b.createdAt
            });
        }

        // Finalize Bicycle averages
        if (bicycleStats.rideDuration.measuredSessions > 0) {
            bicycleStats.rideDuration.avgMinutes = Math.round(
                bicycleStats.rideDuration.totalMinutes / bicycleStats.rideDuration.measuredSessions
            );
        } else {
            bicycleStats.rideDuration.minMinutes = 0;
        }

        bicycleStats.perBike = Object.values(perBikeMap).map(pb => {
            pb.avgRideMinutes = pb.measuredSessions > 0 ? Math.round(pb.totalRideMinutes / pb.measuredSessions) : 0;
            return pb;
        });

        // Helper to find peak key in map
        const findPeakHour = (hObj) => {
            let bestHour = '-';
            let maxCount = 0;
            Object.entries(hObj).forEach(([hr, cnt]) => {
                if (cnt > maxCount) {
                    maxCount = cnt;
                    bestHour = hr;
                }
            });
            return { hour: bestHour, count: maxCount };
        };

        gameRoomStats.peakHour = findPeakHour(gameRoomStats.byHour);
        iceBathStats.peakHour = findPeakHour(iceBathStats.byHour);
        bicycleStats.peakHour = findPeakHour(bicycleStats.byHour);
        delete gameRoomStats.byHour;
        delete iceBathStats.byHour;
        delete bicycleStats.byHour;

        const hourlyDistribution = Object.values(hourlyMap).sort((a, b) => a.hour.localeCompare(b.hour));
        let peakHourObj = { hour: '-', count: 0 };
        hourlyDistribution.forEach(item => {
            if (item.total > peakHourObj.count) {
                peakHourObj = { hour: item.hour, count: item.total };
            }
        });

        let peakDowObj = { dayNameTh: '-', count: 0 };
        dowList.forEach(item => {
            if (item.total > peakDowObj.count) {
                peakDowObj = { dayNameTh: item.dayNameTh, count: item.total };
            }
        });

        const dailyTrend = Object.values(dailyMap)
            .map(d => ({
                date: d.date,
                total: d.total,
                game_room: d.game_room,
                ice_bath: d.ice_bath,
                bicycle: d.bicycle,
                used: d.used,
                booked: d.booked,
                cancelled: d.cancelled,
                revenue: d.revenue,
                uniqueRooms: d.roomsSet.size
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        let busiestDateObj = { date: '-', count: 0 };
        dailyTrend.forEach(item => {
            if (item.total > busiestDateObj.count) {
                busiestDateObj = { date: item.date, count: item.total };
            }
        });

        const monthlyTrend = Object.values(monthlyMap)
            .map(m => ({
                month: m.month,
                total: m.total,
                game_room: m.game_room,
                ice_bath: m.ice_bath,
                bicycle: m.bicycle,
                used: m.used,
                cancelled: m.cancelled,
                revenue: m.revenue,
                uniqueRooms: m.roomsSet.size
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

        const topRooms = Object.values(roomMap)
            .map(r => ({
                roomNumber: r.roomNumber,
                guests: Array.from(r.guestsSet),
                total: r.total,
                used: r.used,
                cancelled: r.cancelled,
                game_room: r.game_room,
                ice_bath: r.ice_bath,
                bicycle: r.bicycle,
                revenue: r.revenue
            }))
            .sort((a, b) => b.total - a.total || b.used - a.used)
            .slice(0, 15);

        const uniqueRoomsCount = uniqueRoomSet.size;
        const uniqueGuestsCount = uniqueGuestSet.size;
        const activeDaysCount = activeDateSet.size;

        const utilizationRate = totalBookings > 0 ? Number(((usedCount / totalBookings) * 100).toFixed(1)) : 0;
        const cancellationRate = totalBookings > 0 ? Number(((cancelledCount / totalBookings) * 100).toFixed(1)) : 0;
        const avgBookingsPerRoom = uniqueRoomsCount > 0 ? Number((totalBookings / uniqueRoomsCount).toFixed(1)) : 0;
        const avgBookingsPerActiveDay = activeDaysCount > 0 ? Number((totalBookings / activeDaysCount).toFixed(1)) : 0;

        res.json({
            filters: {
                startDate: startDate || (dailyTrend.length > 0 ? dailyTrend[0].date : ''),
                endDate: endDate || (dailyTrend.length > 0 ? dailyTrend[dailyTrend.length - 1].date : ''),
                facility: facility || 'all'
            },
            summary: {
                totalBookings,
                usedCount,
                completedCount,
                checkedInCount,
                bookedCount,
                cancelledCount,
                utilizationRate,
                cancellationRate,
                uniqueRooms: uniqueRoomsCount,
                uniqueGuests: uniqueGuestsCount,
                avgBookingsPerRoom,
                activeDaysCount,
                avgBookingsPerActiveDay,
                realizedRevenue,
                expectedRevenue,
                lostRevenue,
                sameDayBookings,
                advanceBookings,
                peakHour: peakHourObj,
                peakDayOfWeek: peakDowObj,
                busiestDate: busiestDateObj
            },
            facilityBreakdown: {
                gameRoom: gameRoomStats,
                iceBath: iceBathStats,
                bicycle: bicycleStats
            },
            timeOfDayBreakdown: Object.values(timeOfDay),
            hourlyDistribution,
            dayOfWeekDistribution: dowList,
            dailyTrend,
            monthlyTrend,
            topRooms,
            records
        });
    } catch (error) {
        console.error('getReports error:', error);
        res.status(500).json({ message: error.message });
    }
};
