import { GoalStatus, GoalPriority, GoalCategory, Goal, Quarter } from './types';
import { Colors } from './theme';

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function isOverdue(targetDate: string): boolean {
  return new Date(targetDate) < new Date();
}

export const STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; bg: string }> = {
  not_started: { label: 'Not Started', color: Colors.notStarted, bg: Colors.notStartedBg },
  in_progress: { label: 'In Progress', color: Colors.inProgress, bg: Colors.inProgressBg },
  submitted: { label: 'Pending Review', color: Colors.pending, bg: Colors.pendingBg },
  approved: { label: 'Approved', color: Colors.approved, bg: Colors.approvedBg },
  rejected: { label: 'Rejected', color: Colors.rejected, bg: Colors.rejectedBg },
};

export const PRIORITY_CONFIG: Record<GoalPriority, { label: string; color: string; bg: string }> = {
  high: { label: 'High', color: Colors.high, bg: Colors.highBg },
  medium: { label: 'Medium', color: Colors.medium, bg: Colors.mediumBg },
  low: { label: 'Low', color: Colors.low, bg: Colors.lowBg },
};

export const CATEGORY_CONFIG: Record<GoalCategory, { label: string; color: string }> = {
  technical: { label: 'Technical', color: Colors.technical },
  project_delivery: { label: 'Project Delivery', color: Colors.project_delivery },
  soft_skills: { label: 'Soft Skills', color: Colors.soft_skills },
  learning: { label: 'Learning', color: Colors.learning },
  leadership: { label: 'Leadership', color: Colors.leadership },
};

export const NOTIF_ICONS: Record<string, string> = {
  goal_assigned: '🎯',
  evidence_submitted: '📎',
  evidence_approved: '✅',
  evidence_rejected: '❌',
  goal_adjusted: '✏️',
  fiscal_year_complete: '🏆',
  onboarding_complete: '👋',
};

// Weighted performance score: 0-100
export function calcQuarterScore(goals: Goal[], quarter: Quarter): number {
  const qGoals = goals.filter(g => g.quarter === quarter);
  if (!qGoals.length) return 0;
  const totalWeight = qGoals.reduce((s, g) => s + g.weight, 0);
  if (!totalWeight) return 0;
  const earned = qGoals
    .filter(g => g.status === 'approved' && g.managerRating != null)
    .reduce((s, g) => s + g.weight * (g.managerRating! / 5), 0);
  return Math.round((earned / totalWeight) * 100);
}

export function getGoalStats(goals: Goal[], quarter: Quarter) {
  const q = goals.filter(g => g.quarter === quarter);
  return {
    total: q.length,
    approved: q.filter(g => g.status === 'approved').length,
    submitted: q.filter(g => g.status === 'submitted').length,
    inProgress: q.filter(g => g.status === 'in_progress').length,
    rejected: q.filter(g => g.status === 'rejected').length,
    notStarted: q.filter(g => g.status === 'not_started').length,
  };
}

export function getOverallScore(goals: Goal[]): number {
  const q1 = calcQuarterScore(goals, 'Q1');
  const q2 = calcQuarterScore(goals, 'Q2');
  const q1Goals = goals.filter(g => g.quarter === 'Q1');
  const q2Goals = goals.filter(g => g.quarter === 'Q2');
  if (!q1Goals.length && !q2Goals.length) return 0;
  if (!q1Goals.length) return q2;
  if (!q2Goals.length) return q1;
  return Math.round((q1 + q2) / 2);
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
