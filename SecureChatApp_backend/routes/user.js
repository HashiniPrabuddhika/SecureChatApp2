const express = require('express');
const router = express.Router();
const { getOtherUsers } = require('../controllers/userController');
const auth = require('../middleware/auth');

router.get('/', auth, getOtherUsers);

module.exports = router;
