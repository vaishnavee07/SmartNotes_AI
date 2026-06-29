const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Doubt = require('./models/Doubt');
const TopicPerformance = require('./models/TopicPerformance');

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smartnotes');
        console.log('✅ Connected to MongoDB.');

        // Find the latest doubt
        const latestDoubt = await Doubt.findOne().sort({ createdAt: -1 });
        if (latestDoubt) {
            console.log('✅ Found latest doubt:', {
                id: latestDoubt._id,
                question: latestDoubt.question,
                topic: latestDoubt.topic,
                responseKeys: Object.keys(latestDoubt.response || {})
            });

            // Find the TopicPerformance for this user and topic
            const perf = await TopicPerformance.findOne({
                userId: latestDoubt.userId,
                topic: latestDoubt.topic
            });
            if (perf) {
                console.log('✅ Found TopicPerformance with doubtCount:', perf.doubtCount);
            } else {
                console.log('❌ TopicPerformance not found for user/topic:', latestDoubt.userId, latestDoubt.topic);
            }
        } else {
            console.log('❌ No doubts found in the database.');
        }

    } catch (err) {
        console.error('❌ Verification failed:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
