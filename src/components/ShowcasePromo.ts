import { Store } from '../state/store';
import { Icons } from './Icons';
import { Toast } from './Toast';
import { Product } from '../types/product';
import { MOCK_PRODUCTS } from '../data/mockProducts';

interface ShowcaseProductItem {
  threshold: number;
  product: Product;
  badgeLabel: string;
}

/**
 * ============================================================================
 * COMPONENTE SHOWCASE PROMO (RESERVADO PARA USO FUTURO)
 * ============================================================================
 * Versión modular inspirada en el showcase de scroll pinning pero sin animación de caballo.
 * Mantiene la fijación inteligente (Pin Controller), progreso de scroll y la revelación
 * dinámica en 2D (horizontal y vertical) de productos exclusivos con interacción completa.
 * ============================================================================
 */
export class ShowcasePromo {
  private container: HTMLElement;
  private store: Store;

  // Estado de Scroll y Animación Fluida
  private currentProgress: number = 0;
  private targetProgress: number = 0;
  private animationFrameId: number | null = null;
  private pinState: 'before' | 'pinned' | 'after' = 'before';

  // Productos dinámicos revelados por scroll
  private showcaseProducts: ShowcaseProductItem[] = [];

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.initProducts();
    this.render();
    this.setupScrollEvents();
    this.startLoop();
  }

  /**
   * Carga los 4 productos estelares a mostrar en la experiencia promocional
   */
  private initProducts(): void {
    const p1 = MOCK_PRODUCTS.find((p) => p.id === 'prod-003') || MOCK_PRODUCTS[0]; // Blessed Slide Classic
    const p2 = MOCK_PRODUCTS.find((p) => p.id === 'prod-001') || MOCK_PRODUCTS[1]; // Jordan 1 Retro
    const p3 = MOCK_PRODUCTS.find((p) => p.id === 'prod-007') || MOCK_PRODUCTS[2]; // Sandal Leather Luxe
    const p4 = MOCK_PRODUCTS.find((p) => p.id === 'prod-002') || MOCK_PRODUCTS[3]; // Jordan 11 Retro

    this.showcaseProducts = [
      { threshold: 0.14, product: p1, badgeLabel: 'MÁS VENDIDO' },
      { threshold: 0.38, product: p2, badgeLabel: 'EDICIÓN PROMO' },
      { threshold: 0.62, product: p3, badgeLabel: 'PIEL PREMIUM' },
      { threshold: 0.84, product: p4, badgeLabel: 'EXCLUSIVO 2026' }
    ];
  }

  /**
   * Renderiza la estructura base del componente con runway para scroll pinning
   */
  private render(): void {
    this.container.innerHTML = `
      <section class="horse-showcase-section promo-showcase-section" id="promo-showcase-section">
        <!-- RUNWAY DE SCROLL PARA PINNING Y CONTROL BIDIRECCIONAL -->
        <div class="horse-scroll-runway promo-scroll-runway" id="promo-runway">
          <div class="horse-sticky-viewport is-before promo-sticky-viewport" id="promo-viewport">
            
            <!-- MARCA DE AGUA AMBIENTAL DE FONDO -->
            <div class="horse-watermark-bg" aria-hidden="true">BLESSED PROMO</div>
            <div class="horse-ambient-glow" aria-hidden="true"></div>

            <!-- ENCABEZADO Y PROGRESO -->
            <div class="horse-header-box">
              <div class="horse-badge-pill">
                <span class="horse-live-pulse"></span>
                <span>COLECCIÓN EXCLUSIVA • LANZAMIENTO LIMITADO</span>
              </div>
              <h2 class="horse-title">SILUETAS ICÓNICAS & EDICIÓN ESPECIAL</h2>
              <p class="horse-subtitle">
                Desplaza el scroll hacia abajo para explorar la serie exclusiva. Los modelos se revelan dinámicamente en tu recorrido.
              </p>

              <!-- BARRA Y MÉTRICAS DE PROGRESO -->
              <div class="horse-metric-container">
                <div class="horse-metric-track">
                  <div class="horse-metric-bar" id="promo-metric-bar"></div>
                </div>
                <div class="horse-metric-labels">
                  <span class="horse-metric-percent" id="promo-metric-percent">0%</span>
                  <span class="horse-metric-frame" id="promo-metric-status">EXPLORAR COLECCIÓN</span>
                </div>
              </div>
            </div>

            <!-- ESCENARIO PRINCIPAL CON PRODUCTOS DISTRIBUIDOS EN 2D -->
            <div class="horse-arena promo-arena" id="promo-arena">
              
              <div class="horse-products-trail promo-products-trail" id="promo-products-trail">
                ${this.showcaseProducts
                  .map(
                    (item, idx) => `
                  <div 
                    class="horse-product-card ${idx % 2 === 0 ? 'horse-card-upper' : 'horse-card-lower'}" 
                    id="promo-card-${idx}" 
                    data-index="${idx}"
                    data-threshold="${item.threshold}"
                  >
                    <div class="h-card-inner">
                      <!-- CABECERA DE LA TARJETA: BADGE Y FAVORITO -->
                      <div class="h-card-top">
                        <span class="h-card-badge">${item.badgeLabel}</span>
                        <button 
                          type="button" 
                          class="h-card-icon-btn btn-wishlist-action ${this.store.isInWishlist(item.product.id) ? 'is-active' : ''}" 
                          data-action="wishlist" 
                          data-prod-id="${item.product.id}" 
                          title="Añadir a favoritos" 
                          aria-label="Favorito"
                        >
                          ${Icons.heart('w-4 h-4', this.store.isInWishlist(item.product.id))}
                        </button>
                      </div>

                      <!-- IMAGEN CON CLICK PARA VISTA RÁPIDA -->
                      <div class="h-card-img-wrap" data-action="quickview" data-prod-id="${item.product.id}" title="Ver detalles">
                        <img src="${item.product.image}" alt="${item.product.name}" class="h-card-img" draggable="false" />
                      </div>

                      <!-- INFORMACIÓN DEL PRODUCTO -->
                      <div class="h-card-info">
                        <h4 class="h-card-title" data-action="quickview" data-prod-id="${item.product.id}">${item.product.name}</h4>
                        <p class="h-card-subtitle">${item.product.subtitle}</p>
                      </div>

                      <!-- FILA INFERIOR: PRECIO, VISTA RÁPIDA Y AÑADIR -->
                      <div class="h-card-bottom">
                        <div class="h-card-price-box">
                          <span class="h-card-price">$${item.product.price}</span>
                          <span class="h-card-stock">● En Stock</span>
                        </div>

                        <div class="h-card-actions">
                          <button 
                            type="button" 
                            class="h-card-icon-btn btn-quickview-action" 
                            data-action="quickview" 
                            data-prod-id="${item.product.id}" 
                            title="Vista rápida" 
                            aria-label="Vista rápida"
                          >
                            ${Icons.eye('w-4 h-4')}
                          </button>
                          <button 
                            type="button" 
                            class="h-card-btn-add" 
                            data-action="add" 
                            data-prod-id="${item.product.id}" 
                            title="Añadir a la bolsa" 
                            aria-label="Añadir"
                          >
                            <span class="h-btn-plus">+</span>
                            <span class="h-btn-label">Añadir</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>

            </div>

          </div>
        </div>
      </section>
    `;

    this.wireCardEvents();
  }

  /**
   * Conecta los eventos de clic en los botones de productos (Favoritos, QuickView, Añadir)
   */
  private wireCardEvents(): void {
    // Favoritos
    this.container.querySelectorAll('[data-action="wishlist"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const prodId = (btn as HTMLElement).dataset.prodId;
        const item = this.showcaseProducts.find((p) => p.product.id === prodId);
        if (!item) return;

        const isFav = this.store.toggleWishlist(item.product);
        btn.classList.toggle('is-active', isFav);
        btn.innerHTML = Icons.heart('w-4 h-4', isFav);
        Toast.show(
          isFav ? `¡${item.product.name} guardado en tus favoritos!` : `Eliminado de favoritos`,
          isFav ? 'Favoritos' : 'Información',
          isFav ? 'success' : 'info'
        );
      });
    });

    // Vista Rápida
    this.container.querySelectorAll('[data-action="quickview"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const prodId = (el as HTMLElement).dataset.prodId;
        const item = this.showcaseProducts.find((p) => p.product.id === prodId);
        if (item) {
          this.store.openQuickView(item.product);
        }
      });
    });

    // Añadir al Carrito
    this.container.querySelectorAll('[data-action="add"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const prodId = (btn as HTMLElement).dataset.prodId;
        const item = this.showcaseProducts.find((p) => p.product.id === prodId);
        if (!item) return;

        this.store.addToCart(item.product, 40);
        this.store.toggleCart(true);
        Toast.show(`¡${item.product.name} añadido a tu bolsa de compras!`, 'Añadido con Éxito', 'success');
      });
    });
  }

  /**
   * Controlador profesional de anclaje (Pin Controller de 3 Estados):
   * 1. 'is-before': Antes de llegar a la sección (position: absolute; top: 0).
   * 2. 'is-pinned': FIJO (position: fixed; top: 0) en pantalla mientras avanza el scroll.
   * 3. 'is-after': Al llegar al footer, se queda asentado arriba del footer sin ser fixed (position: absolute; bottom: 0).
   */
  private setupScrollEvents(): void {
    const runway = this.container.querySelector('#promo-runway') as HTMLElement | null;
    const viewport = this.container.querySelector('#promo-viewport') as HTMLElement | null;
    if (!runway || !viewport) return;

    const onScroll = () => {
      const rect = runway.getBoundingClientRect();
      const windowH = window.innerHeight;
      const maxScroll = rect.height - windowH;
      if (maxScroll <= 0) return;

      if (rect.top > 0) {
        if (this.pinState !== 'before') {
          this.pinState = 'before';
          viewport.classList.remove('is-pinned', 'is-after');
          viewport.classList.add('is-before');
        }
        this.targetProgress = 0;
      } else if (rect.bottom >= windowH) {
        if (this.pinState !== 'pinned') {
          this.pinState = 'pinned';
          viewport.classList.remove('is-before', 'is-after');
          viewport.classList.add('is-pinned');
        }
        const scrolled = -rect.top;
        const progress = Math.max(0, Math.min(1, scrolled / maxScroll));
        this.targetProgress = progress;
      } else {
        if (this.pinState !== 'after') {
          this.pinState = 'after';
          viewport.classList.remove('is-before', 'is-pinned');
          viewport.classList.add('is-after');
        }
        this.targetProgress = 1;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  /**
   * Bucle de animación suave con interpolación (Lerp) para movimiento de 60fps
   */
  private startLoop(): void {
    const loop = () => {
      const diff = this.targetProgress - this.currentProgress;

      if (Math.abs(diff) > 0.0004) {
        this.currentProgress += diff * 0.16;
      } else {
        this.currentProgress = this.targetProgress;
      }

      this.updateScene(this.currentProgress);

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Actualiza el progreso de scroll y la revelación de productos en ejes X e Y
   */
  private updateScene(progress: number): void {
    // 1. Actualizar barra de progreso y métricas
    const percentEl = this.container.querySelector('#promo-metric-percent');
    const barEl = this.container.querySelector('#promo-metric-bar') as HTMLElement | null;

    if (percentEl) percentEl.textContent = `${Math.round(progress * 100)}%`;
    if (barEl) barEl.style.width = `${(progress * 100).toFixed(1)}%`;

    // 2. Revelación dinámica de los productos en HORIZONTAL y VERTICAL
    const trailEl = this.container.querySelector('#promo-products-trail') as HTMLElement | null;
    const isMobile = window.innerWidth < 992;

    this.showcaseProducts.forEach((item, idx) => {
      const card = this.container.querySelector(`#promo-card-${idx}`) as HTMLElement | null;
      if (!card) return;

      const isUpper = idx % 2 === 0;

      if (progress >= item.threshold) {
        const revealFactor = Math.min(1, Math.max(0, (progress - item.threshold) / 0.08));
        const ease = 1 - Math.pow(1 - revealFactor, 3);

        const deltaX = (1 - ease) * -45;
        const deltaY = isUpper ? (1 - ease) * 55 : (1 - ease) * 50;
        const scale = 0.78 + ease * 0.22;
        const rotate = isUpper ? (1 - ease) * -5 : (1 - ease) * 4;

        card.style.opacity = ease.toFixed(3);
        card.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale}) rotate(${rotate}deg)`;
        card.style.pointerEvents = ease > 0.85 ? 'auto' : 'none';
        card.classList.add('is-active-reveal');
        if (ease >= 0.99) {
          card.classList.add('is-settled');
        } else {
          card.classList.remove('is-settled');
        }
      } else {
        const deltaX = -45;
        const deltaY = isUpper ? 55 : 50;
        const rotate = isUpper ? -5 : 4;

        card.style.opacity = '0';
        card.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.78) rotate(${rotate}deg)`;
        card.style.pointerEvents = 'none';
        card.classList.remove('is-active-reveal', 'is-settled');
      }
    });

    // En móviles, desplazar la fila de tarjetas suavemente
    if (isMobile && trailEl) {
      const activeIdx = this.showcaseProducts.reduce((acc, curr, i) => (progress >= curr.threshold ? i : acc), 0);
      const shiftX = activeIdx * 210;
      trailEl.style.transform = `translateX(-${shiftX}px)`;
    } else if (trailEl) {
      trailEl.style.transform = 'none';
    }
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
