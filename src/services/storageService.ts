import { CartItem, WishlistItem } from '../types/cart';
import { User } from '../types/auth';
import { PromoCode } from '../types/promo';

const CART_KEY = 'blessed_sandals_cart_v1';
const WISHLIST_KEY = 'blessed_sandals_wishlist_v1';
const USER_KEY = 'blessed_sandals_user_v1';
const PROMO_KEY = 'blessed_sandals_promo_v1';

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

  static getUser(): User | null {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static saveUser(user: User | null): void {
    try {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch (e) {
      console.error('Error saving user to localStorage', e);
    }
  }

  static getPromo(): PromoCode | null {
    try {
      const data = localStorage.getItem(PROMO_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static savePromo(promo: PromoCode | null): void {
    try {
      if (promo) {
        localStorage.setItem(PROMO_KEY, JSON.stringify(promo));
      } else {
        localStorage.removeItem(PROMO_KEY);
      }
    } catch (e) {
      console.error('Error saving promo to localStorage', e);
    }
  }

  static getWelcomePromoRedeemed(): boolean {
    try {
      return localStorage.getItem('blessed_welcome_promo_redeemed') === 'true';
    } catch {
      return false;
    }
  }

  static saveWelcomePromoRedeemed(redeemed: boolean): void {
    try {
      localStorage.setItem('blessed_welcome_promo_redeemed', redeemed ? 'true' : 'false');
    } catch (e) {
      console.error('Error saving welcome promo status', e);
    }
  }

  static getSizeUnit(): string | null {
    try {
      return localStorage.getItem('blessed_size_unit');
    } catch {
      return null;
    }
  }

  static saveSizeUnit(unit: string): void {
    try {
      localStorage.setItem('blessed_size_unit', unit);
    } catch (e) {
      console.error('Error saving size unit', e);
    }
  }
}
