const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 
  (process.env.NODE_ENV === 'production' 
    ? (() => { throw new Error('JWT_SECRET environment variable is mandatory in production mode'); })() 
    : 'aicte_dev_secret_fallback_2026');

// Helper to get region for Regional Office users
function getUserRegion(user) {
  if (!user || user.role !== 'Regional Office') return null;
  const b = user.bureau || '';
  if (b.includes('Southern')) return 'Southern';
  if (b.includes('Northern')) return 'Northern';
  if (b.includes('Western')) return 'Western';
  if (b.includes('Eastern')) return 'Eastern';
  if (b.includes('Central')) return 'Central';
  return null;
}

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token is invalid or expired' });
    }
    req.user = user;
    next();
  });
}

// Middleware for optional JWT auth (extracts req.user if token present)
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err && user) {
      req.user = user;
    }
    next();
  });
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid institutional credentials' });
  }

  const isValidPassword = bcrypt.compareSync(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid institutional credentials' });
  }

  const userRegion = getUserRegion(user);
  const tokenPayload = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    bureau: user.bureau,
    region: userRegion,
    designation: user.designation,
    email: user.email
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

  res.json({
    message: 'Authentication successful',
    token,
    user: tokenPayload
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  const user = await db.prepare(`
    SELECT id, username, full_name, role, bureau, designation, email, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User record not found' });
  }

  res.json({ user });
});

// GET /api/auth/demo-users (Hackathon helper to test all 5 roles instantly)
router.get('/demo-users', async (req, res) => {
  const users = await db.prepare(`
    SELECT id, username, full_name, role, bureau, designation, email
    FROM users
    ORDER BY id ASC
  `).all();

  res.json({ users, defaultPassword: 'aicte@2026' });
});

module.exports = {
  router,
  authenticateToken,
  optionalAuth,
  getUserRegion
};
