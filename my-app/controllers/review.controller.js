const Review = require('../models/review.model');
const Room = require('../models/room.model');
const Booking = require('../models/booking.model');
const Activity = require('../models/activity.model');

const logActivity = async (payload) => {
  try {
    await Activity.create(payload);
  } catch (error) {
    // ignore activity logging failures
  }
};


const updateRoomStats = async (roomId) => {
  const agg = await Review.aggregate([
    { $match: { room: roomId } },
    {
      $group: {
        _id: '$room',
        count: { $sum: 1 },
        avg: { $avg: '$rating' }
      }
    }
  ]);

  if (!agg.length) {
    await Room.findByIdAndUpdate(roomId, { ratingAverage: 0, reviewCount: 0 });
    return;
  }

  const { count, avg } = agg[0];
  await Room.findByIdAndUpdate(roomId, {
    ratingAverage: Number(avg.toFixed(1)),
    reviewCount: count
  });
};

exports.getReviews = async (req, res) => {
  const { roomId } = req.query;
  const query = roomId ? { room: roomId } : {};
  const reviews = await Review.find(query)
    .populate('user', 'name _id')
    .sort({ createdAt: -1 });
  res.json(reviews);
};

exports.createReview = async (req, res) => {
  try {
    const { roomId, rating, comment } = req.body;

    if (!roomId || !rating) {
      return res.status(400).json({ message: 'Missing review data' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const eligibleBooking = await Booking.findOne({
      room: roomId,
      user: req.user.id,
      status: 'confirmed'
    });

    if (!eligibleBooking) {
      return res.status(403).json({ message: 'Review allowed after completed stay' });
    }

    const images = req.files?.length
      ? req.files.map((file) => `/uploads/${file.filename}`)
      : [];

    const review = await Review.create({
      room: roomId,
      user: req.user.id,
      rating: Number(rating),
      comment: comment ? String(comment).trim() : '',
      images
    });

    await updateRoomStats(room._id);

    await logActivity({
      user: req.user.id,
      type: 'review_created',
      room: room._id,
      message: ''
    });
    const populated = await review.populate('user', 'name _id');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



