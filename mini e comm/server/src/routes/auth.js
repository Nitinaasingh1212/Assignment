import { createHash, timingSafeEqual } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import User from '../models/User.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();
const refreshCookie = 'fieldwork_refresh';
const refreshLifetime = 7 * 24 * 60 * 60 * 1000;
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: refreshLifetime,
  path: '/api/auth',
});

function publicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function tokenMatches(token, savedHash) {
  if (!savedHash) return false;
  const candidate = Buffer.from(hashToken(token), 'hex');
  const saved = Buffer.from(savedHash, 'hex');
  return candidate.length === saved.length && timingSafeEqual(candidate, saved);
}

function issueAccessToken(userId) {
  return jwt.sign({ sub: userId.toString(), jti: randomUUID() }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

function issueRefreshToken(userId) {
  return jwt.sign({ sub: userId.toString(), type: 'refresh' }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}

async function rotateRefreshToken(user, res) {
  const refreshToken = issueRefreshToken(user._id);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  res.cookie(refreshCookie, refreshToken, cookieOptions());
}

router.post('/register', [
  body('name').isString().trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2 to 60 characters.'),
  body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 }).withMessage('Password must be at least 8 characters and include an uppercase letter, lowercase letter, and number.'),
  body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match.'),
  validateRequest,
], async (req, res, next) => {
  try {
    const password = await bcrypt.hash(req.body.password, 12);
    const user = await User.create({ name: req.body.name, email: req.body.email, password });
    return res.status(201).json({ message: 'Account created.', user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    return next(error);
  }
});

router.post('/login', [
  body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required.'),
  validateRequest,
], async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email }).select('+password +refreshTokenHash');
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    await rotateRefreshToken(user, res);
    return res.json({ accessToken: issueAccessToken(user._id), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/refresh-token', async (req, res, next) => {
  const token = req.cookies[refreshCookie];
  if (!token) return res.status(401).json({ message: 'Please sign in again.' });
  try {
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    if (payload.type !== 'refresh') return res.status(401).json({ message: 'Refresh token is invalid.' });
    const user = await User.findById(payload.sub).select('+refreshTokenHash');
    if (!user || !tokenMatches(token, user.refreshTokenHash)) {
      if (user?.refreshTokenHash) {
        user.refreshTokenHash = null;
        await user.save();
      }
      res.clearCookie(refreshCookie, { ...cookieOptions(), maxAge: undefined });
      return res.status(401).json({ message: 'Refresh token has expired or been revoked. Please sign in again.' });
    }
    await rotateRefreshToken(user, res);
    return res.json({ accessToken: issueAccessToken(user._id), user: publicUser(user) });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.clearCookie(refreshCookie, { ...cookieOptions(), maxAge: undefined });
      return res.status(401).json({ message: 'Refresh token is invalid or expired. Please sign in again.' });
    }
    return next(error);
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    req.user.refreshTokenHash = null;
    await req.user.save();
    res.clearCookie(refreshCookie, { ...cookieOptions(), maxAge: undefined });
    return res.json({ message: 'Signed out.' });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

export default router;