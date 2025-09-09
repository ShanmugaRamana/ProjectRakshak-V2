const Person = require('../models/Person');
const axios = require('axios');
const FormData = require('form-data');
const imagekit = require('../config/imagekit');

// This function remains the same
exports.getFindPersonForm = (req, res) => {
    res.render('find-person', {
        title: 'Report a Lost Person',
        error: null,
        fullName: '', age: '', personContactNumber: '', lastSeenLocation: '',
        lastSeenTime: '', identificationDetails: '', guardianType: '',
        guardianDetails: '', reporterName: '', reporterRelation: '', reporterContactNumber: ''
    });
};

// @desc    Process Find Person form with full verification and ImageKit upload
// @route   POST /find-person
exports.postFindPersonForm = async (req, res) => {
    try {
        const files = req.files;

        if (!files || files.length < 3 || files.length > 7) {
             // THE FIX: Added 'title' to the render object
             return res.status(400).render('find-person', {
                title: 'Report a Lost Person',
                error: 'Please upload between 3 and 7 images.',
                ...req.body
            });
        }

        const formData = new FormData();
        files.forEach(file => {
            formData.append('images', file.buffer, file.originalname);
        });

        let embeddings = [];
        try {
            const apiResponse = await axios.post(`${process.env.PYTHON_BACKEND_URL}/verify_faceset`, formData, {
                headers: formData.getHeaders(),
            });

            if (apiResponse.data.success) {
                embeddings = apiResponse.data.embeddings;
            } else {
                // This case is a fallback
                return res.status(400).render('find-person', {
                    title: 'Report a Lost Person',
                    error: apiResponse.data.message,
                    ...req.body
                });
            }
        } catch (error) {
            const errorMessage = error.response?.data?.detail || 'The AI verification service is unavailable.';
            console.error("Error from AI Service:", errorMessage);
            // THE FIX: Added 'title' to the render object
            return res.status(400).render('find-person', {
                title: 'Report a Lost Person',
                error: errorMessage,
                ...req.body
            });
        }
        
        // ... (The rest of the successful submission logic remains the same)
        
        console.log('Faces verified. Uploading images to ImageKit...');
        const uploadPromises = files.map(file => imagekit.upload({ file: file.buffer, fileName: file.originalname, folder: "/lost-persons" }));
        const imageKitResults = await Promise.all(uploadPromises);
        const imageDbEntries = imageKitResults.map(result => ({ fileId: result.fileId, url: result.url, thumbnailUrl: result.thumbnailUrl }));
        console.log('Images uploaded successfully.');

        const { fullName, age, personContactNumber, lastSeenLocation, lastSeenTime,
            identificationDetails, guardianType, guardianDetails,
            reporterName, reporterRelation, reporterContactNumber 
        } = req.body;

        const parsedAge = parseInt(age);
        const isMinor = parsedAge < 18;

        if (!isMinor && !personContactNumber) {
            // THE FIX: Added 'title' to the render object
            return res.status(400).render('find-person', {
                title: 'Report a Lost Person',
                error: 'Lost person\'s contact number is required for adults.',
                ...req.body
            });
        }

        const personData = {
            fullName, age: parsedAge, personContactNumber: isMinor ? undefined : personContactNumber,
            lastSeenLocation, lastSeenTime, identificationDetails,
            images: imageDbEntries,
            embeddings: embeddings,
            isMinor, guardianType: isMinor ? guardianType : undefined, guardianDetails: isMinor ? guardianDetails : undefined,
            reporterName, reporterRelation, reporterContactNumber, status: 'Lost'
        };

        await Person.create(personData);
        console.log(`New person '${fullName}' saved to database.`);
        res.redirect('/');

    } catch (err) {
        console.error("Error in postFindPersonForm:", err);
        // THE FIX: Added 'title' to the render object for unexpected errors
        res.status(500).render('find-person', {
            title: 'Report a Lost Person',
            error: 'Something went wrong. Please try again.',
            ...req.body
        });
    }
};

exports.getDashboardData = async (req, res) => {
    try {
        const sortQuery = req.query.sort || 'newest';
        const searchQuery = req.query.search || '';
        const statusFilter = req.query.statusFilter || 'Lost';

        let query = {};
        if (statusFilter === 'Lost' || statusFilter === 'Found') {
            query.status = statusFilter;
        }
        if(searchQuery) {
            query.$or = [
                { fullName: { $regex: searchQuery, $options: 'i' } },
                { lastSeenLocation: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        let sortOption = {};
        if (sortQuery === 'newest') sortOption.createdAt = -1;
        if (sortQuery === 'oldest') sortOption.createdAt = 1;

        const projection = {
            fullName: 1, age: 1, status: 1,
            'images.thumbnailUrl': 1 // Only get the thumbnail URL
        };
        
        const persons = await Person.find(query, projection).sort(sortOption).lean();

        res.render('dashboard', {
            title: 'Dashboard',
            user: req.session.user,
            persons: persons,
            sort: sortQuery,
            search: searchQuery,
            statusFilter: statusFilter
        });

    } catch (err) {
        console.error("Error fetching dashboard data:", err);
        res.status(500).send('Server Error');
    }
};

// This function remains the same
exports.getPersonDetails = async (req, res) => {
    try {
        const person = await Person.findById(req.params.id).lean();
        if (!person) {
            return res.status(404).json({ message: 'Person not found' });
        }
        res.json(person);
    } catch (err) {
        console.error("Error fetching person details:", err);
        res.status(500).json({ message: "Server Error" });
    }
};