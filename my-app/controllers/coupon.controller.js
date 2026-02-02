const Coupon = require('../models/coupon.model');

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

const isCouponValid = (coupon) => {
  if (!coupon || !coupon.active) return false;
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return false;
  if (typeof coupon.maxUses === 'number' && coupon.maxUses >= 0) {
    if (coupon.usedCount >= coupon.maxUses) return false;
  }
  return true;
};

exports.createCoupon = async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Not allowed' });
  }

  const { code, type, amount, expiresAt, maxUses, active, roomId } = req.body;
  if (!code || !amount) {
    return res.status(400).json({ message: 'Missing coupon data' });
  }

  try {
    const coupon = await Coupon.create({
      code: normalizeCode(code),
      type: type === 'fixed' ? 'fixed' : 'percent',
      amount: Number(amount),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxUses: maxUses === undefined ? undefined : Number(maxUses),
      active: active === undefined ? true : Boolean(active),
      rooms: roomId ? [roomId] : []
    });
    return res.status(201).json(coupon);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Failed to create coupon' });
  }
};

exports.listCoupons = async (req, res) => {
  if(req.user.role !== 'admin'){
    return res.status(403).json({messgae: 'Not allowed'});
  }
  
  const coupons= await Coupon.find().populate('rooms', 'name').sort({ createdAt : -1 });
  return res.json(coupons);
}


exports.validateCoupon = async (req, res) => {
  const code = normalizeCode(req.query.code);
  const roomId = String(req.query.roomId || '').trim();
  if (!code) {
    return res.status(400).json({ message: 'Missing coupon code' });
  }

  const coupon = await Coupon.findOne({ code });
  if (roomId && coupon?.rooms?.length) {
    const allowed = coupon.rooms.some((id) => String(id) === roomId);
    if (!allowed) {
      return res.status(404).json({ message: 'Invalid coupon' });
    }
  }
  if (!isCouponValid(coupon)) {
    return res.status(404).json({ message: 'Invalid coupon' });
  }

  return res.json({
    code: coupon.code,
    type: coupon.type,
    amount: coupon.amount,
    rooms: coupon.rooms
  });
};

exports.applyCouponToTotal = (total, coupon) => {
  if (!isCouponValid(coupon)) {
    return { total, discount: 0 };
  }
  const discount =
    coupon.type === 'fixed'
      ? Number(coupon.amount || 0)
      : Math.round((Number(coupon.amount || 0) / 100) * total);
  const safeDiscount = Math.min(total, Math.max(0, discount));
  return { total: Math.max(0, total - safeDiscount), discount: safeDiscount };
};


exports.normalizeCode = normalizeCode;
