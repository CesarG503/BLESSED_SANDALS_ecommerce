import { Store } from '../state/store';
import { StorageService } from '../services/storageService';
import { ApiService } from '../services/apiService';
import { Icons } from './Icons';
import { Toast } from './Toast';
import confetti from 'canvas-confetti';
import { MapPickerModal, SelectedLocation } from './MapPickerModal';

// Departamentos y Municipios oficiales de El Salvador
const EL_SALVADOR_DEPARTMENTS: Record<string, string[]> = {
  'San Salvador': [
    'San Salvador Centro (Escalón, San Benito, Centro)',
    'Antiguo Cuscatlán (La Sultana, Santa Elena)',
    'Santa Tecla',
    'Soyapango',
    'Mejicanos',
    'Ilopango',
    'Apopa',
    'San Marcos',
    'Ciudad Delgado',
    'Cuscatancingo',
    'Ayutuxtepeque'
  ],
  'La Libertad': [
    'Santa Tecla',
    'Antiguo Cuscatlán',
    'Nuevo Cuscatlán',
    'Colón (Lourdes)',
    'San Juan Opico',
    'Quezaltepeque',
    'Zaragoza',
    'Puerto de La Libertad',
    'San José Villanueva'
  ],
  'Santa Ana': [
    'Santa Ana Centro',
    'Chalchuapa',
    'Metapán',
    'Coatepeque',
    'El Congo',
    'Candelaria de la Frontera'
  ],
  'San Miguel': [
    'San Miguel Centro',
    'Chinameca',
    'Ciudad Barrios',
    'Moncagua',
    'Lolotique',
    'Sesori'
  ],
  'Sonsonate': [
    'Sonsonate Centro',
    'Acajutla (Puerto)',
    'Izalco',
    'Nahuizalco',
    'Armenia',
    'Juayúa',
    'Sonzacate'
  ],
  'Usulután': [
    'Usulután Centro',
    'Jiquilisco',
    'Santiago de María',
    'Berlín',
    'Puerto El Triunfo',
    'Santa Elena'
  ],
  'Ahuachapán': [
    'Ahuachapán Centro',
    'Atiquizaya',
    'Apaneca',
    'Tacuba',
    'Guaymango',
    'Concepción de Ataco'
  ],
  'La Paz': [
    'Zacatecoluca',
    'Olocuilta',
    'San Luis Talpa (Aeropuerto Internacional)',
    'Santiago Nonualco',
    'San Pedro Masahuat',
    'Cuyultitán'
  ],
  'Cuscatlán': [
    'Cojutepeque',
    'Suchitoto',
    'San Pedro Perulapán',
    'San Martín',
    'San Rafael Cedros'
  ],
  'Chalatenango': [
    'Chalatenango Centro',
    'Nueva Concepción',
    'La Palma',
    'Tejutla',
    'Dulce Nombre de María'
  ],
  'Morazán': [
    'San Francisco Gotera',
    'Perquín',
    'Jocoaitique',
    'Corinto',
    'Guatajiagua'
  ],
  'San Vicente': [
    'San Vicente Centro',
    'Apastepeque',
    'Tecoluca',
    'San Sebastián',
    'Guadalupe'
  ],
  'Cabañas': [
    'Sensuntepeque',
    'Ilobasco',
    'Victoria',
    'Tejutepeque'
  ],
  'La Unión': [
    'La Unión (Puerto)',
    'Conchagua',
    'Santa Rosa de Lima',
    'Pasaquina',
    'Anamorós'
  ]
};

export type ProfileTab = 'overview' | 'coupons' | 'orders' | 'addresses' | 'cards' | 'reviews' | 'wishlist';

export class ProfileModal {
  private container: HTMLElement;
  private store: Store;
  private profileData: any = null;
  private activeTab: ProfileTab = 'overview';
  private isClosing: boolean = false;
  private isOpen: boolean = false;
  private productsList: any[] = [];
  private isLoadingData: boolean = false;

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Elemento #${containerId} no encontrado`);
    this.container = el;

    this.store.subscribe(() => this.handleStoreUpdate());
    this.setupGlobalListeners();
  }

  private setupGlobalListeners(): void {
    // Tecla ESC para cerrar con animación suave
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.store.isProfileOpen && !this.isClosing) {
        this.closeView(false);
      }
    });

    // Hash change (#profile)
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#profile') {
        if (this.store.currentUser) {
          if (!this.store.isProfileOpen) this.store.toggleProfile(true);
        } else {
          this.store.toggleAuth(true);
        }
      } else {
        if (this.store.isProfileOpen && !this.isClosing) {
          this.closeView(false);
        }
      }
    });

    // Chequeo inicial de hash
    const initialHash = window.location.hash.toLowerCase();
    if (initialHash === '#profile') {
      if (this.store.currentUser) {
        this.store.toggleProfile(true);
      } else {
        this.store.toggleAuth(true);
      }
    }
  }

  private async handleStoreUpdate(): Promise<void> {
    const isProfileOpen = this.store.isProfileOpen;
    const user = this.store.currentUser;

    if (!user && isProfileOpen) {
      // Si ya no hay usuario (logout), cerrar panel
      this.store.toggleProfile(false);
      return;
    }

    if (isProfileOpen && !this.isOpen && !this.isClosing) {
      this.isOpen = true;
      this.container.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      this.syncUrlHash(true);
      await this.fetchProfileData();
      this.render();
      this.playCinematicOpen();
    } else if (!isProfileOpen && this.isOpen && !this.isClosing) {
      this.closeView(false);
    }
  }

  private async fetchProfileData(): Promise<void> {
    if (!this.store.currentUser || this.isLoadingData) return;
    this.isLoadingData = true;

    try {
      const res = await ApiService.getUserProfile(this.store.currentUser.id);
      if (res.success && res.data) {
        this.profileData = res.data;
      }

      // Cargar productos para poder elegir en reseñas
      if (this.productsList.length === 0) {
        const prodRes = await fetch('/api/products');
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          if (prodData.success) {
            this.productsList = prodData.products;
          }
        }
      }
    } catch (e) {
      console.error('Error al cargar datos del perfil:', e);
    } finally {
      this.isLoadingData = false;
    }
  }

  /**
   * Ejecuta la animación cinemática de apertura:
   * 1. Las puertas se cierran hacia el centro de forma limpia y sólida, sin líneas extras.
   * 2. Sobre las puertas cerradas, cada componente hace POP con un retraso escalonado (stagger) para que se note bien.
   */
  private playCinematicOpen(): void {
    const stage = this.container.querySelector('#profile-cinematic-stage') as HTMLElement | null;
    if (!stage) return;

    // 1. Las puertas sólidas se cierran hacia el centro cubriendo la tienda sin líneas extras
    requestAnimationFrame(() => {
      stage.classList.remove('doors-opening', 'components-popping-out');
      stage.classList.add('doors-joined');
    });

    // 2. A los 280ms (puertas cerradas al centro): cada componente hace POP escalonado sobre las puertas
    setTimeout(() => {
      stage.classList.add('doors-closed', 'components-popping-in');
    }, 280);

    // 3. A los 750ms: Todos los componentes quedan completamente asentados
    setTimeout(() => {
      stage.classList.add('components-settled');
    }, 750);
  }

  /**
   * Ejecuta la animación cinemática de cierre:
   * 1. Primero el efecto de pop desapareciendo cada componente.
   * 2. Luego se abren las puertas hacia los lados para volver a la tienda.
   */
  public closeView(doLogout = false): void {
    if (this.isClosing) return;
    this.isClosing = true;

    const stage = this.container.querySelector('#profile-cinematic-stage') as HTMLElement | null;

    if (!stage) {
      this.finalizeClose(doLogout);
      return;
    }

    // 1. Primero: Cada componente hace POP para desaparecer
    stage.classList.remove('components-settled', 'components-popping-in');
    stage.classList.add('components-popping-out');

    // 2. A los 220ms: Una vez que los componentes han desaparecido, se abren las puertas para volver a la tienda
    setTimeout(() => {
      stage.classList.remove('doors-joined', 'doors-closed');
      stage.classList.add('doors-opening');
    }, 220);

    // 3. A los 480ms: Las puertas se han abierto completamente; finalizamos y volvemos a la tienda
    setTimeout(() => {
      this.finalizeClose(doLogout);
    }, 480);
  }

  private finalizeClose(doLogout: boolean): void {
    this.isOpen = false;
    this.isClosing = false;
    this.container.classList.remove('is-active');
    this.container.innerHTML = '';
    document.body.style.overflow = '';
    this.syncUrlHash(false);

    if (doLogout) {
      this.profileData = null;
      this.store.logout();
      Toast.show('Has cerrado sesión correctamente.', 'Sesión Finalizada', 'info');
    } else {
      if (this.store.isProfileOpen) {
        this.store.toggleProfile(false);
      }
    }
  }

  private syncUrlHash(isOpen: boolean): void {
    if (isOpen) {
      if (window.location.hash.toLowerCase() !== '#profile') {
        window.history.replaceState(null, '', '#profile');
      }
    } else {
      if (window.location.hash.toLowerCase() === '#profile') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }

  public render(): void {
    const user = this.store.currentUser;
    if (!user || !this.profileData) {
      this.container.innerHTML = `
        <div class="profile-modal-backdrop is-visible"></div>
        <div class="profile-cinematic-stage doors-joined doors-closed components-popping-in" id="profile-cinematic-stage">
          <div class="profile-door profile-door-left"></div>
          <div class="profile-door profile-door-right"></div>
          <div class="profile-page-content" style="display:flex; align-items:center; justify-content:center; min-height:100vh;">
            <div class="profile-no-auth-card profile-component-pop pop-step-3" style="text-align:center; padding:40px; background:#ffffff; border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,0.08);">
              <img src="/assets/logo/Isologo.png" alt="Blessed Sandals" class="profile-logo-img" style="height:42px; margin-bottom:16px;" />
              <h3>Cargando tu cuenta...</h3>
              <p style="color:#64748b; margin-top:8px;">Conectando con la base de datos de Blessed Sandals...</p>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const { addresses, paymentCards, orders, reviews, wishlist, userCoupons } = this.profileData;
    const availableCouponsCount = userCoupons.filter((c: any) => !c.isUsed).length;

    this.container.innerHTML = `
      <!-- FONDO OSCURECIDO TRANSPARENTE -->
      <div class="profile-modal-backdrop is-visible" id="profile-modal-backdrop"></div>

      <!-- ESCENARIO CINEMÁTICO FULLSCREEN -->
      <div class="profile-cinematic-stage" id="profile-cinematic-stage">
        
        <!-- PUERTAS SÓLIDAS QUE SE CIERRAN Y SE ABREN AL CENTRO (SIN LÍNEAS EXTRAS) -->
        <div class="profile-door profile-door-left" id="profile-door-left"></div>
        <div class="profile-door profile-door-right" id="profile-door-right"></div>

        <!-- CONTENEDOR REVELADO CON HEADER Y DASHBOARD (SOBRE LAS PUERTAS) -->
        <div class="profile-page-content" id="profile-page-content">

          <!-- TOP NAV: SOBRE LAS PUERTAS, POP-IN PASO 1 -->
          <header class="profile-header profile-component-pop pop-step-1">
            <div class="profile-header-inner">
              
              <!-- EXTREMO IZQUIERDO: ICONO DE REGRESAR A LA TIENDA -->
              <button class="profile-header-btn btn-header-back" id="btn-header-back" title="Volver a la tienda" aria-label="Volver a la tienda">
                ${Icons.arrowLeft('w-5 h-5')}
              </button>

              <!-- CENTRO: LOGO OFICIAL SIN TEXTO DE 'PANEL DE USUARIO' -->
              <a href="#" class="profile-header-center-logo" id="link-header-center-logo" title="Blessed Sandals - Inicio">
                <img src="/assets/logo/Isologo.png" alt="Blessed Sandals" class="profile-header-logo-img" />
              </a>

              <!-- EXTREMO DERECHO: ICONO DE SALIR DE SESIÓN -->
              <button class="profile-header-btn btn-header-logout" id="btn-header-logout" title="Cerrar sesión" aria-label="Cerrar sesión">
                ${Icons.logout('w-5 h-5')}
              </button>

            </div>
          </header>

          <!-- CONTENIDO DEL DASHBOARD -->
          <div class="container profile-dashboard-layout">
            
            <!-- SIDEBAR: POP-IN PASO 2 (SIN FOTO DE AVATAR, SOLO OPCIONES LIMPIAS) -->
            <aside class="profile-sidebar profile-component-pop pop-step-2">
              <div class="profile-sidebar-user-header">
                <div class="user-greeting">
                  <h3 class="greeting-name">${user.name}</h3>
                  <span class="profile-header-email">${user.email}</span>
                </div>
              </div>

              <!-- OPCIONES DE NAVEGACIÓN (SOLO ICONOS SVG, CERO EMOJIS) -->
              <nav class="profile-nav-menu">
                <button class="profile-nav-item ${this.activeTab === 'overview' ? 'is-active' : ''}" data-tab="overview">
                  <span class="nav-icon">${Icons.user('w-4 h-4')}</span>
                  <span class="nav-label">Mi Perfil</span>
                </button>

                <button class="profile-nav-item ${this.activeTab === 'coupons' ? 'is-active' : ''}" data-tab="coupons">
                  <span class="nav-icon">${Icons.ticket('w-4 h-4')}</span>
                  <span class="nav-label">Mis Cupones</span>
                  ${availableCouponsCount > 0 ? `<span class="nav-badge">${availableCouponsCount}</span>` : ''}
                </button>

                <button class="profile-nav-item ${this.activeTab === 'orders' ? 'is-active' : ''}" data-tab="orders">
                  <span class="nav-icon">${Icons.bag('w-4 h-4')}</span>
                  <span class="nav-label">Mis Pedidos</span>
                  ${orders.length > 0 ? `<span class="nav-badge neutral">${orders.length}</span>` : ''}
                </button>

                <button class="profile-nav-item ${this.activeTab === 'addresses' ? 'is-active' : ''}" data-tab="addresses">
                  <span class="nav-icon">${Icons.mapPin('w-4 h-4')}</span>
                  <span class="nav-label">Direcciones (El Salvador)</span>
                  ${addresses.length > 0 ? `<span class="nav-badge neutral">${addresses.length}</span>` : ''}
                </button>

                <button class="profile-nav-item ${this.activeTab === 'cards' ? 'is-active' : ''}" data-tab="cards">
                  <span class="nav-icon">${Icons.creditCard('w-4 h-4')}</span>
                  <span class="nav-label">Tarjetas y Pagos</span>
                  ${paymentCards.length > 0 ? `<span class="nav-badge neutral">${paymentCards.length}</span>` : ''}
                </button>

                <button class="profile-nav-item ${this.activeTab === 'reviews' ? 'is-active' : ''}" data-tab="reviews">
                  <span class="nav-icon">${Icons.star('w-4 h-4')}</span>
                  <span class="nav-label">Mis Reseñas</span>
                  ${reviews.length > 0 ? `<span class="nav-badge neutral">${reviews.length}</span>` : ''}
                </button>

                <button class="profile-nav-item ${this.activeTab === 'wishlist' ? 'is-active' : ''}" data-tab="wishlist">
                  <span class="nav-icon">${Icons.heart('w-4 h-4')}</span>
                  <span class="nav-label">Lista de Deseos</span>
                  ${wishlist.length > 0 ? `<span class="nav-badge neutral">${wishlist.length}</span>` : ''}
                </button>
              </nav>

              <div class="profile-sidebar-footer">
                <button class="btn-sidebar-shop" id="btn-sidebar-go-shop">
                  Volver a la Tienda
                </button>
              </div>
            </aside>

            <!-- ÁREA PRINCIPAL DINÁMICA: POP-IN PASO 3 (APERTURA Y CIERRE CON ANIMACIÓN POP) -->
            <main class="profile-main-content profile-component-pop pop-step-3" id="profile-main-content">
              ${this.renderActiveTabContent()}
            </main>

          </div>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  /**
   * Renderiza el contenido según la pestaña seleccionada
   */
  private renderActiveTabContent(): string {
    switch (this.activeTab) {
      case 'overview':
        return this.renderOverviewTab();
      case 'coupons':
        return this.renderCouponsTab();
      case 'orders':
        return this.renderOrdersTab();
      case 'addresses':
        return this.renderAddressesTab();
      case 'cards':
        return this.renderCardsTab();
      case 'reviews':
        return this.renderReviewsTab();
      case 'wishlist':
        return this.renderWishlistTab();
      default:
        return this.renderOverviewTab();
    }
  }

  // --- TAB 1: MI PERFIL / INFORMACIÓN PERSONAL ---
  private renderOverviewTab(): string {
    const { user } = this.profileData;

    return `
      <div class="tab-panel">
        <div class="panel-header-row profile-component-pop pop-step-3">
          <div>
            <h2 class="panel-title">Información Personal</h2>
            <p class="panel-subtitle">Administra los datos personales y de contacto de tu cuenta.</p>
          </div>
        </div>

        <!-- FORMULARIO DE INFORMACIÓN PERSONAL (POP-IN PASO 4) -->
        <div class="profile-card-block profile-component-pop pop-step-4">
          <form id="form-update-user-info" class="profile-edit-form">
            <div class="form-row-2">
              <div class="input-field">
                <label for="edit-user-name">Nombre Completo</label>
                <input type="text" id="edit-user-name" value="${user.name}" required />
              </div>
              <div class="input-field">
                <label for="edit-user-phone">Teléfono de Contacto (El Salvador)</label>
                <input type="text" id="edit-user-phone" value="${user.phone || '+503 '}" placeholder="+503 7000-0000" />
              </div>
            </div>

            <div class="form-row-2">
              <div class="input-field">
                <label>Correo Electrónico (No modificable)</label>
                <input type="email" value="${user.email}" disabled style="background:#f1f5f9; cursor:not-allowed;" />
              </div>
              <div class="input-field">
                <label>Miembro desde</label>
                <input type="text" value="${new Date(user.createdAt).toLocaleDateString('es-SV', { year: 'numeric', month: 'long', day: 'numeric' })}" disabled style="background:#f1f5f9; cursor:not-allowed;" />
              </div>
            </div>

            <div class="form-actions-right">
              <button type="submit" class="btn btn-primary" id="btn-save-user-info">
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // --- TAB 2: CUPONES Y PROMOCIONES ---
  private renderCouponsTab(): string {
    const { userCoupons } = this.profileData;

    return `
      <div class="tab-panel">
        <div class="panel-header-row profile-component-pop pop-step-3">
          <div>
            <h2 class="panel-title">Mis Cupones y Promociones</h2>
            <p class="panel-subtitle">Cupones asociados exclusivamente a tu cuenta personal. Cada cupón cuenta con regla de 1 solo uso por persona.</p>
          </div>
        </div>

        ${userCoupons.length === 0
        ? `
          <div class="empty-state-box profile-component-pop pop-step-4">
            <div class="empty-icon">${Icons.ticket('w-5 h-5')}</div>
            <h4>No tienes cupones asignados aún</h4>
            <p>Al registrarte por primera vez recibes tu cupón BIENVENIDA5 (5% de descuento).</p>
          </div>
        `
        : `
          <div class="coupons-cards-grid profile-component-pop pop-step-4">
            ${userCoupons
          .map((uc: any) => {
            const isPercentage = uc.promoCode.discountType === 'PERCENTAGE';
            const discountText = isPercentage ? `${uc.promoCode.discountValue}%` : `$${uc.promoCode.discountValue}`;

            return `
              <div class="coupon-ticket-card ${uc.isUsed ? 'is-spent' : 'is-ready'}">
                <div class="ticket-left">
                  <div class="ticket-discount-banner">
                    <span class="discount-num">-${discountText}</span>
                    <span class="discount-sub">DE DESCUENTO</span>
                  </div>
                </div>

                <div class="ticket-center">
                  <div class="ticket-code-row">
                    <strong class="ticket-code">${uc.promoCode.code}</strong>
                    ${uc.promoCode.isWelcomeOnly
                ? `<span class="badge-welcome">Bienvenida</span>`
                : ''
              }
                  </div>
                  <p class="ticket-desc">${uc.promoCode.description}</p>
                  
                  <div class="ticket-meta">
                    <span>• Límite: <strong>1 uso por persona</strong></span>
                    ${uc.promoCode.minPurchase
                ? `<span>• Compra mínima: <strong>$${uc.promoCode.minPurchase}</strong></span>`
                : ''
              }
                    <span>• Agregado: ${new Date(uc.claimedAt).toLocaleDateString('es-SV')}</span>
                  </div>
                </div>

                <div class="ticket-right">
                  ${uc.isUsed
                ? `
                    <div class="ticket-status-used">
                      <span class="status-badge-used">${Icons.check('w-3 h-3')} Canjeado</span>
                      <small>Usado el ${new Date(uc.usedAt || uc.claimedAt).toLocaleDateString('es-SV')}</small>
                    </div>
                  `
                : `
                    <div class="ticket-status-available">
                      <span class="status-badge-ready">Disponible</span>
                      <button class="btn-copy-code" data-code="${uc.promoCode.code}" title="Copiar código">
                        Copiar código
                      </button>
                      <button class="btn-use-store btn-use-in-shop" data-code="${uc.promoCode.code}">
                        Usar en Tienda
                      </button>
                    </div>
                  `
              }
                </div>
              </div>
            `;
          })
          .join('')}
          </div>
        `
      }

        <!-- BANNER DE GARANTÍA DE CUPONES (POP-IN PASO 5) -->
        <div class="coupons-rules-notice profile-component-pop pop-step-5">
          <h4>${Icons.shieldCheck('w-4 h-4')} Términos de Cupones Personales</h4>
          <p>Los cupones promocionales están vinculados directamente a tu cuenta personal. Solo son válidos con sesión iniciada y se inhabilitan automáticamente tras completar la compra para respetar el límite de 1 uso por persona.</p>
        </div>
      </div>
    `;
  }

  // --- TAB 3: PEDIDOS / ÓRDENES ---
  private renderOrdersTab(): string {
    const { orders } = this.profileData;

    return `
      <div class="tab-panel">
        <div class="panel-header-row profile-component-pop pop-step-3">
          <div>
            <h2 class="panel-title">Mis Pedidos</h2>
            <p class="panel-subtitle">Historial de compras, estado del envío en El Salvador y comprobantes.</p>
          </div>
        </div>

        ${orders.length === 0
        ? `
          <div class="empty-state-box profile-component-pop pop-step-4">
            <div class="empty-icon">${Icons.bag('w-5 h-5')}</div>
            <h4>Aún no has realizado pedidos</h4>
            <p>Explora nuestras exclusivas sandalias y calzado en la tienda.</p>
            <button class="btn btn-primary btn-go-shop" style="margin-top:16px;">Ver Catálogo</button>
          </div>
        `
        : `
          <div class="orders-stack profile-component-pop pop-step-4">
            ${orders
          .map((order: any) => {
            const statusMap: Record<string, { label: string; color: string }> = {
              PENDING: { label: 'Pendiente', color: '#f59e0b' },
              PAID: { label: 'Pagado', color: '#10b981' },
              PROCESSING: { label: 'En Preparación', color: '#3b82f6' },
              SHIPPED: { label: 'En Camino (El Salvador)', color: '#8b5cf6' },
              DELIVERED: { label: 'Entregado', color: '#059669' },
              CANCELLED: { label: 'Cancelado', color: '#ef4444' }
            };
            const st = statusMap[order.status] || { label: order.status, color: '#64748b' };

            return `
              <div class="order-card-box">
                <div class="order-card-header">
                  <div>
                    <span class="order-label">Número de Pedido</span>
                    <strong class="order-number">${order.orderNumber}</strong>
                  </div>
                  <div>
                    <span class="order-label">Fecha</span>
                    <span class="order-date">${new Date(order.createdAt).toLocaleDateString('es-SV', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div>
                    <span class="order-label">Total</span>
                    <strong class="order-total-price">$${order.total.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span class="order-status-badge" style="background:${st.color}20; color:${st.color}; border:1px solid ${st.color}40;">
                      ${st.label}
                    </span>
                  </div>
                </div>

                <!-- ITEMS DEL PEDIDO -->
                <div class="order-items-list">
                  ${order.items
                .map(
                  (item: any) => `
                    <div class="order-item-row">
                      <img src="${item.productImage || '/assets/logo/Isotipo.png'}" alt="${item.productName}" class="order-prod-thumb" />
                      <div class="order-prod-info">
                        <strong>${item.productName}</strong>
                        <span class="order-prod-specs">Talla: ${item.size} | Color: ${item.color} | Cantidad: ${item.quantity}</span>
                      </div>
                      <span class="order-prod-price">$${item.total.toFixed(2)}</span>
                    </div>
                  `
                )
                .join('')}
                </div>

                <!-- RESUMEN FINANCIERO Y CUPÓN USADO -->
                <div class="order-footer-breakdown">
                  <div class="order-notes-col">
                    ${order.notes ? `<p class="order-notes-text">Nota: ${order.notes}</p>` : ''}
                    ${order.promoCode
                ? `<p class="order-promo-used">${Icons.ticket('w-3.5 h-3.5')} Cupón aplicado: <strong>${order.promoCode.code}</strong> (-$${order.discount.toFixed(2)})</p>`
                : ''
              }
                  </div>
                  <div class="order-calc-col">
                    <div class="calc-row"><span>Subtotal:</span> <span>$${order.subtotal.toFixed(2)}</span></div>
                    ${order.discount > 0 ? `<div class="calc-row discount"><span>Descuento:</span> <span>-$${order.discount.toFixed(2)}</span></div>` : ''}
                    <div class="calc-row"><span>Envío:</span> <span>${order.shipping === 0 ? 'GRATIS' : '$' + order.shipping.toFixed(2)}</span></div>
                    <div class="calc-row total"><span>Total:</span> <span>$${order.total.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>
            `;
          })
          .join('')}
          </div>
        `
      }
      </div>
    `;
  }

  // --- TAB 4: DIRECCIONES DE ENVÍO EN EL SALVADOR ---
  private renderAddressesTab(): string {
    const { addresses } = this.profileData;

    return `
      <div class="tab-panel">
        <div class="panel-header-row profile-component-pop pop-step-3">
          <div>
            <h2 class="panel-title">Direcciones de Envío (El Salvador)</h2>
            <p class="panel-subtitle">Guarda tus direcciones de entrega en los 14 departamentos de El Salvador para agilizar tus compras.</p>
          </div>
          <button type="button" class="btn btn-primary" id="btn-open-map-direct" title="Abrir mapa de El Salvador para agregar dirección">
            ${Icons.mapPin('w-4 h-4')} Agregar Ubicación
          </button>
        </div>

        <!-- FORMULARIO DE NUEVA DIRECCIÓN (DESPLEGABLE) -->
        <div class="address-form-box is-hidden profile-component-pop pop-step-5" id="box-new-address">
          <div class="address-form-header">
            <div>
              <h3>Nueva Dirección</h3>
              <p style="margin: 2px 0 0; font-size: 0.8rem; color: #64748b;">Completa el formulario o selecciona tu ubicación exacta en el mapa de El Salvador.</p>
            </div>
            <button type="button" class="btn-close-form" id="btn-cancel-new-address">${Icons.close('w-4 h-4')}</button>
          </div>

          <!-- BOTÓN SELECCIONAR UBICACIÓN CON MAPS -->
          <div class="form-map-trigger-row">
            <button type="button" class="btn btn-select-location-map" id="btn-trigger-map-picker">
              <svg class="map-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                <line x1="8" y1="2" x2="8" y2="18"></line>
                <line x1="16" y1="6" x2="16" y2="22"></line>
              </svg>
              Seleccionar ubicación
            </button>
          </div>

          <form id="form-add-address" class="address-form">
            <div class="form-row-2">
              <div class="input-field">
                <label for="addr-fullname">Nombre de quien recibe *</label>
                <input type="text" id="addr-fullname" placeholder="Ej: Alexander Garay" required />
              </div>
              <div class="input-field">
                <label for="addr-phone">Teléfono de contacto (+503) *</label>
                <input type="tel" id="addr-phone" placeholder="Ej: +503 7123-4567" required />
              </div>
            </div>

            <!-- SELECTORES DINÁMICOS DE EL SALVADOR -->
            <div class="form-row-2">
              <div class="input-field">
                <label for="addr-state">Departamento de El Salvador *</label>
                <select id="addr-state" required>
                  <option value="">Selecciona un departamento...</option>
                  ${Object.keys(EL_SALVADOR_DEPARTMENTS)
        .map((dept) => `<option value="${dept}">${dept}</option>`)
        .join('')}
                </select>
              </div>

              <div class="input-field">
                <label for="addr-city">Municipio / Distrito *</label>
                <select id="addr-city" required disabled>
                  <option value="">Primero selecciona el departamento</option>
                </select>
              </div>
            </div>

            <div class="input-field">
              <label for="addr-street">Dirección exacta (Colonia, Residencial, Calle, Avenida, Pasaje, Casa/Apto) *</label>
              <textarea id="addr-street" rows="2" placeholder="Ej: Colonia Escalón, Paseo General Escalón, Condominio Vista Hermosa, Edificio B, Apto 204" required></textarea>
            </div>

            <div class="form-row-2">
              <div class="input-field">
                <label for="addr-reference">Punto de Referencia (Opcional)</label>
                <input type="text" id="addr-reference" placeholder="Ej: Frente al parque, portón blanco" />
              </div>

              <div class="input-field">
                <label for="addr-postal">Código Postal (El Salvador)</label>
                <input type="text" id="addr-postal" value="1101" placeholder="Ej: 1101" />
              </div>
            </div>

            <div class="checkbox-field">
              <label>
                <input type="checkbox" id="addr-default" checked />
                <span>Establecer como dirección de entrega predeterminada</span>
              </label>
            </div>

            <div class="form-actions-row">
              <button type="button" class="btn btn-outline" id="btn-cancel-address-bottom">Cancelar</button>
              <button type="submit" class="btn btn-primary" id="btn-submit-address">Guardar Dirección en El Salvador</button>
            </div>
          </form>
        </div>

        <!-- LISTADO DE DIRECCIONES GUARDADAS (POP-IN PASO 4) -->
        ${addresses.length === 0
        ? `
          <div class="empty-state-box profile-component-pop pop-step-4">
            <div class="empty-icon">${Icons.mapPin('w-5 h-5')}</div>
            <h4>No tienes direcciones guardadas en El Salvador</h4>
            <p>Agrega tu primera dirección para envíos rápidos y seguros a domicilio.</p>
          </div>
        `
        : `
          <div class="addresses-list-container profile-component-pop pop-step-4">
            ${addresses
          .map(
            (addr: any, idx: number) => `
              <div class="address-card-expandable ${addr.isDefault ? 'is-default' : ''} ${idx === 0 ? 'is-expanded' : ''}" data-addr-id="${addr.id}">
                
                <!-- CABECERA RESUMIDA (SIMPLE, LIMPIA Y CLICKABLE) -->
                <div class="addr-card-summary-row" data-action="toggle-expand" title="Clic para ver o contraer detalles">
                  <div class="addr-summary-left">
                    <div class="addr-pin-badge">
                      ${Icons.mapPin('w-4 h-4')}
                    </div>
                    <div class="addr-summary-text">
                      <div class="addr-summary-title-line">
                        <strong class="addr-name">${addr.fullName}</strong>
                        ${addr.isDefault ? `<span class="badge-default-addr">Predeterminada</span>` : ''}
                      </div>
                      <p class="addr-summary-geo">
                        <strong>${addr.city}</strong>, ${addr.state}
                      </p>
                      <p class="addr-summary-snippet">${addr.street}</p>
                    </div>
                  </div>

                  <div class="addr-summary-right">
                    <span class="addr-expand-indicator" title="Ver más detalles">
                      <svg class="chevron-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </span>
                  </div>
                </div>

                <!-- DETALLES EXTENDIDOS (SE EXTIENDE SIN MODAL) -->
                <div class="addr-card-details-drawer">
                  <div class="addr-card-details-inner">
                    <div class="addr-details-grid">
                      <div class="addr-detail-item">
                        <span class="detail-label">Dirección exacta</span>
                        <strong class="detail-val">${addr.street}</strong>
                      </div>
                      <div class="addr-detail-item">
                        <span class="detail-label">Departamento & Municipio</span>
                        <span class="detail-val">${addr.city}, ${addr.state}, El Salvador</span>
                      </div>
                      <div class="addr-detail-item">
                        <span class="detail-label">Teléfono de contacto</span>
                        <span class="detail-val">${Icons.phone('icon-phone-sm')} ${addr.phone}</span>
                      </div>
                      <div class="addr-detail-item">
                        <span class="detail-label">Código Postal</span>
                        <span class="detail-val">${addr.postalCode || '1101'}</span>
                      </div>
                    </div>

                    <div class="addr-card-actions-row">
                      ${addr.isDefault
                ? `<span class="addr-is-default-notice">${Icons.check('icon-check-sm')} Dirección principal para envíos</span>`
                : `<button type="button" class="btn-make-default" data-id="${addr.id}">Marcar como Principal</button>`
              }
                      <button type="button" class="btn-delete-addr" data-id="${addr.id}" title="Eliminar dirección">
                        Eliminar dirección
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            `
          )
          .join('')}
          </div>
        `
      }
      </div>
    `;
  }

  // --- TAB 5: TARJETAS Y MÉTODOS DE PAGO ---
  private renderCardsTab(): string {
    const { paymentCards } = this.profileData;

    return `
      <div class="tab-panel">
        <div class="panel-header-row profile-component-pop pop-step-3">
          <div>
            <h2 class="panel-title">Tarjetas y Métodos de Pago</h2>
            <p class="panel-subtitle">Administra tus tarjetas de crédito y débito para compras instantáneas con encriptación segura SSL.</p>
          </div>
          <button class="btn btn-primary" id="btn-toggle-new-card">
            + Agregar Tarjeta
          </button>
        </div>

        <!-- FORMULARIO DE NUEVA TARJETA (DESPLEGABLE) -->
        <div class="card-form-box is-hidden profile-component-pop pop-step-5" id="box-new-card">
          <div class="address-form-header">
            <h3>Nueva Tarjeta de Crédito / Débito</h3>
            <button type="button" class="btn-close-form" id="btn-cancel-new-card">${Icons.close('w-4 h-4')}</button>
          </div>

          <form id="form-add-card" class="address-form">
            <div class="input-field">
              <label for="card-holder">Nombre en la Tarjeta (Titular) *</label>
              <input type="text" id="card-holder" placeholder="Ej: ALEXANDER GARAY" required />
            </div>

            <div class="input-field">
              <label for="card-number">Número de Tarjeta (16 dígitos) *</label>
              <input type="text" id="card-number" placeholder="4000 1234 5678 9010" maxlength="19" required />
            </div>

            <div class="form-row-2">
              <div class="input-field">
                <label for="card-month">Mes de Vencimiento *</label>
                <select id="card-month" required>
                  ${Array.from({ length: 12 }, (_, i) => i + 1)
        .map((m) => `<option value="${m}">${m < 10 ? '0' + m : m}</option>`)
        .join('')}
                </select>
              </div>

              <div class="input-field">
                <label for="card-year">Año de Vencimiento *</label>
                <select id="card-year" required>
                  ${Array.from({ length: 10 }, (_, i) => 2026 + i)
        .map((y) => `<option value="${y}">${y}</option>`)
        .join('')}
                </select>
              </div>
            </div>

            <div class="checkbox-field">
              <label>
                <input type="checkbox" id="card-default" checked />
                <span>Guardar como tarjeta de pago predeterminada</span>
              </label>
            </div>

            <div class="form-actions-row">
              <button type="button" class="btn btn-outline" id="btn-cancel-card-bottom">Cancelar</button>
              <button type="submit" class="btn btn-primary" id="btn-submit-card">Guardar Tarjeta</button>
            </div>
          </form>
        </div>

        <!-- LISTADO DE TARJETAS GUARDADAS (POP-IN PASO 4) -->
        ${paymentCards.length === 0
        ? `
          <div class="empty-state-box profile-component-pop pop-step-4">
            <div class="empty-icon">${Icons.creditCard('w-5 h-5')}</div>
            <h4>No tienes tarjetas agregadas</h4>
            <p>Agrega una tarjeta para procesar tus pagos de manera ágil y segura.</p>
          </div>
        `
        : `
          <div class="cards-grid profile-component-pop pop-step-4">
            ${paymentCards
          .map((c: any) => {
            const brandLogos: Record<string, string> = {
              VISA: 'VISA',
              MASTERCARD: 'MC',
              AMEX: 'AMEX'
            };
            return `
              <div class="credit-card-item ${c.isDefault ? 'is-default' : ''}">
                <div class="card-chip-line">
                  <div class="card-emv-chip"></div>
                  <strong class="card-brand-name">${brandLogos[c.brand] || c.brand}</strong>
                </div>

                <div class="card-masked-number">
                  •••• •••• •••• <strong>${c.last4}</strong>
                </div>

                <div class="card-lower-info">
                  <div>
                    <span class="card-label">TITULAR</span>
                    <strong class="card-holder-name">${c.cardHolder}</strong>
                  </div>
                  <div>
                    <span class="card-label">VENCE</span>
                    <strong class="card-expiry">${c.expMonth < 10 ? '0' + c.expMonth : c.expMonth}/${c.expYear.toString().slice(-2)}</strong>
                  </div>
                </div>

                <div class="card-action-bar">
                  ${c.isDefault ? `<span class="badge-default-pill">Predeterminada</span>` : ''}
                  <button class="btn-delete-card" data-id="${c.id}" title="Eliminar tarjeta">
                    Eliminar
                  </button>
                </div>
              </div>
            `;
          })
          .join('')}
          </div>
        `
      }
      </div>
    `;
  }

  // --- TAB 6: RESEÑAS / REVIEWS ---
  private renderReviewsTab(): string {
    const { reviews } = this.profileData;

    return `
      <div class="tab-panel">
        <div class="panel-header-row profile-component-pop pop-step-3">
          <div>
            <h2 class="panel-title">Mis Reseñas de Productos</h2>
            <p class="panel-subtitle">Comparte tu opinión sobre el calzado y sandalias que has probado.</p>
          </div>
          <button class="btn btn-primary" id="btn-toggle-new-review">
            + Escribir Reseña
          </button>
        </div>

        <!-- FORMULARIO DE NUEVA RESEÑA (DESPLEGABLE) -->
        <div class="review-form-box is-hidden profile-component-pop pop-step-5" id="box-new-review">
          <div class="address-form-header">
            <h3>Calificar un Producto de Blessed Sandals</h3>
            <button type="button" class="btn-close-form" id="btn-cancel-new-review">${Icons.close('w-4 h-4')}</button>
          </div>

          <form id="form-add-review" class="address-form">
            <div class="input-field">
              <label for="review-product-select">Selecciona el Calzado o Sandalia *</label>
              <select id="review-product-select" required>
                <option value="">Elige un producto...</option>
                ${this.productsList
        .map((p) => `<option value="${p.id}">${p.name} ($${p.price.toFixed(2)})</option>`)
        .join('')}
              </select>
            </div>

            <div class="input-field">
              <label for="review-rating-select">Calificación (Estrellas) *</label>
              <select id="review-rating-select" required>
                <option value="5">5 Estrellas - Excelente</option>
                <option value="4">4 Estrellas - Muy Bueno</option>
                <option value="3">3 Estrellas - Bueno</option>
                <option value="2">2 Estrellas - Regular</option>
                <option value="1">1 Estrella - Malo</option>
              </select>
            </div>

            <div class="input-field">
              <label for="review-comment">Tu Comentario / Experiencia de Confort *</label>
              <textarea id="review-comment" rows="3" placeholder="¿Cómo sentiste la amortiguación, la talla y los materiales?" required></textarea>
            </div>

            <div class="form-actions-row">
              <button type="button" class="btn btn-outline" id="btn-cancel-review-bottom">Cancelar</button>
              <button type="submit" class="btn btn-primary" id="btn-submit-review">Publicar Reseña en la Tienda</button>
            </div>
          </form>
        </div>

        <!-- LISTADO DE RESEÑAS (POP-IN PASO 4) -->
        ${reviews.length === 0
        ? `
          <div class="empty-state-box profile-component-pop pop-step-4">
            <div class="empty-icon">${Icons.star('w-5 h-5')}</div>
            <h4>No has publicado reseñas todavía</h4>
            <p>Cuéntanos qué te han parecido tus pares favoritos.</p>
          </div>
        `
        : `
          <div class="reviews-list-stack profile-component-pop pop-step-4">
            ${reviews
          .map(
            (rev: any) => `
              <div class="profile-review-card">
                <img src="${rev.productImage || '/assets/logo/Isotipo.png'}" alt="${rev.productName}" class="review-prod-thumb" />
                <div class="review-content-col">
                  <div class="review-head-row">
                    <strong>${rev.productName}</strong>
                    <span class="stars-gold" style="color: #eab308; font-weight: 700; font-size: 0.9rem;">
                      ${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)} (${rev.rating}/5)
                    </span>
                  </div>
                  <p class="review-comment-text">"${rev.comment || 'Sin comentario adicional'}"</p>
                  <span class="review-date-text">Publicada el ${new Date(rev.createdAt).toLocaleDateString('es-SV')}</span>
                </div>
              </div>
            `
          )
          .join('')}
          </div>
        `
      }
      </div>
    `;
  }

  // --- TAB 7: LISTA DE DESEOS (WISHLIST) ---
  private renderWishlistTab(): string {
    const { wishlist } = this.profileData;

    return `
      <div class="tab-panel">
        <div class="panel-header-row profile-component-pop pop-step-3">
          <div>
            <h2 class="panel-title">Lista de Deseos</h2>
            <p class="panel-subtitle">Tus modelos favoritos guardados para comprar cuando desees.</p>
          </div>
        </div>

        ${wishlist.length === 0
        ? `
          <div class="empty-state-box profile-component-pop pop-step-4">
            <div class="empty-icon">${Icons.heart('w-5 h-5')}</div>
            <h4>Tu lista de deseos está vacía</h4>
            <p>Marca con el corazón los modelos que más te gusten en el catálogo.</p>
            <button class="btn btn-primary btn-go-shop" style="margin-top:16px;">Ver Catálogo</button>
          </div>
        `
        : `
          <div class="wishlist-profile-grid profile-component-pop pop-step-4">
            ${wishlist
          .map(
            (w: any) => `
              <div class="wishlist-prod-card">
                <img src="${w.product.image}" alt="${w.product.name}" class="wish-img" />
                <div class="wish-info">
                  <h5>${w.product.name}</h5>
                  <span class="wish-price">$${w.product.price.toFixed(2)}</span>
                </div>
                <button class="btn btn-primary btn-sm btn-wish-buy btn-go-shop">
                  Ver en Tienda
                </button>
              </div>
            `
          )
          .join('')}
          </div>
        `
      }
      </div>
    `;
  }

  // ==========================================================================
  // CONFIGURACIÓN DE EVENTOS DEL PANEL
  // ==========================================================================
  private setupEvents(): void {
    // BOTÓN REGRESAR EN EL EXTREMO IZQUIERDO DEL HEADER (CON ANIMACIÓN CINEMÁTICA)
    this.container.querySelector('#btn-header-back')?.addEventListener('click', () => {
      this.closeView(false);
    });

    // CLIC EN LOGO CENTRAL (CON ANIMACIÓN CINEMÁTICA)
    this.container.querySelector('#link-header-center-logo')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.closeView(false);
    });

    // BOTÓN SALIR DE SESIÓN EN EL EXTREMO DERECHO DEL HEADER (CON ANIMACIÓN CINEMÁTICA)
    this.container.querySelector('#btn-header-logout')?.addEventListener('click', () => {
      this.closeView(true);
    });

    // BOTÓN VOLVER EN SIDEBAR
    this.container.querySelector('#btn-sidebar-go-shop')?.addEventListener('click', () => {
      this.closeView(false);
    });

    // BOTONES "VER EN TIENDA" O "VER CATÁLOGO"
    this.container.querySelectorAll('.btn-go-shop').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.closeView(false);
      });
    });

    // Cambio de pestañas con animación de pop en el área principal dinámica
    this.container.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).dataset.tab as ProfileTab;
        if (tab) {
          this.activeTab = tab;
          const mainArea = this.container.querySelector('.profile-main-content') as HTMLElement | null;
          if (mainArea) {
            mainArea.innerHTML = this.renderActiveTabContent();
            this.setupTabInnerEvents();
            // Disparar pop en el área principal al cambiar de pestaña
            mainArea.classList.remove('tab-popped');
            void mainArea.offsetWidth;
            mainArea.classList.add('tab-popped');
          }
          // Actualizar menú activo
          this.container.querySelectorAll('.profile-nav-item').forEach((item) => {
            item.classList.toggle('is-active', (item as HTMLElement).dataset.tab === tab);
          });
        }
      });
    });

    // Accesos directos desde las métricas
    this.container.querySelectorAll('[data-tab-goto]').forEach((card) => {
      card.addEventListener('click', () => {
        const tab = (card as HTMLElement).dataset.tabGoto as ProfileTab;
        if (tab) {
          this.activeTab = tab;
          const mainArea = this.container.querySelector('.profile-main-content') as HTMLElement | null;
          if (mainArea) {
            mainArea.innerHTML = this.renderActiveTabContent();
            this.setupTabInnerEvents();
            // Disparar pop en el área principal al cambiar de pestaña
            mainArea.classList.remove('tab-popped');
            void mainArea.offsetWidth;
            mainArea.classList.add('tab-popped');
          }
          this.container.querySelectorAll('.profile-nav-item').forEach((item) => {
            item.classList.toggle('is-active', (item as HTMLElement).dataset.tab === tab);
          });
        }
      });
    });

    this.setupTabInnerEvents();
  }

  /**
   * Eventos internos de cada formulario o acción dentro de las pestañas
   */
  private setupTabInnerEvents(): void {
    // Copiar código de cupón
    this.container.querySelectorAll('.btn-copy-code').forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = (btn as HTMLElement).dataset.code;
        if (code) {
          navigator.clipboard.writeText(code);
          Toast.show(`Código ${code} copiado al portapapeles.`);
        }
      });
    });

    // Usar cupón en tienda
    this.container.querySelectorAll('.btn-use-in-shop').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const code = (btn as HTMLElement).dataset.code;
        if (code) {
          await this.store.applyPromo(code);
          this.closeView(false);
          this.store.toggleCart(true);
        }
      });
    });

    // Actualizar información personal
    const formInfo = this.container.querySelector('#form-update-user-info');
    formInfo?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = this.container.querySelector('#edit-user-name') as HTMLInputElement | null;
      const phoneInput = this.container.querySelector('#edit-user-phone') as HTMLInputElement | null;

      if (!this.store.currentUser) return;

      const res = await ApiService.updateUserInfo(
        this.store.currentUser.id,
        nameInput?.value.trim() || this.store.currentUser.name,
        phoneInput?.value.trim() || undefined
      );

      if (res.success) {
        Toast.show(res.message || 'Datos actualizados con éxito.', 'Perfil Actualizado', 'success');
        this.store.currentUser.name = nameInput?.value.trim() || this.store.currentUser.name;
        StorageService.saveUser(this.store.currentUser);
        await this.fetchProfileData();
        const greetingName = this.container.querySelector('.greeting-name');
        if (greetingName) greetingName.textContent = this.store.currentUser.name;
      }
    });

    // Toggle formulario de nueva dirección
    const boxAddress = this.container.querySelector('#box-new-address') as HTMLElement | null;
    this.container.querySelector('#btn-toggle-new-address')?.addEventListener('click', () => {
      boxAddress?.classList.toggle('is-hidden');
    });
    this.container.querySelector('#btn-cancel-new-address')?.addEventListener('click', () => {
      boxAddress?.classList.add('is-hidden');
    });
    this.container.querySelector('#btn-cancel-address-bottom')?.addEventListener('click', () => {
      boxAddress?.classList.add('is-hidden');
    });

    // Apertura y autocompletado con el mapa interactivo de El Salvador
    const openMapAndFillAddress = () => {
      boxAddress?.classList.remove('is-hidden');

      MapPickerModal.getInstance().open((location: SelectedLocation) => {
        const stateSelect = this.container.querySelector('#addr-state') as HTMLSelectElement | null;
        const citySelect = this.container.querySelector('#addr-city') as HTMLSelectElement | null;
        const streetInput = this.container.querySelector('#addr-street') as HTMLTextAreaElement | null;
        const postalInput = this.container.querySelector('#addr-postal') as HTMLInputElement | null;
        const refInput = this.container.querySelector('#addr-reference') as HTMLInputElement | null;

        // 1. Asignar Departamento
        if (stateSelect) {
          stateSelect.value = location.state;
          stateSelect.dispatchEvent(new Event('change'));
        }

        // 2. Asignar Municipio
        if (citySelect) {
          let matched = false;
          const locCityClean = location.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

          for (let i = 0; i < citySelect.options.length; i++) {
            const optVal = citySelect.options[i].value;
            const optClean = optVal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (optClean.includes(locCityClean) || locCityClean.includes(optClean)) {
              citySelect.selectedIndex = i;
              matched = true;
              break;
            }
          }

          if (!matched && citySelect.options.length > 1) {
            citySelect.selectedIndex = 1;
          }
        }

        // 3. Asignar Calle / Colonia
        if (streetInput) {
          streetInput.value = location.street;
        }

        // 4. Asignar Código Postal
        if (postalInput) {
          postalInput.value = location.postalCode;
        }

        // 5. Asignar Referencia
        if (refInput && !refInput.value) {
          refInput.value = location.reference || `Punto en mapa (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`;
        }

        boxAddress?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const nameInput = this.container.querySelector('#addr-fullname') as HTMLInputElement | null;
        nameInput?.focus();
      });
    };

    this.container.querySelector('#btn-open-map-direct')?.addEventListener('click', openMapAndFillAddress);
    this.container.querySelector('#btn-trigger-map-picker')?.addEventListener('click', openMapAndFillAddress);

    // Selector dinámico de Departamentos de El Salvador -> Municipios
    const deptSelect = this.container.querySelector('#addr-state') as HTMLSelectElement | null;
    const citySelect = this.container.querySelector('#addr-city') as HTMLSelectElement | null;

    deptSelect?.addEventListener('change', () => {
      const selectedDept = deptSelect.value;
      if (citySelect) {
        if (selectedDept && EL_SALVADOR_DEPARTMENTS[selectedDept]) {
          citySelect.disabled = false;
          citySelect.innerHTML = `
            <option value="">Selecciona municipio o distrito de ${selectedDept}...</option>
            ${EL_SALVADOR_DEPARTMENTS[selectedDept].map((m) => `<option value="${m}">${m}</option>`).join('')}
          `;
        } else {
          citySelect.disabled = true;
          citySelect.innerHTML = `<option value="">Primero selecciona el departamento</option>`;
        }
      }
    });

    // Submit nueva dirección en El Salvador
    const formAddress = this.container.querySelector('#form-add-address');
    formAddress?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.store.currentUser) return;

      const fullName = (this.container.querySelector('#addr-fullname') as HTMLInputElement | null)?.value.trim() || '';
      const phone = (this.container.querySelector('#addr-phone') as HTMLInputElement | null)?.value.trim() || '';
      const state = (this.container.querySelector('#addr-state') as HTMLSelectElement | null)?.value.trim() || '';
      const city = (this.container.querySelector('#addr-city') as HTMLSelectElement | null)?.value.trim() || '';
      const street = (this.container.querySelector('#addr-street') as HTMLTextAreaElement | null)?.value.trim() || '';
      const reference = (this.container.querySelector('#addr-reference') as HTMLInputElement | null)?.value.trim() || '';
      const postalCode = (this.container.querySelector('#addr-postal') as HTMLInputElement | null)?.value.trim() || '1101';
      const isDefault = (this.container.querySelector('#addr-default') as HTMLInputElement | null)?.checked ?? true;

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

      if (res.success) {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.2 } });
        Toast.show(res.message || 'Dirección en El Salvador agregada con éxito.', 'Dirección Guardada', 'success');
        await this.fetchProfileData();
        const mainArea = this.container.querySelector('.profile-main-content');
        if (mainArea) {
          mainArea.innerHTML = this.renderActiveTabContent();
          this.setupTabInnerEvents();
        }
      } else {
        Toast.show(res.message || 'Error al guardar dirección.', 'Atención', 'warning');
      }
    });

    // Toggle expansión de tarjetas de direcciones al hacer clic (sin abrir modal)
    this.container.querySelectorAll('.address-card-expandable').forEach((card) => {
      card.querySelector('[data-action="toggle-expand"]')?.addEventListener('click', () => {
        card.classList.toggle('is-expanded');
      });
    });

    // Eliminar dirección
    this.container.querySelectorAll('.btn-delete-addr').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!this.store.currentUser) return;
        const addressId = (btn as HTMLElement).dataset.id;
        if (addressId && confirm('¿Estás seguro de eliminar esta dirección?')) {
          const res = await ApiService.deleteAddress(this.store.currentUser.id, addressId);
          if (res.success) {
            Toast.show('Dirección eliminada.');
            await this.fetchProfileData();
            const mainArea = this.container.querySelector('.profile-main-content');
            if (mainArea) {
              mainArea.innerHTML = this.renderActiveTabContent();
              this.setupTabInnerEvents();
            }
          }
        }
      });
    });

    // Marcar dirección como predeterminada
    this.container.querySelectorAll('.btn-make-default').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!this.store.currentUser) return;
        const addressId = (btn as HTMLElement).dataset.id;
        if (addressId) {
          const res = await ApiService.setDefaultAddress(this.store.currentUser.id, addressId);
          if (res.success) {
            Toast.show('Dirección principal actualizada.');
            await this.fetchProfileData();
            const mainArea = this.container.querySelector('.profile-main-content');
            if (mainArea) {
              mainArea.innerHTML = this.renderActiveTabContent();
              this.setupTabInnerEvents();
            }
          }
        }
      });
    });

    // Toggle formulario de tarjeta
    const boxCard = this.container.querySelector('#box-new-card') as HTMLElement | null;
    this.container.querySelector('#btn-toggle-new-card')?.addEventListener('click', () => {
      boxCard?.classList.toggle('is-hidden');
    });
    this.container.querySelector('#btn-cancel-new-card')?.addEventListener('click', () => {
      boxCard?.classList.add('is-hidden');
    });
    this.container.querySelector('#btn-cancel-card-bottom')?.addEventListener('click', () => {
      boxCard?.classList.add('is-hidden');
    });

    // Submit nueva tarjeta
    const formCard = this.container.querySelector('#form-add-card');
    formCard?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.store.currentUser) return;

      const cardHolder = (this.container.querySelector('#card-holder') as HTMLInputElement | null)?.value.trim() || '';
      const cardNumber = (this.container.querySelector('#card-number') as HTMLInputElement | null)?.value.trim() || '';
      const expMonth = Number((this.container.querySelector('#card-month') as HTMLSelectElement | null)?.value) || 12;
      const expYear = Number((this.container.querySelector('#card-year') as HTMLSelectElement | null)?.value) || 2028;
      const isDefault = (this.container.querySelector('#card-default') as HTMLInputElement | null)?.checked ?? true;

      const res = await ApiService.addPaymentCard({
        userId: this.store.currentUser.id,
        cardHolder,
        cardNumber,
        expMonth,
        expYear,
        isDefault
      });

      if (res.success) {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.2 } });
        Toast.show(res.message || 'Tarjeta agregada exitosamente.', 'Método de Pago', 'success');
        await this.fetchProfileData();
        const mainArea = this.container.querySelector('.profile-main-content');
        if (mainArea) {
          mainArea.innerHTML = this.renderActiveTabContent();
          this.setupTabInnerEvents();
        }
      } else {
        Toast.show(res.message || 'Error al guardar tarjeta.', 'Atención', 'warning');
      }
    });

    // Eliminar tarjeta
    this.container.querySelectorAll('.btn-delete-card').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!this.store.currentUser) return;
        const cardId = (btn as HTMLElement).dataset.id;
        if (cardId && confirm('¿Deseas eliminar esta tarjeta?')) {
          const res = await ApiService.deletePaymentCard(this.store.currentUser.id, cardId);
          if (res.success) {
            Toast.show('Tarjeta eliminada.');
            await this.fetchProfileData();
            const mainArea = this.container.querySelector('.profile-main-content');
            if (mainArea) {
              mainArea.innerHTML = this.renderActiveTabContent();
              this.setupTabInnerEvents();
            }
          }
        }
      });
    });

    // Toggle formulario de reseña
    const boxReview = this.container.querySelector('#box-new-review') as HTMLElement | null;
    this.container.querySelector('#btn-toggle-new-review')?.addEventListener('click', () => {
      boxReview?.classList.toggle('is-hidden');
    });
    this.container.querySelector('#btn-cancel-new-review')?.addEventListener('click', () => {
      boxReview?.classList.add('is-hidden');
    });
    this.container.querySelector('#btn-cancel-review-bottom')?.addEventListener('click', () => {
      boxReview?.classList.add('is-hidden');
    });

    // Submit nueva reseña
    const formReview = this.container.querySelector('#form-add-review');
    formReview?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.store.currentUser) return;

      const productId = (this.container.querySelector('#review-product-select') as HTMLSelectElement | null)?.value || '';
      const rating = Number((this.container.querySelector('#review-rating-select') as HTMLSelectElement | null)?.value) || 5;
      const comment = (this.container.querySelector('#review-comment') as HTMLTextAreaElement | null)?.value.trim() || '';

      const res = await ApiService.addReview({
        userId: this.store.currentUser.id,
        productId,
        rating,
        comment
      });

      if (res.success) {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.2 } });
        Toast.show(res.message || '¡Reseña publicada con éxito!', 'Reseña Registrada', 'success');
        await this.fetchProfileData();
        const mainArea = this.container.querySelector('.profile-main-content');
        if (mainArea) {
          mainArea.innerHTML = this.renderActiveTabContent();
          this.setupTabInnerEvents();
        }
      } else {
        Toast.show(res.message || 'Error al publicar reseña.', 'Atención', 'warning');
      }
    });
  }
}
