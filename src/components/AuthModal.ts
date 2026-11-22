import { Store } from '../state/store';
import { Icons } from './Icons';
import { Toast } from './Toast';

interface SmokeParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  maxOpacity: number;
  life: number;
  maxLife: number;
  tex: HTMLCanvasElement;
}

interface SparkParticle {
  x: number;
  y: number;
  z: number;
  vy: number;
  vx: number;
  size: number;
  color: string;
  alpha: number;
}

export class AuthModal {
  private container: HTMLElement;
  private store: Store;
  private activeTab: 'login' | 'register' = 'login';
  private viewMode: 'auth' | 'forgot' = 'auth';

  // Form state
  private showPassword: boolean = false;
  private loginEmail: string = '';
  private loginPass: string = '';
  private regFirstName: string = '';
  private regLastName: string = '';
  private regEmail: string = '';
  private regPass: string = '';
  private forgotEmail: string = '';

  // Transition states
  private isClosing: boolean = false;
  private isOpening: boolean = false;

  // Parallax animation state
  private targetX: number = 0;
  private targetY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  private rafId: number | null = null;
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private resizeHandler: (() => void) | null = null;

  // 3D Smoke and particle system (Green and Gold on White)
  private smokeParticles: SmokeParticle[] = [];
  private sparkParticles: SparkParticle[] = [];
  private texSmokeEmerald: HTMLCanvasElement | null = null;
  private texSmokeGold: HTMLCanvasElement | null = null;
  private texSmokeEmeraldLight: HTMLCanvasElement | null = null;

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.store.subscribe(() => this.render());
    this.setupGlobalListeners();
  }

  private setupGlobalListeners(): void {
    // Tecla ESC para cerrar con transición fluida
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.store.isAuthOpen && !this.isClosing) {
        this.closeView();
      }
    });

    // Hash change (#login, #register, #auth)
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#login' || hash === '#auth') {
        this.switchTab('login');
        if (!this.store.isAuthOpen) this.store.toggleAuth(true);
      } else if (hash === '#register') {
        this.switchTab('register');
        if (!this.store.isAuthOpen) this.store.toggleAuth(true);
      } else {
        if (this.store.isAuthOpen && !this.isClosing) {
          this.closeView();
        }
      }
    });

    // Chequeo inicial
    const initialHash = window.location.hash.toLowerCase();
    if (initialHash === '#login' || initialHash === '#auth') {
      this.activeTab = 'login';
      this.viewMode = 'auth';
      this.store.toggleAuth(true);
    } else if (initialHash === '#register') {
      this.activeTab = 'register';
      this.viewMode = 'auth';
      this.store.toggleAuth(true);
    }
  }

  public render(): void {
    const isOpen = this.store.isAuthOpen;
    const user = this.store.currentUser;

    if (!isOpen) {
      if (this.isClosing) {
        return;
      }
      const splitView = this.container.querySelector('#split-auth-view');
      if (splitView) {
        this.closeView();
        return;
      }

      this.finishClose();
      return;
    }

    this.container.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    if (user) {
      this.container.classList.remove('is-fullscreen-auth');
      this.stopAnimationSystem();
      this.renderUserProfileView(user);
    } else {
      this.container.classList.add('is-fullscreen-auth');
      this.syncUrlHash(true);

      const splitView = this.container.querySelector('#split-auth-view');
      if (!splitView) {
        // Primera carga: se monta el escenario dividido, cortinas y canvas
        this.renderSplitAuthView();
        this.startAnimationSystem();
        this.setupOuterEvents();
        this.setupFormEvents();
        this.playOpenTransition();
      } else {
        // Ya está montado: solo se actualiza el formulario sin tocar el fondo ni reiniciar el canvas
        this.updateFormCardOnly();
      }
    }
  }

  /**
   * Vista Dividida con Cortinas Deslizantes y Animación Pop:
   * - Cortinas: Se deslizan desde los extremos izquierdo y derecho y se juntan al centro.
   * - Destello: Luz dorada en la costura de unión al cerrarse.
   * - Pop: El isologo y la tarjeta Liquid Glass aparecen con un rebote elástico cinematográfico.
   */
  private renderSplitAuthView(): void {
    this.container.innerHTML = `
      <div class="split-auth-view" id="split-auth-view" role="dialog" aria-modal="true" aria-label="Acceso a Blessed Sandals">
        
        <!-- PANELES DE TRANSICIÓN DIVIDIDOS (CORTINAS QUE SE JUNTAN Y SE SEPARAN) -->
        <div class="split-curtain split-curtain-left" id="split-curtain-left"></div>
        <div class="split-curtain split-curtain-right" id="split-curtain-right"></div>

        <!-- DESTELLO LUMINOSO EN LA UNIÓN CENTRAL -->
        <div class="split-seam-flash" id="split-seam-flash"></div>

        <!-- CANVAS 3D PARA EL HUMO Y NUBE DE PARTÍCULAS EN VERDE Y DORADO -->
        <canvas id="split-smoke-canvas" class="split-smoke-canvas"></canvas>

        <!-- BOTÓN DE CERRAR DISCRETO ESTILO LIQUID GLASS -->
        <header class="split-auth-topbar" id="split-auth-topbar">
          <button class="split-topbar-close-btn" id="btn-auth-view-close" aria-label="Cerrar vista y volver a la tienda">
            ${Icons.close('w-5 h-5')}
          </button>
        </header>

        <!-- CONTENEDOR PRINCIPAL: DISTRIBUCIÓN DIVIDIDA (ISOLOGO IZQUIERDA / FORMULARIO DERECHA) -->
        <div class="split-auth-main-wrap">
          
          <!-- COLUMNA IZQUIERDA: ISOLOGO EN COLOR REAL Y MÁS GRANDE (CON WRAPPER PARA POP) -->
          <div class="split-isologo-col" id="split-isologo-col">
            <div class="isologo-pop-wrap" id="isologo-pop-wrap">
              <div class="isologo-interactive-stage" id="isologo-interactive-stage">
                <!-- ISOLOGO OFICIAL LIMPIO SIN CÍRCULOS EXTERNOS -->
                <img 
                  src="/assets/logo/Isologo.png" 
                  alt="Blessed Sandals Isologo Oficial" 
                  class="isologo-real-vivid-img" 
                  id="isologo-real-vivid-img" 
                  loading="eager" 
                />
              </div>
            </div>
          </div>

          <!-- COLUMNA DERECHA: FORMULARIO MINIMALISTA CON TARJETA LIQUID GLASS -->
          <div class="split-form-col" id="split-form-col">
            <div class="form-card-pop-wrap" id="form-card-pop-wrap">
              <div class="split-form-card liquid-glass" id="split-form-card">
                
                <!-- DESTELLO ESPECULAR Y BISEL SUPERIOR -->
                <div class="liquid-glass-flare"></div>

                <!-- LOGO MINIMALISTA SUPERIOR -->
                <div class="card-minimal-logo-wrap">
                  <img src="/assets/logo/IsotipoDark.png" alt="Blessed" class="card-minimal-logo-img" />
                </div>

                <!-- CONTENEDOR DINÁMICO DEL FORMULARIO (CAMBIA SUAVEMENTE SIN CORTES DE FONDO) -->
                <div class="card-form-dynamic-wrap" id="card-form-dynamic-wrap">
                  ${
                    this.viewMode === 'forgot'
                      ? this.renderForgotPasswordForm()
                      : this.activeTab === 'register'
                      ? this.renderRegisterForm()
                      : this.renderLoginForm()
                  }
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  /**
   * Ejecuta la secuencia cinemática de apertura:
   * 1. Las dos cortinas se cierran deslizándose desde los lados hacia el centro.
   * 2. Destello dorado en la costura central.
   * 3. Pop elástico del isologo y de la tarjeta Liquid Glass.
   */
  private playOpenTransition(): void {
    const splitView = this.container.querySelector('#split-auth-view') as HTMLElement | null;
    if (!splitView) return;

    this.isOpening = true;

    // Próximo cuadro de animación: cerrar las dos cortinas hacia el centro
    requestAnimationFrame(() => {
      splitView.classList.add('doors-joined');
    });

    // A los 320ms: destello luminoso en la costura de unión
    setTimeout(() => {
      const flash = splitView.querySelector('#split-seam-flash') as HTMLElement | null;
      if (flash) flash.classList.add('is-flashing');
    }, 320);

    // A los 360ms: Pop in del isologo y formulario
    setTimeout(() => {
      splitView.classList.add('content-revealed');
      setTimeout(() => {
        this.isOpening = false;
      }, 550);
    }, 360);
  }

  /**
   * Ejecuta la secuencia cinemática de cierre hacia la tienda:
   * 1. El isologo y el formulario hacen un "pop out" suave encogiéndose y desvaneciéndose.
   * 2. Las dos cortinas se dividen por la mitad y se abren deslizándose a los lados.
   * 3. La tienda queda completamente al descubierto.
   */
  private closeView(): void {
    if (this.isClosing) return;
    this.isClosing = true;

    const splitView = this.container.querySelector('#split-auth-view') as HTMLElement | null;
    if (!splitView) {
      this.finishClose();
      return;
    }

    // 1. Pop out del contenido
    splitView.classList.remove('content-revealed');
    splitView.classList.add('is-closing');

    // 2. A los 180ms: Las dos cortinas se dividen y se abren hacia los lados
    setTimeout(() => {
      splitView.classList.remove('doors-joined');
      splitView.classList.add('doors-parting');
    }, 180);

    // 3. A los 560ms: Las cortinas han salido de la pantalla y la tienda está visible
    setTimeout(() => {
      this.finishClose();
    }, 560);
  }

  private finishClose(): void {
    this.container.classList.remove('is-open', 'is-fullscreen-auth');
    document.body.style.overflow = '';
    this.stopAnimationSystem();
    this.syncUrlHash(false);
    this.container.innerHTML = '';
    this.isClosing = false;
    this.isOpening = false;
    if (this.store.isAuthOpen) {
      this.store.toggleAuth(false);
    }
  }

  /**
   * Actualiza solo el contenido del formulario sin reiniciar el canvas ni el fondo
   */
  private updateFormCardOnly(): void {
    const wrap = this.container.querySelector('#card-form-dynamic-wrap') as HTMLElement | null;
    if (!wrap) {
      this.render();
      return;
    }

    wrap.classList.add('is-switching');
    setTimeout(() => {
      wrap.innerHTML =
        this.viewMode === 'forgot'
          ? this.renderForgotPasswordForm()
          : this.activeTab === 'register'
          ? this.renderRegisterForm()
          : this.renderLoginForm();

      wrap.classList.remove('is-switching');
      this.setupFormEvents();
    }, 120);
  }

  private switchTab(tab: 'login' | 'register'): void {
    if (this.activeTab === tab && this.viewMode === 'auth') return;
    this.activeTab = tab;
    this.viewMode = 'auth';
    this.syncUrlHash(true);
    this.updateFormCardOnly();
  }

  /**
   * Formulario de Registro minimalista (Exactamente como la imagen del usuario)
   */
  private renderRegisterForm(): string {
    const pendingCode = this.store.pendingPromoCode;

    return `
      <form class="min-auth-form" id="form-register">
        
        ${
          pendingCode
            ? `
          <div style="background: rgba(13, 100, 61, 0.08); border: 1px solid rgba(13, 100, 61, 0.2); border-radius: 12px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; color: #0d643d; text-align: center;">
            🎟️ <strong>¡Regístrate para activar ${pendingCode}!</strong>
            <span style="display:block; font-size:11px; opacity:0.85; margin-top:2px;">Se agregará a tu cuenta personal con 1 solo uso garantizado.</span>
          </div>
        `
            : ''
        }

        <!-- Fila de Nombre y Apellido (Pill Inputs lado a lado) -->
        <div class="min-form-row">
          <input 
            type="text" 
            id="reg-first-name" 
            class="min-pill-input" 
            placeholder="Nombre" 
            value="${this.regFirstName}" 
            autocomplete="given-name" 
            required 
          />
          <input 
            type="text" 
            id="reg-last-name" 
            class="min-pill-input" 
            placeholder="Apellido" 
            value="${this.regLastName}" 
            autocomplete="family-name" 
            required 
          />
        </div>

        <!-- Fila de Correo -->
        <div class="min-form-group">
          <input 
            type="email" 
            id="reg-email" 
            class="min-pill-input" 
            placeholder="Correo electrónico" 
            value="${this.regEmail}" 
            autocomplete="email" 
            required 
          />
        </div>

        <!-- Fila de Contraseña con botón de ojo pill separado -->
        <div class="min-password-row">
          <input 
            type="${this.showPassword ? 'text' : 'password'}" 
            id="reg-pass" 
            class="min-pill-input min-pass-input" 
            placeholder="Contraseña" 
            value="${this.regPass}" 
            autocomplete="new-password" 
            minlength="6" 
            required 
          />
          <button type="button" class="min-pill-eye-btn" id="btn-toggle-pass" aria-label="Ver u ocultar contraseña">
            ${this.showPassword ? Icons.eyeOff('w-4 h-4') : Icons.eye('w-4 h-4')}
          </button>
        </div>

        <!-- Botón principal pill negro -->
        <button type="submit" class="min-pill-submit-btn" id="btn-submit-register">
          Crear cuenta y desbloquear cupón
        </button>

        <!-- Texto legal -->
        <p class="min-legal-text">
          Al registrarte en Blessed Sandals aceptas la 
          <a href="#" class="min-legal-link">Política de Privacidad</a> y los 
          <a href="#" class="min-legal-link">Términos de Servicio</a>.
        </p>

        <!-- Cambio a iniciar sesión -->
        <div class="min-switch-text">
          ¿Ya tienes una cuenta? <button type="button" class="min-switch-link" id="link-switch-to-login">Inicia sesión aquí</button>
        </div>

      </form>
    `;
  }

  /**
   * Formulario de Inicio de Sesión minimalista (Exactamente como la imagen del usuario)
   */
  private renderLoginForm(): string {
    const pendingCode = this.store.pendingPromoCode;

    return `
      <form class="min-auth-form" id="form-login">
        
        ${
          pendingCode
            ? `
          <div style="background: rgba(13, 100, 61, 0.08); border: 1px solid rgba(13, 100, 61, 0.2); border-radius: 12px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; color: #0d643d; text-align: center;">
            🎟️ Inicia sesión para activar tu cupón <strong>${pendingCode}</strong>
          </div>
        `
            : ''
        }

        <!-- Fila de Correo -->
        <div class="min-form-group">
          <input 
            type="email" 
            id="login-email" 
            class="min-pill-input" 
            placeholder="Correo electrónico" 
            value="${this.loginEmail}" 
            autocomplete="email" 
            required 
          />
        </div>

        <!-- Fila de Contraseña con botón de ojo pill separado -->
        <div class="min-password-row">
          <input 
            type="${this.showPassword ? 'text' : 'password'}" 
            id="login-pass" 
            class="min-pill-input min-pass-input" 
            placeholder="Contraseña" 
            value="${this.loginPass}" 
            autocomplete="current-password" 
            required 
          />
          <button type="button" class="min-pill-eye-btn" id="btn-toggle-pass" aria-label="Ver u ocultar contraseña">
            ${this.showPassword ? Icons.eyeOff('w-4 h-4') : Icons.eye('w-4 h-4')}
          </button>
        </div>

        <!-- Botón principal pill negro -->
        <button type="submit" class="min-pill-submit-btn" id="btn-submit-login">
          Iniciar sesión
        </button>

        <!-- Enlace olvidó contraseña -->
        <div class="min-forgot-wrap">
          <button type="button" class="min-forgot-link" id="link-forgot-pass">¿Olvidaste tu contraseña?</button>
        </div>

        <!-- Cambio a registro -->
        <div class="min-switch-text">
          ¿No tienes una cuenta? <button type="button" class="min-switch-link" id="link-switch-to-register">Regístrate aquí</button>
        </div>

      </form>
    `;
  }

  /**
   * Formulario de Recuperación de Contraseña
   */
  private renderForgotPasswordForm(): string {
    return `
      <form class="min-auth-form" id="form-forgot">
        
        <div class="min-form-group">
          <input 
            type="email" 
            id="forgot-email" 
            class="min-pill-input" 
            placeholder="Correo electrónico registrado" 
            value="${this.forgotEmail}" 
            required 
          />
        </div>

        <button type="submit" class="min-pill-submit-btn">
          Enviar enlace de recuperación
        </button>

        <div class="min-switch-text">
          <button type="button" class="min-switch-link" id="btn-back-to-login">← Volver a iniciar sesión</button>
        </div>

      </form>
    `;
  }

  /**
   * Modal de Perfil de Usuario cuando está autenticado
   */
  private renderUserProfileView(user: any): void {
    this.container.innerHTML = `
      <div class="modal-backdrop" id="auth-modal-backdrop"></div>
      <div class="auth-modal-panel animate-scale-up" role="dialog" aria-modal="true">
        <div class="auth-modal-header">
          <h3 class="auth-modal-title">Mi Cuenta</h3>
          <button class="modal-close-btn" id="auth-modal-close" aria-label="Cerrar modal">
            ${Icons.close('w-5 h-5')}
          </button>
        </div>

        <div class="auth-modal-body">
          <div class="user-profile-view">
            <!-- BOTÓN DESTACADO PARA ABRIR EL PANEL COMPLETO EN LA MISMA PÁGINA -->
            <button class="btn btn-primary" id="btn-open-profile-spa" style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; margin-bottom:16px; padding:12px; border-radius:12px; font-weight:800; font-size:0.9rem; background:#0d643d; color:#fff; box-shadow: 0 4px 12px rgba(13,100,61,0.25); cursor:pointer;">
              <span>Ver Mi Perfil Completo y Cupones</span>
              <span style="font-size:1.1rem;">→</span>
            </button>

            <div class="user-id-card">
              <div class="user-avatar-wrap">
                <img src="${user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" alt="${user.name}" class="user-avatar-img" />
                <span class="user-role-badge">${user.role === 'ADMIN' ? 'Admin' : 'Cliente'}</span>
              </div>
              <div class="user-main-info">
                <h4 class="user-display-name">${user.name}</h4>
                <p class="user-display-email">${user.email}</p>
              </div>
            </div>

            <div class="user-account-options">
              <div class="account-option-item">
                <div class="option-content">
                  <strong>Mis Pedidos</strong>
                  <p>Historial y seguimiento de compras</p>
                </div>
                <span class="option-arrow">${Icons.chevronRight('w-4 h-4')}</span>
              </div>

              <div class="account-option-item">
                <div class="option-content">
                  <strong>Dirección de Entrega</strong>
                  <p>Av. Las Palmas #123, San Salvador</p>
                </div>
                <span class="option-arrow">${Icons.chevronRight('w-4 h-4')}</span>
              </div>

              <div class="account-option-item" id="btn-open-promos-from-user">
                <div class="option-content">
                  <strong>Mis Cupones Personales</strong>
                  <p>${this.store.appliedPromo ? `Cupón activo: ${this.store.appliedPromo.code}` : 'Gestionar códigos de descuento en tu cuenta'}</p>
                </div>
                <span class="option-arrow">${Icons.chevronRight('w-4 h-4')}</span>
              </div>
            </div>

            <!-- LISTADO DE CUPONES PERSONALES VINCULADOS A LA CUENTA -->
            ${
              user.userCoupons && user.userCoupons.length > 0
                ? `
              <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(0,0,0,0.06); text-align: left;">
                <h5 style="font-size: 13px; font-weight: 700; color: #111; margin-bottom: 8px;">Cupones asignados a tu cuenta:</h5>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${user.userCoupons
                    .map(
                      (uc: any) => `
                    <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 12px;">
                      <div>
                        <strong style="color: #0d643d; font-size: 13px;">${uc.promoCode?.code || 'CUPÓN'}</strong>
                        <span style="display: block; font-size: 11px; color: #64748b;">${uc.promoCode?.description || 'Descuento especial'}</span>
                      </div>
                      <div>
                        ${
                          uc.isUsed
                            ? `<span style="background: #fee2e2; color: #b91c1c; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 999px;">Ya canjeado (1 uso)</span>`
                            : `<span style="background: #dcfce7; color: #15803d; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 999px;">Disponible</span>`
                        }
                      </div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
                : ''
            }

            <div class="user-logout-wrap">
              <button class="btn btn-outline-danger btn-logout" id="btn-auth-logout">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Eventos del Perfil
    this.container.querySelector('#btn-open-profile-spa')?.addEventListener('click', () => {
      this.closeView();
      this.store.toggleProfile(true);
    });

    this.container.querySelector('#auth-modal-backdrop')?.addEventListener('click', () => {
      this.store.toggleAuth(false);
    });

    this.container.querySelector('#auth-modal-close')?.addEventListener('click', () => {
      this.store.toggleAuth(false);
    });

    this.container.querySelector('#btn-auth-logout')?.addEventListener('click', () => {
      this.store.logout();
      Toast.show('Sesión cerrada correctamente.');
      this.render();
    });

    this.container.querySelector('#btn-open-promos-from-user')?.addEventListener('click', () => {
      this.store.toggleAuth(false);
      this.store.togglePromo(true);
    });
  }

  /**
   * Eventos del contenedor exterior (botón cerrar vista)
   */
  private setupOuterEvents(): void {
    this.container.querySelector('#btn-auth-view-close')?.addEventListener('click', () => {
      this.closeView();
    });
  }

  /**
   * Eventos de los formularios (cambios de pestaña suaves y submits)
   */
  private setupFormEvents(): void {
    // Cambio a Iniciar Sesión sin recargar vista
    this.container.querySelector('#link-switch-to-login')?.addEventListener('click', () => {
      this.switchTab('login');
    });

    // Cambio a Registro sin recargar vista
    this.container.querySelector('#link-switch-to-register')?.addEventListener('click', () => {
      this.switchTab('register');
    });

    // Toggle contraseña
    this.container.querySelector('#btn-toggle-pass')?.addEventListener('click', () => {
      this.showPassword = !this.showPassword;
      const passInput = (this.container.querySelector('#login-pass') || this.container.querySelector('#reg-pass')) as HTMLInputElement | null;
      if (passInput) {
        passInput.type = this.showPassword ? 'text' : 'password';
      }
      const btnToggle = this.container.querySelector('#btn-toggle-pass');
      if (btnToggle) {
        btnToggle.innerHTML = this.showPassword ? Icons.eyeOff('w-4 h-4') : Icons.eye('w-4 h-4');
      }
    });

    // Olvidó contraseña
    this.container.querySelector('#link-forgot-pass')?.addEventListener('click', () => {
      this.viewMode = 'forgot';
      this.updateFormCardOnly();
    });

    // Volver a login desde olvidó contraseña
    this.container.querySelector('#btn-back-to-login')?.addEventListener('click', () => {
      this.switchTab('login');
    });

    // Enviar recuperación
    const formForgot = this.container.querySelector('#form-forgot');
    formForgot?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = this.container.querySelector('#forgot-email') as HTMLInputElement | null;
      const email = input?.value.trim() || '';
      Toast.show(`Enlace enviado a ${email || 'tu correo'}.`);
      this.switchTab('login');
    });

    // Submit Login
    const formLogin = this.container.querySelector('#form-login');
    formLogin?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = this.container.querySelector('#login-email') as HTMLInputElement | null;
      const passInput = this.container.querySelector('#login-pass') as HTMLInputElement | null;
      const email = emailInput?.value.trim() || '';
      const password = passInput?.value || '';

      if (!email) {
        Toast.show('Por favor ingresa tu correo electrónico.', 'Iniciar Sesión', 'warning');
        return;
      }

      const res = await this.store.login(email, password);
      if (res.success) {
        Toast.show(res.message, 'Sesión Iniciada', 'success');
        this.closeView();
      } else if (res.requireRegister) {
        Toast.show(res.message, 'Regístrate', 'info', 5000);
        this.regEmail = email;
        this.switchTab('register');
      } else {
        Toast.show(res.message, 'Error', 'warning');
      }
    });

    // Submit Register
    const formRegister = this.container.querySelector('#form-register');
    formRegister?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const firstInput = this.container.querySelector('#reg-first-name') as HTMLInputElement | null;
      const lastInput = this.container.querySelector('#reg-last-name') as HTMLInputElement | null;
      const emailInput = this.container.querySelector('#reg-email') as HTMLInputElement | null;
      const firstName = firstInput?.value.trim() || '';
      const lastName = lastInput?.value.trim() || '';
      const email = emailInput?.value.trim() || '';

      if (!firstName || !email) {
        Toast.show('Por favor completa tu nombre y correo.', 'Registro', 'warning');
        return;
      }

      const res = await this.store.register(firstName, lastName, email);
      if (res.success) {
        Toast.show(res.message, '¡Bienvenido a Blessed Sandals!', 'success', 6000);
        this.closeView();
      } else if (res.requireLogin) {
        Toast.show(res.message, 'Ya registrado', 'info');
        this.loginEmail = email;
        this.switchTab('login');
      } else {
        Toast.show(res.message, 'Error al registrar', 'warning');
      }
    });
  }

  private syncUrlHash(isOpen: boolean): void {
    if (isOpen) {
      const targetHash = `#${this.activeTab}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    } else {
      const currentHash = window.location.hash.toLowerCase();
      if (currentHash === '#login' || currentHash === '#register' || currentHash === '#auth') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }

  /**
   * Pre-renderizado de texturas de humo volumétrico verde y dorado
   */
  private createPuffTexture(r: number, g: number, b: number, peakAlpha: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 160;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(80, 80, 0, 80, 80, 80);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${peakAlpha})`);
    grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${peakAlpha * 0.65})`);
    grad.addColorStop(0.65, `rgba(${r}, ${g}, ${b}, ${peakAlpha * 0.25})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 160, 160);
    return c;
  }

  /**
   * Inicialización del Sistema de Partículas y Humo 3D en Verde y Dorado sobre Fondo Blanco
   */
  private startAnimationSystem(): void {
    this.stopAnimationSystem();

    const canvas = this.container.querySelector('#split-smoke-canvas') as HTMLCanvasElement | null;
    const isologoStage = this.container.querySelector('#isologo-interactive-stage') as HTMLElement | null;
    const formCard = this.container.querySelector('#split-form-card') as HTMLElement | null;

    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crear texturas suaves de neblina verde y dorada para fondo blanco
    if (!this.texSmokeEmerald) {
      this.texSmokeEmerald = this.createPuffTexture(13, 100, 61, 0.44); // Verde esmeralda profundo
      this.texSmokeEmeraldLight = this.createPuffTexture(22, 135, 85, 0.35); // Esmeralda suave
      this.texSmokeGold = this.createPuffTexture(210, 181, 136, 0.42); // Dorado champán
    }

    const textures: HTMLCanvasElement[] = [
      this.texSmokeEmerald!,
      this.texSmokeEmeraldLight!,
      this.texSmokeGold!
    ];

    // Dimensionar canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    this.resizeHandler = resizeCanvas;
    window.addEventListener('resize', this.resizeHandler);

    // Generar partículas de humo volumétrico verde y dorado
    const numParticles = 48;
    this.smokeParticles = [];
    for (let i = 0; i < numParticles; i++) {
      this.smokeParticles.push({
        x: (Math.random() - 0.5) * canvas.width * 1.1,
        y: (Math.random() - 0.5) * canvas.height * 1.1,
        z: Math.random() * 400 - 200,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.2 - Math.random() * 0.5,
        size: 160 + Math.random() * 240,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.008,
        maxOpacity: 0.28 + Math.random() * 0.32,
        life: Math.random() * 400,
        maxLife: 350 + Math.random() * 300,
        tex: textures[Math.floor(Math.random() * textures.length)]
      });
    }

    // Generar chispas / micro-partículas etéreas en verde y oro
    const numSparks = 32;
    this.sparkParticles = [];
    for (let i = 0; i < numSparks; i++) {
      this.sparkParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 300,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.4 - Math.random() * 0.7,
        size: 1.5 + Math.random() * 2.8,
        color: Math.random() > 0.5 ? '#b8965a' : '#0d643d',
        alpha: 0.35 + Math.random() * 0.5
      });
    }

    // Listener de movimiento de ratón
    this.mouseMoveHandler = (e: MouseEvent) => {
      this.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', this.mouseMoveHandler);

    let time = 0;

    const renderLoop = () => {
      time += 0.015;

      // LERP para seguimiento suave del ratón
      this.currentX += (this.targetX - this.currentX) * 0.05;
      this.currentY += (this.targetY - this.currentY) * 0.05;

      // Seguimiento 3D del isologo a la izquierda
      if (isologoStage && !this.isClosing && !this.isOpening) {
        const transX = this.currentX * 28;
        const transY = this.currentY * 24;
        const rotY = this.currentX * 12;
        const rotX = this.currentY * -10;
        isologoStage.style.transform = `perspective(1000px) translate3d(${transX.toFixed(2)}px, ${transY.toFixed(2)}px, 0) rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg)`;
      }

      // Micro-reacción de la tarjeta Liquid Glass
      if (formCard && !this.isClosing && !this.isOpening) {
        const cardX = this.currentX * -10;
        const cardY = this.currentY * -8;
        formCard.style.transform = `translate3d(${cardX.toFixed(2)}px, ${cardY.toFixed(2)}px, 0)`;
      }

      // Renderizado del Canvas: Humo y Nube 3D en verde y oro
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.5;

      // Dibujar partículas de humo
      for (let i = 0; i < this.smokeParticles.length; i++) {
        const p = this.smokeParticles[i];

        p.life++;
        p.rotation += p.vRot;

        p.y += p.vy;
        p.x += p.vx + Math.sin(time + p.z * 0.02) * 0.45;

        p.x += this.currentX * 0.8;
        p.y += this.currentY * 0.4;

        if (p.life >= p.maxLife || p.y < -canvas.height * 0.6) {
          p.life = 0;
          p.x = (Math.random() - 0.5) * canvas.width * 1.1;
          p.y = canvas.height * 0.5 + Math.random() * 100;
          p.z = Math.random() * 400 - 200;
        }

        const progress = p.life / p.maxLife;
        const alpha = Math.sin(progress * Math.PI) * p.maxOpacity;

        const fov = 450;
        const scale = fov / (fov + p.z);
        const screenX = cx + p.x * scale;
        const screenY = cy + p.y * scale;
        const drawSize = p.size * scale;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.translate(screenX, screenY);
        ctx.rotate(p.rotation);
        ctx.drawImage(p.tex, -drawSize * 0.5, -drawSize * 0.5, drawSize, drawSize);
        ctx.restore();
      }

      // Dibujar partículas luminosas flotantes (stardust verde y oro)
      for (let j = 0; j < this.sparkParticles.length; j++) {
        const s = this.sparkParticles[j];
        s.y += s.vy;
        s.x += s.vx + Math.cos(time + s.y * 0.01) * 0.3;

        if (s.y < 0) {
          s.y = canvas.height + 10;
          s.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha * (0.6 + Math.sin(time * 3 + j) * 0.4);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      this.rafId = requestAnimationFrame(renderLoop);
    };

    this.rafId = requestAnimationFrame(renderLoop);
  }

  private stopAnimationSystem(): void {
    if (this.mouseMoveHandler) {
      window.removeEventListener('mousemove', this.mouseMoveHandler);
      this.mouseMoveHandler = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}