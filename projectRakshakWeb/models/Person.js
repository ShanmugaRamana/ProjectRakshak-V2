const mongoose = require('mongoose');

const PersonSchema = new mongoose.Schema({
    // --- Section 1: Lost Person Details ---
    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    age: {
        type: Number,
        required: true,
    },
    personContactNumber: {
        type: String,
        trim: true,
        required: function() { return this.age >= 18; }
    },
    lastSeenLocation: {
        type: String,
        required: true,
    },
    lastSeenTime: {
        type: Date,
        required: true,
    },
    identificationDetails: {
        type: String,
        required: true,
    },

    // --- THIS FIELD IS UPDATED FOR IMAGEKIT ---
    // We no longer store the heavy image buffer in the database.
    images: [{
        fileId: String,       // The unique ID from ImageKit (for deleting/managing)
        url: String,          // The full image URL from ImageKit
        thumbnailUrl: String  // The thumbnail URL from ImageKit
    }],

    // --- Guardian Details (Conditional) ---
    isMinor: {
        type: Boolean,
        required: true,
    },
    guardianType: {
        type: String,
        required: function() { return this.isMinor; }
    },
    guardianDetails: {
        type: String,
        required: function() { return this.isMinor; }
    },

    // --- Section 2: Reporter's Details ---
    reporterName: {
        type: String,
        required: true,
        trim: true,
    },
    reporterRelation: {
        type: String,
        required: true,
    },
    reporterContactNumber: {
        type: String,
        required: true,
    },

    // --- System & Optimization Fields ---
    status: {
        type: String,
        default: 'Lost',
        enum: ['Lost', 'Found', 'Resolved'], // <-- ADD 'Resolved' HERE

    },
    embeddings: {
        type: [[Number]], // Stores pre-calculated face embeddings
        select: false,   // Prevents sending this large field in normal queries
    },
    foundSnapshotUrl: {
        type: String, 
    },
    foundOnCamera: {
        type: String,
    },
    resolvedAtBoothLocation: {
        type: String,
    },
    boothOfficerContact: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Person', PersonSchema);