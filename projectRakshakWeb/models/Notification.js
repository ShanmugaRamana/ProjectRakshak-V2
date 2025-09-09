const mongoose = require('mongoose');
const NotificationSchema = new mongoose.Schema({
    personId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
    personName: { type: String, required: true },
    snapshotUrl: { type: String, required: true },
    snapshotFileId: { type: String, required: true },
    cameraName: { type: String, default: 'N/A' },
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Notification', NotificationSchema);