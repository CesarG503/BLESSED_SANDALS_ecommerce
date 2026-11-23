export interface AnnouncementItem {
  id: string;
  text: string;
  isActive: boolean;
  createdAt: number;
}

export const DEFAULT_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-1',
    text: '✨ ENVÍO GRATIS EN PEDIDOS SUPERIORES A $50 • DEVOLUCIONES GRATUITAS EN 30 DÍAS',
    isActive: true,
    createdAt: 1700000000000
  },
  {
    id: 'ann-2',
    text: '🔥 NUEVA COLECCIÓN BLESSED SANDALS 2026 DISPONIBLE',
    isActive: true,
    createdAt: 1700000001000
  },
  {
    id: 'ann-3',
    text: '⚡ 10% DE DESCUENTO CON EL CÓDIGO BLESSED10',
    isActive: true,
    createdAt: 1700000002000
  }
];

const STORAGE_KEY = 'blessed_top_announcements_settings';

export class AnnouncementSettingsService {
  /**
   * Obtiene la lista completa de anuncios guardada en localStorage o la predeterminada.
   */
  static getAnnouncements(): AnnouncementItem[] {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item) => ({
              id: String(item.id || `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`),
              text: String(item.text || ''),
              isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
              createdAt: Number(item.createdAt) || Date.now()
            }));
          }
        }
      }
    } catch (e) {
      console.warn('Error reading announcement settings from localStorage:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_ANNOUNCEMENTS));
  }

  /**
   * Guarda los anuncios en localStorage y emite el evento para reactividad inmediata en toda la app.
   */
  static saveAnnouncements(items: AnnouncementItem[]): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        window.dispatchEvent(new CustomEvent('blessed:announcements_changed', { detail: items }));
      }
    } catch (e) {
      console.warn('Error saving announcement settings to localStorage:', e);
    }
  }

  /**
   * Agrega un nuevo anuncio al inicio o final de la lista.
   */
  static addAnnouncement(text: string, isActive: boolean = true): AnnouncementItem {
    const list = this.getAnnouncements();
    const newItem: AnnouncementItem = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: text.trim(),
      isActive,
      createdAt: Date.now()
    };
    list.unshift(newItem);
    this.saveAnnouncements(list);
    return newItem;
  }

  /**
   * Actualiza el texto y estado de un anuncio existente.
   */
  static updateAnnouncement(id: string, text: string, isActive?: boolean): void {
    const list = this.getAnnouncements();
    const item = list.find((a) => a.id === id);
    if (item) {
      item.text = text.trim();
      if (isActive !== undefined) {
        item.isActive = isActive;
      }
      this.saveAnnouncements(list);
    }
  }

  /**
   * Alterna el estado activo/inactivo de un anuncio.
   */
  static toggleAnnouncement(id: string): boolean {
    const list = this.getAnnouncements();
    const item = list.find((a) => a.id === id);
    if (item) {
      item.isActive = !item.isActive;
      this.saveAnnouncements(list);
      return item.isActive;
    }
    return false;
  }

  /**
   * Elimina un anuncio por su ID.
   */
  static deleteAnnouncement(id: string): void {
    const list = this.getAnnouncements();
    const filtered = list.filter((a) => a.id !== id);
    this.saveAnnouncements(filtered);
  }

  /**
   * Reordena un anuncio hacia arriba o abajo en la secuencia.
   */
  static moveAnnouncement(id: string, direction: 'up' | 'down'): void {
    const list = this.getAnnouncements();
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = list[index - 1];
      list[index - 1] = list[index];
      list[index] = temp;
      this.saveAnnouncements(list);
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index + 1];
      list[index + 1] = list[index];
      list[index] = temp;
      this.saveAnnouncements(list);
    }
  }

  /**
   * Activa o desactiva todos los anuncios masivamente.
   */
  static setAllAnnouncementsActive(active: boolean): void {
    const list = this.getAnnouncements();
    list.forEach((a) => {
      a.isActive = active;
    });
    this.saveAnnouncements(list);
  }

  /**
   * Restablece los anuncios oficiales por defecto.
   */
  static resetToDefaults(): AnnouncementItem[] {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_ANNOUNCEMENTS));
    this.saveAnnouncements(defaults);
    return defaults;
  }
}
