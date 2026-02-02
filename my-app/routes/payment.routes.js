const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middleware/auth');

router.post('/ready', authMiddleware, paymentController.ready);
router.get('/approve', paymentController.approve);
router.get('/cancel', paymentController.cancel);
router.get('/fail', paymentController.fail);

module.exports = router;
