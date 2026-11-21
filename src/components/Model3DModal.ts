import { Store } from '../state/store';
import { Icons } from './Icons';

export class Model3DModal {
  private container: HTMLElement;
  private store: Store;

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.store.subscribe(() => this.render());
  }

  public render(): void {
    const product = this.store.active3DProduct;
    if (!product) {
      this.container.innerHTML = '';
      this.container.classList.remove('is-active');
      return;
    }

    this.container.classList.add('is-active');
    this.container.innerHTML = `
      <div class="modal-backdrop" id="modal3d-backdrop"></div>
      <div class="modal-dialog modal-3d-dialog animate-scale-up" role="dialog" aria-modal="true">
        <button class="modal-close-btn" id="modal3d-close-btn" aria-label="Cerrar vista 3D">
          ${Icons.close('w-6 h-6')}
        </button>

        <div class="modal-3d-header">
          <div>
            <h3>${product.name} — Experiencia Interactiva 3D</h3>
            <p>Arrastra para rotar 360°, usa la rueda para hacer zoom o explora cada detalle.</p>
          </div>
          <span class="badge-3d-live">Modelo 3D Oficial GLB</span>
        </div>

        <div class="modal-3d-viewport">
          <model-viewer
            src="${product.model3dUrl || '/assets/modelos/Nike Air Jordan 1.glb'}"
            alt="${product.name} en 3D"
            auto-rotate
            camera-controls
            ar
            shadow-intensity="1.5"
            exposure="1"
            style="width: 100%; height: 500px; background-color: #f7f7f8; border-radius: 12px;"
          >
            <div class="progress-bar-3d" slot="progress-bar">
              <div class="update-bar"></div>
            </div>
          </model-viewer>
        </div>

        <div class="modal-3d-footer">
          <div class="hint-pill">
            <span>🖱️ Clic izquierdo y arrastrar para rotar</span>
          </div>
          <div class="hint-pill">
            <span>🔍 Rueda del ratón para acercar / alejar</span>
          </div>
          <button class="btn btn-primary" id="btn-3d-add-cart">
            Añadir a la Bolsa ($${product.price})
          </button>
        </div>
      </div>
    `;

    this.setupEvents(product);
  }

  private setupEvents(product: import('../types/product').Product): void {
    const closeBtn = this.container.querySelector('#modal3d-close-btn');
    const backdrop = this.container.querySelector('#modal3d-backdrop');
    const close = () => this.store.close3DViewer();

    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);

    this.container.querySelector('#btn-3d-add-cart')?.addEventListener('click', () => {
      const defaultSize = (Array.isArray(product.sizes) && product.sizes[0]) || 40;
      this.store.addToCart(product, defaultSize);
      this.store.close3DViewer();
      this.store.toggleCart(true);
    });
  }
}
