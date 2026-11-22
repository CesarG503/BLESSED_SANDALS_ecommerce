import { Product } from '../types/product';
import { Store } from '../state/store';
import { Icons } from './Icons';
import { Toast } from './Toast';

export class ProductCard {
  private product: Product;
  private store: Store;

  constructor(product: Product) {
    this.product = product;
    this.store = Store.getInstance();
  }

  public render(index: number = 0): string {
    const isFav = this.store.isInWishlist(this.product.id);
    const delayStyle = `animation-delay: ${Math.min(index * 60, 600)}ms;`;

    // Swatches de colores
    const colorsHtml = this.product.colors
      .map(
        (c, i) => `
        <span 
          class="color-dot ${i === 0 ? 'is-active' : ''}" 
          style="background-color: ${c.hex};" 
          title="${c.name}"
          data-product-id="${this.product.id}"
          data-color-index="${i}"
        ></span>
      `
      )
      .join('');

    const colorCountText = `${this.product.colors.length} Color${this.product.colors.length > 1 ? 'es' : ''}`;

    return `
      <article class="product-card animate-card-fade" style="${delayStyle}" data-id="${this.product.id}">
        <!-- PARTE SUPERIOR: BADGE Y FAVORITO -->
        <div class="product-card-top">
          <div class="badge-wrapper">
            ${
              this.product.badge
                ? `<span class="product-badge badge-${this.product.badge.toLowerCase().replace(/\s+/g, '-')}">${this.product.badge}</span>`
                : ''
            }
          </div>
          <button 
            type="button" 
            class="wishlist-toggle-btn ${isFav ? 'is-active' : ''}" 
            data-id="${this.product.id}" 
            aria-label="Agregar a favoritos"
          >
            ${Icons.heart('w-5 h-5', isFav)}
          </button>
        </div>

        <!-- IMAGEN PRINCIPAL CON HOVER EFECTO -->
        <div class="product-image-container" data-action="quickview" data-id="${this.product.id}">
          <img 
            src="${this.product.image}" 
            alt="${this.product.name}" 
            class="product-card-img" 
            id="img-${this.product.id}"
            loading="lazy"
          />

          ${
            this.product.has3DModel
              ? `
              <button class="btn-badge-3d" data-action="3dview" data-id="${this.product.id}" title="Ver modelo 3D">
                ${Icons.cube3d('w-4 h-4')} 3D
              </button>
            `
              : ''
          }

          <!-- BOTÓN RÁPIDO DE ACCIÓN -->
          <div class="card-overlay-actions">
            <button class="btn-quick-view" data-action="quickview" data-id="${this.product.id}">
              Vista Rápida
            </button>
          </div>
        </div>

        <!-- INFORMACIÓN DEL PRODUCTO -->
        <div class="product-info">
          <h4 class="product-title" data-action="quickview" data-id="${this.product.id}">
            ${this.product.name}
          </h4>
          <p class="product-subtitle">${this.product.subtitle}</p>
          <div class="product-colors-info">
            <span class="colors-count">${colorCountText}</span>
            <div class="color-dots-group">
              ${colorsHtml}
            </div>
          </div>

          <div class="product-price-row">
            <div class="price-box">
              <span class="product-price">$${this.product.price}</span>
              ${
                this.product.originalPrice
                  ? `<span class="product-original-price">$${this.product.originalPrice}</span>`
                  : ''
              }
            </div>
            
            <button class="btn-card-add" data-action="quick-add" data-id="${this.product.id}" title="Agregar a la bolsa">
              + Agregar
            </button>
          </div>
        </div>
      </article>
    `;
  }

  public static attachListeners(container: HTMLElement): void {
    const store = Store.getInstance();

    // Toggle Wishlist
    container.querySelectorAll('.wishlist-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id;
        const prod = store.products.find((p) => p.id === id);
        if (prod) {
          const added = store.toggleWishlist(prod);
          if (added) {
            btn.classList.add('is-active', 'heart-pop');
            btn.innerHTML = Icons.heart('w-5 h-5', true);
            Toast.show(`${prod.name} se agregó a tus favoritos`, 'Lista de Deseos', 'favorite');
          } else {
            btn.classList.remove('is-active', 'heart-pop');
            btn.innerHTML = Icons.heart('w-5 h-5', false);
            Toast.show(`${prod.name} se quitó de favoritos`, 'Lista de Deseos', 'info');
          }
        }
      });
    });

    // Quick View
    container.querySelectorAll('[data-action="quickview"]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.id;
        const prod = store.products.find((p) => p.id === id);
        if (prod) {
          store.openQuickView(prod);
        }
      });
    });

    // 3D View
    container.querySelectorAll('[data-action="3dview"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (el as HTMLElement).dataset.id;
        const prod = store.products.find((p) => p.id === id);
        if (prod) {
          store.open3DViewer(prod);
        }
      });
    });

    // Quick Add (agrega talla estándar por defecto e interactúa de inmediato)
    container.querySelectorAll('[data-action="quick-add"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parentCard = btn.closest('.product-card');
        const id = (btn as HTMLElement).dataset.id;
        const prod = store.products.find((p) => p.id === id);
        if (prod) {
          const activeDot = parentCard?.querySelector('.color-dot.is-active') as HTMLElement | null;
          const colorIdx = activeDot ? parseInt(activeDot.dataset.colorIndex || '0', 10) : 0;
          const selectedColor = prod.colors[colorIdx];
          const displayPrice = selectedColor?.price ?? prod.price;
          const displayOrigPrice = selectedColor?.originalPrice !== undefined ? selectedColor.originalPrice : prod.originalPrice;

          const customProduct = {
            ...prod,
            price: displayPrice,
            originalPrice: displayOrigPrice,
            image: selectedColor?.image || prod.image
          };

          const defaultSize = prod.sizes[0] || 40;
          store.addToCart(customProduct, defaultSize, selectedColor?.name);
          Toast.show(`${prod.name} (Talla ${defaultSize}) se añadió a tu bolsa`, '¡Añadido al Carrito!', 'success');
        }
      });
    });

    // Color Swatches interaction (cambia la foto y el precio de la tarjeta al hacer click)
    container.querySelectorAll('.color-dot').forEach((dot) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const parentCard = dot.closest('.product-card');
        if (!parentCard) return;

        const prodId = (dot as HTMLElement).dataset.productId;
        const colorIdx = parseInt((dot as HTMLElement).dataset.colorIndex || '0', 10);
        const prod = store.products.find((p) => p.id === prodId);

        if (prod && prod.colors[colorIdx]) {
          const selectedColor = prod.colors[colorIdx];
          const imgEl = parentCard.querySelector('.product-card-img') as HTMLImageElement | null;
          if (imgEl && selectedColor.image) {
            imgEl.style.opacity = '0.5';
            setTimeout(() => {
              imgEl.src = selectedColor.image;
              imgEl.style.opacity = '1';
            }, 150);
          }

          // Actualizar precio de la tarjeta según la variante seleccionada
          const displayPrice = selectedColor.price ?? prod.price;
          const displayOrigPrice = selectedColor.originalPrice !== undefined ? selectedColor.originalPrice : prod.originalPrice;
          const priceEl = parentCard.querySelector('.product-price') as HTMLElement | null;
          if (priceEl) priceEl.textContent = `$${displayPrice}`;

          const origPriceEl = parentCard.querySelector('.product-original-price') as HTMLElement | null;
          if (origPriceEl) {
            if (displayOrigPrice) {
              origPriceEl.textContent = `$${displayOrigPrice}`;
              origPriceEl.style.display = '';
            } else {
              origPriceEl.style.display = 'none';
            }
          }

          parentCard.querySelectorAll('.color-dot').forEach((d) => d.classList.remove('is-active'));
          dot.classList.add('is-active');
        }
      });
    });
  }
}
