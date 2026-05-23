const { User } = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Please add all fields' });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
                xp: user.xp,
                level: user.level,
                streak: user.streak,
            });
        } else {
            res.status(400).json({ error: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`[Auth] Login attempt for email: ${email}`);

        // Check for user email
        const user = await User.findOne({ email });

        if (!user) {
            console.log(`[Auth] User not found for email: ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            console.log(`[Auth] Password mismatch for email: ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log(`[Auth] Successful login for: ${email}`);
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
            xp: user.xp,
            level: user.level,
            streak: user.streak,
        });
    } catch (error) {
        console.error(`[Auth] Login error:`, error);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Authenticate with Google
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
    try {
        const { token } = req.body;

        // Use a dummy client ID verification to bypass during development if keys aren't set
        // Normally, the client ID is securely matched here.
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            // Create user
            const randomPassword = crypto.randomBytes(32).toString('hex');
            user = await User.create({
                name: name || 'Google User',
                email,
                password: randomPassword,
            });
        }

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
            xp: user.xp,
            level: user.level,
            streak: user.streak,
        });

    } catch (error) {
        console.error(`[Auth] Google login error:`, error);
        res.status(401).json({ error: 'Invalid Google Token' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    googleLogin,
};
