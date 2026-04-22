export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  role: string;
  username: string;
  expiresIn: number;
}

/** Réponse de GET /api/auth/me — alignée sur le backend */
export interface UserMe {
  id: number;
  username: string;
  email: string;
  role: string;
  enabled: boolean;
}
