const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  displayName: { type: String, required: true },
  hotelRoomNumber: { type: String, required: true }, // หมายเลขห้องพักของลูกค้า
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
