import type { Plugin, ViteDevServer } from 'vite';
import { prisma } from '../lib/prisma';
import { MOCK_PRODUCTS } from '../data/mockProducts';
import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

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

          // POST /api/user/cards (Agregar tarjeta de crédito / débito)
          if (pathname === '/api/user/cards' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId, cardHolder, cardNumber, expMonth, expYear, isDefault = false } = body;

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
                expMonth: Number(expMonth),
                expYear: Number(expYear),
                isDefault: setAsDefault
              }
            });

            return sendJson(res, 201, {
              success: true,
              card: newCard,
              message: `Tarjeta ${brand} terminada en ${last4} guardada exitosamente.`
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

            // Expiración por fecha
            if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
              return sendJson(res, 400, {
                success: false,
                message: `El cupón ${promo.code} ha expirado.`
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

          // 8. POST /api/orders/checkout (Finalizar orden y marcar cupón como usado)
          if (pathname === '/api/orders/checkout' && req.method === 'POST') {
            const body = await parseBody(req);
            const { userId, items = [], promoCodeId, subtotal, discount = 0, shipping = 0, total } = body;

            if (!userId) {
              return sendJson(res, 401, {
                success: false,
                requireAuth: true,
                message: 'Debes iniciar sesión para completar la compra.'
              });
            }

            const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            const order = await prisma.order.create({
              data: {
                orderNumber,
                userId,
                status: 'PAID',
                subtotal: Number(subtotal) || 0,
                discount: Number(discount) || 0,
                shipping: Number(shipping) || 0,
                total: Number(total) || 0,
                promoCodeId: promoCodeId || null,
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

            // Si se aplicó un cupón: marcar como usado en la cuenta personal y registrar en promo_usages
            if (promoCodeId) {
              // Marcar como usado en userCoupons
              await prisma.userCoupon.updateMany({
                where: { userId, promoCodeId },
                data: {
                  isUsed: true,
                  usedAt: new Date()
                }
              });

              // Registrar historial en promoUsages
              await prisma.promoUsage.create({
                data: {
                  promoCodeId,
                  userId,
                  orderId: order.id
                }
              });

              // Incrementar contador de usos global
              await prisma.promoCode.update({
                where: { id: promoCodeId },
                data: { timesUsed: { increment: 1 } }
              });
            }

            return sendJson(res, 201, {
              success: true,
              orderNumber: order.orderNumber,
              orderId: order.id,
              message: '¡Pedido realizado exitosamente!'
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
              const gallery = mockMatch?.gallery && mockMatch.gallery.length > 0
                ? mockMatch.gallery
                : (defaultGallery.length > 0 ? defaultGallery : [p.image]);

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
                colors: p.colors.length > 0
                  ? p.colors.map((c) => ({
                      name: c.name,
                      hex: c.hex,
                      image: c.image || undefined
                    }))
                  : (mockMatch?.colors || [{ name: 'Original', hex: '#111827', image: p.image }]),
                sizes: p.sizes.length > 0
                  ? p.sizes.map((s) => s.size)
                  : (mockMatch?.sizes || [38, 39, 40, 41, 42, 43, 44]),
                technology: mockMatch?.technology || ['Amortiguación anatómica', 'Suela antideslizante'],
                features: mockMatch?.features || ['Diseño ergonómico', 'Ajuste cómodo', 'Material de alta calidad'],
                rating: avgRating,
                reviewCount: p.reviews.length || mockMatch?.reviewCount || 18,
                inStock: p.inStock,
                createdAt: p.createdAt.toISOString()
              };
            });

            return sendJson(res, 200, { success: true, products: mapped });
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
