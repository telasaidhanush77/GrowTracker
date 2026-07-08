import type { Tables } from '../db/types';
import type { EmployeeStatus, Role, StoredUser } from '../types';

type ProfileRow = Tables<'profiles'>;

export function profileToStoredUser(p: ProfileRow): StoredUser {
  return {
    id:             p.id,
    employeeCode:   p.employee_code,
    firstName:      p.first_name,
    lastName:       p.last_name,
    name:           `${p.first_name} ${p.last_name}`,
    email:          p.email,
    username:       p.username,
    mobile:         p.mobile ?? undefined,
    pushToken:      p.push_token ?? undefined,
    role:           p.role as Role,
    department:     p.department,
    designation:    p.designation,
    managerId:      p.manager_id,
    joinDate:       p.join_date,
    status:         p.status as EmployeeStatus,
    avatarInitials: p.avatar_initials,
    createdAt:      p.created_at,
    passwordHash:   '',
  };
}
