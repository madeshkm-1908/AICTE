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

// POST /api/auth/login (Official Login)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = await db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid institutional credentials' });
  }

  // Security guard: Complainants cannot login via official login
  if (user.role === 'Complainant') {
    return res.status(403).json({ 
      error: 'Access Denied: Complainant accounts must sign in through the Citizen Grievance Portal.' 
    });
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

// POST /api/auth/complainant/register (Public citizen registration)
router.post('/complainant/register', async (req, res) => {
  try {
    const { name, full_name, email, mobile, password, complainant_type } = req.body;
    const resolvedName = (name || full_name || '').trim();
    const resolvedEmail = (email || '').trim().toLowerCase();
    const resolvedMobile = (mobile || '').trim();
    const resolvedType = (complainant_type || 'Student').trim();

    if (!resolvedName || resolvedName.length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters long.' });
    }
    if (!resolvedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedEmail)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!resolvedMobile || !/^\+?[0-9\s-]{10,15}$/.test(resolvedMobile)) {
      return res.status(400).json({ error: 'A valid 10-digit mobile number is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    const validTypes = ['Student', 'Faculty', 'Parent', 'Other'];
    if (!validTypes.includes(resolvedType)) {
      return res.status(400).json({ error: `Complainant type must be one of: ${validTypes.join(', ')}` });
    }

    // Check if email or username already registered
    const existing = await db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(resolvedEmail, resolvedEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please log in.' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    let newUser = null;

    if (db.isPostgres) {
      const insertRes = await db.pool.query(`
        INSERT INTO users (username, password_hash, full_name, role, bureau, designation, email, mobile)
        VALUES ($1, $2, $3, 'Complainant', 'Public Complainant', $4, $5, $6)
        RETURNING id, username, full_name, role, bureau, designation, email, mobile
      `, [resolvedEmail, password_hash, resolvedName, resolvedType, resolvedEmail, resolvedMobile]);
      newUser = insertRes.rows[0];
    } else {
      const runRes = db.prepare(`
        INSERT INTO users (username, password_hash, full_name, role, bureau, designation, email, mobile)
        VALUES (?, ?, ?, 'Complainant', 'Public Complainant', ?, ?, ?)
      `).run(resolvedEmail, password_hash, resolvedName, resolvedType, resolvedEmail, resolvedMobile);
      newUser = {
        id: runRes.lastInsertRowid,
        username: resolvedEmail,
        full_name: resolvedName,
        role: 'Complainant',
        bureau: 'Public Complainant',
        designation: resolvedType,
        email: resolvedEmail,
        mobile: resolvedMobile
      };
    }

    const tokenPayload = {
      id: newUser.id,
      username: newUser.username,
      full_name: newUser.full_name,
      role: newUser.role,
      bureau: newUser.bureau,
      designation: newUser.designation,
      email: newUser.email,
      mobile: newUser.mobile
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

    res.status(201).json({
      message: 'Registration successful! You may now track and submit complaints.',
      token,
      user: tokenPayload
    });
  } catch (err) {
    console.error('Error during complainant registration:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/complainant/login (Citizen Grievance Portal Login)
router.post('/complainant/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || '').trim().toLowerCase();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required.' });
    }

    const user = await db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(identifier, identifier);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. Please verify your email and password.' });
    }

    // Role verification: Officials cannot login via Complainant login
    if (user.role !== 'Complainant') {
      return res.status(403).json({ 
        error: 'Official AICTE Staff accounts must log in via the Official Login portal.' 
      });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials. Please verify your email and password.' });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      bureau: user.bureau,
      designation: user.designation,
      email: user.email,
      mobile: user.mobile
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

    res.json({
      message: 'Complainant login successful',
      token,
      user: tokenPayload
    });
  } catch (err) {
    console.error('Error during complainant login:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
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

// Middleware to enforce Official role (Complainant rejected with 403)
function requireOfficial(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  if (req.user.role === 'Complainant') {
    return res.status(403).json({ 
      error: 'Access Denied: Complainant accounts are restricted from accessing official bureau resources.' 
    });
  }
  next();
}

// Middleware to enforce Complainant role (Officials rejected with 403)
function requireComplainant(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  if (req.user.role !== 'Complainant') {
    return res.status(403).json({ 
      error: 'Access Denied: Only citizen complainant accounts can access this portal resource.' 
    });
  }
  next();
}

module.exports = {
  router,
  authenticateToken,
  optionalAuth,
  getUserRegion,
  requireOfficial,
  requireComplainant
};
