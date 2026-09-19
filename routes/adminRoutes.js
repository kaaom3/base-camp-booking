const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/schedule', adminController.getSchedule);
router.post('/bookings/check-in', adminController.checkIn);
router.put('/bookings/:id/cancel', adminController.cancelBooking);

module.exports = router;
