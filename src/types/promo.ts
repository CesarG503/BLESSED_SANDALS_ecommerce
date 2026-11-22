export interface PromoStoreItem {
  productId: string;
  promoPrice: number;
  badgeLabel?: string;
  threshold?: number;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'HIDDEN_STORE';
  discountValue: number; // e.g. 5 for 5% or 25 for $25
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number | null;
  onePerUser?: boolean;
  isWelcomeOnly?: boolean;
  timesUsed?: number;
  startsAt?: string;
  expiresAt?: string;
  storeItems?: PromoStoreItem[];
  isActive: boolean;
  isUsedByUser?: boolean;
  isClaimedByUser?: boolean;
}
