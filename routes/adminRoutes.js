const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/schedule', adminController.getSchedule);
router.post('/bookings/check-in', adminController.checkIn);
router.put('/bookings/:id/cancel', adminController.cancelBooking);
router.get('/facility-status', adminController.getFacilityStatus);
router.put('/facility-status', adminController.updateFacilityStatus);
router.delete('/facility-status/reset', adminController.resetFacilityStatus);

// Bicycle Fleet Controls
router.get('/bicycles/fleet', adminController.getBicycleFleet);
router.post('/bicycles/handover', adminController.handoverBicycle);
router.post('/bicycles/return', adminController.returnBicycle);

// Comprehensive Reports & Statistics
router.get('/reports', adminController.getReports);

module.exports = router;
