import { Store } from '../state/store';
import { Icons } from './Icons';
import { ProductGender, ShoeHeight, ProductCategory } from '../types/product';

export class FilterSidebar {
  private container: HTMLElement;
  private store: Store;

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.store.subscribe(() => this.syncUI());
    this.render();
    this.setupEvents();
  }

  private render(): void {
    const filters = this.store.filters;

    this.container.innerHTML = `
      <aside class="filters-sidebar" id="filters-sidebar">
        <div class="filters-header">
          <h3 class="filters-heading">Filtros</h3>
          <button class="btn-text-link" id="reset-filters-btn">Limpiar todo</button>
        </div>

        <!-- ACORDEÓN: TIPO DE PRODUCTO -->
        <div class="filter-group open" data-group="category">
          <div class="filter-group-header">
            <span class="group-title">TIPO DE PRODUCTO</span>
            <span class="group-arrow">${Icons.chevronDown()}</span>
          </div>
          <div class="filter-group-body">
            <label class="custom-radio">
              <input type="radio" name="filter-category" value="all" ${filters.category === 'all' ? 'checked' : ''} />
              <span class="radio-label">Todos los productos</span>
            </label>
            <label class="custom-radio">
              <input type="radio" name="filter-category" value="shoes" ${filters.category === 'shoes' ? 'checked' : ''} />
              <span class="radio-label">Zapatillas Jordan</span>
            </label>
            <label class="custom-radio">
              <input type="radio" name="filter-category" value="sandals" ${filters.category === 'sandals' ? 'checked' : ''} />
              <span class="radio-label">Sandalias Blessed</span>
            </label>
          </div>
        </div>

        <!-- ACORDEÓN: GÉNERO -->
        <div class="filter-group open" data-group="gender">
          <div class="filter-group-header">
            <span class="group-title">GÉNERO</span>
            <span class="group-arrow">${Icons.chevronDown()}</span>
          </div>
          <div class="filter-group-body">
            <label class="custom-checkbox">
              <input type="checkbox" name="filter-gender" value="Hombre" ${filters.genders.includes('Hombre') ? 'checked' : ''} />
              <span class="checkbox-indicator"></span>
              <span class="checkbox-label">Hombre</span>
            </label>
            <label class="custom-checkbox">
              <input type="checkbox" name="filter-gender" value="Mujer" ${filters.genders.includes('Mujer') ? 'checked' : ''} />
              <span class="checkbox-indicator"></span>
              <span class="checkbox-label">Mujer</span>
            </label>
            <label class="custom-checkbox">
              <input type="checkbox" name="filter-gender" value="Unisex" ${filters.genders.includes('Unisex') ? 'checked' : ''} />
              <span class="checkbox-indicator"></span>
              <span class="checkbox-label">Unisex</span>
            </label>
          </div>
        </div>

        <!-- ACORDEÓN: TALLA -->
        <div class="filter-group open" data-group="size">
          <div class="filter-group-header">
            <span class="group-title">TALLA (EU)</span>
            <span class="group-arrow">${Icons.chevronDown()}</span>
          </div>
          <div class="filter-group-body">
            <div class="sizes-grid">
              ${[36, 37, 38, 39, 40, 41, 42, 43, 44, 45].map(
                (size) => `
                <button type="button" class="size-pill ${filters.sizes.includes(size) ? 'is-selected' : ''}" data-size="${size}">
                  ${size}
                </button>
              `
              ).join('')}
            </div>
          </div>
        </div>

        <!-- ACORDEÓN: PRECIO -->
        <div class="filter-group open" data-group="price">
          <div class="filter-group-header">
            <span class="group-title">RANGO DE PRECIO</span>
            <span class="group-arrow">${Icons.chevronDown()}</span>
          </div>
          <div class="filter-group-body">
            <div class="price-slider-wrap">
              <div class="price-labels">
                <span>$0</span>
                <span id="price-slider-val">$${filters.maxPrice}</span>
              </div>
              <input type="range" id="price-range-input" min="30" max="300" step="5" value="${filters.maxPrice}" class="range-slider" />
            </div>
          </div>
        </div>

        <!-- ACORDEÓN: ALTURA DEL CALZADO -->
        <div class="filter-group open" data-group="height">
          <div class="filter-group-header">
            <span class="group-title">ALTURA DEL CALZADO</span>
            <span class="group-arrow">${Icons.chevronDown()}</span>
          </div>
          <div class="filter-group-body">
            ${(['Alta', 'Media', 'Baja'] as ShoeHeight[]).map(
              (h) => `
              <label class="custom-checkbox">
                <input type="checkbox" name="filter-height" value="${h}" ${filters.heights.includes(h) ? 'checked' : ''} />
                <span class="checkbox-indicator"></span>
                <span class="checkbox-label">${h} (${h === 'Alta' ? 'High' : h === 'Media' ? 'Mid' : 'Low'})</span>
              </label>
            `
            ).join('')}
          </div>
        </div>

        <!-- ACORDEÓN: TECNOLOGÍA & MATERIALES -->
        <div class="filter-group" data-group="tech">
          <div class="filter-group-header">
            <span class="group-title">TECNOLOGÍA</span>
            <span class="group-arrow">${Icons.chevronDown()}</span>
          </div>
          <div class="filter-group-body">
            <label class="custom-checkbox">
              <input type="checkbox" checked disabled />
              <span class="checkbox-indicator"></span>
              <span class="checkbox-label">Nike Air / Encapsulada</span>
            </label>
            <label class="custom-checkbox">
              <input type="checkbox" checked disabled />
              <span class="checkbox-indicator"></span>
              <span class="checkbox-label">CloudFoam Anatómica Blessed</span>
            </label>
            <label class="custom-checkbox">
              <input type="checkbox" checked disabled />
              <span class="checkbox-indicator"></span>
              <span class="checkbox-label">Cuero Premium / Piel Nobuk</span>
            </label>
          </div>
        </div>
      </aside>
    `;
  }

  private setupEvents(): void {
    // Colapso/expansión de acordeones
    const headers = this.container.querySelectorAll('.filter-group-header');
    headers.forEach((h) => {
      h.addEventListener('click', () => {
        const parent = h.closest('.filter-group');
        parent?.classList.toggle('open');
      });
    });

    // Filtro Categoría (Radios)
    this.container.querySelectorAll('input[name="filter-category"]').forEach((input) => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.store.setFilter('category', target.value as ProductCategory);
      });
    });

    // Filtro Género (Checkboxes)
    this.container.querySelectorAll('input[name="filter-gender"]').forEach((input) => {
      input.addEventListener('change', () => {
        const checkedGenders: ProductGender[] = [];
        this.container.querySelectorAll('input[name="filter-gender"]:checked').forEach((ch) => {
          checkedGenders.push((ch as HTMLInputElement).value as ProductGender);
        });
        this.store.setFilter('genders', checkedGenders);
      });
    });

    // Filtro Talla
    this.container.querySelectorAll('.size-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = parseInt((btn as HTMLElement).dataset.size || '0', 10);
        let newSizes = [...this.store.filters.sizes];
        if (newSizes.includes(size)) {
          newSizes = newSizes.filter((s) => s !== size);
          btn.classList.remove('is-selected');
        } else {
          newSizes.push(size);
          btn.classList.add('is-selected');
        }
        this.store.setFilter('sizes', newSizes);
      });
    });

    // Filtro Precio
    const priceInput = this.container.querySelector('#price-range-input') as HTMLInputElement | null;
    const priceLabel = this.container.querySelector('#price-slider-val');
    if (priceInput && priceLabel) {
      priceInput.addEventListener('input', () => {
        priceLabel.textContent = `$${priceInput.value}`;
      });
      priceInput.addEventListener('change', () => {
        this.store.setFilter('maxPrice', parseFloat(priceInput.value));
      });
    }

    // Filtro Altura
    this.container.querySelectorAll('input[name="filter-height"]').forEach((input) => {
      input.addEventListener('change', () => {
        const checkedHeights: ShoeHeight[] = [];
        this.container.querySelectorAll('input[name="filter-height"]:checked').forEach((ch) => {
          checkedHeights.push((ch as HTMLInputElement).value as ShoeHeight);
        });
        this.store.setFilter('heights', checkedHeights);
      });
    });

    // Botón Limpiar Todo
    this.container.querySelector('#reset-filters-btn')?.addEventListener('click', () => {
      this.store.resetFilters();
    });
  }

  private syncUI(): void {
    const filters = this.store.filters;

    // Sincronizar radio categoría
    const activeRadio = this.container.querySelector(
      `input[name="filter-category"][value="${filters.category}"]`
    ) as HTMLInputElement | null;
    if (activeRadio) activeRadio.checked = true;

    // Sincronizar checkboxes de género
    this.container.querySelectorAll('input[name="filter-gender"]').forEach((input) => {
      const el = input as HTMLInputElement;
      el.checked = filters.genders.includes(el.value as ProductGender);
    });

    // Sincronizar botones de talla
    this.container.querySelectorAll('.size-pill').forEach((btn) => {
      const size = parseInt((btn as HTMLElement).dataset.size || '0', 10);
      if (filters.sizes.includes(size)) {
        btn.classList.add('is-selected');
      } else {
        btn.classList.remove('is-selected');
      }
    });

    // Sincronizar slider de precio
    const priceInput = this.container.querySelector('#price-range-input') as HTMLInputElement | null;
    const priceLabel = this.container.querySelector('#price-slider-val');
    if (priceInput && priceLabel) {
      priceInput.value = filters.maxPrice.toString();
      priceLabel.textContent = `$${filters.maxPrice}`;
    }
  }
}
