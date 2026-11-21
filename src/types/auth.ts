import { PromoCode } from './promo';

export interface UserCoupon {
  id: string;
  userId: string;
  promoCodeId: string;
  isUsed: boolean;
  usedAt?: string;
  claimedAt: string;
  promoCode: PromoCode;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'USER' | 'ADMIN';
  createdAt?: string;
  userCoupons?: UserCoupon[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
