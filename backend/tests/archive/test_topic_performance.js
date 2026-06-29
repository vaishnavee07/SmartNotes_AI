const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { updateTopicPerformance } = require('./services/analyticsService');
const { getNextBestAction } = require('./services/recommendationService');
const TopicPerformance = require('./models/TopicPerformance');
const { User } = require('./models/User');

(async () => {
    let mongod;
    try {
        console.log("Starting MongoDB Memory Server...");
        mongod = await MongoMemoryServer.create();
        await mongoose.connect(mongod.getUri());

        // Setup User
        const user = await User.create({
            name: "Test User",
            email: "test@test.com",
            password: "password123"
        });
        const userId = user._id;

        const assert = (condition, message) => {
            if (!condition) throw new Error(`Assertion failed: ${message}`);
        };

        console.log("-----------------------------------------");
        console.log("Test 1: Initial Weak Performance (<60%)");
        let p = await updateTopicPerformance(userId, "CNN", 40);
        assert(p.averageScore === 40, "Average should be 40");
        assert(p.strength === 'Weak', "Strength should be Weak");
        assert(p.priorityScore === 1, `Priority score should be 1, got ${p.priorityScore}`);
        assert(p.totalQuizzes === 1, "Total quizzes should be 1");
        assert(p.readinessContribution === -10, "Readiness delta should be -10");
        console.log("✅ Passed");

        console.log("-----------------------------------------");
        console.log("Test 2: Consecutive Weak Performance");
        p = await updateTopicPerformance(userId, "CNN", 50); // New avg: 45
        assert(p.averageScore === 45, `Average should be 45, got ${p.averageScore}`);
        assert(p.strength === 'Weak', "Strength should be Weak");
        assert(p.priorityScore === 2, `Priority score should be 2, got ${p.priorityScore}`);
        assert(p.totalQuizzes === 2, "Total quizzes should be 2");
        console.log("✅ Passed");

        console.log("-----------------------------------------");
        console.log("Test 3: Improve to Medium Performance (60-79%)");
        // Current total: 90 across 2 quizzes.
        // To get avg >= 60 on 3 quizzes, need total 180. 180 - 90 = 90.
        p = await updateTopicPerformance(userId, "CNN", 90); 
        assert(p.averageScore === 60, `Average should be 60, got ${p.averageScore}`);
        assert(p.strength === 'Medium', `Strength should be Medium, got ${p.strength}`);
        assert(p.priorityScore === 0, `Priority score should reset to 0, got ${p.priorityScore}`);
        assert(p.readinessContribution === 2, "Readiness delta should be 2");
        console.log("✅ Passed");

        console.log("-----------------------------------------");
        console.log("Test 4: Improve to Strong Performance (>=80%)");
        // Current total 180 / 3.
        // To get avg >= 80 on 4 quizzes, need total 320. 320 - 180 = 140.
        // Wait, max score is 100. Let's just create a new topic for Strong test.
        let strongP = await updateTopicPerformance(userId, "RNN", 90);
        assert(strongP.averageScore === 90, "Average should be 90");
        assert(strongP.strength === 'Strong', `Strength should be Strong, got ${strongP.strength}`);
        assert(strongP.priorityScore === 0, "Priority score should be 0");
        assert(strongP.readinessContribution === 10, "Readiness delta should be 10");
        console.log("✅ Passed");

        console.log("-----------------------------------------");
        console.log("Test 5: Next Best Action Engine");
        // Currently: CNN is Medium, RNN is Strong.
        // Let's create another Weak topic.
        await updateTopicPerformance(userId, "LSTM", 30);
        
        const nba = await getNextBestAction(userId);
        assert(nba.topic === "LSTM", `NBA topic should be LSTM, got ${nba.topic}`);
        assert(nba.action.includes("LSTM"), "NBA action should reference LSTM");
        console.log("✅ Passed");

        console.log("\n🚀 All TopicPerformance Logic verified successfully!");

    } catch (err) {
        console.error("❌ Test Failed:", err);
        process.exit(1);
    } finally {
        if (mongoose.connection) await mongoose.disconnect();
        if (mongod) await mongod.stop();
    }
})();
