const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['booking_created', 'booking_cancelled', 'review_created'],
      required: true
    },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    message: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', activitySchema);
