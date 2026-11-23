import { Store } from '../state/store';
import { Product } from '../types/product';
import { MOCK_PRODUCTS } from '../data/mockProducts';
import { ProductCard } from './ProductCard';
import { Icons } from './Icons';
import { HorseShowcaseSettingsService } from '../data/horseShowcaseSettings';

export class HorseShowcase {
  private container: HTMLElement;
  private store: Store;
  private products: Product[] = [];

  // Canvas y Renderizado de Fotogramas del Caballo
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private totalFrames: number = 240;
  private frames: (HTMLImageElement | null)[] = new Array(241).fill(null);
  private lastDrawnFrame: number = -1;

  // Estado de Scroll y Animación Fluida
  private currentProgress: number = 0;
  private targetProgress: number = 0;
  private scrollVelocity: number = 0;
  private animationFrameId: number | null = null;
  private pinState: 'before' | 'pinned' | 'after' = 'before';

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.initProducts();
    this.render();
    this.initCanvas();
    this.preloadFrames();
    this.setupScrollEvents();
    this.startLoop();

    // Sincronizar dinámicamente si los productos cambian en el Store (sin destruir el DOM innecesariamente)
    this.store.subscribe(() => {
      const prevSig = this.getProductSignature();
      this.initProducts();
      const newSig = this.getProductSignature();

      if (prevSig !== newSig) {
        this.renderProductGrid();
      } else {
        this.syncCardStates();
      }
    });

    // Sincronizar dinámicamente si cambia la configuración de Horse Showcase
    if (typeof window !== 'undefined') {
      window.addEventListener('blessed:horse_showcase_settings_changed', () => {
        this.initProducts();
        this.renderProductGrid();
      });
    }
  }

  /**
   * Carga los productos ordenados y filtrados según la configuración de Horse Showcase
   */
  private initProducts(): void {
    const raw = this.store.products.length > 0 ? [...this.store.products] : [...MOCK_PRODUCTS];
    this.products = HorseShowcaseSettingsService.getOrderedVisibleProducts(raw);
  }

  /**
   * Genera una firma única del estado actual de los productos
   * (IDs, stock, precios, badges, imágenes) para detectar cambios reales en el inventario.
   */
  private getProductSignature(): string {
    return this.products
      .map(
        (p) =>
          `${p.id}:${p.price}:${p.originalPrice ?? ''}:${p.totalStock ?? ''}:${p.badge ?? ''}:${p.image}`
      )
      .join('|');
  }

  /**
   * Renderiza la estructura base del componente:
   * 1. Marca de agua y resplandor ambiental
   * 2. Encabezado editorial con métricas de la carrera
   * 3. Grid de 3 columnas con las cards habituales (ProductCard)
   * 4. Entidad del caballo fija en el fondo del viewport durante el scroll
   */
  private render(): void {
    this.container.innerHTML = `
      <section class="horse-showcase-section" id="horse-showcase-section">
        <!-- MARCA DE AGUA AMBIENTAL DE FONDO -->
        <div class="horse-watermark-bg" aria-hidden="true">BLESSED WILD</div>
        <div class="horse-ambient-glow" aria-hidden="true"></div>

        <!-- ENCABEZADO -->
        <div class="horse-header-box">
          <h2 class="horse-title">BLESSED WILD</h2>
        </div>

        <!-- CONTENEDOR DEL CATÁLOGO DE PRODUCTOS (GRID DE 3 COLUMNAS CON LAS CARDS HABITUALES) -->
        <div class="container horse-catalog-container">
          <div class="horse-products-grid products-grid-container" id="horse-products-grid">
            ${this.products.map((p, idx) => new ProductCard(p).render(idx)).join('')}
          </div>

          <div class="horse-catalog-end-note">
            <p>Has visto todos los ${this.products.length} productos disponibles.</p>
          </div>
        </div>

        <!-- ENTIDAD DEL CABALLO FIJA EN LA PARTE INFERIOR DE LA PANTALLA (FIXED RUNNER) -->
        <div class="horse-fixed-runner-container is-before" id="horse-fixed-runner">
          <div class="horse-runner-wrap" id="horse-runner-wrap">
            <canvas class="horse-canvas" id="horse-canvas" width="1280" height="720"></canvas>
            <div class="horse-dust-puff" id="horse-dust-puff"></div>
          </div>
        </div>
      </section>
    `;

    // Conectar todos los listeners habituales de las ProductCards (Wishlist, QuickView, 3D, Swatches, + Agregar)
    const gridEl = this.container.querySelector('#horse-products-grid') as HTMLElement | null;
    if (gridEl) {
      ProductCard.attachListeners(gridEl);
    }
  }

  /**
   * Actualiza el grid de productos si cambian los productos en el Store o configuración
   */
  private renderProductGrid(): void {
    const gridEl = this.container.querySelector('#horse-products-grid') as HTMLElement | null;
    const endNote = this.container.querySelector('.horse-catalog-end-note p') as HTMLElement | null;
    if (!gridEl) return;

    if (this.products.length === 0) {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: #64748b; font-size: 0.9rem;">
          No hay pares configurados actualmente para mostrar en Horse Showcase.
        </div>
      `;
    } else {
      // Determinar si la sección ya está dentro del campo visual para que las tarjetas nazcan reveladas
      const section = this.container.querySelector('#horse-showcase-section') as HTMLElement | null;
      const windowH = typeof window !== 'undefined' ? window.innerHeight : 800;
      const sectionRect = section ? section.getBoundingClientRect() : null;
      const isSectionInView = sectionRect ? sectionRect.top < windowH && sectionRect.bottom > 0 : false;
      const extraClass = isSectionInView ? 'horse-card-revealed' : '';

      gridEl.innerHTML = this.products.map((p, idx) => new ProductCard(p).render(idx, extraClass)).join('');
      ProductCard.attachListeners(gridEl);

      // Sincronizar inmediatamente la visibilidad de las tarjetas en pantalla
      this.updateCardVisibility();
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => this.updateCardVisibility());
      }
    }

    if (endNote) {
      endNote.textContent = `Has visto todos los ${this.products.length} productos disponibles.`;
    }
  }

  /**
   * Sincroniza estados reactivos (favoritos, badges) sin reconstruir el DOM,
   * preservando la posición de scroll, animaciones y evitando parpadeos o pantallas en blanco.
   */
  private syncCardStates(): void {
    const cards = this.container.querySelectorAll<HTMLElement>('.horse-products-grid .product-card');
    cards.forEach((card) => {
      const prodId = card.dataset.id;
      if (!prodId) return;

      const isFav = this.store.isInWishlist(prodId);
      const favBtn = card.querySelector('.wishlist-toggle-btn') as HTMLElement | null;
      if (favBtn) {
        favBtn.classList.toggle('is-active', isFav);
        favBtn.innerHTML = Icons.heart('w-5 h-5', isFav);
      }
    });

    this.updateCardVisibility();
  }

  /**
   * Evalúa la posición de cada tarjeta en el viewport y añade o mantiene
   * la clase 'horse-card-revealed' para evitar que se desvanezcan o queden invisibles.
   */
  public updateCardVisibility(): void {
    if (typeof window === 'undefined') return;
    const windowH = window.innerHeight;
    const triggerY = windowH * 0.85; // Umbral cómodo de aparición
    const cards = this.container.querySelectorAll<HTMLElement>('.horse-products-grid .product-card');

    cards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      if (cardRect.top < triggerY) {
        card.classList.add('horse-card-revealed');
      } else {
        card.classList.remove('horse-card-revealed');
      }
    });
  }

  /**
   * Inicializa el Canvas de alta definición para dibujar los fotogramas del caballo
   */
  private initCanvas(): void {
    this.canvas = this.container.querySelector('#horse-canvas') as HTMLCanvasElement | null;
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
  }

  /**
   * Preload ultra-eficiente en dos fases:
   * 1. Carga fotograma 1 de inmediato y lo dibuja.
   * 2. Carga en paralelo fotogramas clave (cada 6 fotogramas) para arranque instantáneo.
   * 3. Rellena los fotogramas restantes en lotes asíncronos para 60fps sin tirones.
   */
  private preloadFrames(): void {
    const loadSingleFrame = (idx: number, callback?: (img: HTMLImageElement) => void) => {
      if (this.frames[idx]) {
        if (callback && this.frames[idx]!.complete) callback(this.frames[idx]!);
        return;
      }
      const pad = String(idx).padStart(5, '0');
      const img = new Image();
      img.src = `/assets/caballo/fotograma_${pad}.png`;
      img.onload = () => {
        this.frames[idx] = img;
        if (callback) callback(img);
      };
      img.onerror = () => {
        setTimeout(() => {
          img.src = `/assets/caballo/fotograma_${pad}.png`;
        }, 800);
      };
    };

    // 1. Cargar fotograma 1 primero y renderizarlo inmediatamente
    loadSingleFrame(1, (img) => {
      if (this.lastDrawnFrame === -1) {
        this.drawFrameImage(img);
        this.lastDrawnFrame = 1;
      }
    });

    // 2. Cargar fotogramas clave en stride de 6 (40 fotogramas distribuidos uniformemente)
    for (let i = 1; i <= this.totalFrames; i += 6) {
      loadSingleFrame(i);
    }

    // 3. Cargar los fotogramas intermedios de forma progresiva
    const loadRemaining = (start: number) => {
      let count = 0;
      for (let i = start; i <= this.totalFrames; i++) {
        if (!this.frames[i]) {
          loadSingleFrame(i);
          count++;
          if (count >= 8) {
            setTimeout(() => loadRemaining(i + 1), 25);
            return;
          }
        }
      }
    };

    setTimeout(() => loadRemaining(2), 150);
  }

  /**
   * Encuentra el fotograma cargado más cercano para evitar parpadeos
   */
  private getBestAvailableFrame(target: number): HTMLImageElement | null {
    if (this.frames[target]?.complete && this.frames[target]?.naturalWidth) {
      return this.frames[target];
    }
    for (let offset = 1; offset < this.totalFrames; offset++) {
      const left = target - offset;
      if (left >= 1 && this.frames[left]?.complete && this.frames[left]?.naturalWidth) {
        return this.frames[left];
      }
      const right = target + offset;
      if (right <= this.totalFrames && this.frames[right]?.complete && this.frames[right]?.naturalWidth) {
        return this.frames[right];
      }
    }
    return null;
  }

  /**
   * Dibuja la imagen del fotograma en el canvas
   */
  private drawFrameImage(img: HTMLImageElement): void {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Controlador profesional de anclaje (Pin Controller):
   * 1. 'is-before': Antes de llegar a la sección (invisible, opacidad 0).
   * 2. 'is-pinned': FIJO (position: fixed; bottom: 15px) en el pie de pantalla mientras avanza el scroll.
   * 3. 'is-after': Al llegar al footer, se queda asentado en la base de la sección sin ser fixed para no solapar el footer.
   *
   * Además gestiona la animación de revelación progresiva de los productos conforme la pantalla sube.
   */
  private setupScrollEvents(): void {
    const section = this.container.querySelector('#horse-showcase-section') as HTMLElement | null;
    const runnerContainer = this.container.querySelector('#horse-fixed-runner') as HTMLElement | null;
    if (!section || !runnerContainer) return;

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const windowH = window.innerHeight;

      const runnerH = runnerContainer.offsetHeight || 180;
      const pinnedBottom = 15;
      const initialTop = 70;

      // Umbral exacto donde la posición fija en la pantalla coincide milimétricamente
      // con la posición absoluta en la web, logrando una transición 100% natural sin saltos
      const lockThreshold = windowH - pinnedBottom - runnerH - initialTop;

      // 1. Control del estado de fijación del caballo en la pantalla
      if (rect.top > lockThreshold) {
        // Estado 1: El caballo permanece anclado a la web (scrollea con la página, ya está visible, sin desvanecerse)
        if (this.pinState !== 'before') {
          this.pinState = 'before';
          runnerContainer.className = 'horse-fixed-runner-container is-before';
        }
        this.targetProgress = 0;
      } else if (rect.bottom >= windowH) {
        // Estado 2: FIJO (FIXED) abajo en la pantalla y avanza dinámicamente según el recorrido
        if (this.pinState !== 'pinned') {
          this.pinState = 'pinned';
          runnerContainer.className = 'horse-fixed-runner-container is-pinned';
        }

        // Progreso continuo (0 a 1) desde el punto de anclaje hasta el final de la sección
        const scrollTravel = (lockThreshold - windowH) + rect.height;
        if (scrollTravel > 0) {
          const scrolled = lockThreshold - rect.top;
          const progress = Math.max(0, Math.min(1, scrolled / scrollTravel));
          this.targetProgress = progress;
        }
      } else {
        // Estado 3: Llegó al pie de la sección (arriba del footer). Se asienta al fondo sin solaparlo
        if (this.pinState !== 'after') {
          this.pinState = 'after';
          runnerContainer.className = 'horse-fixed-runner-container is-after';
        }
        this.targetProgress = 1;
      }

      // 2. Animación de aparición de productos con elevación y nitidez cinematográfica
      this.updateCardVisibility();
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
      this.scrollVelocity = diff;

      // Amortiguación fluida
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
   * Actualiza el fotograma del caballo, su desplazamiento horizontal en la base de la pantalla y la barra métrica
   */
  private updateScene(progress: number): void {
    // 1. Fotograma del caballo mapeado directamente de 1 a 240
    const frameIndex = Math.min(this.totalFrames, Math.max(1, Math.round(progress * (this.totalFrames - 1)) + 1));
    if (frameIndex !== this.lastDrawnFrame) {
      const img = this.getBestAvailableFrame(frameIndex);
      if (img) {
        this.drawFrameImage(img);
        this.lastDrawnFrame = frameIndex;
      }
    }


    const runnerWrap = this.container.querySelector('#horse-runner-wrap') as HTMLElement | null;
    const dustPuff = this.container.querySelector('#horse-dust-puff') as HTMLElement | null;

    if (runnerWrap) {
      const screenW = window.innerWidth;
      const runnerW = runnerWrap.clientWidth || 340;

      // El caballo sale por la izquierda y recorre horizontalmente hasta el margen derecho
      const minX = 16;
      const maxX = Math.max(16, screenW - runnerW - 24);
      const horseX = minX + progress * (maxX - minX);

      runnerWrap.style.transform = `translate3d(${horseX}px, 0, 0)`;

      // Animación de polvo reactivo a la velocidad de movimiento
      if (dustPuff) {
        const isMoving = Math.abs(this.scrollVelocity) > 0.0008;
        const isForward = this.scrollVelocity >= 0;
        dustPuff.style.opacity = isMoving ? '0.75' : '0';
        dustPuff.style.transform = `scale(${isMoving ? 1.15 : 0.7}) ${isForward ? 'translateX(-12px)' : 'translateX(12px)'}`;
      }
    }
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
