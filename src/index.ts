import express from 'express';
import cors from 'cors';
import { loadDB } from './db';
import { errorHandler, HttpError } from './http';
import authRoutes from './routes/auth';
import assignmentRoutes from './routes/assignments';
import submissionRoutes from './routes/submissions';

loadDB();

const app = express();
app.use(cors({ origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/] }));
app.use(express.json({ limit: '200kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Endpoint not found.')));
app.use(errorHandler);

const port = Number(process.env.PORT ?? 5080);
app.listen(port, '127.0.0.1', () => console.log(`EduFlow API on http://localhost:${port}`));
