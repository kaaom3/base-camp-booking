const cron = require('node-cron');
const Booking = require('../models/Booking');

// แปลงเวลา "HH:mm" เป็นนาที
const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};

// สคริปต์รันทุกๆ 1 นาทีเพื่อตรวจสอบคิวหมดเวลา และยกเลิกจักรยานที่มารับสายเกิน 30 นาที
const startCronJobs = () => {
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            // เวลาปัจจุบันในรูปแบบ "HH:mm" (เวลาไทย)
            const formatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Bangkok',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            const currentTimeStr = formatter.format(now);
            const currentMins = timeToMinutes(currentTimeStr);
            const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD

            // 1. ตรวจสอบคิว Game Room / Ice Bath ที่หมดเวลาแล้ว -> เปลี่ยนเป็น completed
            const expiredStandardBookings = await Booking.find({
                bookingDate: todayStr,
                facility: { $in: ['game_room', 'ice_bath'] },
                endTime: { $lt: currentTimeStr },
                status: { $in: ['booked', 'checked_in'] }
            });

            for (const booking of expiredStandardBookings) {
                booking.status = 'completed';
                await booking.save();
                console.log(`[Cron] Auto-completed booking: ${booking.bookingRef} (${booking.facility})`);
            }

            // 2. ตรวจสอบจักรยานที่จองไว้แต่ไม่มารับภายใน 30 นาที (Auto-Cancel Grace Period)
            // สำหรับคิวจักรยานที่ status = 'booked' และเกิน 30 นาทีจากเวลาเริ่มจอง (startTime)
            const uncollectedBikes = await Booking.find({
                bookingDate: todayStr,
                facility: 'bicycle',
                status: 'booked'
            });

            for (const bikeBooking of uncollectedBikes) {
                const startMins = timeToMinutes(bikeBooking.startTime);
                // ถ้าเลยเวลาเริ่มจองมาแล้วเกิน 30 นาที (Grace period 30 mins)
                if (currentMins > startMins + 30) {
                    bikeBooking.status = 'cancelled';
                    await bikeBooking.save();
                    console.log(`[Cron] Auto-cancelled uncollected bicycle: ${bikeBooking.bookingRef} (Bike #${bikeBooking.bikeNumber}, start: ${bikeBooking.startTime}, current: ${currentTimeStr})`);
                }
            }

        } catch (error) {
            console.error('Cron job error:', error);
        }
    });
};

module.exports = startCronJobs;
