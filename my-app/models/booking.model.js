const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    roomName: { type: String, default: ''},
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomType: { type: String, enum: ['twin', 'premium'], default: 'twin' },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, required: true },
    couponCode: { type: String, default: '' },
    discountAmount: { type: Number, default: 0 },
    originalTotal: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true }, 
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
    paymentTid: { type: String, default: '' },
    paymentApprovedAt : { type: Date, default: null},
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
