import { Store } from '../state/store';
import { Icons } from './Icons';
import { Toast } from './Toast';
import { Product } from '../types/product';

interface SlideItem {
  index: number;
  id: string;
  name: string;
  edition: string;
  colorName: string;
  price: number;
  image: string;
  badge: string;
}

export class CircularShowcase {
  private container: HTMLElement;
  private store: Store;

  // Lista de los 10 pares de calzado basados en slide.png
  private items: SlideItem[] = [
    { index: 0, id: 'blessed-slide-01', name: 'Blessed Slide Onyx Edition', edition: 'Edición #01', colorName: 'Midnight Onyx', price: 65, image: '/assets/slide/slide.png', badge: 'MÁS VENDIDO' },
    { index: 1, id: 'blessed-slide-02', name: 'Blessed Slide Pure Ivory', edition: 'Edición #02', colorName: 'Pure Ivory', price: 65, image: '/assets/slide/slide.png', badge: 'NUEVO' },
    { index: 2, id: 'blessed-slide-03', name: 'Blessed Slide Desert Sand', edition: 'Edición #03', colorName: 'Desert Sand', price: 68, image: '/assets/slide/slide.png', badge: 'POPULAR' },
    { index: 3, id: 'blessed-slide-04', name: 'Blessed Slide Emerald Luxe', edition: 'Edición #04', colorName: 'Emerald Green', price: 72, image: '/assets/slide/slide.png', badge: 'EXCLUSIVO' },
    { index: 4, id: 'blessed-slide-05', name: 'Blessed Slide Carbon Wave', edition: 'Edición #05', colorName: 'Carbon Matte', price: 65, image: '/assets/slide/slide.png', badge: 'EDICIÓN 2026' },
    { index: 5, id: 'blessed-slide-06', name: 'Blessed Slide Vintage Amber', edition: 'Edición #06', colorName: 'Vintage Amber', price: 70, image: '/assets/slide/slide.png', badge: 'LIMITADO' },
    { index: 6, id: 'blessed-slide-07', name: 'Blessed Slide Nordic Slate', edition: 'Edición #07', colorName: 'Slate Grey', price: 65, image: '/assets/slide/slide.png', badge: 'NUEVO' },
    { index: 7, id: 'blessed-slide-08', name: 'Blessed Slide Forest Shadow', edition: 'Edición #08', colorName: 'Forest Deep', price: 68, image: '/assets/slide/slide.png', badge: 'CONFORT' },
    { index: 8, id: 'blessed-slide-09', name: 'Blessed Slide Terra Cotta', edition: 'Edición #09', colorName: 'Terra Cotta', price: 65, image: '/assets/slide/slide.png', badge: 'VERANO' },
    { index: 9, id: 'blessed-slide-10', name: 'Blessed Slide Gold Accent', edition: 'Edición #10', colorName: 'Gold Luxury', price: 75, image: '/assets/slide/slide.png', badge: 'PREMIUM' }
  ];

  // Estado físico de rotación continua
  private currentAngle: number = Math.PI / 2; // Inicia con el primer par en la cima del arco
  private velocity: number = -0.0012; // Velocidad de crucero lenta y continua
  private isHoveringShoe: boolean = false;
  private activeHoveredIndex: number | null = null;
  private activeCardIndex: number | null = null;
  private animationFrameId: number | null = null;

  // Temporizadores para hover-intent y cierre suave
  private hoverIntentTimer: number | null = null;
  private hideCardTimeout: number | null = null;

  // Estado de Arrastre / Drag de la Tarjeta (3D Draggable)
  private isCardDragging: boolean = false;
  private cardDragStartPointer = { x: 0, y: 0 };
  private cardInitialPos = { x: 0, y: 0 };

  // Touch drag del escenario
  private isStageDragging: boolean = false;
  private touchStartX: number = 0;

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.render();
    this.setupEvents();
    this.setupCardDragAnd3D();
    this.startAnimationLoop();
  }

  private render(): void {
    this.container.innerHTML = `
      <!-- CONTENEDOR RUNWAY PARA SCROLL Y PINNING (MARGEN REDUCIDO Y PROPORCIONAL) -->
      <section class="showcase-scroll-runway" id="showcase-runway" style="min-height: 120vh;">
        <div class="showcase-sticky-viewport" id="showcase-viewport">
          
          <!-- MARCA DE AGUA Y ENCABEZADO MINIMALISTA -->
          <div class="showcase-watermark" aria-hidden="true">BLESSED</div>
          
          <!-- ESPACIADOR MINIMALISTA SUPERIOR (PRESERVA PROPORCIÓN Y POSICIÓN EXACTA) -->
          <div class="showcase-header-spacer" aria-hidden="true"></div>

          <!-- PISTA DE ARCO CIRCULAR -->
          <div class="showcase-orbit-stage" id="orbit-stage">
            
            <!-- GUÍA VISUAL DEL ARCO CURVO (SVG) -->
            <svg class="orbit-path-svg" viewBox="0 0 1000 360" preserveAspectRatio="none">
              <path d="M 40 350 Q 500 20 960 350" fill="none" stroke="rgba(210, 181, 136, 0.3)" stroke-width="2.5" stroke-dasharray="8,8" />
            </svg>

            <!-- CONTENEDOR DINÁMICO DE LOS 10 PARES -->
            <div class="orbit-items-wrap" id="orbit-items-wrap">
              ${this.items
                .map(
                  (item, i) => `
                <div 
                  class="orbit-shoe-item" 
                  id="shoe-item-${i}" 
                  data-index="${i}"
                >
                  <div class="shoe-card-shell">
                    <div class="shoe-visual-core">
                      <img src="${item.image}" alt="${item.name}" class="shoe-img" draggable="false" />
                      <div class="shoe-shadow"></div>
                      <span class="shoe-indicator-dot">${i + 1}</span>
                    </div>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>

            <!-- TARJETA MINIMALISTA FLOTANTE 3D (DESPLAZABLE Y ARRASTRABLE) -->
            <div class="showcase-hover-modal" id="showcase-hover-card"></div>
          </div>

          <!-- BOTONES LATERALES DE NAVEGACIÓN MANUAL -->
          <button class="orbit-nav-btn prev" id="orbit-prev-btn" aria-label="Girar a la izquierda">
            ${Icons.chevronRight('w-5 h-5')}
          </button>
          <button class="orbit-nav-btn next" id="orbit-next-btn" aria-label="Girar a la derecha">
            ${Icons.chevronRight('w-5 h-5')}
          </button>

          <!-- INDICADOR PARA CONTINUAR AL CATÁLOGO -->
          <div class="showcase-scroll-prompt" id="btn-scroll-catalog">
            <span class="prompt-text">EXPLORAR CATÁLOGO COMPLETO</span>
            <div class="prompt-arrow">
              ${Icons.chevronDown('w-4 h-4')}
            </div>
          </div>

        </div>
      </section>
    `;
  }

  private setupEvents(): void {
    const stage = this.container.querySelector('#orbit-stage') as HTMLElement | null;
    const runway = this.container.querySelector('#showcase-runway') as HTMLElement | null;

    // 1. Hover con Intent Delay sobre cada calzado
    this.container.querySelectorAll('.orbit-shoe-item').forEach((itemEl) => {
      const idx = parseInt((itemEl as HTMLElement).dataset.index || '0', 10);

      const triggerHover = () => {
        this.cancelHideCard();
        this.isHoveringShoe = true;
        itemEl.classList.add('is-focusing');

        // Si la tarjeta ya está abierta para este par exacto, mantenerla activa
        if (this.activeCardIndex === idx) return;

        // Si el usuario está arrastrando la tarjeta, no cambiar
        if (this.isCardDragging) return;

        // Espera consciente de 260ms para no salir de golpe ni cambiar por accidente
        if (this.hoverIntentTimer) clearTimeout(this.hoverIntentTimer);
        this.hoverIntentTimer = window.setTimeout(() => {
          if (this.isCardDragging) return;
          this.activeHoveredIndex = idx;
          this.activeCardIndex = idx;
          this.velocity = 0;
          this.showHoverCard(idx);
        }, 260);
      };

      const cancelHover = () => {
        itemEl.classList.remove('is-focusing');
        this.isHoveringShoe = false;

        // Si teníamos un temporizador para abrir este calzado y el cursor salió antes, cancelarlo
        if (this.hoverIntentTimer && this.activeCardIndex !== idx) {
          clearTimeout(this.hoverIntentTimer);
          this.hoverIntentTimer = null;
        }

        // Si este calzado tiene la tarjeta activa actualmente, iniciar tolerancia para transitar a la tarjeta
        if (this.activeCardIndex === idx) {
          this.scheduleHideCard();
        }
      };

      itemEl.addEventListener('mouseenter', triggerHover);
      itemEl.addEventListener('mouseleave', cancelHover);

      // Eventos táctiles para móviles
      let touchPressTimer: number | null = null;
      itemEl.addEventListener('touchstart', () => {
        touchPressTimer = window.setTimeout(() => {
          triggerHover();
        }, 220);
      }, { passive: true });

      itemEl.addEventListener('touchend', () => {
        if (touchPressTimer) clearTimeout(touchPressTimer);
      });

      itemEl.addEventListener('click', () => {
        this.handleShoeClick(idx);
      });
    });

    // 2. Corredor seguro enfocado entre el calzado y la tarjeta activa
    document.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.activeCardIndex === null || this.isCardDragging) return;

      const shoeEl = document.getElementById(`shoe-item-${this.activeCardIndex}`);
      const cardEl = this.container.querySelector('#showcase-hover-card') as HTMLElement | null;
      if (!shoeEl || !cardEl) return;

      const shoeRect = shoeEl.getBoundingClientRect();
      const cardRect = cardEl.getBoundingClientRect();

      // Corredor enfocado: abarca el calzado, la tarjeta y la zona directa de conexión con 20px de margen
      const minX = Math.min(shoeRect.left, cardRect.left) - 20;
      const maxX = Math.max(shoeRect.right, cardRect.right) + 20;
      const minY = Math.min(shoeRect.top, cardRect.top) - 15;
      const maxY = Math.max(shoeRect.bottom, cardRect.bottom) + 20;

      const inSafeCorridor = (
        e.clientX >= minX &&
        e.clientX <= maxX &&
        e.clientY >= minY &&
        e.clientY <= maxY
      );

      if (inSafeCorridor) {
        this.cancelHideCard();
      } else {
        if (!this.hideCardTimeout) {
          this.scheduleHideCard();
        }
      }
    });

    // Clic fuera del stage cierra la tarjeta de inmediato
    document.addEventListener('pointerdown', (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#orbit-stage') && this.activeCardIndex !== null && !this.isCardDragging) {
        this.hideHoverCard();
      }
    });

    // 3. Control de rotación con SCROLL DE PÁGINA (bidireccional, suave y sin saltos)
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
      if (!runway) return;
      const rect = runway.getBoundingClientRect();
      const currentScrollY = window.scrollY;
      const deltaY = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;

      // Si el runway del showcase está dentro del área visible de la ventana
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        if (Math.abs(deltaY) > 0) {
          // Cada movimiento de scroll empuja suavemente la velocidad en esa dirección
          this.velocity += deltaY * 0.0016;
          // Limitar la velocidad máxima para garantizar un movimiento elegante y sin giros bruscos
          this.velocity = Math.max(-0.045, Math.min(0.045, this.velocity));
        }
      }
    }, { passive: true });

    // 4. Control de Wheel / Trackpad a nivel de VENTANA para giro suave bidireccional
    window.addEventListener('wheel', (e: WheelEvent) => {
      if (!runway) return;
      const rect = runway.getBoundingClientRect();

      // Si el showcase está visible en el viewport
      if (rect.top <= 100 && rect.bottom >= 150) {
        const delta = e.deltaY * 0.0008;
        this.velocity += delta;
        this.velocity = Math.max(-0.045, Math.min(0.045, this.velocity));
      }
    }, { passive: true });

    // 5. Drag & Touch de fondo para móvil
    stage?.addEventListener('touchstart', (e) => {
      if ((e.target as HTMLElement).closest('#showcase-hover-card')) return;
      this.isStageDragging = true;
      this.touchStartX = e.touches[0].clientX;
      this.velocity = 0;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!this.isStageDragging) return;
      const currentX = e.touches[0].clientX;
      const deltaX = currentX - this.touchStartX;
      this.currentAngle -= deltaX * 0.003;
      this.velocity = -deltaX * 0.0012;
      this.touchStartX = currentX;
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isStageDragging = false;
    });

    // 6. Botones laterales
    this.container.querySelector('#orbit-prev-btn')?.addEventListener('click', () => {
      this.velocity -= 0.035;
    });

    this.container.querySelector('#orbit-next-btn')?.addEventListener('click', () => {
      this.velocity += 0.035;
    });

    // 7. Botón hacia el catálogo
    this.container.querySelector('#btn-scroll-catalog')?.addEventListener('click', () => {
      document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    window.addEventListener('resize', () => {
      this.updatePositions();
    });
  }

  /**
   * Configura el arrastre (Draggable), movimiento 3D interactivo
   */
  private setupCardDragAnd3D(): void {
    const hoverCard = this.container.querySelector('#showcase-hover-card') as HTMLElement | null;
    const stage = this.container.querySelector('#orbit-stage') as HTMLElement | null;
    if (!hoverCard || !stage) return;

    hoverCard.addEventListener('pointerenter', () => {
      this.cancelHideCard();
    });

    hoverCard.addEventListener('pointerleave', () => {
      this.scheduleHideCard();
    });

    // Iniciar arrastre con PointerDown (funciona para Mouse y Touch)
    hoverCard.addEventListener('pointerdown', (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('.btn-hover-action')) return;

      this.isCardDragging = true;
      hoverCard.classList.add('is-dragging');
      this.cancelHideCard();

      try {
        hoverCard.setPointerCapture(e.pointerId);
      } catch {}

      this.cardDragStartPointer = { x: e.clientX, y: e.clientY };
      const currentLeft = parseFloat(hoverCard.style.left) || hoverCard.offsetLeft;
      const currentTop = parseFloat(hoverCard.style.top) || hoverCard.offsetTop;
      this.cardInitialPos = { x: currentLeft, y: currentTop };
    });

    // Movimiento mientras se arrastra O efecto 3D tilt mientras se sobrevuela
    hoverCard.addEventListener('pointermove', (e: PointerEvent) => {
      const inner = hoverCard.querySelector('.hover-card-inner') as HTMLElement | null;
      if (!inner) return;

      if (this.isCardDragging) {
        // Modo Arrastre
        const dx = e.clientX - this.cardDragStartPointer.x;
        const dy = e.clientY - this.cardDragStartPointer.y;

        let newX = this.cardInitialPos.x + dx;
        let newY = this.cardInitialPos.y + dy;

        const maxX = stage.clientWidth - hoverCard.offsetWidth;
        const maxY = stage.clientHeight - hoverCard.offsetHeight;
        newX = Math.max(10, Math.min(maxX - 10, newX));
        newY = Math.max(10, Math.min(maxY - 10, newY));

        hoverCard.style.left = `${newX}px`;
        hoverCard.style.top = `${newY}px`;

        const tiltX = Math.max(-18, Math.min(18, -dy * 0.25));
        const tiltY = Math.max(-18, Math.min(18, dx * 0.25));
        inner.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.06, 1.06, 1.06)`;
      } else {
        // Modo 3D Tilt al pasar el cursor sobre la tarjeta
        const rect = hoverCard.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        const rotateX = -(y / (rect.height / 2)) * 14;
        const rotateY = (x / (rect.width / 2)) * 14;

        inner.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.04, 1.04, 1.04)`;

        const gloss = hoverCard.querySelector('.card-gloss-overlay') as HTMLElement | null;
        if (gloss) {
          const px = ((e.clientX - rect.left) / rect.width) * 100;
          const py = ((e.clientY - rect.top) / rect.height) * 100;
          gloss.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 65%)`;
        }
      }
    });

    const endDrag = (e: PointerEvent) => {
      if (!this.isCardDragging) return;
      this.isCardDragging = false;
      hoverCard.classList.remove('is-dragging');
      try {
        hoverCard.releasePointerCapture(e.pointerId);
      } catch {}

      const inner = hoverCard.querySelector('.hover-card-inner') as HTMLElement | null;
      if (inner) {
        inner.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      }
    };

    hoverCard.addEventListener('pointerup', endDrag);
    hoverCard.addEventListener('pointercancel', endDrag);
  }

  private cancelHideCard(): void {
    if (this.hideCardTimeout) {
      clearTimeout(this.hideCardTimeout);
      this.hideCardTimeout = null;
    }
  }

  private scheduleHideCard(): void {
    if (this.isCardDragging) return;
    if (this.hideCardTimeout) clearTimeout(this.hideCardTimeout);

    // 280ms de gracia: cierre rápido, natural y sin demoras molestas
    this.hideCardTimeout = window.setTimeout(() => {
      if (!this.isCardDragging) {
        this.hideHoverCard();
      }
    }, 280);
  }

  private startAnimationLoop(): void {
    const loop = () => {
      const isInteracting = this.isHoveringShoe || this.isStageDragging || this.isCardDragging || this.activeCardIndex !== null;

      if (isInteracting) {
        // Cuando hay interacción activa (hover sobre calzado, tarjeta abierta o arrastre):
        // Frena suavemente a 0 para mantener el calzado fijo y facilitar lectura y clics
        this.velocity *= 0.82;
        if (Math.abs(this.velocity) < 0.0001) {
          this.velocity = 0;
        }
      } else {
        // Cuando no hay interacción:
        // Si hay velocidad residual de scroll/rueda, aplicarla y amortiguar suavemente
        if (Math.abs(this.velocity) > 0.0016) {
          this.velocity *= 0.94;
        } else {
          // Transición suave hacia la velocidad de crucero en reposo (-0.0012 rad/frame)
          const cruiseSpeed = -0.0012;
          this.velocity += (cruiseSpeed - this.velocity) * 0.035;
        }
      }

      // Aplicar velocidad al ángulo de rotación continuo de forma fluida
      this.currentAngle += this.velocity;

      this.updatePositions();
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private updatePositions(): void {
    const stage = this.container.querySelector('#orbit-stage') as HTMLElement | null;
    if (!stage) return;

    const width = stage.clientWidth || window.innerWidth;
    const height = stage.clientHeight || 520;

    const cx = width / 2;
    const cy = height * 0.96;

    const rx = Math.min(width * 0.54, 760);
    const ry = Math.min(height * 0.76, 420);

    const total = this.items.length;
    const angleStep = (Math.PI * 2) / total;

    for (let i = 0; i < total; i++) {
      const el = document.getElementById(`shoe-item-${i}`);
      if (!el) continue;

      const angle = this.currentAngle + i * angleStep;
      const x = cx + rx * Math.cos(angle);
      const y = cy - ry * Math.sin(angle);

      const sinVal = Math.sin(angle);

      // Solo los 3 a 4 pares superiores se visualizan de forma prominente
      let visibleFactor = (sinVal - 0.28) / 0.72;
      visibleFactor = Math.max(0, Math.min(1, visibleFactor));

      const scale = 0.85 + visibleFactor * 0.60;
      const opacity = Math.pow(visibleFactor, 1.4);
      const zIndex = Math.round(10 + visibleFactor * 50);

      const cosVal = Math.cos(angle);
      const tiltDeg = -cosVal * 28;

      el.style.pointerEvents = visibleFactor > 0.35 ? 'auto' : 'none';
      el.style.transform = `translate3d(${x}px, ${y}px, 0px) translate(-50%, -50%) rotate(${tiltDeg}deg) scale(${scale})`;
      el.style.opacity = opacity.toString();
      el.style.zIndex = zIndex.toString();

      if (this.activeCardIndex === i || this.activeHoveredIndex === i) {
        el.style.transform = `translate3d(${x}px, ${y}px, 0px) translate(-50%, -50%) rotate(0deg) scale(${scale * 1.32})`;
        el.style.opacity = '1';
        el.style.zIndex = '999';
        el.classList.add('is-active-card');
      } else {
        el.classList.remove('is-active-card');
      }
    }
  }

  /**
   * Muestra la tarjeta colocada claramente DEBAJO DEL PAR específico (sin tapar el zapato)
   */
  private showHoverCard(index: number): void {
    const item = this.items[index];
    const hoverCard = this.container.querySelector('#showcase-hover-card') as HTMLElement | null;
    const stage = this.container.querySelector('#orbit-stage') as HTMLElement | null;
    if (!hoverCard || !item || !stage) return;

    // Calcular coordenadas exactas del calzado
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const cx = width / 2;
    const cy = height * 0.96;
    const rx = Math.min(width * 0.54, 760);
    const ry = Math.min(height * 0.76, 420);

    const angle = this.currentAngle + index * ((Math.PI * 2) / this.items.length);
    const shoeX = cx + rx * Math.cos(angle);
    const shoeY = cy - ry * Math.sin(angle);

    const cardWidth = 350;
    const cardHeight = 220;

    // SIEMPRE UN POQUITO MÁS ABAJO DEL PAR (shoeY + 85px sitúa el inicio de la tarjeta justo debajo de la suela de forma limpia)
    let cardY = shoeY + 85;
    const maxCardY = height - cardHeight - 12;
    if (cardY > maxCardY) {
      cardY = maxCardY;
    }

    // Centrar horizontalmente respecto al calzado
    let cardX = shoeX - cardWidth / 2;
    cardX = Math.max(20, Math.min(width - cardWidth - 20, cardX));

    // Solo reubicar si el usuario no la está arrastrando activamente
    if (!this.isCardDragging) {
      hoverCard.style.left = `${Math.round(cardX)}px`;
      hoverCard.style.top = `${Math.round(cardY)}px`;
    }

    hoverCard.classList.add('is-active');
    hoverCard.innerHTML = `
      <!-- PUENTE DE CONTACTO DE CORREDOR ACTIVO -->
      <div class="hover-card-bridge" id="hover-card-bridge"></div>

      <div class="hover-card-inner animate-scale-up">
        <!-- AGARRADERA SUPERIOR PARA ARRASTRAR (DRAG HANDLE) -->
        <div class="card-drag-handle" title="Presiona y arrastra para mover a donde desees">
          <span class="card-drag-bar"></span>
        </div>

        <!-- CAPA DE BRILLO 3D DINÁMICO -->
        <div class="card-gloss-overlay"></div>

        <div class="hover-card-badge-row">
          <span class="hover-card-tag">${item.badge}</span>
          <span class="hover-card-num">${item.edition}</span>
        </div>

        <h4 class="hover-card-name">${item.name}</h4>
        <p class="hover-card-desc">Tono: <strong>${item.colorName}</strong> • Espuma CloudFoam Ultra</p>
        
        <div class="hover-card-bottom-row">
          <div class="hover-card-price-box">
            <span class="hover-card-price">$${item.price.toFixed(2)}</span>
            <span class="hover-card-stock">● En Stock • Envío Gratis</span>
          </div>

          <div class="hover-card-btns">
            <button class="btn-hover-action btn-hover-quick" data-action="quickview" data-index="${index}">
              Vista Rápida
            </button>
            <button class="btn-hover-action btn-hover-add" data-action="quickadd" data-index="${index}">
              + Añadir
            </button>
          </div>
        </div>
      </div>
    `;

    // Eventos de botones
    hoverCard.querySelector('[data-action="quickview"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleShoeClick(index);
    });

    hoverCard.querySelector('[data-action="quickadd"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.quickAddToCart(item);
    });
  }

  private hideHoverCard(): void {
    const hoverCard = this.container.querySelector('#showcase-hover-card') as HTMLElement | null;
    if (hoverCard) {
      hoverCard.classList.remove('is-active', 'is-dragging');
    }
    this.isHoveringShoe = false;
    this.activeCardIndex = null;
    this.activeHoveredIndex = null;
  }

  private handleShoeClick(index: number): void {
    const item = this.items[index];
    const product: Product = {
      id: item.id,
      name: item.name,
      subtitle: `Sandalia Ergonómica ${item.edition}`,
      category: 'sandals',
      gender: 'Unisex',
      price: item.price,
      badge: item.badge as any,
      image: item.image,
      gallery: [item.image],
      colors: [
        { name: item.colorName, hex: '#0B3B24', image: item.image }
      ],
      sizes: [38, 39, 40, 41, 42, 43, 44],
      height: 'Baja',
      technology: ['CloudFoam Dual Density', 'Suela Anatómica Wave', 'Banda Texturizada'],
      features: ['Secado ultrarrápido', 'Plantilla con soporte de arco', 'Antideslizante'],
      description: `El modelo ${item.name} forma parte de la serie exclusiva de 10 pares de Blessed Sandals 2026. Diseñada para un descanso superior y un estilo inconfundible.`,
      rating: 5.0,
      reviewCount: 48 + index * 12,
      inStock: true,
      createdAt: '2026-02-17'
    };

    this.store.openQuickView(product);
  }

  private quickAddToCart(item: SlideItem): void {
    const product: Product = {
      id: item.id,
      name: item.name,
      subtitle: `Sandalia Ergonómica ${item.edition}`,
      category: 'sandals',
      gender: 'Unisex',
      price: item.price,
      image: item.image,
      gallery: [item.image],
      colors: [{ name: item.colorName, hex: '#0B3B24', image: item.image }],
      sizes: [40],
      height: 'Baja',
      technology: ['CloudFoam'],
      features: ['Confort total'],
      description: item.name,
      rating: 5.0,
      reviewCount: 50,
      inStock: true,
      createdAt: '2026-02-17'
    };

    this.store.addToCart(product, 40, item.colorName);
    Toast.show(`¡${item.name} añadido a tu bolsa de compras!`, 'Añadido con Éxito', 'success');
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
