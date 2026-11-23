export interface SlideItem {
  index: number;
  id: string;
  name: string;
  edition: string;
  colorName: string;
  price: number;
  image: string;
  badge: string;
}

export const DEFAULT_SHOWCASE_DEMOS: SlideItem[] = [
  { index: 0, id: 'blessed-slide-01', name: 'Blessed Slide Onyx Edition', edition: 'Edición #01', colorName: 'Midnight Onyx', price: 65, image: '/assets/slide/slide.png', badge: 'MÁS VENDIDO' },
  { index: 1, id: 'blessed-slide-02', name: 'Blessed Slide Pure Ivory', edition: 'Edición #02', colorName: 'Pure Ivory', price: 65, image: '/assets/slide/slide.png', badge: 'NUEVO' },
  { index: 2, id: 'blessed-slide-03', name: 'Blessed Slide Desert Sand', edition: 'Edición #03', colorName: 'Desert Sand', price: 68, image: '/assets/slide/slide.png', badge: 'POPULAR' },
  { index: 3, id: 'blessed-slide-04', name: 'Blessed Slide Emerald Luxe', edition: 'Edición #04', colorName: 'Emerald Green', price: 72, image: '/assets/slide/slide.png', badge: 'EXCLUSIVO' },
  { index: 4, id: 'blessed-slide-05', name: 'Blessed Slide Carbon Wave', edition: 'Edición #05', colorName: 'Carbon Matte', price: 65, image: '/assets/slide/slide.png', badge: 'EDICIÓN 2026' },
  { index: 5, id: 'blessed-slide-06', name: 'Blessed Slide Vintage Amber', edition: 'Edición #06', colorName: 'Vintage Amber', price: 70, image: '/assets/slide/slide.png', badge: 'LIMITADO' },
  { index: 6, id: 'blessed-slide-07', name: 'Blessed Slide Nordic Slate', edition: 'Edición #07', colorName: 'Slate Grey', price: 65, image: '/assets/slide/slide.png', badge: 'NUEVO' },
  { index: 7, id: 'blessed-slide-08', name: 'Blessed Slide Forest Shadow', edition: 'Edición #08', colorName: 'Forest Deep', price: 68, image: '/assets/slide/slide.png', badge: 'CONFORT' },
  { index: 8, id: 'blessed-slide-09', name: 'Blessed Slide Terra Cotta', edition: 'Edición #09', colorName: 'Terra Cotta', price: 65, image: '/assets/slide/slide.png', badge: 'VERANO' },
  { index: 9, id: 'blessed-slide-10', name: 'Blessed Slide Gold Accent', edition: 'Edición #10', colorName: 'Gold Luxury', price: 75, image: '/assets/slide/slide.png', badge: 'PREMIUM' }
];

export interface ProductProportionConfig {
  adjustTo836x342: boolean;
  preserveWithoutDistortion: boolean;
  customProportionEnabled: boolean;
  customWidth: number;
  customHeight: number;
  showShadow?: boolean;
}

export const DEFAULT_PRODUCT_PROPORTION: ProductProportionConfig = {
  adjustTo836x342: true,
  preserveWithoutDistortion: true,
  customProportionEnabled: false,
  customWidth: 836,
  customHeight: 342,
  showShadow: true
};

export interface ShowcaseSettings {
  adjustTo836x342: boolean;
  preserveWithoutDistortion: boolean;
  customProportionEnabled: boolean;
  customWidth: number;
  customHeight: number;
  enabledDemoIds: string[];
  isDemosExpanded?: boolean;
  productProportions?: Record<string, ProductProportionConfig>;
}

const STORAGE_KEY = 'blessed_circular_showcase_settings';

export const DEFAULT_SHOWCASE_SETTINGS: ShowcaseSettings = {
  adjustTo836x342: true,
  preserveWithoutDistortion: true,
  customProportionEnabled: false,
  customWidth: 836,
  customHeight: 342,
  enabledDemoIds: DEFAULT_SHOWCASE_DEMOS.map((d) => d.id),
  isDemosExpanded: false,
  productProportions: {}
};

export class ShowcaseSettingsService {
  static getSettings(): ShowcaseSettings {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          adjustTo836x342: parsed.adjustTo836x342 !== undefined ? Boolean(parsed.adjustTo836x342) : true,
          preserveWithoutDistortion: parsed.preserveWithoutDistortion !== undefined ? Boolean(parsed.preserveWithoutDistortion) : true,
          customProportionEnabled: Boolean(parsed.customProportionEnabled),
          customWidth: Math.max(100, Number(parsed.customWidth) || 836),
          customHeight: Math.max(50, Number(parsed.customHeight) || 342),
          enabledDemoIds: Array.isArray(parsed.enabledDemoIds)
            ? parsed.enabledDemoIds
            : DEFAULT_SHOWCASE_DEMOS.map((d) => d.id),
          isDemosExpanded: Boolean(parsed.isDemosExpanded),
          productProportions: typeof parsed.productProportions === 'object' && parsed.productProportions !== null
            ? parsed.productProportions
            : {}
        };
      }
    } catch (e) {
      console.warn('Error reading showcase settings from localStorage:', e);
    }
    return {
      ...DEFAULT_SHOWCASE_SETTINGS,
      enabledDemoIds: [...DEFAULT_SHOWCASE_SETTINGS.enabledDemoIds],
      productProportions: {}
    };
  }

  static saveSettings(settings: ShowcaseSettings): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        window.dispatchEvent(new CustomEvent('blessed:showcase_settings_changed', { detail: settings }));
      }
    } catch (e) {
      console.warn('Error saving showcase settings to localStorage:', e);
    }
  }

  static getProductProportion(productId: string): ProductProportionConfig {
    const s = this.getSettings();
    if (s.productProportions && s.productProportions[productId]) {
      const p = s.productProportions[productId];
      return {
        adjustTo836x342: p.adjustTo836x342 !== undefined ? Boolean(p.adjustTo836x342) : true,
        preserveWithoutDistortion: p.preserveWithoutDistortion !== undefined ? Boolean(p.preserveWithoutDistortion) : true,
        customProportionEnabled: Boolean(p.customProportionEnabled),
        customWidth: Math.max(100, Number(p.customWidth) || 836),
        customHeight: Math.max(50, Number(p.customHeight) || 342),
        showShadow: p.showShadow !== undefined ? Boolean(p.showShadow) : true
      };
    }
    return { ...DEFAULT_PRODUCT_PROPORTION };
  }

  static saveProductProportion(productId: string, config: ProductProportionConfig): void {
    const s = this.getSettings();
    if (!s.productProportions) {
      s.productProportions = {};
    }
    s.productProportions[productId] = { ...config };
    this.saveSettings(s);
  }

  static setProductShadow(productId: string, showShadow: boolean): void {
    const prop = this.getProductProportion(productId);
    this.saveProductProportion(productId, {
      ...prop,
      showShadow
    });
  }

  static toggleDemoItem(id: string, enable?: boolean): ShowcaseSettings {
    const s = this.getSettings();
    const exists = s.enabledDemoIds.includes(id);
    const shouldEnable = enable !== undefined ? enable : !exists;
    if (shouldEnable && !exists) {
      s.enabledDemoIds.push(id);
    } else if (!shouldEnable && exists) {
      s.enabledDemoIds = s.enabledDemoIds.filter((itemId) => itemId !== id);
    }
    this.saveSettings(s);
    return s;
  }

  static setAllDemos(enable: boolean): ShowcaseSettings {
    const s = this.getSettings();
    s.enabledDemoIds = enable ? DEFAULT_SHOWCASE_DEMOS.map((d) => d.id) : [];
    this.saveSettings(s);
    return s;
  }
}
