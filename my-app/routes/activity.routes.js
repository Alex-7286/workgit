const express = require('express');
const activityController = require('../controllers/activity.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, activityController.getActivities);

module.exports = router;
