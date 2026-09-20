const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/slots/available', customerController.getAvailableSlots);
router.get('/slots/summary', customerController.getSlotSummary);
router.post('/bookings', customerController.createBooking);
router.get('/bookings/my-booking', customerController.getMyBooking);

module.exports = router;
