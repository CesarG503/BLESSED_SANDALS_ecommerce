import { Store } from '../state/store';
import { Icons } from './Icons';
import { Toast } from './Toast';
import confetti from 'canvas-confetti';

export class PromoModal {
  private container: HTMLElement;
  private store: Store;
  private inputCode: string = '';
  private expandedCodes: Set<string> = new Set();
  private repositionHandler: (() => void) | null = null;

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.store.subscribe(() => this.render());
    this.setupGlobalListeners();
  }

  private setupGlobalListeners(): void {
    // Cerrar con tecla Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.store.isPromoOpen) {
        this.store.togglePromo(false);
      }
    });

    this.repositionHandler = () => {
      if (this.store.isPromoOpen) {
        this.updatePosition();
      }
    };

    window.addEventListener('resize', this.repositionHandler, { passive: true });
    window.addEventListener('scroll', this.repositionHandler, { passive: true });
  }

  public render(): void {
    const isOpen = this.store.isPromoOpen;
    const applied = this.store.appliedPromo;
    const user = this.store.currentUser;

    if (!isOpen) {
      this.container.classList.remove('is-open');
      this.container.innerHTML = '';
      return;
    }

    this.container.classList.add('is-open');

    // Mapeo de cupones personales del usuario logueado
    const userCouponsMap: Record<string, boolean> = {};
    if (user && user.userCoupons) {
      user.userCoupons.forEach((uc) => {
        userCouponsMap[uc.promoCode.code] = uc.isUsed;
      });
    }

    this.container.innerHTML = `
      <!-- FONDO TRANSPARENTE PARA CERRAR AL HACER CLIC AFUERA (SIN BLUR, SIN OSCURECER LA WEB) -->
      <div class="promo-popover-dismiss" id="promo-popover-dismiss" aria-hidden="true"></div>

      <!-- POPOVER COMPACTO FLOTANTE DEBAJO DEL BOTÓN DE TICKET -->
      <div class="promo-popover-card animate-promo-pop" id="promo-popover-panel" role="dialog" aria-modal="true">
        <!-- FLECHA APUNTANDO AL BOTÓN DEL HEADER -->
        <div class="promo-popover-arrow" id="promo-popover-arrow" aria-hidden="true"></div>

        <!-- BOTÓN DE CERRAR LIMPIO EN LA ESQUINA SUPERIOR -->
        <div class="promo-popover-top-bar">
          <button class="promo-popover-close-btn" id="promo-modal-close" aria-label="Cerrar ventana">
            ${Icons.close('w-3.5 h-3.5')}
          </button>
        </div>

        <!-- CUPÓN ACTIVO (SI YA HAY UNO APLICADO) -->
        ${
          applied
            ? `
          <div class="promo-popover-active-row">
            <div class="promo-active-left">
              <span class="promo-active-icon">${Icons.check('w-3 h-3')}</span>
              <div class="promo-active-text">
                <span class="promo-active-label">Activo: <strong>${applied.code}</strong></span>
                <span class="promo-active-desc">${applied.description}</span>
              </div>
            </div>
            <button class="btn-promo-remove" id="btn-remove-promo-active" title="Quitar cupón">
              Quitar
            </button>
          </div>
        `
            : ''
        }

        <!-- FORMULARIO ULTRA-COMPACTO DE CUPÓN CON LÍNEA FINA -->
        <div class="promo-popover-input-area">
          <div class="promo-input-compact-row">
            <div class="promo-input-field-wrap">
              <input 
                type="text" 
                id="promo-code-input" 
                class="promo-compact-input" 
                placeholder="${user ? 'Ingresa tu código...' : 'Inicia sesión para canjear...'}" 
                value="${this.inputCode}" 
                autocomplete="off"
                spellcheck="false"
              />
            </div>
            <button class="btn-promo-compact-apply" id="btn-submit-promo">
              Aplicar
            </button>
          </div>
        </div>

        <!-- SECCIÓN DE "MIS CUPONES" -->
        <div class="promo-popover-chips-area">
          <div class="promo-section-title-row">
            <span class="promo-chips-title">${user ? 'Mis Cupones Personales' : 'Cupones de Descuento'}</span>
            ${
              user
                ? `<span class="promo-user-active-badge">${user.name}</span>`
                : `<span class="promo-user-active-badge" style="background:#f3f4f6; color:#6b7280;">Requiere cuenta</span>`
            }
          </div>

          ${
            user
              ? `
            <!-- SI EL USUARIO TIENE CUENTA: SE MUESTRAN SUS CUPONES CON TEXTO EXPANDIBLE AL CLIC -->
            <div class="promo-coupons-stack">
              ${this.store.promoCodes
                .map((p) => {
                  const isCurrent = applied?.code === p.code;
                  const isUsed = userCouponsMap[p.code] ?? (p.isUsedByUser ?? false);
                  const valueText = p.discountType === 'PERCENTAGE' ? `${p.discountValue}%` : `$${p.discountValue}`;
                  const isExpanded = this.expandedCodes.has(p.code);

                  let actionBtnHtml = '';
                  if (isCurrent) {
                    actionBtnHtml = `<span class="coupon-status-applied">${Icons.check('w-3 h-3')} Activo</span>`;
                  } else if (isUsed) {
                    actionBtnHtml = `<span class="coupon-status-used" title="Ya utilizado por tu cuenta">Canjeado</span>`;
                  } else {
                    actionBtnHtml = `<button type="button" class="btn-claim-coupon" data-code="${p.code}">Usar</button>`;
                  }

                  return `
                <div class="promo-coupon-item ${isExpanded ? 'is-expanded' : ''} ${isUsed ? 'is-redeemed-opacity' : ''}" data-coupon="${p.code}">
                  <div class="promo-coupon-main">
                    <div class="promo-coupon-left" data-action="toggle-info" data-code="${p.code}">
                      <strong class="promo-coupon-code">${p.code}</strong>
                      <span class="promo-discount-pill">-${valueText}</span>
                      <button type="button" class="btn-coupon-info-toggle" data-action="toggle-info" data-code="${p.code}" title="Ver detalles" aria-label="Ver detalles">
                        <svg class="w-3 h-3 info-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>
                    </div>
                    <div class="promo-coupon-right">
                      ${actionBtnHtml}
                    </div>
                  </div>
                  <div class="promo-coupon-expandable">
                    <p class="promo-coupon-explanation">
                      ${p.description}
                      ${p.minPurchase ? `<span class="promo-min-text">• Compra mínima: $${p.minPurchase}</span>` : ''}
                      ${p.onePerUser ? `<span class="promo-min-text" style="color: #0d643d;">• 1 solo uso por persona</span>` : ''}
                      ${isUsed ? `<span class="promo-min-text" style="color: #dc2626; font-weight: 600;">(Ya fue canjeado en tu cuenta)</span>` : ''}
                    </p>
                  </div>
                </div>
              `;
                })
                .join('')}
            </div>
          `
              : `
            <!-- SI NO TIENE CUENTA: SE MUESTRA EL CUPÓN DE BIENVENIDA5 Y AL DAR CLIC LO MANDA AL LOGIN / REGISTER -->
            <div class="promo-coupons-stack">
              <div class="promo-coupon-item ${this.expandedCodes.has('BIENVENIDA5') ? 'is-expanded' : ''}" data-coupon="BIENVENIDA5">
                <div class="promo-coupon-main">
                  <div class="promo-coupon-left" data-action="toggle-info" data-code="BIENVENIDA5">
                    <strong class="promo-coupon-code">BIENVENIDA5</strong>
                    <span class="promo-discount-pill">-5%</span>
                    <button type="button" class="btn-coupon-info-toggle" data-action="toggle-info" data-code="BIENVENIDA5" title="Ver detalles" aria-label="Ver detalles">
                      <svg class="w-3 h-3 info-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>
                  <div class="promo-coupon-right">
                    <!-- AL NO ESTAR LOGUEADO: EL BOTÓN CANJEAR LO ENVÍA AL LOGIN/REGISTER DIRECTO -->
                    <button type="button" class="btn-claim-coupon" data-code="BIENVENIDA5" title="Inicia sesión o regístrate para canjear">
                      Canjear
                    </button>
                  </div>
                </div>
                <!-- TEXTO EXTRA QUE SOLO SE MUESTRA AL DARLE CLIC -->
                <div class="promo-coupon-expandable">
                  <p class="promo-coupon-explanation">
                    Cupón de bienvenida exclusivo para cuenta nueva (5% de descuento en tu compra). 
                    <span style="display:block; margin-top:3px; color:#0d643d; font-weight:600;">Regístrate para agregarlo a tu cuenta personal.</span>
                  </p>
                </div>
              </div>
            </div>

            <!-- INVITACIÓN A INICIAR SESIÓN O REGISTRARSE -->
            <div class="promo-login-invite">
              <button type="button" class="btn-invite-login" id="link-open-login-from-promo">
                Inicia sesión o regístrate para activar cupones →
              </button>
            </div>
          `
          }
        </div>
      </div>
    `;

    this.setupEvents();
    this.updatePosition();

    // Auto-focus al campo de cupón para escribir inmediatamente sin clics adicionales
    setTimeout(() => {
      const inputEl = this.container.querySelector('#promo-code-input') as HTMLInputElement | null;
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 50);
  }

  /**
   * Posiciona el popover con precisión milimétrica justo debajo del botón de ticket
   */
  private updatePosition(): void {
    const btn = document.getElementById('header-promo-btn');
    const panel = this.container.querySelector('#promo-popover-panel') as HTMLElement | null;
    const arrow = this.container.querySelector('#promo-popover-arrow') as HTMLElement | null;

    if (!btn || !panel) return;

    const rect = btn.getBoundingClientRect();
    const popoverWidth = Math.min(320, window.innerWidth - 24);
    panel.style.width = `${popoverWidth}px`;

    // Posición Vertical: Justo debajo del botón
    const top = rect.bottom + 10;

    // Posición Horizontal: Centrado bajo el botón y acotado por los márgenes de la pantalla
    const margin = 12;
    let left = rect.left + rect.width / 2 - popoverWidth / 2;

    if (left + popoverWidth > window.innerWidth - margin) {
      left = window.innerWidth - popoverWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;

    // Flechita apuntando al centro exacto del botón de ticket
    if (arrow) {
      const buttonCenter = rect.left + rect.width / 2;
      const arrowLeft = Math.max(16, Math.min(popoverWidth - 24, buttonCenter - left - 6));
      arrow.style.left = `${arrowLeft}px`;
    }
  }

  private setupEvents(): void {
    // Cerrar al hacer clic afuera (fondo transparente) o en la X
    this.container.querySelector('#promo-popover-dismiss')?.addEventListener('click', () => {
      this.store.togglePromo(false);
    });

    this.container.querySelector('#promo-modal-close')?.addEventListener('click', () => {
      this.store.togglePromo(false);
    });

    // Control de texto
    const inputEl = this.container.querySelector('#promo-code-input') as HTMLInputElement | null;
    inputEl?.addEventListener('input', (e) => {
      this.inputCode = (e.target as HTMLInputElement).value;
    });

    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submitCode();
      }
    });

    // Botón Aplicar
    this.container.querySelector('#btn-submit-promo')?.addEventListener('click', () => {
      this.submitCode();
    });

    // Quitar cupón activo
    this.container.querySelector('#btn-remove-promo-active')?.addEventListener('click', () => {
      this.store.removePromo();
      Toast.show('Cupón removido');
    });

    // Toggle para expandir información extra al hacer clic en el cupón o en la flechita
    const toggleTriggers = this.container.querySelectorAll('[data-action="toggle-info"]');
    toggleTriggers.forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = (trigger as HTMLElement).dataset.code;
        if (code) {
          if (this.expandedCodes.has(code)) {
            this.expandedCodes.delete(code);
          } else {
            this.expandedCodes.add(code);
          }
          const itemEl = this.container.querySelector(`[data-coupon="${code}"]`);
          if (itemEl) {
            itemEl.classList.toggle('is-expanded');
          }
        }
      });
    });

    // Clic en los botones "Canjear" / "Usar"
    const claimBtns = this.container.querySelectorAll('.btn-claim-coupon');
    claimBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = (btn as HTMLElement).dataset.code;
        if (code) {
          this.applySpecificCode(code);
        }
      });
    });

    // Clic para abrir login desde el popover
    this.container.querySelector('#link-open-login-from-promo')?.addEventListener('click', () => {
      this.store.togglePromo(false);
      this.store.toggleAuth(true);
    });
  }

  private async applySpecificCode(code: string): Promise<void> {
    const res = await this.store.applyPromo(code);
    if (res.success) {
      confetti({
        particleCount: 50,
        spread: 65,
        origin: { y: 0.15 }
      });
      Toast.show(res.message);
    } else {
      Toast.show(res.message);
    }
  }

  private async submitCode(): Promise<void> {
    const code = this.inputCode.trim();
    if (!code) {
      Toast.show('Por favor ingresa un código.');
      return;
    }

    const res = await this.store.applyPromo(code);
    if (res.success) {
      this.inputCode = '';
      confetti({
        particleCount: 50,
        spread: 65,
        origin: { y: 0.15 }
      });
      Toast.show(res.message);
    } else {
      Toast.show(res.message);
    }
  }
}
