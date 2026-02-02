const express = require('express');
const authMiddleware = require('../middleware/auth');
const couponController = require('../controllers/coupon.controller');

const router = express.Router();

router.get('/validate', couponController.validateCoupon);
router.get('/', authMiddleware, couponController.listCoupons);
router.post('/', authMiddleware, couponController.createCoupon);

module.exports = router;
