const Staff = require('../models/Staff');
const bcrypt = require('bcryptjs');

// @desc    Login for staff members via the mobile app
// @route   POST /staff-auth/login
exports.loginStaff = async (req, res) => {
    const { phoneNumber, password } = req.body;
    const timestamp = new Date().toLocaleString();

    console.log(`[${timestamp}] [LOGIN_ATTEMPT] Received login request for phone: ${phoneNumber}`);

    try {
        if (!phoneNumber || !password) {
            console.warn(`[${timestamp}] [AUTH_FAIL] Login failed: Missing phone number or password.`);
            return res.status(400).json({ success: false, message: 'Please provide a Phone Number and Password' });
        }

        const staff = await Staff.findOne({ phoneNumber }).select('+password');

        if (!staff) {
            console.warn(`[${timestamp}] [AUTH_FAIL] Reason: Phone number '${phoneNumber}' not found.`);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, staff.password);
        if (!isMatch) {
            console.warn(`[${timestamp}] [AUTH_FAIL] Reason: Incorrect password for staff ID '${staff.staffId}'.`);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        console.log(`[${timestamp}] [AUTH_SUCCESS] Staff member '${staff.fullName}' logged in successfully.`);
        res.status(200).json({ success: true, message: 'Login successful' });

    } catch (err) {
        console.error(`[${timestamp}] [SERVER_ERROR] An error occurred during login:`, err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};