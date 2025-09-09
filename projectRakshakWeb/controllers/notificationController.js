const Notification = require('../models/Notification');

// @desc    Show the dedicated notifications page
// @route   GET /notifications
exports.getNotificationsPage = async (req, res) => {
    try {
        // Fetch all notifications and join them with the 'Person' data
        // to get the main registered photo for comparison.
        const notifications = await Notification.find({})
            .populate({
                path: 'personId',
                select: 'images' // We only need the images array from the Person document
            })
            .sort({ createdAt: -1 }) // Show newest first
            .lean();

        // Format the data for the template
        const formattedNotifications = notifications.map(noti => {
            let registeredImage = '/images/mp_police_logo.png'; // A fallback image
            if (noti.personId && noti.personId.images && noti.personId.images.length > 0) {
                registeredImage = noti.personId.images[0].thumbnailUrl;
            }
            return { ...noti, registeredImage };
        });

        res.render('notifications', {
            title: 'Notifications',
            notifications: formattedNotifications
        });
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).send('Server Error');
    }
};