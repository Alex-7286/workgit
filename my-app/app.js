const express = require('express');
const path = require('path');
const connectDB = require('./config/db');
const indexRouter = require('./routes/index');
const practiceRouter = require('./routes/practice');
const roomRoutes = require('./routes/room.routes');
const authRoutes = require('./routes/auth.routes');
const bookingRoutes = require('./routes/booking.routes');
const paymentRoutes = require('./routes/payment.routes');
const reviewRoutes = require('./routes/review.routes');
const activityRoutes = require('./routes/activity.routes');
const couponRoutes = require('./routes/coupon.routes');

const app = express();

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/express', practiceRouter);
app.use('/api/rooms', roomRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/coupons', couponRoutes);

module.exports = app;
