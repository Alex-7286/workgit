const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
    images: { type: [String], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
