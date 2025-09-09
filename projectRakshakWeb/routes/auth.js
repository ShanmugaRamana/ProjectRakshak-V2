const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Display the login page
router.get('/login', authController.getLoginPage);

// Handle the login form submission
router.post('/login', authController.postLogin);

// Handle logout
router.get('/logout', authController.logout);

module.exports = router;