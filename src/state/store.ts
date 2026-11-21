import { Product, FilterState } from '../types/product';
import { CartItem, WishlistItem } from '../types/cart';
import { User } from '../types/auth';
import { PromoCode } from '../types/promo';
import { StorageService } from '../services/storageService';
import { ProductService } from '../services/productService';

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

  // Usuario y Autenticación
  public currentUser: User | null = null;
  public isAuthOpen: boolean = false;

  // Promociones y Descuentos
  public isPromoOpen: boolean = false;
  public appliedPromo: PromoCode | null = null;
  public welcomePromo: PromoCode = {
    id: 'promo-welcome',
    code: 'BIENVENIDA5',
    description: '5% de descuento para cuenta nueva (1 solo uso)',
    discountType: 'PERCENTAGE',
    discountValue: 5,
    isActive: true
  };
  public isWelcomePromoRedeemed: boolean = false;
  public promoCodes: PromoCode[] = [
    {
      id: 'promo-1',
      code: 'BLESSED10',
      description: '10% de descuento en toda la tienda',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minPurchase: 30,
      isActive: true
    },
    {
      id: 'promo-2',
      code: 'BLESSED20',
      description: '20% de descuento para miembros VIP',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minPurchase: 100,
      isActive: true
    },
    {
      id: 'promo-3',
      code: 'WILD15',
      description: '15% de descuento en colección Blessed Wild',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minPurchase: 50,
      isActive: true
    },
    {
      id: 'promo-4',
      code: 'VERANO25',
      description: '$25 de descuento en compras superiores a $120',
      discountType: 'FIXED',
      discountValue: 25,
      minPurchase: 120,
      isActive: true
    }
  ];

  public isCartOpen: boolean = false;
  public isWishlistOpen: boolean = false;
  public isMobileFiltersOpen: boolean = false;
  public isSearchOpen: boolean = false;
  public activeQuickViewProduct: Product | null = null;
  public active3DProduct: Product | null = null;

  private listeners: Set<Listener> = new Set();

  private constructor() {
    this.cart = StorageService.getCart();
    this.wishlist = StorageService.getWishlist();
    this.currentUser = StorageService.getUser();
    this.appliedPromo = StorageService.getPromo();
    this.isWelcomePromoRedeemed = StorageService.getWelcomePromoRedeemed();
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
    this.listeners.forEach((listener) => listener());
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

  // --- ACCIONES DEL CARRITO ---
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
  }

  public updateCartQuantity(itemId: string, delta: number): void {
    const itemIndex = this.cart.findIndex((item) => item.id === itemId);
    if (itemIndex > -1) {
      this.cart[itemIndex].quantity += delta;
      if (this.cart[itemIndex].quantity <= 0) {
        this.cart.splice(itemIndex, 1);
      }
      StorageService.saveCart(this.cart);
      this.notify();
    }
  }

  public removeFromCart(itemId: string): void {
    this.cart = this.cart.filter((item) => item.id !== itemId);
    StorageService.saveCart(this.cart);
    this.notify();
  }

  public clearCart(): void {
    this.cart = [];
    StorageService.saveCart(this.cart);
    this.notify();
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

  // --- ACCIONES DE PROMOCIONES / CUPONES ---
  public applyPromo(code: string): { success: boolean; message: string } {
    const clean = code.trim().toUpperCase();

    // Verificación especial para cupón de bienvenida (5% para cuentas nuevas)
    if (clean === 'BIENVENIDA5' || clean === 'BIENVENIDO5') {
      if (this.isWelcomePromoRedeemed) {
        return {
          success: false,
          message: 'El cupón de bienvenida BIENVENIDA5 (5%) ya ha sido canjeado anteriormente. Solo es válido 1 vez por cuenta nueva.'
        };
      }
      this.appliedPromo = this.welcomePromo;
      this.isWelcomePromoRedeemed = true;
      StorageService.saveWelcomePromoRedeemed(true);
      StorageService.savePromo(this.welcomePromo);
      this.notify();
      return {
        success: true,
        message: '¡Cupón de bienvenida BIENVENIDA5 aplicado con éxito! 5% de descuento en tu compra.'
      };
    }

    const found = this.promoCodes.find((p) => p.code === clean && p.isActive);
    if (!found) {
      return { success: false, message: `El código "${code}" no es válido o ha expirado.` };
    }
    const subtotal = this.getCartSubtotal();
    if (found.minPurchase && subtotal > 0 && subtotal < found.minPurchase) {
      return {
        success: false,
        message: `El código ${found.code} requiere una compra mínima de $${found.minPurchase}. (Subtotal actual: $${subtotal.toFixed(2)})`
      };
    }
    this.appliedPromo = found;
    StorageService.savePromo(found);
    this.notify();
    return {
      success: true,
      message: `¡Código ${found.code} aplicado con éxito! (${found.description})`
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

  // --- ACCIONES DE USUARIO Y AUTENTICACIÓN ---
  public login(email: string, name?: string, role: 'USER' | 'ADMIN' = 'USER'): void {
    const user: User = {
      id: 'usr-' + Date.now(),
      email,
      name: name || email.split('@')[0],
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      role,
      createdAt: new Date().toISOString()
    };
    this.currentUser = user;
    StorageService.saveUser(user);
    this.notify();
  }

  public logout(): void {
    this.currentUser = null;
    StorageService.saveUser(null);
    this.notify();
  }

  public toggleAuth(open?: boolean): void {
    this.isAuthOpen = open !== undefined ? open : !this.isAuthOpen;
    this.notify();
  }

  // --- ACCIONES DE FAVORITOS (WISHLIST) ---
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
