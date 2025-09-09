const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../controllers/authController');
const staffController = require('../controllers/staffController');

// @desc    Handle the form submission for adding new staff
// @route   POST /staff/add
router.post('/add', ensureAuth, staffController.addStaff);

module.exports = router;