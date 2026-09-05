import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler, validateCurrency, validateEmail } from '../middleware/validate.js';

const router = express.Router();

function signToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw Object.assign(new Error('JWT_SECRET not configured'), { status: 500 });
  return jwt.sign({ userId }, secret, { expiresIn: '24h' });
}

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const isValid = await bcrypt.compare(String(password), user.password);
    if (!isValid) return res.status(400).json({ message: 'Invalid credentials' });
    const token = signToken(user._id);
    res.status(200).json({ message: 'Success', token, userId: user._id, currency: user.currency });
  })
);

router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const name = String(req.body.name || '').trim();
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }
    if (!validateEmail(email)) return res.status(400).json({ message: 'Invalid email' });
    if (name.length < 2) return res.status(400).json({ message: 'Name too short' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be 6+ chars' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });
    const hashed = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashed, name, currency: 'USD', budget: 0 });
    res.status(201).json({ message: 'Success' });
  })
);

// ---- Protected routes below ----
router.use(authMiddleware);

function checkSelf(req, res, next) {
  const bodyId = req.body.userId;
  if (bodyId && String(bodyId) !== String(req.userId)) {
    return res.status(403).json({ message: 'Forbidden: user mismatch' });
  }
  next();
}

router.patch(
  '/update/profile',
  checkSelf,
  asyncHandler(async (req, res) => {
    const updatePayload = {};
    if (typeof req.body.name === 'string' && req.body.name.trim()) {
      const n = req.body.name.trim().slice(0, 50);
      if (n.length < 2) return res.status(400).json({ message: 'Name too short' });
      updatePayload.name = n;
    }
    if (typeof req.body.currency === 'string' && req.body.currency.trim()) {
      if (!validateCurrency(req.body.currency)) {
        return res.status(400).json({ message: 'Currency must be a 3-letter code' });
      }
      updatePayload.currency = req.body.currency.trim().toUpperCase();
    }
    if (req.body.budget !== undefined && req.body.budget !== null && req.body.budget !== '') {
      const b = Number(req.body.budget);
      if (!Number.isFinite(b) || b < 0) return res.status(400).json({ message: 'Invalid budget' });
      updatePayload.budget = b;
    }
    if (req.body.rolloverEnabled !== undefined) {
      updatePayload.rolloverEnabled = !!req.body.rolloverEnabled;
    }
    if (req.body.savingsLabel !== undefined) {
      updatePayload.savingsLabel = String(req.body.savingsLabel || '').trim().slice(0, 60);
    }
    if (req.body.savingsTarget !== undefined && req.body.savingsTarget !== null && req.body.savingsTarget !== '') {
      const t = Number(req.body.savingsTarget);
      if (!Number.isFinite(t) || t < 0) return res.status(400).json({ message: 'Invalid savings target' });
      updatePayload.savingsTarget = t;
    }
    if (req.body.savingsDeadline !== undefined) {
      if (req.body.savingsDeadline === null || req.body.savingsDeadline === '') {
        updatePayload.savingsDeadline = undefined;
      } else {
        const d = new Date(req.body.savingsDeadline);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid savings deadline' });
        updatePayload.savingsDeadline = d;
      }
    }
    if (!Object.keys(updatePayload).length) {
      return res.status(400).json({ message: 'No profile fields to update' });
    }
    const user = await User.findByIdAndUpdate(req.userId, updatePayload, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({
      message: 'Success',
      data: {
        name: user.name,
        currency: user.currency,
        budget: user.budget,
        rolloverEnabled: !!user.rolloverEnabled,
        savingsLabel: user.savingsLabel || '',
        savingsTarget: user.savingsTarget ?? 0,
        savingsDeadline: user.savingsDeadline ? user.savingsDeadline.toISOString().slice(0, 10) : '',
      },
    });
  })
);

router.patch(
  '/update/password',
  checkSelf,
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be 6+ chars' });
    }
    const hashedPassword = await bcrypt.hash(String(password), 10);
    const user = await User.findByIdAndUpdate(req.userId, { password: hashedPassword }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ message: 'Success' });
  })
);

router.patch(
  '/update/email',
  checkSelf,
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Please enter all fields' });
    if (!validateEmail(email)) return res.status(400).json({ message: 'Invalid email' });
    const existing = await User.findOne({ email });
    if (existing && String(existing._id) !== String(req.userId)) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    const user = await User.findByIdAndUpdate(req.userId, { email }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ message: 'Success', data: { email: user.email } });
  })
);

router.get(
  '/profile/:userId',
  asyncHandler(async (req, res) => {
    if (String(req.params.userId) !== String(req.userId)) {
      return res.status(403).json({ message: 'Forbidden: user mismatch' });
    }
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({
      message: 'Success',
      data: {
        name: user.name,
        email: user.email,
        currency: user.currency,
        budget: user.budget ?? 0,
        rolloverEnabled: !!user.rolloverEnabled,
        savingsLabel: user.savingsLabel || '',
        savingsTarget: user.savingsTarget ?? 0,
        savingsDeadline: user.savingsDeadline ? new Date(user.savingsDeadline).toISOString().slice(0, 10) : '',
      },
    });
  })
);

router.delete(
  '/account/:userId',
  asyncHandler(async (req, res) => {
    if (String(req.params.userId) !== String(req.userId)) {
      return res.status(403).json({ message: 'Forbidden: user mismatch' });
    }
    const { default: Data } = await import('../models/Data.js');
    await Data.deleteMany({ userId: req.userId });
    await User.findByIdAndDelete(req.userId);
    return res.status(200).json({ message: 'Success' });
  })
);

export default router;
