import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

// ── Module mocks (must be before imports) ─────────────────────────────────────

jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../../context/ToastContext', () => ({ useToast: jest.fn() }));
jest.mock('../../components/Header', () => () => null);
jest.mock('../../components/AnimatedButton', () => ({
  AnimatedButton: ({ children, onPress }: any) => {
    const { TouchableOpacity } = require('react-native');
    return require('react').createElement(TouchableOpacity, { onPress }, children);
  },
}));
jest.mock('../../components/PermissionDeniedBanner', () => ({
  PermissionDeniedBanner: () => null,
}));
jest.mock('../../hooks/useImagePicker', () => ({
  useImagePicker: () => ({
    cameraStatus: 'undetermined',
    libraryStatus: 'undetermined',
    pickFromCamera: jest.fn().mockResolvedValue(null),
    pickFromLibrary: jest.fn().mockResolvedValue(null),
    openSettings: jest.fn(),
  }),
}));

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';

import SignUpScreen from '../../screens/auth/SignUpScreen';
import SetGoals from '../../screens/manager/SetGoals';
import OnboardEmployee from '../../screens/admin/OnboardEmployee';
import DailyLogScreen from '../../screens/employee/DailyLogScreen';
import ReviewEvidence from '../../screens/manager/ReviewEvidence';
import SubmitEvidence from '../../screens/employee/SubmitEvidence';

// ── Shared mocks ──────────────────────────────────────────────────────────────

const MOCK_COLORS: any = {
  bg: '#fff', bgElevated: '#f5f5f5', card: '#fafafa', border: '#e0e0e0',
  textPrimary: '#111', textSecondary: '#555', textMuted: '#999',
  adminPrimary: '#dc2626', adminLight: '#fee2e2',
  managerPrimary: '#0891b2', managerLight: '#cffafe',
  employeePrimary: '#4f46e5', employeeLight: '#ede9fe',
  primary: '#4f46e5',
  approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
  pending: '#f59e0b', pendingBg: '#fffbeb',
};

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS, isDark: false });
});

// ══════════════════════════════════════════════════════════════════════════════
// SignUpScreen
// ══════════════════════════════════════════════════════════════════════════════

const mockSignup = jest.fn();

function renderSignUp(role: 'employee' | 'manager' | 'admin' = 'employee') {
  (useAuth as jest.Mock).mockReturnValue({ signup: mockSignup });
  return render(
    <SignUpScreen role={role} onBack={jest.fn()} onSuccess={jest.fn()} onSignIn={jest.fn()} />,
  );
}

describe('SignUpScreen — form validation edge cases', () => {
  const fill = (placeholder: string, value: string) =>
    fireEvent.changeText(screen.getByPlaceholderText(placeholder), value);

  function fillValid() {
    fill('First', 'Alice');
    fill('Last', 'Smith');
    fill('you@example.com', 'alice@example.com');
    fill('e.g. john.doe', 'alicesmith');
    fill('Min. 8 characters', 'Password1!');
    fill('Re-enter password', 'Password1!');
    fireEvent.press(screen.getByTestId('terms-checkbox'));
  }

  it('blocks submit when first name is empty', () => {
    renderSignUp();
    fill('Last', 'Smith');
    fill('you@example.com', 'a@b.com');
    fill('e.g. john.doe', 'alice');
    fill('Min. 8 characters', 'Password1!');
    fill('Re-enter password', 'Password1!');
    fireEvent.press(screen.getByTestId('terms-checkbox'));
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText('First and last name are required.')).toBeTruthy();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('blocks submit when first name is whitespace-only', () => {
    renderSignUp();
    fill('First', '   ');
    fill('Last', 'Smith');
    fill('you@example.com', 'a@b.com');
    fill('e.g. john.doe', 'alice');
    fill('Min. 8 characters', 'Password1!');
    fill('Re-enter password', 'Password1!');
    fireEvent.press(screen.getByTestId('terms-checkbox'));
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText('First and last name are required.')).toBeTruthy();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('blocks submit with invalid email', () => {
    renderSignUp();
    fill('First', 'Alice');
    fill('Last', 'Smith');
    fill('you@example.com', 'not-an-email');
    fill('e.g. john.doe', 'alice');
    fill('Min. 8 characters', 'Password1!');
    fill('Re-enter password', 'Password1!');
    fireEvent.press(screen.getByTestId('terms-checkbox'));
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('blocks submit with username shorter than 3 chars', () => {
    renderSignUp();
    fill('First', 'Alice');
    fill('Last', 'Smith');
    fill('you@example.com', 'a@b.com');
    fill('e.g. john.doe', 'ab');
    fill('Min. 8 characters', 'Password1!');
    fill('Re-enter password', 'Password1!');
    fireEvent.press(screen.getByTestId('terms-checkbox'));
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText('Username must be at least 3 characters.')).toBeTruthy();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('blocks submit with password shorter than 8 chars', () => {
    renderSignUp();
    fill('First', 'Alice');
    fill('Last', 'Smith');
    fill('you@example.com', 'a@b.com');
    fill('e.g. john.doe', 'alice');
    fill('Min. 8 characters', 'short');
    fill('Re-enter password', 'short');
    fireEvent.press(screen.getByTestId('terms-checkbox'));
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('blocks submit when passwords do not match', () => {
    renderSignUp();
    fill('First', 'Alice');
    fill('Last', 'Smith');
    fill('you@example.com', 'a@b.com');
    fill('e.g. john.doe', 'alice');
    fill('Min. 8 characters', 'Password1!');
    fill('Re-enter password', 'Different1!');
    fireEvent.press(screen.getByTestId('terms-checkbox'));
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('blocks submit when terms are not accepted', () => {
    renderSignUp();
    fill('First', 'Alice');
    fill('Last', 'Smith');
    fill('you@example.com', 'a@b.com');
    fill('e.g. john.doe', 'alice');
    fill('Min. 8 characters', 'Password1!');
    fill('Re-enter password', 'Password1!');
    // terms checkbox NOT pressed
    fireEvent.press(screen.getByTestId('create-account-btn'));
    expect(screen.getByText('Please accept the Terms & Conditions to continue.')).toBeTruthy();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('passes XSS-style name to signup() without crashing', async () => {
    mockSignup.mockResolvedValue({ ok: false, error: 'Server error' });
    renderSignUp();
    fill('First', '<script>alert(1)</script>');
    fill('Last', 'Smith');
    fill('you@example.com', 'a@b.com');
    fill('e.g. john.doe', 'alice');
    fill('Min. 8 characters', 'Password1!');
    fill('Re-enter password', 'Password1!');
    fireEvent.press(screen.getByTestId('terms-checkbox'));
    await act(async () => { fireEvent.press(screen.getByTestId('create-account-btn')); });
    expect(mockSignup).toHaveBeenCalled();
    expect(mockSignup.mock.calls[0][0].firstName).toBe('<script>alert(1)</script>');
  });

  it('passes emoji name to signup() without crashing', async () => {
    mockSignup.mockResolvedValue({ ok: false, error: 'Server error' });
    renderSignUp();
    fill('First', '😀Alice');
    fill('Last', '🌟Smith');
    fill('you@example.com', 'a@b.com');
    fill('e.g. john.doe', 'alice');
    fill('Min. 8 characters', 'Password1!');
    fill('Re-enter password', 'Password1!');
    fireEvent.press(screen.getByTestId('terms-checkbox'));
    await act(async () => { fireEvent.press(screen.getByTestId('create-account-btn')); });
    expect(mockSignup).toHaveBeenCalled();
    expect(mockSignup.mock.calls[0][0].firstName).toBe('😀Alice');
  });

  it('passes 200-char name to signup() without crashing', async () => {
    mockSignup.mockResolvedValue({ ok: false, error: 'Server error' });
    const longFirst = 'A'.repeat(200);
    renderSignUp();
    fill('First', longFirst);
    fill('Last', 'Smith');
    fill('you@example.com', 'a@b.com');
    fill('e.g. john.doe', 'alice');
    fill('Min. 8 characters', 'Password1!');
    fill('Re-enter password', 'Password1!');
    fireEvent.press(screen.getByTestId('terms-checkbox'));
    await act(async () => { fireEvent.press(screen.getByTestId('create-account-btn')); });
    expect(mockSignup).toHaveBeenCalled();
    expect(mockSignup.mock.calls[0][0].firstName).toBe(longFirst);
  });

  it('hides "Create Account" text and shows spinner while submitting', async () => {
    let resolve!: (v: any) => void;
    mockSignup.mockImplementation(() => new Promise(r => { resolve = r; }));
    renderSignUp();
    fillValid();
    fireEvent.press(screen.getByTestId('create-account-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('create-account-btn').props.accessibilityLabel).toBe('Creating account')
    );
    await act(async () => { resolve({ ok: true, user: { id: 'u1', employeeCode: 'EMP-001', username: 'alice' } }); });
  });

  it('displays error returned by signup()', async () => {
    mockSignup.mockResolvedValue({ ok: false, error: 'Email already in use.' });
    renderSignUp();
    fillValid();
    await act(async () => { fireEvent.press(screen.getByTestId('create-account-btn')); });
    await waitFor(() => expect(screen.getByText('Email already in use.')).toBeTruthy());
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SetGoals
// ══════════════════════════════════════════════════════════════════════════════

const mockShowToast = jest.fn();
const MOCK_EMPLOYEE = {
  id: 'emp-1', name: 'Bob Jones', designation: 'Engineer', department: 'Engineering',
  managerId: 'mgr-1', role: 'employee', status: 'active', email: 'bob@test.com',
  avatarInitials: 'BJ',
};

function renderSetGoals(goalsOverride: any[] = []) {
  (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  (useApp as jest.Mock).mockReturnValue({
    employees: [MOCK_EMPLOYEE],
    goals: goalsOverride,
    addGoal: jest.fn().mockReturnValue({ id: 'g-new', title: 'Test Goal' }),
    updateGoal: jest.fn(),
    updateEmployee: jest.fn(),
    deleteGoal: jest.fn(),
    addNotification: jest.fn(),
  });
  return render(
    <SetGoals
      navigation={mockNavigation as any}
      params={{ employeeId: 'emp-1' }}
      currentUserId="mgr-1"
      currentRole="manager"
      onLogout={jest.fn()}
    />,
  );
}

describe('SetGoals — form validation edge cases', () => {
  function openForm() {
    fireEvent.press(screen.getByText('+ Add Goal'));
  }

  it('blocks save when title is empty', () => {
    renderSetGoals();
    openForm();
    fireEvent.changeText(screen.getByPlaceholderText('What should the employee achieve and how will success be measured?'), 'Do the thing');
    fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '2026-12-31');
    fireEvent.press(screen.getByText('Save Goal'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Please fill in title, description, and target date.',
      'error',
      'Missing Fields',
    );
  });

  it('blocks save when description is empty', () => {
    renderSetGoals();
    openForm();
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Implement user dashboard'), 'My Goal');
    fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '2026-12-31');
    fireEvent.press(screen.getByText('Save Goal'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Please fill in title, description, and target date.',
      'error',
      'Missing Fields',
    );
  });

  it('blocks save when target date is empty', () => {
    renderSetGoals();
    openForm();
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Implement user dashboard'), 'My Goal');
    fireEvent.changeText(screen.getByPlaceholderText('What should the employee achieve and how will success be measured?'), 'Do the thing');
    fireEvent.press(screen.getByText('Save Goal'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Please fill in title, description, and target date.',
      'error',
      'Missing Fields',
    );
  });

  it('passes XSS-style title to addGoal() without crashing', () => {
    const mockAddGoal = jest.fn().mockReturnValue({ id: 'g-new', title: '<img src=x onerror=alert(1)>' });
    (useApp as jest.Mock).mockReturnValue({
      employees: [MOCK_EMPLOYEE], goals: [],
      addGoal: mockAddGoal, updateGoal: jest.fn(), updateEmployee: jest.fn(),
      deleteGoal: jest.fn(), addNotification: jest.fn(),
    });
    render(
      <SetGoals navigation={mockNavigation as any} params={{ employeeId: 'emp-1' }}
        currentUserId="mgr-1" currentRole="manager" onLogout={jest.fn()} />,
    );
    openForm();
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Implement user dashboard'), '<img src=x onerror=alert(1)>');
    fireEvent.changeText(screen.getByPlaceholderText('What should the employee achieve and how will success be measured?'), 'Do the thing');
    fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '2026-12-31');
    fireEvent.press(screen.getByText('Save Goal'));
    expect(mockAddGoal).toHaveBeenCalledWith(expect.objectContaining({ title: '<img src=x onerror=alert(1)>' }));
  });

  it('passes emoji title to addGoal() without crashing', () => {
    const mockAddGoal = jest.fn().mockReturnValue({ id: 'g-new', title: '🚀 Ship feature' });
    (useApp as jest.Mock).mockReturnValue({
      employees: [MOCK_EMPLOYEE], goals: [],
      addGoal: mockAddGoal, updateGoal: jest.fn(), updateEmployee: jest.fn(),
      deleteGoal: jest.fn(), addNotification: jest.fn(),
    });
    render(
      <SetGoals navigation={mockNavigation as any} params={{ employeeId: 'emp-1' }}
        currentUserId="mgr-1" currentRole="manager" onLogout={jest.fn()} />,
    );
    openForm();
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Implement user dashboard'), '🚀 Ship feature');
    fireEvent.changeText(screen.getByPlaceholderText('What should the employee achieve and how will success be measured?'), 'Do the thing');
    fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '2026-12-31');
    fireEvent.press(screen.getByText('Save Goal'));
    expect(mockAddGoal).toHaveBeenCalledWith(expect.objectContaining({ title: '🚀 Ship feature' }));
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// OnboardEmployee
// ══════════════════════════════════════════════════════════════════════════════

const MOCK_MANAGER = {
  id: 'mgr-1', name: 'Jane Manager', email: 'jane@test.com', role: 'manager',
  department: 'Engineering', avatarInitials: 'JM',
};

function renderOnboard(employeesOverride: any[] = [MOCK_MANAGER]) {
  (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  (useApp as jest.Mock).mockReturnValue({
    employees: employeesOverride,
    addNotification: jest.fn(),
  });
  (useAuth as jest.Mock).mockReturnValue({
    createUser: jest.fn().mockResolvedValue({ id: 'new-1', name: 'Jamie Patel', employeeCode: 'EMP-002', username: 'jamie.patel' }),
    updateUser: jest.fn().mockResolvedValue(undefined),
  });
  return render(<OnboardEmployee navigation={mockNavigation as any} params={{}} currentUserId="admin-1" currentRole="admin" onLogout={jest.fn()} />);
}

describe('OnboardEmployee — form validation edge cases', () => {
  it('blocks submit and shows toast when all fields empty', () => {
    renderOnboard();
    fireEvent.press(screen.getByText('Onboard Employee →'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Please fill in all fields and select a reporting manager.',
      'error',
      'Missing Fields',
    );
  });

  it('blocks submit when email is invalid', () => {
    renderOnboard();
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Jamie Patel'), 'Sam Lee');
    fireEvent.changeText(screen.getByPlaceholderText('jamie.patel@company.com'), 'not-an-email');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Software Engineer'), 'Engineer');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Engineering'), 'Engineering');
    fireEvent.press(screen.getByText('Jane Manager'));
    fireEvent.press(screen.getByText('Onboard Employee →'));
    expect(mockShowToast).toHaveBeenCalledWith('Please enter a valid email address.', 'error', 'Invalid Email');
  });

  it('blocks submit when email is duplicate', () => {
    const existingEmployee = { ...MOCK_MANAGER, id: 'emp-2', email: 'sam@test.com', role: 'employee' };
    renderOnboard([MOCK_MANAGER, existingEmployee]);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Jamie Patel'), 'Sam Lee');
    fireEvent.changeText(screen.getByPlaceholderText('jamie.patel@company.com'), 'SAM@TEST.COM');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Software Engineer'), 'Engineer');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Engineering'), 'Engineering');
    fireEvent.press(screen.getByText('Jane Manager'));
    fireEvent.press(screen.getByText('Onboard Employee →'));
    expect(mockShowToast).toHaveBeenCalledWith('An account with this email already exists.', 'error', 'Duplicate Email');
  });

  it('accepts name with apostrophe (O\'Brien) without validation error', async () => {
    renderOnboard();
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Jamie Patel'), "O'Brien Smith");
    fireEvent.changeText(screen.getByPlaceholderText('jamie.patel@company.com'), 'obrien@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Software Engineer'), 'Engineer');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Engineering'), 'Engineering');
    fireEvent.press(screen.getByText('Jane Manager'));
    await act(async () => { fireEvent.press(screen.getByText('Onboard Employee →')); });
    expect(mockShowToast).not.toHaveBeenCalledWith(expect.anything(), 'error', 'Missing Fields');
  });

  it('accepts emoji in name without crashing', async () => {
    renderOnboard();
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Jamie Patel'), '😀 Sam Lee');
    fireEvent.changeText(screen.getByPlaceholderText('jamie.patel@company.com'), 'sam@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Software Engineer'), 'Engineer');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Engineering'), 'Engineering');
    fireEvent.press(screen.getByText('Jane Manager'));
    await act(async () => { fireEvent.press(screen.getByText('Onboard Employee →')); });
    expect(mockShowToast).not.toHaveBeenCalledWith(expect.anything(), 'error', 'Missing Fields');
  });

  it('accepts a 100-character name without validation error', async () => {
    renderOnboard();
    const longName = 'A'.repeat(50) + ' ' + 'B'.repeat(49);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Jamie Patel'), longName);
    fireEvent.changeText(screen.getByPlaceholderText('jamie.patel@company.com'), 'long@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Software Engineer'), 'Engineer');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Engineering'), 'Engineering');
    fireEvent.press(screen.getByText('Jane Manager'));
    await act(async () => { fireEvent.press(screen.getByText('Onboard Employee →')); });
    expect(mockShowToast).not.toHaveBeenCalledWith(expect.anything(), 'error', 'Missing Fields');
  });

  it('shows no-managers message when employees list has no managers', () => {
    renderOnboard([]);
    expect(screen.getByText(/No managers found/i)).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DailyLogScreen
// ══════════════════════════════════════════════════════════════════════════════

function renderDailyLog() {
  (useApp as jest.Mock).mockReturnValue({
    dailyLogs: [],
    saveDailyLog: jest.fn(),
    notifications: [],
  });
  return render(
    <DailyLogScreen
      navigation={mockNavigation as any}
      params={{}}
      currentUserId="emp-1"
      currentRole="employee"
      onLogout={jest.fn()}
    />,
  );
}

describe('DailyLogScreen — task input edge cases', () => {
  it('does not add whitespace-only task', () => {
    renderDailyLog();
    fireEvent.changeText(screen.getByPlaceholderText('Describe a task you completed...'), '   ');
    fireEvent.press(screen.getByText('+'));
    expect(screen.queryByText('   ')).toBeNull();
  });

  it('adds and displays an emoji task', () => {
    renderDailyLog();
    fireEvent.changeText(screen.getByPlaceholderText('Describe a task you completed...'), '🚀 Deployed new feature');
    fireEvent.press(screen.getByText('+'));
    expect(screen.getByText('🚀 Deployed new feature')).toBeTruthy();
  });

  it('adds and displays a long task description without crashing', () => {
    const longTask = 'A'.repeat(500);
    renderDailyLog();
    fireEvent.changeText(screen.getByPlaceholderText('Describe a task you completed...'), longTask);
    fireEvent.press(screen.getByText('+'));
    expect(screen.getByText(longTask)).toBeTruthy();
  });

  it('adds XSS-style task text and displays it verbatim', () => {
    const xssTask = '<script>alert("xss")</script>';
    renderDailyLog();
    fireEvent.changeText(screen.getByPlaceholderText('Describe a task you completed...'), xssTask);
    fireEvent.press(screen.getByText('+'));
    expect(screen.getByText(xssTask)).toBeTruthy();
  });

  it('adds SQL-injection-style task text and displays it verbatim', () => {
    const sqlTask = "'; DROP TABLE tasks; --";
    renderDailyLog();
    fireEvent.changeText(screen.getByPlaceholderText('Describe a task you completed...'), sqlTask);
    fireEvent.press(screen.getByText('+'));
    expect(screen.getByText(sqlTask)).toBeTruthy();
  });

  it('clears input field after successfully adding a task', () => {
    renderDailyLog();
    fireEvent.changeText(screen.getByPlaceholderText('Describe a task you completed...'), 'Some task');
    fireEvent.press(screen.getByText('+'));
    expect(screen.getByPlaceholderText('Describe a task you completed...').props.value).toBe('');
  });

  it('adds multiple tasks and all are displayed', () => {
    renderDailyLog();
    const tasks = ['First task', 'Second task', 'Third task'];
    tasks.forEach(t => {
      fireEvent.changeText(screen.getByPlaceholderText('Describe a task you completed...'), t);
      fireEvent.press(screen.getByText('+'));
    });
    tasks.forEach(t => expect(screen.getByText(t)).toBeTruthy());
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ReviewEvidence
// ══════════════════════════════════════════════════════════════════════════════

const MOCK_PENDING_EMPLOYEE = {
  id: 'emp-2', name: 'Carol Doe', email: 'carol@test.com', role: 'employee', managerId: 'mgr-1',
  department: 'Engineering', avatarInitials: 'CD',
};
const MOCK_PENDING_GOAL = {
  id: 'goal-1', employeeId: 'emp-2', quarter: 'Q2', weight: 20, status: 'submitted',
  title: 'Complete authentication module', description: 'Implement JWT auth',
  category: 'technical', priority: 'high', targetDate: '2026-06-01',
  evidence: {
    description: 'I built the auth module.',
    submittedAt: '2026-06-01T00:00:00Z',
    links: [], selfRating: 4,
  },
};

function renderReviewEvidence() {
  (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  (useApp as jest.Mock).mockReturnValue({
    employees: [MOCK_PENDING_EMPLOYEE],
    goals: [MOCK_PENDING_GOAL],
    reviewEvidence: jest.fn(),
    addNotification: jest.fn(),
  });
  return render(
    <ReviewEvidence
      navigation={mockNavigation as any}
      params={{}}
      currentUserId="mgr-1"
      currentRole="manager"
      onLogout={jest.fn()}
    />,
  );
}

describe('ReviewEvidence — form validation edge cases', () => {
  it('shows toast when approving without a star rating', () => {
    renderReviewEvidence();
    fireEvent.press(screen.getByText('Approve'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Please set a star rating (1–5) before approving.',
      'warning',
      'Rating Required',
    );
  });

  it('shows toast when rejecting without feedback', () => {
    renderReviewEvidence();
    fireEvent.press(screen.getByText('Reject'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Please provide feedback explaining why the evidence was rejected.',
      'warning',
      'Feedback Required',
    );
  });

  it('accepts long feedback text when rejecting', () => {
    const mockReviewEvidence = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      employees: [MOCK_PENDING_EMPLOYEE],
      goals: [MOCK_PENDING_GOAL],
      reviewEvidence: mockReviewEvidence,
      addNotification: jest.fn(),
    });
    render(
      <ReviewEvidence navigation={mockNavigation as any} params={{}}
        currentUserId="mgr-1" currentRole="manager" onLogout={jest.fn()} />,
    );
    const longFeedback = 'Needs improvement: '.repeat(20);
    fireEvent.changeText(screen.getByPlaceholderText(/feedback/i), longFeedback);
    fireEvent.press(screen.getByText('Reject'));
    expect(mockReviewEvidence).toHaveBeenCalledWith('goal-1', false, longFeedback.trim(), undefined, expect.any(Function));
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SubmitEvidence
// ══════════════════════════════════════════════════════════════════════════════

const MOCK_GOAL_FOR_EVIDENCE = {
  id: 'g-sub', employeeId: 'emp-1', quarter: 'Q2', weight: 20, status: 'in_progress',
  title: 'Build dashboard', description: 'Create dashboard with charts',
  category: 'technical', priority: 'high', targetDate: '2026-12-31',
  evidence: undefined,
};

const MOCK_EMPLOYEE_FOR_EVIDENCE = {
  id: 'emp-1', name: 'Alice Brown', email: 'alice@test.com', role: 'employee', managerId: 'mgr-1',
  department: 'Engineering', avatarInitials: 'AB', designation: 'Engineer',
};

function renderSubmitEvidence() {
  (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  (useApp as jest.Mock).mockReturnValue({
    goals: [MOCK_GOAL_FOR_EVIDENCE],
    employees: [MOCK_EMPLOYEE_FOR_EVIDENCE],
    submitEvidence: jest.fn(),
    updateGoal: jest.fn(),
    addNotification: jest.fn(),
  });
  return render(
    <SubmitEvidence
      navigation={mockNavigation as any}
      params={{ goalId: 'g-sub' }}
      currentUserId="emp-1"
      currentRole="employee"
      onLogout={jest.fn()}
    />,
  );
}

describe('SubmitEvidence — form validation edge cases', () => {
  it('shows toast when submitting with empty description', () => {
    renderSubmitEvidence();
    fireEvent.press(screen.getByText('Submit for Review'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Please describe what you did to complete this goal.',
      'error',
      'Description required',
    );
  });

  it('shows toast when submitting with whitespace-only description', () => {
    renderSubmitEvidence();
    fireEvent.changeText(screen.getByPlaceholderText(/Describe what you did/i),'   ');
    fireEvent.press(screen.getByText('Submit for Review'));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Please describe what you did to complete this goal.',
      'error',
      'Description required',
    );
  });

  it('submits successfully with a long description', () => {
    const mockSubmitEvidence = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      goals: [MOCK_GOAL_FOR_EVIDENCE],
      employees: [MOCK_EMPLOYEE_FOR_EVIDENCE],
      submitEvidence: mockSubmitEvidence,
      updateGoal: jest.fn(),
      addNotification: jest.fn(),
    });
    render(
      <SubmitEvidence navigation={mockNavigation as any} params={{ goalId: 'g-sub' }}
        currentUserId="emp-1" currentRole="employee" onLogout={jest.fn()} />,
    );
    const longDesc = 'Completed task: '.repeat(50);
    fireEvent.changeText(screen.getByPlaceholderText(/Describe what you did/i),longDesc);
    fireEvent.press(screen.getByText('Submit for Review'));
    expect(mockSubmitEvidence).toHaveBeenCalledWith('g-sub', expect.objectContaining({ description: longDesc.trim() }));
  });

  it('submits successfully with XSS-style description (no rendering as HTML)', () => {
    const mockSubmitEvidence = jest.fn();
    (useApp as jest.Mock).mockReturnValue({
      goals: [MOCK_GOAL_FOR_EVIDENCE],
      employees: [MOCK_EMPLOYEE_FOR_EVIDENCE],
      submitEvidence: mockSubmitEvidence,
      updateGoal: jest.fn(),
      addNotification: jest.fn(),
    });
    render(
      <SubmitEvidence navigation={mockNavigation as any} params={{ goalId: 'g-sub' }}
        currentUserId="emp-1" currentRole="employee" onLogout={jest.fn()} />,
    );
    const xssDesc = '<script>alert("xss")</script> I completed the goal.';
    fireEvent.changeText(screen.getByPlaceholderText(/Describe what you did/i),xssDesc);
    fireEvent.press(screen.getByText('Submit for Review'));
    expect(mockSubmitEvidence).toHaveBeenCalledWith('g-sub', expect.objectContaining({ description: xssDesc.trim() }));
  });

  it('shows "Goal not found" when goalId does not match any goal', () => {
    (useApp as jest.Mock).mockReturnValue({
      goals: [],
      employees: [MOCK_EMPLOYEE_FOR_EVIDENCE],
      submitEvidence: jest.fn(),
      updateGoal: jest.fn(),
      addNotification: jest.fn(),
    });
    render(
      <SubmitEvidence navigation={mockNavigation as any} params={{ goalId: 'nonexistent' }}
        currentUserId="emp-1" currentRole="employee" onLogout={jest.fn()} />,
    );
    expect(screen.getByText('Goal not found.')).toBeTruthy();
  });
});
