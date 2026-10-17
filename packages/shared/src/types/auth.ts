export type UserRole = 'Admin' | 'User';

export interface JwtPayload {
  sub: string; // user id (CHAR 7)
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/** GET /auth/me */
export interface UserDto {
  id: string; // CHAR(7)
  username: string;
  email: string;
  role: UserRole;
  ava: number;
  is_verified: boolean;
  streak: number;
  created_at: string | null;
  last_login: string | null;
}
