import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const prisma = new PrismaClient();

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9002',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin123'
  },
  forcePathStyle: true
});

const S3_BUCKET = process.env.S3_BUCKET || 'ecommerce-assets';
const S3_PUBLIC_BASE = `http://localhost:9002/${S3_BUCKET}`;

interface StockMetadata {
  slug: string;
  categorySlug: 'sandals' | 'shoes';
  subtitle: string;
  description: string;
  badge: 'MÁS VENDIDO' | 'NUEVO' | 'DESTACADO' | 'EDICIÓN LIMITADA' | 'DESCUENTO' | 'POPULAR';
  gender: 'Unisex' | 'Hombre' | 'Mujer';
  height: 'Baja' | 'Media' | 'Alta' | null;
  featured: boolean;
  colorName: string;
  colorHex: string;
  preferredCoverFile?: string;
  sizes: number[];
}

const PRODUCT_METADATA: Record<string, StockMetadata> = {
  'Adidas Adilette': {
    slug: 'adidas-adilette-slide',
    categorySlug: 'sandals',
    subtitle: 'Sandalia Ergonómica Adilette 22 Slides',
    description: 'Icónico diseño anatómico Adilette con acabado topográfico 3D de inspiración planetaria. Su estructura de espuma biológica moldeada ofrece confort superior y absorción duradera del impacto en cada pisada.',
    badge: 'MÁS VENDIDO',
    gender: 'Unisex',
    height: null,
    featured: true,
    colorName: 'Carbon Grey',
    colorHex: '#434343',
    preferredCoverFile: 'image copy 2.png',
    sizes: [38, 39, 40, 41, 42, 43, 44]
  },
  'Adidas Aqua Slide': {
    slug: 'adidas-aqua-slide',
    categorySlug: 'sandals',
    subtitle: 'Sandalia Impermeable de Confort Quick-Dry',
    description: 'Diseño monocromático en tono verde menta salvia confeccionado en espuma EVA moldeada de secado ultra rápido. Perfecta para ducha, piscina o días de relax con plantilla Cloudfoam integrada.',
    badge: 'NUEVO',
    gender: 'Unisex',
    height: null,
    featured: true,
    colorName: 'Sage Aqua',
    colorHex: '#506c69',
    preferredCoverFile: 'image.png',
    sizes: [38, 39, 40, 41, 42, 43, 44]
  },
  'Adidas Campus Bad bunny': {
    slug: 'adidas-campus-bad-bunny',
    categorySlug: 'shoes',
    subtitle: 'Edición Colaborativa Limitada "Chalk White"',
    description: 'Colaboración exclusiva de Bad Bunny sobre la clásica silueta Campus. Incorpora confección acolchada en gamuza prémium, lengüeta doble desmontable con el tercer ojo emblemático y suela chunky vulcanizada de estética retro.',
    badge: 'EDICIÓN LIMITADA',
    gender: 'Unisex',
    height: 'Baja',
    featured: true,
    colorName: 'Chalk Sand',
    colorHex: '#bbb1a1',
    preferredCoverFile: 'image.png',
    sizes: [38, 39, 40, 41, 42, 43, 44, 45]
  },
  'Adidas Confort 2.0': {
    slug: 'adidas-confort-2-0',
    categorySlug: 'sandals',
    subtitle: 'Sandalia Ultra Confort Cloudfoam Plus 2.0',
    description: 'Segunda generación de confort legendario. Presenta banda superior acolchada de microfibra, plantilla contorneada de espuma viscoelástica para soporte del arco plantar y base ligera de amortiguación responsiva.',
    badge: 'NUEVO',
    gender: 'Unisex',
    height: null,
    featured: false,
    colorName: 'Pearl Grey',
    colorHex: '#c2bbb1',
    preferredCoverFile: 'image.png',
    sizes: [38, 39, 40, 41, 42, 43, 44]
  },
  'Adidas confort': {
    slug: 'adidas-confort-classic',
    categorySlug: 'sandals',
    subtitle: 'Slide Deportivo Clásico con Amortiguación Cloudfoam',
    description: 'El slide atlético por excelencia de adidas con plantilla suave Cloudfoam y las emblemáticas 3 bandas en contraste blanco y negro. Ideal para descanso post-partido y uso relajado diario.',
    badge: 'MÁS VENDIDO',
    gender: 'Unisex',
    height: null,
    featured: false,
    colorName: 'Core Black',
    colorHex: '#1e2022',
    preferredCoverFile: 'image.png',
    sizes: [38, 39, 40, 41, 42, 43, 44]
  },
  'Adilette Lumia Slides': {
    slug: 'adilette-lumia-slides',
    categorySlug: 'sandals',
    subtitle: 'Sandalia Ergonómica Urbana Estilo Lumia',
    description: 'Diseño futurista con estructura geométrica aerodinámica y ranuras de flexión optimizadas en la suela. Material EVA de alta densidad resistente al agua, desgaste y abrasión diaria.',
    badge: 'DESTACADO',
    gender: 'Unisex',
    height: null,
    featured: false,
    colorName: 'Matte Charcoal',
    colorHex: '#2b2c2e',
    preferredCoverFile: 'image.png',
    sizes: [38, 39, 40, 41, 42, 43, 44]
  },
  'Air Jordan 1': {
    slug: 'air-jordan-1-crimson-heritage',
    categorySlug: 'shoes',
    subtitle: 'Zapatilla Urbana High Heritage Edition',
    description: 'El estilo legendario que transformó la cultura sneaker en 1985 con una llamativa combinación en tonos vino tinto y blanco puro. Confeccionada con cuero auténtico prémium y unidad Air-Sole encapsulada.',
    badge: 'DESTACADO',
    gender: 'Hombre',
    height: 'Alta',
    featured: true,
    colorName: 'Bordeaux Crimson',
    colorHex: '#8e4b53',
    preferredCoverFile: 'image.png',
    sizes: [39, 40, 41, 42, 43, 44, 45]
  },
  'Cambpion Red Slide': {
    slug: 'cambpion-red-slide',
    categorySlug: 'sandals',
    subtitle: 'Sandalia Atlética Bold Scarlet Red',
    description: 'Intenso color rojo escarlata con el clásico logotipo Champion moldeado en relieve sobre la banda superior. Correa acolchada de secado rápido y plantilla anatómica con soporte antideslizante.',
    badge: 'POPULAR',
    gender: 'Unisex',
    height: null,
    featured: false,
    colorName: 'Scarlet Red',
    colorHex: '#d32f2f',
    preferredCoverFile: 'image copy.png',
    sizes: [38, 39, 40, 41, 42, 43, 44]
  },
  'Champion All America': {
    slug: 'champion-all-america',
    categorySlug: 'sandals',
    subtitle: 'Sandalia Colegial Retro All American Heritage',
    description: 'Tributo al espíritu deportivo y colegial universitario estadounidense. Correa ancha acolchada con tipografía retro Champion All America sobre una base ergonómica de absorción de impacto.',
    badge: 'EDICIÓN LIMITADA',
    gender: 'Unisex',
    height: null,
    featured: true,
    colorName: 'Navy College',
    colorHex: '#223254',
    preferredCoverFile: 'image.png',
    sizes: [38, 39, 40, 41, 42, 43, 44]
  },
  'Champion Black Slide': {
    slug: 'champion-black-slide',
    categorySlug: 'sandals',
    subtitle: 'Sandalia Ergonómica Classic Athletic Slide',
    description: 'La sandalia casual más versátil y ligera de Champion. Silueta en color negro con logo en contraste blanco, plantilla acanalada y suela con relieve de máxima adherencia sobre cualquier superficie.',
    badge: 'DESCUENTO',
    gender: 'Unisex',
    height: null,
    featured: false,
    colorName: 'Classic Black',
    colorHex: '#1b1c1e',
    preferredCoverFile: 'image.png',
    sizes: [38, 39, 40, 41, 42, 43, 44]
  },
  'Jordan 1 Retro OG': {
    slug: 'jordan-1-retro-og-vintage',
    categorySlug: 'shoes',
    subtitle: 'Zapatilla Urbana High OG Vintage Edition',
    description: 'Silueta legendaria con acabados en nobuk tono café moca y piel blanca premium. Cuenta con amortiguación Air encapsulada, tobillera alta acolchada para máxima estabilidad y detalles retro de la era dorada del baloncesto.',
    badge: 'MÁS VENDIDO',
    gender: 'Hombre',
    height: 'Alta',
    featured: true,
    colorName: 'Dark Mocha',
    colorHex: '#7d5e3f',
    preferredCoverFile: 'image.png',
    sizes: [39, 40, 41, 42, 43, 44, 45]
  },
  'Tacos nike mercurian': {
    slug: 'tacos-nike-mercurian',
    categorySlug: 'shoes',
    subtitle: 'Botines de Fútbol Césped FG High Speed',
    description: 'Diseñados para desatar velocidad y aceleración explosiva. Empeine sintético con microrrelieve para control excepcional del balón a toda velocidad y suela de tacos cónicos para cambios de dirección fulgurantes.',
    badge: 'NUEVO',
    gender: 'Unisex',
    height: 'Baja',
    featured: true,
    colorName: 'Volt Lime',
    colorHex: '#b2d24c',
    preferredCoverFile: 'image copy.png',
    sizes: [38, 39, 40, 41, 42, 43, 44, 45]
  }
};

async function uploadFileToMinio(filePath: string, objectKey: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'application/octet-stream';

  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: objectKey,
      Body: fileBuffer,
      ContentType: contentType
    })
  );

  return `${S3_PUBLIC_BASE}/${objectKey}`;
}

async function main() {
  console.log('🚀 Iniciando proceso de carga de stock a MinIO y Base de Datos...');

  const stockBaseDir = path.resolve('assets/stock');
  if (!fs.existsSync(stockBaseDir)) {
    throw new Error(`Directorio de stock no encontrado: ${stockBaseDir}`);
  }

  // Obtener categorías desde la base de datos
  const categories = await prisma.category.findMany();
  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    categoryMap.set(c.slug, c.id);
  }

  const catSandalsId = categoryMap.get('sandals');
  const catShoesId = categoryMap.get('shoes');

  if (!catSandalsId || !catShoesId) {
    throw new Error('No se encontraron las categorías principales (sandals/shoes) en la BD.');
  }

  const entries = fs.readdirSync(stockBaseDir, { withFileTypes: true });
  const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  console.log(`📁 Encontradas ${folders.length} carpetas de stock en assets/stock.`);

  let showcaseCounter = 1;
  const processedProducts: string[] = [];

  for (const folderName of folders) {
    const parts = folderName.split('-').map((s) => s.trim());
    const rawName = parts[0];
    const price = parseFloat(parts[1]);

    if (isNaN(price)) {
      console.warn(`⚠️ Omitiendo carpeta sin precio válido: "${folderName}"`);
      continue;
    }

    const meta = PRODUCT_METADATA[rawName];
    if (!meta) {
      console.warn(`⚠️ No se encontró metadata preconfigurada para "${rawName}". Usando valores por defecto.`);
    }

    const slug = meta?.slug || rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const categoryId = meta?.categorySlug === 'shoes' ? catShoesId : catSandalsId;
    const folderPath = path.join(stockBaseDir, folderName);
    const files = fs.readdirSync(folderPath).filter((f) => !f.startsWith('.'));

    console.log(`\n======================================================`);
    console.log(`📦 Procesando: "${rawName}" | Precio: $${price} | Slug: ${slug}`);
    console.log(`   Archivos encontrados: ${files.join(', ')}`);

    // 1. Identificar imagen carrucel si existe
    let carouselFile: string | null = null;
    const remainingFiles: string[] = [];

    for (const f of files) {
      const lower = f.toLowerCase();
      if (lower.includes('carrucel') || lower.includes('carrusel') || lower.includes('carousel')) {
        carouselFile = f;
      } else {
        remainingFiles.push(f);
      }
    }

    // 2. Subir carrucel.png a MinIO si existe
    let carouselUrl: string | null = null;
    let showcaseActive = false;
    let showcaseOrder = 0;

    if (carouselFile) {
      const carouselPath = path.join(folderPath, carouselFile);
      const cleanCarKey = `stock-${slug}-carousel-${Date.now()}.png`;
      carouselUrl = await uploadFileToMinio(carouselPath, cleanCarKey);
      showcaseActive = true;
      showcaseOrder = showcaseCounter++;
      console.log(`   🎠 Carrucel detectado y subido: ${carouselFile} -> ${carouselUrl}`);
    } else {
      console.log(`   ℹ️ No se detectó imagen de carrucel para este producto.`);
    }

    // 3. Ordenar archivos restantes: cover primero, luego el resto
    remainingFiles.sort((a, b) => {
      if (meta?.preferredCoverFile) {
        if (a === meta.preferredCoverFile) return -1;
        if (b === meta.preferredCoverFile) return 1;
      }
      if (a === 'image.png') return -1;
      if (b === 'image.png') return 1;
      return a.localeCompare(b);
    });

    // 4. Subir todas las imágenes restantes a MinIO
    const uploadedUrls: { filename: string; url: string }[] = [];
    for (const f of remainingFiles) {
      const fPath = path.join(folderPath, f);
      const cleanName = f.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
      const objectKey = `stock-${slug}-${Date.now()}-${cleanName}`;
      const url = await uploadFileToMinio(fPath, objectKey);
      uploadedUrls.push({ filename: f, url });
      console.log(`   📤 Subido a MinIO: ${f} -> ${url}`);
    }

    // Si por alguna razón no hay archivos restantes pero hay carrucel, usar carrucel
    const coverUrl = uploadedUrls[0]?.url || carouselUrl || '';
    const galleryUrls = uploadedUrls.map((u) => u.url);

    // 5. Preparar datos para PostgreSQL
    const originalPrice = meta ? Math.round(price * 1.2) : price + 10;
    const subtitle = meta?.subtitle || `Edición Especial Confort & Estilo`;
    const description = meta?.description || `Producto oficial de alta calidad con materiales prémium y diseño ergonómico de vanguardia. Diseñado para máximo confort, durabilidad y tracción.`;
    const badge = meta?.badge || 'NUEVO';
    const gender = meta?.gender || 'Unisex';
    const height = meta?.height || null;
    const featured = meta?.featured || false;
    const colorName = meta?.colorName || 'Original';
    const colorHex = meta?.colorHex || '#111827';
    const sizesList = meta?.sizes || [38, 39, 40, 41, 42, 43, 44];

    // 6. Insertar o actualizar producto en PostgreSQL
    // Verificar si ya existe por slug
    const existing = await prisma.product.findUnique({
      where: { slug },
      include: { colors: true, sizes: true }
    });

    let productRecord;

    if (existing) {
      console.log(`   🔄 Actualizando producto existente con ID: ${existing.id}...`);
      // Limpiar colores y tallas previos para no duplicar relaciones
      await prisma.productColor.deleteMany({ where: { productId: existing.id } });
      await prisma.productSize.deleteMany({ where: { productId: existing.id } });

      productRecord = await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: rawName,
          subtitle,
          description,
          price,
          originalPrice,
          badge,
          gender,
          height,
          image: coverUrl,
          gallery: galleryUrls,
          carouselImage: carouselUrl,
          showcaseActive,
          showcaseOrder,
          inStock: true,
          featured,
          categoryId,
          colors: {
            create: [
              {
                name: colorName,
                hex: colorHex,
                image: coverUrl,
                gallery: galleryUrls,
                price,
                originalPrice
              }
            ]
          },
          sizes: {
            create: sizesList.map((s) => ({
              size: s,
              stock: 20
            }))
          }
        }
      });
    } else {
      console.log(`   ✨ Creando nuevo producto en la base de datos...`);
      productRecord = await prisma.product.create({
        data: {
          name: rawName,
          slug,
          subtitle,
          description,
          price,
          originalPrice,
          badge,
          gender,
          height,
          image: coverUrl,
          gallery: galleryUrls,
          carouselImage: carouselUrl,
          showcaseActive,
          showcaseOrder,
          inStock: true,
          featured,
          categoryId,
          colors: {
            create: [
              {
                name: colorName,
                hex: colorHex,
                image: coverUrl,
                gallery: galleryUrls,
                price,
                originalPrice
              }
            ]
          },
          sizes: {
            create: sizesList.map((s) => ({
              size: s,
              stock: 20
            }))
          }
        }
      });
    }

    console.log(`   ✅ Guardado exitoso: ID=${productRecord.id} | Slug=${productRecord.slug} | Total Tallas=${sizesList.length}`);
    processedProducts.push(productRecord.name);
  }

  console.log(`\n🎉 PROCESO COMPLETADO EXITOSAMENTE`);
  console.log(`Total productos procesados y registrados: ${processedProducts.length}`);
  console.log(processedProducts.map((p, i) => ` ${i + 1}. ${p}`).join('\n'));
}

main()
  .catch((err) => {
    console.error('❌ Error ejecutando población de stock:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
