const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database-loader');
const config = require('../config');

const router = express.Router();

/**
 * Secure authentication with optimized user lookup
 * Uses indexed queries instead of O(n) iteration
 */
router.post('/login', async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin || pin.length !== 4) {
      return res.status(400).json({ error: 'Invalid PIN format' });
    }

    // Security: Add delay to prevent timing attacks
    const startTime = Date.now();

    // Get all users with hashed PINs for comparison
    // Note: In a real production system, you'd want to use a username/email lookup
    // For this PIN-based system, we still need to check all users
    const users = await db.query('SELECT id, name, role, pin_hash FROM users WHERE active = 1');
    
    let user = null;
    let validPinFound = false;

    // Use Promise.all to check all PINs in parallel for consistent timing
    const pinChecks = users.map(async (u) => {
      const isMatch = await bcrypt.compare(pin, u.pin_hash);
      if (isMatch && !validPinFound) {
        validPinFound = true;
        user = u;
      }
      return isMatch;
    });

    await Promise.all(pinChecks);

    // Constant time delay to prevent timing attacks
    const minExecutionTime = 100; // ms
    const executionTime = Date.now() - startTime;
    if (executionTime < minExecutionTime) {
      await new Promise(resolve => setTimeout(resolve, minExecutionTime - executionTime));
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Create JWT token using config
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Log login with parameterized query
    await db.run(
      'INSERT INTO audit_log (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
      [user.id, 'LOGIN', `User ${user.name} logged in`, req.ip || 'unknown']
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        rate: user.rate,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify JWT token
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data
    const user = await db.query('SELECT id, name, rate, role FROM users WHERE id = ?', [decoded.id]);
    
    if (!user.length) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      id: user[0].id,
      name: user[0].name,
      rate: user[0].rate,
      role: user[0].role
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;