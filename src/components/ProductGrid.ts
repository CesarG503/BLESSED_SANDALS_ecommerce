import { Store } from '../state/store';
import { ProductCard } from './ProductCard';
import { Icons } from './Icons';

export class ProductGrid {
  private container: HTMLElement;
  private store: Store;
  private visibleCount: number = 9;

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.store.subscribe(() => this.render());
  }

  public render(): void {
    const products = this.store.filteredProducts;
    const loading = this.store.loading;
    const totalCount = products.length;
    const currentSort = this.store.filters.sortBy;

    const visibleProducts = products.slice(0, this.visibleCount);
    const hasMore = visibleProducts.length < totalCount;

    this.container.innerHTML = `
      <div class="catalog-main-area">
        <!-- BREADCRUMBS -->
        <nav class="catalog-breadcrumbs" aria-label="Navegación de migas de pan">
          <a href="#" class="crumb-link" id="crumb-home">INICIO</a>
          <span class="crumb-sep">/</span>
          <span class="crumb-current">CALZADO Y SANDALIAS</span>
        </nav>

        <!-- ENCABEZADO DEL CATÁLOGO (TÍTULO Y ORDENAMIENTO) -->
        <div class="catalog-header-bar">
          <div class="catalog-title-wrap">
            <h2 class="catalog-title">CALZADO & SANDALIAS</h2>
            <span class="catalog-count">(${totalCount})</span>
          </div>

          <div class="catalog-controls">
            <!-- BOTÓN MÓVIL PARA ABRIR FILTROS -->
            <button class="btn-mobile-filters" id="btn-open-mobile-filters">
              ${Icons.sliders('w-4 h-4')} Filtros
            </button>

            <!-- DROPDOWN DE ORDENAR -->
            <div class="sort-dropdown-wrap">
              <label for="catalog-sort-select" class="sort-label">ORDENAR POR</label>
              <div class="select-styled-wrap">
                <select id="catalog-sort-select" class="sort-select">
                  <option value="featured" ${currentSort === 'featured' ? 'selected' : ''}>Destacados</option>
                  <option value="newest" ${currentSort === 'newest' ? 'selected' : ''}>Más Nuevos</option>
                  <option value="price-asc" ${currentSort === 'price-asc' ? 'selected' : ''}>Precio: Menor a Mayor</option>
                  <option value="price-desc" ${currentSort === 'price-desc' ? 'selected' : ''}>Precio: Mayor a Menor</option>
                  <option value="rating" ${currentSort === 'rating' ? 'selected' : ''}>Mejor Calificados</option>
                </select>
                <span class="select-arrow">${Icons.chevronDown()}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- LISTA DE PRODUCTOS O ESTADO DE CARGA -->
        ${
          loading
            ? this.renderSkeletons()
            : totalCount === 0
            ? this.renderEmptyState()
            : `
              <div class="products-grid-container" id="products-grid">
                ${visibleProducts.map((p, idx) => new ProductCard(p).render(idx)).join('')}
              </div>

              ${
                hasMore
                  ? `
                <div class="show-more-wrapper">
                  <button class="btn-show-more" id="btn-show-more">
                    MOSTRAR MÁS
                  </button>
                  <p class="show-more-count">Mostrando ${visibleProducts.length} de ${totalCount} productos</p>
                </div>
              `
                  : `
                <div class="catalog-end-note">
                  <p>Has visto todos los ${totalCount} productos disponibles.</p>
                </div>
              `
              }
            `
        }
      </div>
    `;

    this.setupEvents();
  }

  private renderSkeletons(): string {
    return `
      <div class="products-grid-container">
        ${Array.from({ length: 6 })
          .map(
            () => `
          <div class="product-card skeleton-card">
            <div class="skeleton-img shimmer"></div>
            <div class="skeleton-text shimmer" style="width: 70%; height: 16px; margin: 12px 0 8px;"></div>
            <div class="skeleton-text shimmer" style="width: 40%; height: 12px; margin-bottom: 8px;"></div>
            <div class="skeleton-text shimmer" style="width: 25%; height: 18px;"></div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  private renderEmptyState(): string {
    return `
      <div class="catalog-empty-state animate-fade-in">
        <div class="empty-icon-wrap">
          ${Icons.sliders('w-12 h-12')}
        </div>
        <h3>No encontramos productos que coincidan</h3>
        <p>Prueba ajustando los filtros de precio, talla o categoría.</p>
        <button class="btn btn-primary" id="btn-empty-reset">
          Restablecer todos los filtros
        </button>
      </div>
    `;
  }

  private setupEvents(): void {
    const gridContainer = this.container.querySelector('#products-grid') as HTMLElement | null;
    if (gridContainer) {
      ProductCard.attachListeners(gridContainer);
    }

    // Ordenar selector
    const sortSelect = this.container.querySelector('#catalog-sort-select') as HTMLSelectElement | null;
    sortSelect?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      this.store.setFilter('sortBy', val as any);
    });

    // Mostrar Más
    const showMoreBtn = this.container.querySelector('#btn-show-more');
    showMoreBtn?.addEventListener('click', () => {
      this.visibleCount += 6;
      this.render();
    });

    // Reset desde estado vacío
    this.container.querySelector('#btn-empty-reset')?.addEventListener('click', () => {
      this.store.resetFilters();
    });

    // Abrir filtros en móvil
    this.container.querySelector('#btn-open-mobile-filters')?.addEventListener('click', () => {
      this.store.toggleMobileFilters(true);
    });

    // Breadcrumb home
    this.container.querySelector('#crumb-home')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.store.resetFilters();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}
