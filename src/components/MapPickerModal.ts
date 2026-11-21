import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Icons } from './Icons';
import { Toast } from './Toast';

export interface SelectedLocation {
  lat: number;
  lng: number;
  state: string; // Departamento en El Salvador
  city: string; // Municipio en El Salvador
  street: string; // Dirección exacta / Colonia / Calle
  postalCode: string;
  reference: string;
  displayName: string;
}

// Centroides y datos oficiales de los 14 departamentos de El Salvador
export const EL_SALVADOR_CENTROIDS: Record<
  string,
  { lat: number; lng: number; defaultCity: string; defaultPostal: string }
> = {
  'San Salvador': {
    lat: 13.6989,
    lng: -89.2415,
    defaultCity: 'San Salvador Centro (Escalón, San Benito, Centro)',
    defaultPostal: '1101'
  },
  'La Libertad': {
    lat: 13.6769,
    lng: -89.2797,
    defaultCity: 'Santa Tecla',
    defaultPostal: '1501'
  },
  'Santa Ana': {
    lat: 13.9942,
    lng: -89.5597,
    defaultCity: 'Santa Ana Centro',
    defaultPostal: '2201'
  },
  'San Miguel': {
    lat: 13.4833,
    lng: -88.1833,
    defaultCity: 'San Miguel Centro',
    defaultPostal: '3301'
  },
  'Sonsonate': {
    lat: 13.7189,
    lng: -89.7242,
    defaultCity: 'Sonsonate Centro',
    defaultPostal: '2301'
  },
  'Usulután': {
    lat: 13.3500,
    lng: -88.4333,
    defaultCity: 'Usulután Centro',
    defaultPostal: '3401'
  },
  'Ahuachapán': {
    lat: 13.9214,
    lng: -89.8450,
    defaultCity: 'Ahuachapán Centro',
    defaultPostal: '2101'
  },
  'La Paz': {
    lat: 13.5000,
    lng: -88.8667,
    defaultCity: 'Zacatecoluca',
    defaultPostal: '1601'
  },
  'Cuscatlán': {
    lat: 13.7214,
    lng: -88.9367,
    defaultCity: 'Cojutepeque',
    defaultPostal: '1401'
  },
  'Chalatenango': {
    lat: 14.0417,
    lng: -88.9333,
    defaultCity: 'Chalatenango Centro',
    defaultPostal: '1301'
  },
  'Morazán': {
    lat: 13.7000,
    lng: -88.1000,
    defaultCity: 'San Francisco Gotera',
    defaultPostal: '3201'
  },
  'San Vicente': {
    lat: 13.6417,
    lng: -88.7833,
    defaultCity: 'San Vicente Centro',
    defaultPostal: '1701'
  },
  'Cabañas': {
    lat: 13.8667,
    lng: -88.6333,
    defaultCity: 'Sensuntepeque',
    defaultPostal: '1201'
  },
  'La Unión': {
    lat: 13.3369,
    lng: -87.8439,
    defaultCity: 'La Unión Centro (Puerto)',
    defaultPostal: '3101'
  }
};

// Puntos de acceso rápido populares en El Salvador
const QUICK_POINTS = [
  { label: 'San Salvador (Escalón)', lat: 13.7013, lng: -89.2435, dept: 'San Salvador' },
  { label: 'Santa Tecla', lat: 13.6769, lng: -89.2797, dept: 'La Libertad' },
  { label: 'Antiguo Cuscatlán', lat: 13.6720, lng: -89.2490, dept: 'La Libertad' },
  { label: 'Santa Ana', lat: 13.9942, lng: -89.5597, dept: 'Santa Ana' },
  { label: 'San Miguel', lat: 13.4833, lng: -88.1833, dept: 'San Miguel' },
  { label: 'Sonsonate', lat: 13.7189, lng: -89.7242, dept: 'Sonsonate' },
  { label: 'Aeropuerto Int. El Salvador', lat: 13.4409, lng: -89.0557, dept: 'La Paz' }
];

export class MapPickerModal {
  private static instance: MapPickerModal | null = null;
  private container: HTMLElement | null = null;
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private currentLocation: SelectedLocation | null = null;
  private onSelectCallback: ((location: SelectedLocation) => void) | null = null;
  private geocodeTimeout: any = null;

  private constructor() {
    this.createModalDOM();
  }

  public static getInstance(): MapPickerModal {
    if (!MapPickerModal.instance) {
      MapPickerModal.instance = new MapPickerModal();
    }
    return MapPickerModal.instance;
  }

  private createModalDOM(): void {
    const existing = document.getElementById('map-picker-modal-root');
    if (existing) {
      this.container = existing;
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'map-picker-modal-root';
    wrapper.className = 'map-picker-modal-root is-hidden';
    wrapper.innerHTML = `
      <div class="map-modal-backdrop" id="map-modal-backdrop"></div>
      <div class="map-modal-dialog animate-scale-up" role="dialog" aria-modal="true">
        
        <!-- BARRA SUPERIOR DEL MAPA (LIMPIA, SIN TEXTOS LARGOS) -->
        <div class="map-modal-top-bar">
          <form id="form-map-search" class="map-search-form">
            <div class="map-search-input-wrap">
              <span class="search-input-icon">${Icons.search('w-4 h-4')}</span>
              <input 
                type="text" 
                id="map-search-input" 
                placeholder="Buscar colonia, calle, avenida o lugar en El Salvador..." 
                autocomplete="off"
              />
            </div>
            <button type="submit" class="btn btn-primary btn-sm btn-map-search-action">
              Buscar
            </button>
          </form>

          <button type="button" class="btn-close-map-modal" id="btn-close-map-modal" aria-label="Cerrar mapa" title="Cerrar mapa">
            ${Icons.close('w-5 h-5')}
          </button>
        </div>

        <!-- ACCESOS RÁPIDOS POR ZONAS -->
        <div class="map-modal-controls">
          <div class="map-quick-chips-row">
            <span class="quick-chips-label">Zonas rápidas:</span>
            <div class="chips-scroll-container">
              ${QUICK_POINTS.map(
                (p, idx) => `
                <button type="button" class="btn-quick-chip" data-chip-idx="${idx}">
                  ${p.label}
                </button>
              `
              ).join('')}
            </div>
          </div>
        </div>

        <!-- CONTENEDOR DEL MAPA LEAFLET -->
        <div class="map-canvas-wrapper">
          <div id="leaflet-delivery-map" class="leaflet-delivery-map-el-salvador"></div>
          <div class="map-loading-indicator is-hidden" id="map-loading-indicator">
            <span class="spinner-dot"></span> Obteniendo dirección en El Salvador...
          </div>
        </div>

        <!-- TARJETA DE DETALLE DE LA DIRECCIÓN DETECTADA -->
        <div class="map-preview-card" id="map-preview-card">
          <div class="preview-card-grid">
            <div class="preview-col-main">
              <div class="preview-badges-row">
                <span class="preview-badge-dept" id="preview-badge-dept">San Salvador</span>
                <span class="preview-badge-city" id="preview-badge-city">San Salvador Centro</span>
                <span class="preview-badge-country">🇸🇻 El Salvador</span>
              </div>
              <p class="preview-address-text" id="preview-address-text">
                Cargando ubicación seleccionada...
              </p>
            </div>
            <div class="preview-col-meta">
              <div class="preview-postal-box">
                <span class="postal-label">Código Postal</span>
                <strong class="postal-value" id="preview-postal-value">1101</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- ACCIONES INFERIORES -->
        <div class="map-modal-footer">
          <button type="button" class="btn btn-outline" id="btn-cancel-map-selection">
            Cancelar
          </button>
          <button type="button" class="btn btn-primary btn-confirm-map-selection" id="btn-confirm-map-selection">
            ${Icons.check('w-4 h-4')} Usar esta Dirección en el Formulario
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(wrapper);
    this.container = wrapper;

    this.setupModalEvents();
  }

  private setupModalEvents(): void {
    if (!this.container) return;

    // Cerrar modal
    const closeBtn = this.container.querySelector('#btn-close-map-modal');
    const backdrop = this.container.querySelector('#map-modal-backdrop');
    const cancelBtn = this.container.querySelector('#btn-cancel-map-selection');

    const handleClose = () => this.close();
    closeBtn?.addEventListener('click', handleClose);
    backdrop?.addEventListener('click', handleClose);
    cancelBtn?.addEventListener('click', handleClose);

    // Búsqueda en el mapa
    const searchForm = this.container.querySelector('#form-map-search');
    searchForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = this.container?.querySelector('#map-search-input') as HTMLInputElement | null;
      const query = input?.value.trim();
      if (!query) return;

      await this.searchLocationInElSalvador(query);
    });

    // Clics en Chips de zonas comunes
    this.container.querySelectorAll('.btn-quick-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.chipIdx || '0', 10);
        const point = QUICK_POINTS[idx];
        if (point && this.map && this.marker) {
          this.map.flyTo([point.lat, point.lng], 15, { duration: 1.2 });
          this.marker.setLatLng([point.lat, point.lng]);
          this.updateLocationData(point.lat, point.lng);
        }
      });
    });

    // Confirmar y llenar formulario
    const confirmBtn = this.container.querySelector('#btn-confirm-map-selection');
    confirmBtn?.addEventListener('click', () => {
      if (this.currentLocation && this.onSelectCallback) {
        this.onSelectCallback(this.currentLocation);
        Toast.show(
          `📍 Ubicación seleccionada: ${this.currentLocation.city}, ${this.currentLocation.state}`,
          'Dirección cargada del mapa',
          'success'
        );
      }
      this.close();
    });

    // Cerrar con Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.container?.classList.contains('is-active')) {
        this.close();
      }
    });
  }

  /**
   * Inicializa el mapa Leaflet enfocado estrictamente en El Salvador
   */
  private initMap(initialLat = 13.6989, initialLng = -89.2415): void {
    if (this.map) {
      this.map.setView([initialLat, initialLng], 13);
      if (this.marker) {
        this.marker.setLatLng([initialLat, initialLng]);
      }
      this.updateLocationData(initialLat, initialLng);
      return;
    }

    const mapElement = document.getElementById('leaflet-delivery-map');
    if (!mapElement) return;

    // Límite geográfico estricto de El Salvador (Bounding Box)
    const elSalvadorBounds = L.latLngBounds(
      L.latLng(13.10, -90.35), // Suroeste
      L.latLng(14.55, -87.65)  // Noreste
    );

    this.map = L.map(mapElement, {
      center: [initialLat, initialLng],
      zoom: 13,
      minZoom: 8,
      maxZoom: 18,
      maxBounds: elSalvadorBounds,
      maxBoundsViscosity: 0.9,
      zoomControl: true
    });

    // Capa de tiles OpenStreetMap optimizada
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Marcador personalizado estilo Blessed Sandals (verde esmeralda con pin animado)
    const customPinIcon = L.divIcon({
      className: 'blessed-custom-pin-root',
      html: `
        <div class="blessed-pin-bubble">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="pin-svg-icon">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </div>
        <div class="blessed-pin-pulse"></div>
      `,
      iconSize: [40, 48],
      iconAnchor: [20, 48],
      popupAnchor: [0, -48]
    });

    this.marker = L.marker([initialLat, initialLng], {
      icon: customPinIcon,
      draggable: true
    }).addTo(this.map);

    // Evento al arrastrar el marcador
    this.marker.on('dragend', () => {
      const pos = this.marker?.getLatLng();
      if (pos) {
        this.updateLocationData(pos.lat, pos.lng);
      }
    });

    // Evento al hacer clic en cualquier parte del mapa
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.marker?.setLatLng([lat, lng]);
      this.updateLocationData(lat, lng);
    });

    // Cargar datos iniciales
    this.updateLocationData(initialLat, initialLng);
  }

  /**
   * Realiza geocodificación inversa para obtener departamento, municipio y calle de El Salvador
   */
  private updateLocationData(lat: number, lng: number): void {
    const loading = this.container?.querySelector('#map-loading-indicator');
    loading?.classList.remove('is-hidden');

    // 1. Inmediato: Determinar el departamento más cercano por distancia geográfica
    const fallbackDept = this.findClosestSalvadorDepartment(lat, lng);
    const fallbackInfo = EL_SALVADOR_CENTROIDS[fallbackDept] || EL_SALVADOR_CENTROIDS['San Salvador'];

    this.currentLocation = {
      lat,
      lng,
      state: fallbackDept,
      city: fallbackInfo.defaultCity,
      street: `Ubicación en ${fallbackDept} (Coord: ${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      postalCode: fallbackInfo.defaultPostal,
      reference: `Punto GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      displayName: `${fallbackInfo.defaultCity}, ${fallbackDept}, El Salvador`
    };

    this.renderPreviewCard();

    // 2. Con retraso: consultar Nominatim para obtener nombre exacto de calle, colonia y distrito
    if (this.geocodeTimeout) clearTimeout(this.geocodeTimeout);
    this.geocodeTimeout = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'BlessedSandals-ElSalvador/1.0' }
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;

            // Identificar departamento
            const rawState = addr.state || addr.county || fallbackDept;
            const state = this.normalizeSalvadorDepartment(rawState) || fallbackDept;

            // Identificar municipio / distrito
            const city =
              addr.municipality ||
              addr.city ||
              addr.town ||
              addr.suburb ||
              fallbackInfo.defaultCity;

            // Identificar calle / colonia / vecindario
            const parts: string[] = [];
            if (addr.road) parts.push(addr.road);
            if (addr.neighbourhood) parts.push(addr.neighbourhood);
            if (addr.suburb && !parts.includes(addr.suburb)) parts.push(addr.suburb);
            if (addr.residential) parts.push(addr.residential);

            const street = parts.length > 0 ? parts.join(', ') : data.display_name?.split(',')[0] || `Dirección en ${city}`;
            const postalCode = addr.postcode || fallbackInfo.defaultPostal;

            this.currentLocation = {
              lat,
              lng,
              state,
              city,
              street,
              postalCode,
              reference: `Cerca de ${city}, coord: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              displayName: data.display_name || `${street}, ${city}, ${state}, El Salvador`
            };

            this.renderPreviewCard();
          }
        }
      } catch (e) {
        console.warn('Geocodificación inversa con fallback local:', e);
      } finally {
        loading?.classList.add('is-hidden');
      }
    }, 280);
  }

  /**
   * Busca un lugar en El Salvador y centra el mapa
   */
  private async searchLocationInElSalvador(query: string): Promise<void> {
    const loading = this.container?.querySelector('#map-loading-indicator');
    loading?.classList.remove('is-hidden');

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=sv&limit=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'BlessedSandals-ElSalvador/1.0' }
      });

      if (res.ok) {
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          const item = results[0];
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);

          if (this.map && this.marker) {
            this.map.flyTo([lat, lng], 15, { duration: 1.2 });
            this.marker.setLatLng([lat, lng]);
            this.updateLocationData(lat, lng);
            Toast.show(`📍 Ubicación encontrada: ${item.display_name.split(',')[0]}`, 'Lugar en El Salvador', 'info');
          }
          return;
        }
      }
      Toast.show('No se encontraron resultados específicos en El Salvador. Prueba con otro nombre o selecciona directo en el mapa.', 'Búsqueda', 'warning');
    } catch (e) {
      console.warn('Error buscando en mapa:', e);
      Toast.show('Error al buscar la ubicación. Puedes seleccionar el punto directamente en el mapa.', 'Aviso', 'warning');
    } finally {
      loading?.classList.add('is-hidden');
    }
  }

  /**
   * Actualiza la tarjeta de vista previa inferior con los datos actuales
   */
  private renderPreviewCard(): void {
    if (!this.container || !this.currentLocation) return;

    const badgeDept = this.container.querySelector('#preview-badge-dept');
    const badgeCity = this.container.querySelector('#preview-badge-city');
    const addressText = this.container.querySelector('#preview-address-text');
    const postalValue = this.container.querySelector('#preview-postal-value');

    if (badgeDept) badgeDept.textContent = this.currentLocation.state;
    if (badgeCity) badgeCity.textContent = this.currentLocation.city;
    if (addressText) addressText.textContent = this.currentLocation.street;
    if (postalValue) postalValue.textContent = this.currentLocation.postalCode;
  }

  /**
   * Encuentra el departamento de El Salvador más cercano por distancia Euclidiana
   */
  private findClosestSalvadorDepartment(lat: number, lng: number): string {
    let closestDept = 'San Salvador';
    let minDistance = Infinity;

    for (const [dept, coords] of Object.entries(EL_SALVADOR_CENTROIDS)) {
      const dist = Math.hypot(lat - coords.lat, lng - coords.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestDept = dept;
      }
    }

    return closestDept;
  }

  /**
   * Normaliza texto devuelto por Nominatim al nombre exacto de uno de los 14 departamentos
   */
  private normalizeSalvadorDepartment(raw: string): string | null {
    const clean = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const dept of Object.keys(EL_SALVADOR_CENTROIDS)) {
      const deptClean = dept.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (clean.includes(deptClean) || deptClean.includes(clean)) {
        return dept;
      }
    }

    return null;
  }

  /**
   * Abre el modal del mapa
   */
  public open(
    onSelect: (location: SelectedLocation) => void,
    initialCoords?: { lat: number; lng: number }
  ): void {
    this.onSelectCallback = onSelect;

    if (!this.container) {
      this.createModalDOM();
    }

    if (this.container) {
      this.container.classList.remove('is-hidden');
      this.container.classList.add('is-active');
      document.body.style.overflow = 'hidden';

      const lat = initialCoords?.lat || 13.6989;
      const lng = initialCoords?.lng || -89.2415;

      setTimeout(() => {
        this.initMap(lat, lng);
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 100);

      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 300);
    }
  }

  /**
   * Cierra el modal del mapa
   */
  public close(): void {
    if (this.container) {
      this.container.classList.remove('is-active');
      this.container.classList.add('is-hidden');
      document.body.style.overflow = '';
    }
  }
}
