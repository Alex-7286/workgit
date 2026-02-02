const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    region: { type: String, default: '' },
    pricePerNight: { type: Number, required: true },
    maxGuests: { type: Number, required: true },
    images: { type: [String], default: [] },
    description: { type: String, default: '' },
    summary: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    amenities: {type: [String], default: []},
    rating: { type: Number, min: 0, max: 5, default: 0 },
    ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, default: 0 },
    available: { type: Boolean, default: true}
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
