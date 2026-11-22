import { Product, FilterState } from '../types/product';
import { CartItem, WishlistItem } from '../types/cart';
import { User } from '../types/auth';
import { PromoCode } from '../types/promo';
import { StorageService } from '../services/storageService';
import { ProductService } from '../services/productService';
import { ApiService } from '../services/apiService';
import { SizeUnit } from '../utils/sizeConverter';

type Listener = () => void;

export class Store {
  private static instance: Store;

  public products: Product[] = [];
  public filteredProducts: Product[] = [];
  public loading: boolean = true;

  public filters: FilterState = {
    category: 'all',
    search: '',
    genders: [],
    minPrice: 0,
    maxPrice: 300,
    sizes: [],
    colors: [],
    heights: [],
    sortBy: 'featured'
  };

  public cart: CartItem[] = [];
  public wishlist: WishlistItem[] = [];

  // Usuario y Autenticación conectada a PostgreSQL
  public currentUser: User | null = null;
  public isAuthOpen: boolean = false;
  public isProfileOpen: boolean = false;
  public isAdminOpen: boolean = false;

  // Promociones y Descuentos conectados a BD
  public isPromoOpen: boolean = false;
  public appliedPromo: PromoCode | null = null;
  public pendingPromoCode: string | null = null;

  public welcomePromo: PromoCode = {
    id: 'promo-welcome',
    code: 'BIENVENIDA5',
    description: '5% de descuento exclusivo para cuenta nueva (1 solo uso)',
    discountType: 'PERCENTAGE',
    discountValue: 5,
    onePerUser: true,
    isWelcomeOnly: true,
    isActive: true
  };

  public promoCodes: PromoCode[] = [
    {
      id: 'promo-welcome',
      code: 'BIENVENIDA5',
      description: '5% de descuento exclusivo para cuenta nueva (1 solo uso)',
      discountType: 'PERCENTAGE',
      discountValue: 5,
      minPurchase: 0,
      onePerUser: true,
      isWelcomeOnly: true,
      isActive: true
    },
    {
      id: 'promo-1',
      code: 'BLESSED10',
      description: '10% de descuento en toda la tienda (1 uso por persona)',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minPurchase: 30,
      onePerUser: true,
      isActive: true
    },
    {
      id: 'promo-2',
      code: 'BLESSED20',
      description: '20% de descuento para miembros VIP (1 uso por persona)',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minPurchase: 100,
      onePerUser: true,
      isActive: true
    },
    {
      id: 'promo-3',
      code: 'WILD15',
      description: '15% de descuento en colección Blessed Wild (1 uso por persona)',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minPurchase: 50,
      onePerUser: true,
      isActive: true
    },
    {
      id: 'promo-4',
      code: 'VERANO25',
      description: '$25 de descuento en compras superiores a $120 (1 uso por persona)',
      discountType: 'FIXED',
      discountValue: 25,
      minPurchase: 120,
      onePerUser: true,
      isActive: true
    }
  ];

  public isCartOpen: boolean = false;
  public isWishlistOpen: boolean = false;
  public isMobileFiltersOpen: boolean = false;
  public isSearchOpen: boolean = false;
  public activeQuickViewProduct: Product | null = null;
  public active3DProduct: Product | null = null;

  // Formato activo de medidas de calzado (EU, US, UK, CM)
  public activeSizeUnit: SizeUnit = 'EU';

  private listeners: Set<Listener> = new Set();

  private constructor() {
    this.cart = StorageService.getCart();
    this.wishlist = StorageService.getWishlist();
    this.currentUser = StorageService.getUser();
    this.appliedPromo = StorageService.getPromo();

    const savedSizeUnit = StorageService.getSizeUnit() as SizeUnit;
    if (savedSizeUnit && ['EU', 'US', 'UK', 'CM'].includes(savedSizeUnit)) {
      this.activeSizeUnit = savedSizeUnit;
    }

    // Cargar cupones reales y estado de cuenta desde la base de datos
    this.loadPromos();
    if (this.currentUser) {
      this.loadUserCoupons();
      this.loadWishlist();
      this.loadCart();
    }
  }

  public static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store();
    }
    return Store.instance;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error en listener del store:', err);
      }
    });
  }

  // --- CARGA DE CUPONES DESDE LA BASE DE DATOS ---
  public async loadPromos(): Promise<void> {
    try {
      const dbPromos = await ApiService.getCoupons(this.currentUser?.id);
      if (dbPromos && dbPromos.length > 0) {
        this.promoCodes = dbPromos;
        const welcome = dbPromos.find((p) => p.code === 'BIENVENIDA5');
        if (welcome) this.welcomePromo = welcome;
        this.notify();
      }
    } catch (e) {
      console.warn('Usando catálogo de cupones base:', e);
    }
  }

  public async loadUserCoupons(): Promise<void> {
    if (!this.currentUser) return;
    try {
      const myCoupons = await ApiService.getMyCoupons(this.currentUser.id);
      if (myCoupons) {
        this.currentUser.userCoupons = myCoupons;
        StorageService.saveUser(this.currentUser);
        this.notify();
      }
    } catch (e) {
      console.warn('Error cargando cupones de usuario:', e);
    }
  }

  // --- CARGA Y SINCRONIZACIÓN DE LISTA DE DESEOS CON LA CUENTA ---
  public async loadWishlist(): Promise<void> {
    if (!this.currentUser) return;
    try {
      const res = await ApiService.getWishlist(this.currentUser.id);
      const rawList = res.data?.wishlist || (res as any).wishlist;
      if (res.success && rawList) {
        this.wishlist = rawList.map((w: any) => {
          const fullProd = this.products.find((p) => p.id === w.productId);
          return {
            productId: w.productId,
            product: fullProd || w.product,
            addedAt: w.addedAt
          };
        });
        StorageService.saveWishlist(this.wishlist);
        this.notify();
      }
    } catch (e) {
      console.warn('Error cargando lista de deseos de usuario:', e);
    }
  }

  public async syncWishlistWithAccount(): Promise<void> {
    if (!this.currentUser) return;
    try {
      const localIds = this.wishlist.map((w) => w.productId);
      const res = await ApiService.syncWishlist(this.currentUser.id, localIds);
      const rawList = res.data?.wishlist || (res as any).wishlist;
      if (res.success && rawList) {
        this.wishlist = rawList.map((w: any) => {
          const fullProd = this.products.find((p) => p.id === w.productId);
          return {
            productId: w.productId,
            product: fullProd || w.product,
            addedAt: w.addedAt
          };
        });
        StorageService.saveWishlist(this.wishlist);
        this.notify();
      }
    } catch (e) {
      console.warn('Error sincronizando lista de deseos con la cuenta:', e);
    }
  }

  // --- CARGA Y SINCRONIZACIÓN DE BOLSA DE COMPRAS (CARRITO) CON LA CUENTA ---
  public async loadCart(): Promise<void> {
    if (!this.currentUser) return;
    try {
      const res = await ApiService.getCart(this.currentUser.id);
      const rawCart = res.data?.cart || (res as any).cart;
      if (res.success && rawCart) {
        this.cart = rawCart.map((ci: any) => {
          const fullProd = this.products.find((p) => p.id === ci.productId);
          return {
            id: ci.id || `${ci.productId}-${ci.size}-${ci.color?.name || 'Original'}`,
            productId: ci.productId,
            product: fullProd || ci.product,
            size: ci.size,
            color: ci.color || { name: 'Original', hex: '#8B5A2B', image: ci.product?.image },
            quantity: ci.quantity
          };
        });
        StorageService.saveCart(this.cart);
        this.notify();
      }
    } catch (e) {
      console.warn('Error cargando bolsa de la BD:', e);
    }
  }

  public async syncCartWithAccount(): Promise<void> {
    if (!this.currentUser) return;
    try {
      const res = await ApiService.syncCart(this.currentUser.id, this.cart);
      const rawCart = res.data?.cart || (res as any).cart;
      if (res.success && rawCart) {
        this.cart = rawCart.map((ci: any) => {
          const fullProd = this.products.find((p) => p.id === ci.productId);
          return {
            id: ci.id || `${ci.productId}-${ci.size}-${ci.color?.name || 'Original'}`,
            productId: ci.productId,
            product: fullProd || ci.product,
            size: ci.size,
            color: ci.color || { name: 'Original', hex: '#8B5A2B', image: ci.product?.image },
            quantity: ci.quantity
          };
        });
        StorageService.saveCart(this.cart);
        this.notify();
      }
    } catch (e) {
      console.warn('Error sincronizando bolsa con la cuenta:', e);
    }
  }

  // --- ACCIONES DE PRODUCTOS ---
  public async loadProducts(): Promise<void> {
    this.loading = true;
    this.notify();

    try {
      this.products = await ProductService.getProducts();
      this.applyFilters();
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  public setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]): void {
    this.filters[key] = value;
    this.applyFilters();
    this.notify();
  }

  public resetFilters(): void {
    this.filters = {
      category: 'all',
      search: '',
      genders: [],
      minPrice: 0,
      maxPrice: 300,
      sizes: [],
      colors: [],
      heights: [],
      sortBy: 'featured'
    };
    this.applyFilters();
    this.notify();
  }

  public applyFilters(): void {
    this.filteredProducts = ProductService.filterAndSortProducts(
      this.products,
      this.filters
    );
  }

  public setSizeUnit(unit: SizeUnit): void {
    this.activeSizeUnit = unit;
    StorageService.saveSizeUnit(unit);
    this.notify();
  }

  // --- ACCIONES DEL CARRITO (PERSISTENCIA CON LA CUENTA) ---
  public addToCart(product: Product, size: number, colorName?: string): void {
    const selectedColor = colorName
      ? product.colors.find((c) => c.name === colorName) || product.colors[0]
      : product.colors[0];

    const itemId = `${product.id}-${size}-${selectedColor.name}`;
    const existingIndex = this.cart.findIndex((item) => item.id === itemId);

    if (existingIndex > -1) {
      this.cart[existingIndex].quantity += 1;
    } else {
      this.cart.push({
        id: itemId,
        productId: product.id,
        product,
        size,
        color: selectedColor,
        quantity: 1
      });
    }

    StorageService.saveCart(this.cart);
    this.notify();

    // Sincronizar en segundo plano con PostgreSQL si hay sesión iniciada
    if (this.currentUser) {
      const currentItem = this.cart.find((i) => i.id === itemId);
      if (currentItem) {
        ApiService.saveCartItem({
          userId: this.currentUser.id,
          productId: currentItem.productId,
          size: currentItem.size,
          color: currentItem.color,
          quantity: currentItem.quantity
        }).catch((e) => console.warn('Error guardando item de bolsa en BD:', e));
      }
    }
  }

  public updateCartQuantity(itemId: string, delta: number): void {
    const itemIndex = this.cart.findIndex((item) => item.id === itemId);
    if (itemIndex > -1) {
      this.cart[itemIndex].quantity += delta;
      const targetItem = { ...this.cart[itemIndex] };
      if (this.cart[itemIndex].quantity <= 0) {
        this.cart.splice(itemIndex, 1);
      }
      StorageService.saveCart(this.cart);
      this.notify();

      if (this.currentUser) {
        if (targetItem.quantity <= 0) {
          ApiService.removeCartItem({
            userId: this.currentUser.id,
            productId: targetItem.productId,
            size: targetItem.size,
            colorName: targetItem.color.name
          }).catch((e) => console.warn('Error eliminando item de bolsa en BD:', e));
        } else {
          ApiService.saveCartItem({
            userId: this.currentUser.id,
            productId: targetItem.productId,
            size: targetItem.size,
            color: targetItem.color,
            quantity: targetItem.quantity
          }).catch((e) => console.warn('Error actualizando cantidad en BD:', e));
        }
      }
    }
  }

  public removeFromCart(itemId: string): void {
    const item = this.cart.find((i) => i.id === itemId);
    this.cart = this.cart.filter((i) => i.id !== itemId);
    StorageService.saveCart(this.cart);
    this.notify();

    if (this.currentUser && item) {
      ApiService.removeCartItem({
        userId: this.currentUser.id,
        productId: item.productId,
        size: item.size,
        colorName: item.color.name
      }).catch((e) => console.warn('Error retirando item de bolsa en BD:', e));
    }
  }

  public clearCart(): void {
    this.cart = [];
    StorageService.saveCart(this.cart);
    this.notify();

    if (this.currentUser) {
      ApiService.clearCart(this.currentUser.id).catch((e) =>
        console.warn('Error vaciando bolsa en BD:', e)
      );
    }
  }

  public getCartSubtotal(): number {
    return this.cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  }

  public getDiscountAmount(): number {
    const subtotal = this.getCartSubtotal();
    if (!this.appliedPromo || subtotal === 0) return 0;
    if (this.appliedPromo.minPurchase && subtotal < this.appliedPromo.minPurchase) return 0;

    if (this.appliedPromo.discountType === 'PERCENTAGE') {
      return (subtotal * this.appliedPromo.discountValue) / 100;
    } else {
      return Math.min(subtotal, this.appliedPromo.discountValue);
    }
  }

  public getCartTotal(): number {
    const subtotal = this.getCartSubtotal();
    const discount = this.getDiscountAmount();
    return Math.max(0, subtotal - discount);
  }

  public getCartCount(): number {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  // ==========================================================================
  // REGLAS Y ACCIONES DE CUPONES Y DESCUENTOS (BASE DE DATOS REAL)
  // ==========================================================================

  /**
   * REGLAS CRÍTICAS:
   * 1. Solo se pueden activar o canjear al estar logueado.
   * 2. Si no está logueado y trata de aplicar BIENVENIDA5 (o cualquier cupón),
   *    lo manda inmediatamente al login / register y guarda el código pendiente.
   * 3. Valida en la base de datos las relaciones de 1 solo uso por persona.
   */
  public async applyPromo(code: string): Promise<{ success: boolean; message: string; requireAuth?: boolean }> {
    const clean = code.trim().toUpperCase();

    // 1. REGLA: Si NO está logueado -> Redirigir inmediatamente al login / register
    if (!this.currentUser) {
      this.pendingPromoCode = clean;
      this.togglePromo(false);
      this.toggleCart(false);
      this.toggleAuth(true);
      return {
        success: false,
        requireAuth: true,
        message: `Para canjear el cupón ${clean} debes iniciar sesión o registrarte. Te hemos redirigido para continuar.`
      };
    }

    // 2. Si está logueado: consultar validación y relaciones en PostgreSQL
    const res = await ApiService.applyCoupon(
      this.currentUser.id,
      clean,
      this.getCartSubtotal()
    );

    if (res.success && res.promo) {
      this.appliedPromo = res.promo;
      StorageService.savePromo(res.promo);
      await this.loadUserCoupons();
      await this.loadPromos();
      this.notify();
      return {
        success: true,
        message: res.message || `¡Cupón ${res.promo.code} aplicado con éxito!`
      };
    }

    if (res.requireAuth) {
      this.pendingPromoCode = clean;
      this.togglePromo(false);
      this.toggleAuth(true);
      return {
        success: false,
        requireAuth: true,
        message: res.message || 'Debes iniciar sesión.'
      };
    }

    if ((res as any).codeAdded) {
      await this.loadUserCoupons();
      this.notify();
    }

    return {
      success: false,
      message: res.message || `No se pudo aplicar el cupón "${code}".`
    };
  }

  /**
   * Agrega un cupón a la cuenta personal del usuario en la base de datos (UserCoupon)
   */
  public async claimPromoToAccount(code: string): Promise<{ success: boolean; message: string; requireAuth?: boolean }> {
    const clean = code.trim().toUpperCase();

    if (!this.currentUser) {
      this.pendingPromoCode = clean;
      this.togglePromo(false);
      this.toggleCart(false);
      this.toggleAuth(true);
      return {
        success: false,
        requireAuth: true,
        message: `Inicia sesión o regístrate para agregar el cupón ${clean} a tu cuenta personal.`
      };
    }

    const res = await ApiService.claimCoupon(this.currentUser.id, clean);
    if (res.success) {
      await this.loadUserCoupons();
      await this.loadPromos();
      this.notify();
    }
    return {
      success: res.success,
      message: res.message || '',
      requireAuth: res.requireAuth
    };
  }

  public removePromo(): void {
    this.appliedPromo = null;
    StorageService.savePromo(null);
    this.notify();
  }

  public togglePromo(open?: boolean): void {
    this.isPromoOpen = open !== undefined ? open : !this.isPromoOpen;
    this.notify();
  }

  // ==========================================================================
  // ACCIONES DE USUARIO Y AUTENTICACIÓN (CONECTADAS A BASE DE DATOS)
  // ==========================================================================

  /**
   * Inicia sesión conectando a PostgreSQL
   */
  public async login(email: string, password?: string): Promise<{ success: boolean; message: string; requireRegister?: boolean }> {
    const res = await ApiService.login(email, password);

    if (res.success && res.user) {
      this.currentUser = res.user;
      StorageService.saveUser(res.user);
      await this.loadPromos();
      await this.loadUserCoupons();
      await this.syncWishlistWithAccount();
      await this.syncCartWithAccount();

      // Si había un cupón pendiente que intentó aplicar antes del login, aplicarlo automáticamente
      if (this.pendingPromoCode) {
        const pending = this.pendingPromoCode;
        this.pendingPromoCode = null;
        await this.applyPromo(pending);
      }

      this.notify();
      return { success: true, message: res.message || `¡Bienvenido, ${res.user.name}!` };
    }

    return {
      success: false,
      requireRegister: res.requireRegister,
      message: res.message || 'Error al iniciar sesión.'
    };
  }

  /**
   * Registro por primera vez en PostgreSQL:
   * "una vez te registras por primera vez ya lo puedes agregar a tu cuenta los cupones de descuentos se agregan a la cuenta personal"
   */
  public async register(
    firstName: string,
    lastName: string,
    email: string,
    phone?: string
  ): Promise<{ success: boolean; message: string; requireLogin?: boolean }> {
    const fullName = `${firstName} ${lastName}`.trim();
    const res = await ApiService.register(fullName, email, phone);

    if (res.success && res.user) {
      this.currentUser = res.user;
      StorageService.saveUser(res.user);
      await this.loadPromos();
      await this.loadUserCoupons();
      await this.syncWishlistWithAccount();
      await this.syncCartWithAccount();

      // Si había un cupón pendiente (o por defecto el de bienvenida BIENVENIDA5), activarlo
      const targetCode = this.pendingPromoCode || 'BIENVENIDA5';
      this.pendingPromoCode = null;
      await this.applyPromo(targetCode);

      this.notify();
      return {
        success: true,
        message: res.message || `¡Cuenta creada exitosamente! Cupón de bienvenida agregado a tu cuenta.`
      };
    }

    return {
      success: false,
      requireLogin: res.requireLogin,
      message: res.message || 'Error al crear la cuenta.'
    };
  }

  public logout(): void {
    this.currentUser = null;
    this.appliedPromo = null;
    this.pendingPromoCode = null;
    this.isProfileOpen = false;
    this.wishlist = [];
    this.cart = [];
    StorageService.saveUser(null);
    StorageService.savePromo(null);
    StorageService.saveWishlist([]);
    StorageService.saveCart([]);
    try {
      localStorage.removeItem('blessed_sandals_user_v1');
      localStorage.removeItem('blessed_sandals_promo_v1');
      localStorage.removeItem('blessed_sandals_wishlist_v1');
      localStorage.removeItem('blessed_sandals_cart_v1');
    } catch (e) {
      console.error('Error clearing storage', e);
    }
    this.loadPromos();
    this.notify();
  }

  public toggleAuth(open?: boolean): void {
    this.isAuthOpen = open !== undefined ? open : !this.isAuthOpen;
    this.notify();
  }

  public toggleProfile(open?: boolean): void {
    this.isProfileOpen = open !== undefined ? open : !this.isProfileOpen;
    this.notify();
  }

  public toggleAdmin(open?: boolean): void {
    const shouldOpen = open !== undefined ? open : !this.isAdminOpen;
    if (shouldOpen && (!this.currentUser || this.currentUser.role !== 'ADMIN')) {
      this.isAdminOpen = false;
      this.toggleAuth(true);
      this.notify();
      return;
    }
    this.isAdminOpen = shouldOpen;
    this.notify();
  }

  // ==========================================================================
  // CHECKOUT REAL CONECTADO A BASE DE DATOS
  // ==========================================================================
  public async checkout(): Promise<{ success: boolean; orderNumber?: string; message: string; requireAuth?: boolean }> {
    if (!this.currentUser) {
      this.toggleAuth(true);
      return {
        success: false,
        requireAuth: true,
        message: 'Debes iniciar sesión para completar la compra.'
      };
    }

    if (this.cart.length === 0) {
      return { success: false, message: 'La bolsa de compras está vacía.' };
    }

    const subtotal = this.getCartSubtotal();
    const discount = this.getDiscountAmount();
    const shipping = subtotal > 50 || subtotal === 0 ? 0 : 9.99;
    const total = Math.max(0, subtotal - discount + shipping);

    const res = await ApiService.checkout({
      userId: this.currentUser.id,
      items: this.cart,
      promoCodeId: this.appliedPromo?.id,
      subtotal,
      discount,
      shipping,
      total
    });

    if (res.success) {
      this.clearCart();
      this.removePromo();
      await this.loadUserCoupons();
      await this.loadPromos();
      this.notify();
      return {
        success: true,
        orderNumber: res.orderNumber,
        message: '¡Pago completado con éxito! Tu orden ha sido guardada en la base de datos.'
      };
    }

    return {
      success: false,
      message: res.message || 'Error al procesar el pedido.'
    };
  }

  // --- ACCIONES DE FAVORITOS (WISHLIST VINCULADOS A CUENTA) ---
  public toggleWishlist(product: Product): boolean {
    const index = this.wishlist.findIndex((w) => w.productId === product.id);
    let isAdded = false;

    if (index > -1) {
      this.wishlist.splice(index, 1);
      isAdded = false;
    } else {
      this.wishlist.push({
        productId: product.id,
        product,
        addedAt: new Date().toISOString()
      });
      isAdded = true;
    }

    StorageService.saveWishlist(this.wishlist);
    this.notify();

    // Sincronizar en segundo plano con PostgreSQL si el usuario tiene sesión iniciada
    if (this.currentUser) {
      ApiService.toggleWishlist(this.currentUser.id, product.id).catch((e) => {
        console.warn('Error al persistir favorito en BD:', e);
      });
    }

    return isAdded;
  }

  public isInWishlist(productId: string): boolean {
    return this.wishlist.some((w) => w.productId === productId);
  }

  // --- MODALES & OVERLAYS ---
  public toggleCart(open?: boolean): void {
    this.isCartOpen = open !== undefined ? open : !this.isCartOpen;
    this.notify();
  }

  public toggleWishlistDrawer(open?: boolean): void {
    this.isWishlistOpen = open !== undefined ? open : !this.isWishlistOpen;
    this.notify();
  }

  public toggleMobileFilters(open?: boolean): void {
    this.isMobileFiltersOpen = open !== undefined ? open : !this.isMobileFiltersOpen;
    this.notify();
  }

  public toggleSearch(open?: boolean): void {
    this.isSearchOpen = open !== undefined ? open : !this.isSearchOpen;
    this.notify();
  }

  public openQuickView(product: Product): void {
    this.activeQuickViewProduct = product;
    this.notify();
  }

  public closeQuickView(): void {
    this.activeQuickViewProduct = null;
    this.notify();
  }

  public open3DViewer(product: Product): void {
    this.active3DProduct = product;
    this.notify();
  }

  public close3DViewer(): void {
    this.active3DProduct = null;
    this.notify();
  }
}
