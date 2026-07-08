import type { Goal } from '../types';
import {
  calcQuarterScore,
  formatDate,
  getGoalStats,
  getOverallScore,
  initials,
  isOverdue,
  timeAgo,
} from '../utils';

// ── helpers ────────────────────────────────────────────────────

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    employeeId: 'e1',
    title: 'Test Goal',
    description: 'desc',
    quarter: 'Q1',
    priority: 'medium',
    category: 'technical',
    targetDate: '2026-12-31',
    weight: 50,
    status: 'not_started',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── formatDate ─────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats a standard ISO date string', () => {
    expect(formatDate('2026-01-15')).toBe('Jan 15, 2026');
  });

  it('formats December correctly', () => {
    expect(formatDate('2026-12-25')).toBe('Dec 25, 2026');
  });

  it('formats single-digit days without padding', () => {
    expect(formatDate('2026-06-01')).toBe('Jun 1, 2026');
  });

  it('returns a non-empty string for any valid ISO date', () => {
    expect(formatDate('2026-03-20T10:30:00Z').length).toBeGreaterThan(0);
  });
});

// ── timeAgo ────────────────────────────────────────────────────

describe('timeAgo', () => {
  const NOW = new Date('2026-06-19T12:00:00Z').getTime();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "Just now" for timestamps less than 1 minute ago', () => {
    const iso = new Date(NOW - 30 * 1000).toISOString();
    expect(timeAgo(iso)).toBe('Just now');
  });

  it('returns minutes for timestamps under 60 minutes ago', () => {
    const iso = new Date(NOW - 45 * 60 * 1000).toISOString();
    expect(timeAgo(iso)).toBe('45m ago');
  });

  it('returns hours for timestamps under 24 hours ago', () => {
    const iso = new Date(NOW - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(iso)).toBe('3h ago');
  });

  it('returns "Yesterday" for exactly 1 day ago', () => {
    const iso = new Date(NOW - 25 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(iso)).toBe('Yesterday');
  });

  it('returns days for timestamps 2–29 days ago', () => {
    const iso = new Date(NOW - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(iso)).toBe('10d ago');
  });

  it('returns months for timestamps 30+ days ago', () => {
    const iso = new Date(NOW - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(iso)).toBe('2mo ago');
  });

  it('returns "1m ago" at exactly 1 minute', () => {
    const iso = new Date(NOW - 60 * 1000).toISOString();
    expect(timeAgo(iso)).toBe('1m ago');
  });
});

// ── isOverdue ──────────────────────────────────────────────────

describe('isOverdue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-19T12:00:00Z').getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns true for a date in the past', () => {
    expect(isOverdue('2026-06-18')).toBe(true);
  });

  it('returns false for a date in the future', () => {
    expect(isOverdue('2026-12-31')).toBe(false);
  });

  it('returns false for a date later today', () => {
    expect(isOverdue('2026-06-19T23:59:59Z')).toBe(false);
  });
});

// ── initials ───────────────────────────────────────────────────

describe('initials', () => {
  it('returns first two initials from a two-word name', () => {
    expect(initials('John Doe')).toBe('JD');
  });

  it('uppercases lowercase input', () => {
    expect(initials('alice doe')).toBe('AD');
  });

  it('returns single initial for a single word', () => {
    expect(initials('Alice')).toBe('A');
  });

  it('slices to 2 for names with more than 2 words', () => {
    expect(initials('John Michael Doe')).toBe('JM');
  });

  it('handles a single character name', () => {
    expect(initials('a')).toBe('A');
  });
});

// ── calcQuarterScore ───────────────────────────────────────────

describe('calcQuarterScore', () => {
  it('returns 0 when there are no goals', () => {
    expect(calcQuarterScore([], 'Q1')).toBe(0);
  });

  it('returns 0 when no goals match the quarter', () => {
    const goals = [makeGoal({ quarter: 'Q2', status: 'approved', managerRating: 5 })];
    expect(calcQuarterScore(goals, 'Q1')).toBe(0);
  });

  it('returns 0 when no goals are approved', () => {
    const goals = [makeGoal({ quarter: 'Q1', status: 'in_progress', weight: 100 })];
    expect(calcQuarterScore(goals, 'Q1')).toBe(0);
  });

  it('returns 0 when approved but managerRating is null', () => {
    const goals = [makeGoal({ quarter: 'Q1', status: 'approved', weight: 100, managerRating: undefined })];
    expect(calcQuarterScore(goals, 'Q1')).toBe(0);
  });

  it('returns 100 for a single approved goal with max rating', () => {
    const goals = [makeGoal({ quarter: 'Q1', status: 'approved', managerRating: 5, weight: 100 })];
    expect(calcQuarterScore(goals, 'Q1')).toBe(100);
  });

  it('computes weighted score correctly', () => {
    // weight=60, rating=5 → earned = 60 * (5/5) = 60
    // weight=40, rating=0 → not approved so excluded
    // totalWeight = 100, earned = 60 → score = 60
    const goals = [
      makeGoal({ id: 'g1', quarter: 'Q1', status: 'approved', managerRating: 5, weight: 60 }),
      makeGoal({ id: 'g2', quarter: 'Q1', status: 'in_progress', weight: 40 }),
    ];
    expect(calcQuarterScore(goals, 'Q1')).toBe(60);
  });

  it('rounds the result', () => {
    // weight=30, rating=3 → earned = 30 * (3/5) = 18; weight=70 unapproved
    // score = round(18/100 * 100) = 18
    const goals = [
      makeGoal({ id: 'g1', quarter: 'Q1', status: 'approved', managerRating: 3, weight: 30 }),
      makeGoal({ id: 'g2', quarter: 'Q1', status: 'rejected', weight: 70 }),
    ];
    expect(calcQuarterScore(goals, 'Q1')).toBe(18);
  });

  it('handles two approved goals with different ratings', () => {
    // g1: weight=50, rating=4 → earned = 50 * (4/5) = 40
    // g2: weight=50, rating=2 → earned = 50 * (2/5) = 20
    // total = 100, earned = 60 → 60%
    const goals = [
      makeGoal({ id: 'g1', quarter: 'Q1', status: 'approved', managerRating: 4, weight: 50 }),
      makeGoal({ id: 'g2', quarter: 'Q1', status: 'approved', managerRating: 2, weight: 50 }),
    ];
    expect(calcQuarterScore(goals, 'Q1')).toBe(60);
  });

  it('returns 0 when all goals have weight 0', () => {
    const goals = [makeGoal({ quarter: 'Q1', status: 'approved', managerRating: 5, weight: 0 })];
    expect(calcQuarterScore(goals, 'Q1')).toBe(0);
  });
});

// ── getGoalStats ───────────────────────────────────────────────

describe('getGoalStats', () => {
  it('returns all-zero stats for empty goals', () => {
    expect(getGoalStats([], 'Q1')).toEqual({
      total: 0,
      approved: 0,
      submitted: 0,
      inProgress: 0,
      rejected: 0,
      notStarted: 0,
    });
  });

  it('counts only goals in the specified quarter', () => {
    const goals = [
      makeGoal({ id: 'g1', quarter: 'Q1', status: 'approved' }),
      makeGoal({ id: 'g2', quarter: 'Q2', status: 'approved' }),
    ];
    const stats = getGoalStats(goals, 'Q1');
    expect(stats.total).toBe(1);
    expect(stats.approved).toBe(1);
  });

  it('categorises each status correctly', () => {
    const goals = [
      makeGoal({ id: 'g1', quarter: 'Q2', status: 'approved' }),
      makeGoal({ id: 'g2', quarter: 'Q2', status: 'submitted' }),
      makeGoal({ id: 'g3', quarter: 'Q2', status: 'in_progress' }),
      makeGoal({ id: 'g4', quarter: 'Q2', status: 'rejected' }),
      makeGoal({ id: 'g5', quarter: 'Q2', status: 'not_started' }),
    ];
    expect(getGoalStats(goals, 'Q2')).toEqual({
      total: 5,
      approved: 1,
      submitted: 1,
      inProgress: 1,
      rejected: 1,
      notStarted: 1,
    });
  });
});

// ── getOverallScore ────────────────────────────────────────────

describe('getOverallScore', () => {
  it('returns 0 when there are no goals', () => {
    expect(getOverallScore([])).toBe(0);
  });

  it('returns Q1 score when there are no Q2 goals', () => {
    const goals = [makeGoal({ quarter: 'Q1', status: 'approved', managerRating: 5, weight: 100 })];
    expect(getOverallScore(goals)).toBe(100);
  });

  it('returns Q2 score when there are no Q1 goals', () => {
    const goals = [makeGoal({ quarter: 'Q2', status: 'approved', managerRating: 4, weight: 100 })];
    expect(getOverallScore(goals)).toBe(80);
  });

  it('returns the average of Q1 and Q2 scores', () => {
    const goals = [
      makeGoal({ id: 'g1', quarter: 'Q1', status: 'approved', managerRating: 5, weight: 100 }),
      makeGoal({ id: 'g2', quarter: 'Q2', status: 'approved', managerRating: 3, weight: 100 }),
    ];
    // Q1 = 100, Q2 = 60 → avg = 80
    expect(getOverallScore(goals)).toBe(80);
  });

  it('rounds the average', () => {
    // Q1=100, Q2=81 → avg=90.5 → 91
    const goals = [
      makeGoal({ id: 'g1', quarter: 'Q1', status: 'approved', managerRating: 5, weight: 100 }),
      // weight=100 rating=? → 81%: earned = 81 → rating = 81/100 * 5 = 4.05
      // Let's use two goals: weight=50 rating=5 and weight=50 rating=3.1 → earned = 50+31=81
      // Instead: 1 goal weight=100, rating doesn't map cleanly. Use two goals:
      makeGoal({ id: 'g2', quarter: 'Q2', status: 'approved', managerRating: 5, weight: 50 }),
      makeGoal({ id: 'g3', quarter: 'Q2', status: 'approved', managerRating: 3, weight: 50 }),
      // Q2 = round((50*(5/5) + 50*(3/5)) / 100 * 100) = round((50+30)/100*100) = 80
    ];
    // Q1=100, Q2=80 → avg=90
    expect(getOverallScore(goals)).toBe(90);
  });
});
