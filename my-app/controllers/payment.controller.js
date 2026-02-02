const https = require('https');
const querystring = require('querystring');
const Booking = require('../models/booking.model');
const Room = require('../models/room.model');
const Coupon = require('../models/coupon.model');
const { applyCouponToTotal, normalizeCode } = require('./coupon.controller');

const KAKAO_ADMIN_KEY = 'cd345aca5b5b30fdf98d521a415db37d';
const KAKAO_CID = process.env.KAKAO_CID || 'TC0ONETIME';
const KAKAO_BASE_URL = process.env.KAKAO_BASE_URL || 'http://localhost:3000';

// const computeTotal = (room, checkIn, checkOut, guests, roomType) => {
//   const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
//   const nights = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
//   const basePrice = room.pricePerNight;
//   const typeMultiplier = roomType === 'premium' ? 1.3 : 1;
//   return Math.round(basePrice * typeMultiplier) * nights * guests;
// };

const computeTotal = (room, checkIn, checkOut, guests, roomType) => {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  const nights = Math.max(1, Math.ceil(ms / (1000* 60 * 60 * 24)));
  const basePrice = room.pricePerNight;
  const typeMultiplier = roomType === 'premium' ? 1.3 : 1;
  return Math.round(basePrice * typeMultiplier) * nights * guests;
}

const kakaoRequest = (path, payload) => new Promise((resolve, reject) => {
  if (!KAKAO_ADMIN_KEY) {
    reject(new Error('Missing KakaoPay admin key'));
    return;
  }

  const body = querystring.stringify(payload);

  const req = https.request(
    {
      hostname: 'kapi.kakao.com',
      path,
      method: 'POST',
      headers: {
        Authorization: `KakaoAK ${KAKAO_ADMIN_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
      }
    },
    (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (error) {
          reject(new Error('Invalid KakaoPay response'));
        }
      });
    }
  );

  req.on('error', reject);
  req.write(body);
  req.end();
});

exports.ready = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, guests, roomType, couponCode } = req.body;

    if (!roomId || !checkIn || !checkOut || !guests || !roomType) {
      return res.status(400).json({ message: 'Missing booking data' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
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

    const originalTotal = computeTotal(room, checkIn, checkOut, Number(guests), roomType);
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
      guests: Number(guests),
      originalTotal,
      discountAmount,
      couponCode: appliedCouponCode,
      totalPrice,
      status: 'pending'
    });

    const host = req.get('host') || '';
    const normalizedHost = host.replace('127.0.0.1', 'localhost');
    const baseUrl = KAKAO_BASE_URL || `${req.protocol}://${normalizedHost}`;
    const payload = {
      cid: KAKAO_CID,
      partner_order_id: String(booking._id),
      partner_user_id: String(req.user.id),
      item_name: `${room.name} (${roomType})`,
      quantity: 1,
      total_amount: totalPrice,
      tax_free_amount: 0,
      approval_url: `${baseUrl}/payment.html?bookingId=${booking._id}`,
      cancel_url: `${baseUrl}/payment.html?bookingId=${booking._id}&status=cancel`,
      fail_url: `${baseUrl}/payment.html?bookingId=${booking._id}&status=fail`
    };

    const result = await kakaoRequest('/v1/payment/ready', payload);

    if (!result?.data?.tid || !result?.data?.next_redirect_pc_url) {
      const errorMessage = result?.data?.msg || result?.data?.message || 'Payment ready failed';
      console.error('KakaoPay ready failed:', result?.data || result);
      booking.status = 'cancelled';
      await booking.save();
      return res.status(502).json({ message: errorMessage, detail: result?.data || null });
    }

    if (couponDoc && discountAmount > 0) {
      await Coupon.updateOne({ _id: couponDoc._id }, { $inc: { usedCount: 1 } });
    }

    booking.paymentTid = result.data.tid;
    await booking.save();

    res.json({ redirectUrl: result.data.next_redirect_pc_url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const { pg_token, bookingId } = req.query;

    if (!pg_token || !bookingId) {
      return res.status(400).json({ message: 'Missing approval data' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking || !booking.paymentTid) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const payload = {
      cid: KAKAO_CID,
      tid: booking.paymentTid,
      partner_order_id: String(booking._id),
      partner_user_id: String(booking.user),
      pg_token
    };

    const result = await kakaoRequest('/v1/payment/approve', payload);
    if (!result?.data || result?.statusCode >= 400) {
      const errorMessage = result?.data?.msg || result?.data?.message || 'Payment approval failed';
      console.error('KakaoPay approve failed:', result?.data || result);
      return res.status(502).json({ message: errorMessage, detail: result?.data || null });
    }

    booking.status = 'confirmed';
    booking.paymentApprovedAt = new Date();
    await booking.save();

    res.json({ message: 'Payment approved', data: result.data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.cancel = async (req, res) => {
  const { bookingId } = req.query;
  if (!bookingId) {
    return res.status(400).json({ message: 'Missing booking id' });
  }

  const booking = await Booking.findById(bookingId);
  if (booking) {
    booking.status = 'cancelled';
    await booking.save();
  }

  res.json({ message: 'Payment cancelled' });
};

exports.fail = async (req, res) => {
  const { bookingId } = req.query;
  if (!bookingId) {
    return res.status(400).json({ message: 'Missing booking id' });
  }

  const booking = await Booking.findById(bookingId);
  if (booking) {
    booking.status = 'cancelled';
    await booking.save();
  }

  res.json({ message: 'Payment failed' });
};
