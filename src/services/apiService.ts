import { User, UserCoupon } from '../types/auth';
import { PromoCode } from '../types/promo';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  requireAuth?: boolean;
  alreadyUsed?: boolean;
  requireRegister?: boolean;
  requireLogin?: boolean;
  user?: User;
  welcomeCoupon?: PromoCode;
  coupons?: PromoCode[];
  userCoupons?: UserCoupon[];
  promo?: PromoCode;
  orderNumber?: string;
  orderId?: string;
}

export class ApiService {
  /**
   * Inicia sesión con correo electrónico consultando la base de datos PostgreSQL
   */
  static async login(email: string): Promise<ApiResponse<User>> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: 'Error al conectar con la base de datos.' };
    }
  }

  /**
   * Registra un nuevo usuario en la BD y le asigna automáticamente BIENVENIDA5
   */
  static async register(name: string, email: string, phone?: string): Promise<ApiResponse<User>> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: 'Error al registrar en la base de datos.' };
    }
  }

  /**
   * Obtiene la información del usuario actual con sus cupones
   */
  static async getMe(userId: string): Promise<ApiResponse<User>> {
    try {
      const res = await fetch(`/api/auth/me?userId=${encodeURIComponent(userId)}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, message: 'Error al consultar usuario.' };
    }
  }

  /**
   * Obtiene todos los cupones disponibles en el sistema con el estado para el usuario
   */
  static async getCoupons(userId?: string): Promise<PromoCode[]> {
    try {
      const url = userId ? `/api/coupons?userId=${encodeURIComponent(userId)}` : '/api/coupons';
      const res = await fetch(url);
      const data = await res.json();
      return data.success ? data.coupons : [];
    } catch {
      return [];
    }
  }

  /**
   * Obtiene los cupones personales del usuario desde la BD (UserCoupon)
   */
  static async getMyCoupons(userId: string): Promise<UserCoupon[]> {
    try {
      const res = await fetch(`/api/coupons/my-coupons?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      return data.success ? data.userCoupons : [];
    } catch {
      return [];
    }
  }

  /**
   * Agrega/canjea un cupón a la cuenta personal del usuario en la BD
   */
  static async claimCoupon(userId: string, code: string): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/coupons/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al agregar cupón a tu cuenta.' };
    }
  }

  /**
   * Valida y aplica un cupón respetando las reglas de sesión obligatoria y 1 solo uso por persona
   */
  static async applyCoupon(
    userId: string | null,
    code: string,
    subtotal: number = 0
  ): Promise<ApiResponse<{ promo: PromoCode }>> {
    try {
      const res = await fetch('/api/coupons/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code, subtotal })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al validar cupón con la base de datos.' };
    }
  }

  /**
   * Finaliza la orden y marca el cupón como utilizado en la BD
   */
  static async checkout(payload: {
    userId: string;
    items: any[];
    promoCodeId?: string;
    subtotal: number;
    discount?: number;
    shipping?: number;
    total: number;
  }): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al procesar la compra.' };
    }
  }
}
