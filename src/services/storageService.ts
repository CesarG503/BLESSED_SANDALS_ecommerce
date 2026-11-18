import { CartItem, WishlistItem } from '../types/cart';

const CART_KEY = 'blessed_sandals_cart_v1';
const WISHLIST_KEY = 'blessed_sandals_wishlist_v1';

export class StorageService {
  static getCart(): CartItem[] {
    try {
      const data = localStorage.getItem(CART_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveCart(items: CartItem[]): void {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving cart to localStorage', e);
    }
  }

  static getWishlist(): WishlistItem[] {
    try {
      const data = localStorage.getItem(WISHLIST_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveWishlist(items: WishlistItem[]): void {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving wishlist to localStorage', e);
    }
  }
}
