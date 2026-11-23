import { Router } from 'express';
import { z } from 'zod';
import { getDB, newId, notify, save } from '../db';
import { auth, HttpError, wrap } from '../http';
import { DIFFICULTIES, SUBJECTS, type Assignment } from '../types';

const router = Router();
const today = () => new Date().toISOString().slice(0, 10);

function withStats(a: Assignment) {
  const subs = getDB().submissions.filter(s => s.assignmentId === a.id);
  const graded = subs.filter(s => s.status === 'graded');
  return {
    ...a,
    submissions: subs.length,
    averagePercent: graded.length ? Math.round(graded.reduce((t, s) => t + (s.obtainedMarks! / s.totalMarks) * 100, 0) / graded.length) : null,
    closed: a.deadline < today(),
  };
}

router.get('/', wrap((req, res) => {
  const q = z.object({
    search: z.string().trim().optional(),
    difficulty: z.enum(DIFFICULTIES).optional(),
    subject: z.enum(SUBJECTS).optional(),
    status: z.enum(['open', 'closed']).optional(),
    sort: z.enum(['newest', 'deadline', 'marks-desc', 'popular']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(9),
  }).parse(req.query);
  let items = getDB().assignments.map(withStats).filter(a =>
    (!q.search || `${a.title} ${a.description} ${a.creatorName}`.toLowerCase().includes(q.search.toLowerCase())) &&
    (!q.difficulty || a.difficulty === q.difficulty) && (!q.subject || a.subject === q.subject) &&
    (!q.status || (q.status === 'closed') === a.closed));
  const sorters = {
    newest: (x: typeof items[0], y: typeof items[0]) => y.createdAt.localeCompare(x.createdAt),
    deadline: (x: typeof items[0], y: typeof items[0]) => Number(x.closed) - Number(y.closed) || x.deadline.localeCompare(y.deadline),
    'marks-desc': (x: typeof items[0], y: typeof items[0]) => y.marks - x.marks,
    popular: (x: typeof items[0], y: typeof items[0]) => y.submissions - x.submissions,
  };
  items = items.sort(sorters[q.sort]);
  const total = items.length;
  res.json({ items: items.slice((q.page - 1) * q.limit, q.page * q.limit), total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) });
}));

router.get('/featured', wrap((_req, res) => {
  const db = getDB();
  const all = db.assignments.map(withStats).filter(a => !a.closed);
  const graded = db.submissions.filter(s => s.status === 'graded');
  res.json({
    featured: all.sort((a, b) => b.submissions - a.submissions || b.marks - a.marks).slice(0, 6),
    stats: { students: db.users.length, assignments: db.assignments.length, submissions: db.submissions.length, graded: graded.length },
  });
}));

router.get('/mine', auth(), wrap((req, res) => {
  res.json({ items: getDB().assignments.filter(a => a.creatorId === req.user!.id).map(withStats).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
}));

router.get('/:id', wrap((req, res) => {
  const a = getDB().assignments.find(x => x.id === req.params.id);
  if (!a) throw new HttpError(404, 'Assignment not found.');
  res.json({ assignment: withStats(a) });
}));

const schema = z.object({
  title: z.string().trim().min(5, 'Title should be at least 5 characters').max(120),
  description: z.string().trim().min(20, 'Describe the assignment in at least 20 characters').max(3000),
  subject: z.enum(SUBJECTS),
  difficulty: z.enum(DIFFICULTIES),
  marks: z.coerce.number().int().min(1).max(1000),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a deadline'),
  thumbnail: z.string().trim().url('Thumbnail must be a URL').or(z.literal('')).optional(),
});

router.post('/', auth(), wrap((req, res) => {
  const body = schema.parse(req.body);
  if (body.deadline < today()) throw new HttpError(400, 'Deadline must be today or later.');
  const a: Assignment = { ...body, thumbnail: body.thumbnail || undefined, id: newId(), creatorId: req.user!.id, creatorName: req.user!.name, createdAt: new Date().toISOString() };
  getDB().assignments.push(a);
  save();
  res.status(201).json({ assignment: a });
}));

function own(id: string, userId: string) {
  const a = getDB().assignments.find(x => x.id === id);
  if (!a) throw new HttpError(404, 'Assignment not found.');
  if (a.creatorId !== userId) throw new HttpError(403, 'Only the person who created this assignment can change it.');
  return a;
}

router.patch('/:id', auth(), wrap((req, res) => {
  const a = own(String(req.params.id), req.user!.id);
  const body = schema.partial().parse(req.body);
  const hasGraded = getDB().submissions.some(s => s.assignmentId === a.id && s.status === 'graded');
  if (body.marks !== undefined && body.marks !== a.marks && hasGraded) throw new HttpError(409, 'Total marks cannot change after submissions have been graded.');
  Object.assign(a, body, { thumbnail: body.thumbnail === undefined ? a.thumbnail : body.thumbnail || undefined });
  getDB().submissions.filter(s => s.assignmentId === a.id).forEach(s => { s.assignmentTitle = a.title; s.totalMarks = a.marks; });
  save();
  res.json({ assignment: a });
}));

router.delete('/:id', auth(), wrap((req, res) => {
  const a = own(String(req.params.id), req.user!.id);
  const db = getDB();
  const subs = db.submissions.filter(s => s.assignmentId === a.id);
  subs.forEach(s => notify(s.studentId, `“${a.title}” was deleted by ${a.creatorName}. Your submission was removed.`));
  db.submissions = db.submissions.filter(s => s.assignmentId !== a.id);
  db.assignments = db.assignments.filter(x => x.id !== a.id);
  save();
  res.json({ ok: true, removedSubmissions: subs.length });
}));

export default router;
