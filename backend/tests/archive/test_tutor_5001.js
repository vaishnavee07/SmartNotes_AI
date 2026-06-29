const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testTutor() {
    console.log('1. Registering test user...');
    const email = `tutor_test_${Date.now()}@test.com`;
    const password = 'Password123!';
    try {
        await axios.post(`${BASE_URL}/auth/register`, {
            name: 'Tutor Test User',
            email,
            password
        });
        console.log('✅ Registered successfully.');

        console.log('2. Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email,
            password
        });
        const token = loginRes.data.token;
        console.log('✅ Logged in successfully. Token received.');

        const headers = { Authorization: `Bearer ${token}` };

        console.log('3. Calling /api/tutor/ask without context...');
        try {
            const askRes = await axios.post(`${BASE_URL}/tutor/ask`, {
                question: 'What is photosynthesis?',
                topic: 'Biology'
            }, { headers });
            console.log('✅ Ask success response:', askRes.data);
        } catch (askErr) {
            console.error('❌ Ask failed:', askErr.response?.status, askErr.response?.data);
        }

    } catch (err) {
        console.error('❌ Setup failed:', err.response?.data || err.message);
    }
}

testTutor();
