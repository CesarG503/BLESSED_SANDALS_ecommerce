import { Store } from '../state/store';
import { ApiService } from '../services/apiService';
import { Icons } from './Icons';
import { Toast } from './Toast';

export type AdminTab =
  | 'products-list'
  | 'products-create'
  | 'promos-list'
  | 'promos-create'
  | 'minio-storage';

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
                    <th>PRODUCTO</th>
                    <th>CATEGORÍA</th>
                    <th>PRECIO</th>
                    <th>GÉNERO</th>
                    <th>STOCK POR TALLA</th>
                    <th>ESTADO</th>
                    <th style="text-align: right;">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered
                    .map((p) => {
                      const sizesText = (p.sizes || [])
                        .map((s: any) => `T${s.size}:${s.stock}`)
                        .slice(0, 5)
                        .join(' • ');

                      return `
                        <tr data-product-id="${p.id}">
                          <td>
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
                          <td>
                            <div class="table-stock-detail">
                              <strong class="stock-total-badge ${p.totalStock > 0 ? 'in' : 'out'}">${p.totalStock} pares</strong>
                              <span class="stock-sizes-pill" title="Desglose por tallas">${sizesText || 'Sin desglose'}</span>
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

    const availableSizes = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
    const existingSizesMap: Record<number, number> = {};
    if (p.sizes && Array.isArray(p.sizes)) {
      p.sizes.forEach((s: any) => {
        existingSizesMap[Number(s.size)] = Number(s.stock);
      });
    }

    return `
      <div class="admin-view-panel">
        <div class="admin-view-header">
          <div>
            <h2 class="admin-view-title">${isEdit ? `Editar: ${p.name}` : 'Agregar Nuevo Producto'}</h2>
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
            <h3 class="admin-section-heading">PRECIO Y VALOR COMERCIAL</h3>
            <div class="admin-form-grid-2">
              <div class="admin-input-group">
                <label for="prod-price">Precio de Venta ($ USD) *</label>
                <input type="number" step="0.01" min="0" id="prod-price" value="${p.price !== undefined ? p.price : ''}" placeholder="55.00" required />
              </div>

              <div class="admin-input-group">
                <label for="prod-orig-price">Precio Original Tachado ($ USD opcional)</label>
                <input type="number" step="0.01" min="0" id="prod-orig-price" value="${p.originalPrice || ''}" placeholder="Ej: 75.00 (para mostrar descuento)" />
              </div>
            </div>
          </div>

          <!-- GRUPO 3: RECURSOS VISUALES (MINIO & 3D) -->
          <div class="admin-form-section">
            <h3 class="admin-section-heading">RECURSOS MULTIMEDIA (MINIO STORAGE)</h3>
            
            <div class="admin-input-group">
              <label for="prod-image">URL de la Imagen Principal *</label>
              <div class="admin-input-with-action">
                <input type="url" id="prod-image" value="${p.image || ''}" placeholder="http://localhost:9002/ecommerce-assets/zapato.png" required />
                <button type="button" class="btn-field-action" id="btn-trigger-upload-image" title="Subir archivo directo a MinIO">
                  ${Icons.uploadCloud('w-4 h-4')}
                  <span>Subir a MinIO</span>
                </button>
              </div>
              <input type="file" id="file-hidden-image" accept="image/*" style="display: none;" />
              <div class="admin-image-preview-box" id="preview-image-box">
                ${p.image ? `<img src="${p.image}" alt="Vista previa" class="admin-preview-img" />` : '<span class="text-muted">Sin vista previa seleccionada</span>'}
              </div>
            </div>

            <div class="admin-input-group">
              <label for="prod-model3d">URL Modelo 3D Interactivo (.glb en MinIO)</label>
              <div class="admin-input-with-action">
                <input type="text" id="prod-model3d" value="${p.model3dUrl || ''}" placeholder="http://localhost:9002/ecommerce-assets/modelo.glb" />
                <button type="button" class="btn-field-action" id="btn-trigger-upload-3d" title="Subir modelo .glb directo a MinIO">
                  ${Icons.cube3d('w-4 h-4')}
                  <span>Subir .GLB</span>
                </button>
              </div>
              <input type="file" id="file-hidden-3d" accept=".glb,.gltf" style="display: none;" />
            </div>
          </div>

          <!-- GRUPO 4: TALLAS Y EXISTENCIAS -->
          <div class="admin-form-section">
            <h3 class="admin-section-heading">EXISTENCIAS POR TALLAS (STOCK)</h3>
            <p class="admin-section-sub">Define la cantidad de unidades disponibles para cada talla numérica:</p>
            <div class="admin-sizes-grid">
              ${availableSizes
                .map((size) => {
                  const stock = existingSizesMap[size] !== undefined ? existingSizesMap[size] : 15;
                  return `
                    <div class="admin-size-stock-card">
                      <span class="size-number-title">Talla ${size}</span>
                      <div class="size-input-row">
                        <label>Stock:</label>
                        <input type="number" min="0" class="input-size-stock" data-size="${size}" value="${stock}" />
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>

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

    // --- TAB 1: PRODUCTOS LIST ---
    this.container.querySelector('#btn-admin-goto-create-prod')?.addEventListener('click', () => {
      this.editingProduct = null;
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
      this.activeTab = 'products-list';
      this.updateMainContentOnly();
    });

    this.container.querySelector('#btn-cancel-prod-form')?.addEventListener('click', () => {
      this.editingProduct = null;
      this.activeTab = 'products-list';
      this.updateMainContentOnly();
    });

    // Subida de imagen a MinIO desde el formulario
    const imgFile = this.container.querySelector('#file-hidden-image') as HTMLInputElement | null;
    this.container.querySelector('#btn-trigger-upload-image')?.addEventListener('click', () => {
      imgFile?.click();
    });

    imgFile?.addEventListener('change', async () => {
      const file = imgFile.files?.[0];
      if (!file) return;

      Toast.show('Subiendo imagen a MinIO...', 'MinIO Storage', 'info');
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const uploadRes = await ApiService.uploadAssetToMinio(userId, {
          filename: file.name,
          contentType: file.type || 'image/png',
          base64
        });

        if (uploadRes.success && uploadRes.url) {
          Toast.show('¡Imagen subida a MinIO con éxito!', 'MinIO', 'success');
          const inputImg = this.container.querySelector('#prod-image') as HTMLInputElement | null;
          if (inputImg) inputImg.value = uploadRes.url;
          const previewBox = this.container.querySelector('#preview-image-box');
          if (previewBox) {
            previewBox.innerHTML = `<img src="${uploadRes.url}" alt="Vista previa" class="admin-preview-img" />`;
          }
        } else {
          Toast.show(uploadRes.message || 'Error al subir a MinIO.', 'Error', 'warning');
        }
      };
      reader.readAsDataURL(file);
    });

    // Subida de modelo 3D a MinIO desde el formulario
    const modelFile = this.container.querySelector('#file-hidden-3d') as HTMLInputElement | null;
    this.container.querySelector('#btn-trigger-upload-3d')?.addEventListener('click', () => {
      modelFile?.click();
    });

    modelFile?.addEventListener('change', async () => {
      const file = modelFile.files?.[0];
      if (!file) return;

      Toast.show('Subiendo modelo 3D a MinIO...', 'MinIO Storage', 'info');
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const uploadRes = await ApiService.uploadAssetToMinio(userId, {
          filename: file.name,
          contentType: 'model/gltf-binary',
          base64
        });

        if (uploadRes.success && uploadRes.url) {
          Toast.show('¡Modelo 3D subido a MinIO!', 'MinIO', 'success');
          const input3D = this.container.querySelector('#prod-model3d') as HTMLInputElement | null;
          if (input3D) input3D.value = uploadRes.url;
        } else {
          Toast.show(uploadRes.message || 'Error al subir modelo a MinIO.', 'Error', 'warning');
        }
      };
      reader.readAsDataURL(file);
    });

    // Submit del formulario de producto
    const prodForm = this.container.querySelector('#form-admin-product');
    prodForm?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = (this.container.querySelector('#prod-name') as HTMLInputElement)?.value.trim();
      const subtitle = (this.container.querySelector('#prod-subtitle') as HTMLInputElement)?.value.trim();
      const categoryId = (this.container.querySelector('#prod-category') as HTMLSelectElement)?.value;
      const gender = (this.container.querySelector('#prod-gender') as HTMLSelectElement)?.value;
      const badge = (this.container.querySelector('#prod-badge') as HTMLInputElement)?.value.trim() || null;
      const description = (this.container.querySelector('#prod-desc') as HTMLTextAreaElement)?.value.trim() || null;
      const price = Number((this.container.querySelector('#prod-price') as HTMLInputElement)?.value);
      const origPriceInput = (this.container.querySelector('#prod-orig-price') as HTMLInputElement)?.value;
      const originalPrice = origPriceInput ? Number(origPriceInput) : null;
      const image = (this.container.querySelector('#prod-image') as HTMLInputElement)?.value.trim();
      const model3dUrl = (this.container.querySelector('#prod-model3d') as HTMLInputElement)?.value.trim() || null;
      const inStock = (this.container.querySelector('#prod-instock') as HTMLInputElement)?.checked ?? true;
      const featured = (this.container.querySelector('#prod-featured') as HTMLInputElement)?.checked ?? false;

      // Recolectar tallas y stock
      const sizeInputs = this.container.querySelectorAll('.input-size-stock');
      const sizes: Array<{ size: number; stock: number }> = [];
      sizeInputs.forEach((inp) => {
        const size = Number((inp as HTMLElement).dataset.size);
        const stock = Number((inp as HTMLInputElement).value) || 0;
        sizes.push({ size, stock });
      });

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
            price,
            originalPrice,
            image,
            model3dUrl,
            inStock,
            featured,
            sizes
          });

          if (res.success) {
            Toast.show('Producto actualizado correctamente.', 'Inventario', 'success');
            this.editingProduct = null;
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
            price,
            originalPrice,
            image,
            model3dUrl,
            inStock,
            featured,
            sizes
          });

          if (res.success) {
            Toast.show('¡Producto creado y publicado en la tienda!', 'Inventario', 'success');
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
