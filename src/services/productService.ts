import { Product, FilterState } from '../types/product';
import { MOCK_PRODUCTS } from '../data/mockProducts';

/**
 * SERVICIO DE PRODUCTOS (ProductService)
 * ----------------------------------------------------------------------------
 * Este servicio encapsula la obtención y filtrado de productos.
 * Actualmente lee los datos de prueba de `src/data/mockProducts.ts`.
 *
 * PARA CONECTAR UNA BASE DE DATOS REAL (API REST, SUPABASE, FIREBASE, ETC.):
 * 1. Descomenta el bloque de fetch real en getProducts().
 * 2. Retorna los datos mapeados a la interfaz `Product`.
 * 3. Puedes eliminar `MOCK_PRODUCTS` de forma segura.
 * ----------------------------------------------------------------------------
 */
export class ProductService {
  /**
   * Obtiene todos los productos consultando la base de datos PostgreSQL mediante /api/products
   */
  static async getProducts(): Promise<Product[]> {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.products) && json.products.length > 0) {
          return json.products;
        }
      }
    } catch (e) {
      console.warn('Conectando a base de datos de respaldo local:', e);
    }

    // Fallback con simulación de latencia fluida
    await new Promise((resolve) => setTimeout(resolve, 200));
    return [...MOCK_PRODUCTS];
  }

  /**
   * Obtiene un producto por su identificador único
   */
  static async getProductById(id: string): Promise<Product | null> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const found = MOCK_PRODUCTS.find((p) => p.id === id);
    return found ? { ...found } : null;
  }

  /**
   * Aplica filtros y ordenamiento en cliente o servidor
   */
  static filterAndSortProducts(products: Product[], filters: FilterState): Product[] {
    let result = [...products];

    // Filtro por categoría (Calzado, Sandalias o Todos)
    if (filters.category !== 'all') {
      result = result.filter((p) => p.category === filters.category);
    }

    // Filtro por texto de búsqueda
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.colors.some((c) => c.name.toLowerCase().includes(q))
      );
    }

    // Filtro por género (Hombre, Mujer, Unisex)
    if (filters.genders.length > 0) {
      result = result.filter((p) =>
        filters.genders.includes(p.gender) || p.gender === 'Unisex'
      );
    }

    // Filtro por precio
    result = result.filter(
      (p) => p.price >= filters.minPrice && p.price <= filters.maxPrice
    );

    // Filtro por tallas disponibles
    if (filters.sizes.length > 0) {
      result = result.filter((p) =>
        p.sizes.some((size) => filters.sizes.includes(size))
      );
    }

    // Filtro por altura de calzado
    if (filters.heights.length > 0) {
      result = result.filter((p) => filters.heights.includes(p.height));
    }

    // Ordenamiento
    switch (filters.sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'featured':
      default:
        // Mantener orden destacado por defecto
        break;
    }

    return result;
  }
}
