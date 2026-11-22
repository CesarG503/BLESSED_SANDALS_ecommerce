import { Store } from '../state/store';
import { Icons } from './Icons';
import { Toast } from './Toast';
import { Product, ColorVariant } from '../types/product';
import { formatSizeDisplay, formatFullEquivalence } from '../utils/sizeConverter';

export class QuickViewModal {
  private container: HTMLElement;
  private store: Store;
  private selectedSize: number | null = null;
  private selectedColorIndex: number = 0;
  private quantity: number = 1;

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.store.subscribe(() => this.render());

    // Permitir cerrar modal con la tecla Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.store.activeQuickViewProduct) {
        this.store.closeQuickView();
      }
    });
  }

  public render(): void {
    const product = this.store.activeQuickViewProduct;
    if (!product) {
      this.container.innerHTML = '';
      this.container.classList.remove('is-active');
      return;
    }

    try {
      // Garantizar que colors sea un arreglo válido
      const colors: ColorVariant[] = Array.isArray(product.colors) && product.colors.length > 0
        ? product.colors
        : [{ name: 'Original', hex: '#111827', image: product.image }];

      if (this.selectedColorIndex >= colors.length) {
        this.selectedColorIndex = 0;
      }

      const selectedColor = colors[this.selectedColorIndex] || colors[0];
      const isFav = this.store.isInWishlist(product.id);

      // Tallas de la variante de color si están definidas, o las tallas generales del producto
      let sizes: number[] = [];
      if (Array.isArray(selectedColor?.sizes) && selectedColor.sizes.length > 0) {
        const inStockSizes = selectedColor.sizes.filter((s: any) => s.stock > 0).map((s: any) => Number(s.size));
        sizes = inStockSizes.length > 0 ? inStockSizes : selectedColor.sizes.map((s: any) => Number(s.size));
      } else if (Array.isArray(product.sizes) && product.sizes.length > 0) {
        sizes = product.sizes;
      } else {
        sizes = [38, 39, 40, 41, 42, 43, 44];
      }

      if (!this.selectedSize || !sizes.includes(this.selectedSize)) {
        this.selectedSize = sizes[0] || 40;
      }

      // Precio según la variante seleccionada
      const displayPrice = selectedColor?.price ?? product.price;
      const displayOriginalPrice = selectedColor?.originalPrice !== undefined ? selectedColor.originalPrice : product.originalPrice;

      // Galería propia de la variante de color seleccionada
      const gallery: string[] = Array.isArray(selectedColor?.gallery) && selectedColor.gallery.length > 0
        ? selectedColor.gallery
        : (selectedColor?.image
            ? [selectedColor.image]
            : (Array.isArray(product.gallery) && product.gallery.length > 0
                ? product.gallery
                : (product.image ? [product.image] : [])));

      const currentImg = gallery[0] || selectedColor?.image || product.image;

      this.container.classList.add('is-active');
      this.container.innerHTML = `
        <div class="modal-backdrop" id="quickview-backdrop"></div>
        <div class="modal-dialog animate-scale-up" role="dialog" aria-modal="true">
          <button class="modal-close-btn" id="quickview-close-btn" aria-label="Cerrar modal">
            ${Icons.close('w-6 h-6')}
          </button>

          <div class="quickview-content-grid">
            <!-- GALERÍA DE IMÁGENES -->
            <div class="quickview-gallery">
              <div class="quickview-main-image-wrap">
                <img src="${currentImg}" alt="${product.name}" class="quickview-main-img" id="quickview-featured-img" />
                ${
                  product.has3DModel || product.model3dUrl
                    ? `
                  <button class="btn-badge-3d" id="quickview-btn-3d" title="Ver modelo 3D">
                    ${Icons.cube3d('w-4 h-4')} Ver en 3D
                  </button>
                `
                    : ''
                }
              </div>

              <div class="quickview-thumbnails">
                ${gallery
                  .map(
                    (thumbUrl, idx) => `
                  <button class="thumb-btn ${idx === 0 ? 'is-active' : ''}" data-thumb-src="${thumbUrl}">
                    <img src="${thumbUrl}" alt="${product.name} ángulo ${idx + 1}" />
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>

            <!-- DETALLES Y COMPRA -->
            <div class="quickview-details">
              <div class="quickview-header-info">
                ${
                  product.badge
                    ? `<span class="product-badge badge-${product.badge.toLowerCase().replace(/\s+/g, '-')}">${product.badge}</span>`
                    : ''
                }
                <h2 class="quickview-title">${product.name}</h2>
                <p class="quickview-subtitle">${product.subtitle || ''}</p>

                <div class="quickview-price-rating">
                  <div class="price-box">
                    <span class="quickview-price">$${displayPrice}</span>
                    ${displayOriginalPrice ? `<span class="quickview-original-price">$${displayOriginalPrice}</span>` : ''}
                  </div>
                  <div class="quickview-rating">
                    <span class="star-icon">★</span>
                    <strong>${(product.rating || 4.8).toFixed(1)}</strong>
                    <span class="reviews-count">(${product.reviewCount || 18} opiniones)</span>
                  </div>
                </div>
              </div>

              <p class="quickview-description">${product.description || ''}</p>

              <!-- SELECTOR DE COLOR -->
              <div class="quickview-section">
                <label class="section-label">
                  Color: <strong>${selectedColor?.name || 'Estándar'}</strong>
                </label>
                <div class="quickview-color-swatches">
                  ${colors
                    .map(
                      (c, i) => `
                    <button 
                      type="button" 
                      class="qv-color-btn ${i === this.selectedColorIndex ? 'is-selected' : ''}" 
                      style="background-color: ${c.hex};" 
                      data-color-index="${i}"
                      title="${c.name}"
                    ></button>
                  `
                    )
                    .join('')}
                </div>
              </div>

              <!-- SELECTOR DE TALLA CON FORMATO ACTIVO -->
              <div class="quickview-section">
                <div class="size-header-row">
                  <label class="section-label">Seleccionar Talla (${this.store.activeSizeUnit === 'US' ? 'USA' : this.store.activeSizeUnit}):</label>
                  <span class="size-guide-link" id="btn-qv-size-guide">Guía de tallas</span>
                </div>
                <div class="quickview-sizes-grid">
                  ${sizes
                    .map(
                      (size) => `
                    <button 
                      type="button" 
                      class="qv-size-pill ${size === this.selectedSize ? 'is-selected' : ''}" 
                      data-size="${size}"
                      title="${formatFullEquivalence(size)}"
                    >
                      ${formatSizeDisplay(size, this.store.activeSizeUnit)}
                    </button>
                  `
                    )
                    .join('')}
                </div>
              </div>

              <!-- CANTIDAD Y BOTÓN AGREGAR -->
              <div class="quickview-actions-row">
                <div class="quantity-stepper">
                  <button type="button" class="btn-qty" id="qty-minus" aria-label="Menos">-</button>
                  <span class="qty-number" id="qty-display">${this.quantity}</span>
                  <button type="button" class="btn-qty" id="qty-plus" aria-label="Más">+</button>
                </div>

                <button class="btn btn-primary btn-add-bag" id="quickview-add-to-cart">
                  ${Icons.bag('w-5 h-5')} Añadir a la Bolsa
                </button>

                <button class="btn-icon-square ${isFav ? 'is-active' : ''}" id="quickview-fav-btn" title="Guardar en favoritos">
                  ${Icons.heart('w-5 h-5', isFav)}
                </button>
              </div>

              <!-- BENEFICIOS BLESSED -->
              <div class="quickview-perks">
                <div class="perk-item">
                  <span class="perk-icon">🚚</span>
                  <span>Envío express gratuito en compras superiores a $50</span>
                </div>
                <div class="perk-item">
                  <span class="perk-icon">🔄</span>
                  <span>Devolución gratuita durante 30 días sin complicaciones</span>
                </div>
                <div class="perk-item">
                  <span class="perk-icon">🛡️</span>
                  <span>Autenticidad 100% garantizada con sello Blessed Sandals</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      this.setupEvents(product, colors);
    } catch (err) {
      console.error('Error renderizando QuickViewModal:', err);
      this.container.classList.remove('is-active');
      this.container.innerHTML = '';
    }
  }

  private setupEvents(product: Product, colors: ColorVariant[]): void {
    // Cerrar modal
    const closeBtn = this.container.querySelector('#quickview-close-btn');
    const backdrop = this.container.querySelector('#quickview-backdrop');
    const closeModal = () => this.store.closeQuickView();

    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);

    // Selección de Color
    this.container.querySelectorAll('.qv-color-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedColorIndex = parseInt((btn as HTMLElement).dataset.colorIndex || '0', 10);
        this.render();
      });
    });

    // Selección de Talla
    this.container.querySelectorAll('.qv-size-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedSize = parseFloat((btn as HTMLElement).dataset.size || '40');
        this.container.querySelectorAll('.qv-size-pill').forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
      });
    });

    // Cambio de miniatura
    this.container.querySelectorAll('.thumb-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const src = (btn as HTMLElement).dataset.thumbSrc;
        const mainImg = this.container.querySelector('#quickview-featured-img') as HTMLImageElement | null;
        if (mainImg && src) {
          mainImg.src = src;
          this.container.querySelectorAll('.thumb-btn').forEach((b) => b.classList.remove('is-active'));
          btn.classList.add('is-active');
        }
      });
    });

    // Cantidad
    const qtyDisplay = this.container.querySelector('#qty-display');
    this.container.querySelector('#qty-minus')?.addEventListener('click', () => {
      if (this.quantity > 1) {
        this.quantity -= 1;
        if (qtyDisplay) qtyDisplay.textContent = this.quantity.toString();
      }
    });

    this.container.querySelector('#qty-plus')?.addEventListener('click', () => {
      if (this.quantity < 10) {
        this.quantity += 1;
        if (qtyDisplay) qtyDisplay.textContent = this.quantity.toString();
      }
    });

    // Añadir a la bolsa
    this.container.querySelector('#quickview-add-to-cart')?.addEventListener('click', () => {
      if (!this.selectedSize) {
        Toast.show('Por favor selecciona una talla antes de continuar', 'Talla requerida', 'warning');
        return;
      }

      const color = colors[this.selectedColorIndex] || colors[0];
      const displayPrice = color?.price ?? product.price;
      const displayOriginalPrice = color?.originalPrice !== undefined ? color.originalPrice : product.originalPrice;
      const currentImg = (color?.gallery && color.gallery.length > 0 ? color.gallery[0] : color?.image) || product.image;

      const customProduct = {
        ...product,
        price: displayPrice,
        originalPrice: displayOriginalPrice,
        image: currentImg
      };
      for (let i = 0; i < this.quantity; i++) {
        this.store.addToCart(customProduct, this.selectedSize, color?.name);
      }

      Toast.show(
        `Se añadieron ${this.quantity}x ${product.name} (Talla ${this.selectedSize}) a tu bolsa`,
        '¡Añadido con éxito!',
        'success'
      );

      this.store.closeQuickView();
      this.store.toggleCart(true);
    });

    // Favoritos
    this.container.querySelector('#quickview-fav-btn')?.addEventListener('click', (e) => {
      const added = this.store.toggleWishlist(product);
      const btn = e.currentTarget as HTMLElement;
      if (added) {
        btn.classList.add('is-active');
        btn.innerHTML = Icons.heart('w-5 h-5', true);
        Toast.show(`${product.name} guardado en favoritos`, 'Lista de Deseos', 'favorite');
      } else {
        btn.classList.remove('is-active');
        btn.innerHTML = Icons.heart('w-5 h-5', false);
        Toast.show(`${product.name} eliminado de favoritos`, 'Lista de Deseos', 'info');
      }
    });

    // 3D Viewer trigger
    this.container.querySelector('#quickview-btn-3d')?.addEventListener('click', () => {
      this.store.closeQuickView();
      this.store.open3DViewer(product);
    });
  }
}
