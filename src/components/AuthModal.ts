import { Store } from '../state/store';
import { Icons } from './Icons';
import { Toast } from './Toast';

export class AuthModal {
  private container: HTMLElement;
  private store: Store;
  private activeTab: 'login' | 'register' = 'login';

  // Form State
  private loginEmail: string = '';
  private loginPass: string = '';
  private regName: string = '';
  private regEmail: string = '';
  private regPass: string = '';

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.store.subscribe(() => this.render());
  }

  public render(): void {
    const isOpen = this.store.isAuthOpen;
    const user = this.store.currentUser;

    if (isOpen) {
      this.container.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    } else {
      this.container.classList.remove('is-open');
      document.body.style.overflow = '';
      return;
    }

    this.container.innerHTML = `
      <div class="modal-backdrop" id="auth-modal-backdrop"></div>
      <div class="auth-modal-panel animate-scale-up" role="dialog" aria-modal="true">
        <!-- CABECERA -->
        <div class="auth-modal-header">
          <div class="auth-header-title-box">
            <span class="auth-header-icon">${Icons.user('w-5 h-5')}</span>
            <h3 class="auth-modal-title">${user ? 'Mi Cuenta' : 'Acceso a Blessed'}</h3>
          </div>
          <button class="modal-close-btn" id="auth-modal-close" aria-label="Cerrar modal">
            ${Icons.close('w-5 h-5')}
          </button>
        </div>

        <div class="auth-modal-body">
          ${user ? this.renderUserProfile(user) : this.renderAuthForms()}
        </div>
      </div>
    `;

    this.setupEvents();
  }

  /**
   * Vista cuando el usuario está autenticado
   */
  private renderUserProfile(user: any): string {
    return `
      <div class="user-profile-view">
        <!-- TARJETA DE PERFIL SUPERIOR -->
        <div class="user-id-card">
          <div class="user-avatar-wrap">
            <img src="${user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" alt="${user.name}" class="user-avatar-img" />
            <span class="user-role-badge">${user.role === 'ADMIN' ? 'Admin VIP' : 'Miembro VIP'}</span>
          </div>
          <div class="user-main-info">
            <h4 class="user-display-name">${user.name}</h4>
            <p class="user-display-email">${user.email}</p>
            <span class="user-points-pill">🌟 250 Puntos Blessed Club</span>
          </div>
        </div>

        <!-- OPCIONES Y SECCIONES DE LA CUENTA -->
        <div class="user-account-options">
          <div class="account-option-item">
            <div class="option-icon-box">📦</div>
            <div class="option-content">
              <strong>Mis Pedidos</strong>
              <p>2 pedidos realizados recientemente</p>
            </div>
            <span class="option-status-badge">Entregado</span>
          </div>

          <div class="account-option-item">
            <div class="option-icon-box">📍</div>
            <div class="option-content">
              <strong>Dirección de Entrega</strong>
              <p>Av. Las Palmas #123, San Salvador</p>
            </div>
            <span class="option-arrow">${Icons.chevronRight('w-4 h-4')}</span>
          </div>

          <div class="account-option-item">
            <div class="option-icon-box">💳</div>
            <div class="option-content">
              <strong>Métodos de Pago</strong>
              <p>Visa terminada en •••• 4242</p>
            </div>
            <span class="option-arrow">${Icons.chevronRight('w-4 h-4')}</span>
          </div>

          <div class="account-option-item" id="btn-open-promos-from-user">
            <div class="option-icon-box">🎟️</div>
            <div class="option-content">
              <strong>Mis Cupones Guardados</strong>
              <p>${this.store.appliedPromo ? `Activo: ${this.store.appliedPromo.code}` : 'Ver cupones y códigos de descuento'}</p>
            </div>
            <span class="option-arrow">${Icons.chevronRight('w-4 h-4')}</span>
          </div>
        </div>

        <!-- BOTÓN DE CERRAR SESIÓN -->
        <div class="user-logout-wrap">
          <button class="btn btn-outline-danger btn-logout" id="btn-auth-logout">
            ${Icons.logout('w-4 h-4')} Cerrar Sesión
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Vista de Login / Registro cuando no está autenticado
   */
  private renderAuthForms(): string {
    return `
      <!-- TABS DE NAVEGACIÓN (LOGIN / REGISTRO) -->
      <div class="auth-tabs-nav">
        <button class="auth-tab-btn ${this.activeTab === 'login' ? 'is-active' : ''}" id="tab-btn-login">
          Iniciar Sesión
        </button>
        <button class="auth-tab-btn ${this.activeTab === 'register' ? 'is-active' : ''}" id="tab-btn-register">
          Crear Cuenta
        </button>
      </div>

      ${
        this.activeTab === 'login'
          ? `
        <!-- FORMULARIO DE INICIO DE SESIÓN -->
        <form class="auth-form" id="form-login">
          <div class="form-group">
            <label class="form-label" for="login-email">Correo Electrónico</label>
            <input 
              type="email" 
              id="login-email" 
              class="form-input" 
              placeholder="tu@correo.com" 
              value="${this.loginEmail}" 
              required 
            />
          </div>

          <div class="form-group">
            <div class="form-label-row">
              <label class="form-label" for="login-pass">Contraseña</label>
              <a href="#" class="forgot-pass-link" id="link-forgot-pass">¿Olvidaste tu contraseña?</a>
            </div>
            <input 
              type="password" 
              id="login-pass" 
              class="form-input" 
              placeholder="••••••••" 
              value="${this.loginPass}" 
              required 
            />
          </div>

          <button type="submit" class="btn btn-primary btn-auth-submit">
            Ingresar a mi cuenta
          </button>

          <!-- ACCESO RÁPIDO DEMO -->
          <button type="button" class="btn btn-secondary btn-demo-login" id="btn-quick-demo">
            ⚡ Entrar como Usuario Demo
          </button>
        </form>
      `
          : `
        <!-- FORMULARIO DE REGISTRO -->
        <form class="auth-form" id="form-register">
          <div class="form-group">
            <label class="form-label" for="reg-name">Nombre Completo</label>
            <input 
              type="text" 
              id="reg-name" 
              class="form-input" 
              placeholder="Ej. Alexander Garay" 
              value="${this.regName}" 
              required 
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-email">Correo Electrónico</label>
            <input 
              type="email" 
              id="reg-email" 
              class="form-input" 
              placeholder="tu@correo.com" 
              value="${this.regEmail}" 
              required 
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-pass">Contraseña</label>
            <input 
              type="password" 
              id="reg-pass" 
              class="form-input" 
              placeholder="Mínimo 6 caracteres" 
              value="${this.regPass}" 
              required 
            />
          </div>

          <button type="submit" class="btn btn-primary btn-auth-submit">
            Registrarme y Obtener Beneficios
          </button>
        </form>
      `
      }

      <div class="auth-divider">
        <span>o continúa con</span>
      </div>

      <div class="auth-social-row">
        <button class="btn-social" type="button" id="btn-social-google">
          <svg class="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Google
        </button>

        <button class="btn-social" type="button" id="btn-social-apple">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.89c.65-.82 1.1-1.95.97-3.09-.97.04-2.18.66-2.88 1.47-.62.72-1.16 1.88-1.01 2.99 1.1.09 2.23-.55 2.92-1.37z"/>
          </svg>
          Apple
        </button>
      </div>
    `;
  }

  private setupEvents(): void {
    // Cerrar con backdrop o botón X
    this.container.querySelector('#auth-modal-backdrop')?.addEventListener('click', () => {
      this.store.toggleAuth(false);
    });

    this.container.querySelector('#auth-modal-close')?.addEventListener('click', () => {
      this.store.toggleAuth(false);
    });

    // Cambio de pestañas
    this.container.querySelector('#tab-btn-login')?.addEventListener('click', () => {
      this.activeTab = 'login';
      this.render();
    });

    this.container.querySelector('#tab-btn-register')?.addEventListener('click', () => {
      this.activeTab = 'register';
      this.render();
    });

    // Formulario de login
    const formLogin = this.container.querySelector('#form-login');
    formLogin?.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = this.container.querySelector('#login-email') as HTMLInputElement | null;
      const email = emailInput?.value.trim() || 'usuario@blessed.com';
      this.store.login(email);
      Toast.show(`¡Bienvenido de nuevo, ${this.store.currentUser?.name}!`);
    });

    // Formulario de registro
    const formReg = this.container.querySelector('#form-register');
    formReg?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = this.container.querySelector('#reg-name') as HTMLInputElement | null;
      const emailInput = this.container.querySelector('#reg-email') as HTMLInputElement | null;
      const name = nameInput?.value.trim() || 'Nuevo Cliente';
      const email = emailInput?.value.trim() || 'cliente@blessed.com';
      this.store.login(email, name);
      Toast.show(`¡Cuenta creada con éxito! Bienvenido a Blessed, ${name}.`);
    });

    // Botón Demo Login
    this.container.querySelector('#btn-quick-demo')?.addEventListener('click', () => {
      this.store.login('alexander@blessed.com', 'Alexander Garay', 'ADMIN');
      Toast.show('Sesión iniciada con la cuenta Demo.');
    });

    // Botones sociales
    this.container.querySelector('#btn-social-google')?.addEventListener('click', () => {
      this.store.login('alexander.garay@gmail.com', 'Alexander Garay');
      Toast.show('Conectado con cuenta de Google.');
    });

    this.container.querySelector('#btn-social-apple')?.addEventListener('click', () => {
      this.store.login('alexander.apple@icloud.com', 'Alexander Garay');
      Toast.show('Conectado con Apple ID.');
    });

    // Cerrar sesión
    this.container.querySelector('#btn-auth-logout')?.addEventListener('click', () => {
      this.store.logout();
      Toast.show('Sesión cerrada correctamente.');
    });

    // Abrir cupones desde el menú de usuario
    this.container.querySelector('#btn-open-promos-from-user')?.addEventListener('click', () => {
      this.store.toggleAuth(false);
      this.store.togglePromo(true);
    });

    // Olvidó contraseña
    this.container.querySelector('#link-forgot-pass')?.addEventListener('click', (e) => {
      e.preventDefault();
      Toast.show('Enlace de recuperación enviado al correo.');
    });
  }
}
