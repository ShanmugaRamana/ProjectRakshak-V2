const multer = require('multer');

// Configure multer to store uploaded files in memory as a buffer.
// This is efficient as we don't need to save the file to disk temporarily.
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit per image
});

module.exports = upload;