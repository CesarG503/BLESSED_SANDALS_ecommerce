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
      <!-- BARRA DE ANUNCIOS SUPERIOR -->
      <div class="top-announcement-bar">
        <div class="announcement-slider">
          <span class="announcement-item">✨ ENVÍO GRATIS EN PEDIDOS SUPERIORES A $50 • DEVOLUCIONES GRATUITAS EN 30 DÍAS</span>
        </div>
      </div>

      <!-- NAVBAR PRINCIPAL -->
      <header class="main-header" id="site-header">
        <div class="header-inner container">
          
          <!-- BOTÓN HAMBURGUESA (MÓVIL) -->
          <button class="mobile-menu-btn" id="mobile-menu-toggle" aria-label="Abrir menú">
            ${Icons.menu('w-6 h-6')}
          </button>

          <!-- LOGOTIPO DE LA TIENDA -->
          <a href="#" class="brand-logo" id="brand-home-link">
            <img src="/assets/logo/Imagotipo_alpha.png" alt="BLESSED SANDALS" class="logo-image" />
            <div class="brand-text-fallback">
              <span class="brand-title">BLESSED</span>
              <span class="brand-subtitle">SANDALS</span>
            </div>
          </a>

          <!-- ENLACES DE NAVEGACIÓN PRINCIPAL -->
          <nav class="main-nav" id="main-navigation">
            <ul class="nav-list">
              <li class="nav-item">
                <a href="#catalog" class="nav-link active" data-category="all">TODO EL CALZADO</a>
              </li>
              <li class="nav-item">
                <a href="#catalog" class="nav-link" data-category="sandals">SANDALIAS</a>
              </li>
              <li class="nav-item">
                <a href="#catalog" class="nav-link" data-category="shoes">ZAPATILLAS JORDAN</a>
              </li>
              <li class="nav-item">
                <a href="#catalog" class="nav-link" data-gender="Hombre">HOMBRE</a>
              </li>
              <li class="nav-item">
                <a href="#catalog" class="nav-link" data-gender="Mujer">MUJER</a>
              </li>
              <li class="nav-item">
                <a href="#catalog" class="nav-link nav-link-special" data-badge="MÁS VENDIDO">DESTACADOS</a>
              </li>
            </ul>
          </nav>

          <!-- ACCIONES DE CABECERA (BÚSQUEDA, FAVORITOS, CARRITO) -->
          <div class="header-actions">
            <!-- BUSCADOR RÁPIDO -->
            <button class="action-btn" id="header-search-btn" title="Buscar productos" aria-label="Buscar">
              ${Icons.search('w-5 h-5')}
            </button>

            <!-- FAVORITOS / WISHLIST -->
            <button class="action-btn" id="header-wishlist-btn" title="Favoritos" aria-label="Lista de deseos">
              ${Icons.heart('w-5 h-5')}
              <span class="badge wishlist-badge ${wishlistCount > 0 ? 'is-visible' : ''}" id="wishlist-counter">
                ${wishlistCount}
              </span>
            </button>

            <!-- BOLSA DE COMPRAS -->
            <button class="action-btn cart-btn" id="header-cart-btn" title="Bolsa de compras" aria-label="Bolsa de compras">
              ${Icons.bag('w-5 h-5')}
              <span class="badge cart-badge ${cartCount > 0 ? 'is-visible' : ''}" id="cart-counter">
                ${cartCount}
              </span>
            </button>
          </div>
        </div>

        <!-- MENÚ DESPLEGABLE MÓVIL -->
        <div class="mobile-nav-drawer" id="mobile-nav-drawer">
          <div class="mobile-nav-header">
            <img src="/assets/logo/Isologo.png" alt="Blessed" class="mobile-logo" />
            <button class="mobile-close-btn" id="mobile-nav-close">
              ${Icons.close('w-6 h-6')}
            </button>
          </div>
          <ul class="mobile-nav-list">
            <li><a href="#catalog" class="mobile-nav-link" data-category="all">Todos los Productos</a></li>
            <li><a href="#catalog" class="mobile-nav-link" data-category="sandals">Sandalias Blessed</a></li>
            <li><a href="#catalog" class="mobile-nav-link" data-category="shoes">Colección Jordan</a></li>
            <li><a href="#catalog" class="mobile-nav-link" data-gender="Hombre">Hombre</a></li>
            <li><a href="#catalog" class="mobile-nav-link" data-gender="Mujer">Mujer</a></li>
            <li><a href="#catalog" class="mobile-nav-link" data-gender="Unisex">Unisex</a></li>
          </ul>
        </div>
      </header>
    `;
  }

  private setupEvents(): void {
    // Carrito
    this.container.querySelector('#header-cart-btn')?.addEventListener('click', () => {
      this.store.toggleCart(true);
    });

    // Wishlist
    this.container.querySelector('#header-wishlist-btn')?.addEventListener('click', () => {
      this.store.toggleWishlistDrawer(true);
    });

    // Búsqueda
    this.container.querySelector('#header-search-btn')?.addEventListener('click', () => {
      this.store.toggleSearch(true);
    });

    // Filtros de navegación
    const navLinks = this.container.querySelectorAll('.nav-link, .mobile-nav-link');
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

        // Cerrar menú móvil si está abierto
        this.toggleMobileNav(false);

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

    // Menú móvil
    const mobileToggle = this.container.querySelector('#mobile-menu-toggle');
    const mobileClose = this.container.querySelector('#mobile-nav-close');
    mobileToggle?.addEventListener('click', () => this.toggleMobileNav(true));
    mobileClose?.addEventListener('click', () => this.toggleMobileNav(false));
  }

  private toggleMobileNav(open: boolean): void {
    const drawer = this.container.querySelector('#mobile-nav-drawer');
    if (drawer) {
      if (open) {
        drawer.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      } else {
        drawer.classList.remove('is-open');
        document.body.style.overflow = '';
      }
    }
  }

  private updateBadges(): void {
    const cartCount = this.store.getCartCount();
    const wishlistCount = this.store.wishlist.length;

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
  }

  private setupScrollEffect(): void {
    window.addEventListener('scroll', () => {
      const header = document.getElementById('site-header');
      if (header) {
        if (window.scrollY > 20) {
          header.classList.add('is-scrolled');
        } else {
          header.classList.remove('is-scrolled');
        }
      }
    });
  }
}
