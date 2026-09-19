const cron = require('node-cron');
const Booking = require('../models/Booking');

// สคริปต์รันทุกๆ 5 นาทีเพื่อตรวจสอบคิวที่หมดเวลาแล้ว
const startCronJobs = () => {
    cron.schedule('*/5 * * * *', async () => {
        try {
            console.log('Running cron job: Check completed bookings');
            
            const now = new Date();
            // สร้างเวลาปัจจุบันในรูปแบบ "HH:mm" (เวลาไทย)
            const formatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Bangkok',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            const currentTimeStr = formatter.format(now);
            
            const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD

            // หาคิวของวันนี้ ที่เวลาสิ้นสุด (endTime) น้อยกว่าเวลาปัจจุบัน
            // และสถานะยังค้างเป็น 'booked' หรือ 'checked_in'
            const expiredBookings = await Booking.find({
                bookingDate: todayStr,
                endTime: { $lt: currentTimeStr },
                status: { $in: ['booked', 'checked_in'] }
            });

            for (const booking of expiredBookings) {
                booking.status = 'completed';
                await booking.save();
                console.log(`Auto-completed booking: ${booking.bookingRef}`);
            }

        } catch (error) {
            console.error('Cron job error:', error);
        }
    });
};

module.exports = startCronJobs;
