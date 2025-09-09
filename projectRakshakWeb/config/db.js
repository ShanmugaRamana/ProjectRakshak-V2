const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // These options are recommended for new Mongoose versions
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`Error connecting to MongoDB: ${err.message}`);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB;