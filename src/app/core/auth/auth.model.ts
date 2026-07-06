export interface LoginRequest {
  email: string;
  senha: string;
}

export type LogoutReason = 'user' | 'expired';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  usuario: AuthUser;
}

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  cargo: 'admin' | 'supervisor' | 'vigia';
  empresaId: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  nome: string;
  role: string;
  empresa_id: string;
  exp: number;
  iat: number;
}
