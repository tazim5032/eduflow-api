import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { Assignment, DB, Submission, User } from './types';

// Two demo students so you can grade each other's work; the login page has buttons for them.
export const DEMO_ACCOUNTS = {
  ayesha: { name: 'Ayesha Siddiqua', email: 'ayesha@eduflow.test', password: 'StudyDemo#2026' },
  rahim: { name: 'Rahim Uddin', email: 'rahim@eduflow.test', password: 'StudyDemo#2026' },
};

const id = () => crypto.randomUUID();
const ago = (d: number, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString();
const inDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

export function buildSeed(): DB {
  const demoHash = bcrypt.hashSync(DEMO_ACCOUNTS.ayesha.password, 10);
  const mk = (name: string, email: string, days: number, bio: string, hash?: string): User =>
    ({ id: id(), name, email, passwordHash: hash ?? bcrypt.hashSync(crypto.randomBytes(12).toString('hex'), 10), role: 'student', isBlocked: false, bio, createdAt: ago(days) });
  const ayesha = mk(DEMO_ACCOUNTS.ayesha.name, DEMO_ACCOUNTS.ayesha.email, 120, 'CSE student who loves algorithms.', demoHash);
  const rahim = mk(DEMO_ACCOUNTS.rahim.name, DEMO_ACCOUNTS.rahim.email, 110, 'Physics enthusiast and coffee drinker.', demoHash);
  const nadia = mk('Nadia Karim', 'nadia@example.test', 100, 'Preparing for university admission.');
  const imran = mk('Imran Hossain', 'imran@example.test', 90, 'Learning web development.');
  const sadia = mk('Sadia Rahman', 'sadia@example.test', 60, 'Biology and chemistry tutor.');
  const users = [ayesha, rahim, nadia, imran, sadia];

  const a = (u: User, title: string, subject: Assignment['subject'], difficulty: Assignment['difficulty'], marks: number, deadlineIn: number, created: number, description: string): Assignment =>
    ({ id: id(), creatorId: u.id, creatorName: u.name, title, subject, difficulty, marks, deadline: inDays(deadlineIn), createdAt: ago(created), description });

  const as: Assignment[] = [
    a(ayesha, 'Implement binary search and analyse its complexity', 'Programming', 'Medium', 50, 6, 12, 'Write an iterative and a recursive binary search in any language. Explain the time and space complexity of each, and include test cases for edge cases such as empty arrays and missing values.'),
    a(rahim, "Newton's laws: five real-world problems", 'Physics', 'Easy', 30, 4, 10, 'Solve the five problems in the attached sheet using free-body diagrams. Show every step and state which law you apply.'),
    a(nadia, 'Integration by parts: practice set', 'Mathematics', 'Hard', 60, 9, 9, 'Solve ten integrals using integration by parts and the tabular method. Mark which ones needed a substitution first.'),
    a(imran, 'Build a responsive pricing card with CSS Grid', 'Programming', 'Easy', 25, 3, 8, 'Recreate a three-column pricing section that collapses to one column on mobile. Share a CodePen or GitHub link.'),
    a(sadia, 'Balance 15 redox equations', 'Chemistry', 'Medium', 40, 7, 7, 'Balance the given redox equations in acidic and basic media using the half-reaction method.'),
    a(ayesha, 'Essay: the impact of the printing press', 'History', 'Medium', 40, 12, 6, 'Write a 600-word essay on how the printing press changed education and religion in Europe. Cite at least two sources.'),
    a(rahim, 'Projectile motion lab report', 'Physics', 'Hard', 50, 2, 15, 'Using the provided data, calculate launch velocity and compare theoretical and measured range. Discuss sources of error.'),
    a(sadia, 'Cell organelles concept map', 'Biology', 'Easy', 20, 5, 5, 'Create a concept map linking each organelle to its function and to at least one disease related to its malfunction.'),
    a(nadia, 'Argumentative writing: school uniforms', 'English', 'Easy', 20, 8, 4, 'Write a 400-word argumentative piece for or against school uniforms with a clear thesis and a counter-argument.'),
    a(imran, 'REST API design review', 'Programming', 'Hard', 50, 10, 3, 'Design endpoints for a library system (books, members, loans). Include status codes, validation and pagination.'),
    a(ayesha, 'Probability with dice and cards', 'Mathematics', 'Medium', 30, -2, 20, 'Solve the probability problems in the sheet. Show sample spaces and explain each step.'),
  ];

  const s = (asg: Assignment, u: User, days: number, link: string, note: string, grade?: { marks: number; feedback: string; by: User }): Submission => ({
    id: id(), assignmentId: asg.id, assignmentTitle: asg.title, totalMarks: asg.marks, creatorId: asg.creatorId,
    studentId: u.id, studentName: u.name, link, note, createdAt: ago(days, 2),
    status: grade ? 'graded' : 'pending',
    obtainedMarks: grade?.marks, feedback: grade?.feedback, gradedById: grade?.by.id, gradedByName: grade?.by.name, gradedAt: grade ? ago(Math.max(days - 1, 0)) : undefined,
  });

  const pdf = '/samples/sample-submission.pdf'; // served by the web app, so the grading preview can embed it
  const submissions: Submission[] = [
    s(as[1], ayesha, 6, pdf, 'All five problems with diagrams.', { marks: 27, feedback: 'Clear diagrams. Problem 4 is missing friction.', by: rahim }),
    s(as[10], ayesha, 18, pdf, 'Includes sample spaces.', { marks: 28, feedback: 'Excellent reasoning throughout.', by: nadia }),
    s(as[3], ayesha, 4, 'https://codepen.io/', 'CodePen link, works down to 320px.'),
    s(as[0], rahim, 5, 'https://github.com/', 'Both versions in Python with tests.'),
    s(as[5], rahim, 2, pdf, 'Essay with three sources.'),
    s(as[10], rahim, 17, pdf, 'Some answers need checking.', { marks: 19, feedback: 'Good start; question 6 confuses independent and mutually exclusive events.', by: ayesha }),
    s(as[0], nadia, 4, 'https://github.com/', 'Java implementation.', { marks: 44, feedback: 'Great tests. Mention the overflow-safe midpoint.', by: ayesha }),
    s(as[2], imran, 3, pdf, 'Ten integrals solved.'),
    s(as[4], nadia, 3, pdf, 'All 15 balanced.', { marks: 36, feedback: 'Two coefficients off in basic medium.', by: sadia }),
    s(as[6], sadia, 10, pdf, 'Lab report with error analysis.', { marks: 41, feedback: 'Solid analysis; graph axes need units.', by: rahim }),
    s(as[7], imran, 2, pdf, 'Concept map as PDF.'),
    s(as[8], ayesha, 1, 'https://docs.google.com/', 'Against uniforms.'),
    s(as[6], ayesha, 11, pdf, 'Report attached.', { marks: 46, feedback: 'Very thorough. Nicely compared with theory.', by: rahim }),
  ];

  const notifications: DB['notifications'] = [
    { id: id(), userId: ayesha.id, message: `Rahim Uddin graded “${as[1].title}”: 27/30.`, link: '/dashboard/submissions', read: false, createdAt: ago(5) },
    { id: id(), userId: ayesha.id, message: `Rahim Uddin submitted “${as[0].title}”.`, link: '/dashboard/grade', read: false, createdAt: ago(5) },
    { id: id(), userId: rahim.id, message: `Ayesha Siddiqua graded “${as[10].title}”: 19/30.`, link: '/dashboard/submissions', read: false, createdAt: ago(16) },
  ];

  return { users, assignments: as, submissions, notifications };
}
