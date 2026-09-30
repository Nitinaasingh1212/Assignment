import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

for (const name of ['MONGODB_URI', 'ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET']) {
  if (!process.env[name]) throw new Error(`${name} must be set in server/.env`);
}

const port = Number(process.env.PORT) || 4000;

try {
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => console.log(`Fieldwork API listening on http://localhost:${port}`));
} catch (error) {
  console.error('Could not connect to MongoDB:', error.message);
  process.exit(1);
}