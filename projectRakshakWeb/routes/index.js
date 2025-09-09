const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');
const personController = require('../controllers/personController');
const notificationController = require('../controllers/notificationController');
const { ensureAuth } = require('../controllers/authController');
const upload = require('../config/multer');
const overviewController = require('../controllers/overviewController'); // <-- 1. Import new controller

// --- Public Routes ---
router.get('/', indexController.getHomePage);
router.get('/find-person', personController.getFindPersonForm);
router.post('/find-person', upload.array('images', 7), personController.postFindPersonForm);

// --- PROTECTED DASHBOARD ROUTE (THIS IS THE FIX) ---
// We now call the data-fetching function from personController instead of the old placeholder.
router.get('/dashboard', ensureAuth, personController.getDashboardData);

// --- API Route for person details ---
router.get('/api/person/:id', ensureAuth, personController.getPersonDetails);
router.get('/notifications', ensureAuth, notificationController.getNotificationsPage);

router.get('/api/overview-data', ensureAuth, overviewController.getOverviewData); // <-- 2. Add this line

module.exports = router;