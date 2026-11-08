const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingRef: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hotelRoomNumber: {
    type: String,
    required: true
  },
  bookingDate: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  slotNumber: {
    type: Number,
    required: false,
    default: 0
  },
  startTime: {
    type: String, // Format: "10:00"
    required: true
  },
  endTime: {
    type: String, // Format: "11:00" หรือ "ไม่มีเวลากำหนด"
    required: true
  },
  checkOutTime: {
    type: String, // บันทึกเวลาที่ลูกค้ามารับรถจักรยานจริง
    default: ''
  },
  returnTime: {
    type: String, // บันทึกเวลาที่ลูกค้านำจักรยานมาส่งคืนจริง
    default: ''
  },
  returnDeadline: {
    type: String, // เวลาที่ต้องคืนรถ (กรณีมีคิวจองถัดไป เช่น "15:30")
    default: ''
  },
  status: {
    type: String,
    enum: ['booked', 'checked_in', 'completed', 'cancelled'],
    default: 'booked'
  },
  facility: {
    type: String,
    enum: ['game_room', 'ice_bath', 'bicycle'],
    default: 'game_room'
  },
  facilityOption: {
    type: String,
    enum: ['ps5', 'nintendo', 'male', 'female', 'both', 'bike_1', 'bike_2', 'bike_3', 'bike_4', 'bike_5', ''],
    default: ''
  },
  bikeNumber: {
    type: Number, // เบอร์จักรยาน 1 - 5
    default: null
  },
  bikeType: {
    type: String,
    enum: ['adult', 'kids', ''],
    default: ''
  },
  agreedToTerms: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
bookingSchema.index({ bookingDate: 1, facility: 1, slotNumber: 1 });
bookingSchema.index({ bookingDate: 1, facility: 1, facilityOption: 1 });
bookingSchema.index({ hotelRoomNumber: 1, bookingDate: 1, facility: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
