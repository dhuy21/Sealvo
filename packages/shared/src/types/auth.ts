export type UserRole = 'Admin' | 'User';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface JwtPayload {
  sub: string;       // user id (CHAR 7)
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface UserDto {
  id: string;        // CHAR(7)
  username: string;
  email: string;
  role: UserRole;
  avatar: number;
  is_verified: boolean;
  created_at: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface NewPasswordRequest {
  token: string;
  password: string;
  confirm_password: string;
}
