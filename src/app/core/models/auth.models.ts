export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    status: string;
  };
}

export interface AuthUser {
  name?: string;
  email?: string;
  role?: string;
}
