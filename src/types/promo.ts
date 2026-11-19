export interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number; // e.g. 10 for 10% or 20 for $20
  minPurchase?: number;
  expiresAt?: string;
  isActive: boolean;
}
