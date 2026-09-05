import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import url from 'url';
import fs from 'fs';

import authRoute from './routes/auth.js';
import homeRoute from './routes/home.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler, notFound, rateLimit } from './middleware/validate.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Support both .env and legacy env.env
for (const f of ['.env', 'env.env']) {
  const p = path.join(__dirname, f);
  if (fs.existsSync(p)) dotenv.config({ path: p });
}
dotenv.config();

const app = express();
const uri = process.env.MONGO_URI;
const port = Number(process.env.PORT) || 5000;

app.disable('x-powered-by');
app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowed = (process.env.CORS_ORIGIN || 'http://localhost:4200,http://127.0.0.1:4200')
        .split(',')
        .map((s) => s.trim());
      if (allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 60_000, max: 300 }));

app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

app.use('/auth', authRoute);
app.use('/home', authMiddleware, homeRoute);

app.use(notFound);
app.use(errorHandler);

if (uri) {
  mongoose
    .connect(uri)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.log('MongoDB error:', err?.message || err));
} else {
  console.log('MONGO_URI not set - running without DB (set server/.env)');
}

app.listen(port, () => {
  console.log(`Server is running at port: ${port}`);
});
