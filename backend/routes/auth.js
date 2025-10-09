const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database-loader');

const router = express.Router();

// Login with PIN
router.post('/login', async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin || pin.length !== 4) {
      return res.status(400).json({ error: 'Invalid PIN format' });
    }

    // Find all users and check PIN
    const users = await db.query('SELECT * FROM users');
    let user = null;

    for (const u of users) {
      const isMatch = await bcrypt.compare(pin, u.pin_hash);
      if (isMatch) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Log login
    await db.run(
      'INSERT INTO audit_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [user.id, 'LOGIN', `User ${user.name} logged in`, req.ip]
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