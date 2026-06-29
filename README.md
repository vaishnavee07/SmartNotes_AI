# SmartNotes AI

SmartNotes AI is an intelligent learning companion that transforms your study materials into interactive summaries, flashcards, quizzes, and personalized study plans using AI.

## Features

- **Notes Generation**: Upload PDFs or Paste text to automatically generate structured notes and summaries.
- **YouTube Notes**: Paste a YouTube link to generate notes from the transcript.
- **AI Tutor**: Ask questions contextually about your notes or general topics.
- **Study Tools**: Generate Flashcards, Quizzes, and Question Papers.
- **AI Study Planner**: Create personalized revision roadmaps and day-by-day plans.
- **Analytics & Gamification**: Track your readiness, weak topics, and earn XP.
- **Export**: Share your notes via link or export them as clean PDFs.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, MongoDB (Atlas)
- **AI / LLM**: Groq API (Llama3-8b-8192)
- **Authentication**: JWT, Google OAuth

## Local Setup

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas account (or local MongoDB)
- Groq API Key

### 2. Backend Setup
1. `cd backend`
2. `npm install`
3. Create a `.env` file with the following variables:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GROQ_API_KEY=your_groq_api_key
   ```
4. Start the server: `node index.js`

### 3. Frontend Setup
1. `cd frontend`
2. `npm install`
3. Create a `.env` file with the following variables:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
   ```
4. Start the dev server: `npm run dev`

## Production Verification

To verify that the application is running correctly in production mode:
1. Ensure the backend is running.
2. In the `backend` directory, run: `node test_full_production.js`
3. The script will run a comprehensive suite of E2E tests against all features using the real MongoDB cluster and Groq API.
