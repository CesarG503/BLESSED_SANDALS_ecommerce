import { Store } from '../state/store';
import { ApiService } from '../services/apiService';
import { Icons } from './Icons';
import { Toast } from './Toast';
import confetti from 'canvas-confetti';
import {
  SizeUnit,
  formatSizeDisplay,
  formatFullEquivalence,
  getSizeEquivalence,
  unitToEu,
  STANDARD_CHART_SIZES
} from '../utils/sizeConverter';
import {
  DEFAULT_SHOWCASE_DEMOS,
  ShowcaseSettingsService
} from '../data/showcaseDemoItems';
import { HorseShowcaseSettingsService } from '../data/horseShowcaseSettings';
import {
  AnnouncementSettingsService,
  AnnouncementItem
} from '../data/announcementSettings';

export type AdminTab =
  | 'products-list'
  | 'products-create'
  | 'promos-list'
  | 'promos-create'
  | 'promos-store-create'
  | 'minio-storage'
  | 'circular-showcase'
  | 'horse-showcase'
  | 'announcements'
  | 'stripe-test-cards';

export interface ProductVariantForm {
  id: string;
  hex: string;
  name: string;
  gallery: string[];
  model3dUrl: string | null;
  sizes: Array<{ size: number; stock: number }>;
  price?: number;
  originalPrice?: number | null;
}

export class AdminPanel {
  private container: HTMLElement;
  private store: Store;
  private activeTab: AdminTab = 'products-list';
  private isOpen: boolean = false;
  private isClosing: boolean = false;

  // Data cache
  private products: any[] = [];
  private promos: any[] = [];
  private categories: any[] = [];
  private assets: any[] = [];

  // Search and filters for products
  private productSearchTerm: string = '';
  private productCategoryFilter: string = 'all';

  // State for editing
  private editingProduct: any | null = null;
  private editingPromo: any | null = null;
  private formSizes: Array<{ size: number; stock: number }> = [];
  private formGallery: string[] = [];
  private formModel3dUrl: string | null = null;
  private formCarouselImage: string | null = null;
  private formVariants: ProductVariantForm[] = [];
  private activeVariantIndex: number = 0;
  private adminSizeUnit: SizeUnit = 'EU';
  private showEquivalences: boolean = false;
  private showcaseSearchTerm: string = '';
  private horseShowcaseSearchTerm: string = '';
  private demosAccordionOpen: boolean = false;
  private activeModalProductId: string | null = null;
  private promoStoreItems: Array<{ productId: string; promoPrice: number; badgeLabel: string }> = [];
  private editingAnnouncement: AnnouncementItem | null = null;
  private adminCards: any[] = [];
  private adminUsers: any[] = [];

  private initFormVariants(): void {
    if (this.editingProduct) {
      const p = this.editingProduct;
      this.formCarouselImage = p.carouselImage || null;
      if (Array.isArray(p.colors) && p.colors.length > 0) {
        this.formVariants = p.colors.map((c: any, index: number) => {
          const isPrimary = index === 0;
          let gallery: string[] = [];
          if (Array.isArray(c.gallery) && c.gallery.length > 0) {
            gallery = [...c.gallery];
          } else if (c.image) {
            gallery = [c.image];
          } else if (isPrimary && Array.isArray(p.gallery) && p.gallery.length > 0) {
            gallery = [...p.gallery];
          } else if (isPrimary && p.image) {
            gallery = [p.image];
          }

          // Existencias independientes por variante de color
          let sizes: Array<{ size: number; stock: number }> = [];
          if (Array.isArray(c.sizes) && c.sizes.length > 0) {
            sizes = c.sizes.map((s: any) => ({ size: Number(s.size), stock: Number(s.stock) || 0 }));
          } else if (isPrimary && Array.isArray(p.sizes) && p.sizes.length > 0) {
            sizes = p.sizes.map((s: any) => ({ size: Number(s.size), stock: Number(s.stock) || 0 }));
          } else {
            sizes = STANDARD_CHART_SIZES.map((sz) => ({ size: sz, stock: 0 }));
          }

          // Precios independientes por variante de color
          const price = c.price !== undefined && c.price !== null ? Number(c.price) : (p.price !== undefined ? Number(p.price) : undefined);
          const originalPrice = c.originalPrice !== undefined && c.originalPrice !== null ? Number(c.originalPrice) : (p.originalPrice !== undefined ? Number(p.originalPrice) : null);

          return {
            id: 'var_' + (c.id || index + 1),
            hex: c.hex || (index === 0 ? '#000000' : '#ffffff'),
            name: c.name || `Variante ${index + 1}`,
            gallery,
            model3dUrl: isPrimary ? (p.model3dUrl || null) : null,
            sizes,
            price,
            originalPrice
          };
        });
      } else {
        const gallery = Array.isArray(p.gallery) && p.gallery.length > 0
          ? [...p.gallery]
          : (p.image ? [p.image] : []);
        const sizes = Array.isArray(p.sizes) && p.sizes.length > 0
          ? p.sizes.map((s: any) => ({ size: Number(s.size), stock: Number(s.stock) || 0 }))
          : STANDARD_CHART_SIZES.map((sz) => ({ size: sz, stock: 0 }));

        this.formVariants = [
          {
            id: 'var_1',
            hex: '#000000',
            name: 'Original',
            gallery,
            model3dUrl: p.model3dUrl || null,
            sizes,
            price: p.price !== undefined ? Number(p.price) : undefined,
            originalPrice: p.originalPrice !== undefined ? Number(p.originalPrice) : null
          }
        ];
      }
    } else {
      // Producto nuevo: 1 variante negra predeterminada con stock en 0 y galería vacía
      this.formCarouselImage = null;
      this.formVariants = [
        {
          id: 'var_1',
          hex: '#000000',
          name: 'Negro',
          gallery: [],
          model3dUrl: null,
          sizes: STANDARD_CHART_SIZES.map((sz) => ({ size: sz, stock: 0 })),
          price: undefined,
          originalPrice: null
        }
      ];
    }

    this.activeVariantIndex = 0;
    this.loadActiveVariantIntoForm();
  }

  private initFormSizes(): void {
    this.initFormVariants();
  }

  private loadActiveVariantIntoForm(): void {
    const v = this.formVariants[this.activeVariantIndex];
    if (!v) return;
    this.formSizes = v.sizes.map((s) => ({ ...s }));
    this.formSizes.sort((a, b) => a.size - b.size);
    this.formGallery = [...v.gallery];
    this.formModel3dUrl = v.model3dUrl;

    // Sincronizar campos de precio en el DOM si el formulario ya está renderizado
    const priceInput = this.container.querySelector('#prod-price') as HTMLInputElement | null;
    if (priceInput && v.price !== undefined) {
      priceInput.value = v.price !== null ? String(v.price) : '';
    }
    const origPriceInput = this.container.querySelector('#prod-orig-price') as HTMLInputElement | null;
    if (origPriceInput) {
      origPriceInput.value = v.originalPrice !== undefined && v.originalPrice !== null ? String(v.originalPrice) : '';
    }
  }

  private saveActiveVariantFromForm(): void {
    const v = this.formVariants[this.activeVariantIndex];
    if (!v) return;
    this.syncSizesFromDom();
    v.sizes = this.formSizes.map((s) => ({ ...s }));
    v.gallery = [...this.formGallery];
    v.model3dUrl = this.formModel3dUrl;

    // Guardar precios del input a la variante activa
    const priceInput = this.container.querySelector('#prod-price') as HTMLInputElement | null;
    if (priceInput && priceInput.value.trim() !== '') {
      v.price = parseFloat(priceInput.value);
    }
    const origPriceInput = this.container.querySelector('#prod-orig-price') as HTMLInputElement | null;
    if (origPriceInput) {
      v.originalPrice = origPriceInput.value.trim() !== '' ? parseFloat(origPriceInput.value) : null;
    }
  }

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.store.subscribe(() => this.handleStoreUpdate());
    this.setupGlobalListeners();
  }

  private setupGlobalListeners(): void {
    // Tecla ESC para cerrar panel
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.store.isAdminOpen && !this.isClosing) {
        this.closeView();
      }
    });

    // Hash change (#admin)
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#admin') {
        if (this.store.currentUser?.role === 'ADMIN') {
          if (!this.store.isAdminOpen) this.store.toggleAdmin(true);
        } else {
          this.store.toggleAuth(true);
          Toast.show('Inicia sesión con la cuenta de administrador para acceder.', 'Acceso Restringido', 'warning');
        }
      } else if (this.store.isAdminOpen && !this.isClosing) {
        this.closeView();
      }
    });

    // Chequeo inicial
    const initialHash = window.location.hash.toLowerCase();
    if (initialHash === '#admin') {
      if (this.store.currentUser?.role === 'ADMIN') {
        this.store.toggleAdmin(true);
      }
    }
  }

  private async handleStoreUpdate(): Promise<void> {
    const shouldOpen = this.store.isAdminOpen;
    const user = this.store.currentUser;

    if (shouldOpen && (!user || user.role !== 'ADMIN')) {
      this.closeView();
      return;
    }

    if (shouldOpen && !this.isOpen && !this.isClosing) {
      this.isOpen = true;
      this.container.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      this.syncUrlHash(true);
      await this.loadInitialData();
      this.render();
    } else if (!shouldOpen && this.isOpen && !this.isClosing) {
      this.closeView();
    } else if (this.isOpen && !this.isClosing) {
      // Si el panel de administración ya está abierto y ocurre una actualización (ej: compra confirmada), refrescar stock
      const userId = this.store.currentUser?.id;
      if (userId) {
        const prodRes = await ApiService.getAdminProducts(userId);
        if (prodRes.success && prodRes.products) {
          this.products = prodRes.products;
          this.updateMainContentOnly();
        }
      }
    }
  }

  private closeView(): void {
    if (this.isClosing) return;
    this.isClosing = true;
    this.container.classList.add('is-closing');

    setTimeout(() => {
      this.isOpen = false;
      this.isClosing = false;
      this.container.classList.remove('is-active', 'is-closing');
      document.body.style.overflow = '';
      this.store.isAdminOpen = false;
      this.syncUrlHash(false);
    }, 220);
  }

  private syncUrlHash(isOpen: boolean): void {
    if (isOpen) {
      if (window.location.hash.toLowerCase() !== '#admin') {
        window.history.replaceState(null, '', '#admin');
      }
    } else {
      if (window.location.hash.toLowerCase() === '#admin') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }

  private async loadInitialData(): Promise<void> {
    if (!this.store.currentUser) return;

    try {
      const userId = this.store.currentUser.id;
      const [prodRes, promoRes, catRes] = await Promise.all([
        ApiService.getAdminProducts(userId),
        ApiService.getAdminPromos(userId),
        ApiService.getAdminCategories()
      ]);

      if (prodRes.success && prodRes.products) {
        this.products = prodRes.products;
      }
      if (promoRes.success && promoRes.promos) {
        this.promos = promoRes.promos;
      }
      if (catRes.success && catRes.categories) {
        this.categories = catRes.categories;
      }

      await this.loadAdminCardsData();
    } catch (err) {
      console.error('Error al cargar datos del panel de administración:', err);
    }
  }

  public render(): void {
    const user = this.store.currentUser;
    if (!user || user.role !== 'ADMIN') {
      this.container.innerHTML = `
        <div class="admin-backdrop"></div>
        <div class="admin-auth-denied">
          <h3>Acceso Denegado</h3>
          <p>Esta ruta está protegida y es de uso exclusivo para cuentas con rol Administrador.</p>
          <button type="button" class="btn btn-primary" id="btn-admin-denied-login">Iniciar Sesión como Admin</button>
        </div>
      `;
      this.container.querySelector('#btn-admin-denied-login')?.addEventListener('click', () => {
        this.closeView();
        this.store.toggleAuth(true);
      });
      return;
    }

    this.container.innerHTML = `
      <div class="admin-panel-overlay">
        <!-- TOPBAR DE ADMINISTRACIÓN -->
        <header class="admin-topbar">
          <div class="admin-topbar-left">
            <span class="admin-badge-brand">BLESSED SANDALS</span>
            <span class="admin-topbar-sep">•</span>
            <h1 class="admin-topbar-title">Panel de Control & Administración</h1>
            <span class="admin-tag-role">ADMINISTRADOR</span>
          </div>

          <div class="admin-topbar-right">
            <button type="button" class="btn-admin-nav-back" id="btn-admin-back-store" title="Regresar a la tienda">
              ${Icons.arrowLeft('w-4 h-4')}
              <span>Volver a la Tienda</span>
            </button>
            <button type="button" class="btn-admin-nav-logout" id="btn-admin-logout" title="Cerrar sesión">
              ${Icons.logout('w-4 h-4')}
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </header>

        <!-- CUERPO PRINCIPAL (SIDEBAR + CONTENIDO DINÁMICO) -->
        <div class="admin-body-layout">
          <!-- SIDEBAR DE NAVEGACIÓN (TIPOGRAFÍA DE FILTRO CON SECCIONES EN NEGRITA Y LETRA FINA) -->
          <aside class="admin-sidebar" aria-label="Navegación de Administración">
            
            <!-- SECCIÓN 1: PRODUCTOS & STOCK -->
            <div class="admin-nav-group">
              <span class="admin-group-title">PRODUCTOS & STOCK</span>
              <nav class="admin-group-links">
                <button type="button" class="admin-tab-btn ${this.activeTab === 'products-list' ? 'active' : ''}" data-tab="products-list">
                  Inventario & Existencias
                </button>
                <button type="button" class="admin-tab-btn ${this.activeTab === 'products-create' ? 'active' : ''}" data-tab="products-create">
                  ${this.editingProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}
                </button>
              </nav>
            </div>

            <div class="admin-nav-divider"></div>

            <!-- SECCIÓN 2: PROMOCIONES & CUPONES -->
            <div class="admin-nav-group">
              <span class="admin-group-title">PROMOCIONES & CUPONES</span>
              <nav class="admin-group-links">
                <button type="button" class="admin-tab-btn ${this.activeTab === 'promos-list' ? 'active' : ''}" data-tab="promos-list">
                  Cupones Activos
                </button>
                <button type="button" class="admin-tab-btn ${this.activeTab === 'promos-create' ? 'active' : ''}" data-tab="promos-create">
                  ${this.editingPromo && this.editingPromo.discountType !== 'HIDDEN_STORE' ? 'Editar Código' : 'Nuevo Código Promocional'}
                </button>
                <button type="button" class="admin-tab-btn ${this.activeTab === 'promos-store-create' ? 'active' : ''}" data-tab="promos-store-create">
                  ${this.editingPromo && this.editingPromo.discountType === 'HIDDEN_STORE' ? 'Editar Tienda Promo' : 'Nuevo Código Tienda Promo'}
                </button>
              </nav>
            </div>

            <div class="admin-nav-divider"></div>

            <!-- SECCIÓN 3: RECURSOS & ALMACENAMIENTO MINIO -->
            <div class="admin-nav-group">
              <span class="admin-group-title">RECURSOS & MINIO</span>
              <nav class="admin-group-links">
                <button type="button" class="admin-tab-btn ${this.activeTab === 'minio-storage' ? 'active' : ''}" data-tab="minio-storage">
                  Subir Recursos a MinIO
                </button>
              </nav>
            </div>

            <div class="admin-nav-divider"></div>

            <!-- SECCIÓN 4: APARIENCIA DE SITIO WEB -->
            <div class="admin-nav-group">
              <span class="admin-group-title">APARIENCIA DE SITIO WEB</span>
              <nav class="admin-group-links">
                <button type="button" class="admin-tab-btn ${this.activeTab === 'circular-showcase' ? 'active' : ''}" data-tab="circular-showcase">
                  Circular Showcase
                </button>
                <button type="button" class="admin-tab-btn ${this.activeTab === 'horse-showcase' ? 'active' : ''}" data-tab="horse-showcase">
                  Horse Showcase
                </button>
                <button type="button" class="admin-tab-btn ${this.activeTab === 'announcements' ? 'active' : ''}" data-tab="announcements">
                  Barra de Anuncios
                </button>
              </nav>
            </div>

            <div class="admin-nav-divider"></div>

            <!-- SECCIÓN 5: PAGOS & PRUEBAS STRIPE -->
            <div class="admin-nav-group">
              <span class="admin-group-title">PAGOS & PRUEBAS STRIPE</span>
              <nav class="admin-group-links">
                <button type="button" class="admin-tab-btn ${this.activeTab === 'stripe-test-cards' ? 'active' : ''}" data-tab="stripe-test-cards">
                  Tarjetas de Prueba Stripe
                </button>
              </nav>
            </div>

            <div class="admin-sidebar-footer">
              <div class="admin-server-status">
                <span class="status-pulse-dot"></span>
                <span>MinIO S3 & PostgreSQL Activos</span>
              </div>
            </div>
          </aside>

          <!-- ÁREA PRINCIPAL DINÁMICA -->
          <main class="admin-main-viewport" id="admin-main-viewport">
            ${this.renderActiveTabContent()}
          </main>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  private renderActiveTabContent(): string {
    switch (this.activeTab) {
      case 'products-list':
        return this.renderProductsListTab();
      case 'products-create':
        return this.renderProductFormTab();
      case 'promos-list':
        return this.renderPromosListTab();
      case 'promos-create':
        return this.renderPromoFormTab();
      case 'promos-store-create':
        return this.renderPromoStoreFormTab();
      case 'minio-storage':
        return this.renderMinioStorageTab();
      case 'circular-showcase':
        return this.renderCircularShowcaseTab();
      case 'horse-showcase':
        return this.renderHorseShowcaseTab();
      case 'announcements':
        return this.renderAnnouncementsTab();
      case 'stripe-test-cards':
        return this.renderStripeTestCardsTab();
      default:
        return this.renderProductsListTab();
    }
  }

  // ==========================================================================
  // TAB 1: INVENTARIO & EXISTENCIAS DE PRODUCTOS
  // ==========================================================================
  private renderProductsListTab(): string {
    const filtered = this.products.filter((p) => {
      const matchSearch =
        !this.productSearchTerm ||
        p.name.toLowerCase().includes(this.productSearchTerm.toLowerCase()) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(this.productSearchTerm.toLowerCase()));

      const matchCat =
        this.productCategoryFilter === 'all' ||
        p.categoryId === this.productCategoryFilter ||
        (p.categoryName && p.categoryName.toLowerCase().includes(this.productCategoryFilter.toLowerCase()));

      return matchSearch && matchCat;
    });

    const totalStock = this.products.reduce((acc, p) => acc + (p.totalStock || 0), 0);
    const inStockCount = this.products.filter((p) => p.inStock).length;
    const outOfStockCount = this.products.length - inStockCount;

    return `
      <div class="admin-view-panel">
        <div class="admin-view-header">
          <div>
            <h2 class="admin-view-title">Inventario de Productos & Existencias</h2>
            <p class="admin-view-subtitle">Administra los modelos oficiales de Blessed Sandals, edita precios y monitorea existencias por talla.</p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="btn-table-action" id="btn-refresh-admin-products" style="display:inline-flex; align-items:center; gap:6px; height:38px; padding:0 14px;">
              ${Icons.refresh('w-4 h-4')}
              <span>Actualizar Inventario</span>
            </button>
            <button type="button" class="btn-admin-action-primary" id="btn-admin-goto-create-prod">
              ${Icons.plus('w-4 h-4')}
              <span>Agregar Producto</span>
            </button>
          </div>
        </div>

        <!-- TARJETAS DE MÉTRICAS RÁPIDAS -->
        <div class="admin-kpi-grid">
          <div class="admin-kpi-card">
            <span class="kpi-label">TOTAL PRODUCTOS</span>
            <strong class="kpi-number">${this.products.length}</strong>
          </div>
          <div class="admin-kpi-card">
            <span class="kpi-label">EN STOCK</span>
            <strong class="kpi-number text-emerald">${inStockCount}</strong>
          </div>
          <div class="admin-kpi-card">
            <span class="kpi-label">AGOTADOS</span>
            <strong class="kpi-number text-amber">${outOfStockCount}</strong>
          </div>
          <div class="admin-kpi-card">
            <span class="kpi-label">EXISTENCIAS TOTALES</span>
            <strong class="kpi-number">${totalStock} pares</strong>
          </div>
        </div>

        <!-- BARRA DE BÚSQUEDA Y FILTRO -->
        <div class="admin-filter-bar">
          <div class="admin-search-input-wrap">
            ${Icons.search('w-4 h-4')}
            <input
              type="text"
              id="admin-product-search"
              placeholder="Buscar por nombre o descripción..."
              value="${this.productSearchTerm}"
            />
          </div>

          <div class="admin-select-wrap">
            <select id="admin-category-filter">
              <option value="all">Todas las Categorías</option>
              ${this.categories
        .map((c) => `<option value="${c.id}" ${this.productCategoryFilter === c.id ? 'selected' : ''}>${c.name}</option>`)
        .join('')}
            </select>
          </div>
        </div>

        <!-- LISTADO / TABLA MINIMALISTA -->
        ${filtered.length === 0
        ? `
            <div class="admin-empty-state">
              <h4>No se encontraron productos</h4>
              <p>Prueba con otros términos de búsqueda o agrega un nuevo modelo al catálogo.</p>
            </div>
          `
        : `
            <div class="admin-products-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th class="table-col-product">PRODUCTO</th>
                    <th>CATEGORÍA</th>
                    <th>PRECIO</th>
                    <th>GÉNERO</th>
                    <th class="table-col-stock">STOCK TOTAL</th>
                    <th>ESTADO</th>
                    <th style="text-align: right;">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered
          .map((p) => {
            const fullSizesTooltip = (p.sizes || [])
              .map((s: any) => `Talla ${s.size} (${formatFullEquivalence(s.size)}): ${s.stock} pares`)
              .join('\n');

            return `
                        <tr data-product-id="${p.id}">
                          <td class="table-col-product">
                            <div class="table-prod-cell">
                              <img src="${p.image || '/assets/logo/Isotipo.png'}" alt="${p.name}" class="table-prod-thumb" style="width: 48px; height: 48px; min-width: 48px; max-width: 48px; max-height: 48px; object-fit: contain; border-radius: 6px; background: #f8fafc; border: 1px solid #e2e8f0; flex-shrink: 0;" />
                              <div class="table-prod-meta">
                                <strong class="table-prod-name">${p.name}</strong>
                                <span class="table-prod-sub">${p.subtitle || 'Blessed Sandals'}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span class="table-tag-category">${p.categoryName || 'Calzado'}</span>
                          </td>
                          <td>
                            <div class="table-price-col">
                              <strong>$${Number(p.price).toFixed(2)}</strong>
                              ${p.originalPrice ? `<span class="table-original-price">$${Number(p.originalPrice).toFixed(2)}</span>` : ''}
                            </div>
                          </td>
                          <td>
                            <span class="table-text-muted">${p.gender || 'Unisex'}</span>
                          </td>
                          <td class="table-col-stock">
                            <div class="table-stock-detail">
                              <strong class="stock-total-badge ${p.totalStock > 0 ? 'in' : 'out'}" title="${fullSizesTooltip}">${p.totalStock} pares</strong>
                            </div>
                          </td>
                          <td>
                            <button
                              type="button"
                              class="btn-toggle-stock-badge ${p.inStock ? 'is-instock' : 'is-outofstock'}"
                              data-action="toggle-stock"
                              data-id="${p.id}"
                              data-current="${p.inStock}"
                              title="Haz clic para alternar disponibilidad"
                            >
                              ${p.inStock ? 'En Stock' : 'Agotado'}
                            </button>
                          </td>
                          <td style="text-align: right;">
                            <div class="table-actions-row">
                              <button
                                type="button"
                                class="btn-table-action btn-edit-prod"
                                data-action="edit-product"
                                data-id="${p.id}"
                                title="Editar producto"
                              >
                                ${Icons.edit('w-4 h-4')}
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                class="btn-table-action danger btn-delete-prod"
                                data-action="delete-product"
                                data-id="${p.id}"
                                title="Eliminar producto"
                              >
                                ${Icons.trash('w-4 h-4')}
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      `;
          })
          .join('')}
                </tbody>
              </table>
            </div>
          `
      }
      </div>
    `;
  }

  // ==========================================================================
  // TAB 2: AGREGAR O EDITAR PRODUCTO (CRUD COMPLETO)
  // ==========================================================================
  private renderProductFormTab(): string {
    const isEdit = !!this.editingProduct;
    const p = this.editingProduct || {};

    if (this.formVariants.length === 0) {
      this.initFormVariants();
    }

    return `
      <div class="admin-view-panel">
        <div class="admin-view-header">
          <div class="admin-view-header-main">
            <h2 class="admin-view-title">${isEdit ? `Editar: ${p.name}` : 'Agregar Nuevo Producto'}</h2>
            
            <!-- EN LO MÁS ALTO DEBAJO DEL TÍTULO: VARIANTES DE COLOR Y COLOR PICKER -->
            <div class="admin-variants-bar" id="admin-variants-bar-wrapper">
              ${this.renderVariantsBarHtml()}
            </div>

            <p class="admin-view-subtitle">Completa la información técnica, precios, existencias por talla y recursos en MinIO.</p>
          </div>
          ${isEdit
        ? `
              <button type="button" class="btn-admin-action-secondary" id="btn-cancel-edit-prod">
                Cancelar Edición
              </button>
            `
        : ''
      }
        </div>

        <form id="form-admin-product" class="admin-editor-form">
          <!-- GRUPO 1: DATOS BÁSICOS -->
          <div class="admin-form-section">
            <h3 class="admin-section-heading">INFORMACIÓN BÁSICA</h3>
            <div class="admin-form-grid-2">
              <div class="admin-input-group">
                <label for="prod-name">Nombre del Producto *</label>
                <input type="text" id="prod-name" value="${p.name || ''}" placeholder="Ej: Blessed Slide Foam Runner" required />
              </div>

              <div class="admin-input-group">
                <label for="prod-subtitle">Subtítulo Descriptivo</label>
                <input type="text" id="prod-subtitle" value="${p.subtitle || ''}" placeholder="Ej: Sandalia Deportiva Recuperación" />
              </div>
            </div>

            <div class="admin-form-grid-3">
              <div class="admin-input-group">
                <label for="prod-category">Categoría *</label>
                <select id="prod-category" required>
                  ${this.categories
        .map((c) => `<option value="${c.id}" ${p.categoryId === c.id ? 'selected' : ''}>${c.name}</option>`)
        .join('')}
                </select>
              </div>

              <div class="admin-input-group">
                <label for="prod-gender">Género *</label>
                <select id="prod-gender" required>
                  <option value="Unisex" ${p.gender === 'Unisex' ? 'selected' : ''}>Unisex</option>
                  <option value="Hombre" ${p.gender === 'Hombre' ? 'selected' : ''}>Hombre</option>
                  <option value="Mujer" ${p.gender === 'Mujer' ? 'selected' : ''}>Mujer</option>
                </select>
              </div>

              <div class="admin-input-group">
                <label for="prod-badge">Etiqueta Promocional (Badge)</label>
                <input type="text" id="prod-badge" value="${p.badge || ''}" placeholder="Ej: MÁS VENDIDO, NUEVO, EDICIÓN LIMITADA" />
              </div>
            </div>

            <div class="admin-input-group">
              <label for="prod-desc">Descripción Completa</label>
              <textarea id="prod-desc" rows="3" placeholder="Describe los materiales, confort y tecnología de amortiguación...">${p.description || ''}</textarea>
            </div>
          </div>

          <!-- GRUPO 2: PRECIOS -->
          <div class="admin-form-section">
            <div class="admin-price-heading-flex">
              <h3 class="admin-section-heading">PRECIO Y VALOR COMERCIAL</h3>
              <span class="active-variant-price-badge" id="admin-price-variant-badge">
                ${this.renderPriceVariantBadgeHtml()}
              </span>
            </div>
            <div class="admin-form-grid-2">
              <div class="admin-input-group">
                <label for="prod-price">Precio de Venta ($ USD) *</label>
                <input type="number" step="0.01" min="0" id="prod-price" value="${this.formVariants[this.activeVariantIndex]?.price !== undefined ? this.formVariants[this.activeVariantIndex].price : (p.price !== undefined ? p.price : '')}" placeholder="55.00" required />
              </div>

              <div class="admin-input-group">
                <label for="prod-orig-price">Precio Original Tachado ($ USD opcional)</label>
                <input type="number" step="0.01" min="0" id="prod-orig-price" value="${this.formVariants[this.activeVariantIndex]?.originalPrice !== undefined && this.formVariants[this.activeVariantIndex]?.originalPrice !== null ? this.formVariants[this.activeVariantIndex].originalPrice : (p.originalPrice || '')}" placeholder="Ej: 75.00 (para mostrar descuento)" />
              </div>
            </div>
          </div>

          <!-- GRUPO 3: RECURSOS VISUALES (MINIO & 3D) -->
          <div class="admin-form-section" id="admin-multimedia-section">
            <div class="admin-multimedia-header-flex">
              <div>
                <h3 class="admin-section-heading">RECURSOS MULTIMEDIA (MINIO STORAGE)</h3>
                <p class="admin-section-sub" id="admin-multimedia-sub-info">
                  ${this.renderMultimediaSubtitleHtml()}
                </p>
              </div>
              <div class="admin-multimedia-actions-bar">
                <input type="file" id="file-hidden-gallery" accept="image/*" multiple style="display: none;" />
                <button type="button" class="btn-field-action" id="btn-trigger-upload-gallery" title="Subir una o varias fotos a MinIO">
                  ${Icons.uploadCloud('w-4 h-4')}
                  <span>+ Subir Contenido</span>
                </button>

                <input type="file" id="file-hidden-3d" accept=".glb,.gltf" style="display: none;" />
                <button type="button" class="btn-field-action" id="btn-trigger-upload-3d" title="Subir modelo interactivo .glb a MinIO">
                  ${Icons.cube3d('w-4 h-4')}
                  <span id="btn-label-3d">${this.formModel3dUrl ? 'Cambiar .GLB' : 'Subir .GLB'}</span>
                </button>
              </div>
            </div>

            <!-- ESTADO DEL MODELO 3D (SI ESTÁ CARGADO) -->
            <div id="admin-3d-model-wrapper">
              ${this.render3dStatusHtml()}
            </div>

            <!-- GRILLA DE IMÁGENES / GALERÍA CON REORDENAMIENTO -->
            <div id="admin-gallery-wrapper">
              ${this.renderGalleryGridHtml()}
            </div>

            <!-- LÍNEA FINA DIVISORIA -->
            <div class="admin-media-fine-divider"></div>

            <!-- SUBIDA DIFERENTE: RECURSO CARRUSEL (CIRCULAR SHOWCASE) -->
            <div class="admin-carousel-resource-wrap">
              <div class="admin-carousel-header">
                <div>
                  <h4 class="admin-subsection-heading">RECURSO CARRUSEL (CIRCULAR SHOWCASE)</h4>
                  <p class="admin-section-sub">
                    
                  </p>
                </div>
                <div class="admin-carousel-actions">
                  <input type="file" id="file-hidden-carousel" accept=".png,image/png" style="display: none;" />
                  <button type="button" class="btn-field-action" id="btn-trigger-upload-carousel" title="Subir imagen .png para Circular Showcase">
                    ${Icons.uploadCloud('w-4 h-4')}
                    <span id="btn-label-carousel">${this.formCarouselImage ? 'Cambiar Carrusel (.PNG)' : 'Subir Carrusel (.PNG)'}</span>
                  </button>
                </div>
              </div>

              <!-- CONTENEDOR DE ESTADO DEL RECURSO CARRUSEL -->
              <div id="admin-carousel-status-wrapper">
                ${this.renderCarouselStatusHtml()}
              </div>
            </div>
          </div>

          <!-- GRUPO 4: TALLAS Y EXISTENCIAS EN FORMATOS EQUIVALENTES -->
          ${this.renderSizesSectionContent()}

          <!-- GRUPO 5: DISPONIBILIDAD -->
          <div class="admin-form-section">
            <h3 class="admin-section-heading">VISIBILIDAD Y DISPONIBILIDAD</h3>
            <div class="admin-toggles-row">
              <label class="admin-switch-label">
                <input type="checkbox" id="prod-instock" ${p.inStock !== false ? 'checked' : ''} />
                <span class="switch-ui"></span>
                <span>Producto Disponible en Stock (A la venta)</span>
              </label>

              <label class="admin-switch-label">
                <input type="checkbox" id="prod-featured" ${p.featured ? 'checked' : ''} />
                <span class="switch-ui"></span>
                <span>Destacar en Portada de la Tienda</span>
              </label>
            </div>
          </div>

          <!-- BOTONES DE ACCIÓN DEL FORMULARIO -->
          <div class="admin-form-actions">
            <button type="button" class="btn-admin-cancel" id="btn-cancel-prod-form">
              Cancelar
            </button>
            <button type="submit" class="btn-admin-submit" id="btn-save-product">
              ${isEdit ? 'Actualizar Producto' : 'Guardar y Publicar Producto'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // ==========================================================================
  // HELPERS: VARIANTES DE COLOR Y CAMBIO DINÁMICO DE RECURSOS
  // ==========================================================================
  private renderVariantsBarHtml(): string {
    return `
      <div class="admin-variants-bar-inner">
        <div class="variants-label-group">
          <span class="variants-caption">Variantes de Color:</span>
        </div>
        <div class="variants-swatches-row">
          ${this.formVariants.map((v, idx) => {
      const isActive = idx === this.activeVariantIndex;
      return `
              <div class="variant-chip ${isActive ? 'is-active' : ''}" data-variant-index="${idx}">
                <button 
                  type="button" 
                  class="variant-color-circle ${isActive ? 'active' : ''}" 
                  style="background-color: ${v.hex};" 
                  title="${isActive ? `Color activo: ${v.hex} (Haz clic para cambiar color)` : `Variante ${idx + 1} (${v.hex})`}"
                  data-action="select-variant"
                  data-variant-index="${idx}"
                ></button>
                <input 
                  type="color" 
                  class="variant-native-color-picker" 
                  data-variant-index="${idx}" 
                  value="${v.hex}" 
                />
                ${this.formVariants.length > 1 ? `
                  <button 
                    type="button" 
                    class="btn-remove-variant" 
                    data-action="remove-variant" 
                    data-variant-index="${idx}" 
                    title="Eliminar variante"
                  >
                    ${Icons.close('w-3 h-3')}
                  </button>
                ` : ''}
              </div>
            `;
    }).join('')}

          <button 
            type="button" 
            class="btn-add-variant-circle" 
            id="btn-add-color-variant" 
            title="Agregar otra variante del par con diferente color"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  private bindVariantsBarEvents(): void {
    // 1. Botón + para agregar nueva variante con color distinto y formulario vacío
    this.container.querySelector('#btn-add-color-variant')?.addEventListener('click', () => {
      this.addColorVariant();
    });

    // 2. Clic en círculos de variante
    this.container.querySelectorAll('[data-action="select-variant"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number((btn as HTMLElement).dataset.variantIndex);
        if (isNaN(idx)) return;

        if (idx === this.activeVariantIndex) {
          // Si ya está activo, abrir el selector de color nativo
          const picker = this.container.querySelector(`.variant-native-color-picker[data-variant-index="${idx}"]`) as HTMLInputElement | null;
          picker?.click();
        } else {
          // Si no es el activo, cambiar a esta variante preservando la actual
          this.switchActiveVariant(idx);
        }
      });
    });

    // 3. Modificación del color en el color picker nativo
    this.container.querySelectorAll('.variant-native-color-picker').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = Number((input as HTMLElement).dataset.variantIndex);
        const newHex = (e.target as HTMLInputElement).value;
        if (!isNaN(idx) && this.formVariants[idx]) {
          this.formVariants[idx].hex = newHex;
          const circleBtn = this.container.querySelector(`.variant-color-circle[data-variant-index="${idx}"]`) as HTMLElement | null;
          if (circleBtn) {
            circleBtn.style.backgroundColor = newHex;
            circleBtn.title = `Color activo: ${newHex} (Haz clic para cambiar color)`;
          }
        }
      });

      input.addEventListener('change', (e) => {
        const idx = Number((input as HTMLElement).dataset.variantIndex);
        const newHex = (e.target as HTMLInputElement).value;
        if (!isNaN(idx) && this.formVariants[idx]) {
          this.formVariants[idx].hex = newHex;
          Toast.show(`Color de variante establecido en ${newHex}.`, 'Variante', 'info');
        }
      });
    });

    // 4. Eliminar variante
    this.container.querySelectorAll('[data-action="remove-variant"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number((btn as HTMLElement).dataset.variantIndex);
        if (!isNaN(idx)) {
          this.removeColorVariant(idx);
        }
      });
    });
  }

  private addColorVariant(): void {
    // 1. Guardar la configuración de la variante actual (incluyendo su precio)
    this.saveActiveVariantFromForm();

    const currentVar = this.formVariants[this.activeVariantIndex];
    // Heredar automáticamente el mismo precio de la variante anterior pero permitiendo cambiarlo
    const inheritedPrice = currentVar?.price !== undefined
      ? currentVar.price
      : (parseFloat((this.container.querySelector('#prod-price') as HTMLInputElement)?.value) || undefined);
    const inheritedOrigPrice = currentVar?.originalPrice !== undefined
      ? currentVar.originalPrice
      : (parseFloat((this.container.querySelector('#prod-orig-price') as HTMLInputElement)?.value) || null);

    // 2. Colores sugeridos distintos para la nueva variante
    const palette = ['#000000', '#ffffff', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#ec4899'];
    const used = this.formVariants.map((v) => v.hex.toLowerCase());
    const nextHex = palette.find((c) => !used.includes(c.toLowerCase())) || '#64748b';

    // 3. Crear nueva variante con formulario VACÍO de imágenes y tallas en stock 0, pero HEREDANDO el precio
    const newVariant: ProductVariantForm = {
      id: 'var_' + Date.now().toString(36),
      hex: nextHex,
      name: `Variante ${this.formVariants.length + 1}`,
      gallery: [],
      model3dUrl: null,
      sizes: STANDARD_CHART_SIZES.map((sz) => ({ size: sz, stock: 0 })),
      price: inheritedPrice,
      originalPrice: inheritedOrigPrice
    };

    this.formVariants.push(newVariant);
    this.activeVariantIndex = this.formVariants.length - 1;
    this.loadActiveVariantIntoForm();

    // 4. Refrescar secciones dependientes de la variante
    this.refreshFormVariantSections();
    Toast.show('Nueva variante agregada con precio heredado. Puedes personalizar su precio, imágenes y stock.', 'Variante', 'info');
  }

  private switchActiveVariant(newIndex: number): void {
    if (newIndex === this.activeVariantIndex) return;

    // 1. Guardar la configuración de la variante que dejamos
    this.saveActiveVariantFromForm();

    // 2. Cargar los datos de la variante seleccionada
    this.activeVariantIndex = newIndex;
    this.loadActiveVariantIntoForm();

    // 3. Refrescar las secciones de la variante
    this.refreshFormVariantSections();
  }

  private removeColorVariant(idx: number): void {
    if (this.formVariants.length <= 1) {
      Toast.show('El producto debe tener al menos una variante de color.', 'Atención', 'warning');
      return;
    }

    const confirmed = window.confirm(`¿Deseas eliminar la variante ${this.formVariants[idx].hex}?`);
    if (!confirmed) return;

    this.formVariants.splice(idx, 1);
    if (this.activeVariantIndex >= this.formVariants.length) {
      this.activeVariantIndex = this.formVariants.length - 1;
    }
    this.loadActiveVariantIntoForm();
    this.refreshFormVariantSections();
    Toast.show('Variante eliminada.', 'Variantes', 'info');
  }

  private renderPriceVariantBadgeHtml(): string {
    const cur = this.formVariants[this.activeVariantIndex];
    const hex = cur?.hex || '#000000';
    return `Precio exclusivo de: <span class="active-variant-indicator-tag"><span class="variant-indicator-dot" style="background-color: ${hex};"></span><strong>Variante #${this.activeVariantIndex + 1} (${hex})</strong></span>`;
  }

  private refreshFormVariantSections(): void {
    // 1. Barra de variantes superior
    const bar = this.container.querySelector('#admin-variants-bar-wrapper');
    if (bar) {
      bar.innerHTML = this.renderVariantsBarHtml();
      this.bindVariantsBarEvents();
    }

    // 2. Badge indicador de variante en sección de precio
    const priceBadge = this.container.querySelector('#admin-price-variant-badge');
    if (priceBadge) {
      priceBadge.innerHTML = this.renderPriceVariantBadgeHtml();
    }

    // 3. Subtítulo indicador de la variante activa en recursos multimedia
    const subInfo = this.container.querySelector('#admin-multimedia-sub-info');
    if (subInfo) {
      subInfo.innerHTML = this.renderMultimediaSubtitleHtml();
    }

    // 4. Galería de fotos (se vacía o carga según la variante)
    this.refreshGalleryOnly();

    // 5. Modelo 3D
    this.refresh3dStatusOnly();

    // 6. Tarjetas de existencias por talla (se vacían a 0 o cargan según la variante)
    this.refreshSizeCardsOnly();
  }

  // ==========================================================================
  // HELPERS: RECURSOS MULTIMEDIA (MINIO STORAGE & GALERÍA ORDENADA)
  // ==========================================================================
  private renderMultimediaSubtitleHtml(): string {
    const cur = this.formVariants[this.activeVariantIndex];
    const hex = cur?.hex || '#000000';
    return `Recursos multimedia exclusivos de: <span class="active-variant-indicator-tag"><span class="variant-indicator-dot" style="background-color: ${hex};"></span><strong>Variante #${this.activeVariantIndex + 1} (${hex})</strong></span>. La imagen #1 será la portada de este color.`;
  }

  private render3dStatusHtml(): string {
    if (!this.formModel3dUrl) return '';
    const filename = this.formModel3dUrl.split('/').pop() || 'modelo.glb';
    return `
      <div class="model3d-status-pill">
        <div class="model3d-status-info">
          <span class="model3d-icon">${Icons.cube3d('w-4 h-4')}</span>
          <span class="model3d-label">Modelo 3D activo: <strong>${filename}</strong></span>
        </div>
        <button type="button" class="btn-remove-3d-model" id="btn-remove-model-3d" title="Quitar modelo 3D">
          ${Icons.close('w-3.5 h-3.5')}
          <span>Quitar .GLB</span>
        </button>
      </div>
    `;
  }

  private renderGalleryGridHtml(): string {
    const cur = this.formVariants[this.activeVariantIndex];
    const hex = cur?.hex || '#000000';

    if (this.formGallery.length === 0) {
      return `
        <div class="admin-gallery-empty-box">
          <div class="gallery-empty-icon">${Icons.camera('w-8 h-8')}</div>
          <p class="gallery-empty-title">Sin imágenes en la Variante #${this.activeVariantIndex + 1} (${hex})</p>
          <p class="gallery-empty-sub">Las imágenes que subas aquí pertenecerán exclusivamente a esta variante de color.</p>
          <button type="button" class="btn-empty-upload" id="btn-empty-upload-gallery">
            ${Icons.uploadCloud('w-4 h-4')}
            <span>+ Subir Fotos para este Color</span>
          </button>
        </div>
      `;
    }

    return `
      <div class="admin-gallery-grid" id="admin-gallery-cards-grid">
        ${this.formGallery.map((url, idx) => {
      const isCover = idx === 0;
      return `
            <div class="gallery-thumb-card ${isCover ? 'is-cover' : ''}" data-index="${idx}">
              <div class="gallery-thumb-badge-wrap">
                ${isCover
          ? `<span class="badge-cover-primary">#1 PORTADA</span>`
          : `<span class="badge-gallery-num">#${idx + 1}</span>`
        }
                <span class="badge-variant-belong-pill" title="Pertenece a Variante #${this.activeVariantIndex + 1} (${hex})">
                  <span class="mini-variant-dot" style="background-color: ${hex};"></span>
                  <span>Var #${this.activeVariantIndex + 1}</span>
                </span>
              </div>
              <div class="gallery-thumb-img-wrap">
                <img src="${url}" alt="Recurso ${idx + 1}" class="gallery-thumb-img" />
              </div>
              <div class="gallery-thumb-toolbar">
                ${!isCover ? `
                  <button type="button" class="btn-gallery-action btn-make-cover" data-action="make-cover" data-index="${idx}" title="Convertir en Portada Oficial (#1)">
                    Portada
                  </button>
                ` : ''}
                <button type="button" class="btn-gallery-action" data-action="move-left" data-index="${idx}" ${idx === 0 ? 'disabled' : ''} title="Mover a la izquierda">
                  ${Icons.chevronLeft('w-3.5 h-3.5')}
                </button>
                <button type="button" class="btn-gallery-action" data-action="move-right" data-index="${idx}" ${idx === this.formGallery.length - 1 ? 'disabled' : ''} title="Mover a la derecha">
                  ${Icons.chevronRight('w-3.5 h-3.5')}
                </button>
                <button type="button" class="btn-gallery-action btn-delete-img" data-action="delete-img" data-index="${idx}" title="Eliminar de la lista">
                  ${Icons.trash('w-3.5 h-3.5')}
                </button>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;
  }

  private refreshGalleryOnly(): void {
    const wrapper = this.container.querySelector('#admin-gallery-wrapper');
    if (wrapper) {
      wrapper.innerHTML = this.renderGalleryGridHtml();
      this.bindGalleryEvents();
    }
  }

  private refresh3dStatusOnly(): void {
    const wrapper = this.container.querySelector('#admin-3d-model-wrapper');
    if (wrapper) {
      wrapper.innerHTML = this.render3dStatusHtml();
      this.bind3dStatusEvents();
    }
    const label3d = this.container.querySelector('#btn-label-3d');
    if (label3d) {
      label3d.textContent = this.formModel3dUrl ? 'Cambiar .GLB' : 'Subir .GLB';
    }
  }

  private bindGalleryEvents(): void {
    // Botón de subir desde empty state
    this.container.querySelector('#btn-empty-upload-gallery')?.addEventListener('click', () => {
      const fileInput = this.container.querySelector('#file-hidden-gallery') as HTMLInputElement | null;
      fileInput?.click();
    });

    // Make cover
    this.container.querySelectorAll('[data-action="make-cover"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number((btn as HTMLElement).dataset.index);
        if (!isNaN(idx) && idx >= 0 && idx < this.formGallery.length) {
          const [selected] = this.formGallery.splice(idx, 1);
          this.formGallery.unshift(selected);
          if (this.formVariants[this.activeVariantIndex]) {
            this.formVariants[this.activeVariantIndex].gallery = [...this.formGallery];
          }
          this.refreshGalleryOnly();
          Toast.show('Imagen establecida como portada (#1).', 'Galería', 'info');
        }
      });
    });

    // Move left
    this.container.querySelectorAll('[data-action="move-left"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number((btn as HTMLElement).dataset.index);
        if (!isNaN(idx) && idx > 0 && idx < this.formGallery.length) {
          const temp = this.formGallery[idx - 1];
          this.formGallery[idx - 1] = this.formGallery[idx];
          this.formGallery[idx] = temp;
          if (this.formVariants[this.activeVariantIndex]) {
            this.formVariants[this.activeVariantIndex].gallery = [...this.formGallery];
          }
          this.refreshGalleryOnly();
        }
      });
    });

    // Move right
    this.container.querySelectorAll('[data-action="move-right"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number((btn as HTMLElement).dataset.index);
        if (!isNaN(idx) && idx >= 0 && idx < this.formGallery.length - 1) {
          const temp = this.formGallery[idx + 1];
          this.formGallery[idx + 1] = this.formGallery[idx];
          this.formGallery[idx] = temp;
          if (this.formVariants[this.activeVariantIndex]) {
            this.formVariants[this.activeVariantIndex].gallery = [...this.formGallery];
          }
          this.refreshGalleryOnly();
        }
      });
    });

    // Delete image
    this.container.querySelectorAll('[data-action="delete-img"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number((btn as HTMLElement).dataset.index);
        if (!isNaN(idx) && idx >= 0 && idx < this.formGallery.length) {
          this.formGallery.splice(idx, 1);
          if (this.formVariants[this.activeVariantIndex]) {
            this.formVariants[this.activeVariantIndex].gallery = [...this.formGallery];
          }
          this.refreshGalleryOnly();
          Toast.show('Imagen eliminada de la galería.', 'Galería', 'info');
        }
      });
    });
  }

  private bind3dStatusEvents(): void {
    this.container.querySelector('#btn-remove-model-3d')?.addEventListener('click', () => {
      this.formModel3dUrl = null;
      if (this.formVariants[this.activeVariantIndex]) {
        this.formVariants[this.activeVariantIndex].model3dUrl = null;
      }
      this.refresh3dStatusOnly();
      Toast.show('Modelo 3D retirado.', 'MinIO Storage', 'info');
    });
  }

  // ==========================================================================
  // HELPERS: RECURSO CARRUSEL (.PNG) PARA CIRCULAR SHOWCASE
  // ==========================================================================
  private renderCarouselStatusHtml(): string {
    if (!this.formCarouselImage) {
      return `
        <div class="carousel-resource-empty-box">
          <div class="carousel-empty-meta">
            <span class="carousel-empty-icon">${Icons.camera('w-4 h-4')}</span>
            <span>Sin recurso .png asignado para Circular Showcase.</span>
          </div>
          <button type="button" class="btn-subtle-upload" id="btn-trigger-upload-carousel-empty">
            + Subir .PNG
          </button>
        </div>
      `;
    }

    const filename = this.formCarouselImage.split('/').pop() || 'recurso-carrusel.png';

    return `
      <div class="carousel-resource-active-card">
        <div class="carousel-preview-wrap" title="Vista previa en fondo de cuadrícula para transparencias">
          <img src="${this.formCarouselImage}" alt="Recurso carrusel .png" class="carousel-preview-thumb" />
        </div>
        <div class="carousel-meta-wrap">
          <span class="carousel-tag-badge">FORMATO .PNG TRANSPARENTE</span>
          <span class="carousel-filename">${filename}</span>
          <span class="carousel-note">Exclusivo para rotación en Circular Showcase. No visible en galería normal.</span>
        </div>
        <div class="carousel-actions-row">
          <button type="button" class="btn-carousel-replace" id="btn-replace-carousel-resource" title="Cambiar imagen .png">
            Sustituir
          </button>
          <button type="button" class="btn-carousel-remove" id="btn-remove-carousel-resource" title="Quitar recurso carrusel">
            ${Icons.trash('w-3.5 h-3.5')}
            <span>Quitar</span>
          </button>
        </div>
      </div>
    `;
  }

  private refreshCarouselStatusOnly(): void {
    const wrapper = this.container.querySelector('#admin-carousel-status-wrapper');
    if (wrapper) {
      wrapper.innerHTML = this.renderCarouselStatusHtml();
      this.bindCarouselResourceEvents();
    }
    const label = this.container.querySelector('#btn-label-carousel');
    if (label) {
      label.textContent = this.formCarouselImage ? 'Cambiar Carrusel (.PNG)' : 'Subir Carrusel (.PNG)';
    }
  }

  private bindCarouselResourceEvents(): void {
    this.container.querySelector('#btn-trigger-upload-carousel-empty')?.addEventListener('click', () => {
      (this.container.querySelector('#file-hidden-carousel') as HTMLInputElement | null)?.click();
    });

    this.container.querySelector('#btn-replace-carousel-resource')?.addEventListener('click', () => {
      (this.container.querySelector('#file-hidden-carousel') as HTMLInputElement | null)?.click();
    });

    this.container.querySelector('#btn-remove-carousel-resource')?.addEventListener('click', () => {
      this.formCarouselImage = null;
      this.refreshCarouselStatusOnly();
      Toast.show('Recurso de carrusel retirado.', 'Circular Showcase', 'info');
    });
  }

  // ==========================================================================
  // HELPERS: GESTIÓN DE TALLAS Y FORMATOS EQUIVALENTES (EU, US, UK, CM)
  // ==========================================================================
  private renderSizesSectionContent(): string {
    return `
      <!-- GRUPO 4: TALLAS Y EXISTENCIAS EN FORMATOS EQUIVALENTES -->
      <div class="admin-form-section" id="admin-sizes-section">
        <div class="admin-sizes-header-flex">
          <div>
            <h3 class="admin-section-heading">EXISTENCIAS POR TALLAS (STOCK)</h3>
            <p class="admin-section-sub">Define las existencias por talla en formatos equivalentes EU, USA, UK y CM. Predeterminado en stock 0 para nuevo producto:</p>
          </div>

          <!-- SELECTOR DE UNIDAD EN ADMIN Y TOGGLE OJO DE EQUIVALENCIAS -->
          <div class="admin-size-unit-selector" role="tablist" aria-label="Unidad activa de visualización">
            <span class="unit-selector-label">Mostrar en:</span>
            <div class="admin-unit-pills">
              <button type="button" class="admin-unit-btn ${this.adminSizeUnit === 'EU' ? 'active' : ''}" data-admin-unit="EU">EU</button>
              <button type="button" class="admin-unit-btn ${this.adminSizeUnit === 'US' ? 'active' : ''}" data-admin-unit="US">USA (US)</button>
              <button type="button" class="admin-unit-btn ${this.adminSizeUnit === 'UK' ? 'active' : ''}" data-admin-unit="UK">UK</button>
              <button type="button" class="admin-unit-btn ${this.adminSizeUnit === 'CM' ? 'active' : ''}" data-admin-unit="CM">CM</button>
            </div>
            <button 
              type="button" 
              class="btn-toggle-equivalences ${this.showEquivalences ? 'is-active' : ''}" 
              id="btn-toggle-equivalences" 
              title="${this.showEquivalences ? 'Ocultar equivalencias en tarjetas' : 'Mostrar equivalencias en tarjetas (EU • US • UK • CM)'}"
            >
              ${this.showEquivalences ? Icons.eye('w-4 h-4') : Icons.eyeOff('w-4 h-4')}
            </button>
          </div>
        </div>

        <!-- BARRA DE ACCIONES Y TALLAS PERSONALIZADAS -->
        <div class="admin-custom-sizes-toolbar">
          <!-- AGREGAR TALLA PERSONALIZADA A MEDIDA CON ACCIONES A LA PAR -->
          <div class="admin-add-custom-size-row">
            <span class="toolbar-caption">Definir Talla:</span>
            <div class="custom-size-inputs-flex">
              <input 
                type="number" 
                step="0.5" 
                min="1" 
                max="70" 
                id="input-custom-size-val" 
                placeholder="Ej: 37.5 o 13" 
                class="input-custom-val" 
              />
              <select id="select-custom-size-unit" class="select-custom-unit">
                <option value="EU" ${this.adminSizeUnit === 'EU' ? 'selected' : ''}>EU</option>
                <option value="US" ${this.adminSizeUnit === 'US' ? 'selected' : ''}>USA (US)</option>
                <option value="UK" ${this.adminSizeUnit === 'UK' ? 'selected' : ''}>UK</option>
                <option value="CM" ${this.adminSizeUnit === 'CM' ? 'selected' : ''}>CM</option>
              </select>
              <input 
                type="number" 
                min="0" 
                id="input-custom-size-stock" 
                placeholder="Stock inicial" 
                value="0" 
                class="input-custom-stock" 
              />
              <button type="button" class="btn-add-custom-size" id="btn-add-custom-size">
                + Agregar Talla
              </button>
              <button type="button" class="btn-tool-secondary" id="btn-reset-all-stock-zero" title="Establecer stock de todas las tallas en 0">
                Stock en 0
              </button>
              <button type="button" class="btn-tool-secondary" id="btn-restore-official-sizes" title="Restablecer a las 13 tallas de la tabla oficial">
                Tallas Oficiales
              </button>
            </div>
          </div>

          <!-- DESPLEGABLE PLEGADO POR DEFECTO PARA TALLAS PEQUEÑAS Y GRANDES -->
          <details class="admin-more-sizes-dropdown" id="details-more-sizes">
            <summary class="more-sizes-summary">
              <span class="summary-text">+ Más tallas</span>
              <span class="summary-arrow">${Icons.chevronDown('w-3.5 h-3.5')}</span>
            </summary>
            <div class="more-sizes-content">
              <div class="toolbar-sub-group">
                <span class="toolbar-caption">Tallas Pequeñas:</span>
                <div class="preset-chips-row">
                  <button type="button" class="btn-preset-size" data-preset-eu="36">+ 36 EU (US 3)</button>
                  <button type="button" class="btn-preset-size" data-preset-eu="37">+ 37 EU (US 4)</button>
                  <button type="button" class="btn-preset-size" data-preset-eu="38">+ 38 EU (US 5)</button>
                  <button type="button" class="btn-preset-size" data-preset-eu="38.5">+ 38.5 EU (US 5.5)</button>
                </div>
              </div>

              <div class="toolbar-sub-group">
                <span class="toolbar-caption">Tallas Grandes:</span>
                <div class="preset-chips-row">
                  <button type="button" class="btn-preset-size" data-preset-eu="45.5">+ 45.5 EU (US 12.5)</button>
                  <button type="button" class="btn-preset-size" data-preset-eu="46">+ 46 EU (US 13)</button>
                  <button type="button" class="btn-preset-size" data-preset-eu="47">+ 47 EU (US 14)</button>
                  <button type="button" class="btn-preset-size" data-preset-eu="48">+ 48 EU (US 15)</button>
                </div>
              </div>
            </div>
          </details>
        </div>

        <!-- GRILLA DE TARJETAS DE TALLAS -->
        <div class="admin-sizes-grid" id="admin-sizes-cards-grid">
          ${this.renderSizeCardsHtml()}
        </div>
      </div>
    `;
  }

  private renderSizeCardsHtml(): string {
    return this.formSizes
      .map((item) => {
        const eq = getSizeEquivalence(item.size);
        const displaySize = formatSizeDisplay(item.size, this.adminSizeUnit);
        return `
          <div class="admin-size-stock-card" data-card-size="${item.size}">
            <button 
              type="button" 
              class="btn-remove-size" 
              data-remove-size="${item.size}" 
              title="Eliminar talla ${item.size} de esta variante"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div class="card-size-top">
              <div class="size-header-info">
                <span class="size-group-badge size-group-${eq.group.toLowerCase()}">${eq.group}</span>
                <strong class="size-primary-number">${this.adminSizeUnit === 'US' ? 'USA' : this.adminSizeUnit} ${displaySize}</strong>
              </div>
            </div>

            ${this.showEquivalences
            ? `
                <div class="size-equivalents-sub">
                  <span>EU ${eq.eu} • US ${eq.us} • UK ${eq.uk} • ${eq.cm} CM</span>
                </div>
              `
            : ''
          }

            <div class="size-stock-controls-row">
              <label class="stock-input-label">Stock:</label>
              <div class="stock-stepper">
                <button type="button" class="btn-step-stock step-minus" data-step-size="${item.size}" data-delta="-1">-</button>
                <input 
                  type="number" 
                  min="0" 
                  class="input-size-stock" 
                  data-size="${item.size}" 
                  value="${item.stock}" 
                />
                <button type="button" class="btn-step-stock step-plus" data-step-size="${item.size}" data-delta="1">+</button>
              </div>
              <div class="stock-quick-buttons">
                <button type="button" class="btn-quick-add" data-quick-size="${item.size}" data-add="5">+5</button>
                <button type="button" class="btn-quick-add" data-quick-size="${item.size}" data-add="10">+10</button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  private refreshSizeCardsOnly(): void {
    const grid = this.container.querySelector('#admin-sizes-cards-grid');
    if (grid) {
      grid.innerHTML = this.renderSizeCardsHtml();
      this.bindSizeCardEvents();
    }
  }

  private syncSizesFromDom(): void {
    const inputs = this.container.querySelectorAll('.input-size-stock');
    inputs.forEach((inp) => {
      const size = Number((inp as HTMLElement).dataset.size);
      const stock = Math.max(0, parseInt((inp as HTMLInputElement).value || '0', 10) || 0);
      const found = this.formSizes.find((s) => s.size === size);
      if (found) {
        found.stock = stock;
      }
    });
  }

  private setupSizesSectionEvents(): void {
    // 1. Selector de unidad activa en Admin (EU, US, UK, CM)
    this.container.querySelectorAll('[data-admin-unit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const unit = (btn as HTMLElement).dataset.adminUnit as SizeUnit;
        if (unit && unit !== this.adminSizeUnit) {
          this.syncSizesFromDom();
          this.adminSizeUnit = unit;
          this.container.querySelectorAll('[data-admin-unit]').forEach((b) => {
            b.classList.toggle('active', (b as HTMLElement).dataset.adminUnit === unit);
          });
          const selectUnit = this.container.querySelector('#select-custom-size-unit') as HTMLSelectElement | null;
          if (selectUnit) selectUnit.value = unit;
          this.refreshSizeCardsOnly();
        }
      });
    });

    // Toggle para mostrar/ocultar equivalencias completas (EU, US, UK, CM) en las tarjetas
    this.container.querySelector('#btn-toggle-equivalences')?.addEventListener('click', () => {
      this.syncSizesFromDom();
      this.showEquivalences = !this.showEquivalences;
      const eyeBtn = this.container.querySelector('#btn-toggle-equivalences');
      if (eyeBtn) {
        eyeBtn.classList.toggle('is-active', this.showEquivalences);
        eyeBtn.innerHTML = this.showEquivalences ? Icons.eye('w-4 h-4') : Icons.eyeOff('w-4 h-4');
        eyeBtn.setAttribute(
          'title',
          this.showEquivalences
            ? 'Ocultar equivalencias en tarjetas'
            : 'Mostrar equivalencias en tarjetas (EU • US • UK • CM)'
        );
      }
      this.refreshSizeCardsOnly();
    });

    // 2. Chips de tallas preestablecidas pequeñas y grandes
    this.container.querySelectorAll('[data-preset-eu]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const euSize = Number((btn as HTMLElement).dataset.presetEu);
        if (!euSize) return;
        this.syncSizesFromDom();
        if (this.formSizes.some((s) => s.size === euSize)) {
          Toast.show(`La talla EU ${euSize} ya está agregada.`, 'Aviso', 'info');
          return;
        }
        this.formSizes.push({ size: euSize, stock: 0 });
        this.formSizes.sort((a, b) => a.size - b.size);
        if (this.formVariants[this.activeVariantIndex]) {
          this.formVariants[this.activeVariantIndex].sizes = this.formSizes.map((s) => ({ ...s }));
        }
        this.refreshSizeCardsOnly();
        Toast.show(`Talla EU ${euSize} agregada con stock 0.`, 'Tallas', 'success');
      });
    });

    // 3. Botón para poner todo el stock en 0 (con confirmación de seguridad)
    this.container.querySelector('#btn-reset-all-stock-zero')?.addEventListener('click', () => {
      const confirmed = window.confirm('¿Estás seguro de que deseas poner el stock de todas las tallas en 0?');
      if (!confirmed) return;
      this.syncSizesFromDom();
      this.formSizes.forEach((s) => (s.stock = 0));
      if (this.formVariants[this.activeVariantIndex]) {
        this.formVariants[this.activeVariantIndex].sizes = this.formSizes.map((s) => ({ ...s }));
      }
      this.refreshSizeCardsOnly();
      Toast.show('Stock de todas las tallas establecido en 0.', 'Stock', 'info');
    });

    // 4. Botón para incorporar las 13 tallas de la tabla oficial sin borrar las existentes
    this.container.querySelector('#btn-restore-official-sizes')?.addEventListener('click', () => {
      this.syncSizesFromDom();
      const currentMap = new Map<number, number>();
      this.formSizes.forEach((s) => currentMap.set(s.size, s.stock));

      let addedCount = 0;
      STANDARD_CHART_SIZES.forEach((sz) => {
        if (!currentMap.has(sz)) {
          currentMap.set(sz, 0);
          addedCount++;
        }
      });

      this.formSizes = Array.from(currentMap.entries())
        .map(([size, stock]) => ({ size, stock }))
        .sort((a, b) => a.size - b.size);

      if (this.formVariants[this.activeVariantIndex]) {
        this.formVariants[this.activeVariantIndex].sizes = this.formSizes.map((s) => ({ ...s }));
      }

      this.refreshSizeCardsOnly();
      if (addedCount > 0) {
        Toast.show(`Se incorporaron ${addedCount} tallas oficiales faltantes conservando las existentes.`, 'Tallas', 'success');
      } else {
        Toast.show('Todas las tallas oficiales ya están presentes en la lista.', 'Tallas', 'info');
      }
    });

    // 5. Agregar talla personalizada por input
    this.container.querySelector('#btn-add-custom-size')?.addEventListener('click', () => {
      const valInput = this.container.querySelector('#input-custom-size-val') as HTMLInputElement | null;
      const unitSelect = this.container.querySelector('#select-custom-size-unit') as HTMLSelectElement | null;
      const stockInput = this.container.querySelector('#input-custom-size-stock') as HTMLInputElement | null;

      const rawVal = parseFloat(valInput?.value || '');
      if (isNaN(rawVal) || rawVal <= 0) {
        Toast.show('Por favor ingresa un número de talla válido.', 'Atención', 'warning');
        valInput?.focus();
        return;
      }

      const unit = (unitSelect?.value as SizeUnit) || this.adminSizeUnit || 'EU';
      const euSize = unitToEu(rawVal, unit);
      const stock = Math.max(0, parseInt(stockInput?.value || '0', 10) || 0);

      this.syncSizesFromDom();
      if (this.formSizes.some((s) => s.size === euSize)) {
        Toast.show(`La talla EU ${euSize} (${unit} ${rawVal}) ya está en la lista.`, 'Aviso', 'info');
        return;
      }

      this.formSizes.push({ size: euSize, stock });
      this.formSizes.sort((a, b) => a.size - b.size);
      if (this.formVariants[this.activeVariantIndex]) {
        this.formVariants[this.activeVariantIndex].sizes = this.formSizes.map((s) => ({ ...s }));
      }
      this.refreshSizeCardsOnly();

      if (valInput) valInput.value = '';
      Toast.show(`Talla ${unit} ${rawVal} (EU ${euSize}) agregada con éxito.`, 'Tallas', 'success');
    });

    // 6. Bindear eventos internos de las tarjetas
    this.bindSizeCardEvents();
  }

  private bindSizeCardEvents(): void {
    // Inputs de stock
    this.container.querySelectorAll('.input-size-stock').forEach((input) => {
      input.addEventListener('change', () => {
        const size = Number((input as HTMLElement).dataset.size);
        const val = Math.max(0, parseInt((input as HTMLInputElement).value || '0', 10) || 0);
        (input as HTMLInputElement).value = String(val);
        const item = this.formSizes.find((s) => s.size === size);
        if (item) item.stock = val;
        if (this.formVariants[this.activeVariantIndex]) {
          this.formVariants[this.activeVariantIndex].sizes = this.formSizes.map((s) => ({ ...s }));
        }
      });
    });

    // Steppers +/-
    this.container.querySelectorAll('.btn-step-stock').forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = Number((btn as HTMLElement).dataset.stepSize);
        const delta = Number((btn as HTMLElement).dataset.delta) || 0;
        const item = this.formSizes.find((s) => s.size === size);
        if (item) {
          item.stock = Math.max(0, item.stock + delta);
          const inp = this.container.querySelector(`.input-size-stock[data-size="${size}"]`) as HTMLInputElement | null;
          if (inp) inp.value = String(item.stock);
          if (this.formVariants[this.activeVariantIndex]) {
            this.formVariants[this.activeVariantIndex].sizes = this.formSizes.map((s) => ({ ...s }));
          }
        }
      });
    });

    // Botones rápidos +5 / +10
    this.container.querySelectorAll('.btn-quick-add').forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = Number((btn as HTMLElement).dataset.quickSize);
        const add = Number((btn as HTMLElement).dataset.add) || 0;
        const item = this.formSizes.find((s) => s.size === size);
        if (item) {
          item.stock = Math.max(0, item.stock + add);
          const inp = this.container.querySelector(`.input-size-stock[data-size="${size}"]`) as HTMLInputElement | null;
          if (inp) inp.value = String(item.stock);
          if (this.formVariants[this.activeVariantIndex]) {
            this.formVariants[this.activeVariantIndex].sizes = this.formSizes.map((s) => ({ ...s }));
          }
        }
      });
    });

    // Botón eliminar talla (equis roja en la esquina de la card x fina)
    this.container.querySelectorAll('.btn-remove-size').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const size = Number((btn as HTMLElement).dataset.removeSize);
        this.syncSizesFromDom();
        this.formSizes = this.formSizes.filter((s) => s.size !== size);
        if (this.formVariants[this.activeVariantIndex]) {
          this.formVariants[this.activeVariantIndex].sizes = this.formSizes.map((s) => ({ ...s }));
        }
        this.refreshSizeCardsOnly();
      });
    });
  }

  // ==========================================================================
  // TAB 3: CUPONES ACTIVOS (CRUD PROMOCIONES)
  // ==========================================================================
  private renderPromosListTab(): string {
    return `
      <div class="admin-view-panel">
        <div class="admin-view-header">
          <div>
            <h2 class="admin-view-title">Códigos de Promoción & Cupones</h2>
            <p class="admin-view-subtitle">Supervisa los códigos promocionales vigentes, porcentajes de descuento, tiendas promo ocultas y usos registrados.</p>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn-table-action" id="btn-admin-goto-create-store-promo" style="background: #0f172a; color: #ffffff; border-color: #0f172a; font-weight: 700; padding: 0 14px; height: 38px;">
              ${Icons.plus('w-4 h-4')}
              <span>Nuevo Código Tienda Promo</span>
            </button>
            <button type="button" class="btn-admin-action-primary" id="btn-admin-goto-create-promo" style="height: 38px;">
              ${Icons.plus('w-4 h-4')}
              <span>Nuevo Código Regular</span>
            </button>
          </div>
        </div>

        <!-- POLÍTICA DE TIENDA: RESTRICCIÓN DE MEZCLA DE PROMOCIONES -->
        <div class="admin-store-policy-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
          <div style="display: flex; flex-direction: column; gap: 4px; max-width: 680px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <strong style="font-size: 0.88rem; color: #0f172a; text-transform: uppercase; letter-spacing: 0.03em;">
                Regla de Tienda: No mezclar cupones con artículos promocionales
              </strong>
              <span class="badge-policy-default" style="font-size: 0.65rem; font-weight: 700; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 2px 7px; border-radius: 9999px;">
                ACTIVA PREDETERMINADA
              </span>
            </div>
            <p style="font-size: 0.78rem; color: #64748b; margin: 0; line-height: 1.4;">
              Impide que los clientes mezclen cupones de descuento con calzados en oferta de tiendas promocionales en el mismo carrito para no acumular descuentos ni bajarle más el precio.
            </p>
          </div>

          <label class="admin-switch-label" title="Activar o desactivar restricción de mezclar cupones con artículos en promoción" style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
            <input 
              type="checkbox" 
              id="toggle-block-promo-stacking" 
              ${this.store.blockPromoStacking ? 'checked' : ''} 
            />
            <span class="switch-ui"></span>
            <span id="label-block-promo-stacking" style="font-size: 0.80rem; font-weight: 600; color: ${this.store.blockPromoStacking ? '#0f172a' : '#64748b'};">
              ${this.store.blockPromoStacking ? 'Restricción Activa' : 'Permitir Mezcla'}
            </span>
          </label>
        </div>

        ${this.promos.length === 0
        ? `
            <div class="admin-empty-state">
              <h4>No hay cupones creados</h4>
              <p>Crea el primer código promocional o una tienda promo para que tus clientes puedan redimirlo.</p>
            </div>
          `
        : `
            <div class="admin-promos-grid">
              ${this.promos
          .map((promo) => {
            const isStore = promo.discountType === 'HIDDEN_STORE';
            const isPercentage = promo.discountType === 'PERCENTAGE';
            const storeCount = Array.isArray(promo.storeItems) ? promo.storeItems.length : 0;
            const discountLabel = isStore
              ? 'TIENDA PROMO'
              : (isPercentage ? `-${promo.discountValue}%` : `-$${promo.discountValue}`);

            return `
                    <div class="admin-promo-card ${promo.isActive ? 'is-active' : 'is-inactive'} ${isStore ? 'is-store-promo-card' : ''}">
                      <div class="admin-promo-header">
                        <div class="admin-promo-code-wrap">
                          <strong class="admin-promo-code">${promo.code}</strong>
                          ${isStore ? `<span class="badge-welcome-pill" style="background: #0f172a; color: #38bdf8;#1e293b;"> </span>` : ''}
                          ${promo.isWelcomeOnly ? `<span class="badge-welcome-pill">Bienvenida</span>` : ''}
                        </div>
                        <span class="admin-promo-discount" style="${isStore ? 'background: #059669; color: #ffffff; font-size: 0.72rem; padding: 4px 8px; border-radius: 6px;' : ''}">
                          ${discountLabel}
                        </span>
                      </div>

                      <p class="admin-promo-desc">${promo.description || 'Sin descripción'}</p>

                      <div class="admin-promo-meta-list">
                        ${isStore ? `
                          <span>• Contenido: <strong>${storeCount} calzado(s) en descuento</strong></span>
                          <span>• Inicio: <strong>${promo.startsAt ? new Date(promo.startsAt).toLocaleDateString() : 'Inmediato'}</strong></span>
                          <span>• Fin: <strong>${promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : 'Sin caducidad'}</strong></span>
                        ` : `
                          <span>• Compra mínima: <strong>${promo.minPurchase > 0 ? `$${promo.minPurchase}` : 'Sin mínimo'}</strong></span>
                        `}
                        <span>• Límite: <strong>${promo.onePerUser ? '1 uso por persona' : 'Ilimitado'}</strong></span>
                        <span>• Asignado a cuentas: <strong>${promo.totalClaimed || 0}</strong></span>
                        <span>• Canjeado: <strong>${promo.totalUsed || 0} ${promo.usageLimit ? `/ ${promo.usageLimit}` : ''}</strong></span>
                      </div>

                      <div class="admin-promo-footer">
                        <button
                          type="button"
                          class="btn-toggle-promo-badge ${promo.isActive ? 'active' : 'inactive'}"
                          data-action="toggle-promo"
                          data-id="${promo.id}"
                          data-current="${promo.isActive}"
                        >
                          ${promo.isActive ? 'Activo' : 'Inactivo'}
                        </button>

                        <div class="admin-promo-actions">
                          <button
                            type="button"
                            class="btn-promo-edit"
                            data-action="edit-promo"
                            data-id="${promo.id}"
                            title="${isStore ? 'Editar Tienda Promo' : 'Editar cupón'}"
                          >
                            ${Icons.edit('w-4 h-4')}
                          </button>
                          <button
                            type="button"
                            class="btn-promo-delete"
                            data-action="delete-promo"
                            data-id="${promo.id}"
                            title="Eliminar cupón"
                          >
                            ${Icons.trash('w-4 h-4')}
                          </button>
                        </div>
                      </div>
                    </div>
                  `;
          })
          .join('')}
            </div>
          `
      }
      </div>
    `;
  }

  // ==========================================================================
  // TAB 4: CREAR O EDITAR CÓDIGO PROMOCIONAL
  // ==========================================================================
  private renderPromoFormTab(): string {
    const isEdit = !!this.editingPromo;
    const promo = this.editingPromo || {};

    return `
      <div class="admin-view-panel">
        <div class="admin-view-header">
          <div>
            <h2 class="admin-view-title">${isEdit ? `Editar Código: ${promo.code}` : 'Nuevo Código Promocional'}</h2>
            <p class="admin-view-subtitle">Define las reglas comerciales, porcentaje o monto de descuento y restricciones.</p>
          </div>
          ${isEdit
        ? `
              <button type="button" class="btn-admin-action-secondary" id="btn-cancel-edit-promo">
                Cancelar Edición
              </button>
            `
        : ''
      }
        </div>

        <form id="form-admin-promo" class="admin-editor-form">
          <div class="admin-form-section">
            <h3 class="admin-section-heading">PARÁMETROS DEL CUPÓN</h3>
            
            <div class="admin-form-grid-2">
              <div class="admin-input-group">
                <label for="promo-code">Código en Mayúsculas *</label>
                <input
                  type="text"
                  id="promo-code"
                  value="${promo.code || ''}"
                  placeholder="Ej: BLESSED25"
                  style="text-transform: uppercase; font-weight: 700; letter-spacing: 1px;"
                  ${isEdit ? 'readonly' : ''}
                  required
                />
              </div>

              <div class="admin-input-group">
                <label for="promo-type">Tipo de Descuento *</label>
                <select id="promo-type" required>
                  <option value="PERCENTAGE" ${promo.discountType !== 'FIXED' ? 'selected' : ''}>Porcentaje (%)</option>
                  <option value="FIXED" ${promo.discountType === 'FIXED' ? 'selected' : ''}>Monto Fijo en Dólares ($)</option>
                </select>
              </div>
            </div>

            <div class="admin-form-grid-2">
              <div class="admin-input-group">
                <label for="promo-val">Valor del Descuento *</label>
                <input type="number" step="0.5" min="1" id="promo-val" value="${promo.discountValue || ''}" placeholder="Ej: 20 para 20% o 25 para $25" required />
              </div>

              <div class="admin-input-group">
                <label for="promo-min">Compra Mínima Requerida ($ USD)</label>
                <input type="number" step="1" min="0" id="promo-min" value="${promo.minPurchase || 0}" placeholder="0 para sin mínimo" />
              </div>
            </div>

            <div class="admin-input-group">
              <label for="promo-desc">Descripción para el Cliente *</label>
              <textarea id="promo-desc" rows="2" placeholder="Ej: 20% de descuento en sandalias y zapatillas por temporada." required>${promo.description || ''}</textarea>
            </div>
          </div>

          <div class="admin-form-section">
            <h3 class="admin-section-heading">RESTRICCIONES Y ESTADO</h3>
            <div class="admin-toggles-row">
              <label class="admin-switch-label">
                <input type="checkbox" id="promo-oneperuser" ${promo.onePerUser !== false ? 'checked' : ''} />
                <span class="switch-ui"></span>
                <span>Límite de 1 uso por persona (Garantía de cuenta)</span>
              </label>

              <label class="admin-switch-label">
                <input type="checkbox" id="promo-iswelcome" ${promo.isWelcomeOnly ? 'checked' : ''} />
                <span class="switch-ui"></span>
                <span>Exclusivo para Bienvenida de Nuevas Cuentas</span>
              </label>

              <label class="admin-switch-label">
                <input type="checkbox" id="promo-isactive" ${promo.isActive !== false ? 'checked' : ''} />
                <span class="switch-ui"></span>
                <span>Cupón Activo para Redención</span>
              </label>
            </div>
          </div>

          <div class="admin-form-actions">
            <button type="button" class="btn-admin-cancel" id="btn-cancel-promo-form">
              Cancelar
            </button>
            <button type="submit" class="btn-admin-submit" id="btn-save-promo">
              ${isEdit ? 'Actualizar Cupón' : 'Crear y Habilitar Cupón'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // ==========================================================================
  // TAB 4B: CREAR O EDITAR CÓDIGO TIENDA PROMO OCULTA (SHOWCASEPROMO)
  // ==========================================================================
  private renderPromoStoreFormTab(): string {
    const isEdit = !!(this.editingPromo && this.editingPromo.discountType === 'HIDDEN_STORE');
    const promo = this.editingPromo || {};
    const allProducts = this.products.length > 0 ? this.products : (this.store.products.length > 0 ? this.store.products : []);

    const formatForDatetimeLocal = (dateVal?: string | Date | null): string => {
      if (!dateVal) return '';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const startsAtVal = promo.startsAt
      ? formatForDatetimeLocal(promo.startsAt)
      : formatForDatetimeLocal(new Date());

    const expiresAtVal = promo.expiresAt
      ? formatForDatetimeLocal(promo.expiresAt)
      : formatForDatetimeLocal(new Date(Date.now() + 30 * 24 * 3600 * 1000));

    const configuredIds = new Set(this.promoStoreItems.map((item) => item.productId));
    const availableProducts = allProducts.filter((p) => !configuredIds.has(p.id));

    return `
      <div class="admin-view-panel">
        <div class="admin-view-header">
          <div>
            <h2 class="admin-view-title">${isEdit ? `Editar Código Tienda Promo: ${promo.code}` : 'Nuevo Código Tienda Promo'}</h2>
            <p class="admin-view-subtitle">
              Configura un código especial que activará la tienda oculta interactiva (ShowcasePromo) con calzados seleccionados del stock y precios exclusivos rebajados.
            </p>
          </div>
          ${isEdit
        ? `
              <button type="button" class="btn-admin-action-secondary" id="btn-cancel-edit-promo-store">
                Cancelar Edición
              </button>
            `
        : ''
      }
        </div>

        <form id="form-admin-promo-store" class="admin-editor-form">
          <!-- SECCIÓN 1: DATOS BÁSICOS DEL CÓDIGO -->
          <div class="admin-form-section">
            <h3 class="admin-section-heading">CÓDIGO DE TIENDA PROMO</h3>
            <div class="admin-form-grid-2">
              <div class="admin-input-group">
                <label for="promo-store-code">Código en Mayúsculas *</label>
                <input
                  type="text"
                  id="promo-store-code"
                  value="${promo.code || ''}"
                  placeholder="Ej: BLESSEDVIP, SECRETO2026"
                  style="text-transform: uppercase; font-weight: 700; letter-spacing: 1px;"
                  ${isEdit ? 'readonly' : ''}
                  required
                />
              </div>

              <div class="admin-input-group">
                <label for="promo-store-desc">Lema / Título de la Tienda Oculta *</label>
                <input
                  type="text"
                  id="promo-store-desc"
                  value="${promo.description || ''}"
                  placeholder="Ej: Colección Secreta Blessed Slides 2026"
                  required
                />
              </div>
            </div>
          </div>

          <!-- SECCIÓN 2: VIGENCIA Y FECHAS (CUÁNDO EMPIEZA Y CUÁNDO TERMINA) -->
          <div class="admin-form-section">
            <h3 class="admin-section-heading">VIGENCIA Y FECHAS DE LA TIENDA PROMO</h3>
            <p class="admin-section-sub">Define el rango de tiempo en que la tienda oculta estará disponible al canjear el código.</p>
            <div class="admin-form-grid-2">
              <div class="admin-input-group">
                <label for="promo-store-starts">¿Cuándo empieza? (Fecha y Hora de Inicio) *</label>
                <input
                  type="datetime-local"
                  id="promo-store-starts"
                  value="${startsAtVal}"
                  required
                />
              </div>

              <div class="admin-input-group">
                <label for="promo-store-expires">¿Cuándo termina? (Fecha y Hora de Finalización) *</label>
                <input
                  type="datetime-local"
                  id="promo-store-expires"
                  value="${expiresAtVal}"
                  required
                />
              </div>
            </div>
          </div>

          <!-- SECCIÓN 3: OBJETOS EN DESCUENTO (SALDRÁN DEL STOCK) -->
          <div class="admin-form-section">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
              <div>
                <h3 class="admin-section-heading" style="margin-bottom: 4px;">CALZADOS EN DESCUENTO (SELECCIONADOS DEL STOCK)</h3>
                <p class="admin-section-sub" style="margin: 0;">
                  Estos calzados saldrán directamente del stock disponible. Puedes cambiar el precio promocional en este formulario.
                </p>
              </div>
              <span class="showcase-count-pill" style="font-weight: 700;">
                ${this.promoStoreItems.length} calzados en tienda promo
              </span>
            </div>

            <!-- SELECTOR PARA AGREGAR PRODUCTOS DEL CATÁLOGO -->
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 18px; flex-wrap: wrap; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="flex: 1; min-width: 260px;">
                <select id="promo-store-add-select" style="width: 100%; height: 40px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; font-size: 0.85rem; background: #ffffff;">
                  <option value="">-- Seleccionar calzado del stock para agregar --</option>
                  ${availableProducts.map((p) => {
        const totalStock = Array.isArray(p.sizes) ? p.sizes.reduce((sum: number, s: any) => sum + (s.stock || 0), 0) : 0;
        return `<option value="${p.id}">${p.name} • Stock: ${totalStock} pares • Regular: $${Number(p.price).toFixed(2)}</option>`;
      }).join('')}
                </select>
              </div>
              <button type="button" class="btn-table-action" id="btn-add-product-to-promo-store" style="height: 40px; background: #0f172a; color: #ffffff; border-color: #0f172a; padding: 0 18px; font-weight: 700;">
                + Agregar Calzado
              </button>
            </div>

            <!-- LISTA / TABLA DE PRODUCTOS EN DESCUENTO -->
            ${this.promoStoreItems.length === 0
        ? `
                <div style="text-align: center; padding: 36px 16px; border: 2px dashed #cbd5e1; border-radius: 10px; color: #64748b; font-size: 0.88rem;">
                  Aún no has agregado calzados a esta tienda promo.<br/>
                  Selecciona un calzado del menú superior para añadirlo y definir su precio con descuento.
                </div>
              `
        : `
                <div class="admin-products-table-wrap admin-table-container" style="margin-bottom: 0;">
                  <table class="admin-table admin-data-table">
                    <thead>
                      <tr>
                        <th style="width: 45px;">#</th>
                        <th style="min-width: 240px;">CALZADO EN STOCK</th>
                        <th style="width: 130px;">PRECIO REGULAR</th>
                        <th style="width: 180px;">PRECIO PROMO ($ USD) *</th>
                        <th style="width: 180px;">ETIQUETA (BADGE)</th>
                        <th style="width: 80px; text-align: right;">QUITAR</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this.promoStoreItems.map((item, idx) => {
          const prod = allProducts.find((p) => p.id === item.productId);
          if (!prod) return '';
          const thumb = prod.image || prod.colors?.[0]?.image || '/assets/slide/slide.png';
          const totalStock = Array.isArray(prod.sizes) ? prod.sizes.reduce((sum: number, s: any) => sum + (s.stock || 0), 0) : 0;

          return `
                          <tr>
                            <td style="font-weight: 700; color: #64748b;">${idx + 1}</td>
                            <td>
                              <div class="table-prod-cell admin-prod-cell">
                                <img src="${thumb}" alt="${prod.name}" class="table-prod-thumb admin-prod-thumb" style="width: 44px; height: 44px; min-width: 44px; max-width: 44px; object-fit: contain; border-radius: 6px; background: #f8fafc; border: 1px solid #e2e8f0;" />
                                <div class="table-prod-meta admin-prod-info">
                                  <strong class="table-prod-name admin-prod-name">${prod.name}</strong>
                                  <span class="table-prod-sub admin-prod-sub">Stock: ${totalStock} pares • ${prod.categoryName || 'Calzado'}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style="font-weight: 600; color: #94a3b8; text-decoration: line-through;">$${Number(prod.price).toFixed(2)}</span>
                            </td>
                            <td>
                              <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-weight: 700; color: #059669;">$</span>
                                <input 
                                  type="number" 
                                  step="0.5" 
                                  min="1" 
                                  class="input-promo-store-item-price" 
                                  data-index="${idx}" 
                                  value="${item.promoPrice}" 
                                  placeholder="Ej: 79.99" 
                                  style="width: 110px; height: 34px; padding: 0 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 700; color: #059669;"
                                  required
                                />
                              </div>
                            </td>
                            <td>
                              <input 
                                type="text" 
                                class="input-promo-store-item-badge" 
                                data-index="${idx}" 
                                value="${item.badgeLabel || 'EDICIÓN PROMO'}" 
                                placeholder="Ej: OFERTA VIP"
                                style="width: 140px; height: 34px; padding: 0 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.78rem;"
                              />
                            </td>
                            <td style="text-align: right;">
                              <button 
                                type="button" 
                                class="btn-remove-promo-store-item btn-table-action danger" 
                                data-index="${idx}" 
                                title="Quitar este calzado de la tienda promo"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        `;
        }).join('')}
                    </tbody>
                  </table>
                </div>
              `
      }
          </div>

          <!-- SECCIÓN 4: RESTRICCIONES Y ESTADO -->
          <div class="admin-form-section">
            <h3 class="admin-section-heading">RESTRICCIONES Y ESTADO</h3>
            <div class="admin-form-grid-2">
              <div class="admin-input-group">
                <label for="promo-store-usagelimit">Límite Total de Usos</label>
                <input type="number" min="1" step="1" id="promo-store-usagelimit" value="${promo.usageLimit || ''}" placeholder="Ej: 50 (vacío para ilimitado)" />
              </div>
              <div class="admin-input-group">
                <label for="promo-store-minpurchase">Compra Mínima Requerida ($ USD)</label>
                <input type="number" step="1" min="0" id="promo-store-minpurchase" value="${promo.minPurchase || 0}" placeholder="0 para sin mínimo" />
              </div>
            </div>

            <div class="admin-toggles-row" style="margin-top: 14px;">
              <label class="admin-switch-label">
                <input type="checkbox" id="promo-store-oneperuser" ${promo.onePerUser !== false ? 'checked' : ''} />
                <span class="switch-ui"></span>
                <span>Límite de 1 uso por persona (Garantía de cuenta)</span>
              </label>

              <label class="admin-switch-label">
                <input type="checkbox" id="promo-store-iswelcome" ${promo.isWelcomeOnly ? 'checked' : ''} />
                <span class="switch-ui"></span>
                <span>Exclusivo para Bienvenida de Nuevas Cuentas</span>
              </label>

              <label class="admin-switch-label">
                <input type="checkbox" id="promo-store-isactive" ${promo.isActive !== false ? 'checked' : ''} />
                <span class="switch-ui"></span>
                <span>Tienda Promo Activa para Redención</span>
              </label>
            </div>
          </div>

          <!-- BOTONES DE ACCIÓN -->
          <div class="admin-form-actions">
            <button type="button" class="btn-admin-cancel" id="btn-cancel-promo-store">
              Cancelar
            </button>
            <button type="submit" class="btn-admin-submit" id="btn-save-promo-store" style="background: #0f172a;">
              ${isEdit ? 'Actualizar Tienda Promo' : 'Crear y Habilitar Tienda Promo'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // ==========================================================================
  // TAB 5: ALMACENAMIENTO DE RECURSOS EN MINIO (S3 BUCKET)
  // ==========================================================================
  private renderMinioStorageTab(): string {
    return `
      <div class="admin-view-panel">
        <div class="admin-view-header">
          <div>
            <h2 class="admin-view-title">Almacenamiento de Recursos en MinIO</h2>
            <p class="admin-view-subtitle">Sube fotografías, imágenes de variantes y modelos 3D (.glb) directamente al bucket "ecommerce-assets" de MinIO.</p>
          </div>
          <button type="button" class="btn-admin-action-secondary" id="btn-refresh-minio-assets">
            Actualizar Recursos
          </button>
        </div>

        <!-- ZONA DE CARGA DE ARCHIVOS -->
        <div class="admin-upload-dropzone" id="admin-upload-dropzone">
          <input type="file" id="input-minio-file" accept="image/*,.glb,.gltf" style="display: none;" />
          <div class="dropzone-content">
            <div class="dropzone-icon">${Icons.uploadCloud('w-8 h-8')}</div>
            <h4>Arrastra o selecciona un archivo para subir a MinIO</h4>
            <p>Soporta imágenes JPG, PNG, WEBP y modelos 3D interactivos GLB / GLTF.</p>
            <button type="button" class="btn-admin-action-primary" id="btn-select-minio-file">
              Elegir Archivo del Equipo
            </button>
          </div>
          <div class="upload-progress-box is-hidden" id="upload-progress-box">
            <span class="upload-spinner"></span>
            <span id="upload-progress-text">Subiendo recurso a MinIO...</span>
          </div>
        </div>

        <!-- LISTADO DE RECURSOS EN MINIO -->
        <div class="admin-assets-section">
          <h3 class="admin-section-heading">RECURSOS ALMACENADOS EN EL BUCKET</h3>
          ${this.assets.length === 0
        ? `
              <div class="admin-empty-state">
                <p>No se encontraron archivos en el bucket de MinIO todavía o no se ha cargado la lista.</p>
                <button type="button" class="btn-admin-action-secondary" id="btn-load-minio-list">Consultar MinIO</button>
              </div>
            `
        : `
              <div class="admin-assets-grid">
                ${this.assets
          .map((asset) => {
            const is3D = asset.key.endsWith('.glb') || asset.key.endsWith('.gltf');
            const sizeKB = (asset.size / 1024).toFixed(1);

            return `
                      <div class="admin-asset-card" data-key="${asset.key}">
                        <div class="asset-preview-wrap">
                          ${is3D
                ? `<div class="asset-3d-placeholder">${Icons.cube3d('w-8 h-8')}<span>Modelo 3D</span></div>`
                : `<img src="${asset.url}" alt="${asset.key}" class="asset-preview-img" loading="lazy" />`
              }
                        </div>
                        <div class="asset-info-col">
                          <strong class="asset-filename" title="${asset.key}">${asset.key}</strong>
                          <span class="asset-size">${sizeKB} KB</span>
                        </div>
                        <div class="asset-actions-row">
                          <button
                            type="button"
                            class="btn-copy-asset-url"
                            data-action="copy-url"
                            data-url="${asset.url}"
                            title="Copiar URL para el producto"
                          >
                            Copiar URL
                          </button>
                          <button
                            type="button"
                            class="btn-delete-asset"
                            data-action="delete-asset"
                            data-key="${asset.key}"
                            title="Eliminar de MinIO"
                          >
                            ${Icons.trash('w-4 h-4')}
                          </button>
                        </div>
                      </div>
                    `;
          })
          .join('')}
              </div>
            `
      }
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // TAB 6: APARIENCIA DE SITIO WEB - CIRCULAR SHOWCASE
  // ==========================================================================
  private renderCircularShowcaseTab(): string {
    const settings = ShowcaseSettingsService.getSettings();
    const totalCount = this.products.length;
    const withPngCount = this.products.filter((p) => Boolean(p.carouselImage)).length;
    const activeShowcaseCount = this.products.filter((p) => p.showcaseActive && p.carouselImage).length;
    const activeDemosCount = settings.enabledDemoIds.length;

    // Filtrado por término de búsqueda si existe
    const filteredProducts = this.products.filter((p) => {
      if (!this.showcaseSearchTerm) return true;
      const term = this.showcaseSearchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(term)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(term))
      );
    });

    // Ordenar: PRIMERO los que ya tienen recurso .PNG y se pueden mostrar en el carrusel
    const sorted = [...filteredProducts].sort((a, b) => {
      const aHasPng = Boolean(a.carouselImage);
      const bHasPng = Boolean(b.carouselImage);
      const aActive = Boolean(a.showcaseActive && aHasPng);
      const bActive = Boolean(b.showcaseActive && bHasPng);

      // 1. Activos con PNG van al frente ordenados por showcaseOrder asc
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      if (aActive && bActive) {
        return (a.showcaseOrder || 0) - (b.showcaseOrder || 0);
      }

      // 2. Calzados con PNG que aún están inactivos van inmediatamente después (listos para mostrar)
      if (aHasPng && !bHasPng) return -1;
      if (!aHasPng && bHasPng) return 1;

      // 3. Calzados sin PNG al final
      return a.name.localeCompare(b.name);
    });

    const activeList = sorted.filter((p) => p.showcaseActive && p.carouselImage);

    return `
      <div class="admin-view-panel">
        <div class="admin-view-header">
          <div class="admin-view-header-main">
            <h2 class="admin-view-title">Apariencia: Circular Showcase</h2>
            <p class="admin-view-subtitle">
              Administra cómo se visualizan las siluetas en el escaparate 3D interactivo, sus proporciones (836 × 342), 
              los calzados de ejemplo de Blessed Slides y el catálogo oficial.
            </p>
          </div>
        </div>

        <!-- TARJETAS DE MÉTRICAS -->
        <div class="admin-kpi-grid admin-metrics-grid">
          <div class="admin-kpi-card admin-metric-card">
            <span class="kpi-label metric-lbl">ACTIVOS EN SHOWCASE</span>
            <strong class="kpi-number metric-val text-emerald">${activeShowcaseCount}</strong>
          </div>
          <div class="admin-kpi-card admin-metric-card">
            <span class="kpi-label metric-lbl">EJEMPLOS DEMO ACTIVOS</span>
            <strong class="kpi-number metric-val">${activeDemosCount} / ${DEFAULT_SHOWCASE_DEMOS.length}</strong>
          </div>
          <div class="admin-kpi-card admin-metric-card">
            <span class="kpi-label metric-lbl">CON RECURSO .PNG</span>
            <strong class="kpi-number metric-val text-emerald">${withPngCount}</strong>
          </div>
          <div class="admin-kpi-card admin-metric-card">
            <span class="kpi-label metric-lbl">TOTAL EN CATÁLOGO</span>
            <strong class="kpi-number metric-val">${totalCount}</strong>
          </div>
        </div>

        <!-- SECCIÓN DE CALZADOS DE EJEMPLO DEL ESCAPARATE (DESPLEGABLE / PLEGADO POR DEFECTO) -->
        <div class="showcase-demos-accordion ${this.demosAccordionOpen ? 'is-open' : 'is-collapsed'}">
          <button 
            type="button" 
            class="showcase-accordion-header" 
            id="btn-toggle-demos-accordion"
            aria-expanded="${this.demosAccordionOpen}"
            title="Clic para desplegar o plegar calzados de demostración"
          >
            <div class="showcase-accordion-title-wrap">
              <svg class="showcase-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              <span class="showcase-accordion-title">Calzados de Ejemplo en Escaparate</span>
              <span class="showcase-count-pill">${activeDemosCount} de ${DEFAULT_SHOWCASE_DEMOS.length} activos</span>
            </div>
            <span class="showcase-accordion-hint" id="demos-accordion-hint-text">
              ${this.demosAccordionOpen ? 'Plegar lista' : 'Desplegar para gestionar'}
            </span>
          </button>

          <div class="showcase-accordion-body" id="demos-accordion-body" style="${this.demosAccordionOpen ? '' : 'display: none;'}">
            <div class="showcase-demos-subbar">
              <p class="showcase-demos-help">
                Activa o desactiva las 10 siluetas demostrativas de Blessed Slides en el escaparate.
              </p>
              <div class="showcase-demos-actions">
                <button type="button" class="btn-demo-action danger" id="btn-remove-all-demos" title="Desactivar todos los calzados de demostración">
                  Quitar todos los ejemplos
                </button>
                <button type="button" class="btn-demo-action" id="btn-enable-all-demos" title="Activar los 10 calzados de demostración">
                  Activar todos los ejemplos
                </button>
              </div>
            </div>

            <div class="showcase-demos-grid">
              ${DEFAULT_SHOWCASE_DEMOS.map((demo) => {
      const isDemoActive = settings.enabledDemoIds.includes(demo.id);
      return `
                  <div class="showcase-demo-card ${isDemoActive ? 'is-active' : 'is-inactive'}" id="demo-card-${demo.id}">
                    <div class="showcase-demo-thumb-wrap">
                      <img src="${demo.image}" alt="${demo.name}" />
                    </div>
                    <div class="showcase-demo-meta">
                      <span class="showcase-demo-title">${demo.name}</span>
                      <span class="showcase-demo-sub">${demo.edition} • ${demo.colorName} • $${demo.price}</span>
                    </div>
                    <label class="admin-switch-label" title="${isDemoActive ? 'Desactivar este ejemplo' : 'Activar este ejemplo'}">
                      <input 
                        type="checkbox" 
                        class="toggle-demo-item" 
                        data-demo-id="${demo.id}" 
                        ${isDemoActive ? 'checked' : ''} 
                      />
                      <span class="switch-ui"></span>
                    </label>
                  </div>
                `;
    }).join('')}
            </div>
          </div>
        </div>

        <!-- SECCIÓN: PRODUCTOS DEL CATÁLOGO (PRIORIZANDO LOS QUE TIENEN PNG) -->
        <div class="showcase-catalog-section-header">
          <div>
            <h3 class="showcase-section-title">Calzados del Catálogo Oficial</h3>
            <p class="showcase-section-desc">
              Se muestran en primer lugar los calzados que ya tienen recurso .PNG asignado listos para el carrusel.
            </p>
          </div>
        </div>

        <!-- BARRA DE BÚSQUEDA Y FILTRO -->
        <div class="admin-filter-bar admin-table-toolbar">
          <div class="admin-search-input-wrap admin-search-wrap">
            ${Icons.search('w-4 h-4')}
            <input 
              type="text" 
              class="admin-search-input" 
              id="showcase-search-input" 
              placeholder="Buscar calzado por nombre o categoría..." 
              value="${this.showcaseSearchTerm}" 
            />
          </div>
        </div>

        <!-- INPUT OCULTO PARA SUBIR .PNG DIRECTO DESDE LA TABLA -->
        <input type="file" id="table-showcase-file-picker" accept=".png,image/png" style="display: none;" />

        <!-- TABLA DE GESTIÓN DEL CIRCULAR SHOWCASE -->
        <div class="admin-products-table-wrap admin-table-container">
          <table class="admin-table admin-data-table">
            <thead>
              <tr>
                <th style="width: 70px;">ORDEN</th>
                <th class="table-col-product" style="min-width: 250px;">PRODUCTO</th>
                <th style="min-width: 220px;">RECURSO CARRUSEL (.PNG)</th>
                <th style="width: 175px;">PROPORCIÓN (836×342)</th>
                <th style="width: 160px;">EN SHOWCASE</th>
                <th style="width: 90px; text-align: right;">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.length === 0
        ? `
                  <tr>
                    <td colspan="6" class="admin-table-empty">
                      No se encontraron calzados en el catálogo.
                    </td>
                  </tr>
                `
        : sorted.map((p) => {
          const isActive = Boolean(p.showcaseActive && p.carouselImage);
          const activeIndex = isActive ? activeList.findIndex((item) => item.id === p.id) : -1;
          const isFirst = activeIndex === 0;
          const isLast = activeIndex === activeList.length - 1;
          const thumbImg = p.image || p.colors?.[0]?.image || '/assets/slide/slide.png';
          const pngFileName = p.carouselImage ? p.carouselImage.split('/').pop() : null;

          return `
                      <tr class="${isActive ? 'row-showcase-active' : (p.carouselImage ? 'row-has-png' : '')}">
                        <!-- 1. ORDEN -->
                        <td>
                          ${isActive
              ? `
                              <div class="showcase-order-cell">
                                <span class="showcase-order-num">#${activeIndex + 1}</span>
                                <div class="showcase-order-arrows">
                                  <button 
                                    type="button" 
                                    class="btn-order-arrow btn-showcase-up" 
                                    data-id="${p.id}" 
                                    data-order="${p.showcaseOrder || 0}"
                                    ${isFirst ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}
                                    title="Mover arriba en el showcase"
                                  >▲</button>
                                  <button 
                                    type="button" 
                                    class="btn-order-arrow btn-showcase-down" 
                                    data-id="${p.id}" 
                                    data-order="${p.showcaseOrder || 0}"
                                    ${isLast ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}
                                    title="Mover abajo en el showcase"
                                  >▼</button>
                                </div>
                              </div>
                            `
              : `<span style="color: #94a3b8; font-size: 0.82rem;">—</span>`
            }
                        </td>

                        <!-- 2. PRODUCTO -->
                        <td class="table-col-product">
                          <div class="table-prod-cell admin-prod-cell">
                            <img src="${thumbImg}" alt="${p.name}" class="table-prod-thumb admin-prod-thumb" style="width: 48px; height: 48px; min-width: 48px; max-width: 48px; max-height: 48px; object-fit: contain; border-radius: 6px; background: #f8fafc; border: 1px solid #e2e8f0; flex-shrink: 0;" />
                            <div class="table-prod-meta admin-prod-info">
                              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <strong class="table-prod-name admin-prod-name">${p.name}</strong>
                                ${p.carouselImage ? `<span class="badge-has-png">Listo</span>` : ''}
                              </div>
                              <span class="table-prod-sub admin-prod-sub">${p.subtitle || p.categoryName || 'Calzado deportivo'}</span>
                              <div class="table-price-col">
                                <strong>$${Number(p.price).toFixed(2)}</strong>
                              </div>
                            </div>
                          </div>
                        </td>

                        <!-- 3. RECURSO CARRUSEL (.PNG) -->
                        <td>
                          <div class="showcase-png-cell">
                            ${p.carouselImage
              ? `
                                <div class="showcase-png-thumb-box" title="Recurso PNG transparente">
                                  <img src="${p.carouselImage}" alt="PNG Carrusel" class="showcase-png-thumb" />
                                </div>
                                <div class="showcase-png-info" style="display: flex; flex-direction: column; gap: 4px; min-width: 0;">
                                  <span class="showcase-png-filename" style="font-size: 0.74rem; font-weight: 600; color: #0f172a; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${pngFileName}">
                                    ${pngFileName}
                                  </span>
                                  <div class="showcase-png-actions" style="display: flex; gap: 6px;">
                                    <button 
                                      type="button" 
                                      class="btn-showcase-action btn-table-upload-png" 
                                      data-id="${p.id}" 
                                      title="Sustituir archivo .png"
                                    >
                                      Sustituir
                                    </button>
                                    <button 
                                      type="button" 
                                      class="btn-showcase-action danger btn-table-delete-png" 
                                      data-id="${p.id}" 
                                      title="Eliminar recurso .png"
                                    >
                                      Quitar
                                    </button>
                                  </div>
                                </div>
                              `
              : `
                                <span class="badge-no-png">Sin recurso .png</span>
                                <button 
                                  type="button" 
                                  class="btn-showcase-action primary btn-table-upload-png" 
                                  data-id="${p.id}" 
                                  title="Subir archivo .png para Circular Showcase"
                                >
                                  + Asignar .PNG
                                </button>
                              `
            }
                          </div>
                        </td>

                        <!-- 4. CONTROL VISUAL Y PROPORCIONES (836 × 342) INDIVIDUAL -->
                        <td>
                          ${(() => {
              const prop = ShowcaseSettingsService.getProductProportion(p.id);
              const dimText = prop.customProportionEnabled && prop.customWidth > 0 && prop.customHeight > 0
                ? `${prop.customWidth} × ${prop.customHeight} px`
                : (prop.adjustTo836x342 ? '836 × 342 px' : '290 × 125 px');
              const fitText = prop.preserveWithoutDistortion ? 'Sin distorsión' : 'Ajuste libre';
              const shadowText = prop.showShadow !== false ? 'Con sombra' : 'Sin sombra';
              const shadowClass = prop.showShadow !== false ? 'is-shadow-on' : 'is-shadow-off';
              const previewImgSrc = p.carouselImage || thumbImg;

              return `
                              <button 
                                type="button" 
                                class="btn-showcase-prop-btn" 
                                data-id="${p.id}"
                                data-name="${p.name.replace(/"/g, '&quot;')}"
                                data-img="${previewImgSrc}"
                                title="Configurar proporción visual y sombra de este calzado"
                              >
                                <div class="prop-btn-top">
                                  <span class="prop-btn-dims">${dimText}</span>
                                  <span class="prop-btn-tag">${fitText}</span>
                                </div>
                                <div class="prop-btn-sub-row">
                                  <span class="prop-btn-shadow ${shadowClass}">${shadowText}</span>
                                  <span class="prop-btn-sub">Ajustar opciones</span>
                                </div>
                              </button>
                            `;
            })()}
                        </td>

                        <!-- 5. EN CIRCULAR SHOWCASE -->
                        <td>
                          <label class="admin-switch-label" title="${!p.carouselImage ? 'Requiere subir primero un recurso .png' : 'Activar o desactivar en Circular Showcase'}">
                            <input 
                              type="checkbox" 
                              class="toggle-showcase-active" 
                              data-id="${p.id}" 
                              ${isActive ? 'checked' : ''} 
                              ${!p.carouselImage ? 'data-needs-png="true"' : ''}
                            />
                            <span class="switch-ui"></span>
                            <span class="showcase-status-label" style="font-size: 0.78rem; font-weight: 500; color: ${isActive ? '#0f172a' : '#64748b'};">
                              ${isActive ? 'Visible en portada' : 'Desactivado'}
                            </span>
                          </label>
                        </td>

                        <!-- 6. ACCIONES -->
                        <td style="text-align: right;">
                          <button 
                            type="button" 
                            class="btn-showcase-action btn-edit-from-showcase" 
                            data-id="${p.id}" 
                            title="Editar este calzado en el catálogo"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    `;
        }).join('')
      }
            </tbody>
          </table>
        </div>

        <!-- MODAL MINIMALISTA DE PROPORCIÓN INDIVIDUAL POR CALZADO -->
        <div class="showcase-prop-modal-backdrop is-hidden" id="modal-showcase-prop" role="dialog" aria-modal="true">
          <div class="showcase-prop-modal-card">
            <div class="showcase-prop-modal-header">
              <div class="modal-header-text">
                <span class="modal-header-badge">Control Visual y Proporciones</span>
                <h3 class="showcase-prop-modal-title" id="modal-prop-product-name">—</h3>
              </div>
              <button type="button" class="btn-close-prop-modal" id="btn-close-prop-modal" aria-label="Cerrar modal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div class="showcase-prop-modal-body">
              <!-- PREVIEW EN VIVO DE ESTE CALZADO -->
              <div class="modal-preview-section">
                <div class="modal-preview-checkerboard" id="modal-preview-box">
                  <img id="modal-preview-img" src="/assets/slide/slide.png" alt="Silueta calzado" />
                </div>
                <span class="modal-preview-label" id="modal-preview-dimensions-label">
                  Marco simulado: 290 × 119 px (Proporción 2.44:1 • Sin distorsión)
                </span>
              </div>

              <!-- OPCIONES DE PROPORCIÓN -->
              <div class="modal-prop-options-list">
                <!-- Opción 1: 836 x 342 -->
                <label class="modal-prop-option" for="modal-check-adjust-836">
                  <input type="checkbox" id="modal-check-adjust-836" checked />
                  <div class="modal-option-info">
                    <span class="modal-option-title">Ajustar a proporción 836 × 342 (Recomendada)</span>
                    <span class="modal-option-desc">Aplica la relación 836 : 342 (~2.44:1) nativa del calzado oficial de Blessed Slides.</span>
                  </div>
                </label>

                <!-- Opción 2: Sin distorsión -->
                <label class="modal-prop-option" for="modal-check-no-distortion">
                  <input type="checkbox" id="modal-check-no-distortion" checked />
                  <div class="modal-option-info">
                    <span class="modal-option-title">Mantener aspecto sin distorsionar (object-fit: contain)</span>
                    <span class="modal-option-desc">Preserva la silueta original para que no se deforme ni se estire.</span>
                  </div>
                </label>

                <!-- Opción 3: Proporción personalizada -->
                <label class="modal-prop-option" for="modal-check-custom-ratio">
                  <input type="checkbox" id="modal-check-custom-ratio" />
                  <div class="modal-option-info">
                    <span class="modal-option-title">Definir proporción personalizada</span>
                    <span class="modal-option-desc">Permite ingresar manualmente ancho y alto de referencia para este calzado.</span>
                  </div>
                </label>
              </div>

              <!-- INPUTS PERSONALIZADOS -->
              <div class="modal-custom-dims-row is-disabled" id="modal-custom-inputs-box">
                <div class="modal-dim-group">
                  <label for="modal-input-width">Ancho:</label>
                  <input type="number" id="modal-input-width" value="836" min="100" max="2000" step="1" disabled />
                  <span>px</span>
                </div>
                <div class="modal-dim-group">
                  <label for="modal-input-height">Alto:</label>
                  <input type="number" id="modal-input-height" value="342" min="50" max="1500" step="1" disabled />
                  <span>px</span>
                </div>
                <button type="button" class="btn-modal-reset-dims" id="btn-modal-reset-dims" disabled>
                  Restablecer a 836 × 342
                </button>
              </div>

              <!-- OPCIÓN DE SOMBRA CON RADIO BUTTONS (PREDETERMINADO ACTIVADO) -->
              <div class="modal-shadow-section">
                <div class="modal-shadow-section-header">
                  <span class="modal-shadow-section-title">Efecto de Sombra Inferior en Escaparate</span>
                  <span class="modal-shadow-section-sub">Permite quitarle la sombra a artículos específicos (por ejemplo aquellos que ya poseen sombra integrada o siluetas recortadas)</span>
                </div>
                <div class="modal-shadow-radios-grid">
                  <label class="modal-prop-option modal-radio-option" for="modal-radio-shadow-on">
                    <input type="radio" name="modal-choice-shadow" id="modal-radio-shadow-on" value="show" checked />
                    <div class="modal-option-info">
                      <span class="modal-option-title">Mostrar sombra <span class="badge-modal-default">Predeterminado</span></span>
                      <span class="modal-option-desc">Proyecta la sombra elíptica de suelo y el relieve 3D suave sobre el arco del escaparate.</span>
                    </div>
                  </label>

                  <label class="modal-prop-option modal-radio-option" for="modal-radio-shadow-off">
                    <input type="radio" name="modal-choice-shadow" id="modal-radio-shadow-off" value="hide" />
                    <div class="modal-option-info">
                      <span class="modal-option-title">No mostrar sombra</span>
                      <span class="modal-option-desc">Elimina completamente la sombra inferior y el drop-shadow para este artículo en el escaparate.</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div class="showcase-prop-modal-footer">
              <button type="button" class="btn-modal-secondary" id="btn-modal-cancel">Cancelar</button>
              <button type="button" class="btn-modal-primary" id="btn-modal-save-prop">Guardar Proporción</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // TAB: APARIENCIA HORSE SHOWCASE
  // ==========================================================================
  private renderHorseShowcaseTab(): string {
    const allProducts = this.products.length > 0 ? this.products : (this.store.products.length > 0 ? this.store.products : []);
    const orderedList = HorseShowcaseSettingsService.getOrderedProducts(allProducts);

    const totalCount = allProducts.length;
    const visibleCount = orderedList.filter((item) => item.isVisible).length;
    const hiddenCount = totalCount - visibleCount;

    // Filtrar por término de búsqueda si existe
    const filteredList = orderedList.filter(({ product }) => {
      if (!this.horseShowcaseSearchTerm) return true;
      const term = this.horseShowcaseSearchTerm.toLowerCase();
      return (
        product.name.toLowerCase().includes(term) ||
        (product.subtitle && product.subtitle.toLowerCase().includes(term)) ||
        (product.categoryName && product.categoryName.toLowerCase().includes(term))
      );
    });

    return `
      <div class="admin-view-panel">
        <div class="admin-view-header">
          <div class="admin-view-header-main">
            <h2 class="admin-view-title">Apariencia: Horse Showcase</h2>
            <p class="admin-view-subtitle">
              Controla qué pares de calzados se muestran en el escaparate Blessed Wild (Horse Showcase) y en qué orden aparecen automáticamente en la tienda.
            </p>
          </div>
        </div>

        <!-- TARJETAS DE MÉTRICAS -->
        <div class="admin-kpi-grid admin-metrics-grid">
          <div class="admin-kpi-card admin-metric-card">
            <span class="kpi-label metric-lbl">PARES VISIBLES EN HORSE SHOWCASE</span>
            <strong class="kpi-number metric-val text-emerald" id="horse-kpi-visible">${visibleCount} / ${totalCount}</strong>
          </div>
          <div class="admin-kpi-card admin-metric-card">
            <span class="kpi-label metric-lbl">PARES OCULTOS</span>
            <strong class="kpi-number metric-val" id="horse-kpi-hidden">${hiddenCount}</strong>
          </div>
          <div class="admin-kpi-card admin-metric-card">
            <span class="kpi-label metric-lbl">TOTAL EN CATÁLOGO</span>
            <strong class="kpi-number metric-val">${totalCount}</strong>
          </div>
        </div>

        <!-- BARRA DE BÚSQUEDA Y ACCIONES RÁPIDAS -->
        <div class="admin-filter-bar admin-table-toolbar" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div class="admin-search-input-wrap admin-search-wrap" style="flex: 1; min-width: 260px;">
            ${Icons.search('w-4 h-4')}
            <input 
              type="text" 
              class="admin-search-input" 
              id="horse-search-input" 
              placeholder="Buscar calzado por nombre o categoría..." 
              value="${this.horseShowcaseSearchTerm}" 
            />
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button type="button" class="btn-table-action" id="btn-horse-show-all" title="Hacer visibles todos los pares en Horse Showcase">
              Mostrar todos los pares
            </button>
            <button type="button" class="btn-table-action danger" id="btn-horse-hide-all" title="Ocultar todos los pares de Horse Showcase">
              Ocultar todos
            </button>
          </div>
        </div>

        <!-- TABLA DE GESTIÓN DE HORSE SHOWCASE -->
        <div class="admin-products-table-wrap admin-table-container">
          <table class="admin-table admin-data-table">
            <thead>
              <tr>
                <th style="width: 75px;">ORDEN</th>
                <th class="table-col-product" style="min-width: 280px;">PRODUCTO</th>
                <th style="width: 190px;">EN HORSE SHOWCASE</th>
                <th style="width: 90px; text-align: right;">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              ${filteredList.length === 0
        ? `
                  <tr>
                    <td colspan="4" class="admin-table-empty" style="text-align: center; padding: 36px 20px; color: #64748b;">
                      No se encontraron calzados coincidentes en el catálogo.
                    </td>
                  </tr>
                `
        : filteredList.map(({ product, isVisible, orderIndex }, idx) => {
          const thumbImg = product.image || product.colors?.[0]?.image || '/assets/slide/slide.png';
          const isFirst = idx === 0;
          const isLast = idx === filteredList.length - 1;

          return `
                      <tr class="${isVisible ? 'row-showcase-active' : ''}">
                        <!-- 1. ORDEN -->
                        <td>
                          <div class="showcase-order-cell">
                            <span class="showcase-order-num">#${orderIndex}</span>
                            <div class="showcase-order-arrows">
                              <button 
                                type="button" 
                                class="btn-order-arrow btn-horse-up" 
                                data-id="${product.id}" 
                                ${isFirst ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}
                                title="Mover arriba en el escaparate"
                              >▲</button>
                              <button 
                                type="button" 
                                class="btn-order-arrow btn-horse-down" 
                                data-id="${product.id}" 
                                ${isLast ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}
                                title="Mover abajo en el escaparate"
                              >▼</button>
                            </div>
                          </div>
                        </td>

                        <!-- 2. PRODUCTO -->
                        <td class="table-col-product">
                          <div class="table-prod-cell admin-prod-cell">
                            <img 
                              src="${thumbImg}" 
                              alt="${product.name}" 
                              class="table-prod-thumb admin-prod-thumb"
                              style="width: 48px; height: 48px; min-width: 48px; max-width: 48px; max-height: 48px; object-fit: contain; border-radius: 6px; background: #f8fafc; border: 1px solid #e2e8f0; flex-shrink: 0;"
                            />
                            <div class="table-prod-meta admin-prod-info">
                              <strong class="table-prod-name admin-prod-name">${product.name}</strong>
                              <span class="table-prod-sub admin-prod-sub">${product.subtitle || product.categoryName || 'Calzado oficial'}</span>
                              <div class="table-price-col">
                                <strong>$${Number(product.price).toFixed(2)}</strong>
                              </div>
                            </div>
                          </div>
                        </td>

                        <!-- 3. EN HORSE SHOWCASE (TOGGLE SWITCH) -->
                        <td>
                          <div style="display: flex; align-items: center; gap: 10px;">
                            <label class="admin-switch-label" title="${isVisible ? 'Ocultar de Horse Showcase' : 'Mostrar en Horse Showcase'}">
                              <input 
                                type="checkbox" 
                                class="toggle-horse-active" 
                                data-id="${product.id}" 
                                ${isVisible ? 'checked' : ''} 
                              />
                              <span class="switch-ui"></span>
                            </label>
                            <span class="showcase-status-label" style="color: ${isVisible ? '#059669' : '#94a3b8'}; font-weight: ${isVisible ? '600' : '400'};">
                              ${isVisible ? 'Visible en escaparate' : 'Oculto'}
                            </span>
                          </div>
                        </td>

                        <!-- 4. ACCIONES -->
                        <td style="text-align: right;">
                          <div class="table-actions-row">
                            <button 
                              type="button" 
                              class="btn-table-action btn-edit-from-horse" 
                              data-id="${product.id}"
                              title="Editar calzado en el catálogo"
                            >
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
        }).join('')
      }
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // TAB: APARIENCIA BARRA DE ANUNCIOS SUPERIOR (TOP-ANNOUNCEMENT-BAR)
  // ==========================================================================
  private renderAnnouncementsTab(): string {
    const announcements = AnnouncementSettingsService.getAnnouncements();
    const totalCount = announcements.length;
    const activeCount = announcements.filter((a) => a.isActive).length;
    const hiddenCount = totalCount - activeCount;
    const isEditing = Boolean(this.editingAnnouncement);

    // Marquee preview con los elementos activos
    const activeAnnouncements = announcements.filter((a) => a.isActive && a.text.trim());
    let marqueeItemsHtml = '';
    if (activeAnnouncements.length === 0) {
      marqueeItemsHtml = `
        <span class="marquee-item">✨ BLESSED SANDALS • CALZADO Y SANDALIAS EXCLUSIVAS</span>
        <span class="marquee-sep">•</span>
        <span class="marquee-item">✨ BLESSED SANDALS • CALZADO Y SANDALIAS EXCLUSIVAS</span>
        <span class="marquee-sep">•</span>
      `;
    } else {
      let baseList = [...activeAnnouncements];
      while (baseList.length < 4) {
        baseList = [...baseList, ...activeAnnouncements];
      }
      const fullList = [...baseList, ...baseList];
      marqueeItemsHtml = fullList
        .map((item) => `<span class="marquee-item">${item.text}</span><span class="marquee-sep">•</span>`)
        .join('');
    }

    return `
      <div class="admin-view-panel">
        <div class="admin-view-header">
          <div class="admin-view-header-main">
            <h2 class="admin-view-title">Apariencia: Barra de Anuncios Superior</h2>
            <p class="admin-view-subtitle">
              Administra los textos, promociones y mensajes que se muestran en movimiento continuo en la barra superior (top-announcement-bar) de la tienda.
            </p>
          </div>
        </div>

        <!-- TARJETAS DE MÉTRICAS -->
        <div class="admin-kpi-grid admin-metrics-grid">
          <div class="admin-kpi-card admin-metric-card">
            <span class="kpi-label metric-lbl">ANUNCIOS ACTIVOS EN BARRA</span>
            <strong class="kpi-number metric-val text-emerald">${activeCount} / ${totalCount}</strong>
          </div>
          <div class="admin-kpi-card admin-metric-card">
            <span class="kpi-label metric-lbl">MENSAJES OCULTOS</span>
            <strong class="kpi-number metric-val">${hiddenCount}</strong>
          </div>
          <div class="admin-kpi-card admin-metric-card">
            <span class="kpi-label metric-lbl">TOTAL REGISTRADOS</span>
            <strong class="kpi-number metric-val">${totalCount}</strong>
          </div>
          <div class="admin-kpi-card admin-metric-card">
            <span class="kpi-label metric-lbl">ESTADO DE ROTACIÓN</span>
            <strong class="kpi-number metric-val text-emerald" style="font-size: 1.05rem;">
              ${activeCount > 0 ? '● Bucle Activo (24s)' : '○ Pausado'}
            </strong>
          </div>
        </div>

        <!-- VISTA PREVIA EN VIVO DE LA BARRA -->
        <div class="admin-announcement-preview-card">
          <div class="announcement-preview-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="preview-badge-live">VISTA PREVIA EN VIVO</span>
              <span class="preview-hint">Visualización exacta de la barra superior en la tienda</span>
            </div>
            <span style="font-size: 0.72rem; color: #64748b; font-weight: 600;">Animación fluida continua</span>
          </div>
          <div class="top-announcement-bar announcement-preview-bar" aria-label="Vista previa de barra superior">
            <div class="announcement-marquee">
              <div class="marquee-track">
                ${marqueeItemsHtml}
              </div>
            </div>
          </div>
        </div>

        <!-- FORMULARIO: AGREGAR O EDITAR ANUNCIO -->
        <div class="admin-announcement-form-card">
          <div class="admin-section-header" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 class="admin-section-title" style="font-size: 1.05rem; font-weight: 800; color: #0f172a;">
                ${isEditing ? '✏️ Editar Anuncio Seleccionado' : '➕ Agregar Nuevo Mensaje a la Barra'}
              </h3>
              <p class="admin-section-desc" style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">
                ${isEditing ? 'Modifica el texto o activa/desactiva este anuncio en la marquesina.' : 'Escribe el texto que deseas mostrar en la barra superior. Puedes incluir emojis llamativos.'}
              </p>
            </div>
            ${isEditing ? `
              <button type="button" class="btn-table-action" id="btn-cancel-ann-edit">
                ✕ Cancelar edición
              </button>
            ` : ''}
          </div>

          <form id="form-announcement">
            <div class="admin-form-group">
              <div class="ann-emoji-helpers">
                <span class="emoji-helper-label">Atajos de emoji:</span>
                <button type="button" class="btn-emoji-tag" data-emoji="✨">✨ Brillo</button>
                <button type="button" class="btn-emoji-tag" data-emoji="🔥">🔥 Fuego</button>
                <button type="button" class="btn-emoji-tag" data-emoji="⚡">⚡ Rayo</button>
                <button type="button" class="btn-emoji-tag" data-emoji="🏷️">🏷️ Oferta</button>
                <button type="button" class="btn-emoji-tag" data-emoji="🚚">🚚 Envío</button>
                <button type="button" class="btn-emoji-tag" data-emoji="👟">👟 Calzado</button>
                <button type="button" class="btn-emoji-tag" data-emoji="🎁">🎁 Regalo</button>
                <button type="button" class="btn-emoji-tag" data-emoji="💥">💥 Descuento</button>
              </div>

              <textarea 
                id="input-ann-text" 
                class="admin-textarea" 
                rows="2" 
                placeholder="Ejemplo: ✨ ENVÍO GRATIS EN PEDIDOS SUPERIORES A $50 • DEVOLUCIONES GRATUITAS EN 30 DÍAS" 
                required
                style="font-size: 0.85rem; font-weight: 600; letter-spacing: 0.04em;"
              >${isEditing ? this.editingAnnouncement!.text : ''}</textarea>
            </div>

            <div class="ann-form-actions-row">
              <label class="admin-switch-label" style="cursor: pointer; user-select: none;">
                <input 
                  type="checkbox" 
                  id="check-ann-active" 
                  ${isEditing ? (this.editingAnnouncement!.isActive ? 'checked' : '') : 'checked'} 
                />
                <span class="switch-ui"></span>
                <span style="font-size: 0.85rem; font-weight: 600; color: #0f172a;">
                  Mostrar de inmediato en la barra superior
                </span>
              </label>

              <div style="display: flex; gap: 8px;">
                ${isEditing ? `
                  <button type="button" class="btn-admin-cancel" id="btn-cancel-ann-bottom">
                    Cancelar
                  </button>
                ` : ''}
                <button type="submit" class="btn-admin-submit" id="btn-save-ann">
                  ${isEditing ? 'Guardar Cambios' : '+ Agregar Anuncio a la Barra'}
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- LISTA Y TABLA DE ANUNCIOS -->
        <div class="showcase-catalog-section-header" style="margin-top: 26px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 class="showcase-section-title">Anuncios en el Sistema (${totalCount})</h3>
            <p class="showcase-section-desc">
              Usa las flechas para reordenar la secuencia de rotación o el interruptor para ocultar y mostrar anuncios.
            </p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn-table-action" id="btn-ann-enable-all" title="Activar todos los mensajes">
              Mostrar todos
            </button>
            <button type="button" class="btn-table-action" id="btn-ann-disable-all" title="Ocultar todos los mensajes">
              Ocultar todos
            </button>
            <button type="button" class="btn-table-action danger" id="btn-ann-reset-defaults" title="Restablecer los 3 anuncios originales">
              Restablecer originales
            </button>
          </div>
        </div>

        <div class="admin-products-table-wrap admin-table-container">
          <table class="admin-table admin-data-table">
            <thead>
              <tr>
                <th style="width: 75px;">ORDEN</th>
                <th>TEXTO DEL ANUNCIO</th>
                <th style="width: 170px;">EN BARRA SUPERIOR</th>
                <th style="width: 140px; text-align: right;">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              ${announcements.length === 0
                ? `
                  <tr>
                    <td colspan="4" class="admin-table-empty" style="text-align: center; padding: 36px 20px; color: #64748b;">
                      No hay anuncios registrados. Agrega uno con el formulario superior o haz clic en "Restablecer originales".
                    </td>
                  </tr>
                `
                : announcements.map((a, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === announcements.length - 1;
                  return `
                    <tr class="${a.isActive ? 'row-showcase-active' : ''}">
                      <!-- 1. ORDEN -->
                      <td>
                        <div class="showcase-order-cell">
                          <span class="showcase-order-num">#${idx + 1}</span>
                          <div class="showcase-order-arrows">
                            <button 
                              type="button" 
                              class="btn-order-arrow btn-ann-up" 
                              data-id="${a.id}" 
                              ${isFirst ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}
                              title="Mover antes en la rotación"
                            >▲</button>
                            <button 
                              type="button" 
                              class="btn-order-arrow btn-ann-down" 
                              data-id="${a.id}" 
                              ${isLast ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}
                              title="Mover después en la rotación"
                            >▼</button>
                          </div>
                        </div>
                      </td>

                      <!-- 2. TEXTO -->
                      <td>
                        <div class="ann-text-preview ${!a.isActive ? 'is-inactive' : ''}">
                          ${a.text}
                        </div>
                      </td>

                      <!-- 3. INTERRUPTOR ACTIVO/OCULTO -->
                      <td>
                        <label class="admin-switch-label" title="${a.isActive ? 'Ocultar de la barra' : 'Mostrar en la barra'}">
                          <input 
                            type="checkbox" 
                            class="toggle-ann-active" 
                            data-id="${a.id}" 
                            ${a.isActive ? 'checked' : ''} 
                          />
                          <span class="switch-ui"></span>
                          <span class="showcase-status-label" style="font-size: 0.78rem; font-weight: 500; color: ${a.isActive ? '#0f172a' : '#64748b'};">
                            ${a.isActive ? 'Visible en barra' : 'Oculto'}
                          </span>
                        </label>
                      </td>

                      <!-- 4. ACCIONES -->
                      <td style="text-align: right;">
                        <div class="table-actions-row">
                          <button 
                            type="button" 
                            class="btn-table-action btn-edit-ann" 
                            data-id="${a.id}"
                            title="Editar texto del anuncio"
                          >
                            Editar
                          </button>
                          <button 
                            type="button" 
                            class="btn-table-action danger btn-delete-ann" 
                            data-id="${a.id}"
                            title="Eliminar este anuncio"
                          >
                            Quitar
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // CONFIGURACIÓN DE EVENTOS GENERALES Y POR TAB
  // ==========================================================================
  private setupEvents(): void {
    // Volver a la tienda
    this.container.querySelector('#btn-admin-back-store')?.addEventListener('click', () => {
      this.closeView();
    });

    // Cerrar sesión
    this.container.querySelector('#btn-admin-logout')?.addEventListener('click', () => {
      this.store.logout();
      this.closeView();
      Toast.show('Sesión cerrada correctamente.');
    });

    // Navegación por tabs en el sidebar
    this.container.querySelectorAll('.admin-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).dataset.tab as AdminTab;
        if (tab) {
          if (tab === 'products-create' && this.activeTab !== 'products-create') {
            this.editingProduct = null;
            this.initFormSizes();
          }
          if (tab === 'promos-create' && this.activeTab !== 'promos-create') {
            this.editingPromo = null;
          }
          if (tab === 'promos-store-create' && this.activeTab !== 'promos-store-create') {
            if (!this.editingPromo || this.editingPromo.discountType !== 'HIDDEN_STORE') {
              this.editingPromo = null;
              this.promoStoreItems = [];
            }
          }
          if (tab === 'stripe-test-cards') {
            this.activeTab = tab;
            this.loadAdminCardsData().then(() => this.updateMainContentOnly());
            return;
          }
          this.activeTab = tab;
          this.updateMainContentOnly();
        }
      });
    });

    this.setupTabInnerEvents();
  }

  private updateMainContentOnly(): void {
    // Actualizar clase activa en el sidebar
    this.container.querySelectorAll('.admin-tab-btn').forEach((btn) => {
      const tab = (btn as HTMLElement).dataset.tab;
      btn.classList.toggle('active', tab === this.activeTab);
    });

    const main = this.container.querySelector('#admin-main-viewport');
    if (main) {
      main.innerHTML = this.renderActiveTabContent();
      this.setupTabInnerEvents();
    }
  }

  private setupTabInnerEvents(): void {
    const userId = this.store.currentUser?.id;
    if (!userId) return;

    // Si estamos en la pestaña de crear/editar producto, enlazar eventos de tallas y recursos
    if (this.activeTab === 'products-create') {
      this.bindVariantsBarEvents();
      this.setupSizesSectionEvents();
      this.bindGalleryEvents();
      this.bind3dStatusEvents();
      this.bindCarouselResourceEvents();
    }

    // Si estamos en la pestaña de Crear/Editar Código Tienda Promo
    if (this.activeTab === 'promos-store-create') {
      this.setupPromoStoreFormEvents();
    }

    // Si estamos en la pestaña de Circular Showcase
    if (this.activeTab === 'circular-showcase') {
      this.setupCircularShowcaseEvents();
    }

    // Si estamos en la pestaña de Horse Showcase
    if (this.activeTab === 'horse-showcase') {
      this.setupHorseShowcaseEvents();
    }

    // Si estamos en la pestaña de Barra de Anuncios
    if (this.activeTab === 'announcements') {
      this.setupAnnouncementsEvents();
    }

    // Si estamos en la pestaña de Tarjetas de Prueba Stripe
    if (this.activeTab === 'stripe-test-cards') {
      this.setupStripeTestCardsEvents();
    }

    // --- TAB 1: PRODUCTOS LIST ---
    this.container.querySelector('#btn-refresh-admin-products')?.addEventListener('click', async () => {
      const userId = this.store.currentUser?.id;
      if (!userId) return;
      const prodRes = await ApiService.getAdminProducts(userId);
      if (prodRes.success && prodRes.products) {
        this.products = prodRes.products;
        this.updateMainContentOnly();
        Toast.show('Inventario de existencias actualizado.', 'Inventario', 'info');
      }
    });

    this.container.querySelector('#btn-admin-goto-create-prod')?.addEventListener('click', () => {
      this.editingProduct = null;
      this.initFormSizes();
      this.activeTab = 'products-create';
      this.updateMainContentOnly();
    });

    const searchInput = this.container.querySelector('#admin-product-search') as HTMLInputElement | null;
    searchInput?.addEventListener('input', () => {
      this.productSearchTerm = searchInput.value;
      this.updateMainContentOnly();
    });

    const catFilter = this.container.querySelector('#admin-category-filter') as HTMLSelectElement | null;
    catFilter?.addEventListener('change', () => {
      this.productCategoryFilter = catFilter.value;
      this.updateMainContentOnly();
    });

    // Toggle stock rápido
    this.container.querySelectorAll('[data-action="toggle-stock"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const pId = (btn as HTMLElement).dataset.id;
        const current = (btn as HTMLElement).dataset.current === 'true';
        if (!pId) return;

        const res = await ApiService.updateAdminStock(userId, { id: pId, inStock: !current });
        if (res.success) {
          Toast.show(`Stock de producto actualizado.`);
          await this.loadInitialData();
          this.store.loadProducts();
          this.updateMainContentOnly();
        } else {
          Toast.show(res.message || 'Error al actualizar stock.', 'Atención', 'warning');
        }
      });
    });

    // Editar producto
    this.container.querySelectorAll('[data-action="edit-product"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pId = (btn as HTMLElement).dataset.id;
        const prod = this.products.find((x) => x.id === pId);
        if (prod) {
          this.editingProduct = prod;
          this.initFormSizes();
          this.activeTab = 'products-create';
          this.updateMainContentOnly();
        }
      });
    });

    // Eliminar producto
    this.container.querySelectorAll('[data-action="delete-product"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pId = (btn as HTMLElement).dataset.id;
        if (!pId) return;

        if (confirm('¿Estás seguro de que deseas eliminar este producto del catálogo? Esta acción no se puede deshacer.')) {
          const res = await ApiService.deleteAdminProduct(userId, pId);
          if (res.success) {
            Toast.show('Producto eliminado del catálogo.', 'Inventario', 'success');
            await this.loadInitialData();
            this.store.loadProducts();
            this.updateMainContentOnly();
          } else {
            Toast.show(res.message || 'Error al eliminar producto.', 'Atención', 'warning');
          }
        }
      });
    });

    // --- TAB 2: PRODUCTO FORM ---
    this.container.querySelector('#btn-cancel-edit-prod')?.addEventListener('click', () => {
      this.editingProduct = null;
      this.formSizes = [];
      this.formGallery = [];
      this.formModel3dUrl = null;
      this.formCarouselImage = null;
      this.formVariants = [];
      this.activeVariantIndex = 0;
      this.activeTab = 'products-list';
      this.updateMainContentOnly();
    });

    this.container.querySelector('#btn-cancel-prod-form')?.addEventListener('click', () => {
      this.editingProduct = null;
      this.formSizes = [];
      this.formGallery = [];
      this.formModel3dUrl = null;
      this.formCarouselImage = null;
      this.formVariants = [];
      this.activeVariantIndex = 0;
      this.activeTab = 'products-list';
      this.updateMainContentOnly();
    });

    // Subida múltiple de imágenes a MinIO desde el formulario
    const galleryInput = this.container.querySelector('#file-hidden-gallery') as HTMLInputElement | null;
    this.container.querySelector('#btn-trigger-upload-gallery')?.addEventListener('click', () => {
      galleryInput?.click();
    });

    galleryInput?.addEventListener('change', async () => {
      const files = galleryInput.files;
      if (!files || files.length === 0) return;

      Toast.show(`Subiendo ${files.length} imagen(es) a MinIO...`, 'MinIO Storage', 'info');
      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const uploadRes = await ApiService.uploadAssetToMinio(userId, {
            filename: file.name,
            contentType: file.type || 'image/png',
            base64
          });

          if (uploadRes.success && uploadRes.url) {
            this.formGallery.push(uploadRes.url);
            successCount++;
          }
        } catch (e) {
          console.error('Error subiendo archivo', file.name, e);
        }
      }

      galleryInput.value = '';
      if (this.formVariants[this.activeVariantIndex]) {
        this.formVariants[this.activeVariantIndex].gallery = [...this.formGallery];
      }
      this.refreshGalleryOnly();

      if (successCount > 0) {
        Toast.show(`¡${successCount} imagen(es) subida(s) con éxito a MinIO!`, 'MinIO', 'success');
      } else {
        Toast.show('No se pudieron subir las imágenes a MinIO.', 'MinIO', 'warning');
      }
    });

    // Subida de modelo 3D a MinIO desde el formulario
    const modelFile = this.container.querySelector('#file-hidden-3d') as HTMLInputElement | null;
    this.container.querySelector('#btn-trigger-upload-3d')?.addEventListener('click', () => {
      modelFile?.click();
    });

    modelFile?.addEventListener('change', async () => {
      const file = modelFile.files?.[0];
      if (!file) return;

      Toast.show('Subiendo modelo 3D (.GLB) a MinIO...', 'MinIO Storage', 'info');
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const uploadRes = await ApiService.uploadAssetToMinio(userId, {
          filename: file.name,
          contentType: 'model/gltf-binary',
          base64
        });

        if (uploadRes.success && uploadRes.url) {
          Toast.show('¡Modelo 3D subido a MinIO con éxito!', 'MinIO', 'success');
          this.formModel3dUrl = uploadRes.url;
          if (this.formVariants[this.activeVariantIndex]) {
            this.formVariants[this.activeVariantIndex].model3dUrl = uploadRes.url;
          }
          this.refresh3dStatusOnly();
        } else {
          Toast.show(uploadRes.message || 'Error al subir modelo a MinIO.', 'Error', 'warning');
        }
      };
      reader.readAsDataURL(file);
      modelFile.value = '';
    });

    // Subida de imagen carrusel (.PNG) a MinIO desde el formulario
    const carouselInput = this.container.querySelector('#file-hidden-carousel') as HTMLInputElement | null;
    this.container.querySelector('#btn-trigger-upload-carousel')?.addEventListener('click', () => {
      carouselInput?.click();
    });

    carouselInput?.addEventListener('change', async () => {
      const file = carouselInput.files?.[0];
      if (!file) return;

      if (!file.type.includes('png') && !file.name.toLowerCase().endsWith('.png')) {
        Toast.show('El recurso de carrusel debe ser una imagen en formato .png (sin fondo).', 'Formato no admitido', 'warning');
        carouselInput.value = '';
        return;
      }

      Toast.show('Subiendo recurso carrusel (.PNG) a MinIO...', 'MinIO Storage', 'info');
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const uploadRes = await ApiService.uploadAssetToMinio(userId, {
          filename: `carousel-${Date.now()}-${file.name.replace(/\s+/g, '_')}`,
          contentType: 'image/png',
          base64
        });

        if (uploadRes.success && uploadRes.url) {
          this.formCarouselImage = uploadRes.url;
          this.refreshCarouselStatusOnly();
          Toast.show('Recurso carrusel (.PNG) asignado correctamente.', 'Circular Showcase', 'success');
        } else {
          Toast.show(uploadRes.message || 'Error al subir carrusel a MinIO.', 'MinIO', 'warning');
        }
      } catch (err) {
        console.error(err);
        Toast.show('Error al procesar el archivo .png.', 'Error', 'warning');
      } finally {
        carouselInput.value = '';
      }
    });

    // Sincronización en vivo de precios por variante de color
    const priceLiveInput = this.container.querySelector('#prod-price') as HTMLInputElement | null;
    priceLiveInput?.addEventListener('input', () => {
      const v = this.formVariants[this.activeVariantIndex];
      if (v) {
        v.price = priceLiveInput.value.trim() !== '' ? parseFloat(priceLiveInput.value) : undefined;
      }
    });

    const origPriceLiveInput = this.container.querySelector('#prod-orig-price') as HTMLInputElement | null;
    origPriceLiveInput?.addEventListener('input', () => {
      const v = this.formVariants[this.activeVariantIndex];
      if (v) {
        v.originalPrice = origPriceLiveInput.value.trim() !== '' ? parseFloat(origPriceLiveInput.value) : null;
      }
    });

    // Submit del formulario de producto
    const prodForm = this.container.querySelector('#form-admin-product');
    prodForm?.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Guardar los datos de la variante activa actual
      this.saveActiveVariantFromForm();

      // Verificar que haya al menos una imagen en alguna variante
      const primaryVariantWithImg = this.formVariants[0]?.gallery?.length > 0
        ? this.formVariants[0]
        : (this.formVariants.find((v) => v.gallery && v.gallery.length > 0) || this.formVariants[0]);

      if (!primaryVariantWithImg || primaryVariantWithImg.gallery.length === 0) {
        Toast.show('Por favor sube al menos una imagen para el producto (portada).', 'Imagen Requerida', 'warning');
        return;
      }

      const name = (this.container.querySelector('#prod-name') as HTMLInputElement)?.value.trim();
      const subtitle = (this.container.querySelector('#prod-subtitle') as HTMLInputElement)?.value.trim();
      const categoryId = (this.container.querySelector('#prod-category') as HTMLSelectElement)?.value;
      const gender = (this.container.querySelector('#prod-gender') as HTMLSelectElement)?.value;
      const badge = (this.container.querySelector('#prod-badge') as HTMLInputElement)?.value.trim() || null;
      const description = (this.container.querySelector('#prod-desc') as HTMLTextAreaElement)?.value.trim() || null;

      const formPrice = Number((this.container.querySelector('#prod-price') as HTMLInputElement)?.value);
      const origPriceInput = (this.container.querySelector('#prod-orig-price') as HTMLInputElement)?.value;
      const formOrigPrice = origPriceInput ? Number(origPriceInput) : null;

      const inStock = (this.container.querySelector('#prod-instock') as HTMLInputElement)?.checked ?? true;
      const featured = (this.container.querySelector('#prod-featured') as HTMLInputElement)?.checked ?? false;

      // Imagen y galería principal de la variante 1 (sin mezclar fotos de otras variantes)
      const image = primaryVariantWithImg.gallery[0];
      const gallery = [...primaryVariantWithImg.gallery];

      // Modelo 3D
      const model3dUrl = this.formVariants.find((v) => Boolean(v.model3dUrl))?.model3dUrl || null;

      // Variantes de color: CADA VARIANTE GUARDA SU PROPIA GALERÍA, PRECIO Y TALLAS AISLADAS
      const colors = this.formVariants.map((v, i) => ({
        name: v.name || `Color ${i + 1}`,
        hex: v.hex,
        image: v.gallery.length > 0 ? v.gallery[0] : image,
        gallery: [...v.gallery],
        price: v.price !== undefined ? v.price : formPrice,
        originalPrice: v.originalPrice !== undefined ? v.originalPrice : formOrigPrice,
        sizes: v.sizes.map((s) => ({ size: Number(s.size), stock: Number(s.stock) || 0 }))
      }));

      // Existencias combinadas por talla: se suma completo el stock de todas las variantes
      const sizesMap = new Map<number, number>();
      this.formVariants.forEach((v) => {
        v.sizes.forEach((s) => {
          const prev = sizesMap.get(s.size) || 0;
          sizesMap.set(s.size, prev + Math.max(0, s.stock));
        });
      });
      const sizes = Array.from(sizesMap.entries())
        .map(([size, stock]) => ({ size, stock }))
        .sort((a, b) => a.size - b.size);

      // Precios primarios del producto
      const primaryPrice = this.formVariants[0]?.price ?? formPrice;
      const primaryOrigPrice = this.formVariants[0]?.originalPrice !== undefined ? this.formVariants[0].originalPrice : formOrigPrice;

      const submitBtn = this.container.querySelector('#btn-save-product') as HTMLButtonElement | null;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando en Base de Datos...';
      }

      try {
        if (this.editingProduct) {
          // Actualización
          const res = await ApiService.updateAdminProduct(userId, {
            id: this.editingProduct.id,
            name,
            subtitle,
            categoryId,
            gender,
            badge,
            description,
            price: primaryPrice,
            originalPrice: primaryOrigPrice,
            image,
            gallery,
            model3dUrl,
            carouselImage: this.formCarouselImage,
            inStock,
            featured,
            sizes,
            colors
          });

          if (res.success) {
            Toast.show('Producto actualizado correctamente.', 'Inventario', 'success');
            this.editingProduct = null;
            this.formSizes = [];
            this.formGallery = [];
            this.formModel3dUrl = null;
            this.formCarouselImage = null;
            this.formVariants = [];
            this.activeVariantIndex = 0;
            await this.loadInitialData();
            this.store.loadProducts();
            this.activeTab = 'products-list';
            this.updateMainContentOnly();
          } else {
            Toast.show(res.message || 'Error al actualizar producto.', 'Atención', 'warning');
          }
        } else {
          // Creación
          const res = await ApiService.createAdminProduct(userId, {
            name,
            subtitle,
            categoryId,
            gender,
            badge,
            description,
            price: primaryPrice,
            originalPrice: primaryOrigPrice,
            image,
            gallery,
            model3dUrl,
            carouselImage: this.formCarouselImage,
            inStock,
            featured,
            sizes,
            colors
          });

          if (res.success) {
            Toast.show('¡Producto creado y publicado en la tienda!', 'Inventario', 'success');
            this.editingProduct = null;
            this.formSizes = [];
            this.formGallery = [];
            this.formModel3dUrl = null;
            this.formCarouselImage = null;
            this.formVariants = [];
            this.activeVariantIndex = 0;
            await this.loadInitialData();
            this.store.loadProducts();
            this.activeTab = 'products-list';
            this.updateMainContentOnly();
          } else {
            Toast.show(res.message || 'Error al crear producto.', 'Atención', 'warning');
          }
        }
      } catch (err) {
        console.error('Error al guardar producto:', err);
        Toast.show('Ocurrió un error al guardar.', 'Error', 'warning');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = this.editingProduct ? 'Actualizar Producto' : 'Guardar y Publicar Producto';
        }
      }
    });

    // --- TAB 3: PROMOS LIST ---
    this.container.querySelector('#btn-admin-goto-create-promo')?.addEventListener('click', () => {
      this.editingPromo = null;
      this.activeTab = 'promos-create';
      this.updateMainContentOnly();
    });

    this.container.querySelector('#btn-admin-goto-create-store-promo')?.addEventListener('click', () => {
      this.editingPromo = null;
      this.promoStoreItems = [];
      this.activeTab = 'promos-store-create';
      this.updateMainContentOnly();
    });

    // Control de Política de Tienda: No mezclar cupones con artículos promocionales
    this.container.querySelector('#toggle-block-promo-stacking')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.store.setBlockPromoStacking(checked);
      Toast.show(
        checked
          ? 'Regla activada: no se pueden mezclar cupones con artículos promocionales.'
          : 'Regla desactivada: se permite mezclar cupones con artículos promocionales.',
        'Configuración de Tienda',
        checked ? 'success' : 'info'
      );
      const label = this.container.querySelector('#label-block-promo-stacking');
      if (label) {
        label.textContent = checked ? 'Restricción Activa' : 'Permitir Mezcla';
        (label as HTMLElement).style.color = checked ? '#0f172a' : '#64748b';
      }
    });

    // Toggle estado de cupón
    this.container.querySelectorAll('[data-action="toggle-promo"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const pId = (btn as HTMLElement).dataset.id;
        const current = (btn as HTMLElement).dataset.current === 'true';
        if (!pId) return;

        const res = await ApiService.toggleAdminPromo(userId, pId, !current);
        if (res.success) {
          Toast.show(`Cupón ${!current ? 'activado' : 'desactivado'}.`);
          await this.loadInitialData();
          this.store.loadPromos();
          this.updateMainContentOnly();
        } else {
          Toast.show(res.message || 'Error al cambiar estado.', 'Atención', 'warning');
        }
      });
    });

    // Editar promo
    this.container.querySelectorAll('[data-action="edit-promo"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pId = (btn as HTMLElement).dataset.id;
        const promo = this.promos.find((x) => x.id === pId);
        if (promo) {
          this.editingPromo = promo;
          if (promo.discountType === 'HIDDEN_STORE') {
            this.promoStoreItems = Array.isArray(promo.storeItems) ? JSON.parse(JSON.stringify(promo.storeItems)) : [];
            this.activeTab = 'promos-store-create';
          } else {
            this.activeTab = 'promos-create';
          }
          this.updateMainContentOnly();
        }
      });
    });

    // Eliminar promo
    this.container.querySelectorAll('[data-action="delete-promo"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pId = (btn as HTMLElement).dataset.id;
        if (!pId) return;

        if (confirm('¿Deseas eliminar este código promocional? Los usuarios ya no podrán redimirlo.')) {
          const res = await ApiService.deleteAdminPromo(userId, pId);
          if (res.success) {
            Toast.show('Código promocional eliminado.');
            await this.loadInitialData();
            this.store.loadPromos();
            this.updateMainContentOnly();
          } else {
            Toast.show(res.message || 'Error al eliminar cupón.', 'Atención', 'warning');
          }
        }
      });
    });

    // --- TAB 4: PROMO FORM ---
    this.container.querySelector('#btn-cancel-edit-promo')?.addEventListener('click', () => {
      this.editingPromo = null;
      this.activeTab = 'promos-list';
      this.updateMainContentOnly();
    });

    this.container.querySelector('#btn-cancel-promo-form')?.addEventListener('click', () => {
      this.editingPromo = null;
      this.activeTab = 'promos-list';
      this.updateMainContentOnly();
    });

    const promoForm = this.container.querySelector('#form-admin-promo');
    promoForm?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const code = (this.container.querySelector('#promo-code') as HTMLInputElement)?.value.trim().toUpperCase();
      const discountType = (this.container.querySelector('#promo-type') as HTMLSelectElement)?.value as 'PERCENTAGE' | 'FIXED';
      const discountValue = Number((this.container.querySelector('#promo-val') as HTMLInputElement)?.value);
      const minPurchase = Number((this.container.querySelector('#promo-min') as HTMLInputElement)?.value) || 0;
      const description = (this.container.querySelector('#promo-desc') as HTMLTextAreaElement)?.value.trim();
      const onePerUser = (this.container.querySelector('#promo-oneperuser') as HTMLInputElement)?.checked ?? true;
      const isWelcomeOnly = (this.container.querySelector('#promo-iswelcome') as HTMLInputElement)?.checked ?? false;
      const isActive = (this.container.querySelector('#promo-isactive') as HTMLInputElement)?.checked ?? true;

      const submitBtn = this.container.querySelector('#btn-save-promo') as HTMLButtonElement | null;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';
      }

      try {
        if (this.editingPromo) {
          const res = await ApiService.updateAdminPromo(userId, {
            id: this.editingPromo.id,
            description,
            discountType,
            discountValue,
            minPurchase,
            onePerUser,
            isWelcomeOnly,
            isActive
          });

          if (res.success) {
            Toast.show('Código promocional actualizado.', 'Promociones', 'success');
            this.editingPromo = null;
            await this.loadInitialData();
            this.store.loadPromos();
            this.activeTab = 'promos-list';
            this.updateMainContentOnly();
          } else {
            Toast.show(res.message || 'Error al actualizar cupón.', 'Atención', 'warning');
          }
        } else {
          const res = await ApiService.createAdminPromo(userId, {
            code,
            description,
            discountType,
            discountValue,
            minPurchase,
            onePerUser,
            isWelcomeOnly,
            isActive
          });

          if (res.success) {
            Toast.show(`¡Código ${code} creado exitosamente!`, 'Promociones', 'success');
            await this.loadInitialData();
            this.store.loadPromos();
            this.activeTab = 'promos-list';
            this.updateMainContentOnly();
          } else {
            Toast.show(res.message || 'Error al crear código.', 'Atención', 'warning');
          }
        }
      } catch (err) {
        console.error('Error al guardar cupón:', err);
        Toast.show('Ocurrió un error al procesar el cupón.', 'Error', 'warning');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = this.editingPromo ? 'Actualizar Cupón' : 'Crear y Habilitar Cupón';
        }
      }
    });

    // --- TAB 5: MINIO STORAGE ---
    const dropzone = this.container.querySelector('#admin-upload-dropzone');
    const minioFileInput = this.container.querySelector('#input-minio-file') as HTMLInputElement | null;
    const btnSelectFile = this.container.querySelector('#btn-select-minio-file');

    btnSelectFile?.addEventListener('click', () => minioFileInput?.click());

    const handleUpload = (file: File) => {
      const progressBox = this.container.querySelector('#upload-progress-box');
      progressBox?.classList.remove('is-hidden');

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const uploadRes = await ApiService.uploadAssetToMinio(userId, {
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          base64
        });

        progressBox?.classList.add('is-hidden');

        if (uploadRes.success && uploadRes.url) {
          Toast.show(`¡"${file.name}" subido a MinIO!`, 'MinIO Storage', 'success');
          // Recargar lista de MinIO
          const assetsRes = await ApiService.getMinioAssets(userId);
          if (assetsRes.success && assetsRes.assets) {
            this.assets = assetsRes.assets;
          }
          this.updateMainContentOnly();
        } else {
          Toast.show(uploadRes.message || 'Error al subir a MinIO.', 'MinIO', 'warning');
        }
      };
      reader.readAsDataURL(file);
    };

    minioFileInput?.addEventListener('change', () => {
      const file = minioFileInput.files?.[0];
      if (file) handleUpload(file);
    });

    // Drag and Drop
    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    });

    dropzone?.addEventListener('dragleave', () => {
      dropzone.classList.remove('is-dragover');
    });

    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
      const dragEvent = e as DragEvent;
      const file = dragEvent.dataTransfer?.files?.[0];
      if (file) handleUpload(file);
    });

    // Actualizar lista de MinIO
    this.container.querySelector('#btn-refresh-minio-assets')?.addEventListener('click', async () => {
      Toast.show('Consultando MinIO...');
      const assetsRes = await ApiService.getMinioAssets(userId);
      if (assetsRes.success && assetsRes.assets) {
        this.assets = assetsRes.assets;
        this.updateMainContentOnly();
      }
    });

    this.container.querySelector('#btn-load-minio-list')?.addEventListener('click', async () => {
      const assetsRes = await ApiService.getMinioAssets(userId);
      if (assetsRes.success && assetsRes.assets) {
        this.assets = assetsRes.assets;
        this.updateMainContentOnly();
      }
    });

    // Copiar URL de recurso
    this.container.querySelectorAll('[data-action="copy-url"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const url = (btn as HTMLElement).dataset.url;
        if (url) {
          navigator.clipboard.writeText(url);
          Toast.show('URL copiada al portapapeles.');
          const orig = btn.textContent;
          btn.textContent = '¡Copiado!';
          setTimeout(() => (btn.textContent = orig), 2000);
        }
      });
    });

    // Eliminar recurso de MinIO
    this.container.querySelectorAll('[data-action="delete-asset"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const key = (btn as HTMLElement).dataset.key;
        if (!key) return;

        if (confirm(`¿Eliminar "${key}" de MinIO?`)) {
          const res = await ApiService.deleteMinioAsset(userId, key);
          if (res.success) {
            Toast.show('Recurso eliminado de MinIO.');
            this.assets = this.assets.filter((a) => a.key !== key);
            this.updateMainContentOnly();
          } else {
            Toast.show(res.message || 'Error al eliminar recurso.', 'MinIO', 'warning');
          }
        }
      });
    });
  }

  // ==========================================================================
  // EVENTOS: TAB APARIENCIA CIRCULAR SHOWCASE
  // ==========================================================================
  private setupCircularShowcaseEvents(): void {
    const userId = this.store.currentUser?.id;
    if (!userId) return;

    // 1. Buscador en vivo
    const searchInput = this.container.querySelector('#showcase-search-input') as HTMLInputElement | null;
    searchInput?.addEventListener('input', () => {
      this.showcaseSearchTerm = searchInput.value;
      const main = this.container.querySelector('#admin-main-viewport');
      if (main) {
        main.innerHTML = this.renderCircularShowcaseTab();
        this.setupCircularShowcaseEvents();
      }
    });

    // 2. Acordeón Desplegable de Calzados de Ejemplo
    const accordionBtn = this.container.querySelector('#btn-toggle-demos-accordion');
    accordionBtn?.addEventListener('click', () => {
      this.demosAccordionOpen = !this.demosAccordionOpen;
      const accordion = this.container.querySelector('.showcase-demos-accordion');
      const body = this.container.querySelector('#demos-accordion-body') as HTMLElement | null;
      const hint = this.container.querySelector('#demos-accordion-hint-text');
      if (accordion) {
        accordion.classList.toggle('is-open', this.demosAccordionOpen);
        accordion.classList.toggle('is-collapsed', !this.demosAccordionOpen);
      }
      if (body) {
        body.style.display = this.demosAccordionOpen ? 'block' : 'none';
      }
      if (hint) {
        hint.textContent = this.demosAccordionOpen ? 'Plegar lista' : 'Desplegar para gestionar';
      }
      accordionBtn.setAttribute('aria-expanded', String(this.demosAccordionOpen));
    });

    // 2.1 Modal de Proporción Individual (836 × 342) por Producto
    const modal = this.container.querySelector('#modal-showcase-prop') as HTMLElement | null;
    const modalProductName = this.container.querySelector('#modal-prop-product-name');
    const modalImg = this.container.querySelector('#modal-preview-img') as HTMLImageElement | null;
    const modalBox = this.container.querySelector('#modal-preview-box') as HTMLElement | null;
    const modalLabel = this.container.querySelector('#modal-preview-dimensions-label');
    const chk836 = this.container.querySelector('#modal-check-adjust-836') as HTMLInputElement | null;
    const chkNoDist = this.container.querySelector('#modal-check-no-distortion') as HTMLInputElement | null;
    const chkCustom = this.container.querySelector('#modal-check-custom-ratio') as HTMLInputElement | null;
    const customBox = this.container.querySelector('#modal-custom-inputs-box');
    const inpW = this.container.querySelector('#modal-input-width') as HTMLInputElement | null;
    const inpH = this.container.querySelector('#modal-input-height') as HTMLInputElement | null;
    const btnResetDims = this.container.querySelector('#btn-modal-reset-dims') as HTMLButtonElement | null;
    const radioShadowOn = modal?.querySelector('#modal-radio-shadow-on') as HTMLInputElement | null;
    const radioShadowOff = modal?.querySelector('#modal-radio-shadow-off') as HTMLInputElement | null;
    const btnCloseModal = this.container.querySelector('#btn-close-prop-modal');
    const btnCancelModal = this.container.querySelector('#btn-modal-cancel');
    const btnSaveProp = this.container.querySelector('#btn-modal-save-prop');

    const updateModalPreview = () => {
      let ratio = 836 / 342;
      const isCustom = Boolean(chkCustom?.checked);
      const w = Math.max(100, parseInt(inpW?.value || '836', 10) || 836);
      const h = Math.max(50, parseInt(inpH?.value || '342', 10) || 342);

      if (isCustom && w > 0 && h > 0) {
        ratio = w / h;
      } else if (!chk836?.checked) {
        ratio = 290 / 125;
      }

      const ratioDisplay = ratio.toFixed(2);
      const boxHeight = Math.max(50, Math.min(200, Math.round(290 / ratio)));
      const fitMode = chkNoDist?.checked ? 'contain' : 'fill';
      const showShadow = Boolean(radioShadowOn?.checked);

      if (modalBox) {
        modalBox.style.height = `${boxHeight}px`;
        modalBox.classList.toggle('has-no-shadow', !showShadow);
      }
      if (modalImg) {
        modalImg.style.objectFit = fitMode;
        modalImg.style.filter = showShadow ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))' : 'none';
      }
      if (modalLabel) {
        modalLabel.textContent = `Marco simulado: 290 × ${boxHeight} px (Proporción ${ratioDisplay}:1 • ${chkNoDist?.checked ? 'Sin distorsión' : 'Ajuste libre'} • ${showShadow ? 'Con sombra' : 'Sin sombra'})`;
      }
    };

    // Abrir modal al dar click en el botón de la fila
    this.container.querySelectorAll('.btn-showcase-prop-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pId = (btn as HTMLElement).dataset.id;
        const pName = (btn as HTMLElement).dataset.name || 'Calzado';
        const pImg = (btn as HTMLElement).dataset.img || '/assets/slide/slide.png';
        if (!pId) return;

        this.activeModalProductId = pId;
        if (modalProductName) modalProductName.textContent = pName;
        if (modalImg) modalImg.src = pImg;

        const prop = ShowcaseSettingsService.getProductProportion(pId);
        if (chk836) chk836.checked = prop.adjustTo836x342;
        if (chkNoDist) chkNoDist.checked = prop.preserveWithoutDistortion;
        if (chkCustom) chkCustom.checked = prop.customProportionEnabled;
        if (inpW) {
          inpW.value = String(prop.customWidth || 836);
          inpW.disabled = !prop.customProportionEnabled;
        }
        if (inpH) {
          inpH.value = String(prop.customHeight || 342);
          inpH.disabled = !prop.customProportionEnabled;
        }
        if (btnResetDims) btnResetDims.disabled = !prop.customProportionEnabled;
        customBox?.classList.toggle('is-disabled', !prop.customProportionEnabled);

        const showShadow = prop.showShadow !== false;
        if (radioShadowOn) radioShadowOn.checked = showShadow;
        if (radioShadowOff) radioShadowOff.checked = !showShadow;

        updateModalPreview();
        modal?.classList.remove('is-hidden');
      });
    });

    chkCustom?.addEventListener('change', () => {
      const isCustom = Boolean(chkCustom.checked);
      customBox?.classList.toggle('is-disabled', !isCustom);
      if (inpW) inpW.disabled = !isCustom;
      if (inpH) inpH.disabled = !isCustom;
      if (btnResetDims) btnResetDims.disabled = !isCustom;
      updateModalPreview();
    });

    chk836?.addEventListener('change', updateModalPreview);
    chkNoDist?.addEventListener('change', updateModalPreview);
    inpW?.addEventListener('input', updateModalPreview);
    inpH?.addEventListener('input', updateModalPreview);
    radioShadowOn?.addEventListener('change', updateModalPreview);
    radioShadowOff?.addEventListener('change', updateModalPreview);

    btnResetDims?.addEventListener('click', () => {
      if (inpW) inpW.value = '836';
      if (inpH) inpH.value = '342';
      if (chk836) chk836.checked = true;
      if (chkNoDist) chkNoDist.checked = true;
      if (radioShadowOn) radioShadowOn.checked = true;
      if (radioShadowOff) radioShadowOff.checked = false;
      updateModalPreview();
    });

    const closeModal = () => {
      modal?.classList.add('is-hidden');
      this.activeModalProductId = null;
    };

    btnCloseModal?.addEventListener('click', closeModal);
    btnCancelModal?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    btnSaveProp?.addEventListener('click', () => {
      if (!this.activeModalProductId) return;

      const w = Math.max(100, parseInt(inpW?.value || '836', 10) || 836);
      const h = Math.max(50, parseInt(inpH?.value || '342', 10) || 342);
      const showShadow = Boolean(radioShadowOn?.checked);

      ShowcaseSettingsService.saveProductProportion(this.activeModalProductId, {
        adjustTo836x342: Boolean(chk836?.checked),
        preserveWithoutDistortion: Boolean(chkNoDist?.checked),
        customProportionEnabled: Boolean(chkCustom?.checked),
        customWidth: w,
        customHeight: h,
        showShadow
      });

      Toast.show('Configuración visual y sombra guardadas correctamente.', 'Visualización', 'success');
      closeModal();

      const main = this.container.querySelector('#admin-main-viewport');
      if (main) {
        main.innerHTML = this.renderCircularShowcaseTab();
        this.setupCircularShowcaseEvents();
      }
    });

    // 3. Manejo de Calzados de Ejemplo (Blessed Slide Demo)
    this.container.querySelector('#btn-remove-all-demos')?.addEventListener('click', () => {
      ShowcaseSettingsService.setAllDemos(false);
      Toast.show('Se han retirado todos los calzados de ejemplo del escaparate.', 'Ejemplos', 'info');
      const main = this.container.querySelector('#admin-main-viewport');
      if (main) {
        main.innerHTML = this.renderCircularShowcaseTab();
        this.setupCircularShowcaseEvents();
      }
    });

    this.container.querySelector('#btn-enable-all-demos')?.addEventListener('click', () => {
      ShowcaseSettingsService.setAllDemos(true);
      Toast.show('Se han activado los 10 calzados de ejemplo en el escaparate.', 'Ejemplos', 'success');
      const main = this.container.querySelector('#admin-main-viewport');
      if (main) {
        main.innerHTML = this.renderCircularShowcaseTab();
        this.setupCircularShowcaseEvents();
      }
    });

    this.container.querySelectorAll('.toggle-demo-item').forEach((chk) => {
      chk.addEventListener('change', () => {
        const input = chk as HTMLInputElement;
        const demoId = input.dataset.demoId;
        if (!demoId) return;
        ShowcaseSettingsService.toggleDemoItem(demoId, input.checked);
        const card = this.container.querySelector(`#demo-card-${demoId}`);
        card?.classList.toggle('is-active', input.checked);
        card?.classList.toggle('is-inactive', !input.checked);
        Toast.show(
          input.checked ? 'Ejemplo activado en escaparate.' : 'Ejemplo quitado del escaparate.',
          'Ejemplos',
          'info'
        );
      });
    });

    // 4. Subida o sustitución de .PNG desde la tabla
    const filePicker = this.container.querySelector('#table-showcase-file-picker') as HTMLInputElement | null;
    let targetProductIdForUpload: string | null = null;

    this.container.querySelectorAll('.btn-table-upload-png').forEach((btn) => {
      btn.addEventListener('click', () => {
        targetProductIdForUpload = (btn as HTMLElement).dataset.id || null;
        if (targetProductIdForUpload && filePicker) {
          filePicker.value = '';
          filePicker.click();
        }
      });
    });

    filePicker?.addEventListener('change', async () => {
      const file = filePicker.files?.[0];
      if (!file || !targetProductIdForUpload) return;

      if (!file.type.includes('png') && !file.name.toLowerCase().endsWith('.png')) {
        Toast.show('El recurso debe ser una imagen en formato .png (sin fondo).', 'Formato no admitido', 'warning');
        return;
      }

      Toast.show('Subiendo imagen .png a MinIO...', 'MinIO Storage', 'info');
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const uploadRes = await ApiService.uploadAssetToMinio(userId, {
          filename: `carousel-${Date.now()}-${file.name.replace(/\s+/g, '_')}`,
          contentType: 'image/png',
          base64
        });

        if (uploadRes.success && uploadRes.url) {
          // Asignar y activar automáticamente en Circular Showcase
          const patchRes = await ApiService.updateAdminShowcase(userId, {
            id: targetProductIdForUpload,
            carouselImage: uploadRes.url,
            showcaseActive: true
          });

          if (patchRes.success) {
            Toast.show('¡Recurso carrusel (.PNG) asignado y activado en el Showcase!', 'Circular Showcase', 'success');
            await this.loadInitialData();
            this.store.loadProducts();
            this.updateMainContentOnly();
          } else {
            Toast.show(patchRes.message || 'Error al actualizar producto.', 'Atención', 'warning');
          }
        } else {
          Toast.show(uploadRes.message || 'Error al subir a MinIO.', 'MinIO', 'warning');
        }
      } catch (err) {
        console.error(err);
        Toast.show('Error al procesar el archivo .png.', 'Error', 'warning');
      } finally {
        targetProductIdForUpload = null;
        filePicker.value = '';
      }
    });

    // 5. Quitar .PNG desde la tabla
    this.container.querySelectorAll('.btn-table-delete-png').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pId = (btn as HTMLElement).dataset.id;
        if (!pId) return;

        const res = await ApiService.updateAdminShowcase(userId, {
          id: pId,
          carouselImage: null,
          showcaseActive: false
        });

        if (res.success) {
          Toast.show('Recurso carrusel retirado.', 'Circular Showcase', 'info');
          await this.loadInitialData();
          this.store.loadProducts();
          this.updateMainContentOnly();
        } else {
          Toast.show(res.message || 'Error al quitar recurso.', 'Atención', 'warning');
        }
      });
    });

    // 6. Toggle switch de activación
    this.container.querySelectorAll('.toggle-showcase-active').forEach((chk) => {
      chk.addEventListener('change', async () => {
        const input = chk as HTMLInputElement;
        const pId = input.dataset.id;
        const needsPng = input.dataset.needsPng === 'true';

        if (!pId) return;

        if (input.checked && needsPng) {
          input.checked = false;
          Toast.show(
            'Debes subir primero un recurso carrusel en formato .png antes de activar este calzado en el Circular Showcase.',
            'Recurso Requerido',
            'warning'
          );
          return;
        }

        const res = await ApiService.updateAdminShowcase(userId, {
          id: pId,
          showcaseActive: input.checked
        });

        if (res.success) {
          Toast.show(
            input.checked ? 'Calzado visible en Circular Showcase.' : 'Calzado ocultado de Circular Showcase.',
            'Circular Showcase',
            'info'
          );
          await this.loadInitialData();
          this.store.loadProducts();
          this.updateMainContentOnly();
        } else {
          input.checked = !input.checked;
          Toast.show(res.message || 'Error al cambiar estado.', 'Atención', 'warning');
        }
      });
    });

    // 7. Flechas de ordenamiento ▲ / ▼
    const activeList = this.products
      .filter((p) => p.showcaseActive && p.carouselImage)
      .sort((a, b) => (a.showcaseOrder || 0) - (b.showcaseOrder || 0));

    this.container.querySelectorAll('.btn-showcase-up').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pId = (btn as HTMLElement).dataset.id;
        const idx = activeList.findIndex((p) => p.id === pId);
        if (idx > 0) {
          const current = activeList[idx];
          const prev = activeList[idx - 1];

          // Asignar órdenes secuenciales
          const currentOrder = current.showcaseOrder !== undefined ? current.showcaseOrder : idx;
          const prevOrder = prev.showcaseOrder !== undefined ? prev.showcaseOrder : (idx - 1);
          const newCurrentOrder = prevOrder;
          const newPrevOrder = currentOrder === prevOrder ? currentOrder + 1 : currentOrder;

          await ApiService.updateAdminShowcase(userId, { id: current.id, showcaseOrder: newCurrentOrder });
          await ApiService.updateAdminShowcase(userId, { id: prev.id, showcaseOrder: newPrevOrder });

          await this.loadInitialData();
          this.store.loadProducts();
          this.updateMainContentOnly();
        }
      });
    });

    this.container.querySelectorAll('.btn-showcase-down').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pId = (btn as HTMLElement).dataset.id;
        const idx = activeList.findIndex((p) => p.id === pId);
        if (idx >= 0 && idx < activeList.length - 1) {
          const current = activeList[idx];
          const next = activeList[idx + 1];

          const currentOrder = current.showcaseOrder !== undefined ? current.showcaseOrder : idx;
          const nextOrder = next.showcaseOrder !== undefined ? next.showcaseOrder : (idx + 1);
          const newCurrentOrder = nextOrder;
          const newNextOrder = currentOrder === nextOrder ? nextOrder - 1 : currentOrder;

          await ApiService.updateAdminShowcase(userId, { id: current.id, showcaseOrder: newCurrentOrder });
          await ApiService.updateAdminShowcase(userId, { id: next.id, showcaseOrder: newNextOrder });

          await this.loadInitialData();
          this.store.loadProducts();
          this.updateMainContentOnly();
        }
      });
    });

    // 8. Editar producto desde showcase
    this.container.querySelectorAll('.btn-edit-from-showcase').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pId = (btn as HTMLElement).dataset.id;
        const product = this.products.find((p) => p.id === pId);
        if (product) {
          this.editingProduct = product;
          this.initFormSizes();
          this.activeTab = 'products-create';
          this.updateMainContentOnly();
        }
      });
    });
  }

  // ==========================================================================
  // EVENTOS: TAB APARIENCIA HORSE SHOWCASE
  // ==========================================================================
  private setupHorseShowcaseEvents(): void {
    const allProducts = this.products.length > 0 ? this.products : (this.store.products.length > 0 ? this.store.products : []);

    // 1. Buscador en tiempo real
    const searchInput = this.container.querySelector('#horse-search-input') as HTMLInputElement | null;
    searchInput?.addEventListener('input', () => {
      this.horseShowcaseSearchTerm = searchInput.value;
      const main = this.container.querySelector('#admin-main-viewport');
      if (main) {
        main.innerHTML = this.renderHorseShowcaseTab();
        this.setupHorseShowcaseEvents();
      }
    });

    // 2. Botón "Mostrar todos los pares"
    const btnShowAll = this.container.querySelector('#btn-horse-show-all');
    btnShowAll?.addEventListener('click', () => {
      HorseShowcaseSettingsService.setAllProductsVisible(allProducts, true);
      Toast.show('Todos los pares ahora son visibles en Horse Showcase.', 'Horse Showcase', 'success');
      const main = this.container.querySelector('#admin-main-viewport');
      if (main) {
        main.innerHTML = this.renderHorseShowcaseTab();
        this.setupHorseShowcaseEvents();
      }
    });

    // 3. Botón "Ocultar todos"
    const btnHideAll = this.container.querySelector('#btn-horse-hide-all');
    btnHideAll?.addEventListener('click', () => {
      HorseShowcaseSettingsService.setAllProductsVisible(allProducts, false);
      Toast.show('Todos los pares han sido ocultados de Horse Showcase.', 'Horse Showcase', 'info');
      const main = this.container.querySelector('#admin-main-viewport');
      if (main) {
        main.innerHTML = this.renderHorseShowcaseTab();
        this.setupHorseShowcaseEvents();
      }
    });

    // 4. Toggle switch de visibilidad individual
    this.container.querySelectorAll('.toggle-horse-active').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const input = e.currentTarget as HTMLInputElement;
        const productId = input.dataset.id;
        if (!productId) return;

        const isChecked = input.checked;
        HorseShowcaseSettingsService.setProductVisible(productId, isChecked);

        // Actualizar visualmente la fila
        const tr = input.closest('tr');
        if (tr) {
          tr.classList.toggle('row-showcase-active', isChecked);
        }

        const label = input.closest('td')?.querySelector('.showcase-status-label') as HTMLElement | null;
        if (label) {
          label.textContent = isChecked ? 'Visible en escaparate' : 'Oculto';
          label.style.color = isChecked ? '#059669' : '#94a3b8';
          label.style.fontWeight = isChecked ? '600' : '400';
        }

        // Actualizar métricas KPI en pantalla
        const s = HorseShowcaseSettingsService.getSettings();
        const visibleCount = allProducts.length - s.hiddenProductIds.length;
        const hiddenCount = s.hiddenProductIds.length;
        const visibleKpi = this.container.querySelector('#horse-kpi-visible');
        const hiddenKpi = this.container.querySelector('#horse-kpi-hidden');
        if (visibleKpi) visibleKpi.textContent = `${visibleCount} / ${allProducts.length}`;
        if (hiddenKpi) hiddenKpi.textContent = String(hiddenCount);

        Toast.show(
          isChecked ? 'Par visible en Horse Showcase.' : 'Par ocultado de Horse Showcase.',
          'Horse Showcase',
          'info'
        );
      });
    });

    // 5. Botones mover arriba / abajo (▲ / ▼)
    this.container.querySelectorAll('.btn-horse-up').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const productId = target.dataset.id;
        if (!productId) return;

        HorseShowcaseSettingsService.moveProduct(allProducts, productId, 'up');
        const main = this.container.querySelector('#admin-main-viewport');
        if (main) {
          main.innerHTML = this.renderHorseShowcaseTab();
          this.setupHorseShowcaseEvents();
        }
      });
    });

    this.container.querySelectorAll('.btn-horse-down').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const productId = target.dataset.id;
        if (!productId) return;

        HorseShowcaseSettingsService.moveProduct(allProducts, productId, 'down');
        const main = this.container.querySelector('#admin-main-viewport');
        if (main) {
          main.innerHTML = this.renderHorseShowcaseTab();
          this.setupHorseShowcaseEvents();
        }
      });
    });

    // 6. Botón Editar producto desde Horse Showcase
    this.container.querySelectorAll('.btn-edit-from-horse').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const productId = target.dataset.id;
        if (!productId) return;

        const product = allProducts.find((p) => p.id === productId);
        if (product) {
          this.editingProduct = product;
          this.initFormSizes();
          this.activeTab = 'products-create';
          this.updateMainContentOnly();
        }
      });
    });
  }

  // ==========================================================================
  // EVENTOS: ADMINISTRACIÓN DE BARRA DE ANUNCIOS (TOP-ANNOUNCEMENT-BAR)
  // ==========================================================================
  private setupAnnouncementsEvents(): void {
    const refreshView = () => {
      const main = this.container.querySelector('#admin-main-viewport');
      if (main) {
        main.innerHTML = this.renderAnnouncementsTab();
        this.setupAnnouncementsEvents();
      }
    };

    // 1. Inserción rápida de emojis al textarea
    this.container.querySelectorAll('.btn-emoji-tag').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const emoji = target.dataset.emoji || '';
        const input = this.container.querySelector('#input-ann-text') as HTMLTextAreaElement | null;
        if (input) {
          const start = input.selectionStart ?? input.value.length;
          const end = input.selectionEnd ?? input.value.length;
          input.value = input.value.substring(0, start) + emoji + ' ' + input.value.substring(end);
          input.focus();
          const nextPos = start + emoji.length + 1;
          input.setSelectionRange(nextPos, nextPos);
        }
      });
    });

    // 2. Guardar nuevo o editar anuncio existente
    const form = this.container.querySelector('#form-announcement') as HTMLFormElement | null;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const textarea = this.container.querySelector('#input-ann-text') as HTMLTextAreaElement | null;
      const activeCheck = this.container.querySelector('#check-ann-active') as HTMLInputElement | null;
      const text = textarea?.value?.trim() || '';

      if (!text) {
        Toast.show('Por favor escribe un texto para el anuncio.', 'Campo requerido', 'warning');
        return;
      }

      const isActive = activeCheck ? activeCheck.checked : true;

      if (this.editingAnnouncement) {
        AnnouncementSettingsService.updateAnnouncement(this.editingAnnouncement.id, text, isActive);
        Toast.show('Anuncio actualizado en la barra con éxito.', 'Guardado', 'success');
        this.editingAnnouncement = null;
      } else {
        AnnouncementSettingsService.addAnnouncement(text, isActive);
        Toast.show('Nuevo anuncio agregado a la barra superior.', 'Éxito', 'success');
      }

      refreshView();
    });

    // 3. Cancelar edición
    const cancelEdit = () => {
      this.editingAnnouncement = null;
      refreshView();
    };
    this.container.querySelector('#btn-cancel-ann-edit')?.addEventListener('click', cancelEdit);
    this.container.querySelector('#btn-cancel-ann-bottom')?.addEventListener('click', cancelEdit);

    // 4. Alternar visibilidad de anuncio individual (Switch checkbox)
    this.container.querySelectorAll('.toggle-ann-active').forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        const target = e.currentTarget as HTMLInputElement;
        const id = target.dataset.id;
        if (!id) return;

        const isNowActive = AnnouncementSettingsService.toggleAnnouncement(id);
        Toast.show(
          isNowActive ? 'Anuncio visible en la barra superior.' : 'Anuncio ocultado de la rotación.',
          'Visibilidad',
          'info'
        );
        refreshView();
      });
    });

    // 5. Reordenar: Mover arriba
    this.container.querySelectorAll('.btn-ann-up').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const id = target.dataset.id;
        if (!id) return;

        AnnouncementSettingsService.moveAnnouncement(id, 'up');
        refreshView();
      });
    });

    // 6. Reordenar: Mover abajo
    this.container.querySelectorAll('.btn-ann-down').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const id = target.dataset.id;
        if (!id) return;

        AnnouncementSettingsService.moveAnnouncement(id, 'down');
        refreshView();
      });
    });

    // 7. Botón Editar anuncio
    this.container.querySelectorAll('.btn-edit-ann').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const id = target.dataset.id;
        if (!id) return;

        const announcements = AnnouncementSettingsService.getAnnouncements();
        const found = announcements.find((a) => a.id === id);
        if (found) {
          this.editingAnnouncement = found;
          refreshView();
          const textarea = this.container.querySelector('#input-ann-text') as HTMLTextAreaElement | null;
          if (textarea) {
            textarea.focus();
            textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });
    });

    // 8. Botón Eliminar anuncio
    this.container.querySelectorAll('.btn-delete-ann').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const id = target.dataset.id;
        if (!id) return;

        if (confirm('¿Estás seguro de que deseas eliminar este anuncio de la barra?')) {
          if (this.editingAnnouncement?.id === id) {
            this.editingAnnouncement = null;
          }
          AnnouncementSettingsService.deleteAnnouncement(id);
          Toast.show('Anuncio eliminado de la barra.', 'Eliminado', 'info');
          refreshView();
        }
      });
    });

    // 9. Acciones masivas: Activar todos
    this.container.querySelector('#btn-ann-enable-all')?.addEventListener('click', () => {
      AnnouncementSettingsService.setAllAnnouncementsActive(true);
      Toast.show('Todos los anuncios han sido activados en la barra.', 'Marquesina', 'success');
      refreshView();
    });

    // 10. Acciones masivas: Ocultar todos
    this.container.querySelector('#btn-ann-disable-all')?.addEventListener('click', () => {
      AnnouncementSettingsService.setAllAnnouncementsActive(false);
      Toast.show('Todos los anuncios han sido pausados/ocultados.', 'Marquesina', 'info');
      refreshView();
    });

    // 11. Acciones masivas: Restablecer originales
    this.container.querySelector('#btn-ann-reset-defaults')?.addEventListener('click', () => {
      if (confirm('¿Deseas restablecer los anuncios a los textos iniciales de Blessed Sandals?')) {
        this.editingAnnouncement = null;
        AnnouncementSettingsService.resetToDefaults();
        Toast.show('Anuncios restablecidos a los valores predeterminados.', 'Restablecido', 'success');
        refreshView();
      }
    });
  }

  // ==========================================================================
  // EVENTOS: FORMULARIO NUEVO / EDITAR CÓDIGO TIENDA PROMO (SHOWCASEPROMO)
  // ==========================================================================
  private setupPromoStoreFormEvents(): void {
    const userId = this.store.currentUser?.id;
    if (!userId) return;

    const allProducts = this.products.length > 0 ? this.products : (this.store.products.length > 0 ? this.store.products : []);

    // 1. Botones Cancelar
    const onCancel = () => {
      this.editingPromo = null;
      this.promoStoreItems = [];
      this.activeTab = 'promos-list';
      this.updateMainContentOnly();
    };
    this.container.querySelector('#btn-cancel-promo-store')?.addEventListener('click', onCancel);
    this.container.querySelector('#btn-cancel-edit-promo-store')?.addEventListener('click', onCancel);

    // 2. Agregar Calzado a la Tienda Promo
    this.container.querySelector('#btn-add-product-to-promo-store')?.addEventListener('click', () => {
      const select = this.container.querySelector('#promo-store-add-select') as HTMLSelectElement | null;
      if (!select || !select.value) {
        Toast.show('Selecciona un calzado del catálogo primero.', 'Atención', 'warning');
        return;
      }
      const prodId = select.value;
      const prod = allProducts.find((p) => p.id === prodId);
      if (!prod) return;

      const discountedPrice = Math.max(1, Math.round(Number(prod.price) * 0.8));
      this.promoStoreItems.push({
        productId: prod.id,
        promoPrice: discountedPrice,
        badgeLabel: 'EDICIÓN PROMO'
      });

      const main = this.container.querySelector('#admin-main-viewport');
      if (main) {
        main.innerHTML = this.renderPromoStoreFormTab();
        this.setupPromoStoreFormEvents();
      }
    });

    // 3. Modificar precio promocional individual
    this.container.querySelectorAll('.input-promo-store-item-price').forEach((input) => {
      input.addEventListener('change', (e) => {
        const target = e.currentTarget as HTMLInputElement;
        const idx = Number(target.dataset.index);
        const val = Number(target.value);
        if (this.promoStoreItems[idx] && val > 0) {
          this.promoStoreItems[idx].promoPrice = val;
        }
      });
    });

    // 4. Modificar etiqueta badge individual
    this.container.querySelectorAll('.input-promo-store-item-badge').forEach((input) => {
      input.addEventListener('change', (e) => {
        const target = e.currentTarget as HTMLInputElement;
        const idx = Number(target.dataset.index);
        if (this.promoStoreItems[idx]) {
          this.promoStoreItems[idx].badgeLabel = target.value.trim() || 'EDICIÓN PROMO';
        }
      });
    });

    // 5. Quitar calzado de la lista de tienda promo
    this.container.querySelectorAll('.btn-remove-promo-store-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const idx = Number(target.dataset.index);
        this.promoStoreItems.splice(idx, 1);
        const main = this.container.querySelector('#admin-main-viewport');
        if (main) {
          main.innerHTML = this.renderPromoStoreFormTab();
          this.setupPromoStoreFormEvents();
        }
      });
    });

    // 6. Submit del Formulario
    const form = this.container.querySelector('#form-admin-promo-store');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const code = (this.container.querySelector('#promo-store-code') as HTMLInputElement)?.value.trim().toUpperCase();
      const description = (this.container.querySelector('#promo-store-desc') as HTMLInputElement)?.value.trim();
      const startsAt = (this.container.querySelector('#promo-store-starts') as HTMLInputElement)?.value;
      const expiresAt = (this.container.querySelector('#promo-store-expires') as HTMLInputElement)?.value;
      const usageLimitStr = (this.container.querySelector('#promo-store-usagelimit') as HTMLInputElement)?.value;
      const usageLimit = usageLimitStr ? Number(usageLimitStr) : null;
      const minPurchase = Number((this.container.querySelector('#promo-store-minpurchase') as HTMLInputElement)?.value) || 0;
      const onePerUser = (this.container.querySelector('#promo-store-oneperuser') as HTMLInputElement)?.checked ?? true;
      const isWelcomeOnly = (this.container.querySelector('#promo-store-iswelcome') as HTMLInputElement)?.checked ?? false;
      const isActive = (this.container.querySelector('#promo-store-isactive') as HTMLInputElement)?.checked ?? true;

      if (!code) {
        Toast.show('Ingresa un código promocional.', 'Atención', 'warning');
        return;
      }

      if (this.promoStoreItems.length === 0) {
        Toast.show('Debes agregar al menos un calzado a la tienda promo.', 'Atención', 'warning');
        return;
      }

      const submitBtn = this.container.querySelector('#btn-save-promo-store') as HTMLButtonElement | null;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando tienda promo...';
      }

      try {
        if (this.editingPromo) {
          const res = await ApiService.updateAdminPromo(userId, {
            id: this.editingPromo.id,
            description,
            discountType: 'HIDDEN_STORE',
            discountValue: 0,
            minPurchase,
            usageLimit,
            onePerUser,
            isWelcomeOnly,
            isActive,
            startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
            storeItems: this.promoStoreItems
          });

          if (res.success) {
            Toast.show('Tienda promo actualizada exitosamente.', 'Promociones', 'success');
            this.editingPromo = null;
            this.promoStoreItems = [];
            await this.loadInitialData();
            this.store.loadPromos();
            this.activeTab = 'promos-list';
            this.updateMainContentOnly();
          } else {
            Toast.show(res.message || 'Error al actualizar tienda promo.', 'Atención', 'warning');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Actualizar Tienda Promo';
            }
          }
        } else {
          const res = await ApiService.createAdminPromo(userId, {
            code,
            description,
            discountType: 'HIDDEN_STORE',
            discountValue: 0,
            minPurchase,
            usageLimit,
            onePerUser,
            isWelcomeOnly,
            isActive,
            startsAt: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
            storeItems: this.promoStoreItems
          });

          if (res.success) {
            Toast.show(`¡Código Tienda Promo ${code} creado exitosamente!`, 'Promociones', 'success');
            this.editingPromo = null;
            this.promoStoreItems = [];
            await this.loadInitialData();
            this.store.loadPromos();
            this.activeTab = 'promos-list';
            this.updateMainContentOnly();
          } else {
            Toast.show(res.message || 'Error al crear código de tienda promo.', 'Atención', 'warning');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Crear y Habilitar Tienda Promo';
            }
          }
        }
      } catch (err: any) {
        Toast.show(err.message || 'Error en la petición.', 'Atención', 'warning');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Guardar Código Tienda Promo';
        }
      }
    });
  }

  // ==========================================================================
  // SECCIÓN: TARJETAS DE PRUEBA STRIPE (CREACIÓN Y GESTIÓN DE SALDOS EN ADMIN)
  // ==========================================================================

  private async loadAdminCardsData(): Promise<void> {
    const userId = this.store.currentUser?.id;
    if (!userId) return;
    try {
      const [usersRes, cardsRes] = await Promise.all([
        ApiService.getAdminUsers(userId),
        ApiService.getAdminCards(userId)
      ]);
      if (usersRes.success && usersRes.users) {
        this.adminUsers = usersRes.users;
      }
      if (cardsRes.success && cardsRes.cards) {
        this.adminCards = cardsRes.cards;
      }
    } catch (err) {
      console.error('Error cargando tarjetas para pruebas:', err);
    }
  }

  private renderStripeTestCardsTab(): string {
    const userList = this.adminUsers || [];
    const cardList = this.adminCards || [];
    const currentUserId = this.store.currentUser?.id;

    return `
      <div class="admin-view-panel">
        <div class="admin-view-header">
          <div>
            <h2 class="admin-view-title">Tarjetas de Prueba & Simulación de Fondos</h2>
            <p class="admin-view-subtitle">
              Administra tarjetas bancarias de prueba con diferentes balances y estados para simular compras en el checkout de Blessed Sandals.
            </p>
          </div>
          <button type="button" class="btn-table-action" id="btn-refresh-admin-cards" style="display:inline-flex; align-items:center; gap:6px; height:38px; padding:0 14px;">
            ${Icons.refresh('w-4 h-4')}
            <span>Actualizar Lista</span>
          </button>
        </div>

        <div class="admin-stripe-cards-grid">
          
          <!-- FORMULARIO CREAR TARJETA DE PRUEBA -->
          <div class="admin-form-section">
            <h3 class="admin-section-heading">Crear Tarjeta de Prueba</h3>
            <p class="admin-section-sub">Asigna una tarjeta con saldo a una cuenta de usuario.</p>

            <!-- PRESETS DE TARJETAS DE PRUEBA -->
            <div class="admin-card-presets-wrap">
              <span class="admin-presets-label">Presets Rápidos de Tarjeta:</span>
              <div class="admin-presets-buttons">
                <button type="button" class="btn-card-preset is-active" data-num="4242 4242 4242 4242" data-holder="PRUEBA APROBADA STRIPE" data-funds="500">
                  ✓ Aprobada (4242)
                </button>
                <button type="button" class="btn-card-preset" data-num="4000 0000 0000 0002" data-holder="PRUEBA DECLINADA" data-funds="500">
                  ✕ Declinada (0002)
                </button>
                <button type="button" class="btn-card-preset" data-num="4000 0000 0000 0003" data-holder="PRUEBA SIN FONDOS" data-funds="500">
                  ⚠️ Sin Fondos (0003)
                </button>
                <button type="button" class="btn-card-preset" data-num="4242 4242 4242 1010" data-holder="PRUEBA FONDOS BAJOS" data-funds="20">
                  🔻 Saldo Bajo ($20)
                </button>
              </div>
            </div>

            <form id="form-admin-create-card">
              <div class="admin-input-group">
                <label for="admin-card-user">Cuenta de Usuario Destino *</label>
                <select id="admin-card-user" required>
                  ${userList.length === 0 ? `<option value="">Cargando usuarios...</option>` : ''}
                  ${userList.map((u) => `
                    <option value="${u.id}" ${u.id === currentUserId ? 'selected' : ''}>
                      ${u.name} (${u.email}) [${u.role}]
                    </option>
                  `).join('')}
                </select>
                <small class="admin-input-help">Esta tarjeta aparecerá en la bolsa y checkout de esta cuenta.</small>
              </div>

              <div class="admin-input-group">
                <label for="admin-card-holder">Nombre del Titular *</label>
                <input type="text" id="admin-card-holder" value="PRUEBA APROBADA STRIPE" required />
              </div>

              <div class="admin-input-group">
                <label for="admin-card-number">Número de Tarjeta (16 dígitos) *</label>
                <input type="text" id="admin-card-number" value="4242 4242 4242 4242" maxlength="19" required />
              </div>

              <div class="admin-form-grid-2">
                <div class="admin-input-group">
                  <label for="admin-card-month">Mes Vencimiento *</label>
                  <select id="admin-card-month">
                    ${Array.from({ length: 12 }, (_, i) => i + 1).map((m) => `
                      <option value="${m}" ${m === 12 ? 'selected' : ''}>${m < 10 ? '0' + m : m}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="admin-input-group">
                  <label for="admin-card-year">Año Vencimiento *</label>
                  <select id="admin-card-year">
                    ${Array.from({ length: 10 }, (_, i) => 2026 + i).map((y) => `
                      <option value="${y}" ${y === 2028 ? 'selected' : ''}>${y}</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <!-- FONDOS ASIGNADOS A LA TARJETA -->
              <div class="admin-input-group">
                <label for="admin-card-balance">Fondos / Saldo Inicial de Prueba ($ USD) *</label>
                <div class="admin-funds-input-row">
                  <input type="number" id="admin-card-balance" min="0" step="10" value="500" required />
                  <div class="admin-fund-presets-chips">
                    <button type="button" class="btn-admin-fund-preset" data-val="0">$0</button>
                    <button type="button" class="btn-admin-fund-preset" data-val="25">$25</button>
                    <button type="button" class="btn-admin-fund-preset" data-val="100">$100</button>
                    <button type="button" class="btn-admin-fund-preset is-active" data-val="500">$500</button>
                    <button type="button" class="btn-admin-fund-preset" data-val="1500">$1500</button>
                  </div>
                </div>
                <small class="admin-input-help">
                  El saldo se debitará en PostgreSQL con cada compra. Si una orden supera el saldo, el checkout la rechazará por fondos insuficientes.
                </small>
              </div>

              <div class="admin-checkbox-group">
                <label>
                  <input type="checkbox" id="admin-card-default" checked />
                  <span>Establecer como tarjeta principal del usuario</span>
                </label>
              </div>

              <button type="submit" class="btn-admin-action-primary" id="btn-submit-admin-card" style="width:100%; justify-content:center; height:42px;">
                ${Icons.plus('w-4 h-4')}
                <span>Crear Tarjeta de Prueba</span>
              </button>
            </form>
          </div>

          <!-- LISTA DE TARJETAS REGISTRADAS -->
          <div class="admin-form-section">
            <h3 class="admin-section-heading">Tarjetas en el Sistema (${cardList.length})</h3>
            <p class="admin-section-sub">Supervisa credenciales bancarias y ajusta el saldo en tiempo real.</p>

            ${cardList.length === 0 ? `
              <div class="admin-empty-state" style="padding: 40px 20px; text-align: center;">
                <div style="font-size: 36px; margin-bottom: 10px;">💳</div>
                <h4>No hay tarjetas registradas</h4>
                <p>Crea una tarjeta en el formulario para comenzar las pruebas de checkout.</p>
              </div>
            ` : `
              <div class="admin-table-container">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Tarjeta</th>
                      <th>Saldo BD</th>
                      <th>Tipo Simulación</th>
                      <th style="text-align: right;">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${cardList.map((c) => {
                      const balance = Number(c.balance) || 0;
                      let simTypeBadge = `<span class="badge-sim-ok">✓ Aprobada</span>`;
                      if (c.last4 === '0002') simTypeBadge = `<span class="badge-sim-decline">✕ Declinada</span>`;
                      else if (c.last4 === '0003') simTypeBadge = `<span class="badge-sim-insufficient">⚠️ Sin Fondos</span>`;
                      else if (balance < 50) simTypeBadge = `<span class="badge-sim-low">🔻 Saldo Bajo</span>`;

                      return `
                        <tr>
                          <td>
                            <div class="table-user-cell">
                              <strong>${c.userName || 'Usuario'}</strong>
                              <small>${c.userEmail}</small>
                            </div>
                          </td>
                          <td>
                            <div class="table-card-cell">
                              <span class="card-brand-pill ${c.brand.toLowerCase()}">${c.brand}</span>
                              <strong style="font-family:monospace; font-size:13px;">•••• ${c.last4}</strong>
                            </div>
                            <small style="color:#64748b; font-size:11px;">${c.cardHolder}</small>
                          </td>
                          <td>
                            <strong class="card-balance-val ${balance > 0 ? 'text-positive' : 'text-zero'}">
                              $${balance.toFixed(2)}
                            </strong>
                          </td>
                          <td>
                            ${simTypeBadge}
                          </td>
                          <td style="text-align: right;">
                            <div class="table-actions-cluster">
                              <button type="button" class="btn-table-action-icon btn-view-card-details" data-id="${c.id}" title="Ver datos completos (Número, CVC, Expiración)">
                                ${Icons.eye('w-4 h-4')}
                              </button>
                              <button type="button" class="btn-table-action-icon btn-edit-balance" data-id="${c.id}" data-balance="${balance}" title="Modificar saldo">
                                💵
                              </button>
                              <button type="button" class="btn-table-action-icon btn-table-action-danger btn-delete-admin-card" data-id="${c.id}" title="Eliminar tarjeta">
                                ${Icons.trash('w-4 h-4')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `}

            <!-- GUÍA DE REFERENCIA DE COMPORTAMIENTO -->
            <div style="margin-top: 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px;">
              <strong style="font-size: 11px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">
                Guía de Respuestas en el Checkout
              </strong>
              <ul style="font-size: 12px; color: #475569; margin: 0; padding-left: 16px; line-height: 1.55;">
                <li><strong>Aprobada:</strong> Número <code>4242...</code> con saldo $\ge$ total de la compra $\to$ Completa la orden y debita el saldo en PostgreSQL.</li>
                <li><strong>Fondos Insuficientes:</strong> Cualquier tarjeta con saldo $<$ total $\to$ Muestra alerta: <em>"Fondos insuficientes en tu tarjeta..."</em>.</li>
                <li><strong>Declinada:</strong> Número terminado en <code>0002</code> $\to$ Muestra alerta de rechazo bancario de Stripe.</li>
                <li><strong>Sin Fondos Forzado:</strong> Número terminado en <code>0003</code> $\to$ Muestra rechazo forzado de fondos insuficientes.</li>
              </ul>
            </div>

          </div>

        </div>

        <!-- MODAL DETALLES COMPLETOS DE TARJETA -->
        <div class="modal-card-details-backdrop is-hidden" id="modal-card-details" role="dialog" aria-modal="true">
          <div class="modal-card-details-box">
            <div class="modal-card-details-header">
              <div>
                <h3 class="modal-card-details-title">Datos Completos de Tarjeta</h3>
                <p class="modal-card-details-sub">Credenciales bancarias listas para pruebas de checkout</p>
              </div>
              <button type="button" class="btn-close-modal-icon" id="btn-close-card-details-x" aria-label="Cerrar modal">
                ✕
              </button>
            </div>

            <div class="modal-card-details-body">
              <!-- Tarjeta Visual Estética con Proporciones y Brillo Sutil -->
              <div class="modal-visual-card-wrap">
                <div class="luxury-credit-card">
                  <div class="card-bg-gradient"></div>
                  <div class="card-grain-overlay"></div>
                  <div class="card-shimmer-sheen"></div>
                  <div class="card-light-glint"></div>

                  <div class="card-top-bar">
                    <div class="card-emblem-badge" title="Blessed Card">
                      ${Icons.cardEmblem('card-wise-emblem')}
                    </div>

                    <div class="card-chip-cluster">
                      <div class="luxury-emv-chip" aria-hidden="true">
                        <div class="chip-center-core"></div>
                        <div class="chip-line chip-line-h1"></div>
                        <div class="chip-line chip-line-h2"></div>
                        <div class="chip-line chip-line-v1"></div>
                        <div class="chip-line chip-line-v2"></div>
                      </div>
                      <div class="luxury-contactless-wave" aria-hidden="true">
                        ${Icons.contactless('contactless-waves-svg')}
                      </div>
                    </div>
                  </div>

                  <div class="card-middle-number">
                    <span class="card-num-text" id="modal-view-visual-num">4242 &nbsp;4242 &nbsp;4242 &nbsp;4242</span>
                  </div>

                  <div class="card-bottom-bar">
                    <div class="card-identity-block">
                      <span class="card-holder-name-text" id="modal-view-visual-holder">PRUEBA APROBADA STRIPE</span>
                      <div style="display:flex; gap:8px; align-items:center;">
                        <span class="card-expiry-badge" id="modal-view-visual-exp">12/28</span>
                        <span class="card-expiry-badge" id="modal-view-visual-cvc" style="background:rgba(255,255,255,0.18); padding:1px 6px; border-radius:4px;">CVC: 123</span>
                      </div>
                    </div>

                    <div class="card-network-badge" id="modal-view-brand-wrap">
                      ${Icons.visaLogo('official-visa-svg')}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tabla de Copia Rápida -->
              <div class="card-data-sheet">
                <div class="card-data-row">
                  <span class="card-data-label">Número Completo</span>
                  <div class="card-data-val-group">
                    <span class="card-data-val" id="modal-view-card-number">4242 4242 4242 4242</span>
                    <button type="button" class="btn-copy-chip" id="btn-copy-card-number">
                      ${Icons.copy('w-3.5 h-3.5')}
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>

                <div class="card-data-row">
                  <span class="card-data-label">Código CVC</span>
                  <div class="card-data-val-group">
                    <span class="card-data-val" id="modal-view-card-cvc">123</span>
                    <button type="button" class="btn-copy-chip" id="btn-copy-card-cvc">
                      ${Icons.copy('w-3.5 h-3.5')}
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>

                <div class="card-data-row">
                  <span class="card-data-label">Fecha de Expiración</span>
                  <div class="card-data-val-group">
                    <span class="card-data-val" id="modal-view-card-exp">12/2028</span>
                    <button type="button" class="btn-copy-chip" id="btn-copy-card-exp">
                      ${Icons.copy('w-3.5 h-3.5')}
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>

                <div class="card-data-row">
                  <span class="card-data-label">Saldo en Base de Datos</span>
                  <span class="card-data-val text-positive" id="modal-view-card-balance" style="font-size: 14px;">$500.00 USD</span>
                </div>

                <div class="card-data-row">
                  <span class="card-data-label">Usuario Asignado</span>
                  <span class="card-data-val" id="modal-view-card-user" style="font-family: inherit; font-size: 12px; color: #334155;">Alexander (alexander@blessed.com)</span>
                </div>
              </div>
            </div>

            <div class="modal-card-details-footer">
              <button type="button" class="btn-admin-action-secondary" id="btn-close-card-details-footer">
                Cerrar
              </button>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  private setupStripeTestCardsEvents(): void {
    const adminUserId = this.store.currentUser?.id;
    if (!adminUserId) return;

    // Botón refrescar lista
    this.container.querySelector('#btn-refresh-admin-cards')?.addEventListener('click', async () => {
      await this.loadAdminCardsData();
      this.updateMainContentOnly();
      Toast.show('Lista de tarjetas actualizada.', 'Stripe Test', 'info');
    });

    // Presets rápidos de tarjetas
    this.container.querySelectorAll('.btn-card-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const num = (btn as HTMLElement).dataset.num;
        const holder = (btn as HTMLElement).dataset.holder;
        const funds = (btn as HTMLElement).dataset.funds;

        const numInput = this.container.querySelector('#admin-card-number') as HTMLInputElement | null;
        const holderInput = this.container.querySelector('#admin-card-holder') as HTMLInputElement | null;
        const fundsInput = this.container.querySelector('#admin-card-balance') as HTMLInputElement | null;

        if (num && numInput) numInput.value = num;
        if (holder && holderInput) holderInput.value = holder;
        if (funds && fundsInput) fundsInput.value = funds;

        this.container.querySelectorAll('.btn-card-preset').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });

    // Presets de saldo rápido
    this.container.querySelectorAll('.btn-admin-fund-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = (btn as HTMLElement).dataset.val;
        const fundsInput = this.container.querySelector('#admin-card-balance') as HTMLInputElement | null;
        if (val && fundsInput) {
          fundsInput.value = val;
          this.container.querySelectorAll('.btn-admin-fund-preset').forEach((b) => b.classList.remove('is-active'));
          btn.classList.add('is-active');
        }
      });
    });

    // Submit crear tarjeta
    const formCreate = this.container.querySelector('#form-admin-create-card');
    formCreate?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const targetUserId = (this.container.querySelector('#admin-card-user') as HTMLSelectElement | null)?.value;
      const cardHolder = (this.container.querySelector('#admin-card-holder') as HTMLInputElement | null)?.value.trim() || '';
      const cardNumber = (this.container.querySelector('#admin-card-number') as HTMLInputElement | null)?.value.trim() || '';
      const expMonth = Number((this.container.querySelector('#admin-card-month') as HTMLSelectElement | null)?.value) || 12;
      const expYear = Number((this.container.querySelector('#admin-card-year') as HTMLSelectElement | null)?.value) || 2028;
      const balance = Number((this.container.querySelector('#admin-card-balance') as HTMLInputElement | null)?.value) || 0;
      const isDefault = (this.container.querySelector('#admin-card-default') as HTMLInputElement | null)?.checked ?? false;

      if (!targetUserId || !cardHolder || !cardNumber) {
        Toast.show('Por favor completa todos los campos requeridos.', 'Atención', 'warning');
        return;
      }

      const res = await ApiService.createAdminCard(adminUserId, {
        targetUserId,
        cardHolder,
        cardNumber,
        expMonth,
        expYear,
        balance,
        isDefault
      });

      if (res.success) {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.3 } });
        Toast.show(res.message || 'Tarjeta de prueba creada exitosamente.', 'Stripe Test', 'success');
        await this.loadAdminCardsData();
        this.updateMainContentOnly();
      } else {
        Toast.show(res.message || 'Error al crear tarjeta.', 'Atención', 'warning');
      }
    });

    // Editar saldo
    this.container.querySelectorAll('.btn-edit-balance').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const cardId = (btn as HTMLElement).dataset.id;
        const currentBalance = (btn as HTMLElement).dataset.balance || '0';
        if (!cardId) return;

        const newBalStr = prompt(`Ingresa el nuevo saldo para esta tarjeta ($ USD):`, currentBalance);
        if (newBalStr === null) return;
        const newBalance = parseFloat(newBalStr);
        if (isNaN(newBalance) || newBalance < 0) {
          Toast.show('Por favor ingresa un monto válido mayor o igual a 0.', 'Atención', 'warning');
          return;
        }

        const res = await ApiService.updateAdminCardBalance(adminUserId, cardId, newBalance);
        if (res.success) {
          Toast.show(`Saldo actualizado a $${newBalance.toFixed(2)}.`, 'Stripe Test', 'success');
          await this.loadAdminCardsData();
          this.updateMainContentOnly();
        } else {
          Toast.show(res.message || 'Error al actualizar saldo.', 'Atención', 'warning');
        }
      });
    });

    // Eliminar tarjeta
    this.container.querySelectorAll('.btn-delete-admin-card').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const cardId = (btn as HTMLElement).dataset.id;
        if (!cardId) return;

        if (confirm('¿Estás seguro de eliminar esta tarjeta de prueba?')) {
          const res = await ApiService.deleteAdminCard(adminUserId, cardId);
          if (res.success) {
            Toast.show('Tarjeta de prueba eliminada.', 'Stripe Test', 'info');
            await this.loadAdminCardsData();
            this.updateMainContentOnly();
          } else {
            Toast.show(res.message || 'Error al eliminar tarjeta.', 'Atención', 'warning');
          }
        }
      });
    });

    // Modal ver detalles completos con icono de ojo
    const modalDetails = this.container.querySelector('#modal-card-details') as HTMLElement | null;
    const closeModal = () => {
      modalDetails?.classList.add('is-hidden');
    };

    this.container.querySelector('#btn-close-card-details-x')?.addEventListener('click', closeModal);
    this.container.querySelector('#btn-close-card-details-footer')?.addEventListener('click', closeModal);
    modalDetails?.addEventListener('click', (e) => {
      if (e.target === modalDetails) closeModal();
    });

    this.container.querySelectorAll('.btn-view-card-details').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cardId = (btn as HTMLElement).dataset.id;
        if (!cardId) return;

        const card = this.adminCards.find((c) => c.id === cardId);
        if (!card) return;

        const rawNum = card.cardNumber || (
          card.last4 === '0002' ? '4000 0000 0000 0002' :
          card.last4 === '0003' ? '4000 0000 0000 0003' :
          `4242 4242 4242 ${card.last4}`
        );
        const formattedNum = rawNum.replace(/\s+/g, '').replace(/(\d{4})/g, '$1 ').trim();
        const cvc = card.cvc || '123';
        const expMonthStr = card.expMonth < 10 ? '0' + card.expMonth : String(card.expMonth);
        const expStr = `${expMonthStr}/${card.expYear}`;
        const expShortStr = `${expMonthStr}/${String(card.expYear).slice(-2)}`;
        const balance = Number(card.balance) || 0;

        // Visual card preview
        const viewBrandWrap = modalDetails?.querySelector('#modal-view-brand-wrap');
        const viewVisualNum = modalDetails?.querySelector('#modal-view-visual-num');
        const viewVisualHolder = modalDetails?.querySelector('#modal-view-visual-holder');
        const viewVisualExp = modalDetails?.querySelector('#modal-view-visual-exp');
        const viewVisualCvc = modalDetails?.querySelector('#modal-view-visual-cvc');

        if (viewBrandWrap) {
          if (card.brand?.toUpperCase() === 'MASTERCARD') {
            viewBrandWrap.innerHTML = Icons.mastercardLogo('official-mastercard-svg');
          } else {
            viewBrandWrap.innerHTML = Icons.visaLogo('official-visa-svg');
          }
        }
        if (viewVisualNum) viewVisualNum.textContent = formattedNum;
        if (viewVisualHolder) viewVisualHolder.textContent = card.cardHolder || 'Titular';
        if (viewVisualExp) viewVisualExp.textContent = expShortStr;
        if (viewVisualCvc) viewVisualCvc.textContent = `CVC: ${cvc}`;

        // Data sheet
        const viewNum = modalDetails?.querySelector('#modal-view-card-number');
        const viewCvc = modalDetails?.querySelector('#modal-view-card-cvc');
        const viewExp = modalDetails?.querySelector('#modal-view-card-exp');
        const viewBal = modalDetails?.querySelector('#modal-view-card-balance');
        const viewUser = modalDetails?.querySelector('#modal-view-card-user');

        if (viewNum) viewNum.textContent = formattedNum;
        if (viewCvc) viewCvc.textContent = cvc;
        if (viewExp) viewExp.textContent = expStr;
        if (viewBal) {
          viewBal.textContent = `$${balance.toFixed(2)} USD`;
          viewBal.className = `card-data-val ${balance > 0 ? 'text-positive' : 'text-zero'}`;
        }
        if (viewUser) viewUser.textContent = `${card.userName || 'Usuario'} (${card.userEmail || ''})`;

        // Configurar botones de copia
        const btnCopyNum = modalDetails?.querySelector('#btn-copy-card-number') as HTMLButtonElement | null;
        if (btnCopyNum) {
          btnCopyNum.onclick = async () => {
            await navigator.clipboard.writeText(formattedNum);
            Toast.show('Número de tarjeta copiado al portapapeles.', 'Copiado', 'success');
          };
        }

        const btnCopyCvc = modalDetails?.querySelector('#btn-copy-card-cvc') as HTMLButtonElement | null;
        if (btnCopyCvc) {
          btnCopyCvc.onclick = async () => {
            await navigator.clipboard.writeText(cvc);
            Toast.show('Código CVC copiado al portapapeles.', 'Copiado', 'success');
          };
        }

        const btnCopyExp = modalDetails?.querySelector('#btn-copy-card-exp') as HTMLButtonElement | null;
        if (btnCopyExp) {
          btnCopyExp.onclick = async () => {
            await navigator.clipboard.writeText(expStr);
            Toast.show('Fecha de expiración copiada al portapapeles.', 'Copiado', 'success');
          };
        }

        modalDetails?.classList.remove('is-hidden');
      });
    });
  }
}
