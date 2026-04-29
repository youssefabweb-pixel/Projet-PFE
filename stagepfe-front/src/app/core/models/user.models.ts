/** Rôles renvoyés par GET /api/users/roles (ne pas figer la liste en dur côté front). */
export type UserRole = string;

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  createdByManagerId: number | null;
  createdByManagerUsername: string | null;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  enabled: boolean;
}

/** @deprecated Utiliser CreateUserPayload */
export type CreateUserRequest = CreateUserPayload;

export interface UpdateUserPayload {
  email: string;
  password?: string;
  role: UserRole;
  enabled: boolean;
}

/** @deprecated Utiliser UpdateUserPayload */
export type UpdateUserRequest = UpdateUserPayload;
