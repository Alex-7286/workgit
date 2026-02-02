const Room = require('../models/room.model');
const Review = require('../models/review.model');

const generateSummary = (room) => {
  const name = room.name ? room.name.trim() : '이름 미정';
  const location = room.location ? room.location.trim() : '위치 정보 없음';
  const guests = Number(room.maxGuests || 0);
  const price = Number(room.pricePerNight || 0);
  const amenities = Array.isArray(room.amenities) ? room.amenities.filter(Boolean) : [];

  const parts = [`${location}의 ${name}에서 편하게 쉬어가세요.`];
  if (guests > 0 && price > 0) {
    parts.push(`${guests}명 기준, 1박 ${price.toLocaleString('ko-KR')}원.`);
  } else if (price > 0) {
    parts.push(`1박 ${price.toLocaleString('ko-KR')}원.`);
  } else if (guests > 0) {
    parts.push(`${guests}명까지 이용 가능해요.`);
  }

  if (amenities.length) {
    parts.push(`편의시설: ${amenities.slice(0, 3).join(', ')}.`);
  }

  return parts.join(' ').trim();
};

const parseList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const toNumber = (value, fallback = 0) => {
  if (value === '' || value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
};

const toBoolean = (value, fallback = false) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
};

const resolveImages = (req, fallbackImages = []) => {
  if(req.files && req.files.length){
    return req.files.map((file) => `/uploads/${file.filename}`);
  }
  const raw = req.body.existingImages || req.body.images;
  if(raw){
    if(Array.isArray(raw)) return raw.filter(Boolean);
    return String(raw)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
    return fallbackImages;
}

const buildPayload = (req, existing = {}) => {
  const body = req.body || {};
  const images = resolveImages(req, existing.images || []);

  return {
    name: (body.name ?? existing.name ?? '').trim(),
    location: (body.location ?? existing.location ?? '').trim(),
    region: (body.region ?? existing.region ?? '').trim(),
    pricePerNight: toNumber(body.pricePerNight, existing.pricePerNight || 0),
    maxGuests: toNumber(body.maxGuests, existing.maxGuests || 0),
    images,
    description: (body.description ?? existing.description ?? '').trim(),
    latitude: body.latitude === undefined ? existing.latitude ?? null : toNumber(body.latitude, null),
    longitude: body.longitude === undefined ? existing.longitude ?? null : toNumber(body.longitude, null),
    amenities: body.amenities === undefined ? existing.amenities || [] : parseList(body.amenities),
    rating: toNumber(body.rating, existing.rating || 0),
    available: toBoolean(body.available, Boolean(existing.available)),
    summary: body.summary
  };
};

exports.getRooms = async (req, res) => {
  const rooms = await Room.find().sort({ createdAt: -1 }).lean();
  if (!rooms.length) {
    return res.json([]);
  }

  const roomIds = rooms.map((room) => room._id);
  const stats = await Review.aggregate([
    { $match: { room: { $in: roomIds } } },
    {
      $group: {
        _id: '$room',
        reviewCount: { $sum: 1 },
        ratingAverage: { $avg: '$rating' }
      }
    }
  ]);
  const statsMap = new Map(
    stats.map((stat) => [String(stat._id), stat])
  );

  const merged = rooms.map((room) => {
    const stat = statsMap.get(String(room._id));
    return {
      ...room,
      reviewCount: stat ? stat.reviewCount : 0,
      ratingAverage: stat ? stat.ratingAverage : 0
    };
  });

  res.json(merged);
};

exports.getRoomById = async (req, res) => {
  const room = await Room.findById(req.params.id).lean();

  if (!room) {
    return res.status(404).json({ message: 'Room not found' });
  }

  const stats = await Review.aggregate([
    { $match: { room: room._id } },
    {
      $group: {
        _id: '$room',
        reviewCount: { $sum: 1 },
        ratingAverage: { $avg: '$rating' }
      }
    }
  ]);

  const stat = stats[0];
  res.json({
    ...room,
    reviewCount: stat ? stat.reviewCount : 0,
    ratingAverage: stat ? stat.ratingAverage : 0
  });
};

exports.createRoom = async (req, res) => {
  try {
    const payload = buildPayload(req);
    if (!payload.summary) {
      payload.summary = generateSummary(payload);
    }
    const room = await Room.create(payload);
    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const existing = await Room.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const payload = buildPayload(req, existing.toObject());
    if (!payload.summary) {
      payload.summary = generateSummary(payload);
    }

    const room = await Room.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateRoom = async (req, res) => {
  try{
    const existing = await Room.findById(req.params.id);
    if(!existing){
      return res.status(404).json({ message: 'Room not found' });
    }
    const payload = buildPayload(req, existing.toObject());
    if(!payload.summary){
      payload.summary =  generateSummary(payload);
    }

    const room = await Room.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });

    if(!room){
      return res.status(404).json({ message : 'Room not found'});
    }
    res.json(room);
  }catch(error){
    res.status(400).json({ message: error.message });
  }
}

exports.deleteRoom = async (req, res) => {
  const room = await Room.findByIdAndDelete(req.params.id);

  if (!room) {
    return res.status(404).json({ message: 'Room not found' });
  }
  res.json({ message: 'Room deleted' });
};


