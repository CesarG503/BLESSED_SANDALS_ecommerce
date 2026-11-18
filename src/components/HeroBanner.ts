import { Store } from '../state/store';
import { Icons } from './Icons';

export class HeroBanner {
  private container: HTMLElement;
  private store: Store;

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;
    this.render();
    this.setupEvents();
  }

  private render(): void {
    this.container.innerHTML = `
      <section class="hero-section">
        <div class="hero-container container">
          <div class="hero-content">
            <div class="hero-badge animate-fade-in">
              <span class="badge-dot"></span> NUEVA COLECCIÓN 2026
            </div>
            
            <h1 class="hero-title animate-slide-up">
              EL EQUILIBRIO ENTRE <br />
              <span class="hero-highlight">LUJO, CONFORT</span> Y CALLE
            </h1>

            <p class="hero-description animate-slide-up delay-1">
              Diseño artesanal de sandalias exclusivas y las siluetas de calzado más codiciadas del mundo. Cada paso respaldado por la calidad inquebrantable de <strong>BLESSED SANDALS</strong>.
            </p>

            <div class="hero-actions animate-slide-up delay-2">
              <button class="btn btn-primary" id="hero-btn-sandals">
                Ver Sandalias Blessed ${Icons.arrowRight('w-4 h-4')}
              </button>
              <button class="btn btn-outline" id="hero-btn-shoes">
                Colección Jordan
              </button>
            </div>

            <div class="hero-features animate-fade-in delay-3">
              <div class="hero-feat-item">
                <span class="feat-icon">👟</span>
                <div>
                  <strong>Autenticidad</strong>
                  <p>100% Garantizada</p>
                </div>
              </div>
              <div class="hero-feat-item">
                <span class="feat-icon">⚡</span>
                <div>
                  <strong>Entrega Rápida</strong>
                  <p>24 a 48 Horas</p>
                </div>
              </div>
              <div class="hero-feat-item">
                <span class="feat-icon">✨</span>
                <div>
                  <strong>Materiales Top</strong>
                  <p>Cuero & Espuma Cloud</p>
                </div>
              </div>
            </div>
          </div>

          <div class="hero-visual animate-scale-in">
            <div class="hero-card-glow"></div>
            <div class="hero-image-wrapper" id="hero-image-tilt">
              <img src="/assets/slide/slide.png" alt="Blessed Slide Sandal" class="hero-main-img" />
              <div class="hero-floating-badge badge-top-right">
                <span class="badge-tag">EXCLUSIVO</span>
                <span class="badge-sub">Blessed Slide Gold Edition</span>
              </div>
              <div class="hero-floating-badge badge-bottom-left">
                <span class="badge-price">$65.00</span>
                <span class="badge-sub">Envío Gratis</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  private setupEvents(): void {
    this.container.querySelector('#hero-btn-sandals')?.addEventListener('click', () => {
      this.store.setFilter('category', 'sandals');
      document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    this.container.querySelector('#hero-btn-shoes')?.addEventListener('click', () => {
      this.store.setFilter('category', 'shoes');
      document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Efecto 3D Tilt interactivo al mover el cursor en la imagen hero
    const tiltWrapper = this.container.querySelector('#hero-image-tilt') as HTMLElement | null;
    if (tiltWrapper) {
      tiltWrapper.addEventListener('mousemove', (e) => {
        const rect = tiltWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const rotateX = -(y / 20);
        const rotateY = x / 20;
        tiltWrapper.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
      });

      tiltWrapper.addEventListener('mouseleave', () => {
        tiltWrapper.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
      });
    }
  }
}
