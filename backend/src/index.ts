import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import roboflowRouter from './routes/roboflow';
import redmineRouter from './routes/redmine';
import authRouter from './routes/auth';
import { requireAuth } from './middleware/auth';

const app: Application = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

// ---- Middleware ----

// Enable CORS for all origins. Adjust origin in production.
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Redmine-API-Key'],
  })
);

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ---- Routes ----

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes: /api/auth/... (provision endpoint)
app.use('/api/auth', authRouter);

// Roboflow routes: /api/roboflow/...
app.use('/api/roboflow', requireAuth, roboflowRouter);

// Redmine routes: /api/redmine/...
app.use('/api/redmine', requireAuth, redmineRouter);

// ---- 404 Handler ----
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// ---- Global Error Handler ----
// Must be declared with four parameters for Express to recognise it as an error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Roboflow API:  http://localhost:${PORT}/api/roboflow`);
  console.log(`Redmine API:   http://localhost:${PORT}/api/redmine`);
});

export default app;
