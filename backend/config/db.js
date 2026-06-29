const mongoose = require('mongoose');

const MONGO_OPTS = {
    serverSelectionTimeoutMS: 30000,  // give Atlas 30s to pick a healthy node
    socketTimeoutMS:          45000,  // idle socket timeout
    connectTimeoutMS:         30000,  // initial TCP connect timeout
    heartbeatFrequencyMS:     10000,  // check replica health every 10s
    retryWrites:              true,
    retryReads:               true,
    maxPoolSize:              10,
};

const connectDB = async () => {
    let retries = 3;
    while (retries > 0) {
        try {
            const conn = await mongoose.connect(process.env.MONGO_URI, MONGO_OPTS);
            console.log(`MongoDB Connected: ${conn.connection.host}`);

            // Re-connect automatically on unexpected disconnects
            mongoose.connection.on('disconnected', () => {
                console.warn('[MongoDB] Disconnected — attempting reconnect...');
                setTimeout(connectDB, 5000);
            });
            mongoose.connection.on('error', (err) => {
                console.error('[MongoDB] Connection error:', err.message);
            });

            return; // success — exit loop
        } catch (error) {
            retries--;
            console.error(`[MongoDB] Connection attempt failed: ${error.message}`);
            if (retries > 0) {
                console.warn(`[MongoDB] Retrying in 5 s... (${retries} attempts left)`);
                await new Promise(r => setTimeout(r, 5000));
            } else {
                console.error('[MongoDB] All connection attempts failed. Server will continue without DB.');
                console.warn('To fix: Add your IP to MongoDB Atlas whitelist at https://cloud.mongodb.com/');
            }
        }
    }
};

module.exports = connectDB;

