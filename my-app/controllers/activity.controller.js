const Activity = require('../models/activity.model');

exports.getActivities = async (req, res) => {
  const query = req.user.role === 'admin' ? {} : { user: req.user.id };
  const activities = await Activity.find(query)
    .populate('room', 'name region location')
    .populate('booking', 'checkIn checkOut status')
    .populate('user', 'name')
    .sort({ createdAt: -1 });
  res.json(activities);
};
