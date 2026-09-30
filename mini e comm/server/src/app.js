import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use((_req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
app.use((error, _req, res, _next) => {
  console.error('API error:', error.message);
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed.',
      errors: Object.values(error.errors).map((item) => ({ field: item.path, location: 'body', msg: item.message })),
    });
  }
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid resource ID.' });
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
});

export default app;