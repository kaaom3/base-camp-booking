const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/facility-status', customerController.getFacilityStatus);
router.get('/slots/available', customerController.getAvailableSlots);
router.get('/slots/summary', customerController.getSlotSummary);
router.post('/bookings', customerController.createBooking);
router.get('/bookings/my-booking', customerController.getMyBooking);

// Bicycles
router.get('/bicycles/status', customerController.getBicycleStatus);
router.post('/bicycles/book', customerController.bookBicycles);

module.exports = router;
