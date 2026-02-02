const Booking = require('../models/booking.model');
const Room = require('../models/room.model');
const Activity = require('../models/activity.model');
const Coupon = require('../models/coupon.model');
const { applyCouponToTotal, normalizeCode } = require('./coupon.controller');

const logActivity = async (payload) => {
  try {
    await Activity.create(payload);
  } catch (error) {
    // ignore activity logging failures
  }
};

const computeTotal = (room, checkIn, checkOut, guests, roomType) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const basePrice = room.pricePerNight;
  const typeMultiplier = roomType === 'premium' ? 1.3 : 1;
  let total = 0;
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay(); // 0=Sun, 6=Sat
    const weekendMultiplier = day === 0 || day === 6 ? 1.5 : 1;
    total += basePrice * typeMultiplier * weekendMultiplier;
  }
  return Math.round(total) * guests;
};

exports.getBookings = async (req, res) => {
  const query = req.user.role === 'admin' ? {} : { user: req.user.id };
  const bookings = await Booking.find(query)
    .populate('room')
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
  res.json(bookings);
};

exports.createBooking = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, guests, roomType, couponCode } = req.body;

    if (!roomId || !checkIn || !checkOut || !guests || !roomType) {
      return res.status(400).json({ message: 'Missing booking data' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const guestCount = Number(guests);
    if (Number.isNaN(guestCount) || guestCount < 1) {
      return res.status(400).json({ message: 'Invalid guests' });
    }

    if (room.maxGuests && guestCount > Number(room.maxGuests)) {
      return res.status(400).json({ message: 'Guest count exceeds room limit' });
    }
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
      return res.status(400).json({ message: 'Invalid dates' });
    }
    if (checkInDate >= checkOutDate) {
      return res.status(400).json({ message: 'Check-out must be after check-in' });
    }

    const overlap = await Booking.findOne({
      room: room._id,
      status: { $in: ['confirmed', 'pending'] },
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
      $or: [
        { roomType },
        { roomType: { $exists: false } },
        { roomType: null }
      ]
    });

    if (overlap) {
      return res.status(409).json({ message: 'Selected dates are not available' });
    }

    const originalTotal = computeTotal(room, checkIn, checkOut, guestCount, roomType);
    let totalPrice = originalTotal;
    let discountAmount = 0;
    let appliedCouponCode = '';
    let couponDoc = null;

    if (couponCode) {
      appliedCouponCode = normalizeCode(couponCode);
      couponDoc = await Coupon.findOne({ code: appliedCouponCode });
      if (couponDoc?.rooms?.length) {
        const allowed = couponDoc.rooms.some((id) => String(id) === String(room._id));
        if (!allowed) {
          return res.status(400).json({ message: 'Coupon not applicable to this stay' });
        }
      }
      const applied = applyCouponToTotal(totalPrice, couponDoc);
      totalPrice = applied.total;
      discountAmount = applied.discount;
    }
    const booking = await Booking.create({
      room: room._id,
      roomName: room.name || '',
      user: req.user.id,
      roomType,
      checkIn,
      checkOut,
      guests: guestCount,
      originalTotal,
      discountAmount,
      couponCode: appliedCouponCode,
      totalPrice,
      status: 'confirmed'
    });

    if (couponDoc && discountAmount > 0) {
      await Coupon.updateOne({ _id: couponDoc._id }, { $inc: { usedCount: 1 } });
    }

    await logActivity({
      user: req.user.id,
      type: 'booking_created',
      room: room._id,
      booking: booking._id,
      message: `New booking: ${room.name || 'Stay'}`
    });

    const populated = await booking.populate('room');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// exports.getRoomAvailability = async (req, res) => {
//   const { roomId } = req.params;
//   const { roomType } = req.query;

//   if (!roomId) {
//     return res.status(400).json({ message: 'Missing room id' });
//   }

//   const query = {
//     room: roomId,
//     status: { $in: ['confirmed', 'pending'] }
//   };

//   if (roomType) {
//     query.$or = [
//       { roomType },
//       { roomType: { $exists: false } },
//       { roomType: null }
//     ];
//   }

//   const bookings = await Booking.find(query)
//     .select('checkIn checkOut roomType')
//     .sort({ checkIn: 1 });

//   res.json(bookings);
// };

exports.getRoomAvailability = async (req, res) => {
  const {roomId} = req.params;
  const {roomType} = req.query;


  if(!roomId){
    return res.status(400).json({ message: 'Missing room id' });
  }

  const query = {
    room: roomId,
    status: { $in: ['confirmed', 'pending']}
  };

  if(roomType){
    query.$or =[
      {roomType},
      {roomType: {$exists: false}},
      {roomType: null}
    ];
  }

  const bookings = await Booking.find(query)
    .select('checkIn checkOut roomType')
    .sort({ checkIn: 1});

    res.json(bookings);

}


exports.getAvailabilityByDate = async (req, res) => {
  const { checkIn, checkOut } = req.query;

  if (!checkIn || !checkOut) {
    return res.status(400).json({ message: 'Missing dates' });
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
    return res.status(400).json({ message: 'Invalid dates' });
  }

  const bookings = await Booking.find({
    status: { $in: ['confirmed', 'pending'] },
    checkIn: { $lt: checkOutDate },
    checkOut: { $gt: checkInDate }
  }).select('room');

  const roomIds = Array.from(new Set(bookings.map((item) => String(item.room))));
  res.json({ roomIds });
};

exports.cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('room');

  if(!booking){
    return res.status(404).json({ message: 'Booking not found'});
  }

  if(req.user.role !== 'admin' && String(booking.user) !== req.user.id){
    return res.status(403).json( { message:'Not allowed'});
  }

  booking.status = 'cancelled';
  await booking.save();

  await logActivity({
    user: req.user.id,
    type: 'booking_cancelled',
    room: booking.room?._id || booking.room,
    booking: booking._id,
    message: `New booking: ${booking.room?.name || 'Stay'}`
  });
  res.json(booking);
}

