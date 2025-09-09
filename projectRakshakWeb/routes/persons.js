const express = require('express');
const router = express.Router();
const axios = require('axios');
const { ensureAuth } = require('../controllers/authController');
const personController = require('../controllers/personController');
const upload = require('../config/multer');
const imagekit = require('../config/imagekit');
const Person = require('../models/Person');
const Notification = require('../models/Notification');
const FormData = require('form-data');
const { sendResolutionSMS } = require('../config/smsService');

// --- 1. PUBLIC WEB FORM ROUTE ---
router.post('/find-person', upload.array('images', 7), personController.postFindPersonForm);

router.post('/api/report_match', async (req, res) => {
    console.log(`[AI_REPORT] Received new match report from Python service.`);
    const { mongo_id, name, snapshot, camera_name } = req.body;
    
    if (!mongo_id || !name || !snapshot) {
        console.error("[AI_REPORT_FAIL] Bad Request: Missing required data in payload from Python.", req.body);
        return res.status(400).json({ message: 'Bad Request: Missing required data.' });
    }
    try {
        const uploadResult = await imagekit.upload({
            file: `data:image/jpeg;base64,${snapshot}`,
            fileName: `snapshot_${mongo_id}_${Date.now()}.jpg`,
            folder: "/found-snapshots"
        });
        console.log(`[IMAGEKIT_SUCCESS] Uploaded snapshot for '${name}' successfully.`);

        const newNotification = await Notification.create({
            personId: mongo_id,
            personName: name,
            snapshotUrl: uploadResult.url,
            snapshotFileId: uploadResult.fileId,
            cameraName: camera_name || 'N/A'
        });
        console.log(`[DB_CREATE_SUCCESS] Created new notification for '${name}' in database.`);
        
        req.io.emit('new_match_found', newNotification);
        console.log(`[SOCKET_IO] Broadcasted 'new_match_found' for '${name}' to all connected clients.`);
        res.status(200).json({ message: 'Match received and broadcasted.' });
    } catch (err) {
        console.error(`[AI_REPORT_ERROR] A critical error occurred while processing a match report for '${name}'. Error: ${err.message}`);
        res.status(500).json({ message: 'Failed to process match report.' });
    }
});
// --- 2. PROTECTED DASHBOARD API ROUTES ---

// @desc    Get full details for a single person for the dashboard's details panel
router.get('/api/person/:id', ensureAuth, personController.getPersonDetails);

// @desc    Handle "Accept" or "Re-Search" actions from the dashboard notifications
router.post('/api/person/:id/action', ensureAuth, async (req, res) => {
    const { action, notificationId } = req.body;
    const { id } = req.params;
    console.log(`[ACTION] Received '${action}' request for person ID: ${id} and notification ID: ${notificationId}`);

    try {
        const notification = await Notification.findById(notificationId);
        if (!notification) {
            console.error(`[ACTION_FAIL] Notification not found with ID: ${notificationId}`);
            return res.status(404).json({ message: 'Associated notification not found.' });
        }

        if (action === 'accept') {
            const person = await Person.findByIdAndUpdate(id, {
                status: 'Found',
                foundSnapshotUrl: notification.snapshotUrl,
                foundOnCamera: notification.cameraName
            }, { new: true });

            if (!person) {
                console.error(`[ACTION_FAIL] Person not found with ID: ${id} during 'accept' action.`);
                return res.status(404).json({ message: 'Person not found.' });
            }

            console.log(`[DB_UPDATE_SUCCESS] Saved found-details for '${person.fullName}' to Person DB.`);
            
            await axios.post(`${process.env.PYTHON_BACKEND_URL}/update_search_status`, { mongo_id: id, action: 'accept' });
            console.log(`[AI_SERVICE] Successfully sent 'accept' command to Python service for person ID: ${id}`);
            
            req.io.emit('person_found', {
                _id: person._id,
                fullName: person.fullName,
                foundSnapshot: person.foundSnapshotUrl,
                foundOnCamera: person.foundOnCamera,
            });
            console.log(`[SOCKET_IO] Broadcasted 'person_found' event for '${person.fullName}'.`);

            await Notification.findByIdAndDelete(notificationId);
            console.log(`[DB_DELETE_SUCCESS] Deleted notification ID: ${notificationId}`);
            return res.status(200).json({ message: `Status for ${person.fullName} updated to Found.` });
        } 
        else if (action === 'research') {
            await axios.post(`${process.env.PYTHON_BACKEND_URL}/update_search_status`, { mongo_id: id, action: 'research' });
            console.log(`[AI_SERVICE] Successfully sent 'research' command to Python service for person ID: ${id}`);

            await Notification.findByIdAndDelete(notificationId);
            console.log(`[DB_DELETE_SUCCESS] Deleted notification ID: ${notificationId}`);
            return res.status(200).json({ message: 'Re-search initiated.' });
        }
        else {
            console.warn(`[ACTION_WARN] Invalid action received: '${action}'`);
            return res.status(400).json({ message: 'Invalid action.' });
        }
    } catch (err) {
        console.error(`[ACTION_ERROR] A critical error occurred during the '${action}' action for person ID: ${id}. Error: ${err.message}`);
        res.status(500).json({ message: 'Server Error' });
    }
});


// --- 3. PUBLIC API ROUTES (For AI Service & Mobile App) ---

// @desc    Receive a match report from the Python AI service


// @desc    Get all persons with a 'Found' status (for the mobile app's home screen)
router.get('/api/persons/found', async (req, res) => {
    console.log("[APP_API] Mobile app requested list of 'Found' persons.");
    try {
        const foundPersons = await Person.find({ status: 'Found' }).sort({ createdAt: -1 }).lean();
        console.log(`[DB_FETCH_SUCCESS] Found ${foundPersons.length} person(s) with 'Found' status.`);
        res.status(200).json(foundPersons);
    } catch (err) {
        console.error(`[APP_API_ERROR] Error fetching found persons for mobile app. Error: ${err.message}`);
        res.status(500).json({ message: "Server Error" });
    }
});

// @desc    Get full details for a single person (for the mobile app's detail screen)
router.get('/api/app/person/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`[APP_API] Mobile app requested details for person ID: ${id}`);
    try {
        const person = await Person.findById(id).lean();
        if (!person) {
            console.warn(`[APP_API_WARN] Person not found with ID: ${id}`);
            return res.status(404).json({ message: 'Person not found' });
        }
        console.log(`[DB_FETCH_SUCCESS] Successfully fetched details for '${person.fullName}'.`);
        res.status(200).json(person);
    } catch (err) {
        console.error(`[APP_API_ERROR] Error fetching details for person ID: ${id}. Error: ${err.message}`);
        res.status(500).json({ message: "Server Error" });
    }
});

router.post('/api/person/:id/resolve', upload.single('photo'), async (req, res) => {
    const { id } = req.params;
    console.log(`[RESOLVE_ROUTE] Received request to resolve case for person ID: ${id}`);

    try {
        // --- LOG 1: Check if the file was received by Multer ---
        console.log('[RESOLVE_ROUTE] Checking for received file...');
        const file = req.file;
        if (!file) {
            console.error('[RESOLVE_ERROR] Multer did not process a file. req.file is undefined.');
            return res.status(400).json({ success: false, message: 'Confirmation photo is required.' });
        }
        console.log(`[RESOLVE_ROUTE] File received successfully: ${file.originalname}, Size: ${file.size} bytes`);

        // --- LOG 2: Check if the person exists ---
        console.log(`[RESOLVE_ROUTE] Fetching person with embeddings for ID: ${id}`);
        const person = await Person.findById(id).select('+embeddings');
        if (!person || !person.embeddings) {
            console.error(`[RESOLVE_ERROR] Person or their embeddings not found for ID: ${id}`);
            return res.status(404).json({ success: false, message: 'Person or their face data not found.' });
        }
        console.log(`[RESOLVE_ROUTE] Found person '${person.fullName}' with their embeddings.`);

        // --- LOG 3: Prepare data for Python AI Service ---
        console.log('[RESOLVE_ROUTE] Sending photo and embeddings to Python for verification...');
        
        // FIX: Use form-data package instead of browser FormData
        const formData = new FormData();
        formData.append('image', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });
        formData.append('embeddings_str', JSON.stringify(person.embeddings));
        
        console.log(`[RESOLVE_ROUTE] FormData prepared. Embeddings count: ${person.embeddings.length}`);
        
        // FIX: Include proper headers from form-data
        const aiResponse = await axios.post(
            `${process.env.PYTHON_BACKEND_URL}/verify_resolve_photo`, 
            formData, 
            {
                headers: {
                    ...formData.getHeaders(), // This gets the proper multipart headers
                },
                timeout: 30000, // 30 second timeout
            }
        );
        
        console.log('[RESOLVE_ROUTE] Received response from Python:', aiResponse.data);
        
        // 4. Process the AI's decision
        if (aiResponse.data.match) {
            person.status = 'Resolved';
            await person.save();
            console.log(`[RESOLVE_SUCCESS] Case for '${person.fullName}' has been resolved and status updated.`);
            
            // Emit socket event for real-time updates
            req.io.emit('person_resolved', {
                _id: person._id,
                fullName: person.fullName,
                status: 'Resolved'
            });
            
            return res.status(200).json({ success: true, message: 'Case resolved successfully!' });
        } else {
            // Send research command to Python service
            await axios.post(`${process.env.PYTHON_BACKEND_URL}/update_search_status`, { 
                mongo_id: id, 
                action: 'research' 
            });
            console.log(`[RESOLVE_FAIL] Mismatch for '${person.fullName}'. Re-search triggered.`);
            return res.status(400).json({ success: false, message: aiResponse.data.message });
        }

    } catch (error) {
        // Enhanced error logging
        if (error.response) {
            // Python service returned an error
            console.error('[RESOLVE_ROUTE_ERROR] Python service error:', {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            });
            
            const errorMessage = error.response.data?.detail || error.response.data?.message || 'Python AI service error';
            return res.status(500).json({ success: false, message: errorMessage });
            
        } else if (error.request) {
            // Network error - couldn't reach Python service
            console.error('[RESOLVE_ROUTE_ERROR] Network error - could not reach Python service:', error.message);
            return res.status(500).json({ success: false, message: 'Could not connect to AI service' });
            
        } else {
            // Other error (database, etc.)
            console.error('[RESOLVE_ROUTE_CRITICAL_ERROR] Unexpected error:', error.message);
            return res.status(500).json({ success: false, message: 'An internal server error occurred' });
        }
    }
});
router.post('/api/person/:id/finalize', async (req, res) => {
    const { id } = req.params;
    const { boothLocation, officerContact } = req.body;

    try {
        if (!boothLocation || !officerContact) {
            return res.status(400).json({ success: false, message: "Booth location and officer contact are required." });
        }

        const person = await Person.findByIdAndUpdate(id, {
            status: 'Resolved',
            resolvedAtBoothLocation: boothLocation,
            boothOfficerContact: officerContact
        }, { new: true });

        if (!person) {
            return res.status(404).json({ success: false, message: "Person not found." });
        }

        console.log(`[RESOLVED] Case for '${person.fullName}' finalized. Details stored.`);

        try {
            // Wait for SMS to complete
            await sendResolutionSMS(person.reporterContactNumber, person);
        } catch (smsError) {
            console.error("SMS sending failed, but case was resolved:", smsError);
            // Continue anyway - don't fail the entire operation because of SMS
        }

        res.status(200).json({ success: true, message: "Case has been successfully resolved and notification sent." });

    } catch (err) {
        console.error("Error finalizing case:", err);
        res.status(500).json({ success: false, message: "Server error during finalization." });
    }
});
module.exports = router;