const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';

const runFocusedTests = async () => {
    console.log('--- STARTING FOCUSED RUNTIME VERIFICATION ---');
    
    console.log('\\n[1] Testing User Registration & Login...');
    const email = `testuser_focused_${Date.now()}@example.com`;
    let token = '';
    
    try {
        await axios.post(`${BASE_URL}/auth/register`, { name: 'Test User', email: email, password: 'password123' });
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email: email, password: 'password123' });
        token = loginRes.data.token;
        console.log('✅ Registration & Login successful!');
    } catch (e) {
        console.log('❌ Auth failed:', e.response?.data || e.message);
        return;
    }

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    console.log('\\n[2] Uploading Small PDF for context...');
    let noteId = null;
    const form = new FormData();
    form.append('title', 'Test PDF Note');
    form.append('sourceType', 'pdf');
    form.append('file', fs.createReadStream('sample2.pdf'));
    
    try {
        const uploadRes = await axios.post(`${BASE_URL}/notes/upload`, form, {
            headers: { ...authHeaders.headers, ...form.getHeaders() }
        });
        noteId = uploadRes.data._id;
        console.log(`✅ Upload successful! Note ID: ${noteId}`);
    } catch (e) {
        console.log('❌ Upload failed:', e.response?.data || e.message);
        return;
    }

    console.log('\\n[3] Testing Flashcard Generation...');
    try {
        const flashRes = await axios.post(`${BASE_URL}/study/flashcard/generate`, {
            topic: 'Test Topic',
            noteId: noteId
        }, authHeaders);
        console.log('✅ Flashcards generated!');
        console.log(`   Two-mark cards: ${flashRes.data.flashcards?.flashcards?.twoMark?.length}`);
    } catch (e) {
        console.log('❌ Flashcard Generation failed:', e.response?.data || e.message);
    }

    console.log('\\n[4] Testing Study Planner...');
    try {
        const examDate = new Date();
        examDate.setDate(examDate.getDate() + 7);
        
        const planRes = await axios.post(`${BASE_URL}/planner`, {
            topic: 'Test Topic',
            examDate: examDate.toISOString().split('T')[0],
            availableHours: 4
        }, authHeaders);
        console.log('✅ Study Planner generated!');
        console.log(`   Days planned: ${planRes.data.plan?.length}`);
    } catch (e) {
        console.log('❌ Study Planner failed:', e.response?.data || e.message);
    }

    console.log('\\n--- RUNTIME VERIFICATION COMPLETE ---');
};

runFocusedTests();
