const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const authMiddleware = require('../middleware/auth');

router.get('/room/:roomId', bookingController.getRoomAvailability);
router.get('/availability', bookingController.getAvailabilityByDate);
router.get('/', authMiddleware, bookingController.getBookings);
router.post('/', authMiddleware, bookingController.createBooking);
router.patch('/:id/cancel', authMiddleware, bookingController.cancelBooking);

module.exports = router;
