export type UserRole = 'user' | 'admin' | 'superadmin';

export interface AppSetting {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithRole {
  id: string;
  address: string;
  username?: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
  lastSeenAt: string;
}
