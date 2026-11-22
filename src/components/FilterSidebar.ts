import { Store } from '../state/store';
import { Icons } from './Icons';
import { ProductGender, ShoeHeight, ProductCategory } from '../types/product';
import {
  SizeUnit,
  formatSizeDisplay,
  formatFullEquivalence,
  STANDARD_CHART_SIZES
} from '../utils/sizeConverter';

export class FilterSidebar {
  private container: HTMLElement;
  private store: Store;
  private lastKnownProductsCount: number = 0;

  constructor(containerId: string) {
    this.store = Store.getInstance();
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;

    this.lastKnownProductsCount = this.store.products.length;
    this.store.subscribe(() => this.syncUI());
    this.render();
    this.setupEvents();
  }

  /**
   * Obtiene la lista combinada de tallas canónicas (EU) incluyendo
   * la tabla oficial y cualquier talla personalizada de los productos
   */
  private getAvailableSizes(): number[] {
    const set = new Set<number>(STANDARD_CHART_SIZES);
    if (this.store.products && this.store.products.length > 0) {
      this.store.products.forEach((p) => {
        if (p.sizes && Array.isArray(p.sizes)) {
          p.sizes.forEach((s) => set.add(Number(s)));
        }
      });
    }
    return Array.from(set).sort((a, b) => a - b);
  }

  private render(): void {
    const filters = this.store.filters;
    const activeUnit = this.store.activeSizeUnit || 'EU';
    const sizes = this.getAvailableSizes();

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

        <!-- ACORDEÓN: TALLA Y MEDIDAS EQUIVALENTES (EU, US, UK, CM) -->
        <div class="filter-group open" data-group="size">
          <div class="filter-group-header">
            <span class="group-title" id="filter-size-header-title">TALLA (${activeUnit})</span>
            <span class="group-arrow">${Icons.chevronDown()}</span>
          </div>
          <div class="filter-group-body">
            <!-- SELECTOR SEGMENTADO DE FORMATO DE MEDIDA -->
            <div class="size-unit-selector" role="tablist" aria-label="Formato de Talla">
              <button type="button" class="unit-toggle-btn ${activeUnit === 'EU' ? 'active' : ''}" data-unit="EU" title="Talla Europea (EU)">EU</button>
              <button type="button" class="unit-toggle-btn ${activeUnit === 'US' ? 'active' : ''}" data-unit="US" title="Talla Estados Unidos (US)">USA</button>
              <button type="button" class="unit-toggle-btn ${activeUnit === 'UK' ? 'active' : ''}" data-unit="UK" title="Talla Reino Unido (UK)">UK</button>
              <button type="button" class="unit-toggle-btn ${activeUnit === 'CM' ? 'active' : ''}" data-unit="CM" title="Centímetros (CM)">CM</button>
            </div>

            <!-- GRILLA DE TALLAS -->
            <div class="sizes-grid" id="filter-sizes-grid">
              ${sizes
                .map((size) => {
                  const isSelected = filters.sizes.includes(size);
                  const label = formatSizeDisplay(size, activeUnit);
                  const fullEq = formatFullEquivalence(size);
                  return `
                    <button 
                      type="button" 
                      class="size-pill ${isSelected ? 'is-selected' : ''}" 
                      data-size="${size}"
                      title="${fullEq}"
                    >
                      <span class="size-pill-number">${label}</span>
                    </button>
                  `;
                })
                .join('')}
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
            ${(['Alta', 'Media', 'Baja'] as ShoeHeight[])
              .map(
                (h) => `
              <label class="custom-checkbox">
                <input type="checkbox" name="filter-height" value="${h}" ${filters.heights.includes(h) ? 'checked' : ''} />
                <span class="checkbox-indicator"></span>
                <span class="checkbox-label">${h} (${h === 'Alta' ? 'High' : h === 'Media' ? 'Mid' : 'Low'})</span>
              </label>
            `
              )
              .join('')}
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

    // Selector de Formato de Medida (EU, US, UK, CM)
    this.bindUnitSelectorEvents();

    // Filtro Tallas
    this.bindSizePillsEvents();

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

  private bindUnitSelectorEvents(): void {
    this.container.querySelectorAll('.unit-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const unit = (btn as HTMLElement).dataset.unit as SizeUnit;
        if (unit && unit !== this.store.activeSizeUnit) {
          this.store.setSizeUnit(unit);
        }
      });
    });
  }

  private bindSizePillsEvents(): void {
    this.container.querySelectorAll('.size-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = parseFloat((btn as HTMLElement).dataset.size || '0');
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
  }

  private syncUI(): void {
    const filters = this.store.filters;
    const activeUnit = this.store.activeSizeUnit || 'EU';

    // Si la lista de productos cambió (ej. tras cargar API), refrescar tallas si es necesario
    if (this.store.products.length !== this.lastKnownProductsCount) {
      this.lastKnownProductsCount = this.store.products.length;
      this.render();
      this.setupEvents();
      return;
    }

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

    // Sincronizar botones del selector de unidad
    this.container.querySelectorAll('.unit-toggle-btn').forEach((btn) => {
      const u = (btn as HTMLElement).dataset.unit;
      if (u === activeUnit) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Sincronizar título del acordeón de tallas
    const titleEl = this.container.querySelector('#filter-size-header-title');
    if (titleEl) {
      titleEl.textContent = `TALLA (${activeUnit === 'US' ? 'USA' : activeUnit})`;
    }

    // Sincronizar botones de talla (texto y estado seleccionado)
    this.container.querySelectorAll('.size-pill').forEach((btn) => {
      const size = parseFloat((btn as HTMLElement).dataset.size || '0');
      const numberSpan = btn.querySelector('.size-pill-number');
      if (numberSpan) {
        numberSpan.textContent = formatSizeDisplay(size, activeUnit);
      }
      (btn as HTMLElement).title = formatFullEquivalence(size);

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
