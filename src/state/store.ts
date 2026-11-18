import { Product, FilterState } from '../types/product';
import { CartItem, WishlistItem } from '../types/cart';
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

  public getCartTotal(): number {
    return this.cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  }

  public getCartCount(): number {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
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
