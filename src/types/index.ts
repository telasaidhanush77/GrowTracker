export type Role = 'admin' | 'manager' | 'employee';
export type EmployeeStatus = 'onboarding' | 'active' | 'completed_fiscal_year';
export type Quarter = 'Q1' | 'Q2';
export type GoalStatus = 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
export type GoalPriority = 'high' | 'medium' | 'low';
export type GoalCategory = 'technical' | 'project_delivery' | 'soft_skills' | 'learning' | 'leadership';
export type EvidenceStatus = 'pending' | 'approved' | 'rejected';

export interface Attachment {
  name: string;
  uri: string;
  mimeType: string;
  size?: number;
}

export interface Evidence {
  id: string;
  description: string;
  links: string[];
  selfRating?: number;
  submittedAt: string;
  status: EvidenceStatus;
  managerFeedback?: string;
  reviewedAt?: string;
  attachments?: Attachment[];
}

export interface Goal {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  quarter: Quarter;
  priority: GoalPriority;
  category: GoalCategory;
  targetDate: string;
  weight: number;
  status: GoalStatus;
  managerRating?: number;
  evidence?: Evidence;
  createdAt: string;
  updatedAt: string;
  attachments?: Attachment[];
}

export interface Employee {
  id: string;
  employeeCode?: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  designation: string;
  managerId: string | null;
  joinDate: string;
  status: EmployeeStatus;
  avatarInitials: string;
}

// StoredUser extends Employee with auth fields — usable anywhere Employee is expected
export interface StoredUser extends Omit<Employee, 'employeeCode'> {
  employeeCode: string;
  firstName: string;
  lastName: string;
  username: string;
  passwordHash: string; // "salt:sha256hash"
  mobile?: string;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  role: Role;
  createdAt: string;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  role: Role;
  mobile?: string;
  department?: string;
  designation?: string;
}

export type NotificationType =
  | 'goal_assigned'
  | 'evidence_submitted'
  | 'evidence_approved'
  | 'evidence_rejected'
  | 'goal_adjusted'
  | 'fiscal_year_complete'
  | 'onboarding_complete';

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedGoalId?: string;
  relatedEmployeeId?: string;
}

export interface DailyTask {
  id: string;
  description: string;
}

export interface DailyLog {
  id: string;
  employeeId: string;
  date: string;
  tasks: DailyTask[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type Screen =
  | 'auth-splash'
  | 'auth-login'
  | 'auth-signup'
  | 'auth-forgot-username'
  | 'auth-forgot-password'
  | 'admin-dashboard'
  | 'onboard-employee'
  | 'manager-dashboard'
  | 'team-overview'
  | 'set-goals'
  | 'review-evidence'
  | 'employee-dashboard'
  | 'goals-list'
  | 'submit-evidence'
  | 'daily-log'
  | 'team-daily-logs'
  | 'notifications'
  | 'profile'
  | 'fy-report'
  | 'my-progress';

export interface NavParams {
  employeeId?: string;
  goalId?: string;
  quarter?: Quarter;
  switchRole?: Role;
  filterStatus?: GoalStatus;
  filterQuarter?: Quarter;
  viewEmployeeId?: string;
  readOnly?: boolean;
  role?: Role;
  authEmail?: string;
}

export interface StackEntry {
  screen: Screen;
  params?: NavParams;
}

export interface Navigation {
  navigate: (screen: Screen, params?: NavParams) => void;
  goBack: () => void;
}

export interface ScreenProps {
  navigation: Navigation;
  params: NavParams;
  currentUserId: string | null;
  currentRole: Role | null;
  onLogout: () => void;
  onSwitchAccount?: () => void;
}
