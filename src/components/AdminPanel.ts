import { Store } from '../state/store';
import { ApiService } from '../services/apiService';
import { Icons } from './Icons';
import { Toast } from './Toast';
import {
  SizeUnit,
  formatSizeDisplay,
  formatFullEquivalence,
  getSizeEquivalence,
  unitToEu,
  STANDARD_CHART_SIZES
} from '../utils/sizeConverter';

export type AdminTab =
  | 'products-list'
  | 'products-create'
  | 'promos-list'
  | 'promos-create'
  | 'minio-storage';

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
  private formVariants: ProductVariantForm[] = [];
  private activeVariantIndex: number = 0;
  private adminSizeUnit: SizeUnit = 'EU';
  private showEquivalences: boolean = false;

  private initFormVariants(): void {
    if (this.editingProduct) {
      const p = this.editingProduct;
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
                  ${this.editingPromo ? 'Editar Código' : 'Nuevo Código Promocional'}
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
      case 'minio-storage':
        return this.renderMinioStorageTab();
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
          <button type="button" class="btn-admin-action-primary" id="btn-admin-goto-create-prod">
            ${Icons.plus('w-4 h-4')}
            <span>Agregar Producto</span>
          </button>
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
                              <img src="${p.image || '/assets/logo/Isotipo.png'}" alt="${p.name}" class="table-prod-thumb" />
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
            <p class="admin-view-subtitle">Supervisa los códigos promocionales vigentes, porcentajes de descuento y usos registrados.</p>
          </div>
          <button type="button" class="btn-admin-action-primary" id="btn-admin-goto-create-promo">
            ${Icons.plus('w-4 h-4')}
            <span>Nuevo Código</span>
          </button>
        </div>

        ${this.promos.length === 0
        ? `
            <div class="admin-empty-state">
              <h4>No hay cupones creados</h4>
              <p>Crea el primer código promocional para que tus clientes puedan redimirlo.</p>
            </div>
          `
        : `
            <div class="admin-promos-grid">
              ${this.promos
          .map((promo) => {
            const isPercentage = promo.discountType === 'PERCENTAGE';
            const discountLabel = isPercentage ? `${promo.discountValue}%` : `$${promo.discountValue}`;

            return `
                    <div class="admin-promo-card ${promo.isActive ? 'is-active' : 'is-inactive'}">
                      <div class="admin-promo-header">
                        <div class="admin-promo-code-wrap">
                          <strong class="admin-promo-code">${promo.code}</strong>
                          ${promo.isWelcomeOnly ? `<span class="badge-welcome-pill">Bienvenida</span>` : ''}
                        </div>
                        <span class="admin-promo-discount">-${discountLabel}</span>
                      </div>

                      <p class="admin-promo-desc">${promo.description || 'Sin descripción'}</p>

                      <div class="admin-promo-meta-list">
                        <span>• Compra mínima: <strong>${promo.minPurchase > 0 ? `$${promo.minPurchase}` : 'Sin mínimo'}</strong></span>
                        <span>• Límite: <strong>${promo.onePerUser ? '1 uso por persona' : 'Ilimitado'}</strong></span>
                        <span>• Asignado a cuentas: <strong>${promo.totalClaimed || 0}</strong></span>
                        <span>• Canjeado en órdenes: <strong>${promo.totalUsed || 0}</strong></span>
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
                            title="Editar cupón"
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
    }

    // --- TAB 1: PRODUCTOS LIST ---
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
          this.activeTab = 'promos-create';
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
}
