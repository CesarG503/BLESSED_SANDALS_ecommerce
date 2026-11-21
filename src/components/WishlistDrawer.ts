import { Store } from '../state/store';
import { Icons } from './Icons';
import { Toast } from './Toast';

export class WishlistDrawer {
  private container: HTMLElement;
  private store: Store;
  private isClosing: boolean = false;
  private wasOpen: boolean = false;

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.store.subscribe(() => this.render());
    this.setupGlobalListeners();
  }

  private setupGlobalListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.store.isWishlistOpen && !this.isClosing) {
        this.closeDrawer();
      }
    });
  }

  public closeDrawer(): void {
    if (this.isClosing) return;
    this.isClosing = true;
    this.container.classList.remove('is-open');
    this.container.classList.add('is-closing');

    setTimeout(() => {
      this.isClosing = false;
      this.wasOpen = false;
      this.container.classList.remove('is-closing');
      document.body.style.overflow = '';
      this.store.toggleWishlistDrawer(false);
    }, 280);
  }

  public render(): void {
    const isOpen = this.store.isWishlistOpen;
    const wishlist = this.store.wishlist;

    if (isOpen) {
      this.wasOpen = true;
      this.isClosing = false;
      this.container.classList.remove('is-closing');
      this.container.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    } else {
      if (this.wasOpen && !this.isClosing) {
        this.closeDrawer();
        return;
      }
      if (!this.isClosing) {
        this.container.classList.remove('is-open', 'is-closing');
        document.body.style.overflow = '';
        return;
      }
      return;
    }

    this.container.innerHTML = `
      <div class="drawer-backdrop" id="wishlist-drawer-backdrop"></div>
      <aside class="drawer-panel" role="dialog" aria-modal="true">
        <!-- CABECERA -->
        <div class="drawer-header">
          <div class="drawer-title-row">
            <h3 class="drawer-title">Tus Favoritos</h3>
            <span class="drawer-badge">${wishlist.length} guardados</span>
          </div>
          <button class="drawer-close-btn" id="wishlist-drawer-close" aria-label="Cerrar favoritos">
            ${Icons.close('w-6 h-6')}
          </button>
        </div>

        <!-- CUERPO -->
        <div class="drawer-body">
          ${
            wishlist.length === 0
              ? `
              <div class="drawer-empty-state">
                <div class="empty-icon-box">
                  ${Icons.heart('w-12 h-12')}
                </div>
                <h4>No tienes favoritos aún</h4>
                <p>Haz clic en el corazón de cualquier calzado para guardarlo aquí.</p>
                <button class="btn btn-primary" id="btn-wishlist-explore">
                  Ver Colección
                </button>
              </div>
            `
              : `
              <ul class="cart-items-list">
                ${wishlist
                  .map(
                    (item) => `
                  <li class="cart-item-card animate-fade-in" data-prod-id="${item.productId}">
                    <img src="${item.product.image}" alt="${item.product.name}" class="cart-item-img" />
                    
                    <div class="cart-item-details">
                      <div class="cart-item-head">
                        <h5 class="cart-item-name">${item.product.name}</h5>
                        <button class="cart-item-remove" data-action="remove-fav" data-id="${item.productId}" title="Quitar de favoritos">
                          ${Icons.close('w-4 h-4')}
                        </button>
                      </div>

                      <p class="cart-item-meta">${item.product.subtitle}</p>

                      <div class="cart-item-bottom">
                        <span class="cart-item-price">$${item.product.price}</span>
                        <button class="btn-text-action" data-action="move-to-cart" data-id="${item.productId}">
                          + Añadir a la Bolsa
                        </button>
                      </div>
                    </div>
                  </li>
                `
                  )
                  .join('')}
              </ul>
            `
          }
        </div>
      </aside>
    `;

    this.setupEvents();
  }

  private setupEvents(): void {
    const closeBtn = this.container.querySelector('#wishlist-drawer-close');
    const backdrop = this.container.querySelector('#wishlist-drawer-backdrop');

    closeBtn?.addEventListener('click', () => this.closeDrawer());
    backdrop?.addEventListener('click', () => this.closeDrawer());

    this.container.querySelector('#btn-wishlist-explore')?.addEventListener('click', () => {
      this.closeDrawer();
      setTimeout(() => {
        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    });

    // Quitar de favoritos
    this.container.querySelectorAll('[data-action="remove-fav"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        const prod = this.store.products.find((p) => p.id === id) || this.store.wishlist.find((w) => w.productId === id)?.product;
        if (prod) {
          this.store.toggleWishlist(prod);
          Toast.show(`${prod.name} retirado de tus favoritos`, 'Favoritos', 'info');
        }
      });
    });

    // Mover a bolsa
    this.container.querySelectorAll('[data-action="move-to-cart"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        const prod = this.store.products.find((p) => p.id === id) || this.store.wishlist.find((w) => w.productId === id)?.product;
        if (prod) {
          const defaultSize = prod.sizes?.[0] || 9;
          const defaultColor = prod.colors?.[0] || { name: 'Original', hex: '#8B5A2B', image: prod.image };
          this.store.addToCart(prod, defaultSize, defaultColor.name);
          Toast.show(`${prod.name} añadido a tu bolsa`, '¡Añadido!', 'success');
          this.closeDrawer();
          setTimeout(() => {
            this.store.toggleCart(true);
          }, 320);
        }
      });
    });
  }
}
