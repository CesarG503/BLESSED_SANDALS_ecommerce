export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'USER' | 'ADMIN';
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
