import { PrismaClient } from '@prisma/client';
import { MOCK_PRODUCTS } from '../src/data/mockProducts';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // 1. Limpieza opcional de tablas previas
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.paymentCard.deleteMany();
  await prisma.userCoupon.deleteMany();
  await prisma.promoUsage.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.productSize.deleteMany();
  await prisma.productColor.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  // 2. Crear Categorías
  const catShoes = await prisma.category.create({
    data: {
      name: 'Zapatillas Jordan & Sneaker',
      slug: 'shoes',
      description: 'Calzado exclusivo, ediciones retro Jordan y sneakers contemporáneos.',
      image: '/assets/jordan/jordan1.jpg'
    }
  });

  const catSandals = await prisma.category.create({
    data: {
      name: 'Blessed Sandals & Slides',
      slug: 'sandals',
      description: 'Sandalias y slides ergonómicas diseñadas para máximo confort.',
      image: '/assets/sandalias/slide-white.png'
    }
  });

  console.log('✅ Categorías creadas.');

  // 3. Crear Usuario Demo
  const user = await prisma.user.create({
    data: {
      email: 'alexander@blessed.com',
      passwordHash: '$2b$10$demoHashedPasswordForDevEnvironment1234567890',
      name: 'Alexander Garay',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      phone: '+503 7000-0000',
      role: 'ADMIN',
      addresses: {
        create: {
          fullName: 'Alexander Garay',
          phone: '+503 7000-0000',
          street: 'Avenida Las Palmas #123, Colonia Escalón',
          city: 'San Salvador',
          state: 'San Salvador',
          postalCode: '1101',
          country: 'SV',
          isDefault: true
        }
      },
      paymentCards: {
        create: {
          cardHolder: 'Alexander Garay',
          brand: 'VISA',
          last4: '4242',
          expMonth: 12,
          expYear: 2028,
          isDefault: true
        }
      }
    }
  });

  console.log(`✅ Usuario demo creado: ${user.email}`);

  // 4. Crear Códigos Promocionales
  const promos = [
    {
      code: 'BIENVENIDA5',
      description: '5% de descuento exclusivo para cuenta nueva (1 solo uso)',
      discountType: 'PERCENTAGE' as const,
      discountValue: 5,
      minPurchase: 0,
      onePerUser: true,
      isWelcomeOnly: true,
      isActive: true
    },
    {
      code: 'BLESSED10',
      description: '10% de descuento en toda la tienda (1 uso por persona)',
      discountType: 'PERCENTAGE' as const,
      discountValue: 10,
      minPurchase: 30,
      onePerUser: true,
      isWelcomeOnly: false,
      isActive: true
    },
    {
      code: 'BLESSED20',
      description: '20% de descuento para miembros VIP (1 uso por persona)',
      discountType: 'PERCENTAGE' as const,
      discountValue: 20,
      minPurchase: 100,
      onePerUser: true,
      isWelcomeOnly: false,
      isActive: true
    },
    {
      code: 'WILD15',
      description: '15% de descuento en colección Blessed Wild (1 uso por persona)',
      discountType: 'PERCENTAGE' as const,
      discountValue: 15,
      minPurchase: 50,
      onePerUser: true,
      isWelcomeOnly: false,
      isActive: true
    },
    {
      code: 'VERANO25',
      description: '$25 de descuento en compras superiores a $120 (1 uso por persona)',
      discountType: 'FIXED' as const,
      discountValue: 25,
      minPurchase: 120,
      onePerUser: true,
      isWelcomeOnly: false,
      isActive: true
    }
  ];

  const createdPromos: Record<string, string> = {};
  for (const promo of promos) {
    const cp = await prisma.promoCode.create({ data: promo });
    createdPromos[promo.code] = cp.id;
  }

  // Asignar únicamente cupón de bienvenida BIENVENIDA5 a la cuenta del usuario demo
  if (createdPromos['BIENVENIDA5']) {
    await prisma.userCoupon.create({
      data: {
        userId: user.id,
        promoCodeId: createdPromos['BIENVENIDA5'],
        isUsed: false
      }
    });
  }

  console.log(`✅ ${promos.length} Códigos promocionales creados. Cupón de bienvenida BIENVENIDA5 asociado a la cuenta demo.`);

  // 5. Crear Productos con Colores y Tallas
  for (const prod of MOCK_PRODUCTS) {
    const categoryId = prod.category === 'sandals' ? catSandals.id : catShoes.id;

    await prisma.product.create({
      data: {
        id: prod.id,
        name: prod.name,
        slug: prod.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        subtitle: prod.subtitle,
        description: prod.description,
        price: prod.price,
        badge: prod.badge || null,
        gender: prod.gender || 'Unisex',
        height: prod.height || null,
        image: prod.image,
        model3dUrl: prod.model3dUrl || null,
        inStock: prod.inStock ?? true,
        featured: prod.badge === 'MÁS VENDIDO' || prod.badge === 'DESTACADO',
        categoryId,
        colors: {
          create: prod.colors.map((c) => ({
            name: c.name,
            hex: c.hex,
            image: c.image || null
          }))
        },
        sizes: {
          create: prod.sizes.map((s) => ({
            size: s,
            stock: 20
          }))
        }
      }
    });
  }

  console.log(`✅ ${MOCK_PRODUCTS.length} Productos importados con relaciones.`);

  // 6. Crear Orden Demo y Reseña para el Usuario
  const firstProd = MOCK_PRODUCTS[0];
  const demoOrder = await prisma.order.create({
    data: {
      orderNumber: 'BLS-2026-94812',
      userId: user.id,
      status: 'DELIVERED',
      subtotal: 139.99,
      discount: 14.0,
      shipping: 0,
      total: 125.99,
      promoCodeId: createdPromos['BLESSED10'] || null,
      notes: 'Entregar en caseta de seguridad, Residencial Las Palmas',
      items: {
        create: {
          productId: firstProd.id,
          size: 9.0,
          color: 'Blanco Puro',
          quantity: 1,
          unitPrice: 139.99,
          total: 139.99
        }
      }
    }
  });

  await prisma.review.create({
    data: {
      userId: user.id,
      productId: firstProd.id,
      rating: 5,
      comment: 'Calidad inmejorable, la espuma ergonómica es comodísima. Llegó rápido a San Salvador.'
    }
  });

  await prisma.wishlist.create({
    data: {
      userId: user.id,
      productId: MOCK_PRODUCTS[1].id
    }
  });

  console.log(`✅ Orden demo y reseña creadas: ${demoOrder.orderNumber}`);
  console.log('🎉 Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
