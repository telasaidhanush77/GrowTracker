import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Role } from '../types';

// Matches the three role images:
//   admin    → account-cog  (person + gear)
//   manager  → account-tie  (person + suit/tie)
//   employee → account      (plain person)
const ROLE_ICON: Record<Role, 'account-cog' | 'account-tie' | 'account'> = {
  admin:    'account-cog',
  manager:  'account-tie',
  employee: 'account',
};

interface Props {
  role: Role;
  size?: number;
  color?: string;
}

export function RoleIcon({ role, size = 24, color = '#000' }: Props) {
  return <MaterialCommunityIcons name={ROLE_ICON[role]} size={size} color={color} />;
}
