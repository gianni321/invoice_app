const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock user data (replace with database in production)
const TEAM = [
  { id: 1, name: 'John Smith', rate: 75, pin: '1234' },
  { id: 2, name: 'Sarah Johnson', rate: 85, pin: '5678' },
  { id: 3, name: 'Mike Chen', rate: 70, pin: '9012' },
];

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { pin } = req.body;

  try {
    // Check for admin
    if (pin === '0000') {
      const token = jwt.sign(
        { id: 0, name: 'Admin', isAdmin: true },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({ token });
    }

    // Check for team member
    const user = TEAM.find(t => t.pin === pin);
    if (!user) {
      return res.status(400).json({ message: 'Invalid PIN' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, rate: user.rate, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;