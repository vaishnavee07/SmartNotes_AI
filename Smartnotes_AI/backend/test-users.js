const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = require('./models/User');
        const users = await User.find({}).select('email password');
        fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
checkUsers();
