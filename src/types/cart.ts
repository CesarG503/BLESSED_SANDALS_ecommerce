import { Product, ColorVariant } from './product';

export interface CartItem {
  id: string; // Unique combo of productId + size + color
  productId: string;
  product: Product;
  size: number;
  color: ColorVariant;
  quantity: number;
}

export interface WishlistItem {
  productId: string;
  product: Product;
  addedAt: string;
}
