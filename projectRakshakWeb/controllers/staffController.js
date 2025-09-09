const Staff = require('../models/Staff');
const bcrypt = require('bcryptjs');

// @desc    Process the add staff form
// @route   POST /staff/add
exports.addStaff = async (req, res) => {
    try {
        // The role is hardcoded to 'Ground Staff' as per your requirement.
        const staffData = { ...req.body, role: 'Ground Staff' };
        
        // Check if a staff member with the same Staff ID or Phone Number already exists
        const existingStaff = await Staff.findOne({ 
            $or: [{ phoneNumber: staffData.phoneNumber }, { staffId: staffData.staffId }] 
        });

        if (existingStaff) {
            // In a real app, you would re-render the dashboard with this error.
            // For now, we send a simple error message.
            return res.status(400).send('Error: A staff member with that Phone Number or Staff ID already exists. Please go back and try again.');
        }
        
        await Staff.create(staffData);
        console.log(`[DB_CREATE_SUCCESS] New staff member '${staffData.fullName}' added to the database.`);

        // Redirect back to the staff management tab on the dashboard
        res.redirect('/dashboard#staff-management');

    } catch (err) {
        console.error('Error adding staff member:', err);
        // Handle validation errors from the schema
        if (err.name === 'ValidationError') {
            return res.status(400).send(`Validation Error: ${err.message}. Please go back and correct the input.`);
        }
        res.status(500).send('Server Error. Please go back and try again.');
    }
};
