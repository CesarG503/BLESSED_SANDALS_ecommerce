import type { Plugin, ViteDevServer } from 'vite';
import { prisma } from '../lib/prisma';
import { MOCK_PRODUCTS } from '../data/mockProducts';
import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';

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

async function checkIsAdmin(req: IncomingMessage, parsedUrl: URL, bodyUserId?: string): Promise<boolean> {
  const userId = (req.headers['x-user-id'] as string) || parsedUrl.searchParams.get('userId') || bodyUserId;
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN';
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

export function apiPlugin(): Plugin {
  return {
    name: 'ecommerce-api-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const reqUrl = req.url || '';
        if (!reqUrl.startsWith('/api/')) {
          return next();
        }

        // Manejo de preflight CORS
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          return res.end();
        }

        const parsedUrl = new URL(reqUrl, `http://${req.headers.host || 'localhost'}`);
        const pathname = parsedUrl.pathname;

        try {
          // ==================================================================
          // RUTAS DE AUTENTICACIÓN
          // ==================================================================

          // 1. POST /api/auth/login
          if (pathname === '/api/auth/login' && req.method === 'POST') {
            const body = await parseBody(req);
            const email = (body.email || '').trim().toLowerCase();
            const password = (body.password || '').trim();

            if (!email) {
              return sendJson(res, 400, { success: false, message: 'El correo electrónico es requerido.' });
            }

            let user = await prisma.user.findUnique({
              where: { email },
              include: {
                userCoupons: {
                  include: { promoCode: true },
                  orderBy: { claimedAt: 'desc' }
                }
              }
            });

            if (!user) {
              // Si el usuario no existe en la BD, lo invitamos a registrarse
              return sendJson(res, 404, {
                success: false,
                requireRegister: true,
                message: 'No encontramos una cuenta con este correo. Por favor regístrate para crear tu cuenta y desbloquear tu cupón de bienvenida BIENVENIDA5.'
              });
            }

            // Si es usuario admin y se envió contraseña, verificar que coincida
            if (user.role === 'ADMIN' && password && user.passwordHash && password !== user.passwordHash) {
              return sendJson(res, 401, {
                success: false,
                message: 'Contraseña incorrecta para el usuario administrador.'
              });
            }

            return sendJson(res, 200, {
              success: true,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                createdAt: user.createdAt.toISOString(),
                userCoupons: user.userCoupons.map((uc) => ({
                  id: uc.id,
                  userId: uc.userId,
                  promoCodeId: uc.promoCodeId,
                  isUsed: uc.isUsed,
                  usedAt: uc.usedAt?.toISOString(),
                  claimedAt: uc.claimedAt.toISOString(),
                  promoCode: uc.promoCode
                }))
              },
              message: `¡Bienvenido de nuevo, ${user.name}!`
            });
          }

          // 2. POST /api/auth/register
          if (pathname === '/api/auth/register' && req.method === 'POST') {
            const body = await parseBody(req);
            const email = (body.email || '').trim().toLowerCase();
            const name = (body.name || '').trim();
            const phone = body.phone ? body.phone.trim() : null;

            if (!email || !name) {
              return sendJson(res, 400, {
                success: false,
                message: 'Nombre y correo electrónico son requeridos para el registro.'
              });
            }

            // Verificar si el usuario ya existe
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
              return sendJson(res, 409, {
                success: false,
                requireLogin: true,
                message: 'Este correo electrónico ya está registrado. Por favor inicia sesión.'
              });
            }

            // Crear el nuevo usuario en PostgreSQL
            const newUser = await prisma.user.create({
              data: {
                email,
                name,
                phone,
                passwordHash: '$2b$10$hashedSecureUserPasswordDemo1234567890',
                role: 'USER',
                avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`
              }
            });

            // Buscar o crear el cupón de bienvenida oficial BIENVENIDA5
            let welcomePromo = await prisma.promoCode.findUnique({
              where: { code: 'BIENVENIDA5' }
            });

            if (!welcomePromo) {
              welcomePromo = await prisma.promoCode.create({
                data: {
                  code: 'BIENVENIDA5',
                  description: '5% de descuento exclusivo para cuenta nueva (1 solo uso)',
                  discountType: 'PERCENTAGE',
                  discountValue: 5,
                  minPurchase: 0,
                  onePerUser: true,
                  isWelcomeOnly: true,
                  isActive: true
                }
              });
            }

            // REGLA CLAVE: "una vez te registras por primera vez ya lo puedes agregar a tu cuenta los cupones de descuentos se agregan a la cuenta personal"
            // Vinculamos automáticamente el cupón BIENVENIDA5 a la cuenta personal del nuevo usuario
            const userCoupon = await prisma.userCoupon.create({
              data: {
                userId: newUser.id,
                promoCodeId: welcomePromo.id,
                isUsed: false
              },
              include: { promoCode: true }
            });

            return sendJson(res, 201, {
              success: true,
              isFirstTime: true,
              user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                avatar: newUser.avatar,
                role: newUser.role,
                createdAt: newUser.createdAt.toISOString(),
                userCoupons: [
                  {
                    id: userCoupon.id,
                    userId: userCoupon.userId,
                    promoCodeId: userCoupon.promoCodeId,
                    isUsed: userCoupon.isUsed,
                    usedAt: userCoupon.usedAt?.toISOString(),
                    claimedAt: userCoupon.claimedAt.toISOString(),
                    promoCode: userCoupon.promoCode
                  }
                ]
              },
              welcomeCoupon: welcomePromo,
              message: `¡Registro exitoso! Te hemos agregado el cupón de bienvenida BIENVENIDA5 (5% OFF) a tu cuenta personal.`
            });
          }

          // 3. GET /api/auth/me
          if (pathname === '/api/auth/me' && req.method === 'GET') {
            const userId = parsedUrl.searchParams.get('userId');
            if (!userId) {
              return sendJson(res, 401, { success: false, message: 'No autenticado.' });
            }

            const user = await prisma.user.findUnique({
              where: { id: userId },
              include: {
                userCoupons: {
                  include: { promoCode: true },
                  orderBy: { claimedAt: 'desc' }
                }
              }
            });

            if (!user) {
              return sendJson(res, 404, { success: false, message: 'Usuario no encontrado.' });
            }

            return sendJson(res, 200, {
              success: true,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                createdAt: user.createdAt.toISOString(),
                userCoupons: user.userCoupons.map((uc) => ({
                  id: uc.id,
                  userId: uc.userId,
                  promoCodeId: uc.promoCodeId,
                  isUsed: uc.isUsed,
                  usedAt: uc.usedAt?.toISOString(),
                  claimedAt: uc.claimedAt.toISOString(),
                  promoCode: uc.promoCode
                }))
              }
            });
          }

          // ==================================================================
          // RUTAS DE PERFIL INTEGRAL, DIRECCIONES (EL SALVADOR), TARJETAS, ETC.
          // ==================================================================

          // GET /api/user/profile (Información completa de cuenta, órdenes, cupones, tarjetas, direcciones)
          if (pathname === '/api/user/profile' && req.method === 'GET') {
            const userId = parsedUrl.searchParams.get('userId');
            if (!userId) {
              return sendJson(res, 401, { success: false, message: 'Usuario no especificado.' });
            }

            const user = await prisma.user.findUnique({
              where: { id: userId },
              include: {
                addresses: { orderBy: { createdAt: 'desc' } },
                paymentCards: { orderBy: { createdAt: 'desc' } },
                orders: {
                  include: {
                    items: {
                      include: { product: true }
                    },
                    promoCode: true
                  },
                  orderBy: { createdAt: 'desc' }
                },
                reviews: {
                  include: { product: true },
                  orderBy: { createdAt: 'desc' }
                },
                wishlist: {
                  include: { product: true },
                  orderBy: { addedAt: 'desc' }
                },
                userCoupons: {
                  include: { promoCode: true },
                  orderBy: { claimedAt: 'desc' }
                }
              }
            });

            if (!user) {
              return sendJson(res, 404, { success: false, message: 'Perfil de usuario no encontrado.' });
            }

            return sendJson(res, 200, {
              success: true,
              data: {
                user: {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  phone: user.phone,
                  avatar: user.avatar,
                  role: user.role,
                  createdAt: user.createdAt.toISOString()
                },
                addresses: user.addresses.map((a) => ({
                  id: a.id,
                  fullName: a.fullName,
                  phone: a.phone,
                  street: a.street,
                  city: a.city,
                  state: a.state,
                  postalCode: a.postalCode,
                  country: a.country,
                  isDefault: a.isDefault,
                  createdAt: a.createdAt.toISOString()
                })),
                paymentCards: user.paymentCards.map((c) => ({
                  id: c.id,
                  cardHolder: c.cardHolder,
                  brand: c.brand,
                  last4: c.last4,
                  expMonth: c.expMonth,
                  expYear: c.expYear,
                  balance: Number(c.balance) || 0,
                  isDefault: c.isDefault,
                  createdAt: c.createdAt.toISOString()
                })),
                orders: user.orders.map((o) => ({
                  id: o.id,
                  orderNumber: o.orderNumber,
                  status: o.status,
                  subtotal: o.subtotal,
                  discount: o.discount,
                  shipping: o.shipping,
                  total: o.total,
                  notes: o.notes,
                  createdAt: o.createdAt.toISOString(),
                  promoCode: o.promoCode ? { code: o.promoCode.code, discountValue: o.promoCode.discountValue, discountType: o.promoCode.discountType } : null,
                  items: o.items.map((it) => ({
                    id: it.id,
                    productId: it.productId,
                    productName: it.product.name,
                    productImage: it.product.image,
                    productSubtitle: it.product.subtitle || '',
                    size: it.size,
                    color: it.color,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    total: it.total
                  }))
                })),
                reviews: user.reviews.map((r) => ({
                  id: r.id,
                  productId: r.productId,
                  productName: r.product.name,
                  productImage: r.product.image,
                  rating: r.rating,
                  comment: r.comment,
                  createdAt: r.createdAt.toISOString()
                })),
                wishlist: user.wishlist.map((w) => ({
                  id: w.id,
                  productId: w.productId,
                  product: {
                    id: w.product.id,
                    name: w.product.name,
                    price: w.product.price,
                    image: w.product.image,
                    badge: w.product.badge
                  },
                  addedAt: w.addedAt.toISOString()
                })),
                userCoupons: user.userCoupons.map((uc) => ({
                  id: uc.id,
                  userId: uc.userId,
                  promoCodeId: uc.promoCodeId,
                  isUsed: uc.isUsed,
                  usedAt: uc.usedAt?.toISOString(),
                  claimedAt: uc.claimedAt.toISOString(),
                  promoCode: uc.promoCode
                }))
              }
            });
          }

          // POST /api/user/update-info (Actualizar datos personales)
          if (pathname === '/api/user/update-info' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId, name, phone } = body;

            if (!userId) {
              return sendJson(res, 401, { success: false, message: 'Usuario no autenticado.' });
            }

            const updated = await prisma.user.update({
              where: { id: userId },
              data: {
                name: name ? name.trim() : undefined,
                phone: phone ? phone.trim() : undefined
              }
            });

            return sendJson(res, 200, {
              success: true,
              user: {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                phone: updated.phone,
                avatar: updated.avatar,
                role: updated.role,
                createdAt: updated.createdAt.toISOString()
              },
              message: 'Información personal actualizada correctamente.'
            });
          }

          // POST /api/user/addresses (Guardar dirección centrada en El Salvador)
          if (pathname === '/api/user/addresses' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId, fullName, phone, street, city, state, postalCode = '1101', isDefault = false } = body;

            if (!userId) {
              return sendJson(res, 401, { success: false, message: 'Usuario no autenticado.' });
            }
            if (!fullName || !phone || !street || !city || !state) {
              return sendJson(res, 400, { success: false, message: 'Por favor completa todos los campos requeridos de la dirección.' });
            }

            // Si es default, marcar las anteriores como false
            if (isDefault) {
              await prisma.address.updateMany({
                where: { userId },
                data: { isDefault: false }
              });
            }

            // Si es la primera dirección del usuario, marcar automáticamente como default
            const addressCount = await prisma.address.count({ where: { userId } });
            const setAsDefault = isDefault || addressCount === 0;

            const address = await prisma.address.create({
              data: {
                userId,
                fullName: fullName.trim(),
                phone: phone.trim(),
                street: street.trim(),
                city: city.trim(),
                state: state.trim(),
                postalCode: postalCode.trim(),
                country: 'SV',
                isDefault: setAsDefault
              }
            });

            return sendJson(res, 201, {
              success: true,
              address,
              message: '¡Dirección de envío en El Salvador guardada exitosamente!'
            });
          }

          // DELETE /api/user/addresses (Eliminar dirección)
          if (pathname === '/api/user/addresses' && req.method === 'DELETE') {
            const addressId = parsedUrl.searchParams.get('addressId');
            const userId = parsedUrl.searchParams.get('userId');

            if (!addressId || !userId) {
              return sendJson(res, 400, { success: false, message: 'ID de dirección y usuario requeridos.' });
            }

            await prisma.address.deleteMany({
              where: { id: addressId, userId }
            });

            return sendJson(res, 200, { success: true, message: 'Dirección eliminada correctamente.' });
          }

          // PUT /api/user/addresses/default (Establecer como dirección predeterminada)
          if (pathname === '/api/user/addresses/default' && req.method === 'PUT') {
            const body = await parseBody(req);
            const { userId, addressId } = body;

            if (!userId || !addressId) {
              return sendJson(res, 400, { success: false, message: 'ID de usuario y dirección requeridos.' });
            }

            await prisma.address.updateMany({
              where: { userId },
              data: { isDefault: false }
            });

            await prisma.address.updateMany({
              where: { id: addressId, userId },
              data: { isDefault: true }
            });

            return sendJson(res, 200, { success: true, message: 'Dirección predeterminada actualizada.' });
          }

          // POST /api/user/cards (Agregar tarjeta de crédito / débito con saldo Stripe Test)
          if (pathname === '/api/user/cards' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId, cardHolder, cardNumber, expMonth, expYear, balance = 500, isDefault = false } = body;

            if (!userId) {
              return sendJson(res, 401, { success: false, message: 'Usuario no autenticado.' });
            }
            if (!cardHolder || !cardNumber || !expMonth || !expYear) {
              return sendJson(res, 400, { success: false, message: 'Todos los datos de la tarjeta son obligatorios.' });
            }

            const cleanNumber = cardNumber.replace(/\D/g, '');
            const last4 = cleanNumber.slice(-4) || '1234';

            // Detección de marca
            let brand = 'VISA';
            if (cleanNumber.startsWith('5')) brand = 'MASTERCARD';
            else if (cleanNumber.startsWith('3')) brand = 'AMEX';

            if (isDefault) {
              await prisma.paymentCard.updateMany({
                where: { userId },
                data: { isDefault: false }
              });
            }

            const cardCount = await prisma.paymentCard.count({ where: { userId } });
            const setAsDefault = isDefault || cardCount === 0;

            const newCard = await prisma.paymentCard.create({
              data: {
                userId,
                cardHolder: cardHolder.trim().toUpperCase(),
                brand,
                last4,
                cardNumber: cleanNumber,
                cvc: body.cvc ? String(body.cvc).trim() : '123',
                expMonth: Number(expMonth),
                expYear: Number(expYear),
                balance: Number(balance) >= 0 ? Number(balance) : 500.0,
                isDefault: setAsDefault
              }
            });

            return sendJson(res, 201, {
              success: true,
              card: newCard,
              message: `Tarjeta ${brand} terminada en ${last4} guardada exitosamente con saldo de $${Number(newCard.balance).toFixed(2)}.`
            });
          }

          // DELETE /api/user/cards (Eliminar tarjeta)
          if (pathname === '/api/user/cards' && req.method === 'DELETE') {
            const cardId = parsedUrl.searchParams.get('cardId');
            const userId = parsedUrl.searchParams.get('userId');

            if (!cardId || !userId) {
              return sendJson(res, 400, { success: false, message: 'ID de tarjeta y usuario requeridos.' });
            }

            await prisma.paymentCard.deleteMany({
              where: { id: cardId, userId }
            });

            return sendJson(res, 200, { success: true, message: 'Tarjeta eliminada con éxito.' });
          }

          // POST /api/user/reviews (Agregar reseña de producto)
          if (pathname === '/api/user/reviews' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId, productId, rating = 5, comment } = body;

            if (!userId) {
              return sendJson(res, 401, { success: false, message: 'Usuario no autenticado.' });
            }
            if (!productId) {
              return sendJson(res, 400, { success: false, message: 'ID de producto requerido.' });
            }

            // Validar que el usuario haya adquirido este producto en al menos un pedido realizado
            const hasPurchased = await prisma.orderItem.findFirst({
              where: {
                productId,
                order: { userId }
              }
            });

            if (!hasPurchased) {
              return sendJson(res, 403, {
                success: false,
                message: 'Solo puedes calificar productos que hayas adquirido previamente en un pedido.'
              });
            }

            const review = await prisma.review.create({
              data: {
                userId,
                productId,
                rating: Number(rating) || 5,
                comment: comment ? comment.trim() : null
              },
              include: { product: true }
            });

            return sendJson(res, 201, {
              success: true,
              review,
              message: '¡Gracias por tu reseña! Ha sido publicada con éxito.'
            });
          }

          // ==================================================================
          // RUTAS DE LISTA DE DESEOS / FAVORITOS (VINCULADOS A CUENTA)
          // ==================================================================

          // GET /api/user/wishlist (Consultar lista de deseos del usuario)
          if (pathname === '/api/user/wishlist' && req.method === 'GET') {
            const userId = parsedUrl.searchParams.get('userId');
            if (!userId) {
              return sendJson(res, 400, { success: false, message: 'Usuario no especificado.' });
            }

            const items = await prisma.wishlist.findMany({
              where: { userId },
              include: { product: true },
              orderBy: { addedAt: 'desc' }
            });

            return sendJson(res, 200, {
              success: true,
              wishlist: items.map((w) => ({
                productId: w.productId,
                product: {
                  id: w.product.id,
                  name: w.product.name,
                  slug: w.product.slug,
                  subtitle: w.product.subtitle || '',
                  price: w.product.price,
                  originalPrice: w.product.originalPrice,
                  badge: w.product.badge,
                  gender: w.product.gender,
                  image: w.product.image,
                  inStock: w.product.inStock
                },
                addedAt: w.addedAt.toISOString()
              }))
            });
          }

          // POST /api/user/wishlist/toggle (Agregar o quitar de lista de deseos)
          if (pathname === '/api/user/wishlist/toggle' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId, productId } = body;

            if (!userId || !productId) {
              return sendJson(res, 400, { success: false, message: 'userId y productId son requeridos.' });
            }

            const existing = await prisma.wishlist.findUnique({
              where: {
                userId_productId: { userId, productId }
              }
            });

            let isAdded = false;
            if (existing) {
              await prisma.wishlist.delete({
                where: { id: existing.id }
              });
              isAdded = false;
            } else {
              await prisma.wishlist.create({
                data: { userId, productId }
              });
              isAdded = true;
            }

            const updated = await prisma.wishlist.findMany({
              where: { userId },
              include: { product: true },
              orderBy: { addedAt: 'desc' }
            });

            return sendJson(res, 200, {
              success: true,
              isAdded,
              message: isAdded ? 'Producto agregado a tus favoritos' : 'Producto retirado de tus favoritos',
              wishlist: updated.map((w) => ({
                productId: w.productId,
                product: {
                  id: w.product.id,
                  name: w.product.name,
                  slug: w.product.slug,
                  subtitle: w.product.subtitle || '',
                  price: w.product.price,
                  originalPrice: w.product.originalPrice,
                  badge: w.product.badge,
                  gender: w.product.gender,
                  image: w.product.image,
                  inStock: w.product.inStock
                },
                addedAt: w.addedAt.toISOString()
              }))
            });
          }

          // POST /api/user/wishlist/sync (Sincronizar items locales a la cuenta de usuario)
          if (pathname === '/api/user/wishlist/sync' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId, productIds = [] } = body;

            if (!userId) {
              return sendJson(res, 400, { success: false, message: 'Usuario no especificado.' });
            }

            for (const pId of productIds) {
              try {
                await prisma.wishlist.upsert({
                  where: {
                    userId_productId: { userId, productId: pId }
                  },
                  create: { userId, productId: pId },
                  update: {}
                });
              } catch {
                // Si el producto no existe o hay error, continuar
              }
            }

            const updated = await prisma.wishlist.findMany({
              where: { userId },
              include: { product: true },
              orderBy: { addedAt: 'desc' }
            });

            return sendJson(res, 200, {
              success: true,
              wishlist: updated.map((w) => ({
                productId: w.productId,
                product: {
                  id: w.product.id,
                  name: w.product.name,
                  slug: w.product.slug,
                  subtitle: w.product.subtitle || '',
                  price: w.product.price,
                  originalPrice: w.product.originalPrice,
                  badge: w.product.badge,
                  gender: w.product.gender,
                  image: w.product.image,
                  inStock: w.product.inStock
                },
                addedAt: w.addedAt.toISOString()
              }))
            });
          }

          // ==================================================================
          // RUTAS DE CARRITO / BOLSA DE COMPRAS (PERSISTENCIA POR USUARIO)
          // ==================================================================

          // GET /api/cart (Obtener la bolsa de compras guardada del usuario)
          if (pathname === '/api/cart' && req.method === 'GET') {
            const userId = parsedUrl.searchParams.get('userId');
            if (!userId) {
              return sendJson(res, 400, { success: false, message: 'Usuario no especificado.' });
            }

            const items = await prisma.cartItem.findMany({
              where: { userId },
              include: { product: true },
              orderBy: { createdAt: 'asc' }
            });

            return sendJson(res, 200, {
              success: true,
              cart: items.map((ci) => ({
                id: `${ci.productId}-${ci.size}-${ci.colorName}`,
                productId: ci.productId,
                size: ci.size,
                quantity: ci.quantity,
                color: {
                  name: ci.colorName,
                  hex: ci.colorHex || '#000000',
                  image: ci.colorImage || ci.product.image
                },
                product: {
                  id: ci.product.id,
                  name: ci.product.name,
                  price: ci.product.price,
                  originalPrice: ci.product.originalPrice,
                  image: ci.product.image,
                  badge: ci.product.badge
                }
              }))
            });
          }

          // POST /api/cart/item (Guardar o actualizar un item en la bolsa del usuario)
          if (pathname === '/api/cart/item' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId, productId, size = 9, color = {}, quantity = 1 } = body;

            if (!userId || !productId) {
              return sendJson(res, 400, { success: false, message: 'userId y productId son requeridos.' });
            }

            const colorName = color.name || body.colorName || 'Original';
            const colorHex = color.hex || body.colorHex || '#000000';
            const colorImage = color.image || body.colorImage || null;

            if (quantity <= 0) {
              await prisma.cartItem.deleteMany({
                where: {
                  userId,
                  productId,
                  size: Number(size),
                  colorName
                }
              });
            } else {
              await prisma.cartItem.upsert({
                where: {
                  userId_productId_size_colorName: {
                    userId,
                    productId,
                    size: Number(size),
                    colorName
                  }
                },
                create: {
                  userId,
                  productId,
                  size: Number(size),
                  colorName,
                  colorHex,
                  colorImage,
                  quantity: Number(quantity)
                },
                update: {
                  quantity: Number(quantity),
                  colorHex,
                  colorImage
                }
              });
            }

            return sendJson(res, 200, { success: true, message: 'Bolsa de compras actualizada en la BD.' });
          }

          // DELETE /api/cart/item (Remover un item de la bolsa del usuario)
          if (pathname === '/api/cart/item' && req.method === 'DELETE') {
            const body = await parseBody(req);
            const { userId, productId, size } = body;
            const colorName = body.colorName || body.color?.name;

            if (userId && productId) {
              await prisma.cartItem.deleteMany({
                where: {
                  userId,
                  productId,
                  ...(size !== undefined ? { size: Number(size) } : {}),
                  ...(colorName ? { colorName } : {})
                }
              });
            }

            return sendJson(res, 200, { success: true, message: 'Item eliminado de la bolsa en la BD.' });
          }

          // DELETE /api/cart/clear (Vaciar bolsa del usuario)
          if (pathname === '/api/cart/clear' && (req.method === 'DELETE' || req.method === 'POST')) {
            const body = await parseBody(req);
            const userId = body.userId || parsedUrl.searchParams.get('userId');

            if (userId) {
              await prisma.cartItem.deleteMany({ where: { userId } });
            }

            return sendJson(res, 200, { success: true, message: 'Bolsa vaciada en la BD.' });
          }

          // POST /api/cart/sync (Sincronizar y fusionar bolsa local con la cuenta)
          if (pathname === '/api/cart/sync' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId, items = [] } = body;

            if (!userId) {
              return sendJson(res, 400, { success: false, message: 'Usuario no especificado.' });
            }

            // Para cada item local, lo guardamos o sumamos a la BD
            for (const item of items) {
              const pId = item.productId || item.product?.id;
              if (!pId) continue;
              const size = Number(item.size) || 9;
              const colorName = item.color?.name || 'Original';
              const colorHex = item.color?.hex || '#000000';
              const colorImage = item.color?.image || item.product?.image || null;
              const quantity = Number(item.quantity) || 1;

              try {
                const existing = await prisma.cartItem.findUnique({
                  where: {
                    userId_productId_size_colorName: {
                      userId,
                      productId: pId,
                      size,
                      colorName
                    }
                  }
                });

                if (existing) {
                  await prisma.cartItem.update({
                    where: { id: existing.id },
                    data: { quantity: Math.max(existing.quantity, quantity) }
                  });
                } else {
                  await prisma.cartItem.create({
                    data: {
                      userId,
                      productId: pId,
                      size,
                      colorName,
                      colorHex,
                      colorImage,
                      quantity
                    }
                  });
                }
              } catch {
                // Continuar con los demás
              }
            }

            const allItems = await prisma.cartItem.findMany({
              where: { userId },
              include: { product: true },
              orderBy: { createdAt: 'asc' }
            });

            return sendJson(res, 200, {
              success: true,
              cart: allItems.map((ci) => ({
                id: `${ci.productId}-${ci.size}-${ci.colorName}`,
                productId: ci.productId,
                size: ci.size,
                quantity: ci.quantity,
                color: {
                  name: ci.colorName,
                  hex: ci.colorHex || '#000000',
                  image: ci.colorImage || ci.product.image
                },
                product: {
                  id: ci.product.id,
                  name: ci.product.name,
                  price: ci.product.price,
                  originalPrice: ci.product.originalPrice,
                  image: ci.product.image,
                  badge: ci.product.badge
                }
              }))
            });
          }

          // ==================================================================
          // RUTAS DE CUPONES Y DESCUENTOS
          // ==================================================================

          // 4. GET /api/coupons
          if (pathname === '/api/coupons' && req.method === 'GET') {
            const userId = parsedUrl.searchParams.get('userId');
            const allPromos = await prisma.promoCode.findMany({
              where: { isActive: true },
              orderBy: { createdAt: 'asc' }
            });

            let userCouponsMap: Record<string, { isUsed: boolean; claimedAt: string }> = {};

            if (userId) {
              const uCoupons = await prisma.userCoupon.findMany({
                where: { userId }
              });
              for (const uc of uCoupons) {
                userCouponsMap[uc.promoCodeId] = {
                  isUsed: uc.isUsed,
                  claimedAt: uc.claimedAt.toISOString()
                };
              }
            }

            const formatted = allPromos.map((p) => {
              const userStatus = userCouponsMap[p.id];
              return {
                id: p.id,
                code: p.code,
                description: p.description,
                discountType: p.discountType,
                discountValue: p.discountValue,
                minPurchase: p.minPurchase,
                maxDiscount: p.maxDiscount,
                onePerUser: p.onePerUser,
                isWelcomeOnly: p.isWelcomeOnly,
                timesUsed: p.timesUsed,
                expiresAt: p.expiresAt?.toISOString(),
                isActive: p.isActive,
                isClaimedByUser: !!userStatus,
                isUsedByUser: userStatus ? userStatus.isUsed : false
              };
            });

            return sendJson(res, 200, { success: true, coupons: formatted });
          }

          // 5. GET /api/coupons/my-coupons
          if (pathname === '/api/coupons/my-coupons' && req.method === 'GET') {
            const userId = parsedUrl.searchParams.get('userId');
            if (!userId) {
              return sendJson(res, 401, {
                success: false,
                requireAuth: true,
                message: 'Debes iniciar sesión para consultar tus cupones personales.'
              });
            }

            const userCoupons = await prisma.userCoupon.findMany({
              where: { userId },
              include: { promoCode: true },
              orderBy: { claimedAt: 'desc' }
            });

            return sendJson(res, 200, {
              success: true,
              userCoupons: userCoupons.map((uc) => ({
                id: uc.id,
                userId: uc.userId,
                promoCodeId: uc.promoCodeId,
                isUsed: uc.isUsed,
                usedAt: uc.usedAt?.toISOString(),
                claimedAt: uc.claimedAt.toISOString(),
                promoCode: uc.promoCode
              }))
            });
          }

          // 6. POST /api/coupons/claim (Agregar a cuenta personal)
          if (pathname === '/api/coupons/claim' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId, code } = body;

            // REGLA: Los códigos de descuento solo se pueden activar/agregar al estar logueado
            if (!userId) {
              return sendJson(res, 401, {
                success: false,
                requireAuth: true,
                message: 'Debes iniciar sesión o registrarte para agregar cupones a tu cuenta personal.'
              });
            }

            const cleanCode = (code || '').trim().toUpperCase();
            const promo = await prisma.promoCode.findUnique({
              where: { code: cleanCode }
            });

            if (!promo || !promo.isActive) {
              return sendJson(res, 404, {
                success: false,
                message: `El código promocional "${cleanCode}" no es válido o ha expirado.`
              });
            }

            // Verificar si el usuario ya tiene este cupón en su cuenta
            const existingUC = await prisma.userCoupon.findUnique({
              where: {
                userId_promoCodeId: {
                  userId,
                  promoCodeId: promo.id
                }
              }
            });

            if (existingUC) {
              if (existingUC.isUsed) {
                return sendJson(res, 400, {
                  success: false,
                  message: `El cupón ${promo.code} ya fue utilizado anteriormente en tu cuenta personal (límite 1 por persona).`
                });
              }
              return sendJson(res, 200, {
                success: true,
                message: `El cupón ${promo.code} ya está disponible en tu cuenta personal.`
              });
            }

            // Si es cupón de bienvenida y ya tiene usos previos
            if (promo.isWelcomeOnly) {
              const previousUsage = await prisma.promoUsage.findFirst({
                where: { userId, promoCodeId: promo.id }
              });
              if (previousUsage) {
                return sendJson(res, 400, {
                  success: false,
                  message: 'El cupón de bienvenida solo puede ser utilizado 1 vez por cuenta nueva.'
                });
              }
            }

            // Agregar a la cuenta personal
            const newUC = await prisma.userCoupon.create({
              data: {
                userId,
                promoCodeId: promo.id,
                isUsed: false
              },
              include: { promoCode: true }
            });

            return sendJson(res, 201, {
              success: true,
              userCoupon: newUC,
              message: `¡Cupón ${promo.code} agregado a tu cuenta personal con éxito!`
            });
          }

          // 7. POST /api/coupons/apply (Validar y activar cupón para la orden)
          if (pathname === '/api/coupons/apply' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId, code, subtotal = 0 } = body;

            // ===================================================================
            // REGLA CRÍTICA N° 1 DEL USUARIO:
            // "los codigos de descuentos solo se pueden activar o cengear al estar logeado"
            // ===================================================================
            if (!userId) {
              return sendJson(res, 401, {
                success: false,
                requireAuth: true,
                pendingCode: code,
                message: 'Debes iniciar sesión o registrarte para activar o canjear códigos de descuento.'
              });
            }

            const cleanCode = (code || '').trim().toUpperCase();
            if (!cleanCode) {
              return sendJson(res, 400, { success: false, message: 'Por favor ingresa un código de cupón.' });
            }

            const promo = await prisma.promoCode.findUnique({
              where: { code: cleanCode }
            });

            if (!promo || !promo.isActive) {
              return sendJson(res, 404, {
                success: false,
                message: `El código "${cleanCode}" no es válido o ha expirado.`
              });
            }

            // Expiración por fecha de inicio
            if (promo.startsAt && new Date(promo.startsAt) > new Date()) {
              return sendJson(res, 400, {
                success: false,
                message: `El código "${promo.code}" aún no está activo. Comienza el ${new Date(promo.startsAt).toLocaleDateString()}.`
              });
            }

            // Expiración por fecha de fin
            if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
              return sendJson(res, 400, {
                success: false,
                message: `El código "${promo.code}" ha expirado el ${new Date(promo.expiresAt).toLocaleDateString()}.`
              });
            }

            // Límite global de usos
            if (promo.usageLimit && promo.timesUsed >= promo.usageLimit) {
              return sendJson(res, 400, {
                success: false,
                message: `El cupón ${promo.code} ha alcanzado el límite máximo de usos disponibles.`
              });
            }

            // Caso especial: Código de Tienda Promo Oculta (HIDDEN_STORE)
            if (promo.discountType === 'HIDDEN_STORE') {
              if (userId) {
                await prisma.userCoupon.upsert({
                  where: {
                    userId_promoCodeId: {
                      userId,
                      promoCodeId: promo.id
                    }
                  },
                  create: {
                    userId,
                    promoCodeId: promo.id,
                    isUsed: false
                  },
                  update: {}
                });
              }

              return sendJson(res, 200, {
                success: true,
                isStorePromo: true,
                promo: {
                  id: promo.id,
                  code: promo.code,
                  description: promo.description,
                  discountType: promo.discountType,
                  discountValue: promo.discountValue,
                  minPurchase: promo.minPurchase,
                  onePerUser: promo.onePerUser,
                  isWelcomeOnly: promo.isWelcomeOnly,
                  isActive: promo.isActive,
                  startsAt: promo.startsAt?.toISOString() || null,
                  expiresAt: promo.expiresAt?.toISOString() || null,
                  storeItems: promo.storeItems || []
                },
                message: `¡Tienda Secreta Desbloqueada con el código "${promo.code}"! Explora los calzados con descuento especial.`
              });
            }

            // REGLA DE TIENDA: No mezclar cupones de descuento con artículos promocionales
            if (body.blockPromoStacking !== false && body.hasPromoItems) {
              return sendJson(res, 400, {
                success: false,
                message: 'Tu bolsa contiene calzados de una tienda promocional. No se pueden mezclar cupones de descuento adicionales con artículos en promoción.'
              });
            }

            // Compra mínima
            if (promo.minPurchase && subtotal > 0 && subtotal < promo.minPurchase) {
              // Aseguramos que quede agregado a la cuenta del usuario para que lo tenga disponible
              await prisma.userCoupon.upsert({
                where: {
                  userId_promoCodeId: {
                    userId,
                    promoCodeId: promo.id
                  }
                },
                create: {
                  userId,
                  promoCodeId: promo.id,
                  isUsed: false
                },
                update: {}
              });
              return sendJson(res, 400, {
                success: false,
                codeAdded: true,
                message: `El cupón ${promo.code} se agregó a tu cuenta personal, pero requiere una compra mínima de $${promo.minPurchase}. (Subtotal actual: $${subtotal.toFixed(2)})`
              });
            }

            // ===================================================================
            // REGLA CRÍTICA N° 2 DEL USUARIO:
            // "crea estas relaciones para crear cupones que solo se puedan usar una vez por personas y cosas asi"
            // ===================================================================
            if (promo.onePerUser || promo.isWelcomeOnly) {
              // 1. Revisar si ya está en userCoupons como utilizado
              const existingUC = await prisma.userCoupon.findUnique({
                where: {
                  userId_promoCodeId: {
                    userId,
                    promoCodeId: promo.id
                  }
                }
              });

              if (existingUC && existingUC.isUsed) {
                return sendJson(res, 400, {
                  success: false,
                  alreadyUsed: true,
                  message: `El cupón ${promo.code} es de un solo uso por persona y ya ha sido canjeado en tu cuenta.`
                });
              }

              // 2. Revisar historial de órdenes / uso previo en promoUsage
              const previousUsage = await prisma.promoUsage.findFirst({
                where: {
                  userId,
                  promoCodeId: promo.id
                }
              });

              if (previousUsage) {
                return sendJson(res, 400, {
                  success: false,
                  alreadyUsed: true,
                  message: `El cupón ${promo.code} ya fue utilizado en un pedido anterior. Solo es válido 1 vez por persona.`
                });
              }
            }

            // ===================================================================
            // REGLA CRÍTICA N° 3 DEL USUARIO:
            // "los cupones de descuentos se agregan a la cuenta personal"
            // Si el cupón aún no estaba en la cuenta personal del usuario, se lo agregamos automáticamente
            // ===================================================================
            await prisma.userCoupon.upsert({
              where: {
                userId_promoCodeId: {
                  userId,
                  promoCodeId: promo.id
                }
              },
              create: {
                userId,
                promoCodeId: promo.id,
                isUsed: false
              },
              update: {}
            });

            return sendJson(res, 200, {
              success: true,
              promo: {
                id: promo.id,
                code: promo.code,
                description: promo.description,
                discountType: promo.discountType,
                discountValue: promo.discountValue,
                minPurchase: promo.minPurchase,
                maxDiscount: promo.maxDiscount,
                onePerUser: promo.onePerUser,
                isWelcomeOnly: promo.isWelcomeOnly,
                isActive: promo.isActive
              },
              message: `¡Cupón ${promo.code} aplicado con éxito a tu cuenta!`
            });
          }

          // 8. POST /api/orders/checkout (Finalizar orden con validación y débito de Stripe Test Mode)
          if (pathname === '/api/orders/checkout' && req.method === 'POST') {
            const body = await parseBody(req);
            const {
              userId,
              items = [],
              promoCodeId,
              subtotal,
              discount = 0,
              shipping = 0,
              total,
              paymentCardId,
              newCard,
              shippingAddressId,
              newAddress
            } = body;

            if (!userId) {
              return sendJson(res, 401, {
                success: false,
                requireAuth: true,
                message: 'Debes iniciar sesión para completar la compra.'
              });
            }

            if (!items || items.length === 0) {
              return sendJson(res, 400, {
                success: false,
                message: 'La bolsa de compras está vacía.'
              });
            }

            const finalTotal = Math.max(0, Number(total) || 0);
            let remainingBalance: number | undefined;
            let cardBrand = 'VISA';
            let cardLast4 = '4242';

            // --- VALIDACIÓN PREVIA DE DISPONIBILIDAD DE STOCK EN BASE DE DATOS ---
            for (const item of items) {
              const pId = item.productId || item.product?.id;
              const sizeNum = Number(item.size);
              const qty = Math.max(1, Number(item.quantity) || 1);

              if (pId && !isNaN(sizeNum)) {
                let sizeRecord = await prisma.productSize.findFirst({
                  where: { productId: pId, size: sizeNum }
                });

                if (!sizeRecord) {
                  const allSizes = await prisma.productSize.findMany({ where: { productId: pId } });
                  sizeRecord = allSizes.find((s) => Math.abs(s.size - sizeNum) < 0.2) || null;
                }

                if (sizeRecord && sizeRecord.stock < qty) {
                  const prodName = item.product?.name || 'El calzado seleccionado';
                  return sendJson(res, 400, {
                    success: false,
                    errorType: 'OUT_OF_STOCK',
                    message: `Stock insuficiente para "${prodName}" en talla ${sizeNum}. Solo quedan ${sizeRecord.stock} par(es) disponibles en inventario.`
                  });
                }
              }
            }

            // --- VALIDACIÓN DE FONDOS Y TARJETA CON STRIPE TEST MODE ---
            if (finalTotal > 0) {
              if (paymentCardId) {
                // Tarjeta guardada en la base de datos
                const card = await prisma.paymentCard.findUnique({
                  where: { id: paymentCardId }
                });

                if (!card || card.userId !== userId) {
                  return sendJson(res, 400, {
                    success: false,
                    errorType: 'CARD_NOT_FOUND',
                    message: 'La tarjeta seleccionada no existe o no pertenece a tu cuenta.'
                  });
                }

                const currentBalance = Number(card.balance) || 0;
                if (currentBalance < finalTotal) {
                  return sendJson(res, 400, {
                    success: false,
                    errorType: 'INSUFFICIENT_FUNDS',
                    message: `Fondos insuficientes en tu tarjeta Stripe Test (${card.brand} •••• ${card.last4}). Saldo disponible: $${currentBalance.toFixed(2)}, pero el total es $${finalTotal.toFixed(2)}.`
                  });
                }

                // Debitar el monto de la compra
                const updatedCard = await prisma.paymentCard.update({
                  where: { id: card.id },
                  data: {
                    balance: { decrement: finalTotal }
                  }
                });

                remainingBalance = Number(updatedCard.balance);
                cardBrand = card.brand;
                cardLast4 = card.last4;
              } else if (newCard) {
                // Tarjeta nueva ingresada durante el checkout
                const {
                  cardNumber = '',
                  cardHolder = 'CLIENTE STRIPE',
                  expMonth = 12,
                  expYear = 2028,
                  balance = 500,
                  saveCard = false
                } = newCard;

                const cleanNumber = cardNumber.replace(/\D/g, '');

                if (!cleanNumber || cleanNumber.length < 13) {
                  return sendJson(res, 400, {
                    success: false,
                    errorType: 'INVALID_NUMBER',
                    message: 'Por favor ingresa un número de tarjeta válido (mínimo 13 dígitos) para Stripe Test Mode.'
                  });
                }

                // Simulación de códigos de error de prueba oficiales de Stripe
                if (cleanNumber.endsWith('0002')) {
                  return sendJson(res, 400, {
                    success: false,
                    errorType: 'CARD_DECLINED',
                    message: 'Stripe Test Mode: Tarjeta declinada por el banco emisor (Simulación: generic_decline).'
                  });
                }

                if (cleanNumber.endsWith('0003')) {
                  return sendJson(res, 400, {
                    success: false,
                    errorType: 'INSUFFICIENT_FUNDS',
                    message: 'Stripe Test Mode: Fondos insuficientes forzado por tarjeta de prueba (Simulación: insufficient_funds).'
                  });
                }

                const testBalance = Number(balance) >= 0 ? Number(balance) : 500.0;
                if (testBalance < finalTotal) {
                  return sendJson(res, 400, {
                    success: false,
                    errorType: 'INSUFFICIENT_FUNDS',
                    message: `Fondos insuficientes en la tarjeta Stripe Test. Saldo de prueba: $${testBalance.toFixed(2)}, total a pagar: $${finalTotal.toFixed(2)}.`
                  });
                }

                remainingBalance = testBalance - finalTotal;

                if (cleanNumber.startsWith('5')) cardBrand = 'MASTERCARD';
                else if (cleanNumber.startsWith('3')) cardBrand = 'AMEX';
                else cardBrand = 'VISA';

                cardLast4 = cleanNumber.slice(-4);

                if (saveCard) {
                  await prisma.paymentCard.create({
                    data: {
                      userId,
                      cardHolder: cardHolder.trim().toUpperCase(),
                      brand: cardBrand,
                      last4: cardLast4,
                      cardNumber: cleanNumber,
                      cvc: newCard.cvc ? String(newCard.cvc).trim() : '123',
                      expMonth: Number(expMonth) || 12,
                      expYear: Number(expYear) || 2028,
                      balance: remainingBalance,
                      isDefault: false
                    }
                  });
                }
              } else {
                return sendJson(res, 400, {
                  success: false,
                  errorType: 'NO_PAYMENT_METHOD',
                  message: 'Por favor selecciona o ingresa una tarjeta de crédito o débito para procesar el pago.'
                });
              }
            }

            // --- GESTIÓN DE DIRECCIÓN DE ENVÍO ---
            let addressText = 'Dirección no especificada';
            if (shippingAddressId) {
              const addr = await prisma.address.findUnique({ where: { id: shippingAddressId } });
              if (addr) {
                addressText = `${addr.fullName} (${addr.phone}), ${addr.street}, ${addr.city}, ${addr.state}, El Salvador`;
              }
            } else if (newAddress && newAddress.street) {
              addressText = `${newAddress.fullName || 'Destinatario'} (${newAddress.phone || ''}), ${newAddress.street}, ${newAddress.city || 'San Salvador'}, ${newAddress.state || 'San Salvador'}, El Salvador`;
              if (newAddress.saveAddress) {
                await prisma.address.create({
                  data: {
                    userId,
                    fullName: (newAddress.fullName || '').trim(),
                    phone: (newAddress.phone || '').trim(),
                    street: (newAddress.street || '').trim(),
                    city: (newAddress.city || '').trim(),
                    state: (newAddress.state || '').trim(),
                    postalCode: (newAddress.postalCode || '1101').trim(),
                    country: 'SV',
                    isDefault: false
                  }
                });
              }
            }

            const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const orderNotes = `Stripe Test Mode (Aprobado) • ${cardBrand} •••• ${cardLast4} • Envío a: ${addressText}`;

            const order = await prisma.order.create({
              data: {
                orderNumber,
                userId,
                status: 'PAID',
                subtotal: Number(subtotal) || 0,
                discount: Number(discount) || 0,
                shipping: Number(shipping) || 0,
                total: finalTotal,
                promoCodeId: promoCodeId || null,
                notes: orderNotes,
                items: {
                  create: items.map((item: any) => ({
                    productId: item.productId || item.product?.id,
                    size: Number(item.size) || 9,
                    color: item.color?.name || 'Original',
                    quantity: Number(item.quantity) || 1,
                    unitPrice: Number(item.product?.price) || 0,
                    total: (Number(item.product?.price) || 0) * (Number(item.quantity) || 1)
                  }))
                }
              }
            });

            // --- DESCONTAR STOCK REAL EN BASE DE DATOS POSTGRESQL POR CADA PAR COMPRADO ---
            for (const item of items) {
              const pId = item.productId || item.product?.id;
              const sizeNum = Number(item.size);
              const qty = Math.max(1, Number(item.quantity) || 1);

              if (pId && !isNaN(sizeNum)) {
                // 1. Decrementar existencias en la tabla product_sizes
                let sizeRecord = await prisma.productSize.findFirst({
                  where: { productId: pId, size: sizeNum }
                });

                if (!sizeRecord) {
                  const allSizes = await prisma.productSize.findMany({ where: { productId: pId } });
                  sizeRecord = allSizes.find((s) => Math.abs(s.size - sizeNum) < 0.2) || null;
                }

                if (sizeRecord) {
                  const updatedStock = Math.max(0, sizeRecord.stock - qty);
                  await prisma.productSize.update({
                    where: { id: sizeRecord.id },
                    data: { stock: updatedStock }
                  });
                }

                // 2. Si la variante de color tiene sizes en JSON, decrementar también
                const colName = item.color?.name;
                const colId = item.color?.id;
                if (colName || colId) {
                  const colRecord = await prisma.productColor.findFirst({
                    where: {
                      productId: pId,
                      OR: [
                        { id: colId || '' },
                        { name: colName || '' }
                      ]
                    }
                  });

                  if (colRecord && Array.isArray(colRecord.sizes)) {
                    const updatedColorSizes = (colRecord.sizes as any[]).map((cs: any) => {
                      if (Math.abs(Number(cs.size) - sizeNum) < 0.2) {
                        return {
                          ...cs,
                          stock: Math.max(0, (Number(cs.stock) || 0) - qty)
                        };
                      }
                      return cs;
                    });

                    await prisma.productColor.update({
                      where: { id: colRecord.id },
                      data: { sizes: updatedColorSizes }
                    });
                  }
                }

                // 3. Recalcular existencias totales y actualizar inStock en tabla products
                const remainingSizes = await prisma.productSize.findMany({
                  where: { productId: pId }
                });
                const totalRemaining = remainingSizes.reduce((acc, s) => acc + s.stock, 0);
                await prisma.product.update({
                  where: { id: pId },
                  data: {
                    inStock: totalRemaining > 0
                  }
                });
              }
            }

            // Si se aplicó un cupón: marcar como usado en la cuenta personal y registrar en promo_usages
            if (promoCodeId) {
              await prisma.userCoupon.updateMany({
                where: { userId, promoCodeId },
                data: {
                  isUsed: true,
                  usedAt: new Date()
                }
              });

              await prisma.promoUsage.create({
                data: {
                  promoCodeId,
                  userId,
                  orderId: order.id
                }
              });

              await prisma.promoCode.update({
                where: { id: promoCodeId },
                data: { timesUsed: { increment: 1 } }
              });
            }

            // Vaciar la bolsa de compras guardada del usuario en la base de datos
            await prisma.cartItem.deleteMany({ where: { userId } });

            return sendJson(res, 201, {
              success: true,
              orderNumber: order.orderNumber,
              orderId: order.id,
              cardBrand,
              cardLast4,
              remainingBalance,
              shippingAddress: addressText,
              message: '¡Pago procesado exitosamente con Stripe Test Mode!'
            });
          }

          // ==================================================================
          // RUTAS DE CATÁLOGO / PRODUCTOS (DESDE POSTGRESQL REAL)
          // ==================================================================
          if (pathname === '/api/products' && req.method === 'GET') {
            const dbProducts = await prisma.product.findMany({
              include: {
                category: true,
                colors: true,
                sizes: true,
                reviews: true
              },
              orderBy: { createdAt: 'asc' }
            });

            const mapped = dbProducts.map((p) => {
              const avgRating =
                p.reviews.length > 0
                  ? p.reviews.reduce((acc, r) => acc + r.rating, 0) / p.reviews.length
                  : 4.8;

              // Buscar si existe en MOCK_PRODUCTS para complementar datos enriquecidos (gallery, specs)
              const mockMatch = MOCK_PRODUCTS.find(
                (mp) => mp.id === p.id || mp.name.toLowerCase() === p.name.toLowerCase()
              );

              const colorImages = p.colors
                .map((c) => c.image)
                .filter((img): img is string => Boolean(img));
              
              const defaultGallery = Array.from(new Set([p.image, ...colorImages]));
              const gallery = (p.gallery && p.gallery.length > 0)
                ? p.gallery
                : (mockMatch?.gallery && mockMatch.gallery.length > 0
                    ? mockMatch.gallery
                    : (defaultGallery.length > 0 ? defaultGallery : [p.image]));

              return {
                id: p.id,
                name: p.name,
                subtitle: p.subtitle || mockMatch?.subtitle || '',
                description: p.description || mockMatch?.description || '',
                price: p.price,
                originalPrice: p.originalPrice || mockMatch?.originalPrice || undefined,
                badge: p.badge || mockMatch?.badge || undefined,
                gender: (p.gender as any) || mockMatch?.gender || 'Unisex',
                height: (p.height as any) || mockMatch?.height || undefined,
                category: (p.category.slug as any) || mockMatch?.category || 'sandals',
                image: p.image,
                gallery,
                model3dUrl: p.model3dUrl || mockMatch?.model3dUrl || undefined,
                has3DModel: Boolean(p.model3dUrl || mockMatch?.has3DModel),
                carouselImage: p.carouselImage || undefined,
                showcaseActive: p.showcaseActive,
                showcaseOrder: p.showcaseOrder,
                colors: p.colors.length > 0
                  ? p.colors.map((c) => {
                      const colGallery = Array.isArray(c.gallery) && c.gallery.length > 0
                        ? c.gallery
                        : (c.image ? [c.image] : [p.image]);
                      return {
                        id: c.id,
                        name: c.name,
                        hex: c.hex,
                        image: c.image || colGallery[0] || p.image,
                        gallery: colGallery,
                        price: c.price !== null && c.price !== undefined ? c.price : p.price,
                        originalPrice: c.originalPrice !== null && c.originalPrice !== undefined ? c.originalPrice : (p.originalPrice || undefined),
                        sizes: Array.isArray(c.sizes) ? c.sizes : undefined
                      };
                    })
                  : (mockMatch?.colors || [{ name: 'Original', hex: '#111827', image: p.image, gallery: [p.image] }]),
                sizes: p.sizes.length > 0
                  ? p.sizes.map((s) => s.size)
                  : (mockMatch?.sizes || [38, 39, 40, 41, 42, 43, 44]),
                totalStock: p.sizes.reduce((acc, s) => acc + s.stock, 0),
                sizesDetails: p.sizes.map((s) => ({ id: s.id, size: s.size, stock: s.stock })),
                technology: mockMatch?.technology || ['Amortiguación anatómica', 'Suela antideslizante'],
                features: mockMatch?.features || ['Diseño ergonómico', 'Ajuste cómodo', 'Material de alta calidad'],
                rating: avgRating,
                reviewCount: p.reviews.length || mockMatch?.reviewCount || 18,
                inStock: p.inStock && (p.sizes.length === 0 || p.sizes.some((s) => s.stock > 0)),
                createdAt: p.createdAt.toISOString()
              };
            });

            return sendJson(res, 200, { success: true, products: mapped });
          }

          // ==================================================================
          // RUTAS ADMINISTRATIVAS PROTEGIDAS (PANEL CRUD ADMIN & MINIO)
          // ==================================================================

          // 1. GET /api/admin/products (Listar inventario completo para administración)
          if (pathname === '/api/admin/products' && req.method === 'GET') {
            const isAdmin = await checkIsAdmin(req, parsedUrl);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado. Se requieren permisos de administrador.' });
            }

            const products = await prisma.product.findMany({
              include: {
                category: true,
                sizes: { orderBy: { size: 'asc' } },
                colors: true,
                reviews: true,
                orderItems: true
              },
              orderBy: { createdAt: 'desc' }
            });

            return sendJson(res, 200, {
              success: true,
              products: products.map((p) => {
                const totalStock = p.sizes.reduce((acc, s) => acc + s.stock, 0);
                return {
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                  subtitle: p.subtitle || '',
                  description: p.description || '',
                  price: p.price,
                  originalPrice: p.originalPrice,
                  badge: p.badge,
                  gender: p.gender,
                  image: p.image,
                  gallery: p.gallery && p.gallery.length > 0 ? p.gallery : (p.image ? [p.image] : []),
                  model3dUrl: p.model3dUrl,
                  carouselImage: p.carouselImage,
                  showcaseActive: Boolean(p.showcaseActive),
                  showcaseOrder: p.showcaseOrder || 0,
                  categoryId: p.categoryId,
                  categoryName: p.category.name,
                  inStock: p.inStock,
                  featured: p.featured,
                  totalStock,
                  sizes: p.sizes.map((s) => ({ id: s.id, size: s.size, stock: s.stock })),
                  colors: p.colors.map((c) => ({
                    id: c.id,
                    name: c.name,
                    hex: c.hex,
                    image: c.image,
                    gallery: Array.isArray(c.gallery) && c.gallery.length > 0 ? c.gallery : (c.image ? [c.image] : []),
                    price: c.price !== null && c.price !== undefined ? c.price : p.price,
                    originalPrice: c.originalPrice !== null && c.originalPrice !== undefined ? c.originalPrice : (p.originalPrice || null),
                    sizes: Array.isArray(c.sizes) ? c.sizes : []
                  })),
                  reviewCount: p.reviews.length,
                  orderCount: p.orderItems.length,
                  createdAt: p.createdAt.toISOString()
                };
              })
            });
          }

          // 2. POST /api/admin/products (Crear nuevo producto en el catálogo)
          if (pathname === '/api/admin/products' && req.method === 'POST') {
            const body = await parseBody(req);
            const isAdmin = await checkIsAdmin(req, parsedUrl, body.userId);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado. Se requieren permisos de administrador.' });
            }

            const {
              name,
              subtitle,
              description,
              price,
              originalPrice,
              badge,
              gender = 'Unisex',
              image,
              gallery,
              model3dUrl,
              carouselImage,
              showcaseActive = false,
              showcaseOrder = 0,
              categoryId,
              inStock = true,
              featured = false,
              sizes = [],
              colors = []
            } = body;

            const finalGallery: string[] = Array.isArray(gallery) && gallery.length > 0
              ? gallery
              : (image ? [image] : []);
            const finalImage: string = finalGallery.length > 0 ? finalGallery[0] : (image || '');

            if (!name || price === undefined || !finalImage) {
              return sendJson(res, 400, {
                success: false,
                message: 'Nombre, precio e imagen principal son requeridos.'
              });
            }

            // Resolver categoría
            let finalCategoryId = categoryId;
            if (!finalCategoryId) {
              const defaultCat = await prisma.category.findFirst();
              finalCategoryId = defaultCat?.id;
            }

            if (!finalCategoryId) {
              const newCat = await prisma.category.create({
                data: {
                  name: 'Calzado General',
                  slug: 'general',
                  description: 'Categoría principal de calzado'
                }
              });
              finalCategoryId = newCat.id;
            }

            const slug =
              name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '') +
              '-' +
              Date.now().toString(36);

            const newProduct = await prisma.product.create({
              data: {
                name: name.trim(),
                slug,
                subtitle: subtitle ? subtitle.trim() : null,
                description: description ? description.trim() : null,
                price: Number(price),
                originalPrice: originalPrice ? Number(originalPrice) : null,
                badge: badge ? badge.trim() : null,
                gender,
                image: finalImage.trim(),
                gallery: finalGallery,
                model3dUrl: model3dUrl ? model3dUrl.trim() : null,
                carouselImage: carouselImage ? carouselImage.trim() : null,
                showcaseActive: Boolean(showcaseActive),
                showcaseOrder: Number(showcaseOrder) || 0,
                categoryId: finalCategoryId,
                inStock: Boolean(inStock),
                featured: Boolean(featured),
                sizes: {
                  create: (Array.isArray(sizes) && sizes.length > 0
                    ? sizes
                    : [39, 39.5, 40, 40.5, 41, 41.5, 42, 42.5, 43, 43.5, 44, 44.5, 45]
                  ).map((s: any) => ({
                    size: typeof s === 'number' ? s : Number(s.size),
                    stock: typeof s === 'object' && s.stock !== undefined ? Math.max(0, Number(s.stock)) : 0
                  }))
                },
                colors: {
                  create: (Array.isArray(colors) && colors.length > 0
                    ? colors
                    : [{ name: 'Original', hex: '#111827', image: finalImage, gallery: finalGallery, price, originalPrice, sizes }]
                  ).map((c: any) => {
                    const colGallery = Array.isArray(c.gallery) && c.gallery.length > 0
                      ? c.gallery
                      : (c.image ? [c.image] : (finalGallery.length > 0 ? [finalGallery[0]] : []));
                    return {
                      name: c.name || 'Color Principal',
                      hex: c.hex || '#000000',
                      image: colGallery[0] || c.image || null,
                      gallery: colGallery,
                      price: c.price !== undefined && c.price !== null && c.price !== '' ? Number(c.price) : Number(price),
                      originalPrice: c.originalPrice !== undefined && c.originalPrice !== null && c.originalPrice !== '' ? Number(c.originalPrice) : (originalPrice ? Number(originalPrice) : null),
                      sizes: Array.isArray(c.sizes) ? c.sizes : null
                    };
                  })
                }
              },
              include: {
                category: true,
                sizes: true,
                colors: true
              }
            });

            return sendJson(res, 201, {
              success: true,
              message: `Producto "${newProduct.name}" agregado exitosamente al catálogo.`,
              product: newProduct
            });
          }

          // 3. PUT /api/admin/products (Actualizar producto existente)
          if (pathname === '/api/admin/products' && req.method === 'PUT') {
            const body = await parseBody(req);
            const isAdmin = await checkIsAdmin(req, parsedUrl, body.userId);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado. Se requieren permisos de administrador.' });
            }

            const {
              id,
              name,
              subtitle,
              description,
              price,
              originalPrice,
              badge,
              gender,
              image,
              gallery,
              model3dUrl,
              carouselImage,
              showcaseActive = false,
              showcaseOrder = 0,
              categoryId,
              inStock,
              featured,
              sizes,
              colors
            } = body;

            if (!id) {
              return sendJson(res, 400, { success: false, message: 'ID del producto requerido para actualizar.' });
            }

            let finalImage = image;
            let finalGallery = Array.isArray(gallery) ? gallery : undefined;
            if (finalGallery && finalGallery.length > 0) {
              finalImage = finalGallery[0];
            }

            // Actualizar atómicamente dentro de una transacción para evitar inconsistencias de datos
            await prisma.$transaction(async (tx) => {
              // Actualizar datos base del producto
              await tx.product.update({
                where: { id },
                data: {
                  ...(name ? { name: name.trim() } : {}),
                  subtitle: subtitle !== undefined ? (subtitle ? subtitle.trim() : null) : undefined,
                  description: description !== undefined ? (description ? description.trim() : null) : undefined,
                  ...(price !== undefined ? { price: Number(price) } : {}),
                  originalPrice: originalPrice !== undefined ? (originalPrice ? Number(originalPrice) : null) : undefined,
                  badge: badge !== undefined ? (badge ? badge.trim() : null) : undefined,
                  ...(gender ? { gender } : {}),
                  ...(finalImage ? { image: finalImage.trim() } : {}),
                  ...(finalGallery !== undefined ? { gallery: finalGallery } : {}),
                  model3dUrl: model3dUrl !== undefined ? (model3dUrl ? model3dUrl.trim() : null) : undefined,
                  ...(carouselImage !== undefined ? { carouselImage: carouselImage ? carouselImage.trim() : null } : {}),
                  ...(showcaseActive !== undefined ? { showcaseActive: Boolean(showcaseActive) } : {}),
                  ...(showcaseOrder !== undefined ? { showcaseOrder: Number(showcaseOrder) } : {}),
                  ...(categoryId ? { categoryId } : {}),
                  ...(inStock !== undefined ? { inStock: Boolean(inStock) } : {}),
                  ...(featured !== undefined ? { featured: Boolean(featured) } : {})
                }
              });

              // Si se enviaron tallas, refrescarlas
              if (Array.isArray(sizes)) {
                await tx.productSize.deleteMany({ where: { productId: id } });
                if (sizes.length > 0) {
                  await tx.productSize.createMany({
                    data: sizes.map((s: any) => ({
                      productId: id,
                      size: typeof s === 'number' ? s : Number(s.size),
                      stock: typeof s === 'object' && s.stock !== undefined ? Math.max(0, Number(s.stock)) : 0
                    }))
                  });
                }
              }

              // Si se enviaron colores, refrescarlos con su galería, precio y tallas independientes
              if (Array.isArray(colors) && colors.length > 0) {
                await tx.productColor.deleteMany({ where: { productId: id } });
                await tx.productColor.createMany({
                  data: colors.map((c: any) => {
                    const colGallery = Array.isArray(c.gallery) && c.gallery.length > 0
                      ? c.gallery
                      : (c.image ? [c.image] : []);
                    return {
                      productId: id,
                      name: c.name || 'Color',
                      hex: c.hex || '#000000',
                      image: colGallery[0] || c.image || null,
                      gallery: colGallery,
                      price: c.price !== undefined && c.price !== null && c.price !== '' ? Number(c.price) : (price !== undefined ? Number(price) : null),
                      originalPrice: c.originalPrice !== undefined && c.originalPrice !== null && c.originalPrice !== '' ? Number(c.originalPrice) : (originalPrice !== undefined ? Number(originalPrice) : null),
                      sizes: Array.isArray(c.sizes) ? c.sizes : null
                    };
                  })
                });
              }
            });

            return sendJson(res, 200, {
              success: true,
              message: 'Producto actualizado con éxito.'
            });
          }

          // 4. DELETE /api/admin/products (Eliminar producto del catálogo)
          if (pathname === '/api/admin/products' && req.method === 'DELETE') {
            const body = await parseBody(req);
            const id = parsedUrl.searchParams.get('id') || body.id;
            const isAdmin = await checkIsAdmin(req, parsedUrl, body.userId);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado. Se requieren permisos de administrador.' });
            }

            if (!id) {
              return sendJson(res, 400, { success: false, message: 'ID del producto requerido para eliminar.' });
            }

            // Eliminar dependencias primero
            await prisma.cartItem.deleteMany({ where: { productId: id } });
            await prisma.wishlist.deleteMany({ where: { productId: id } });
            await prisma.review.deleteMany({ where: { productId: id } });
            await prisma.productSize.deleteMany({ where: { productId: id } });
            await prisma.productColor.deleteMany({ where: { productId: id } });
            await prisma.orderItem.deleteMany({ where: { productId: id } });
            await prisma.product.delete({ where: { id } });

            return sendJson(res, 200, {
              success: true,
              message: 'Producto eliminado exitosamente del catálogo.'
            });
          }

          // 5. PATCH /api/admin/products/stock (Modificar disponibilidad rápida o stock de talla)
          if (pathname === '/api/admin/products/stock' && req.method === 'PATCH') {
            const body = await parseBody(req);
            const isAdmin = await checkIsAdmin(req, parsedUrl, body.userId);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado.' });
            }

            const { id, inStock, sizeId, stock } = body;
            if (!id) {
              return sendJson(res, 400, { success: false, message: 'ID de producto requerido.' });
            }

            if (inStock !== undefined) {
              await prisma.product.update({
                where: { id },
                data: { inStock: Boolean(inStock) }
              });
            }

            if (sizeId && stock !== undefined) {
              await prisma.productSize.update({
                where: { id: sizeId },
                data: { stock: Number(stock) }
              });
            }

            return sendJson(res, 200, {
              success: true,
              message: 'Existencias actualizadas correctamente.'
            });
          }

          // 5.5. PATCH /api/admin/products/showcase (Actualizar Circular Showcase de un producto)
          if (pathname === '/api/admin/products/showcase' && req.method === 'PATCH') {
            const body = await parseBody(req);
            const isAdmin = await checkIsAdmin(req, parsedUrl, body.userId);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado.' });
            }

            const { id, showcaseActive, showcaseOrder, carouselImage } = body;
            if (!id) {
              return sendJson(res, 400, { success: false, message: 'ID de producto requerido.' });
            }

            const updated = await prisma.product.update({
              where: { id },
              data: {
                ...(showcaseActive !== undefined ? { showcaseActive: Boolean(showcaseActive) } : {}),
                ...(showcaseOrder !== undefined ? { showcaseOrder: Number(showcaseOrder) } : {}),
                ...(carouselImage !== undefined ? { carouselImage: carouselImage ? carouselImage.trim() : null } : {})
              }
            });

            return sendJson(res, 200, {
              success: true,
              message: 'Circular Showcase actualizado correctamente.',
              product: updated
            });
          }

          // 6. GET /api/admin/promos (Listar todos los códigos de promoción)
          if (pathname === '/api/admin/promos' && req.method === 'GET') {
            const isAdmin = await checkIsAdmin(req, parsedUrl);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado.' });
            }

            const promos = await prisma.promoCode.findMany({
              include: {
                userCoupons: true,
                usages: true
              },
              orderBy: { createdAt: 'desc' }
            });

            return sendJson(res, 200, {
              success: true,
              promos: promos.map((p) => ({
                id: p.id,
                code: p.code,
                description: p.description,
                discountType: p.discountType,
                discountValue: p.discountValue,
                minPurchase: p.minPurchase,
                usageLimit: p.usageLimit,
                onePerUser: p.onePerUser,
                isWelcomeOnly: p.isWelcomeOnly,
                isActive: p.isActive,
                startsAt: p.startsAt?.toISOString() || null,
                expiresAt: p.expiresAt?.toISOString() || null,
                storeItems: p.storeItems || null,
                createdAt: p.createdAt.toISOString(),
                totalClaimed: p.userCoupons.length,
                totalUsed: p.usages.length
              }))
            });
          }

          // 7. POST /api/admin/promos (Crear nuevo código promocional)
          if (pathname === '/api/admin/promos' && req.method === 'POST') {
            const body = await parseBody(req);
            const isAdmin = await checkIsAdmin(req, parsedUrl, body.userId);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado.' });
            }

            const {
              code,
              description,
              discountType = 'PERCENTAGE',
              discountValue = 0,
              minPurchase = 0,
              usageLimit,
              onePerUser = true,
              isWelcomeOnly = false,
              isActive = true,
              startsAt,
              expiresAt,
              storeItems
            } = body;

            if (!code) {
              return sendJson(res, 400, { success: false, message: 'El código promocional es requerido.' });
            }

            if (discountType !== 'HIDDEN_STORE' && discountValue === undefined) {
              return sendJson(res, 400, { success: false, message: 'Código y valor de descuento son requeridos.' });
            }

            const cleanCode = code.trim().toUpperCase();
            const existing = await prisma.promoCode.findUnique({ where: { code: cleanCode } });
            if (existing) {
              return sendJson(res, 409, { success: false, message: `El código "${cleanCode}" ya existe.` });
            }

            const promo = await prisma.promoCode.create({
              data: {
                code: cleanCode,
                description: (description || (discountType === 'HIDDEN_STORE' ? 'Tienda Promo Exclusiva' : `Descuento ${discountValue}% en tu compra`)).trim(),
                discountType,
                discountValue: Number(discountValue) || 0,
                minPurchase: minPurchase ? Number(minPurchase) : null,
                usageLimit: usageLimit ? Number(usageLimit) : null,
                onePerUser: Boolean(onePerUser),
                isWelcomeOnly: Boolean(isWelcomeOnly),
                isActive: Boolean(isActive),
                startsAt: startsAt ? new Date(startsAt) : new Date(),
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                storeItems: Array.isArray(storeItems) ? (storeItems as any) : undefined
              }
            });

            return sendJson(res, 201, {
              success: true,
              message: `Código promocional "${cleanCode}" creado exitosamente.`,
              promo
            });
          }

          // 8. PUT /api/admin/promos (Actualizar código promocional)
          if (pathname === '/api/admin/promos' && req.method === 'PUT') {
            const body = await parseBody(req);
            const isAdmin = await checkIsAdmin(req, parsedUrl, body.userId);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado.' });
            }

            const {
              id,
              description,
              discountType,
              discountValue,
              minPurchase,
              usageLimit,
              onePerUser,
              isWelcomeOnly,
              isActive,
              startsAt,
              expiresAt,
              storeItems
            } = body;

            if (!id) {
              return sendJson(res, 400, { success: false, message: 'ID del cupón requerido.' });
            }

            const updated = await prisma.promoCode.update({
              where: { id },
              data: {
                ...(description ? { description: description.trim() } : {}),
                ...(discountType ? { discountType } : {}),
                ...(discountValue !== undefined ? { discountValue: Number(discountValue) } : {}),
                ...(minPurchase !== undefined ? { minPurchase: minPurchase ? Number(minPurchase) : null } : {}),
                ...(usageLimit !== undefined ? { usageLimit: usageLimit ? Number(usageLimit) : null } : {}),
                ...(onePerUser !== undefined ? { onePerUser: Boolean(onePerUser) } : {}),
                ...(isWelcomeOnly !== undefined ? { isWelcomeOnly: Boolean(isWelcomeOnly) } : {}),
                ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
                ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : new Date() } : {}),
                ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
                ...(storeItems !== undefined ? { storeItems: Array.isArray(storeItems) ? (storeItems as any) : undefined } : {})
              }
            });

            return sendJson(res, 200, {
              success: true,
              message: `Cupón "${updated.code}" actualizado con éxito.`,
              promo: updated
            });
          }

          // 9. DELETE /api/admin/promos (Eliminar código promocional)
          if (pathname === '/api/admin/promos' && req.method === 'DELETE') {
            const body = await parseBody(req);
            const id = parsedUrl.searchParams.get('id') || body.id;
            const isAdmin = await checkIsAdmin(req, parsedUrl, body.userId);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado.' });
            }

            if (!id) {
              return sendJson(res, 400, { success: false, message: 'ID del cupón requerido.' });
            }

            await prisma.userCoupon.deleteMany({ where: { promoCodeId: id } });
            await prisma.promoUsage.deleteMany({ where: { promoCodeId: id } });
            await prisma.promoCode.delete({ where: { id } });

            return sendJson(res, 200, {
              success: true,
              message: 'Código promocional eliminado exitosamente.'
            });
          }

          // 10. PATCH /api/admin/promos/toggle (Activar/Desactivar código rápidamente)
          if (pathname === '/api/admin/promos/toggle' && req.method === 'PATCH') {
            const body = await parseBody(req);
            const isAdmin = await checkIsAdmin(req, parsedUrl, body.userId);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado.' });
            }

            const { id, isActive } = body;
            if (!id || isActive === undefined) {
              return sendJson(res, 400, { success: false, message: 'ID y estado isActive requeridos.' });
            }

            const updated = await prisma.promoCode.update({
              where: { id },
              data: { isActive: Boolean(isActive) }
            });

            return sendJson(res, 200, {
              success: true,
              message: `Cupón ${updated.code} ${updated.isActive ? 'activado' : 'desactivado'}.`,
              isActive: updated.isActive
            });
          }

          // 11. POST /api/admin/upload (Subir archivos directamente a MinIO Storage)
          if (pathname === '/api/admin/upload' && req.method === 'POST') {
            const body = await parseBody(req);
            const isAdmin = await checkIsAdmin(req, parsedUrl, body.userId);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado para subida de recursos.' });
            }

            const { filename, contentType = 'image/png', base64 } = body;
            if (!filename || !base64) {
              return sendJson(res, 400, { success: false, message: 'filename y contenido base64 son requeridos.' });
            }

            // Limpiar cabecera Data-URI si viene presente (ej. data:image/png;base64,...)
            const rawBase64 = base64.includes(';base64,') ? base64.split(';base64,')[1] : base64;
            const buffer = Buffer.from(rawBase64, 'base64');

            // Nombre de archivo sanitizado y con timestamp único
            const cleanName = filename
              .toLowerCase()
              .replace(/[^a-z0-9._-]/g, '_')
              .replace(/_+/g, '_');
            const objectKey = `${Date.now()}-${cleanName}`;

            await s3Client.send(
              new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: objectKey,
                Body: buffer,
                ContentType: contentType
              })
            );

            const fileUrl = `http://localhost:9002/${S3_BUCKET}/${objectKey}`;

            return sendJson(res, 201, {
              success: true,
              message: `Recurso "${cleanName}" subido exitosamente a MinIO.`,
              url: fileUrl,
              filename: objectKey,
              size: buffer.length,
              contentType
            });
          }

          // 12. GET /api/admin/assets (Listar recursos guardados en MinIO)
          if (pathname === '/api/admin/assets' && req.method === 'GET') {
            const isAdmin = await checkIsAdmin(req, parsedUrl);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado.' });
            }

            try {
              const s3Res = await s3Client.send(new ListObjectsV2Command({ Bucket: S3_BUCKET }));
              const assets = (s3Res.Contents || []).map((c) => ({
                key: c.Key || '',
                url: `http://localhost:9002/${S3_BUCKET}/${c.Key}`,
                size: c.Size || 0,
                lastModified: c.LastModified ? c.LastModified.toISOString() : null
              }));

              return sendJson(res, 200, { success: true, assets });
            } catch (err: any) {
              return sendJson(res, 500, { success: false, message: 'Error al listar recursos de MinIO.', error: err.message });
            }
          }

          // 13. DELETE /api/admin/assets (Eliminar recurso de MinIO)
          if (pathname === '/api/admin/assets' && req.method === 'DELETE') {
            const body = await parseBody(req);
            const key = parsedUrl.searchParams.get('key') || body.key;
            const isAdmin = await checkIsAdmin(req, parsedUrl, body.userId);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado.' });
            }

            if (!key) {
              return sendJson(res, 400, { success: false, message: 'Clave del recurso en MinIO requerida.' });
            }

            await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));

            return sendJson(res, 200, {
              success: true,
              message: `Recurso "${key}" eliminado de MinIO exitosamente.`
            });
          }

          // 14. GET /api/admin/categories (Listar categorías para selector de productos)
          if (pathname === '/api/admin/categories' && req.method === 'GET') {
            const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
            return sendJson(res, 200, { success: true, categories });
          }

          // 15. GET /api/admin/users (Listar usuarios registrados para asignación de tarjetas de prueba)
          if (pathname === '/api/admin/users' && req.method === 'GET') {
            const isAdmin = await checkIsAdmin(req, parsedUrl);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado.' });
            }

            const users = await prisma.user.findMany({
              select: { id: true, name: true, email: true, role: true },
              orderBy: { createdAt: 'desc' }
            });
            return sendJson(res, 200, { success: true, users });
          }

          // 16. GET /api/admin/cards (Listar todas las tarjetas para pruebas de Stripe)
          if (pathname === '/api/admin/cards' && req.method === 'GET') {
            const isAdmin = await checkIsAdmin(req, parsedUrl);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado.' });
            }

            const cards = await prisma.paymentCard.findMany({
              include: {
                user: { select: { id: true, name: true, email: true } }
              },
              orderBy: { createdAt: 'desc' }
            });

            return sendJson(res, 200, {
              success: true,
              cards: cards.map((c) => {
                const fullNumber = c.cardNumber || (
                  c.last4 === '0002' ? '4000 0000 0000 0002' :
                  c.last4 === '0003' ? '4000 0000 0000 0003' :
                  `4242 4242 4242 ${c.last4}`
                );
                return {
                  id: c.id,
                  userId: c.userId,
                  userName: c.user.name,
                  userEmail: c.user.email,
                  cardHolder: c.cardHolder,
                  brand: c.brand,
                  last4: c.last4,
                  cardNumber: fullNumber,
                  cvc: c.cvc || '123',
                  expMonth: c.expMonth,
                  expYear: c.expYear,
                  balance: Number(c.balance) || 0,
                  isDefault: c.isDefault,
                  createdAt: c.createdAt.toISOString()
                };
              })
            });
          }

          // 17. POST /api/admin/cards (Crear tarjeta de prueba con saldo y tipo específico para Stripe)
          if (pathname === '/api/admin/cards' && req.method === 'POST') {
            const body = await parseBody(req);
            const isAdmin = await checkIsAdmin(req, parsedUrl, body.adminUserId);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado.' });
            }

            const { targetUserId, cardHolder, cardNumber, expMonth = 12, expYear = 2028, balance = 500, isDefault = false } = body;

            if (!targetUserId || !cardHolder || !cardNumber) {
              return sendJson(res, 400, { success: false, message: 'Usuario destino, titular y número de tarjeta son obligatorios.' });
            }

            const cleanNumber = cardNumber.replace(/\D/g, '');
            const last4 = cleanNumber.slice(-4) || '1234';

            let brand = 'VISA';
            if (cleanNumber.startsWith('5')) brand = 'MASTERCARD';
            else if (cleanNumber.startsWith('3')) brand = 'AMEX';

            if (isDefault) {
              await prisma.paymentCard.updateMany({
                where: { userId: targetUserId },
                data: { isDefault: false }
              });
            }

            const card = await prisma.paymentCard.create({
              data: {
                userId: targetUserId,
                cardHolder: cardHolder.trim().toUpperCase(),
                brand,
                last4,
                cardNumber: cleanNumber,
                cvc: body.cvc ? String(body.cvc).trim() : '123',
                expMonth: Number(expMonth),
                expYear: Number(expYear),
                balance: Math.max(0, Number(balance)),
                isDefault: Boolean(isDefault)
              },
              include: {
                user: { select: { id: true, name: true, email: true } }
              }
            });

            return sendJson(res, 201, {
              success: true,
              card: {
                id: card.id,
                userId: card.userId,
                userName: card.user.name,
                userEmail: card.user.email,
                cardHolder: card.cardHolder,
                brand: card.brand,
                last4: card.last4,
                expMonth: card.expMonth,
                expYear: card.expYear,
                balance: Number(card.balance) || 0,
                isDefault: card.isDefault,
                createdAt: card.createdAt.toISOString()
              },
              message: `Tarjeta de prueba ${brand} •••• ${last4} creada con saldo de $${Number(card.balance).toFixed(2)}.`
            });
          }

          // 18. PUT /api/admin/cards/balance (Ajustar saldo de cualquier tarjeta para pruebas)
          if (pathname === '/api/admin/cards/balance' && req.method === 'PUT') {
            const body = await parseBody(req);
            const isAdmin = await checkIsAdmin(req, parsedUrl, body.adminUserId);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado.' });
            }

            const { cardId, balance } = body;
            if (!cardId || balance === undefined) {
              return sendJson(res, 400, { success: false, message: 'ID de tarjeta y nuevo balance requeridos.' });
            }

            const updated = await prisma.paymentCard.update({
              where: { id: cardId },
              data: { balance: Math.max(0, Number(balance)) }
            });

            return sendJson(res, 200, {
              success: true,
              cardId: updated.id,
              balance: Number(updated.balance),
              message: `Saldo de la tarjeta actualizado a $${Number(updated.balance).toFixed(2)}.`
            });
          }

          // 19. DELETE /api/admin/cards (Eliminar tarjeta de prueba)
          if (pathname === '/api/admin/cards' && req.method === 'DELETE') {
            const cardId = parsedUrl.searchParams.get('cardId');
            const adminUserId = parsedUrl.searchParams.get('adminUserId');
            const isAdmin = await checkIsAdmin(req, parsedUrl, adminUserId || undefined);
            if (!isAdmin) {
              return sendJson(res, 403, { success: false, message: 'Acceso no autorizado.' });
            }

            if (!cardId) {
              return sendJson(res, 400, { success: false, message: 'ID de tarjeta requerido.' });
            }

            await prisma.paymentCard.delete({ where: { id: cardId } });
            return sendJson(res, 200, { success: true, message: 'Tarjeta de prueba eliminada exitosamente.' });
          }

          // Ruta no encontrada
          return sendJson(res, 404, { success: false, message: `Ruta API ${pathname} no encontrada.` });
        } catch (error: any) {
          console.error(`[API Error] ${pathname}:`, error);
          return sendJson(res, 500, {
            success: false,
            message: 'Error interno del servidor en la base de datos.',
            error: error?.message || String(error)
          });
        }
      });
    }
  };
}
