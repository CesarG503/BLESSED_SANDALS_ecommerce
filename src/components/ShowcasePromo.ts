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
  private scrollCleanup: (() => void) | null = null;

  // Seguimiento de tienda promocional montada para evitar destruir el DOM innecesariamente
  private renderedPromoCode: string | null = null;
  private isStoreRendered: boolean = false;

  // Productos dinámicos revelados por scroll
  private showcaseProducts: ShowcaseProductItem[] = [];

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.sync(true);

    // Sincronizar reactivamente si el estado del Store cambia (sin re-renderizar todo el DOM si el código ya está montado)
    this.store.subscribe(() => {
      this.sync(false);
    });

    // Escuchar eventos globales de desbloqueo / cierre de tienda oculta
    if (typeof window !== 'undefined') {
      window.addEventListener('blessed:promo_store_unlocked', () => {
        this.sync(true);
        setTimeout(() => {
          this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      });

      window.addEventListener('blessed:promo_store_closed', () => {
        this.sync(true);
      });
    }

    this.startLoop();
  }

  /**
   * Sincroniza la visibilidad y contenido según si la tienda promo está desbloqueada.
   * Si force = false y la tienda ya está renderizada para este código, NO destruye el DOM
   * para prevenir cualquier salto de scroll durante las interacciones (añadir a favoritos, etc.).
   */
  private sync(force: boolean = false): void {
    const unlocked = this.store.unlockedPromoStore;
    const isUnlocked = Boolean(unlocked);
    const code = unlocked?.code || null;

    if (!isUnlocked) {
      if (this.isStoreRendered) {
        this.container.style.display = 'none';
        this.container.innerHTML = '';
        this.isStoreRendered = false;
        this.renderedPromoCode = null;
      }
      return;
    }

    // Si ya está renderizada para este código de tienda y no se fuerza un re-render,
    // únicamente actualizamos estados reactivos (ej. botones de favoritos) sin tocar el scroll
    if (this.isStoreRendered && this.renderedPromoCode === code && !force) {
      this.updateWishlistBadges();
      return;
    }

    this.isStoreRendered = true;
    this.renderedPromoCode = code;
    this.container.style.display = 'block';
    this.initProducts();
    this.render();
    this.setupScrollEvents();
  }

  /**
   * Actualiza únicamente las insignias e iconos de favoritos sin recargar el DOM ni alterar el scroll
   */
  private updateWishlistBadges(): void {
    this.container.querySelectorAll('[data-action="wishlist"]').forEach((btn) => {
      const prodId = (btn as HTMLElement).dataset.prodId;
      if (!prodId) return;
      const isFav = this.store.isInWishlist(prodId);
      btn.classList.toggle('is-active', isFav);
      btn.innerHTML = Icons.heart('w-4 h-4', isFav);
    });
  }

  /**
   * Carga los productos estelares a mostrar en la experiencia promocional.
   * Aplica el precio de descuento promocional en el producto principal y en todas sus
   * variantes de color para que Vista Rápida y el Carrito reflejen siempre el descuento.
   */
  private initProducts(): void {
    const unlocked = this.store.unlockedPromoStore;
    const storeItems = unlocked && Array.isArray(unlocked.storeItems) ? unlocked.storeItems : [];
    const allProducts = this.store.products.length > 0 ? this.store.products : MOCK_PRODUCTS;

    if (storeItems.length > 0) {
      this.showcaseProducts = storeItems.map((item, idx) => {
        const found = allProducts.find((p) => p.id === item.productId) || allProducts[idx % allProducts.length];
        const promoPrice = Number(item.promoPrice) || found.price;
        const promoOriginalPrice = found.price;

        // Actualizar variantes de color con el precio de promoción
        const updatedColors = Array.isArray(found.colors) && found.colors.length > 0
          ? found.colors.map((c) => ({
              ...c,
              price: promoPrice,
              originalPrice: c.price || promoOriginalPrice
            }))
          : found.colors;

        const promoProduct: Product = {
          ...found,
          originalPrice: promoOriginalPrice,
          price: promoPrice,
          colors: updatedColors,
          badge: (item.badgeLabel as any) || 'DESCUENTO',
          isPromoItem: true,
          promoStoreCode: unlocked?.code || 'TIENDA-PROMO'
        };

        const count = storeItems.length;
        const threshold = Number((0.10 + (idx / Math.max(1, count)) * 0.75).toFixed(2));
        return {
          threshold,
          product: promoProduct,
          badgeLabel: item.badgeLabel || 'OFERTA PROMO'
        };
      });
    } else {
      const p1 = allProducts.find((p) => p.id === 'prod-003') || allProducts[0];
      const p2 = allProducts.find((p) => p.id === 'prod-001') || allProducts[1];
      const p3 = allProducts.find((p) => p.id === 'prod-007') || allProducts[2];
      const p4 = allProducts.find((p) => p.id === 'prod-002') || allProducts[3];

      const makePromo = (p: Product, promoPrice: number, badge: string) => {
        const promoOriginalPrice = p.price;
        const updatedColors = Array.isArray(p.colors) && p.colors.length > 0
          ? p.colors.map((c) => ({
              ...c,
              price: promoPrice,
              originalPrice: c.price || promoOriginalPrice
            }))
          : p.colors;
        return {
          ...p,
          price: promoPrice,
          originalPrice: promoOriginalPrice,
          colors: updatedColors,
          badge: badge as any,
          isPromoItem: true,
          promoStoreCode: 'BLESSED-PROMO'
        };
      };

      this.showcaseProducts = [
        { threshold: 0.14, product: makePromo(p1, 89.99, 'MÁS VENDIDO'), badgeLabel: 'MÁS VENDIDO' },
        { threshold: 0.38, product: makePromo(p2, 99.99, 'EDICIÓN PROMO'), badgeLabel: 'EDICIÓN PROMO' },
        { threshold: 0.62, product: makePromo(p3, 79.99, 'PIEL PREMIUM'), badgeLabel: 'PIEL PREMIUM' },
        { threshold: 0.84, product: makePromo(p4, 109.99, 'EXCLUSIVO 2026'), badgeLabel: 'EXCLUSIVO 2026' }
      ];
    }
  }

  /**
   * Renderiza la estructura base del componente con runway para scroll pinning
   */
  private render(): void {
    const unlocked = this.store.unlockedPromoStore;
    const promoCode = unlocked?.code || 'BLESSED PROMO';
    const promoDesc = unlocked?.description || 'SILUETAS ICÓNICAS & EDICIÓN ESPECIAL';
    const expiresNote = unlocked?.expiresAt
      ? `Promoción válida hasta el ${new Date(unlocked.expiresAt).toLocaleDateString()}.`
      : '';

    const totalCount = this.showcaseProducts.length;
    // Pacing dinámico según la cantidad de calzados: si son más de 4, ampliamos el runway para scroll suave
    const runwayHeightVh = Math.max(240, 180 + totalCount * 40);

    this.container.innerHTML = `
      <section class="horse-showcase-section promo-showcase-section" id="promo-showcase-section">
        <!-- RUNWAY DE SCROLL PARA PINNING Y CONTROL BIDIRECCIONAL -->
        <div class="horse-scroll-runway promo-scroll-runway" id="promo-runway" style="min-height: ${runwayHeightVh}vh;">
          <div class="horse-sticky-viewport is-before promo-sticky-viewport" id="promo-viewport">
            
            <!-- MARCA DE AGUA AMBIENTAL DE FONDO -->
            <div class="horse-watermark-bg" aria-hidden="true">${promoCode}</div>
            <div class="horse-ambient-glow" aria-hidden="true"></div>

            <!-- ENCABEZADO Y PROGRESO -->
            <div class="horse-header-box">
              <div class="" style="margin-top:1rem;">
                <span class="horse-live-pulse" ></span>
                <span></span>
              </div>
              <h2 class="horse-title">${promoDesc}</h2>
              <p class="horse-subtitle">
                ${expiresNote} Desplaza el scroll hacia abajo para explorar los calzados con descuento exclusivo asignado en tu compra.
              </p>

              <div style="margin-top: 10px;">
                <button type="button" class="btn-promo-store-close" id="btn-promo-store-close" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #cbd5e1; padding: 6px 16px; border-radius: 20px; font-size: 0.78rem; cursor: pointer; transition: all 0.2s ease;">
                  ✕ Ocultar Tienda Promo
                </button>
              </div>

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
                    class="horse-product-card promo-product-card ${idx % 2 === 0 ? 'promo-card-upper' : 'promo-card-lower'}" 
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
                          <span class="h-card-price">$${Number(item.product.price).toFixed(2)}</span>
                          ${item.product.originalPrice && Number(item.product.originalPrice) > Number(item.product.price)
                            ? `<span class="h-card-orig-price">$${Number(item.product.originalPrice).toFixed(2)}</span>`
                            : ''}
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
    // Cerrar / Ocultar Tienda Promo
    this.container.querySelector('#btn-promo-store-close')?.addEventListener('click', () => {
      this.store.closePromoStore();
      Toast.show('Has salido de la tienda promo.', 'Tienda Oculta', 'info');
    });

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

    // Añadir al Carrito (añade con feedback visual sin forzar drawer para no bloquear el scroll)
    this.container.querySelectorAll('[data-action="add"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const prodId = (btn as HTMLElement).dataset.prodId;
        const item = this.showcaseProducts.find((p) => p.product.id === prodId);
        if (!item) return;

        const defaultSize = item.product.sizes?.[0] || 40;
        const defaultColor = item.product.colors?.[0]?.name;
        this.store.addToCart(item.product, defaultSize, defaultColor);
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
    if (this.scrollCleanup) {
      this.scrollCleanup();
      this.scrollCleanup = null;
    }

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
    this.scrollCleanup = () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };

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
   * Actualiza el progreso de scroll y la revelación de productos en ejes X e Y:
   * - Distribución horizontal ordenada y separada en slots (sin superponerse).
   * - Si hay más de 4 calzados (o del límite visible):
   *   El primer calzado que apareció sale hacia afuera por la izquierda con fade-out,
   *   dando espacio al siguiente calzado (el 5to calzado entra por la derecha al slot visible),
   *   y así sucesivamente con soporte bidireccional y suave a 60fps.
   */
  private updateScene(progress: number): void {
    // 1. Actualizar barra de progreso y métricas
    const percentEl = this.container.querySelector('#promo-metric-percent');
    const barEl = this.container.querySelector('#promo-metric-bar') as HTMLElement | null;

    if (percentEl) percentEl.textContent = `${Math.round(progress * 100)}%`;
    if (barEl) barEl.style.width = `${(progress * 100).toFixed(1)}%`;

    const totalCount = this.showcaseProducts.length;
    if (totalCount === 0) return;

    // Detectar responsividad y límites de capacidad simultánea en pantalla
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const isMobile = windowWidth < 640;
    const isTablet = windowWidth >= 640 && windowWidth < 1024;

    const maxVisibleSlots = isMobile ? 1 : (isTablet ? 2 : 4);
    const slotStep = isMobile ? 90 : (isTablet ? 47 : 24); // Separación horizontal porcentual

    // =========================================================================
    // CASO 1: LA CANTIDAD TOTAL CABE COMPLETA EN PANTALLA (totalCount <= maxVisibleSlots)
    // Se distribuyen en slots separados con aparición progresiva y sin desplazarse fuera
    // =========================================================================
    if (totalCount <= maxVisibleSlots) {
      const groupWidth = totalCount * slotStep;
      const baseLeft = Math.max(2, (100 - groupWidth) / 2);

      this.showcaseProducts.forEach((_, idx) => {
        const card = this.container.querySelector(`#promo-card-${idx}`) as HTMLElement | null;
        if (!card) return;

        const targetLeft = baseLeft + idx * slotStep;
        card.style.left = `${targetLeft.toFixed(2)}%`;

        const enterStart = 0.08 + (idx / totalCount) * 0.65;
        const enterDur = 0.15;

        if (progress < enterStart) {
          card.style.opacity = '0';
          card.style.transform = 'translate3d(0, 30px, 0) scale(0.84)';
          card.style.pointerEvents = 'none';
        } else {
          const factor = Math.min(1, Math.max(0, (progress - enterStart) / enterDur));
          const ease = 1 - Math.pow(1 - factor, 3);
          const deltaY = (1 - ease) * 30;
          const scale = 0.84 + ease * 0.16;

          card.style.opacity = ease.toFixed(3);
          card.style.transform = `translate3d(0, ${deltaY.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
          card.style.pointerEvents = ease > 0.85 ? 'auto' : 'none';
        }
      });
      return;
    }

    // =========================================================================
    // CASO 2: HAY MÁS DE 4 CALZADOS (totalCount > maxVisibleSlots)
    // 1. Los primeros 4 aparecen poco a poco en orden.
    // 2. Al continuar el scroll, el calzado más antiguo (el primero) sale hacia afuera por la
    //    izquierda desvaneciéndose (fade out), y le cede su lugar al siguiente (el 5to entra
    //    por la derecha al slot 3, luego el 6to, etc.) de forma totalmente reversible.
    // =========================================================================
    const extraItems = totalCount - maxVisibleSlots;
    const baseLeft = isMobile ? 5 : (isTablet ? 3 : 3.5);

    const phase1End = 0.25;
    const phase2Start = 0.25;
    const phase2End = 0.88;

    let currentShift = 0;
    if (progress > phase2Start) {
      const slideT = Math.min(1, Math.max(0, (progress - phase2Start) / (phase2End - phase2Start)));
      currentShift = slideT * extraItems;
    }

    this.showcaseProducts.forEach((_, idx) => {
      const card = this.container.querySelector(`#promo-card-${idx}`) as HTMLElement | null;
      if (!card) return;

      const currentSlot = idx - currentShift;
      const targetLeft = baseLeft + currentSlot * slotStep;
      card.style.left = `${targetLeft.toFixed(2)}%`;

      // FASE 1: Entrada inicial poco a poco de los primeros pares en pantalla
      if (progress <= phase1End) {
        if (idx < maxVisibleSlots) {
          const enterStart = 0.05 + (idx / maxVisibleSlots) * 0.15;
          const enterDur = 0.08;

          if (progress < enterStart) {
            card.style.opacity = '0';
            card.style.transform = 'translate3d(0, 30px, 0) scale(0.84)';
            card.style.pointerEvents = 'none';
          } else {
            const factor = Math.min(1, Math.max(0, (progress - enterStart) / enterDur));
            const ease = 1 - Math.pow(1 - factor, 3);
            const deltaY = (1 - ease) * 30;
            const scale = 0.84 + ease * 0.16;

            card.style.opacity = ease.toFixed(3);
            card.style.transform = `translate3d(0, ${deltaY.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
            card.style.pointerEvents = ease > 0.85 ? 'auto' : 'none';
          }
        } else {
          // El 5to calzado en adelante espera fuera de pantalla a la derecha
          card.style.opacity = '0';
          card.style.transform = 'translate3d(30px, 0, 0) scale(0.82)';
          card.style.pointerEvents = 'none';
        }
        return;
      }

      // FASE 2: Transición fluida con desplazamiento continuo
      // A) Totalmente fuera de pantalla a la izquierda
      if (currentSlot <= -1.0) {
        card.style.opacity = '0';
        card.style.transform = 'translate3d(-30px, 0, 0) scale(0.80)';
        card.style.pointerEvents = 'none';
      }
      // B) SALIDA POR LA IZQUIERDA: El calzado anterior se desliza y desvanece hacia afuera
      else if (currentSlot < 0.0) {
        const exitProgress = -currentSlot; // 0 en slot 0 -> 1 en slot -1
        const opacity = Math.max(0, 1 - exitProgress);
        const deltaX = -exitProgress * 30;
        const scale = 1 - exitProgress * 0.16;

        card.style.opacity = opacity.toFixed(3);
        card.style.transform = `translate3d(${deltaX.toFixed(1)}px, 0, 0) scale(${scale.toFixed(3)})`;
        card.style.pointerEvents = 'none';
      }
      // C) VISIBLE EN PANTALLA ACTIVA (Slots 0 a 3 en desktop)
      else if (currentSlot <= maxVisibleSlots - 1) {
        card.style.opacity = '1';
        card.style.transform = 'translate3d(0, 0, 0) scale(1)';
        card.style.pointerEvents = 'auto';
      }
      // D) ENTRADA POR LA DERECHA: El siguiente calzado (ej. 5to par) entra suavemente al slot visible
      else if (currentSlot <= maxVisibleSlots) {
        const enterProgress = maxVisibleSlots - currentSlot; // 0 en slot 4 -> 1 en slot 3
        const opacity = Math.min(1, Math.max(0, enterProgress));
        const deltaX = (1 - enterProgress) * 30;
        const scale = 0.84 + enterProgress * 0.16;

        card.style.opacity = opacity.toFixed(3);
        card.style.transform = `translate3d(${deltaX.toFixed(1)}px, 0, 0) scale(${scale.toFixed(3)})`;
        card.style.pointerEvents = opacity > 0.85 ? 'auto' : 'none';
      }
      // E) Calzados futuros esperando a la derecha
      else {
        card.style.opacity = '0';
        card.style.transform = 'translate3d(30px, 0, 0) scale(0.82)';
        card.style.pointerEvents = 'none';
      }
    });
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.scrollCleanup) {
      this.scrollCleanup();
      this.scrollCleanup = null;
    }
  }
}
