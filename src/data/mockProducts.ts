import { Product } from '../types/product';

/**
 * ============================================================================
 * DATOS DE PRUEBA (MOCK DATA) - TIENDA PRELIMINAR BLESSED SANDALS
 * ============================================================================
 * NOTA PARA MIGRACIÓN A BASE DE DATOS:
 * Este archivo contiene los productos de prueba iniciales basados en los assets
 * locales (Jordan y Sandalias).
 *
 * Para conectar una base de datos real (Supabase, Firebase, PostgreSQL, MongoDB):
 * 1. Ve a `src/services/productService.ts`.
 * 2. Reemplaza la lectura de `MOCK_PRODUCTS` por tu llamada HTTP/SDK `fetch('/api/products')`.
 * 3. Puedes eliminar o archivar este archivo una vez conectada tu base de datos.
 * ============================================================================
 */

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'Air Jordan 1 Retro High OG',
    subtitle: 'Calzado para Hombre',
    category: 'shoes',
    gender: 'Hombre',
    price: 225,
    badge: 'MÁS VENDIDO',
    image: '/assets/jordan/jordan1.jpg',
    gallery: [
      '/assets/jordan/jordan1.jpg',
      '/assets/jordan/jordan.jpg',
      '/assets/jordan/jordan2.jpg',
      '/assets/jordan/jordan3-preview.jpg'
    ],
    colors: [
      { name: 'Chicago Red', hex: '#cf2228', image: '/assets/jordan/jordan1.jpg' },
      { name: 'Pure White', hex: '#f0f0f0', image: '/assets/jordan/jordan.jpg' },
      { name: 'Bred Black', hex: '#1a1a1a', image: '/assets/jordan/jordan4.jpg' }
    ],
    sizes: [38, 39, 40, 41, 42, 43, 44, 45],
    height: 'Alta',
    technology: ['Nike Air Encapsulada', 'Suela de Goma Pivot', 'Cuero Premium'],
    features: ['Diseño icónico de 1985', 'Amortiguación reactiva', 'Soporte de tobillo acolchado'],
    description: 'El clásico atemporal reinventado con materiales de primera calidad. Cuenta con amortiguación Air encapsulada en el talón y el emblemático logotipo Wings.',
    rating: 4.9,
    reviewCount: 142,
    inStock: true,
    has3DModel: true,
    model3dUrl: '/assets/modelos/Nike Air Jordan 1.glb',
    createdAt: '2026-01-15'
  },
  {
    id: 'prod-002',
    name: 'Air Jordan 11 Retro',
    subtitle: 'Calzado de Baloncesto y Estilo',
    category: 'shoes',
    gender: 'Hombre',
    price: 250,
    badge: 'PRÓXIMAMENTE',
    image: '/assets/jordan/jordan.jpg',
    gallery: [
      '/assets/jordan/jordan.jpg',
      '/assets/jordan/jordan1.jpg',
      '/assets/jordan/jordan5.jpg'
    ],
    colors: [
      { name: 'Varsity Red / White', hex: '#bd1b21', image: '/assets/jordan/jordan.jpg' },
      { name: 'Concord Black', hex: '#000000', image: '/assets/jordan/jordan4.jpg' }
    ],
    sizes: [39, 40, 41, 42, 43, 44, 45],
    height: 'Media',
    technology: ['Placa de Fibra de Carbono', 'Air-Sole completa', 'Charol Brillante'],
    features: ['Tracción multidireccional espiga', 'Capellada balística transpirable'],
    description: 'Uno de los diseños más codiciados de todos los tiempos. La combinación de charol brillante y amortiguación de longitud completa ofrece elegancia dentro y fuera de la cancha.',
    rating: 4.8,
    reviewCount: 98,
    inStock: true,
    createdAt: '2026-02-01'
  },
  {
    id: 'prod-003',
    name: 'Blessed Slide Sandal Classic',
    subtitle: 'Sandalia Ergonómica de Descanso',
    category: 'sandals',
    gender: 'Unisex',
    price: 65,
    badge: 'NUEVO',
    image: '/assets/slide/slide.png',
    gallery: [
      '/assets/slide/slide.png'
    ],
    colors: [
      { name: 'Blessed Emerald Green', hex: '#0B3B24', image: '/assets/slide/slide.png' },
      { name: 'Sand Gold', hex: '#d2b588', image: '/assets/slide/slide.png' },
      { name: 'Midnight Onyx', hex: '#111111', image: '/assets/slide/slide.png' }
    ],
    sizes: [36, 37, 38, 39, 40, 41, 42, 43, 44],
    height: 'Baja',
    technology: ['Espuma EVA CloudFoam', 'Plantilla Anatómica 3D', 'Banda Acolchada'],
    features: ['Resistente al agua', 'Secado ultrarrápido', 'Agarre antideslizante en húmedo'],
    description: 'La máxima comodidad para el día a día. Fabricada con espuma de doble densidad y textura ergonómica que masajea el pie con cada pisada. El distintivo sello Blessed en relieve.',
    rating: 5.0,
    reviewCount: 230,
    inStock: true,
    createdAt: '2026-02-10'
  },
  {
    id: 'prod-004',
    name: 'Air Jordan 6 Retro',
    subtitle: 'Calzado Lifestyle Deportivo',
    category: 'shoes',
    gender: 'Hombre',
    price: 200,
    badge: 'MÁS VENDIDO',
    image: '/assets/jordan/jordan2.jpg',
    gallery: [
      '/assets/jordan/jordan2.jpg',
      '/assets/jordan/jordan1.jpg'
    ],
    colors: [
      { name: 'Infrared White', hex: '#e41c2d', image: '/assets/jordan/jordan2.jpg' },
      { name: 'Triple White', hex: '#f7f7f7', image: '/assets/jordan/jordan.jpg' }
    ],
    sizes: [40, 41, 42, 43, 44],
    height: 'Alta',
    technology: ['Unidad Air Visible', 'Lengüeta con pasadores', 'Suela traslúcida'],
    features: ['Estructura inspirada en autos deportivos', 'Sujeción dinámica'],
    description: 'La silueta con la que MJ conquistó su primer anillo en 1991. Estilo agresivo, perforaciones para ventilación y una unidad Air visible en la entresuela.',
    rating: 4.7,
    reviewCount: 76,
    inStock: true,
    createdAt: '2026-01-20'
  },
  {
    id: 'prod-005',
    name: 'Air Jordan 1 Mid',
    subtitle: 'Calzado para Mujer y Hombre',
    category: 'shoes',
    gender: 'Unisex',
    price: 145,
    originalPrice: 165,
    badge: 'DESCUENTO',
    image: '/assets/jordan/jordan4.jpg',
    gallery: [
      '/assets/jordan/jordan4.jpg',
      '/assets/jordan/jordan1.jpg'
    ],
    colors: [
      { name: 'Bred Classic', hex: '#991b1b', image: '/assets/jordan/jordan4.jpg' },
      { name: 'Sail White', hex: '#fef08a', image: '/assets/jordan/jordan5.jpg' }
    ],
    sizes: [38, 39, 40, 41, 42, 43],
    height: 'Media',
    technology: ['Air Encapsulada', 'Cuero sintético y genuino'],
    features: ['Versatilidad para uso diario', 'Perfil medio equilibrado'],
    description: 'Inspirado en el AJ1 original, este modelo de perfil medio ofrece una estética urbana limpia con acentos en contraste y comodidad durante toda la jornada.',
    rating: 4.6,
    reviewCount: 114,
    inStock: true,
    createdAt: '2026-02-05'
  },
  {
    id: 'prod-006',
    name: 'Air Jordan 1 Elevate High',
    subtitle: 'Calzado con Plataforma para Mujer',
    category: 'shoes',
    gender: 'Mujer',
    price: 180,
    badge: 'EDICIÓN LIMITADA',
    image: '/assets/jordan/jordan5.jpg',
    gallery: [
      '/assets/jordan/jordan5.jpg',
      '/assets/jordan/jordan.jpg'
    ],
    colors: [
      { name: 'Vintage Sail Red', hex: '#b91c1c', image: '/assets/jordan/jordan5.jpg' },
      { name: 'Pure White', hex: '#ffffff', image: '/assets/jordan/jordan.jpg' }
    ],
    sizes: [36, 37, 38, 39, 40, 41],
    height: 'Alta',
    technology: ['Entresuela Elevada Foam', 'Cierre lateral con cremallera', 'Air Sole'],
    features: ['Plataforma moderna', 'Cremallera medial para poner fácilmente'],
    description: 'Lleva tu estilo a nuevas alturas con una entresuela de plataforma audaz combinada con la legendaria silueta de caña alta. Diseño sofisticado y vanguardista.',
    rating: 4.9,
    reviewCount: 63,
    inStock: true,
    createdAt: '2026-02-12'
  },
  {
    id: 'prod-007',
    name: 'Blessed Sandal Leather Luxe',
    subtitle: 'Sandalia de Piel Hecha a Mano',
    category: 'sandals',
    gender: 'Hombre',
    price: 95,
    badge: 'EDICIÓN LIMITADA',
    image: '/assets/slide/slide.png',
    gallery: [
      '/assets/slide/slide.png'
    ],
    colors: [
      { name: 'Cuero Castaño', hex: '#582f0e', image: '/assets/slide/slide.png' },
      { name: 'Verde Bosque Blessed', hex: '#0B3B24', image: '/assets/slide/slide.png' }
    ],
    sizes: [39, 40, 41, 42, 43, 44, 45],
    height: 'Baja',
    technology: ['Piel Nobuk Genuina', 'Suela de Caucho Vulcanizado', 'Plantilla de Corcho'],
    features: ['Acabados artesanales', 'Se amolda a la huella de tu pie', 'Hebilla dorada'],
    description: 'La máxima expresión del lujo relajado. Elaborada artesanalmente con pieles seleccionadas y entresuela de corcho natural que se adapta a tu pisada con el tiempo.',
    rating: 5.0,
    reviewCount: 41,
    inStock: true,
    createdAt: '2026-02-15'
  },
  {
    id: 'prod-008',
    name: 'Air Jordan 11 CMFT Low',
    subtitle: 'Calzado Ligero de Verano',
    category: 'shoes',
    gender: 'Hombre',
    price: 135,
    originalPrice: 160,
    badge: 'DESCUENTO',
    image: '/assets/jordan/jordan3-preview.jpg',
    gallery: [
      '/assets/jordan/jordan3-preview.jpg',
      '/assets/jordan/jordan.jpg'
    ],
    colors: [
      { name: 'White & Crimson', hex: '#ef4444', image: '/assets/jordan/jordan3-preview.jpg' },
      { name: 'Black Patent', hex: '#000000', image: '/assets/jordan/jordan4.jpg' }
    ],
    sizes: [39, 40, 41, 42, 43, 44],
    height: 'Baja',
    technology: ['Espuma Cushlon Perforada', 'Puntera de Charol Suave', 'Goma con Tracción'],
    features: ['Ultraligero y flexible', 'Perforaciones para máxima ventilación'],
    description: 'Una reinterpretación de corte bajo pensada para el confort urbano diario. Incorpora espuma Cushlon suave y una estética limpia inspirada en los campeonatos de Chicago.',
    rating: 4.8,
    reviewCount: 89,
    inStock: true,
    createdAt: '2026-01-10'
  },
  {
    id: 'prod-009',
    name: 'Blessed Slide Foam Runner',
    subtitle: 'Sandalia Deportiva Recuperación',
    category: 'sandals',
    gender: 'Mujer',
    price: 55,
    badge: 'NUEVO',
    image: '/assets/slide/slide.png',
    gallery: [
      '/assets/slide/slide.png'
    ],
    colors: [
      { name: 'Blanco Nube', hex: '#ffffff', image: '/assets/slide/slide.png' },
      { name: 'Oro Arena', hex: '#d2b588', image: '/assets/slide/slide.png' }
    ],
    sizes: [36, 37, 38, 39, 40, 41],
    height: 'Baja',
    technology: ['Recovery Foam', 'Ranuras Flexibles Wave', 'Tratamiento Antibacteriano'],
    features: ['Alivio post-entrenamiento', 'Diseño ergonómico envolvente'],
    description: 'Diseñada específicamente para descanso y recuperación muscular. Su estructura de una sola pieza envuelve el arco plantar brindando una sensación flotante al caminar.',
    rating: 4.9,
    reviewCount: 152,
    inStock: true,
    createdAt: '2026-02-14'
  }
];
