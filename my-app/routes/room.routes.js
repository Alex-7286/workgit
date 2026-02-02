const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const roomController = require('../controllers/room.controller');

const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

router.get('/', roomController.getRooms);
router.get('/:id', roomController.getRoomById);
router.post('/', upload.array('images', 10), roomController.createRoom);
router.put('/:id', upload.array('images', 10), roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);

module.exports = router;
