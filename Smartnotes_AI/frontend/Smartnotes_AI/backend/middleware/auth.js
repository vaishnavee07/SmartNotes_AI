const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer ')
    ) {
        token = req.headers.authorization.split(' ')[1];

        if (!token || token === 'null' || token === 'undefined') {
            return res.status(401).json({ error: 'Not authorized, invalid token format' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ error: 'Not authorized, user not found' });
            }

            return next();
        } catch (error) {
            console.error('[Auth] Token verification failed:', error.message);
            return res.status(401).json({ error: 'Not authorized, token failed' });
        }
    }

    // No Bearer header present
    return res.status(401).json({ error: 'Not authorized, no token' });
};

module.exports = { protect };
