import { Store } from '../state/store';
import { Icons } from './Icons';
import { Toast } from './Toast';
import confetti from 'canvas-confetti';

export class CartDrawer {
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
      if (e.key === 'Escape' && this.store.isCartOpen && !this.isClosing) {
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
      this.store.toggleCart(false);
    }, 280);
  }

  public render(): void {
    const isOpen = this.store.isCartOpen;
    const cart = this.store.cart;
    const subtotal = this.store.getCartSubtotal();
    const discount = this.store.getDiscountAmount();
    const shipping = subtotal > 50 || subtotal === 0 ? 0 : 9.99;
    const total = Math.max(0, subtotal - discount + shipping);
    const appliedPromo = this.store.appliedPromo;

    const freeShippingThreshold = 50;
    const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);
    const amountLeftForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

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
      <div class="drawer-backdrop" id="cart-drawer-backdrop"></div>
      <aside class="drawer-panel" role="dialog" aria-modal="true">
        <!-- CABECERA DEL CARRITO -->
        <div class="drawer-header">
          <div class="drawer-title-row">
            <h3 class="drawer-title">Bolsa de Compras</h3>
            <span class="drawer-badge">${this.store.getCartCount()} items</span>
          </div>
          <button class="drawer-close-btn" id="cart-drawer-close" aria-label="Cerrar bolsa">
            ${Icons.close('w-6 h-6')}
          </button>
        </div>

        <!-- BARRA DE PROGRESO DE ENVÍO GRATIS -->
        <div class="shipping-progress-banner">
          ${
            subtotal >= freeShippingThreshold
              ? `<p class="shipping-msg success">🎉 ¡Felicidades! Tienes <strong>ENVÍO GRATIS</strong> en este pedido.</p>`
              : `<p class="shipping-msg">Agrega <strong>$${amountLeftForFreeShipping.toFixed(2)}</strong> más para obtener <strong>ENVÍO GRATIS</strong>.</p>`
          }
          <div class="progress-track">
            <div class="progress-bar" style="width: ${freeShippingProgress}%;"></div>
          </div>
        </div>

        <!-- LISTA DE PRODUCTOS O ESTADO VACÍO -->
        <div class="drawer-body">
          ${
            cart.length === 0
              ? `
              <div class="drawer-empty-state">
                <div class="empty-icon-box">
                  ${Icons.bag('w-12 h-12')}
                </div>
                <h4>Tu bolsa está vacía</h4>
                <p>Descubre las últimas tendencias en calzado y sandalias.</p>
                <button class="btn btn-primary" id="btn-cart-continue">
                  Explorar Catálogo
                </button>
              </div>
            `
              : `
              <ul class="cart-items-list">
                ${cart
                  .map(
                    (item) => `
                  <li class="cart-item-card animate-fade-in" data-item-id="${item.id}">
                    <img src="${item.color.image || item.product.image}" alt="${item.product.name}" class="cart-item-img" />
                    
                    <div class="cart-item-details">
                      <div class="cart-item-head">
                        <h5 class="cart-item-name">${item.product.name}</h5>
                        <button class="cart-item-remove" data-action="remove" data-id="${item.id}" title="Eliminar producto">
                          ${Icons.trash('w-4 h-4')}
                        </button>
                      </div>

                      <p class="cart-item-meta">
                        Talla: <strong>${item.size}</strong> | 
                        <span class="cart-item-color-preview" style="background-color: ${item.color.hex};"></span>
                        <span>${item.color.name}</span>
                      </p>

                      <div class="cart-item-bottom">
                        <div class="quantity-stepper small">
                          <button class="btn-qty" data-action="decrement" data-id="${item.id}">-</button>
                          <span class="qty-number">${item.quantity}</span>
                          <button class="btn-qty" data-action="increment" data-id="${item.id}">+</button>
                        </div>
                        <span class="cart-item-price">$${(item.product.price * item.quantity).toFixed(2)}</span>
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

        <!-- PIE DEL CARRITO (TOTALES Y CHECKOUT) -->
        ${
          cart.length > 0
            ? `
          <div class="drawer-footer">
            <!-- CUPÓN DE DESCUENTO -->
            <div class="promo-box">
              <input type="text" id="promo-input" placeholder="Código (Prueba: BLESSED10)" value="${appliedPromo ? appliedPromo.code : ''}" class="promo-input" />
              <button class="btn-apply-promo" id="btn-apply-promo">${appliedPromo ? 'Cambiar' : 'Aplicar'}</button>
            </div>
            ${
              this.store.blockPromoStacking && this.store.hasPromoItemsInCart()
                ? `<div class="promo-mix-alert" style="display: flex; align-items: center; gap: 6px; padding: 6px 10px; margin-top: 6px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; font-size: 0.70rem; color: #92400e;">
                    <span>🔒</span>
                    <span>Tu bolsa contiene artículos promocionales (no acumulables con cupones).</span>
                  </div>`
                : ''
            }
            ${
              appliedPromo
                ? `<div class="promo-applied-badge-row">
                    <span class="promo-success-msg">✓ Cupón activo: <strong>${appliedPromo.code}</strong> (${appliedPromo.description})</span>
                    <button class="btn-remove-promo-cart" id="btn-remove-promo-cart" title="Remover cupón">✕</button>
                  </div>`
                : ''
            }

            <div class="summary-breakdown">
              <div class="summary-row">
                <span>Subtotal</span>
                <span>$${subtotal.toFixed(2)}</span>
              </div>
              ${
                discount > 0 && appliedPromo
                  ? `
                <div class="summary-row discount">
                  <span>Descuento (${appliedPromo.code})</span>
                  <span>-$${discount.toFixed(2)}</span>
                </div>
              `
                  : ''
              }
              <div class="summary-row">
                <span>Envío estimado</span>
                <span>${shipping === 0 ? '<strong class="text-green">GRATIS</strong>' : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div class="summary-row total-row">
                <strong>Total a pagar</strong>
                <strong>$${total.toFixed(2)}</strong>
              </div>
            </div>

            <button class="btn btn-primary btn-checkout" id="btn-checkout">
              PAGAR AHORA ($${total.toFixed(2)}) ${Icons.arrowRight('w-4 h-4')}
            </button>

            <p class="checkout-guarantee">
              🔒 Pago Seguro SSL • Garantía Oficial Blessed Sandals
            </p>
          </div>
        `
            : ''
        }
      </aside>
    `;

    this.setupEvents();
  }

  private setupEvents(): void {
    // Cerrar Carrito
    const closeBtn = this.container.querySelector('#cart-drawer-close');
    const backdrop = this.container.querySelector('#cart-drawer-backdrop');

    closeBtn?.addEventListener('click', () => this.closeDrawer());
    backdrop?.addEventListener('click', () => this.closeDrawer());

    this.container.querySelector('#btn-cart-continue')?.addEventListener('click', () => {
      this.closeDrawer();
      setTimeout(() => {
        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    });

    // Control de cantidades y eliminación
    this.container.querySelectorAll('[data-action="increment"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) this.store.updateCartQuantity(id, 1);
      });
    });

    this.container.querySelectorAll('[data-action="decrement"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) this.store.updateCartQuantity(id, -1);
      });
    });

    this.container.querySelectorAll('[data-action="remove"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) {
          this.store.removeFromCart(id);
          Toast.show('Producto retirado de la bolsa', 'Bolsa de Compras', 'info');
        }
      });
    });

    // Cupón promocional
    this.container.querySelector('#btn-apply-promo')?.addEventListener('click', async () => {
      const input = this.container.querySelector('#promo-input') as HTMLInputElement | null;
      const code = input?.value.trim().toUpperCase();
      if (code) {
        const res = await this.store.applyPromo(code);
        if (res.success) {
          Toast.show(res.message, 'Cupón Aplicado', 'success');
        } else {
          Toast.show(res.message, 'Cupón', 'warning');
        }
      } else {
        this.store.togglePromo(true);
      }
    });

    this.container.querySelector('#btn-remove-promo-cart')?.addEventListener('click', () => {
      this.store.removePromo();
      Toast.show('Cupón removido');
    });

    // Checkout conectado a PostgreSQL
    this.container.querySelector('#btn-checkout')?.addEventListener('click', async () => {
      await this.handleCheckout();
    });
  }

  private async handleCheckout(): Promise<void> {
    const total = this.store.getCartTotal();
    const res = await this.store.checkout();

    if (res.success) {
      // Disparo de confetti festivo
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0B3B24', '#d2b588', '#ffffff', '#cf2228']
      });

      this.store.toggleCart(false);
      Toast.show(
        `¡Pedido ${res.orderNumber} por $${total.toFixed(2)} registrado con éxito! Tu cupón ha sido procesado en la base de datos.`,
        '¡Compra Exitosa!',
        'success',
        6000
      );
    } else {
      Toast.show(res.message, 'Atención', 'warning');
    }
  }
}
