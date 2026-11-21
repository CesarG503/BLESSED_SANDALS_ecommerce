import { Store } from './state/store';
import { Header } from './components/Header';
import { CircularShowcase } from './components/CircularShowcase';
import { FilterSidebar } from './components/FilterSidebar';
import { ProductGrid } from './components/ProductGrid';
import { QuickViewModal } from './components/QuickViewModal';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { SearchModal } from './components/SearchModal';
import { PromoModal } from './components/PromoModal';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { Model3DModal } from './components/Model3DModal';
import { HorseShowcase } from './components/HorseShowcase';
import { Footer } from './components/Footer';
import { Icons } from './components/Icons';



document.addEventListener('DOMContentLoaded', () => {
  const store = Store.getInstance();

  // Inicialización de componentes modulares
  new Header('header-app');
  new CircularShowcase('hero-app');
  new FilterSidebar('filters-sidebar-app');
  new ProductGrid('product-grid-app');
  new QuickViewModal('quickview-modal-app');
  new CartDrawer('cart-drawer-app');
  new WishlistDrawer('wishlist-drawer-app');
  new SearchModal('search-modal-app');
  new PromoModal('promo-modal-app');
  new AuthModal('auth-modal-app');
  new ProfileModal('profile-modal-app');
  new Model3DModal('modal-3d-app');
  new HorseShowcase('horse-showcase-app');
  new Footer('footer-app');

  // Inicialización de drawer de filtros móvil
  setupMobileFilters(store);

  // Carga inicial de productos (simulación asíncrona de BD)
  store.loadProducts();
});

/**
 * Gestiona el panel móvil de filtros clonando los filtros para pantallas pequeñas
 */
function setupMobileFilters(store: Store): void {
  const mobileContainer = document.getElementById('mobile-filters-drawer-app');
  if (!mobileContainer) return;

  const renderMobileFilters = () => {
    if (store.isMobileFiltersOpen) {
      mobileContainer.classList.add('is-open');
      document.body.style.overflow = 'hidden';

      mobileContainer.innerHTML = `
        <div class="drawer-backdrop" id="mobile-filters-backdrop"></div>
        <div class="mobile-filters-panel animate-slide-in-right">
          <div class="mobile-filters-header">
            <h3>Filtros y Orden</h3>
            <button class="drawer-close-btn" id="mobile-filters-close" aria-label="Cerrar filtros">
              ${Icons.close('w-6 h-6')}
            </button>
          </div>
          <div id="mobile-filters-content"></div>
          <div style="margin-top: 24px;">
            <button class="btn btn-primary" id="btn-apply-mobile-filters" style="width: 100%;">
              Ver Productos (${store.filteredProducts.length})
            </button>
          </div>
        </div>
      `;

      // Montamos una instancia de FilterSidebar en el drawer móvil
      new FilterSidebar('mobile-filters-content');

      const close = () => store.toggleMobileFilters(false);
      mobileContainer.querySelector('#mobile-filters-close')?.addEventListener('click', close);
      mobileContainer.querySelector('#mobile-filters-backdrop')?.addEventListener('click', close);
      mobileContainer.querySelector('#btn-apply-mobile-filters')?.addEventListener('click', close);
    } else {
      mobileContainer.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  };

  store.subscribe(renderMobileFilters);
}
