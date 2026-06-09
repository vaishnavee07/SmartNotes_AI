const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// CORS must be first — before helmet and any route handlers
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://smart-notes-ai-three-azure.vercel.app',
  'https://smart-notes-six-gamma.vercel.app',
  'https://smartnotes-frontend-nvrg.onrender.com'
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman, server-to-server)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Blocked request from: ${origin}`);
            callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

// Handle preflight OPTIONS requests for all routes
app.options(/.*/, cors(corsOptions));

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(helmet());
app.use(morgan('dev'));

// Basic route
app.get('/', (req, res) => {
    res.send('SmartNotes AI API is running...');
});

// Import route files
const authRoutes = require('./routes/auth');
const noteRoutes = require('./routes/notes');
const studyRoutes = require('./routes/study');
const plannerRoutes = require('./routes/planner');
const gamificationRoutes = require('./routes/gamification');
const goalsRoutes = require('./routes/goals');
const sessionsRoutes = require('./routes/sessions');
const activityRoutes = require('./routes/activity');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/activity', activityRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Increase timeout to 10 minutes to allow large PDFs to be processed by Groq LLM
server.timeout = 600000;
server.keepAliveTimeout = 600000;
server.headersTimeout = 601000;
