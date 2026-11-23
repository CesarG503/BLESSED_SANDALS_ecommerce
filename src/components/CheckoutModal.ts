import { Store } from '../state/store';
import { ApiService } from '../services/apiService';
import { Icons } from './Icons';
import { Toast } from './Toast';
import confetti from 'canvas-confetti';
import { MapPickerModal, SelectedLocation } from './MapPickerModal';
import { EL_SALVADOR_DEPARTMENTS } from '../data/departments';

export class CheckoutModal {
  private container: HTMLElement;
  private store: Store;
  
  private isLoadingProfile: boolean = false;
  private isProcessingPayment: boolean = false;
  private processingStepText: string = 'Conectando con la pasarela de pagos segura...';
  
  private profileData: {
    addresses: any[];
    paymentCards: any[];
  } | null = null;

  // Estado de Dirección
  private selectedAddressId: string = '';
  private isAddingNewAddress: boolean = false;
  private isChangingAddress: boolean = false;
  private newAddress = {
    fullName: '',
    phone: '',
    state: 'San Salvador',
    city: 'San Salvador Centro (Escalón, San Benito, Centro)',
    street: '',
    reference: '',
    postalCode: '1101',
    isDefault: true
  };

  // Estado de Método de Pago
  private selectedCardId: string = '';
  private isAddingNewCard: boolean = false;
  private newCard = {
    cardHolder: '',
    cardNumber: '',
    expMonth: 12,
    expYear: 2028,
    cvc: '',
    balance: 500, // Balance asignado en backend para permitir compras normales
    saveCard: true
  };

  private errorMessage: string | null = null;
  private checkoutSuccessData: {
    orderNumber: string;
    cardBrand: string;
    cardLast4: string;
    remainingBalance?: number;
    shippingAddress: string;
    total: number;
  } | null = null;

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.store.subscribe(() => {
      if (this.store.isCheckoutOpen && !this.profileData && !this.isLoadingProfile) {
        this.fetchProfileData();
      }
      this.render();
    });

    this.setupGlobalListeners();
  }

  private setupGlobalListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.store.isCheckoutOpen && !this.isProcessingPayment) {
        this.close();
      }
    });
  }

  private close(): void {
    this.errorMessage = null;
    this.checkoutSuccessData = null;
    this.isAddingNewAddress = false;
    this.isChangingAddress = false;
    this.isAddingNewCard = false;
    this.store.toggleCheckout(false);
  }

  private async fetchProfileData(): Promise<void> {
    if (!this.store.currentUser) return;
    this.isLoadingProfile = true;
    try {
      const res = await ApiService.getUserProfile(this.store.currentUser.id);
      const profile = (res as any).data || (res as any).user;
      if (res.success && profile) {
        this.profileData = {
          addresses: profile.addresses || [],
          paymentCards: profile.paymentCards || []
        };

        // Preseleccionar dirección predeterminada
        if (this.profileData.addresses.length > 0) {
          const defaultAddr = this.profileData.addresses.find((a: any) => a.isDefault);
          this.selectedAddressId = defaultAddr ? defaultAddr.id : this.profileData.addresses[0].id;
          this.isAddingNewAddress = false;
        } else {
          this.isAddingNewAddress = true;
          this.newAddress.fullName = this.store.currentUser.name || '';
        }

        // Preseleccionar tarjeta
        if (this.profileData.paymentCards.length > 0) {
          const defaultCard = this.profileData.paymentCards.find((c: any) => c.isDefault);
          this.selectedCardId = defaultCard ? defaultCard.id : this.profileData.paymentCards[0].id;
          this.isAddingNewCard = false;
        } else {
          this.isAddingNewCard = true;
        }
        
        if (!this.newCard.cardHolder && this.store.currentUser.name) {
          this.newCard.cardHolder = this.store.currentUser.name.toUpperCase();
        }
      }
    } catch (err) {
      console.error('Error cargando datos de checkout:', err);
    } finally {
      this.isLoadingProfile = false;
      this.render();
    }
  }

  public render(): void {
    if (!this.store.isCheckoutOpen) {
      this.container.innerHTML = '';
      this.container.classList.remove('is-open');
      document.body.style.overflow = '';
      return;
    }

    this.container.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // Si ya completó la compra, mostrar pantalla de éxito
    if (this.checkoutSuccessData) {
      this.container.innerHTML = this.renderSuccessScreen();
      this.setupSuccessEvents();
      return;
    }

    const items = this.store.cart;
    const subtotal = this.store.getCartSubtotal();
    const discount = this.store.getDiscountAmount();
    const shipping = subtotal > 50 || subtotal === 0 ? 0 : 9.99;
    const total = Math.max(0, subtotal - discount + shipping);

    this.container.innerHTML = `
      <div class="checkout-modal-backdrop" id="checkout-backdrop"></div>
      
      <div class="checkout-modal-wrapper" role="dialog" aria-modal="true">
        <div class="checkout-card">
          
          <!-- HEADER MINIMALISTA DE CHECKOUT (SIN TEXTOS DE TEST) -->
          <div class="checkout-header">
            <div class="checkout-header-branding">
              <span class="checkout-brand-eyebrow">BLESSED SANDALS • FINALIZAR COMPRA</span>
              <h2 class="checkout-title">Confirmar Pedido</h2>
            </div>
            
            <div class="checkout-header-actions">
              <span class="stripe-badge-pill">
                🔒 Pago Seguro SSL
              </span>
              <button class="checkout-btn-close" id="btn-close-checkout" title="Cerrar checkout" ${this.isProcessingPayment ? 'disabled' : ''}>
                ${Icons.close('w-5 h-5')}
              </button>
            </div>
          </div>

          <!-- CONTENIDO PRINCIPAL EN 2 COLUMNAS -->
          <div class="checkout-body">
            
            <!-- COLUMNA IZQUIERDA: DIRECCIÓN Y MÉTODO DE PAGO -->
            <div class="checkout-left-col">
              
              <!-- SECCIÓN 1: DIRECCIÓN DE ENTREGA -->
              <div class="checkout-section-box">
                <div class="section-box-header">
                  <div class="section-box-title">
                    <span class="section-num">1</span>
                    <h3>Dirección de Entrega</h3>
                  </div>
                  ${this.profileData && this.profileData.addresses.length > 0 && !this.isAddingNewAddress
                    ? `<button type="button" class="btn-text-action" id="btn-toggle-new-address">+ Nueva Dirección</button>`
                    : ''
                  }
                </div>

                ${this.renderAddressSection()}
              </div>

              <!-- SECCIÓN 2: MÉTODO DE PAGO CON TARJETA -->
              <div class="checkout-section-box">
                <div class="section-box-header">
                  <div class="section-box-title">
                    <span class="section-num">2</span>
                    <h3>Método de Pago</h3>
                  </div>
                  <span class="section-secure-tag">
                    🔒 Cifrado Bancario SSL 256-bit
                  </span>
                </div>

                ${this.renderPaymentMethodSection(total)}
              </div>

            </div>

            <!-- COLUMNA DERECHA: RESUMEN "QUÉ LLEVAS Y PRECIO A PAGAR" -->
            <div class="checkout-right-col">
              <div class="order-summary-box">
                <h3 class="summary-box-title">
                  Tu Selección <span class="summary-count">(${items.reduce((acc, it) => acc + it.quantity, 0)} ${items.reduce((acc, it) => acc + it.quantity, 0) === 1 ? 'par' : 'pares'})</span>
                </h3>

                <!-- LISTA DE CALZADOS -->
                <div class="summary-items-list custom-scrollbar">
                  ${items.map((item) => `
                    <div class="summary-item-card">
                      <div class="summary-item-img-wrap">
                        <img src="${item.product.image}" alt="${item.product.name}" class="summary-item-img" />
                        <span class="summary-item-qty">${item.quantity}</span>
                      </div>
                      <div class="summary-item-info">
                        <h4 class="summary-item-name">${item.product.name}</h4>
                        <p class="summary-item-meta">
                          Color: <strong>${item.color?.name || 'Original'}</strong> • Talla: <strong>US ${item.size}</strong>
                        </p>
                        <span class="summary-item-price">$${(item.product.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <!-- DESGLOSE DE COSTOS -->
                <div class="summary-pricing-breakdown">
                  <div class="pricing-row">
                    <span>Subtotal</span>
                    <span>$${subtotal.toFixed(2)}</span>
                  </div>

                  ${discount > 0 ? `
                    <div class="pricing-row discount-row">
                      <span>Cupón Descuento ${this.store.appliedPromo ? `(${this.store.appliedPromo.code})` : ''}</span>
                      <span>-$${discount.toFixed(2)}</span>
                    </div>
                  ` : ''}

                  <div class="pricing-row">
                    <span>Envío a El Salvador</span>
                    <span>${shipping === 0 ? '<strong class="text-free-shipping">GRATIS</strong>' : `$${shipping.toFixed(2)}`}</span>
                  </div>

                  <div class="pricing-row total-row">
                    <div>
                      <strong>Total a Pagar</strong>
                      <small class="total-inclusive">Impuestos incluidos</small>
                    </div>
                    <strong class="total-amount">$${total.toFixed(2)}</strong>
                  </div>
                </div>

                <!-- ALERTA DE ERROR SI EXISTE -->
                ${this.errorMessage ? `
                  <div class="checkout-error-banner">
                    <div class="error-banner-icon">⚠️</div>
                    <div class="error-banner-content">
                      <strong>Transacción No Completada</strong>
                      <p>${this.errorMessage}</p>
                    </div>
                  </div>
                ` : ''}

                <!-- BOTÓN PRINCIPAL DE PAGO -->
                <button class="btn-checkout-pay" id="btn-process-payment" ${this.isProcessingPayment ? 'disabled' : ''}>
                  <span>PAGAR AHORA ($${total.toFixed(2)})</span>
                  ${Icons.chevronRight('w-5 h-5')}
                </button>

                <div class="checkout-security-notice">
                  <p>
                    🔒 Pago Seguro SSL • Garantía Oficial Blessed Sandals
                  </p>
                </div>
              </div>
            </div>

          </div>

          <!-- SPINNER DE CARGA OVERLAY -->
          ${this.isProcessingPayment ? `
            <div class="checkout-processing-overlay">
              <div class="processing-card">
                <div class="stripe-spinner-ring">
                  <div class="spinner-blade"></div>
                </div>
                <h3 class="processing-title">Procesando Pago Seguro...</h3>
                <p class="processing-subtitle">${this.processingStepText}</p>
                <div class="processing-steps-indicator">
                  <div class="indicator-bar is-active"></div>
                </div>
                <small class="processing-hint">Por favor espera unos instantes mientras validamos tu transacción</small>
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    `;

    this.setupEvents(total);
  }

  // --- SECCIÓN DE DIRECCIÓN DE ENVÍO ---
  private renderAddressSection(): string {
    if (this.isLoadingProfile) {
      return `
        <div class="section-loading">
          <div class="loading-mini-spinner"></div>
          <span>Cargando dirección de entrega...</span>
        </div>
      `;
    }

    const addresses = this.profileData?.addresses || [];

    // Caso 1: Usuario quiere agregar una nueva dirección o no tiene ninguna
    if (this.isAddingNewAddress || addresses.length === 0) {
      return this.renderAddressForm(addresses.length > 0);
    }

    // Caso 2: El usuario desea cambiar entre sus direcciones guardadas
    if (this.isChangingAddress && addresses.length > 1) {
      return `
        <div class="address-change-container">
          <div class="address-change-header">
            <span class="change-instruction">Selecciona una dirección de entrega:</span>
            <button type="button" class="btn-text-action" id="btn-cancel-change-addr">Listo</button>
          </div>
          <div class="saved-addresses-selector">
            ${addresses.map((addr: any) => {
              const isSelected = addr.id === this.selectedAddressId;
              return `
                <label class="address-radio-card ${isSelected ? 'is-selected' : ''}" data-id="${addr.id}">
                  <div class="radio-header-line">
                    <input type="radio" name="checkout-address" value="${addr.id}" ${isSelected ? 'checked' : ''} />
                    <span class="addr-name">${addr.fullName}</span>
                    ${addr.isDefault ? `<span class="addr-badge-default">Principal</span>` : ''}
                  </div>
                  <p class="addr-text">
                    ${addr.street}, ${addr.city}, ${addr.state}, El Salvador
                  </p>
                  <span class="addr-phone">📞 ${addr.phone}</span>
                </label>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Caso 3: Muestra la dirección actualmente seleccionada (la predeterminada)
    const selectedAddr = addresses.find((a: any) => a.id === this.selectedAddressId) || addresses[0];

    return `
      <div class="selected-address-card">
        <div class="address-card-header">
          <div class="address-card-meta">
            <strong class="address-recipient-name">${selectedAddr.fullName}</strong>
            ${selectedAddr.isDefault ? `<span class="addr-badge-default">Dirección Principal</span>` : `<span class="addr-badge-selected">Seleccionada</span>`}
          </div>
          <span class="address-card-phone">📞 ${selectedAddr.phone}</span>
        </div>

        <p class="address-card-street">${selectedAddr.street}</p>
        <p class="address-card-locality">${selectedAddr.city}, ${selectedAddr.state}, El Salvador ${selectedAddr.postalCode ? `(CP ${selectedAddr.postalCode})` : ''}</p>

        <div class="address-card-actions">
          ${addresses.length > 1 ? `
            <button type="button" class="btn-change-address" id="btn-toggle-change-addr">
              Cambiar dirección (${addresses.length} guardadas)
            </button>
          ` : ''}
          <button type="button" class="btn-add-address-link" id="btn-open-new-addr">
            + Agregar otra dirección
          </button>
        </div>
      </div>
    `;
  }

  // Formulario idéntico al de Perfil con selector de mapa y departamentos de El Salvador
  private renderAddressForm(canCancel: boolean): string {
    const defaultDept = this.newAddress.state || 'San Salvador';
    const deptCities = EL_SALVADOR_DEPARTMENTS[defaultDept] || [];

    return `
      <div class="checkout-address-form-box">
        <div class="address-form-header-line">
          <div>
            <h4 class="form-box-heading">Nueva Dirección en El Salvador</h4>
            <p class="form-box-sub">Completa los datos de envío o selecciona tu ubicación en el mapa.</p>
          </div>
          ${canCancel ? `<button type="button" class="btn-close-form" id="btn-cancel-addr-form">${Icons.close('w-4 h-4')}</button>` : ''}
        </div>

        <!-- BOTÓN SELECCIONAR UBICACIÓN CON MAPS (IGUAL AL PERFIL) -->
        <div class="form-map-trigger-row" style="margin-bottom: 12px;">
          <button type="button" class="btn btn-select-location-map" id="btn-checkout-map-picker">
            <svg class="map-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
              <line x1="8" y1="2" x2="8" y2="18"></line>
              <line x1="16" y1="6" x2="16" y2="22"></line>
            </svg>
            Seleccionar ubicación en Mapa
          </button>
        </div>

        <form id="form-checkout-address" class="address-form-inner">
          <div class="form-grid-2">
            <div class="input-field">
              <label for="checkout-addr-fullname">Nombre de quien recibe *</label>
              <input type="text" id="checkout-addr-fullname" value="${this.newAddress.fullName}" placeholder="Ej: Alexander Garay" required />
            </div>
            <div class="input-field">
              <label for="checkout-addr-phone">Teléfono de contacto (+503) *</label>
              <input type="tel" id="checkout-addr-phone" value="${this.newAddress.phone}" placeholder="Ej: 7123-4567" required />
            </div>
          </div>

          <div class="form-grid-2">
            <div class="input-field">
              <label for="checkout-addr-state">Departamento de El Salvador *</label>
              <select id="checkout-addr-state" required>
                ${Object.keys(EL_SALVADOR_DEPARTMENTS).map((d) => `
                  <option value="${d}" ${d === defaultDept ? 'selected' : ''}>${d}</option>
                `).join('')}
              </select>
            </div>
            <div class="input-field">
              <label for="checkout-addr-city">Municipio / Distrito *</label>
              <select id="checkout-addr-city" required>
                ${deptCities.map((c) => `
                  <option value="${c}" ${c === this.newAddress.city ? 'selected' : ''}>${c}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="input-field">
            <label for="checkout-addr-street">Dirección exacta (Colonia, Calle, Pasaje, Casa/Apto) *</label>
            <textarea id="checkout-addr-street" rows="2" placeholder="Ej: Colonia Escalón, Calle El Mirador, Pasaje 3 #12" required>${this.newAddress.street}</textarea>
          </div>

          <div class="form-grid-2">
            <div class="input-field">
              <label for="checkout-addr-reference">Punto de Referencia (Opcional)</label>
              <input type="text" id="checkout-addr-reference" value="${this.newAddress.reference}" placeholder="Ej: Frente al parque, portón blanco" />
            </div>
            <div class="input-field">
              <label for="checkout-addr-postal">Código Postal</label>
              <input type="text" id="checkout-addr-postal" value="${this.newAddress.postalCode}" placeholder="1101" />
            </div>
          </div>

          <div class="checkbox-field">
            <label>
              <input type="checkbox" id="checkout-addr-default" ${this.newAddress.isDefault ? 'checked' : ''} />
              <span>Establecer como dirección de entrega principal</span>
            </label>
          </div>

          <div class="form-actions-row" style="margin-top: 8px;">
            ${canCancel ? `<button type="button" class="btn btn-outline" id="btn-cancel-addr-bottom">Cancelar</button>` : ''}
            <button type="submit" class="btn btn-primary" id="btn-submit-checkout-addr">Guardar Dirección</button>
          </div>
        </form>
      </div>
    `;
  }

  // --- SECCIÓN DE MÉTODO DE PAGO CON TARJETA ---
  private renderPaymentMethodSection(_cartTotal: number): string {
    const cards = this.profileData?.paymentCards || [];
    const hasSavedCards = cards.length > 0;

    // Si no tiene tarjetas, o seleccionó agregar una nueva: mostrar formulario limpio
    if (!hasSavedCards || this.isAddingNewCard) {
      return this.renderCleanCardForm(hasSavedCards);
    }

    // Si tiene tarjetas guardadas: mostrar selector de tarjetas limpias
    return `
      <div class="saved-cards-container">
        <div class="saved-cards-list">
          ${cards.map((card: any) => {
            const isSelected = card.id === this.selectedCardId;
            return `
              <div class="saved-card-radio-box ${isSelected ? 'is-selected' : ''}" data-id="${card.id}">
                <div class="saved-card-top-row">
                  <div class="saved-card-left">
                    <input type="radio" name="checkout-card" value="${card.id}" ${isSelected ? 'checked' : ''} />
                    <span class="card-brand-badge ${card.brand.toLowerCase()}">${card.brand}</span>
                    <strong class="card-number-mask">•••• •••• •••• ${card.last4}</strong>
                  </div>
                  <div class="saved-card-right">
                    <span class="card-exp">Vence ${card.expMonth < 10 ? '0' + card.expMonth : card.expMonth}/${card.expYear.toString().slice(-2)}</span>
                  </div>
                </div>

                <div class="saved-card-holder-line">
                  <span class="card-holder-title">Titular: <strong>${card.cardHolder}</strong></span>
                  ${card.isDefault ? `<span class="badge-card-default">Predeterminada</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <button type="button" class="btn-text-action" id="btn-toggle-new-card" style="margin-top: 8px;">
          + Agregar otra tarjeta
        </button>
      </div>
    `;
  }

  // Formulario limpio para agregar tarjeta de pago
  private renderCleanCardForm(hasSavedCards: boolean): string {
    return `
      <div class="clean-card-form-box">
        ${hasSavedCards ? `
          <div class="clean-card-header">
            <h4>Nueva Tarjeta de Crédito / Débito</h4>
            <button type="button" class="btn-text-action" id="btn-cancel-new-card">Usar tarjeta guardada</button>
          </div>
        ` : ''}

        <div class="form-grid-2">
          <div class="input-field">
            <label for="new-card-holder">Nombre en la Tarjeta (Titular) *</label>
            <input type="text" id="new-card-holder" value="${this.newCard.cardHolder}" placeholder="ALEXANDER GARAY" required />
          </div>
          <div class="input-field">
            <label for="new-card-number">Número de Tarjeta (16 dígitos) *</label>
            <input type="text" id="new-card-number" value="${this.newCard.cardNumber}" maxlength="19" placeholder="4242 •••• •••• ••••" required />
          </div>
        </div>

        <div class="form-grid-3">
          <div class="input-field">
            <label for="new-card-month">Mes *</label>
            <select id="new-card-month">
              ${Array.from({ length: 12 }, (_, i) => i + 1).map((m) => `
                <option value="${m}" ${m === this.newCard.expMonth ? 'selected' : ''}>${m < 10 ? '0' + m : m}</option>
              `).join('')}
            </select>
          </div>
          <div class="input-field">
            <label for="new-card-year">Año *</label>
            <select id="new-card-year">
              ${Array.from({ length: 8 }, (_, i) => 2026 + i).map((y) => `
                <option value="${y}" ${y === this.newCard.expYear ? 'selected' : ''}>${y}</option>
              `).join('')}
            </select>
          </div>
          <div class="input-field">
            <label for="new-card-cvc">CVC *</label>
            <input type="password" id="new-card-cvc" value="${this.newCard.cvc}" maxlength="4" placeholder="•••" required />
          </div>
        </div>

        <div class="checkbox-field">
          <label>
            <input type="checkbox" id="new-card-save" ${this.newCard.saveCard ? 'checked' : ''} />
            <span>Guardar esta tarjeta de forma segura para compras futuras</span>
          </label>
        </div>
      </div>
    `;
  }

  // --- PANTALLA DE ÉXITO (SIN MENCIONES A STRIPE TEST) ---
  private renderSuccessScreen(): string {
    const data = this.checkoutSuccessData!;
    return `
      <div class="checkout-modal-backdrop is-visible"></div>
      
      <div class="checkout-modal-wrapper" role="dialog" aria-modal="true">
        <div class="checkout-card success-card-view">
          
          <div class="success-icon-wrapper">
            <div class="success-icon-circle">
              <svg class="success-check-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>

          <span class="success-eyebrow">¡PAGO CONFIRMADO EXITOSAMENTE!</span>
          <h2 class="success-main-title">¡Gracias por tu compra!</h2>
          <p class="success-order-num">Número de Pedido: <strong>#${data.orderNumber}</strong></p>

          <div class="success-details-card">
            <div class="success-row">
              <span>Monto Total Pagado:</span>
              <strong class="success-highlight-total">$${data.total.toFixed(2)} USD</strong>
            </div>

            <div class="success-row">
              <span>Método de Pago:</span>
              <strong>${data.cardBrand} terminada en •••• ${data.cardLast4}</strong>
            </div>

            <div class="success-row address-row">
              <span>Dirección de Entrega:</span>
              <p class="success-addr-text">${data.shippingAddress}</p>
            </div>

            <div class="success-row status-row">
              <span>Estado del Pedido:</span>
              <span class="badge-order-paid">PAGADO (Confirmado)</span>
            </div>
          </div>

          <div class="success-actions-row">
            <button class="btn btn-primary" id="btn-success-view-orders">
              ${Icons.bag('w-4 h-4')}
              Ver Mis Pedidos
            </button>
            <button class="btn btn-outline" id="btn-success-continue">
              Continuar Comprando
            </button>
          </div>

        </div>
      </div>
    `;
  }

  // --- CONFIGURACIÓN DE EVENTOS ---
  private setupEvents(total: number): void {
    // Cerrar modal
    this.container.querySelector('#btn-close-checkout')?.addEventListener('click', () => this.close());
    this.container.querySelector('#checkout-backdrop')?.addEventListener('click', () => {
      if (!this.isProcessingPayment) this.close();
    });

    // 1. Acciones de Dirección
    this.container.querySelector('#btn-toggle-new-address')?.addEventListener('click', () => {
      this.isAddingNewAddress = true;
      this.isChangingAddress = false;
      this.render();
    });
    this.container.querySelector('#btn-open-new-addr')?.addEventListener('click', () => {
      this.isAddingNewAddress = true;
      this.isChangingAddress = false;
      this.render();
    });
    this.container.querySelector('#btn-cancel-addr-form')?.addEventListener('click', () => {
      this.isAddingNewAddress = false;
      this.render();
    });
    this.container.querySelector('#btn-cancel-addr-bottom')?.addEventListener('click', () => {
      this.isAddingNewAddress = false;
      this.render();
    });
    this.container.querySelector('#btn-toggle-change-addr')?.addEventListener('click', () => {
      this.isChangingAddress = true;
      this.render();
    });
    this.container.querySelector('#btn-cancel-change-addr')?.addEventListener('click', () => {
      this.isChangingAddress = false;
      this.render();
    });

    // Selección de radio de dirección guardada
    this.container.querySelectorAll('.address-radio-card').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.id;
        if (id) {
          this.selectedAddressId = id;
          this.isChangingAddress = false;
          this.render();
        }
      });
    });

    // Map Picker interactivo en Checkout (igual a ProfileModal)
    this.container.querySelector('#btn-checkout-map-picker')?.addEventListener('click', () => {
      MapPickerModal.getInstance().open((location: SelectedLocation) => {
        const stateSelect = this.container.querySelector('#checkout-addr-state') as HTMLSelectElement | null;
        const citySelect = this.container.querySelector('#checkout-addr-city') as HTMLSelectElement | null;
        const streetInput = this.container.querySelector('#checkout-addr-street') as HTMLTextAreaElement | null;
        const postalInput = this.container.querySelector('#checkout-addr-postal') as HTMLInputElement | null;
        const refInput = this.container.querySelector('#checkout-addr-reference') as HTMLInputElement | null;

        if (stateSelect) {
          stateSelect.value = location.state;
          this.newAddress.state = location.state;
          stateSelect.dispatchEvent(new Event('change'));
        }

        if (citySelect) {
          let matched = false;
          const locCityClean = location.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

          for (let i = 0; i < citySelect.options.length; i++) {
            const optVal = citySelect.options[i].value;
            const optClean = optVal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (optClean.includes(locCityClean) || locCityClean.includes(optClean)) {
              citySelect.selectedIndex = i;
              this.newAddress.city = optVal;
              matched = true;
              break;
            }
          }

          if (!matched && citySelect.options.length > 1) {
            citySelect.selectedIndex = 1;
            this.newAddress.city = citySelect.options[1].value;
          }
        }

        if (streetInput) {
          streetInput.value = location.street;
          this.newAddress.street = location.street;
        }

        if (postalInput) {
          postalInput.value = location.postalCode;
          this.newAddress.postalCode = location.postalCode;
        }

        if (refInput && !refInput.value) {
          refInput.value = location.reference || `Punto en mapa (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`;
          this.newAddress.reference = refInput.value;
        }
      });
    });

    // Selector dinámico de Departamento -> Municipios
    const deptSelect = this.container.querySelector('#checkout-addr-state') as HTMLSelectElement | null;
    const citySelect = this.container.querySelector('#checkout-addr-city') as HTMLSelectElement | null;
    deptSelect?.addEventListener('change', () => {
      const selectedDept = deptSelect.value;
      this.newAddress.state = selectedDept;
      if (citySelect) {
        const cities = EL_SALVADOR_DEPARTMENTS[selectedDept] || [];
        citySelect.innerHTML = cities.map((c) => `<option value="${c}">${c}</option>`).join('');
        this.newAddress.city = cities[0] || '';
      }
    });

    // Guardar nueva dirección en la base de datos
    const formAddress = this.container.querySelector('#form-checkout-address');
    formAddress?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.store.currentUser) return;

      const fullName = (this.container.querySelector('#checkout-addr-fullname') as HTMLInputElement | null)?.value.trim() || '';
      const phone = (this.container.querySelector('#checkout-addr-phone') as HTMLInputElement | null)?.value.trim() || '';
      const state = (this.container.querySelector('#checkout-addr-state') as HTMLSelectElement | null)?.value.trim() || 'San Salvador';
      const city = (this.container.querySelector('#checkout-addr-city') as HTMLSelectElement | null)?.value.trim() || '';
      const street = (this.container.querySelector('#checkout-addr-street') as HTMLTextAreaElement | null)?.value.trim() || '';
      const reference = (this.container.querySelector('#checkout-addr-reference') as HTMLInputElement | null)?.value.trim() || '';
      const postalCode = (this.container.querySelector('#checkout-addr-postal') as HTMLInputElement | null)?.value.trim() || '1101';
      const isDefault = (this.container.querySelector('#checkout-addr-default') as HTMLInputElement | null)?.checked ?? true;

      const fullStreet = reference ? `${street} (Ref: ${reference})` : street;

      const res = await ApiService.addAddress({
        userId: this.store.currentUser.id,
        fullName,
        phone,
        state,
        city,
        street: fullStreet,
        postalCode,
        isDefault
      });

      if (res.success && res.address) {
        Toast.show('Dirección guardada exitosamente.', 'Dirección', 'success');
        await this.fetchProfileData();
        this.selectedAddressId = res.address.id;
        this.isAddingNewAddress = false;
        this.render();
      } else {
        Toast.show(res.message || 'Error al guardar dirección.', 'Atención', 'warning');
      }
    });

    // 2. Acciones de Método de Pago
    this.container.querySelector('#btn-toggle-new-card')?.addEventListener('click', () => {
      this.isAddingNewCard = true;
      this.render();
    });
    this.container.querySelector('#btn-cancel-new-card')?.addEventListener('click', () => {
      this.isAddingNewCard = false;
      this.render();
    });

    // Selección de tarjeta guardada
    this.container.querySelectorAll('.saved-card-radio-box').forEach((box) => {
      box.addEventListener('click', () => {
        const id = (box as HTMLElement).dataset.id;
        if (id) {
          this.selectedCardId = id;
          this.errorMessage = null;
          this.render();
        }
      });
    });

    // Inputs de nueva tarjeta
    const cardHolder = this.container.querySelector('#new-card-holder') as HTMLInputElement | null;
    cardHolder?.addEventListener('input', (e) => {
      this.newCard.cardHolder = (e.target as HTMLInputElement).value;
    });
    const cardNumber = this.container.querySelector('#new-card-number') as HTMLInputElement | null;
    cardNumber?.addEventListener('input', (e) => {
      this.newCard.cardNumber = (e.target as HTMLInputElement).value;
    });
    const cardMonth = this.container.querySelector('#new-card-month') as HTMLSelectElement | null;
    cardMonth?.addEventListener('change', (e) => {
      this.newCard.expMonth = Number((e.target as HTMLSelectElement).value);
    });
    const cardYear = this.container.querySelector('#new-card-year') as HTMLSelectElement | null;
    cardYear?.addEventListener('change', (e) => {
      this.newCard.expYear = Number((e.target as HTMLSelectElement).value);
    });
    const cardCvc = this.container.querySelector('#new-card-cvc') as HTMLInputElement | null;
    cardCvc?.addEventListener('input', (e) => {
      this.newCard.cvc = (e.target as HTMLInputElement).value;
    });
    const cardSave = this.container.querySelector('#new-card-save') as HTMLInputElement | null;
    cardSave?.addEventListener('change', (e) => {
      this.newCard.saveCard = (e.target as HTMLInputElement).checked;
    });

    // 3. BOTÓN PRINCIPAL DE PAGO
    this.container.querySelector('#btn-process-payment')?.addEventListener('click', async () => {
      await this.handlePaymentSubmit(total);
    });
  }

  // --- PROCESAR PAGO CON SPINNER ---
  private async handlePaymentSubmit(total: number): Promise<void> {
    if (this.isProcessingPayment) return;
    this.errorMessage = null;

    // Validación de dirección
    const addresses = this.profileData?.addresses || [];
    if (addresses.length === 0 && !this.selectedAddressId) {
      this.errorMessage = 'Por favor ingresa y guarda una dirección de entrega para recibir tu pedido.';
      this.isAddingNewAddress = true;
      this.render();
      return;
    }

    const shippingAddressId = this.selectedAddressId || (addresses[0] ? addresses[0].id : undefined);
    if (!shippingAddressId) {
      this.errorMessage = 'Por favor selecciona una dirección de entrega.';
      this.render();
      return;
    }

    // Validación de tarjeta
    let paymentCardId: string | undefined;
    let newCardData: any;

    const cards = this.profileData?.paymentCards || [];
    const isUsingSavedCard = !this.isAddingNewCard && cards.length > 0;

    if (isUsingSavedCard) {
      paymentCardId = this.selectedCardId || (cards[0] ? cards[0].id : undefined);
      if (!paymentCardId) {
        this.errorMessage = 'Por favor selecciona una tarjeta guardada para realizar el pago.';
        this.render();
        return;
      }
    } else {
      if (!this.newCard.cardHolder.trim() || !this.newCard.cardNumber.trim()) {
        this.errorMessage = 'Por favor completa todos los datos de tu tarjeta.';
        this.render();
        return;
      }
      newCardData = this.newCard;
    }

    // --- ACTIVAR SPINNER DE CARGA CON PASOS DINÁMICOS ---
    this.isProcessingPayment = true;
    this.processingStepText = 'Conectando con la pasarela bancaria segura...';
    this.render();

    const stepTimer1 = setTimeout(() => {
      if (this.isProcessingPayment) {
        this.processingStepText = 'Verificando autorización y fondos disponibles...';
        const sub = this.container.querySelector('.processing-subtitle');
        if (sub) sub.textContent = this.processingStepText;
      }
    }, 700);

    const stepTimer2 = setTimeout(() => {
      if (this.isProcessingPayment) {
        this.processingStepText = 'Confirmando tu orden de compra...';
        const sub = this.container.querySelector('.processing-subtitle');
        if (sub) sub.textContent = this.processingStepText;
      }
    }, 1400);

    const startTime = Date.now();

    try {
      const res = await this.store.checkout({
        paymentCardId,
        newCard: newCardData,
        shippingAddressId
      });

      const elapsed = Date.now() - startTime;
      if (elapsed < 1600) {
        await new Promise((resolve) => setTimeout(resolve, 1600 - elapsed));
      }

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      this.isProcessingPayment = false;

      if (res.success) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#0B3B24', '#d2b588', '#ffffff', '#10b981']
        });

        this.checkoutSuccessData = {
          orderNumber: res.orderNumber || `ORD-${Date.now()}`,
          cardBrand: res.cardBrand || 'VISA',
          cardLast4: res.cardLast4 || '4242',
          remainingBalance: res.remainingBalance,
          shippingAddress: res.shippingAddress || 'El Salvador',
          total
        };

        Toast.show('¡Tu pedido ha sido procesado exitosamente!', '¡Pago Exitoso!', 'success', 5000);
        this.render();
      } else {
        this.errorMessage = res.message;
        Toast.show(res.message, 'Atención', 'warning', 6000);
        this.render();
      }
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      this.isProcessingPayment = false;
      this.errorMessage = err.message || 'Error de conexión al procesar el pago.';
      this.render();
    }
  }

  private setupSuccessEvents(): void {
    this.container.querySelector('#btn-success-view-orders')?.addEventListener('click', () => {
      this.close();
      this.store.toggleProfile(true);
    });

    this.container.querySelector('#btn-success-continue')?.addEventListener('click', () => {
      this.close();
    });
  }
}
