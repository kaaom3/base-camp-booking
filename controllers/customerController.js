const Booking = require('../models/Booking');
const User = require('../models/User');

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

exports.getAvailableSlots = async (req, res) => {
    try {
        const { date, facility, option } = req.query;
        if (!date) return res.status(400).json({ message: 'กรุณาระบุวันที่ (date)' });
        if (!option) return res.status(400).json({ message: 'กรุณาระบุตัวเลือก (option)' });
        
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

        const availableSlots = targetSlots.map(slot => {
            let isAvailable = true;
            
            // Check capacity based on option
            if (targetFacility === 'game_room') {
                const isOptionBooked = bookedSlots.some(b => b.slotNumber === slot.slotNumber && b.facilityOption === option);
                isAvailable = !isOptionBooked;
            } else if (targetFacility === 'ice_bath') {
                const isMaleBooked = bookedSlots.some(b => b.slotNumber === slot.slotNumber && (b.facilityOption === 'male' || b.facilityOption === 'both'));
                const isFemaleBooked = bookedSlots.some(b => b.slotNumber === slot.slotNumber && (b.facilityOption === 'female' || b.facilityOption === 'both'));
                
                if (option === 'male') {
                    isAvailable = !isMaleBooked;
                } else if (option === 'female') {
                    isAvailable = !isFemaleBooked;
                } else if (option === 'both') {
                    isAvailable = !isMaleBooked && !isFemaleBooked;
                }
            }
            
            if (date === todayStr && isAvailable) {
                const [startH, startM] = slot.startTime.split(':').map(Number);
                const startMinutes = startH * 60 + startM;
                const advanceRequired = targetFacility === 'ice_bath' ? 60 : 0;
                
                if (currentMinutes > startMinutes - advanceRequired) {
                    isAvailable = false;
                }
            }

            return {
                ...slot,
                isAvailable
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
            
            targetSlots.forEach(slot => {
                let isTimeValid = true;
                if (date === todayStr) {
                    const [startH, startM] = slot.startTime.split(':').map(Number);
                    if (currentMinutes > (startH * 60 + startM)) isTimeValid = false;
                }

                if (isTimeValid) {
                    const isPS5Booked = bookedSlots.some(b => b.slotNumber === slot.slotNumber && b.facilityOption === 'ps5');
                    const isNinBooked = bookedSlots.some(b => b.slotNumber === slot.slotNumber && b.facilityOption === 'nintendo');
                    if (!isPS5Booked) summary.ps5++;
                    if (!isNinBooked) summary.nintendo++;
                }
            });
        } else {
            summary.male = 0;
            summary.female = 0;
            
            targetSlots.forEach(slot => {
                let isTimeValid = true;
                if (date === todayStr) {
                    const [startH, startM] = slot.startTime.split(':').map(Number);
                    if (currentMinutes > (startH * 60 + startM - 60)) isTimeValid = false; // Ice bath 60 min advance
                }

                if (isTimeValid) {
                    const isMaleBooked = bookedSlots.some(b => b.slotNumber === slot.slotNumber && (b.facilityOption === 'male' || b.facilityOption === 'both'));
                    const isFemaleBooked = bookedSlots.some(b => b.slotNumber === slot.slotNumber && (b.facilityOption === 'female' || b.facilityOption === 'both'));
                    
                    if (!isMaleBooked) summary.male++;
                    if (!isFemaleBooked) summary.female++;
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
            const isMaleBooked = existingSlotBookings.some(b => b.facilityOption === 'male' || b.facilityOption === 'both');
            const isFemaleBooked = existingSlotBookings.some(b => b.facilityOption === 'female' || b.facilityOption === 'both');
            
            if (facilityOption === 'male' && isMaleBooked) return res.status(400).json({ message: 'รอบเวลานี้บ่อชายเต็มแล้ว' });
            if (facilityOption === 'female' && isFemaleBooked) return res.status(400).json({ message: 'รอบเวลานี้บ่อหญิงเต็มแล้ว' });
            if (facilityOption === 'both' && (isMaleBooked || isFemaleBooked)) return res.status(400).json({ message: 'รอบเวลานี้ไม่ว่างพอสำหรับ 2 ท่าน' });
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
