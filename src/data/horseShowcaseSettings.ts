export interface HorseShowcaseSettings {
  orderedProductIds: string[]; // Orden secuencial de calzados por ID
  hiddenProductIds: string[];  // IDs de calzados explícitamente ocultados
}

const STORAGE_KEY = 'blessed_horse_showcase_settings';

export const DEFAULT_HORSE_SHOWCASE_SETTINGS: HorseShowcaseSettings = {
  orderedProductIds: [],
  hiddenProductIds: []
};

export class HorseShowcaseSettingsService {
  /**
   * Obtiene la configuración actual de Horse Showcase desde localStorage.
   */
  static getSettings(): HorseShowcaseSettings {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            orderedProductIds: Array.isArray(parsed.orderedProductIds) ? parsed.orderedProductIds : [],
            hiddenProductIds: Array.isArray(parsed.hiddenProductIds) ? parsed.hiddenProductIds : []
          };
        }
      }
    } catch (e) {
      console.warn('Error reading horse showcase settings from localStorage:', e);
    }
    return { ...DEFAULT_HORSE_SHOWCASE_SETTINGS };
  }

  /**
   * Guarda la configuración y emite el evento global para reactividad instantánea.
   */
  static saveSettings(settings: HorseShowcaseSettings): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        window.dispatchEvent(new CustomEvent('blessed:horse_showcase_settings_changed', { detail: settings }));
      }
    } catch (e) {
      console.warn('Error saving horse showcase settings to localStorage:', e);
    }
  }

  /**
   * Indica si un producto es visible en Horse Showcase (por defecto TODOS son visibles).
   */
  static isProductVisible(productId: string): boolean {
    const s = this.getSettings();
    return !s.hiddenProductIds.includes(productId);
  }

  /**
   * Activa o desactiva la visibilidad de un calzado en Horse Showcase.
   */
  static setProductVisible(productId: string, visible: boolean): void {
    const s = this.getSettings();
    const isHidden = s.hiddenProductIds.includes(productId);
    if (!visible && !isHidden) {
      s.hiddenProductIds.push(productId);
    } else if (visible && isHidden) {
      s.hiddenProductIds = s.hiddenProductIds.filter((id) => id !== productId);
    }
    this.saveSettings(s);
  }

  /**
   * Muestra u oculta masivamente todos los productos del catálogo.
   */
  static setAllProductsVisible(allProducts: Array<{ id: string }>, visible: boolean): void {
    const s = this.getSettings();
    if (visible) {
      s.hiddenProductIds = [];
    } else {
      s.hiddenProductIds = allProducts.map((p) => p.id);
    }
    this.saveSettings(s);
  }

  /**
   * Reordena un producto hacia arriba o hacia abajo en la lista.
   */
  static moveProduct(allProducts: Array<{ id: string }>, productId: string, direction: 'up' | 'down'): void {
    const s = this.getSettings();
    let currentOrderedIds = [...s.orderedProductIds];

    // Asegurar que todos los productos del catálogo estén presentes en la lista de orden
    allProducts.forEach((p) => {
      if (!currentOrderedIds.includes(p.id)) {
        currentOrderedIds.push(p.id);
      }
    });

    // Filtrar IDs que ya no existan en el catálogo
    const validIds = new Set(allProducts.map((p) => p.id));
    currentOrderedIds = currentOrderedIds.filter((id) => validIds.has(id));

    const index = currentOrderedIds.indexOf(productId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = currentOrderedIds[index - 1];
      currentOrderedIds[index - 1] = currentOrderedIds[index];
      currentOrderedIds[index] = temp;
    } else if (direction === 'down' && index < currentOrderedIds.length - 1) {
      const temp = currentOrderedIds[index + 1];
      currentOrderedIds[index + 1] = currentOrderedIds[index];
      currentOrderedIds[index] = temp;
    }

    s.orderedProductIds = currentOrderedIds;
    this.saveSettings(s);
  }

  /**
   * Retorna todos los productos del catálogo ordenados según la configuración,
   * incluyendo su estado de visibilidad y posición secuencial (#1, #2, ...).
   */
  static getOrderedProducts<T extends { id: string }>(
    products: T[]
  ): Array<{ product: T; isVisible: boolean; orderIndex: number }> {
    const s = this.getSettings();
    const productMap = new Map<string, T>();
    products.forEach((p) => productMap.set(p.id, p));

    const result: Array<{ product: T; isVisible: boolean; orderIndex: number }> = [];
    const seen = new Set<string>();

    // 1. Añadir en primer lugar los productos que tienen orden explícito guardado
    s.orderedProductIds.forEach((id) => {
      const p = productMap.get(id);
      if (p) {
        seen.add(id);
        result.push({
          product: p,
          isVisible: !s.hiddenProductIds.includes(id),
          orderIndex: result.length + 1
        });
      }
    });

    // 2. Añadir automáticamente cualquier otro producto nuevo del catálogo
    products.forEach((p) => {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        result.push({
          product: p,
          isVisible: !s.hiddenProductIds.includes(p.id),
          orderIndex: result.length + 1
        });
      }
    });

    return result;
  }

  /**
   * Retorna únicamente los productos visibles en Horse Showcase en el orden configurado.
   */
  static getOrderedVisibleProducts<T extends { id: string }>(products: T[]): T[] {
    const list = this.getOrderedProducts(products);
    return list.filter((item) => item.isVisible).map((item) => item.product);
  }
}
