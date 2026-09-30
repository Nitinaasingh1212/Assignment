import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function authenticate(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'A valid access token is required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'Your session is no longer valid.' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
}