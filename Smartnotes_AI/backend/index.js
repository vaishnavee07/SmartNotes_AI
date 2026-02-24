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

// Middleware
app.use(express.json());
app.use(cors());
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
