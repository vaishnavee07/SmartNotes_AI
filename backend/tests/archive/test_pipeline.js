const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';

const runTests = async () => {
    console.log('--- STARTING RUNTIME VERIFICATION ---');
    
    console.log('\\n[1] Testing User Registration...');
    const email = `testuser_${Date.now()}@example.com`;
    let token = '';
    
    try {
        const regRes = await axios.post(`${BASE_URL}/auth/register`, {
            name: 'Test User',
            email: email,
            password: 'password123'
        });
        console.log('✅ Registration successful!');
    } catch (e) {
        console.log('❌ Registration failed:', e.response?.data || e.message);
        return;
    }

    console.log('\\n[2] Testing Login...');
    try {
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: email,
            password: 'password123'
        });
        token = loginRes.data.token;
        console.log('✅ Login successful! Token acquired.');
    } catch (e) {
        console.log('❌ Login failed:', e.response?.data || e.message);
        return;
    }

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    console.log('\\n[3 & 4] Testing PDF Upload & Summary Generation...');
    
    const testUpload = async (filename, type) => {
        console.log(`  -> Uploading ${type} PDF (${filename})...`);
        const form = new FormData();
        form.append('title', `${type} PDF Note`);
        form.append('sourceType', 'pdf');
        form.append('file', fs.createReadStream(filename));
        
        try {
            const start = Date.now();
            const uploadRes = await axios.post(`${BASE_URL}/notes/upload`, form, {
                headers: { ...authHeaders.headers, ...form.getHeaders() }
            });
            const duration = (Date.now() - start) / 1000;
            console.log(`  ✅ Upload & Summary successful for ${type} PDF! (${duration}s)`);
            console.log(`     Summary Preview: ${uploadRes.data.summary.substring(0, 100)}...`);
            return uploadRes.data._id;
        } catch (e) {
            console.log(`  ❌ Upload failed for ${type} PDF:`, e.response?.data || e.message);
            return null;
        }
    };

    // We use the existing real PDFs in the directory
    await testUpload('sample2.pdf', 'Small');
    const noteId = await testUpload('temp_1771735950180_Unit 2 - New Swing.pdf', 'Medium');

    if (!noteId) {
        console.log('Aborting further tests due to missing Note ID.');
        return;
    }

    console.log('\\n[5] Testing Flashcard Generation...');
    try {
        const flashRes = await axios.post(`${BASE_URL}/study/flashcard/generate`, {
            topic: 'Java Swing',
            noteId: noteId
        }, authHeaders);
        console.log('✅ Flashcards generated!');
        console.log(`   Two-mark cards: ${flashRes.data.flashcards.flashcards.twoMark?.length}`);
    } catch (e) {
        console.log('❌ Flashcard Generation failed:', e.response?.data || e.message);
    }

    console.log('\\n[6] Testing Quiz Generation...');
    try {
        const quizRes = await axios.post(`${BASE_URL}/study/quiz/generate`, {
            topic: 'Java Swing',
            numQuestions: 5,
            noteId: noteId
        }, authHeaders);
        console.log('✅ Quiz generated!');
        console.log(`   Questions: ${quizRes.data.quiz.questions?.length}`);
    } catch (e) {
        console.log('❌ Quiz Generation failed:', e.response?.data || e.message);
    }

    console.log('\\n[7] Testing Question Paper Generation...');
    try {
        const paperRes = await axios.post(`${BASE_URL}/study/question-paper/generate`, {
            topic: 'Java Swing',
            marks: 20,
            difficulty: 'medium',
            noteId: noteId
        }, authHeaders);
        console.log('✅ Question Paper generated!');
        console.log(`   Total Marks: ${paperRes.data.questionPaper.totalMarks}`);
    } catch (e) {
        console.log('❌ Question Paper Generation failed:', e.response?.data || e.message);
    }

    console.log('\\n[8] Testing Study Planner...');
    try {
        const examDate = new Date();
        examDate.setDate(examDate.getDate() + 7);
        
        const planRes = await axios.post(`${BASE_URL}/planner`, {
            topic: 'Advanced Java',
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

runTests();
