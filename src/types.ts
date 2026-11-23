// Everyone is a "student" (friends studying together). `role` is kept so the
// shared auth helpers work; there is no admin in EduFlow.
export type Role = 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  isBlocked: boolean;
  bio?: string;
  createdAt: string;
}

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const SUBJECTS = ['Programming', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History'] as const;
export type Subject = (typeof SUBJECTS)[number];

export interface Assignment {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  subject: Subject;
  difficulty: Difficulty;
  marks: number;
  deadline: string; // YYYY-MM-DD
  thumbnail?: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  totalMarks: number;
  creatorId: string;
  studentId: string;
  studentName: string;
  link: string;
  note: string;
  status: 'pending' | 'graded';
  obtainedMarks?: number;
  feedback?: string;
  gradedById?: string;
  gradedByName?: string;
  createdAt: string;
  gradedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface DB {
  users: User[];
  assignments: Assignment[];
  submissions: Submission[];
  notifications: Notification[];
}

export type PublicUser = Omit<User, 'passwordHash'>;
