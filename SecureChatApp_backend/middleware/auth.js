const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    console.log("Auth Header:", authHeader);
    
    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header missing' });
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Invalid authorization header format' });
    }
    
    const token = parts[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token missing' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log("JWT verify error:", err);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired' });
            } else if (err.name === 'JsonWebTokenError') {
                return res.status(403).json({ error: 'Invalid token' });
            }
            return res.status(403).json({ error: 'Token verification failed' });
        }
        req.user = user;
        next();
    });
}

module.exports = authenticateToken;