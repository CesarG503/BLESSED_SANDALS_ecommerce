export type ProductCategory = 'shoes' | 'sandals' | 'all';

export type ProductGender = 'Hombre' | 'Mujer' | 'Unisex';

export type ShoeHeight = 'Baja' | 'Media' | 'Alta';

export interface ColorVariant {
  id?: string;
  name: string;
  hex: string;
  image: string;
  gallery?: string[];
  price?: number;
  originalPrice?: number;
  sizes?: Array<{ size: number; stock: number }>;
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  category: 'shoes' | 'sandals';
  gender: ProductGender;
  price: number;
  originalPrice?: number;
  badge?: 'PRÓXIMAMENTE' | 'MÁS VENDIDO' | 'NUEVO' | 'DESCUENTO' | 'EDICIÓN LIMITADA';
  image: string;
  gallery: string[];
  colors: ColorVariant[];
  sizes: number[];
  height: ShoeHeight;
  technology: string[];
  features: string[];
  description: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  has3DModel?: boolean;
  model3dUrl?: string;
  carouselImage?: string | null;
  showcaseActive?: boolean;
  showcaseOrder?: number;
  isPromoItem?: boolean;
  promoStoreCode?: string;
  createdAt: string;
}

export interface FilterState {
  category: ProductCategory;
  search: string;
  genders: ProductGender[];
  minPrice: number;
  maxPrice: number;
  sizes: number[];
  colors: string[];
  heights: ShoeHeight[];
  sortBy: 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating';
}
