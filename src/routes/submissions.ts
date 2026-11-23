import { Router } from 'express';
import { z } from 'zod';
import { getDB, newId, notify, save } from '../db';
import { auth, HttpError, wrap } from '../http';
import type { Submission } from '../types';

const router = Router();

router.post('/', auth(), wrap((req, res) => {
  const body = z.object({
    assignmentId: z.string().min(1),
    link: z.string().trim().url('Share a link to your work (PDF, Google Doc, GitHub…)'),
    note: z.string().trim().max(1000).default(''),
  }).parse(req.body);
  const db = getDB();
  const a = db.assignments.find(x => x.id === body.assignmentId);
  if (!a) throw new HttpError(404, 'Assignment not found.');
  if (a.deadline < new Date().toISOString().slice(0, 10)) throw new HttpError(409, 'The deadline for this assignment has passed.');
  const me = req.user!;
  if (a.creatorId === me.id) throw new HttpError(409, "You can't submit your own assignment.");
  if (db.submissions.some(s => s.assignmentId === a.id && s.studentId === me.id)) throw new HttpError(409, 'You have already submitted this assignment.');
  const sub: Submission = {
    id: newId(), assignmentId: a.id, assignmentTitle: a.title, totalMarks: a.marks, creatorId: a.creatorId,
    studentId: me.id, studentName: me.name, link: body.link, note: body.note, status: 'pending', createdAt: new Date().toISOString(),
  };
  db.submissions.push(sub);
  notify(a.creatorId, `${me.name} submitted “${a.title}”.`, '/dashboard/grade');
  save();
  res.status(201).json({ submission: sub });
}));

router.get('/mine', auth(), wrap((req, res) => {
  res.json({ items: getDB().submissions.filter(s => s.studentId === req.user!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
}));

// Peer grading queue: every pending submission except your own. Ones on your assignments come first.
router.get('/to-grade', auth(), wrap((req, res) => {
  const me = req.user!.id;
  const items = getDB().submissions.filter(s => s.status === 'pending' && s.studentId !== me)
    .sort((a, b) => Number(b.creatorId === me) - Number(a.creatorId === me) || a.createdAt.localeCompare(b.createdAt));
  res.json({ items: items.map(s => ({ ...s, onMyAssignment: s.creatorId === me })) });
}));

router.get('/graded-by-me', auth(), wrap((req, res) => {
  res.json({ items: getDB().submissions.filter(s => s.gradedById === req.user!.id).sort((a, b) => (b.gradedAt ?? '').localeCompare(a.gradedAt ?? '')) });
}));

router.post('/:id/grade', auth(), wrap((req, res) => {
  const db = getDB();
  const sub = db.submissions.find(s => s.id === req.params.id);
  if (!sub) throw new HttpError(404, 'Submission not found.');
  const me = req.user!;
  if (sub.studentId === me.id) throw new HttpError(403, "You can't grade your own submission.");
  if (sub.status === 'graded') throw new HttpError(409, `Already graded by ${sub.gradedByName}.`);
  const body = z.object({
    obtainedMarks: z.coerce.number().min(0).max(sub.totalMarks, `Marks can't exceed ${sub.totalMarks}`),
    feedback: z.string().trim().min(5, 'Write a little feedback to help them improve').max(1000),
  }).parse(req.body);
  Object.assign(sub, { status: 'graded', obtainedMarks: body.obtainedMarks, feedback: body.feedback, gradedById: me.id, gradedByName: me.name, gradedAt: new Date().toISOString() });
  notify(sub.studentId, `${me.name} graded “${sub.assignmentTitle}”: ${body.obtainedMarks}/${sub.totalMarks}.`, '/dashboard/submissions');
  save();
  res.json({ submission: sub });
}));

// Dashboard summary for the signed-in student.
router.get('/summary', auth(), wrap((req, res) => {
  const db = getDB();
  const me = req.user!.id;
  const mine = db.submissions.filter(s => s.studentId === me);
  const graded = mine.filter(s => s.status === 'graded');
  res.json({
    created: db.assignments.filter(a => a.creatorId === me).length,
    submitted: mine.length,
    pending: mine.length - graded.length,
    averagePercent: graded.length ? Math.round(graded.reduce((t, s) => t + (s.obtainedMarks! / s.totalMarks) * 100, 0) / graded.length) : null,
    toGrade: db.submissions.filter(s => s.status === 'pending' && s.studentId !== me).length,
    gradedByMe: db.submissions.filter(s => s.gradedById === me).length,
    recentGrades: graded.sort((a, b) => (b.gradedAt ?? '').localeCompare(a.gradedAt ?? '')).slice(0, 5),
  });
}));

router.get('/notifications/list', auth(), wrap((req, res) => {
  const list = getDB().notifications.filter(n => n.userId === req.user!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
  res.json({ notifications: list, unread: list.filter(n => !n.read).length });
}));
router.post('/notifications/read', auth(), wrap((req, res) => {
  getDB().notifications.filter(n => n.userId === req.user!.id).forEach(n => { n.read = true; });
  save();
  res.json({ ok: true });
}));

export default router;
