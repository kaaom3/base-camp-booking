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
    { slotNumber: 3, startTime: "12:00", endTime: "13:00" },
    { slotNumber: 4, startTime: "13:30", endTime: "14:30" },
    { slotNumber: 5, startTime: "15:00", endTime: "16:00" },
    { slotNumber: 6, startTime: "16:30", endTime: "17:30" },
    { slotNumber: 7, startTime: "18:00", endTime: "19:00" },
    { slotNumber: 8, startTime: "19:30", endTime: "20:30" },
    { slotNumber: 9, startTime: "21:00", endTime: "22:00" }
];

exports.getAvailableSlots = async (req, res) => {
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

        const bookedSlotNumbers = bookedSlots.map(b => b.slotNumber);

        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        
        let currentMinutes = 0;
        if (date === todayStr) {
            const bkkTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
            currentMinutes = bkkTime.getHours() * 60 + bkkTime.getMinutes();
        }

        const availableSlots = targetSlots.map(slot => {
            let isAvailable = !bookedSlotNumbers.includes(slot.slotNumber);
            
            if (date === todayStr && isAvailable) {
                const [startH, startM] = slot.startTime.split(':').map(Number);
                const startMinutes = startH * 60 + startM;
                if (currentMinutes >= startMinutes) {
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
        res.status(500).json({ message: error.message });
    }
};

exports.createBooking = async (req, res) => {
    try {
        const { displayName, hotelRoomNumber, bookingDate, slotNumber, facility } = req.body;
        const targetFacility = facility === 'ice_bath' ? 'ice_bath' : 'game_room';
        const targetSlots = targetFacility === 'ice_bath' ? ICE_BATH_SLOTS : GAME_ROOM_SLOTS;

        if (!displayName || !hotelRoomNumber || !bookingDate || !slotNumber) {
            return res.status(400).json({ message: 'กรอกข้อมูลไม่ครบถ้วน' });
        }

        // Check if room already booked this specific facility today
        const existingRoomBooking = await Booking.findOne({
            hotelRoomNumber,
            bookingDate,
            facility: targetFacility,
            status: { $in: ['booked', 'checked_in', 'completed'] }
        });

        if (existingRoomBooking) {
            return res.status(400).json({ message: `หมายเลขห้องพักของคุณใช้สิทธิ์จอง ${targetFacility === 'ice_bath' ? 'Ice Bath' : 'Game Room'} ของวันนี้ไปแล้ว` });
        }

        // Check if slot is taken
        const existingSlotBooking = await Booking.findOne({
            bookingDate,
            slotNumber,
            facility: targetFacility,
            status: { $ne: 'cancelled' }
        });

        if (existingSlotBooking) {
            return res.status(400).json({ message: 'รอบเวลานี้ถูกจองไปแล้ว กรุณาเลือกรอบอื่น' });
        }

        let user = await User.findOne({ hotelRoomNumber, displayName });
        if (!user) {
            user = await User.create({ displayName, hotelRoomNumber });
        }

        const slotData = targetSlots.find(s => s.slotNumber === parseInt(slotNumber));
        const bookingRef = (targetFacility === 'ice_bath' ? 'IB-' : 'BC-') + Date.now().toString().slice(-6);

        const newBooking = await Booking.create({
            bookingRef,
            userId: user._id,
            hotelRoomNumber,
            bookingDate,
            slotNumber,
            facility: targetFacility,
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
