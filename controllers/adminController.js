const Booking = require('../models/Booking');

// ดูตารางการจองของวันนี้
exports.getSchedule = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ message: 'กรุณาระบุวันที่ (date)' });

        const bookings = await Booking.find({ bookingDate: date })
            .populate('userId', 'displayName hotelRoomNumber')
            .sort({ slotNumber: 1 });

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
            return res.status(400).json({ message: 'การจองนี้เล่นเสร็จสิ้นไปแล้ว' });
        }
        if (booking.status === 'checked_in') {
            return res.status(400).json({ message: 'ลูกค้าทำการ Check-in ไปแล้ว' });
        }

        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

        // เช็คว่าการจองเป็นของวันนี้หรือไม่
        if (booking.bookingDate !== todayStr) {
            return res.status(400).json({ message: `ยังไม่ถึงวันที่จอง (คิวนี้ของวันที่ ${booking.bookingDate})` });
        }

        // เช็คเวลาว่ามาก่อนเวลาเกิน 15 นาที หรือไม่
        const bkkTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
        const currentMinutes = bkkTime.getHours() * 60 + bkkTime.getMinutes();
        const [startH, startM] = booking.startTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;

        if (currentMinutes < startMinutes - 15) {
            return res.status(400).json({ message: `ยังไม่ถึงรอบเวลา (รอบ ${booking.startTime} สามารถ Check-in ได้ก่อนเวลา 15 นาที)` });
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
