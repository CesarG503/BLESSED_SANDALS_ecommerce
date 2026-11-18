import { Store } from '../state/store';
import { Icons } from './Icons';

export class SearchModal {
  private container: HTMLElement;
  private store: Store;
  private searchTerm: string = '';

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.store.subscribe(() => this.render());
    this.setupGlobalShortcuts();
  }

  public render(): void {
    const isOpen = this.store.isSearchOpen;

    if (isOpen) {
      this.container.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    } else {
      this.container.classList.remove('is-open');
      document.body.style.overflow = '';
      return;
    }

    const results = this.searchTerm.trim()
      ? this.store.products.filter(
          (p) =>
            p.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            p.subtitle.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            p.category.toLowerCase().includes(this.searchTerm.toLowerCase())
        )
      : this.store.products.slice(0, 4);

    this.container.innerHTML = `
      <div class="search-backdrop" id="search-modal-backdrop"></div>
      <div class="search-modal-panel animate-scale-up" role="dialog" aria-modal="true">
        <div class="search-input-wrapper">
          <span class="search-input-icon">${Icons.search('w-6 h-6')}</span>
          <input 
            type="text" 
            id="search-live-input" 
            class="search-live-input" 
            placeholder="Buscar por modelo, estilo o color... (ej. Jordan 1, Sandalias)" 
            value="${this.searchTerm}" 
            autofocus 
          />
          <button class="search-close-btn" id="search-modal-close" aria-label="Cerrar búsqueda">
            ${Icons.close('w-6 h-6')}
          </button>
        </div>

        <!-- ETIQUETAS DE BÚSQUEDA RÁPIDA -->
        <div class="search-quick-tags">
          <span class="tag-label">Búsquedas populares:</span>
          <button class="quick-chip" data-query="Sandalias">Sandalias Blessed</button>
          <button class="quick-chip" data-query="Jordan 1">Jordan 1</button>
          <button class="quick-chip" data-query="Jordan 11">Jordan 11</button>
          <button class="quick-chip" data-query="Retro">Retro</button>
        </div>

        <!-- RESULTADOS EN TIEMPO REAL -->
        <div class="search-results-area">
          <h4 class="results-heading">
            ${this.searchTerm.trim() ? `Resultados (${results.length})` : 'Sugerencias para ti'}
          </h4>

          <div class="search-results-grid">
            ${
              results.length === 0
                ? `<p class="no-results-msg">No encontramos productos con "${this.searchTerm}". Intenta con otro término.</p>`
                : results
                    .map(
                      (p) => `
                <div class="search-result-card" data-id="${p.id}">
                  <img src="${p.image}" alt="${p.name}" class="result-card-img" />
                  <div class="result-card-info">
                    <h5>${p.name}</h5>
                    <p>${p.subtitle}</p>
                    <span class="result-price">$${p.price}</span>
                  </div>
                </div>
              `
                    )
                    .join('')
            }
          </div>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  private setupEvents(): void {
    const backdrop = this.container.querySelector('#search-modal-backdrop');
    const closeBtn = this.container.querySelector('#search-modal-close');
    const close = () => {
      this.store.toggleSearch(false);
      this.searchTerm = '';
    };

    backdrop?.addEventListener('click', close);
    closeBtn?.addEventListener('click', close);

    const input = this.container.querySelector('#search-live-input') as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      input.addEventListener('input', (e) => {
        this.searchTerm = (e.target as HTMLInputElement).value;
        this.render();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
      });
    }

    // Chips de sugerencia rápida
    this.container.querySelectorAll('.quick-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const query = (chip as HTMLElement).dataset.query || '';
        this.searchTerm = query;
        this.render();
      });
    });

    // Clic en resultado
    this.container.querySelectorAll('.search-result-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = (card as HTMLElement).dataset.id;
        const prod = this.store.products.find((p) => p.id === id);
        if (prod) {
          close();
          this.store.openQuickView(prod);
        }
      });
    });
  }

  private setupGlobalShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.store.toggleSearch();
      }
      if (e.key === 'Escape' && this.store.isSearchOpen) {
        this.store.toggleSearch(false);
      }
    });
  }
}
