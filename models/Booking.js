const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingRef: { type: String, required: true, unique: true }, // เช่น BC-1001
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hotelRoomNumber: { type: String, required: true }, // ดึงมาจาก User เพื่อให้อ้างอิงและค้นหาง่าย
  
  bookingDate: { type: String, required: true }, // เก็บเป็น YYYY-MM-DD
  slotNumber: { type: Number, required: true }, // รอบที่ 1-9
  startTime: { type: String, required: true }, // เช่น "09:00"
  endTime: { type: String, required: true }, // เช่น "10:00"

  status: { 
    type: String, 
    enum: ['booked', 'checked_in', 'completed', 'cancelled'], 
    default: 'booked' 
  },
  
  facility: { 
    type: String, 
    enum: ['game_room', 'ice_bath'], 
    default: 'game_room' 
  },
  
  agreedToTerms: { type: Boolean, default: true },
  
  createdAt: { type: Date, default: Date.now }
});

// สร้าง Index สำหรับตรวจสอบการจองซ้ำของห้องพักในแต่ละวัน (1 ห้องพัก/วัน/1 สิทธิ์)
bookingSchema.index({ hotelRoomNumber: 1, bookingDate: 1, status: 1 });
bookingSchema.index({ bookingDate: 1, slotNumber: 1 }); // สำหรับค้นหารอบที่ว่าง

module.exports = mongoose.model('Booking', bookingSchema);
