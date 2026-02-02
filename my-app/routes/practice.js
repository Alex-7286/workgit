// routes/practice.js
const express = require('express');
const path = require('path');

const router = express.Router();

// GET /express -> index.html 보여줌
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// POST /express -> 폼 처리
router.post('/', (req, res) => {
    const { name, password } = req.body;
    res.send(`<h2>${name}님 환영합니다!</h2>`);
});

module.exports = router;
