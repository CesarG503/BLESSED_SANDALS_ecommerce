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
  address?: any;
  remainingBalance?: number;
  cardBrand?: string;
  cardLast4?: string;
  shippingAddress?: string;
  cards?: any[];
  users?: any[];
  products?: any[];
  promos?: any[];
  categories?: any[];
  assets?: any[];
  url?: string;
  filename?: string;
  size?: number;
  isActive?: boolean;
  product?: any;
}

export class ApiService {
  /**
   * Inicia sesión con correo electrónico consultando la base de datos PostgreSQL
   */
  static async login(email: string, password?: string): Promise<ApiResponse<User>> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
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
    subtotal: number = 0,
    hasPromoItems: boolean = false,
    blockPromoStacking: boolean = true
  ): Promise<ApiResponse<{ promo: PromoCode }>> {
    try {
      const res = await fetch('/api/coupons/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code, subtotal, hasPromoItems, blockPromoStacking })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al validar cupón con la base de datos.' };
    }
  }

  /**
   * Finaliza la orden y procesa el pago con Stripe Test Mode en PostgreSQL
   */
  static async checkout(payload: {
    userId: string;
    items: any[];
    promoCodeId?: string;
    subtotal: number;
    discount?: number;
    shipping?: number;
    total: number;
    paymentCardId?: string;
    newCard?: {
      cardHolder: string;
      cardNumber: string;
      expMonth: number;
      expYear: number;
      cvc?: string;
      balance?: number;
      saveCard?: boolean;
    };
    shippingAddressId?: string;
    newAddress?: {
      fullName: string;
      phone: string;
      street: string;
      city: string;
      state: string;
      postalCode?: string;
      saveAddress?: boolean;
    };
  }): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error de conexión al procesar el pago con Stripe Test Mode.' };
    }
  }

  /**
   * Carga todo el perfil integral del usuario: órdenes, cupones, tarjetas, reseñas, wishlist y direcciones
   */
  static async getUserProfile(userId: string): Promise<ApiResponse<any>> {
    try {
      const res = await fetch(`/api/user/profile?userId=${encodeURIComponent(userId)}`);
      return await res.json();
    } catch {
      return { success: false, message: 'Error al cargar perfil de usuario.' };
    }
  }

  /**
   * Actualiza información básica del perfil
   */
  static async updateUserInfo(userId: string, name: string, phone?: string): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/user/update-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name, phone })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al actualizar información.' };
    }
  }

  /**
   * Guarda una dirección de envío en El Salvador
   */
  static async addAddress(payload: {
    userId: string;
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode?: string;
    isDefault?: boolean;
  }): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/user/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al guardar dirección.' };
    }
  }

  /**
   * Elimina una dirección de envío
   */
  static async deleteAddress(userId: string, addressId: string): Promise<ApiResponse> {
    try {
      const res = await fetch(
        `/api/user/addresses?userId=${encodeURIComponent(userId)}&addressId=${encodeURIComponent(addressId)}`,
        { method: 'DELETE' }
      );
      return await res.json();
    } catch {
      return { success: false, message: 'Error al eliminar dirección.' };
    }
  }

  /**
   * Establece una dirección como predeterminada
   */
  static async setDefaultAddress(userId: string, addressId: string): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/user/addresses/default', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, addressId })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al establecer dirección predeterminada.' };
    }
  }

  /**
   * Agrega una tarjeta de crédito o débito con saldo de prueba Stripe
   */
  static async addPaymentCard(payload: {
    userId: string;
    cardHolder: string;
    cardNumber: string;
    expMonth: number;
    expYear: number;
    balance?: number;
    isDefault?: boolean;
  }): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/user/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al registrar tarjeta.' };
    }
  }

  /**
   * Elimina una tarjeta guardada
   */
  static async deletePaymentCard(userId: string, cardId: string): Promise<ApiResponse> {
    try {
      const res = await fetch(
        `/api/user/cards?userId=${encodeURIComponent(userId)}&cardId=${encodeURIComponent(cardId)}`,
        { method: 'DELETE' }
      );
      return await res.json();
    } catch {
      return { success: false, message: 'Error al eliminar tarjeta.' };
    }
  }

  /**
   * Publica una reseña sobre un producto
   */
  static async addReview(payload: {
    userId: string;
    productId: string;
    rating: number;
    comment?: string;
  }): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/user/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al publicar reseña.' };
    }
  }

  /**
   * Consulta la lista de deseos de un usuario desde la BD
   */
  static async getWishlist(userId: string): Promise<ApiResponse<{ wishlist: any[] }>> {
    try {
      const res = await fetch(`/api/user/wishlist?userId=${encodeURIComponent(userId)}`);
      return await res.json();
    } catch {
      return { success: false, message: 'Error al obtener lista de deseos.' };
    }
  }

  /**
   * Agrega o quita un producto de la lista de deseos en la BD
   */
  static async toggleWishlist(userId: string, productId: string): Promise<ApiResponse<{ isAdded: boolean; wishlist: any[] }>> {
    try {
      const res = await fetch('/api/user/wishlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al actualizar lista de deseos.' };
    }
  }

  /**
   * Sincroniza la lista de deseos local con la cuenta del usuario en PostgreSQL
   */
  static async syncWishlist(userId: string, productIds: string[]): Promise<ApiResponse<{ wishlist: any[] }>> {
    try {
      const res = await fetch('/api/user/wishlist/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productIds })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al sincronizar lista de deseos.' };
    }
  }

  /**
   * Obtiene la bolsa de compras guardada de la cuenta en PostgreSQL
   */
  static async getCart(userId: string): Promise<ApiResponse<{ cart: any[] }>> {
    try {
      const res = await fetch(`/api/cart?userId=${encodeURIComponent(userId)}`);
      return await res.json();
    } catch {
      return { success: false, message: 'Error al obtener la bolsa de compras.' };
    }
  }

  /**
   * Guarda o actualiza un item de la bolsa en PostgreSQL
   */
  static async saveCartItem(payload: {
    userId: string;
    productId: string;
    size: number;
    color: any;
    quantity: number;
  }): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/cart/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al guardar item en la bolsa.' };
    }
  }

  /**
   * Remueve un item de la bolsa en PostgreSQL
   */
  static async removeCartItem(payload: {
    userId: string;
    productId: string;
    size?: number;
    colorName?: string;
  }): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/cart/item', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al remover item de la bolsa.' };
    }
  }

  /**
   * Vacía toda la bolsa del usuario en PostgreSQL
   */
  static async clearCart(userId: string): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/cart/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al vaciar la bolsa.' };
    }
  }

  /**
   * Sincroniza y fusiona la bolsa local con la cuenta de usuario en PostgreSQL
   */
  static async syncCart(userId: string, items: any[]): Promise<ApiResponse<{ cart: any[] }>> {
    try {
      const res = await fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, items })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al sincronizar la bolsa.' };
    }
  }

  // ==========================================================================
  // OPERACIONES DEL PANEL DE ADMINISTRACIÓN Y MINIO (CRUD)
  // ==========================================================================

  /**
   * Obtiene la lista completa de productos para administración
   */
  static async getAdminProducts(userId: string): Promise<ApiResponse<{ products: any[] }>> {
    try {
      const res = await fetch(`/api/admin/products?userId=${encodeURIComponent(userId)}`, {
        headers: { 'x-user-id': userId }
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al cargar productos del inventario.' };
    }
  }

  /**
   * Crea un nuevo producto en el catálogo
   */
  static async createAdminProduct(userId: string, data: any): Promise<ApiResponse<{ product: any }>> {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ ...data, userId })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al crear el producto.' };
    }
  }

  /**
   * Actualiza un producto existente
   */
  static async updateAdminProduct(userId: string, data: any): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ ...data, userId })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al actualizar el producto.' };
    }
  }

  /**
   * Elimina un producto del catálogo
   */
  static async deleteAdminProduct(userId: string, productId: string): Promise<ApiResponse> {
    try {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(productId)}&userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId }
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al eliminar el producto.' };
    }
  }

  /**
   * Actualiza rápidamente el stock o disponibilidad de un producto
   */
  static async updateAdminStock(userId: string, data: { id: string; inStock?: boolean; sizeId?: string; stock?: number }): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/admin/products/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ ...data, userId })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al actualizar existencias.' };
    }
  }

  /**
   * Actualiza la configuración de Circular Showcase (activación, orden y/o recurso .png)
   */
  static async updateAdminShowcase(userId: string, data: { id: string; showcaseActive?: boolean; showcaseOrder?: number; carouselImage?: string | null }): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/admin/products/showcase', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ ...data, userId })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al actualizar Circular Showcase.' };
    }
  }

  /**
   * Obtiene todos los códigos promocionales
   */
  static async getAdminPromos(userId: string): Promise<ApiResponse<{ promos: any[] }>> {
    try {
      const res = await fetch(`/api/admin/promos?userId=${encodeURIComponent(userId)}`, {
        headers: { 'x-user-id': userId }
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al cargar promociones.' };
    }
  }

  /**
   * Crea un nuevo código promocional
   */
  static async createAdminPromo(userId: string, data: any): Promise<ApiResponse<{ promo: any }>> {
    try {
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ ...data, userId })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al crear código promocional.' };
    }
  }

  /**
   * Actualiza un código promocional existente
   */
  static async updateAdminPromo(userId: string, data: any): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/admin/promos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ ...data, userId })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al actualizar código promocional.' };
    }
  }

  /**
   * Elimina un código promocional
   */
  static async deleteAdminPromo(userId: string, promoId: string): Promise<ApiResponse> {
    try {
      const res = await fetch(`/api/admin/promos?id=${encodeURIComponent(promoId)}&userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId }
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al eliminar el código promocional.' };
    }
  }

  /**
   * Activa o desactiva rápidamente un código promocional
   */
  static async toggleAdminPromo(userId: string, promoId: string, isActive: boolean): Promise<ApiResponse<{ isActive: boolean }>> {
    try {
      const res = await fetch('/api/admin/promos/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ id: promoId, isActive, userId })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al cambiar estado del código promocional.' };
    }
  }

  /**
   * Sube un archivo directamente a MinIO Storage
   */
  static async uploadAssetToMinio(userId: string, data: { filename: string; contentType: string; base64: string }): Promise<ApiResponse<{ url: string; filename: string; size: number }>> {
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ ...data, userId })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al subir archivo a MinIO.' };
    }
  }

  /**
   * Obtiene la lista de archivos guardados en MinIO
   */
  static async getMinioAssets(userId: string): Promise<ApiResponse<{ assets: any[] }>> {
    try {
      const res = await fetch(`/api/admin/assets?userId=${encodeURIComponent(userId)}`, {
        headers: { 'x-user-id': userId }
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al consultar recursos en MinIO.' };
    }
  }

  /**
   * Elimina un archivo de MinIO Storage
   */
  static async deleteMinioAsset(userId: string, key: string): Promise<ApiResponse> {
    try {
      const res = await fetch(`/api/admin/assets?key=${encodeURIComponent(key)}&userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId }
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al eliminar archivo de MinIO.' };
    }
  }

  /**
   * Obtiene las categorías disponibles
   */
  static async getAdminCategories(): Promise<ApiResponse<{ categories: any[] }>> {
    try {
      const res = await fetch('/api/admin/categories');
      return await res.json();
    } catch {
      return { success: false, message: 'Error al consultar categorías.' };
    }
  }

  /**
   * Obtiene la lista de usuarios para asignar tarjetas de prueba en Admin
   */
  static async getAdminUsers(adminUserId: string): Promise<ApiResponse> {
    try {
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(adminUserId)}`, {
        headers: { 'x-user-id': adminUserId }
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al consultar usuarios.' };
    }
  }

  /**
   * Obtiene todas las tarjetas registradas para gestión y pruebas en Admin
   */
  static async getAdminCards(adminUserId: string): Promise<ApiResponse> {
    try {
      const res = await fetch(`/api/admin/cards?userId=${encodeURIComponent(adminUserId)}`, {
        headers: { 'x-user-id': adminUserId }
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al consultar tarjetas para pruebas.' };
    }
  }

  /**
   * Crea una tarjeta de prueba desde el Panel de Administrador con tipo y fondos específicos
   */
  static async createAdminCard(adminUserId: string, payload: {
    targetUserId: string;
    cardHolder: string;
    cardNumber: string;
    cvc?: string;
    expMonth?: number;
    expYear?: number;
    balance: number;
    isDefault?: boolean;
  }): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/admin/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminUserId
        },
        body: JSON.stringify({ ...payload, adminUserId })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al crear tarjeta de prueba.' };
    }
  }

  /**
   * Ajusta los fondos / saldo de una tarjeta desde el Panel Admin
   */
  static async updateAdminCardBalance(adminUserId: string, cardId: string, balance: number): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/admin/cards/balance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': adminUserId
        },
        body: JSON.stringify({ adminUserId, cardId, balance })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al actualizar saldo de tarjeta.' };
    }
  }

  /**
   * Elimina una tarjeta de prueba desde el Panel Admin
   */
  static async deleteAdminCard(adminUserId: string, cardId: string): Promise<ApiResponse> {
    try {
      const res = await fetch(`/api/admin/cards?cardId=${encodeURIComponent(cardId)}&adminUserId=${encodeURIComponent(adminUserId)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': adminUserId }
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Error al eliminar tarjeta.' };
    }
  }
}
