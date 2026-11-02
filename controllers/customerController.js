const Booking = require('../models/Booking');
const User = require('../models/User');
const SystemSetting = require('../models/SystemSetting');

const GAME_ROOM_SLOTS = [
    { slotNumber: 1, startTime: "09:00", endTime: "10:00" },
    { slotNumber: 2, startTime: "10:30", endTime: "11:30" },
    { slotNumber: 3, startTime: "12:00", endTime: "13:00" },
    { slotNumber: 4, startTime: "13:30", endTime: "14:30" },
    { slotNumber: 5, startTime: "15:00", endTime: "16:00" },
    { slotNumber: 6, startTime: "16:30", endTime: "17:30" },
    { slotNumber: 7, startTime: "18:00", endTime: "19:00" },
    { slotNumber: 8, startTime: "19:30", endTime: "20:30" },
    { slotNumber: 9, startTime: "21:00", endTime: "22:00" }
];

const ICE_BATH_SLOTS = [
    { slotNumber: 1, startTime: "09:00", endTime: "10:00" },
    { slotNumber: 2, startTime: "10:30", endTime: "11:30" },
    { slotNumber: 3, startTime: "16:00", endTime: "17:00" },
    { slotNumber: 4, startTime: "17:30", endTime: "18:30" },
    { slotNumber: 5, startTime: "19:00", endTime: "20:00" }
];

// ดึงสถานะเปิด-ปิด บริการสำหรับหน้าลูกค้า
exports.getFacilityStatus = async (req, res) => {
    try {
        const { date } = req.query;
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        const settings = await SystemSetting.getSettingsForDate(date || todayStr);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAvailableSlots = async (req, res) => {
    try {
        const { date, facility, option } = req.query;
        if (!date) return res.status(400).json({ message: 'กรุณาระบุวันที่ (date)' });
        if (!option) return res.status(400).json({ message: 'กรุณาระบุตัวเลือก (option)' });
        
        const settings = await SystemSetting.getSettingsForDate(date);
        const gameRoomOpen = settings.gameRoom.isOpen;
        const ps5Active = gameRoomOpen && settings.gameRoom.ps5;
        const nintendoActive = gameRoomOpen && settings.gameRoom.nintendo;

        const iceBathOpen = settings.iceBath.isOpen;
        const maxMale = iceBathOpen ? ((settings.iceBath.male_bath_1 ? 1 : 0) + (settings.iceBath.male_bath_2 ? 1 : 0)) : 0;
        const maxFemale = iceBathOpen ? ((settings.iceBath.female_bath_1 ? 1 : 0) + (settings.iceBath.female_bath_2 ? 1 : 0)) : 0;

        const targetFacility = facility === 'ice_bath' ? 'ice_bath' : 'game_room';
        const targetSlots = targetFacility === 'ice_bath' ? ICE_BATH_SLOTS : GAME_ROOM_SLOTS;

        // ถ้าเครื่องหรือบริการปิดปรับปรุง ให้ส่งกลับว่าไม่ว่างทั้งหมด
        if (targetFacility === 'game_room') {
            if (option === 'ps5' && !ps5Active) {
                return res.json(targetSlots.map(s => ({ ...s, isAvailable: false, remainingSpots: 0, isClosed: true })));
            }
            if (option === 'nintendo' && !nintendoActive) {
                return res.json(targetSlots.map(s => ({ ...s, isAvailable: false, remainingSpots: 0, isClosed: true })));
            }
        } else if (targetFacility === 'ice_bath') {
            if (!iceBathOpen) {
                return res.json(targetSlots.map(s => ({ ...s, isAvailable: false, remainingSpots: 0, isClosed: true })));
            }
            if (option === 'male' && maxMale === 0) {
                return res.json(targetSlots.map(s => ({ ...s, isAvailable: false, remainingSpots: 0, isClosed: true })));
            }
            if (option === 'female' && maxFemale === 0) {
                return res.json(targetSlots.map(s => ({ ...s, isAvailable: false, remainingSpots: 0, isClosed: true })));
            }
            if (option === 'both' && (maxMale === 0 || maxFemale === 0)) {
                return res.json(targetSlots.map(s => ({ ...s, isAvailable: false, remainingSpots: 0, isClosed: true })));
            }
        }

        const bookedSlots = await Booking.find({ 
            bookingDate: date,
            facility: targetFacility,
            status: { $ne: 'cancelled' }
        });

        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        
        let currentMinutes = 0;
        if (date === todayStr) {
            const bkkTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
            currentMinutes = bkkTime.getHours() * 60 + bkkTime.getMinutes();
        }

        const availableSlots = targetSlots.map(slot => {
            let isAvailable = true;
            let remainingSpots = 1;
            
            // Check capacity based on option
            if (targetFacility === 'game_room') {
                const isOptionBooked = bookedSlots.some(b => b.slotNumber === slot.slotNumber && b.facilityOption === option);
                isAvailable = !isOptionBooked;
                remainingSpots = isAvailable ? 1 : 0;
            } else if (targetFacility === 'ice_bath') {
                const maleBookedCount = bookedSlots.filter(b => b.slotNumber === slot.slotNumber && (b.facilityOption === 'male' || b.facilityOption === 'both')).length;
                const femaleBookedCount = bookedSlots.filter(b => b.slotNumber === slot.slotNumber && (b.facilityOption === 'female' || b.facilityOption === 'both')).length;
                
                if (option === 'male') {
                    remainingSpots = Math.max(0, maxMale - maleBookedCount);
                    isAvailable = maxMale > 0 && remainingSpots > 0;
                } else if (option === 'female') {
                    remainingSpots = Math.max(0, maxFemale - femaleBookedCount);
                    isAvailable = maxFemale > 0 && remainingSpots > 0;
                } else if (option === 'both') {
                    const remainingMale = Math.max(0, maxMale - maleBookedCount);
                    const remainingFemale = Math.max(0, maxFemale - femaleBookedCount);
                    remainingSpots = Math.min(remainingMale, remainingFemale);
                    isAvailable = maxMale > 0 && maxFemale > 0 && remainingSpots > 0;
                }
            }
            
            if (date === todayStr && isAvailable) {
                const [startH, startM] = slot.startTime.split(':').map(Number);
                const startMinutes = startH * 60 + startM;
                const advanceRequired = targetFacility === 'ice_bath' ? 60 : 0;
                
                if (currentMinutes > startMinutes - advanceRequired) {
                    isAvailable = false;
                    remainingSpots = 0;
                }
            }

            return {
                ...slot,
                isAvailable,
                remainingSpots,
                isClosed: false
            };
        });

        res.json(availableSlots);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getSlotSummary = async (req, res) => {
    try {
        const { date, facility } = req.query;
        if (!date) return res.status(400).json({ message: 'กรุณาระบุวันที่ (date)' });
        
        const settings = await SystemSetting.getSettingsForDate(date);
        const gameRoomOpen = settings.gameRoom.isOpen;
        const ps5Active = gameRoomOpen && settings.gameRoom.ps5;
        const nintendoActive = gameRoomOpen && settings.gameRoom.nintendo;

        const iceBathOpen = settings.iceBath.isOpen;
        const maxMale = iceBathOpen ? ((settings.iceBath.male_bath_1 ? 1 : 0) + (settings.iceBath.male_bath_2 ? 1 : 0)) : 0;
        const maxFemale = iceBathOpen ? ((settings.iceBath.female_bath_1 ? 1 : 0) + (settings.iceBath.female_bath_2 ? 1 : 0)) : 0;

        const targetFacility = facility === 'ice_bath' ? 'ice_bath' : 'game_room';
        const targetSlots = targetFacility === 'ice_bath' ? ICE_BATH_SLOTS : GAME_ROOM_SLOTS;

        const bookedSlots = await Booking.find({ 
            bookingDate: date,
            facility: targetFacility,
            status: { $ne: 'cancelled' }
        });

        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        
        let currentMinutes = 0;
        if (date === todayStr) {
            const bkkTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
            currentMinutes = bkkTime.getHours() * 60 + bkkTime.getMinutes();
        }

        const summary = {};

        if (targetFacility === 'game_room') {
            summary.ps5 = 0;
            summary.nintendo = 0;
            summary.ps5Closed = !ps5Active;
            summary.nintendoClosed = !nintendoActive;
            summary.gameRoomOpen = gameRoomOpen && (ps5Active || nintendoActive);
            
            targetSlots.forEach(slot => {
                let isTimeValid = true;
                if (date === todayStr) {
                    const [startH, startM] = slot.startTime.split(':').map(Number);
                    if (currentMinutes > (startH * 60 + startM)) isTimeValid = false;
                }

                if (isTimeValid) {
                    const isPS5Booked = bookedSlots.some(b => b.slotNumber === slot.slotNumber && b.facilityOption === 'ps5');
                    const isNinBooked = bookedSlots.some(b => b.slotNumber === slot.slotNumber && b.facilityOption === 'nintendo');
                    if (ps5Active && !isPS5Booked) summary.ps5++;
                    if (nintendoActive && !isNinBooked) summary.nintendo++;
                }
            });
        } else {
            summary.male = 0;
            summary.female = 0;
            summary.maleClosed = maxMale === 0;
            summary.femaleClosed = maxFemale === 0;
            summary.iceBathOpen = iceBathOpen && (maxMale > 0 || maxFemale > 0);
            summary.activeMaleBaths = maxMale;
            summary.activeFemaleBaths = maxFemale;
            
            targetSlots.forEach(slot => {
                let isTimeValid = true;
                if (date === todayStr) {
                    const [startH, startM] = slot.startTime.split(':').map(Number);
                    if (currentMinutes > (startH * 60 + startM - 60)) isTimeValid = false; // Ice bath 60 min advance
                }

                if (isTimeValid) {
                    const maleBookedCount = bookedSlots.filter(b => b.slotNumber === slot.slotNumber && (b.facilityOption === 'male' || b.facilityOption === 'both')).length;
                    const femaleBookedCount = bookedSlots.filter(b => b.slotNumber === slot.slotNumber && (b.facilityOption === 'female' || b.facilityOption === 'both')).length;
                    
                    if (maxMale > 0 && maleBookedCount < maxMale) summary.male++;
                    if (maxFemale > 0 && femaleBookedCount < maxFemale) summary.female++;
                }
            });
        }

        res.json(summary);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.createBooking = async (req, res) => {
    try {
        const { displayName, hotelRoomNumber, bookingDate, slotNumber, facility, facilityOption } = req.body;
        const targetFacility = facility === 'ice_bath' ? 'ice_bath' : 'game_room';
        const targetSlots = targetFacility === 'ice_bath' ? ICE_BATH_SLOTS : GAME_ROOM_SLOTS;

        if (!displayName || !hotelRoomNumber || !bookingDate || !slotNumber || !facilityOption) {
            return res.status(400).json({ message: 'กรอกข้อมูลไม่ครบถ้วน (ต้องระบุตัวเลือก)' });
        }

        // ตรวจสอบสถานะเปิด-ปิด บริการและเครื่องเล่น
        const settings = await SystemSetting.getSettingsForDate(bookingDate);
        const gameRoomOpen = settings.gameRoom.isOpen;
        const ps5Active = gameRoomOpen && settings.gameRoom.ps5;
        const nintendoActive = gameRoomOpen && settings.gameRoom.nintendo;

        const iceBathOpen = settings.iceBath.isOpen;
        const maxMale = iceBathOpen ? ((settings.iceBath.male_bath_1 ? 1 : 0) + (settings.iceBath.male_bath_2 ? 1 : 0)) : 0;
        const maxFemale = iceBathOpen ? ((settings.iceBath.female_bath_1 ? 1 : 0) + (settings.iceBath.female_bath_2 ? 1 : 0)) : 0;

        if (targetFacility === 'game_room') {
            if (facilityOption === 'ps5' && !ps5Active) {
                return res.status(400).json({ message: 'เครื่องเล่น PlayStation 5 ปิดปรับปรุงอยู่ในขณะนี้' });
            }
            if (facilityOption === 'nintendo' && !nintendoActive) {
                return res.status(400).json({ message: 'เครื่องเล่น Nintendo Switch ปิดปรับปรุงอยู่ในขณะนี้' });
            }
        } else if (targetFacility === 'ice_bath') {
            if (!iceBathOpen) {
                return res.status(400).json({ message: 'บริการบ่อน้ำแข็งปิดปรับปรุงอยู่ในขณะนี้' });
            }
            if (facilityOption === 'male' && maxMale === 0) {
                return res.status(400).json({ message: 'บ่อแช่ผู้ชายปิดปรับปรุงอยู่ในขณะนี้' });
            }
            if (facilityOption === 'female' && maxFemale === 0) {
                return res.status(400).json({ message: 'บ่อแช่ผู้หญิงปิดปรับปรุงอยู่ในขณะนี้' });
            }
            if (facilityOption === 'both' && (maxMale === 0 || maxFemale === 0)) {
                return res.status(400).json({ message: 'บ่อแช่สำหรับคู่ไม่พร้อมให้บริการ (มีบางบ่อปิดปรับปรุง)' });
            }
        }

        // Check quota limits
        const existingRoomBookings = await Booking.find({
            hotelRoomNumber,
            bookingDate,
            facility: targetFacility,
            status: { $ne: 'cancelled' }
        });

        if (targetFacility === 'game_room') {
            if (existingRoomBookings.length > 0) {
                return res.status(400).json({ message: 'ห้องพักนี้ใช้สิทธิ์จอง Game Room สำหรับวันนี้ไปแล้ว' });
            }
        } else if (targetFacility === 'ice_bath') {
            const hasMale = existingRoomBookings.some(b => b.facilityOption === 'male' || b.facilityOption === 'both');
            const hasFemale = existingRoomBookings.some(b => b.facilityOption === 'female' || b.facilityOption === 'both');
            
            if (facilityOption === 'male' && hasMale) {
                return res.status(400).json({ message: 'ห้องพักนี้ใช้สิทธิ์จองบ่อน้ำแข็ง(ชาย) สำหรับวันนี้ไปแล้ว' });
            }
            if (facilityOption === 'female' && hasFemale) {
                return res.status(400).json({ message: 'ห้องพักนี้ใช้สิทธิ์จองบ่อน้ำแข็ง(หญิง) สำหรับวันนี้ไปแล้ว' });
            }
            if (facilityOption === 'both' && (hasMale || hasFemale)) {
                return res.status(400).json({ message: 'ห้องพักนี้ใช้สิทธิ์จองบ่อน้ำแข็งไปแล้วบางส่วน ไม่สามารถจองแบบคู่ได้อีก' });
            }
        }

        // Check if the specific slot is already booked for the chosen option
        const existingSlotBookings = await Booking.find({
            bookingDate,
            slotNumber,
            facility: targetFacility,
            status: { $ne: 'cancelled' }
        });

        if (targetFacility === 'game_room') {
            const isOptionBooked = existingSlotBookings.some(b => b.facilityOption === facilityOption);
            if (isOptionBooked) return res.status(400).json({ message: 'รอบเวลานี้ถูกจองเครื่องเล่นนี้ไปแล้ว' });
        } else if (targetFacility === 'ice_bath') {
            const maleBookedCount = existingSlotBookings.filter(b => b.facilityOption === 'male' || b.facilityOption === 'both').length;
            const femaleBookedCount = existingSlotBookings.filter(b => b.facilityOption === 'female' || b.facilityOption === 'both').length;
            
            if (facilityOption === 'male' && maleBookedCount >= maxMale) {
                return res.status(400).json({ message: 'รอบเวลานี้บ่อชายเต็มแล้ว' });
            }
            if (facilityOption === 'female' && femaleBookedCount >= maxFemale) {
                return res.status(400).json({ message: 'รอบเวลานี้บ่อหญิงเต็มแล้ว' });
            }
            if (facilityOption === 'both' && (maleBookedCount >= maxMale || femaleBookedCount >= maxFemale)) {
                return res.status(400).json({ message: 'รอบเวลานี้ไม่ว่างพอสำหรับ 2 ท่าน' });
            }
        }

        // Find start time and end time for this slot
        const slotData = targetSlots.find(s => s.slotNumber === parseInt(slotNumber));
        if (!slotData) return res.status(400).json({ message: 'รอบเวลาไม่ถูกต้อง' });

        const bookingRef = (targetFacility === 'ice_bath' ? 'IB-' : 'BC-') + Date.now().toString().slice(-6);

        let user = await User.findOne({ hotelRoomNumber, displayName });
        if (!user) {
            user = await User.create({ displayName, hotelRoomNumber });
        }

        const newBooking = await Booking.create({
            bookingRef,
            userId: user._id,
            hotelRoomNumber,
            bookingDate,
            slotNumber,
            facility: targetFacility,
            facilityOption,
            startTime: slotData.startTime,
            endTime: slotData.endTime,
            status: 'booked'
        });

        res.status(201).json({ message: 'จองสำเร็จ', booking: newBooking });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMyBooking = async (req, res) => {
    try {
        const { hotelRoomNumber, date } = req.query;
        if (!hotelRoomNumber || !date) return res.status(400).json({ message: 'กรุณาระบุหมายเลขห้องและวันที่' });

        const bookings = await Booking.find({
            hotelRoomNumber,
            bookingDate: date,
            status: { $ne: 'cancelled' }
        }).populate('userId', 'displayName hotelRoomNumber');

        if (!bookings || bookings.length === 0) return res.status(404).json({ message: 'ไม่พบการจองของคุณในวันนี้' });

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ดึงสถานะจักรยาน 5 คัน (สำหรับหน้าลูกค้า)
exports.getBicycleStatus = async (req, res) => {
    try {
        const { date, hotelRoomNumber } = req.query;
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        const targetDate = date || todayStr;

        const settings = await SystemSetting.getSettingsForDate(targetDate);
        const bikeSettings = settings.bicycle || {
            isOpen: true, bike_1: true, bike_2: true, bike_3: true, bike_4: true, bike_5: true
        };

        const activeBookings = await Booking.find({
            bookingDate: targetDate,
            facility: 'bicycle',
            status: { $in: ['booked', 'checked_in'] }
        });

        let roomActiveCount = 0;
        if (hotelRoomNumber) {
            roomActiveCount = activeBookings.filter(b => b.hotelRoomNumber === hotelRoomNumber).length;
        }

        const bikes = [];
        for (let i = 1; i <= 5; i++) {
            const key = `bike_${i}`;
            const isEnabled = bikeSettings.isOpen && bikeSettings[key];
            const booking = activeBookings.find(b => b.bikeNumber === i);

            let status = 'available';
            if (!isEnabled) {
                status = 'maintenance';
            } else if (booking) {
                status = booking.status === 'checked_in' ? 'in_use' : 'booked';
            }

            bikes.push({
                bikeNumber: i,
                code: key,
                name: `จักรยาน เบอร์ ${i}`,
                isAvailable: status === 'available',
                status
            });
        }

        const availableCount = bikes.filter(b => b.isAvailable).length;

        res.json({
            targetDate,
            isOpen: bikeSettings.isOpen,
            availableCount,
            roomActiveCount,
            maxAllowedPerRoom: 2,
            canRoomBook: roomActiveCount < 2 && availableCount > 0 && bikeSettings.isOpen,
            bikes
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// จองจักรยาน (เลือก 1 หรือ 2 คัน)
exports.bookBicycles = async (req, res) => {
    try {
        const { displayName, hotelRoomNumber, bookingDate, selectedBikes } = req.body;

        if (!displayName || !hotelRoomNumber || !bookingDate || !Array.isArray(selectedBikes) || selectedBikes.length === 0) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วนและเลือกจักรยานอย่างน้อย 1 คัน' });
        }

        if (selectedBikes.length > 2) {
            return res.status(400).json({ message: 'สามารถเลือกจองจักรยานได้สูงสุด 2 คันต่อครั้ง' });
        }

        // ตรวจสอบสถานะเปิด-ปิด บริการจักรยาน
        const settings = await SystemSetting.getSettingsForDate(bookingDate);
        const bikeSettings = settings.bicycle || {
            isOpen: true, bike_1: true, bike_2: true, bike_3: true, bike_4: true, bike_5: true
        };

        if (!bikeSettings.isOpen) {
            return res.status(400).json({ message: 'บริการจักรยานปิดปรับปรุงในวันที่เลือก' });
        }

        // ตรวจสอบโควตาของห้องพัก (สูงสุด 2 คันที่กำลังจองหรือใช้งานอยู่)
        const activeRoomBookings = await Booking.find({
            hotelRoomNumber,
            bookingDate,
            facility: 'bicycle',
            status: { $in: ['booked', 'checked_in'] }
        });

        if (activeRoomBookings.length + selectedBikes.length > 2) {
            return res.status(400).json({ 
                message: `ห้องพักนี้ใช้สิทธิ์จอง/ยืมจักรยานไปแล้ว ${activeRoomBookings.length} คัน (1 ห้องจองได้สูงสุด 2 คัน)` 
            });
        }

        // ตรวจสอบความพร้อมของจักรยานแต่ละคันที่เลือก
        const activeBikeBookings = await Booking.find({
            bookingDate,
            facility: 'bicycle',
            bikeNumber: { $in: selectedBikes },
            status: { $in: ['booked', 'checked_in'] }
        });

        if (activeBikeBookings.length > 0) {
            const bookedNumbers = activeBikeBookings.map(b => b.bikeNumber).join(', ');
            return res.status(400).json({ message: `จักรยานเบอร์ ${bookedNumbers} มีผู้จองหรือกำลังใช้งานอยู่แล้ว` });
        }

        for (const num of selectedBikes) {
            if (!bikeSettings[`bike_${num}`]) {
                return res.status(400).json({ message: `จักรยานเบอร์ ${num} ปิดปรับปรุงอยู่ในขณะนี้` });
            }
        }

        // สร้างหรือค้นหา User
        let user = await User.findOne({ hotelRoomNumber, displayName });
        if (!user) {
            user = await User.create({ displayName, hotelRoomNumber });
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });

        const createdBookings = [];
        const groupRef = 'BK-' + Date.now().toString().slice(-6);

        for (let i = 0; i < selectedBikes.length; i++) {
            const bikeNum = selectedBikes[i];
            const bookingRef = selectedBikes.length === 1 ? groupRef : `${groupRef}-${i + 1}`;
            
            const booking = await Booking.create({
                bookingRef,
                userId: user._id,
                hotelRoomNumber,
                bookingDate,
                slotNumber: 0,
                facility: 'bicycle',
                facilityOption: `bike_${bikeNum}`,
                bikeNumber: bikeNum,
                startTime: timeStr,
                endTime: 'ไม่มีเวลากำหนด',
                status: 'booked',
                agreedToTerms: true
            });
            createdBookings.push(booking);
        }

        res.status(201).json({
            message: `จองจักรยานสำเร็จ (${selectedBikes.map(n => 'เบอร์ ' + n).join(', ')})`,
            groupRef,
            bookings: createdBookings
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
