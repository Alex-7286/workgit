const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    amount: { type: Number, required: true, min: 0 },
    rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room' }],
    active: { type: Boolean, default: true },
    expiresAt: { type: Date },
    maxUses: { type: Number, min: 0 },
    usedCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', CouponSchema);
