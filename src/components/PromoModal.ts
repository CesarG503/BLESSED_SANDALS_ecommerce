import { Store } from '../state/store';
import { Icons } from './Icons';
import { Toast } from './Toast';
import confetti from 'canvas-confetti';

export class PromoModal {
  private container: HTMLElement;
  private store: Store;
  private inputCode: string = '';

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.store.subscribe(() => this.render());
  }

  public render(): void {
    const isOpen = this.store.isPromoOpen;
    const applied = this.store.appliedPromo;
    const subtotal = this.store.getCartSubtotal();

    if (isOpen) {
      this.container.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    } else {
      this.container.classList.remove('is-open');
      document.body.style.overflow = '';
      return;
    }

    this.container.innerHTML = `
      <div class="modal-backdrop" id="promo-modal-backdrop"></div>
      <div class="promo-modal-panel animate-scale-up" role="dialog" aria-modal="true">
        <!-- CABECERA -->
        <div class="promo-modal-header">
          <div class="promo-header-icon-title">
            <span class="promo-title-icon">${Icons.ticket('w-6 h-6')}</span>
            <div>
              <h3 class="promo-modal-title">Códigos Promocionales</h3>
              <p class="promo-modal-subtitle">Aplica tu cupón y ahorra en tu próxima compra</p>
            </div>
          </div>
          <button class="modal-close-btn" id="promo-modal-close" aria-label="Cerrar modal">
            ${Icons.close('w-5 h-5')}
          </button>
        </div>

        <!-- CUPÓN ACTUAL APLICADO (SI EXISTE) -->
        ${
          applied
            ? `
          <div class="promo-active-banner">
            <div class="promo-active-info">
              <span class="promo-badge-tag">${Icons.check('w-4 h-4')} Activo</span>
              <div>
                <strong class="promo-active-code">${applied.code}</strong>
                <p class="promo-active-desc">${applied.description}</p>
                <span class="promo-discount-calc">
                  Descuento estimado: <strong>-$${this.store.getDiscountAmount().toFixed(2)}</strong>
                </span>
              </div>
            </div>
            <button class="btn-remove-promo" id="btn-remove-promo-active" title="Remover cupón">
              Quitar
            </button>
          </div>
        `
            : ''
        }

        <!-- FORMULARIO PARA INGRESAR CÓDIGO -->
        <div class="promo-input-box">
          <label for="promo-code-input" class="promo-input-label">Ingresa tu código</label>
          <div class="promo-input-row">
            <div class="input-with-icon">
              <span class="field-icon">${Icons.ticket('w-4 h-4')}</span>
              <input 
                type="text" 
                id="promo-code-input" 
                class="promo-text-input" 
                placeholder="Ej. BLESSED10, WILD15..." 
                value="${this.inputCode}" 
                autocomplete="off"
                spellcheck="false"
              />
            </div>
            <button class="btn btn-primary btn-apply-promo" id="btn-submit-promo">
              Aplicar
            </button>
          </div>
        </div>

        <!-- CUPONES DISPONIBLES DE LA TIENDA -->
        <div class="promo-available-section">
          <h4 class="promo-section-heading">Cupones Disponibles</h4>
          <div class="promo-coupons-list">
            ${this.store.promoCodes
              .map((p) => {
                const isCurrent = applied?.code === p.code;
                return `
              <div class="promo-coupon-card ${isCurrent ? 'is-selected' : ''}">
                <div class="coupon-left">
                  <div class="coupon-tag-badge">
                    ${p.discountType === 'PERCENTAGE' ? `${p.discountValue}% OFF` : `-$${p.discountValue}`}
                  </div>
                  <div class="coupon-details">
                    <strong class="coupon-code-label">${p.code}</strong>
                    <p class="coupon-desc">${p.description}</p>
                    ${p.minPurchase ? `<span class="coupon-min">Compra mín. $${p.minPurchase}</span>` : ''}
                  </div>
                </div>
                <div class="coupon-right">
                  ${
                    isCurrent
                      ? `<span class="coupon-applied-status">${Icons.check('w-4 h-4')} Aplicado</span>`
                      : `<button class="btn-coupon-claim" data-code="${p.code}">Usar</button>`
                  }
                </div>
              </div>
            `;
              })
              .join('')}
          </div>
        </div>

        <!-- RESUMEN RÁPIDO DE CARRITO -->
        <div class="promo-cart-summary-footer">
          <div class="summary-line">
            <span>Subtotal de tu bolsa:</span>
            <strong>$${subtotal.toFixed(2)}</strong>
          </div>
          ${
            applied && this.store.getDiscountAmount() > 0
              ? `
            <div class="summary-line discount-line">
              <span>Descuento (${applied.code}):</span>
              <strong class="text-discount">-$${this.store.getDiscountAmount().toFixed(2)}</strong>
            </div>
            <div class="summary-line total-line">
              <span>Nuevo Total:</span>
              <strong class="text-primary">$${this.store.getCartTotal().toFixed(2)}</strong>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `;

    this.setupEvents();
  }

  private setupEvents(): void {
    // Cerrar con backdrop o botón X
    this.container.querySelector('#promo-modal-backdrop')?.addEventListener('click', () => {
      this.store.togglePromo(false);
    });

    this.container.querySelector('#promo-modal-close')?.addEventListener('click', () => {
      this.store.togglePromo(false);
    });

    // Input change
    const inputEl = this.container.querySelector('#promo-code-input') as HTMLInputElement | null;
    inputEl?.addEventListener('input', (e) => {
      this.inputCode = (e.target as HTMLInputElement).value;
    });

    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.submitCode();
      }
    });

    // Botón Aplicar
    this.container.querySelector('#btn-submit-promo')?.addEventListener('click', () => {
      this.submitCode();
    });

    // Remover cupón activo
    this.container.querySelector('#btn-remove-promo-active')?.addEventListener('click', () => {
      this.store.removePromo();
      Toast.show('Cupón removido');
    });

    // Botones de cupones disponibles "Usar"
    const claimBtns = this.container.querySelectorAll('.btn-coupon-claim');
    claimBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = (btn as HTMLElement).dataset.code;
        if (code) {
          const res = this.store.applyPromo(code);
          if (res.success) {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 }
            });
            Toast.show(res.message);
          } else {
            Toast.show(res.message);
          }
        }
      });
    });
  }

  private submitCode(): void {
    const code = this.inputCode.trim();
    if (!code) {
      Toast.show('Por favor ingresa un código.');
      return;
    }

    const res = this.store.applyPromo(code);
    if (res.success) {
      this.inputCode = '';
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
      Toast.show(res.message);
    } else {
      Toast.show(res.message);
    }
  }
}
