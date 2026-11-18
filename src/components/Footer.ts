import { Icons } from './Icons';
import { Toast } from './Toast';

export class Footer {
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;
    this.render();
    this.setupEvents();
  }

  private render(): void {
    this.container.innerHTML = `
      <footer class="site-footer">
        <div class="footer-top container">
          <div class="footer-grid">
            
            <!-- COLUMNA 1: MARCA Y PROPÓSITO -->
            <div class="footer-col brand-col">
              <div class="footer-logo-wrap">
                <img src="/assets/logo/Logotipo_dark.png" alt="Blessed Sandals Logo" class="footer-logo-img" />
              </div>
              <p class="footer-brand-desc">
                Definiendo el confort contemporáneo y el estilo urbano. Calzado de calidad premium elaborado con los más altos estándares de diseño y artesanía.
              </p>
              <div class="footer-social-links">
                <a href="#" class="social-icon" aria-label="Instagram">Instagram</a>
                <a href="#" class="social-icon" aria-label="TikTok">TikTok</a>
                <a href="#" class="social-icon" aria-label="Facebook">Facebook</a>
                <a href="#" class="social-icon" aria-label="YouTube">YouTube</a>
              </div>
            </div>

            <!-- COLUMNA 2: ACERCA DE NOSOTROS -->
            <div class="footer-col">
              <h4 class="footer-heading">ACERCA DE NOSOTROS</h4>
              <ul class="footer-links-list">
                <li><a href="#">Nuestra Historia</a></li>
                <li><a href="#">Noticias & Lanzamientos</a></li>
                <li><a href="#">Carreras y Talento</a></li>
                <li><a href="#">Sostenibilidad</a></li>
                <li><a href="#">Propósito de Marca</a></li>
              </ul>
            </div>

            <!-- COLUMNA 3: AYUDA Y ASISTENCIA -->
            <div class="footer-col">
              <h4 class="footer-heading">AYUDA</h4>
              <ul class="footer-links-list">
                <li><a href="#">Estado del Pedido</a></li>
                <li><a href="#">Envíos y Entregas</a></li>
                <li><a href="#">Devoluciones</a></li>
                <li><a href="#">Guía de Tallas</a></li>
                <li><a href="#">Contáctanos</a></li>
              </ul>
            </div>

            <!-- COLUMNA 4: NEWSLETTER (BE THE FIRST TO KNOW) -->
            <div class="footer-col newsletter-col">
              <h4 class="footer-heading">SÉ EL PRIMERO EN ENTERARTE</h4>
              <p class="newsletter-sub">
                Suscríbete para recibir lanzamientos exclusivos de Blessed Sandals y zapatillas Jordan antes que nadie.
              </p>
              
              <form class="newsletter-form" id="newsletter-form">
                <div class="newsletter-input-group">
                  <input 
                    type="email" 
                    id="newsletter-email" 
                    class="newsletter-input" 
                    placeholder="Tu correo electrónico" 
                    required 
                  />
                  <button type="submit" class="newsletter-submit-btn" aria-label="Suscribirse">
                    ${Icons.arrowRight('w-5 h-5')}
                  </button>
                </div>
              </form>
              <p class="newsletter-disclaimer">
                Al suscribirte aceptas nuestras Políticas de Privacidad y Términos de Servicio.
              </p>
            </div>

          </div>
        </div>

        <!-- BARRA INFERIOR DE DERECHOS -->
        <div class="footer-bottom">
          <div class="container footer-bottom-inner">
            <p class="copyright-text">
              © 2026 BLESSED SANDALS. Todos los derechos reservados.
            </p>
            <div class="legal-links">
              <a href="#">Términos de Venta</a>
              <a href="#">Términos de Uso</a>
              <a href="#">Política de Privacidad</a>
            </div>
          </div>
        </div>
      </footer>
    `;
  }

  private setupEvents(): void {
    const form = this.container.querySelector('#newsletter-form') as HTMLFormElement | null;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = this.container.querySelector('#newsletter-email') as HTMLInputElement | null;
      if (input && input.value) {
        Toast.show(`¡Gracias por unirte! Te hemos enviado una confirmación a ${input.value}`, 'Suscripción Exitosa', 'success');
        input.value = '';
      }
    });
  }
}
