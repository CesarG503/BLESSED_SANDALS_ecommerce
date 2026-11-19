import { Store } from '../state/store';
import { Icons } from './Icons';

export class Header {
  private store: Store;
  private container: HTMLElement;

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.store.subscribe(() => this.updateBadges());
    this.render();
    this.setupEvents();
    this.setupScrollEffect();
  }

  private render(): void {
    const cartCount = this.store.getCartCount();
    const wishlistCount = this.store.wishlist.length;

    this.container.innerHTML = `
      <!-- BARRA DE ANUNCIOS SUPERIOR EN BUCLE INFINITO -->
      <div class="top-announcement-bar" aria-label="Promociones y Envíos">
        <div class="announcement-marquee">
          <div class="marquee-track">
            <span class="marquee-item">✨ ENVÍO GRATIS EN PEDIDOS SUPERIORES A $50 • DEVOLUCIONES GRATUITAS EN 30 DÍAS</span>
            <span class="marquee-sep">•</span>
            <span class="marquee-item">🔥 NUEVA COLECCIÓN BLESSED SANDALS 2026 DISPONIBLE</span>
            <span class="marquee-sep">•</span>
            <span class="marquee-item">✨ ENVÍO GRATIS EN PEDIDOS SUPERIORES A $50 • DEVOLUCIONES GRATUITAS EN 30 DÍAS</span>
            <span class="marquee-sep">•</span>
            <span class="marquee-item">⚡ 10% DE DESCUENTO CON EL CÓDIGO BLESSED10</span>
            <span class="marquee-sep">•</span>
            <span class="marquee-item">✨ ENVÍO GRATIS EN PEDIDOS SUPERIORES A $50 • DEVOLUCIONES GRATUITAS EN 30 DÍAS</span>
            <span class="marquee-sep">•</span>
            <span class="marquee-item">🔥 NUEVA COLECCIÓN BLESSED SANDALS 2026 DISPONIBLE</span>
            <span class="marquee-sep">•</span>
            <span class="marquee-item">✨ ENVÍO GRATIS EN PEDIDOS SUPERIORES A $50 • DEVOLUCIONES GRATUITAS EN 30 DÍAS</span>
            <span class="marquee-sep">•</span>
            <span class="marquee-item">⚡ 10% DE DESCUENTO CON EL CÓDIGO BLESSED10</span>
            <span class="marquee-sep">•</span>
          </div>
        </div>
      </div>

      <!-- NAVBAR PRINCIPAL FIJO -->
      <header class="main-header" id="site-header">
        <div class="header-inner container">

          <!-- LOGOTIPO MINIMALISTA ELEGANTE (SIN ISOLOGO DESPROPORCIONADO) -->
          <a href="#" class="brand-logo" id="brand-home-link" aria-label="Blessed Sandals Inicio">
            <div class="brand-text-wrap">
              <span class="brand-title">BLESSED</span>
              <span class="brand-subtitle">SANDALS</span>
            </div>
          </a>

          <!-- ENLACES DE NAVEGACIÓN PRINCIPAL -->
          <nav class="main-nav" id="main-navigation" aria-label="Navegación principal">
            <ul class="nav-list">
              <li class="nav-item">
                <a href="#catalog" class="nav-link active" data-category="all">NOVEDADES</a>
              </li>
              <li class="nav-item">
                <a href="#catalog" class="nav-link" data-category="sandals">SANDALIAS</a>
              </li>
              <li class="nav-item">
                <a href="#catalog" class="nav-link" data-category="shoes">ZAPATILLAS</a>
              </li>
              <li class="nav-item">
                <a href="#catalog" class="nav-link" data-gender="Hombre">HOMBRE</a>
              </li>
              <li class="nav-item">
                <a href="#catalog" class="nav-link" data-gender="Mujer">MUJER</a>
              </li>
              <li class="nav-item">
                <a href="#catalog" class="nav-link nav-link-special" data-badge="MÁS VENDIDO">OFERTAS</a>
              </li>
            </ul>
          </nav>

          <!-- ACCIONES DE CABECERA (ICONOS MÁS PEQUEÑOS Y REFINADOS) -->
          <div class="header-actions">
            <!-- BUSCADOR -->
            <button class="action-btn" id="header-search-btn" title="Buscar productos" aria-label="Buscar">
              ${Icons.search('w-4 h-4')}
            </button>

            <!-- CÓDIGOS PROMOCIONALES / CUPONES (ENTRE LUPA Y CORAZÓN) -->
            <button class="action-btn promo-btn ${this.store.appliedPromo ? 'is-active' : ''}" id="header-promo-btn" title="${this.store.appliedPromo ? 'Cupón activo: ' + this.store.appliedPromo.code : 'Colocar código promocional'}" aria-label="Código promocional">
              ${Icons.ticket('w-4 h-4')}
              <span class="badge promo-badge ${this.store.appliedPromo ? 'is-visible' : ''}" id="promo-counter">
                %
              </span>
            </button>

            <!-- FAVORITOS / WISHLIST -->
            <button class="action-btn" id="header-wishlist-btn" title="Favoritos" aria-label="Lista de deseos">
              ${Icons.heart('w-4 h-4')}
              <span class="badge wishlist-badge ${wishlistCount > 0 ? 'is-visible' : ''}" id="wishlist-counter">
                ${wishlistCount}
              </span>
            </button>

            <!-- BOLSA DE COMPRAS -->
            <button class="action-btn cart-btn" id="header-cart-btn" title="Bolsa de compras" aria-label="Bolsa de compras">
              ${Icons.bag('w-4 h-4')}
              <span class="badge cart-badge ${cartCount > 0 ? 'is-visible' : ''}" id="cart-counter">
                ${cartCount}
              </span>
            </button>

            <!-- USUARIO / LOGIN / PERFIL (AL FINAL) -->
            <button class="action-btn user-btn ${this.store.currentUser ? 'is-authenticated' : ''}" id="header-user-btn" title="${this.store.currentUser ? 'Mi perfil (' + this.store.currentUser.name + ')' : 'Iniciar sesión / Mi cuenta'}" aria-label="Cuenta de usuario">
              ${Icons.user('w-4 h-4')}
              <span class="user-status-dot ${this.store.currentUser ? 'is-online' : ''}" id="user-status-dot"></span>
            </button>
          </div>
        </div>
      </header>
    `;
  }

  private setupEvents(): void {
    // Carrito
    this.container.querySelector('#header-cart-btn')?.addEventListener('click', () => {
      this.store.toggleCart(true);
    });

    // Códigos Promocionales / Cupones (entre lupa y corazón)
    this.container.querySelector('#header-promo-btn')?.addEventListener('click', () => {
      this.store.togglePromo(true);
    });

    // Wishlist
    this.container.querySelector('#header-wishlist-btn')?.addEventListener('click', () => {
      this.store.toggleWishlistDrawer(true);
    });

    // Búsqueda
    this.container.querySelector('#header-search-btn')?.addEventListener('click', () => {
      this.store.toggleSearch(true);
    });

    // Usuario / Login / Perfil (al final)
    this.container.querySelector('#header-user-btn')?.addEventListener('click', () => {
      this.store.toggleAuth(true);
    });

    // Filtros de navegación
    const navLinks = this.container.querySelectorAll('.nav-link');
    navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navLinks.forEach((l) => l.classList.remove('active'));
        (link as HTMLElement).classList.add('active');

        const category = (link as HTMLElement).dataset.category;
        const gender = (link as HTMLElement).dataset.gender;

        if (category) {
          this.store.setFilter('category', category as any);
        }
        if (gender) {
          this.store.setFilter('genders', [gender as any]);
        }

        // Scroll suave al catálogo
        const catalogEl = document.getElementById('catalog-section');
        if (catalogEl) {
          catalogEl.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Logo click resetea filtros y sube
    this.container.querySelector('#brand-home-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.store.resetFilters();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  private updateBadges(): void {
    const cartCount = this.store.getCartCount();
    const wishlistCount = this.store.wishlist.length;
    const hasPromo = !!this.store.appliedPromo;
    const user = this.store.currentUser;

    const cartCounter = this.container.querySelector('#cart-counter');
    if (cartCounter) {
      cartCounter.textContent = cartCount.toString();
      if (cartCount > 0) {
        cartCounter.classList.add('is-visible', 'badge-pulse');
        setTimeout(() => cartCounter.classList.remove('badge-pulse'), 400);
      } else {
        cartCounter.classList.remove('is-visible');
      }
    }

    const wishlistCounter = this.container.querySelector('#wishlist-counter');
    if (wishlistCounter) {
      wishlistCounter.textContent = wishlistCount.toString();
      if (wishlistCount > 0) {
        wishlistCounter.classList.add('is-visible');
      } else {
        wishlistCounter.classList.remove('is-visible');
      }
    }

    const promoCounter = this.container.querySelector('#promo-counter');
    const promoBtn = this.container.querySelector('#header-promo-btn');
    if (promoCounter && promoBtn) {
      if (hasPromo) {
        promoCounter.classList.add('is-visible');
        promoBtn.classList.add('is-active');
        promoBtn.setAttribute('title', `Cupón activo: ${this.store.appliedPromo?.code}`);
      } else {
        promoCounter.classList.remove('is-visible');
        promoBtn.classList.remove('is-active');
        promoBtn.setAttribute('title', 'Colocar código promocional');
      }
    }

    const userBtn = this.container.querySelector('#header-user-btn');
    const userDot = this.container.querySelector('#user-status-dot');
    if (userBtn && userDot) {
      if (user) {
        userBtn.classList.add('is-authenticated');
        userDot.classList.add('is-online');
        userBtn.setAttribute('title', `Mi perfil (${user.name})`);
      } else {
        userBtn.classList.remove('is-authenticated');
        userDot.classList.remove('is-online');
        userBtn.setAttribute('title', 'Iniciar sesión / Mi cuenta');
      }
    }
  }

  private setupScrollEffect(): void {
    window.addEventListener('scroll', () => {
      const header = document.getElementById('site-header');
      if (header) {
        if (window.scrollY > 10) {
          header.classList.add('is-scrolled');
        } else {
          header.classList.remove('is-scrolled');
        }
      }
    });
  }
}
