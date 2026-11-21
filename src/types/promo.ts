export interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number; // e.g. 5 for 5% or 25 for $25
  minPurchase?: number;
  maxDiscount?: number;
  onePerUser?: boolean;
  isWelcomeOnly?: boolean;
  timesUsed?: number;
  expiresAt?: string;
  isActive: boolean;
  isUsedByUser?: boolean;
  isClaimedByUser?: boolean;
}
