# 🛒 BLESSED SANDALS & SNEAKERS — E-Commerce Web App

Maqueta interactiva de comercio electrónico para calzado y sandalias, desarrollada con **Node.js**, **Vanilla JavaScript** y **TypeScript puro**, empaquetada con **Vite**.

Diseñada bajo una estética moderna, minimalista y responsive inspirada en la tienda de referencia (Nike / Jordan / SSENSE) con la identidad oficial de **BLESSED SANDALS**.

---

## 🚀 Inicio Rápido con Docker (Recomendado)

Todo el proyecto (Frontend Web en Vite, Base de Datos PostgreSQL y Almacenamiento MinIO S3) está totalmente contenedorizado. Al clonar el repositorio en cualquier otra PC, los contenedores arrancan automáticamente con todo el estado y datos actuales.

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y en ejecución.

### Iniciar todos los servicios
```bash
# 1. Clonar el repositorio y entrar en la carpeta
git clone <URL_DEL_REPOSITORIO>
cd e-comerce

# 2. Copiar variables de entorno (si no existe .env)
cp .env.example .env

# 3. Construir y levantar los contenedores
docker compose up -d
```

### Puertos y Accesos
- 🌐 **Tienda Web (Vite + API Plugin)**: [http://localhost:5173/](http://localhost:5173/)
- 🗄️ **PostgreSQL**: `localhost:5434` (BD: `ecommerce_db`, User: `ecommerce_user`)
- 🪣 **MinIO S3 API**: [http://localhost:9002/](http://localhost:9002/)
- 🎛️ **Consola MinIO Web**: [http://localhost:9003/](http://localhost:9003/) (User: `minioadmin` / Pass: `minioadmin123`)

> 💡 **Nota sobre la persistencia y carga automática en cualquier PC**:
> - **PostgreSQL**: Se inicializa automáticamente en el primer arranque a partir de `docker/postgres-init/01-init.sql`, cargando todas las tablas, usuarios, productos, categorías, pedidos y cupones.
> - **MinIO S3**: El contenedor `ecommerce-minio-init` crea automáticamente el bucket público `ecommerce-assets`, sincroniza todas las fotos desde `docker/minio-seed/ecommerce-assets/` y copia el modelo 3D `Nike Air Jordan 1.glb`.
> - **Servicio Web**: Corre en el contenedor `ecommerce-web`, genera el cliente de Prisma para Linux y se enlaza internamente a PostgreSQL y MinIO.
> - **Dominios y Hosts Personalizados**: Si usas un dominio propio (por ejemplo `blessed-sandals.mixgyt.com`) o un reverse proxy / túnel, configúralo en la variable `ALLOWED_HOSTS` de tu archivo `.env`. Puedes especificar una lista separada por comas o `ALLOWED_HOSTS=true` para permitir cualquier host.

---

## 💻 Desarrollo Local en Host (Alternativa sin Docker Web)

Si prefieres ejecutar el frontend Vite directamente en tu máquina host y solo usar Docker para PostgreSQL y MinIO:

```bash
# Iniciar solo PostgreSQL y MinIO
docker compose up -d postgres minio minio-init

# Instalar dependencias en host
npm install

# Iniciar servidor de desarrollo
npm run dev
```

---

## 🎨 Características Implementadas

1. **Header & Identidad Visual Blessed Sandals**:
   - Barra superior de anuncios (envíos gratis y devoluciones).
   - Logotipo oficial extraído de `assets/logo/` (`Imagotipo_alpha.png` e `Isologo.png`).
   - Navegación principal en español: *Todo el Calzado, Sandalias, Zapatillas Jordan, Hombre, Mujer, Destacados*.
   - Iconos de acción rápidos con contadores reactivos:
     - 🔍 **Buscador predictivo** en tiempo real con chips de búsqueda rápida y atajo de teclado (`Cmd+K` o `Ctrl+K`).
     - ❤️ **Favoritos (Wishlist)** con cajón deslizante y microanimaciones de corazón.
     - 🛍️ **Bolsa de Compras** con cajón deslizante interactivo.

2. **Hero Banner Interactivo**:
   - Banner de alto impacto con efecto 3D tilt al mover el ratón.
   - Botones de llamada a la acción (CTA) directos al catálogo.
   - Píldoras de valor (*Autenticidad 100%, Entrega Rápida 24-48h, Materiales Premium*).

3. **Catálogo & Grid de Productos (Estilo Jordan / Blessed)**:
   - **Barra lateral de filtros (colapsable tipo acordeón)**:
     - Tipo de Producto (Todos, Zapatillas Jordan, Sandalias Blessed).
     - Género (Hombre, Mujer, Unisex).
     - Talla EU (36 al 45).
     - Rango de precio interactivo con slider ($30 - $300).
     - Altura de calzado (Alta / High, Media / Mid, Baja / Low).
     - Tecnologías y materiales.
   - **Grid de 3 columnas (responsivo a 2 y 1 columna en móvil)**:
     - Badges de colección: `MÁS VENDIDO`, `PRÓXIMAMENTE`, `NUEVO`, `DESCUENTO`, `EDICIÓN LIMITADA`.
     - Botón de favoritos directo con animación pop.
     - Muestrario de colores (*swatches*) interactivo: al hacer clic o hover, cambia dinámicamente la foto del zapato/sandalia.
     - Botón de "+ Agregar" directo a la bolsa.
     - Botón "MOSTRAR MÁS" con carga progresiva.

4. **Vista Rápida (Quick View Modal)**:
   - Galería de miniaturas y visor de alta resolución.
   - Selector visual de color y selector de tallas.
   - Selector de cantidad.
   - Botón directo para visualizar el **modelo 3D interactivo (`Nike Air Jordan 1.glb`)** mediante Google `<model-viewer>`.

5. **Bolsa de Compras (Cart Drawer)**:
   - Barra dinámica de envío gratis ("¡Te faltan $X para envío gratis!").
   - Controles de incremento/decremento y eliminación.
   - Sistema de cupones de descuento (Código de prueba: `BLESSED10` para un 10% de descuento).
   - Simulación de Checkout con celebración de confeti animado (`canvas-confetti`).

6. **Notificaciones Toast Flotantes**:
   - Notificaciones no intrusivas en la esquina inferior para acciones de favoritos, adición al carrito y cupones.

7. **Pie de Página (Footer)**:
   - Diseño oscuro minimalista según la maqueta de referencia.
   - Formulario de suscripción al newsletter (*Sé el primero en enterarte*).
   - Enlaces institucionales y legales.

---

## 🗄️ Cómo cambiar los datos de prueba por tu Base de Datos Real

Los datos preliminares se encuentran completamente desacoplados para que la transición a una base de datos o API sea inmediata:

### 1. Ubicación de los datos de prueba actuales
- Archivo: `src/data/mockProducts.ts`
- Aquí están registrados los productos de prueba con las imágenes de `assets/jordan/` y `assets/slide/`.

### 2. Dónde conectar tu API o Base de Datos
- Archivo: `src/services/productService.ts`
- La función `ProductService.getProducts()` ya es asíncrona (`async`). Simplemente reemplaza el retorno de `MOCK_PRODUCTS` por tu llamada HTTP o SDK:

```typescript
// En src/services/productService.ts:
static async getProducts(): Promise<Product[]> {
  const response = await fetch('https://tu-api.com/api/products');
  if (!response.ok) throw new Error('Error al consultar productos');
  return await response.json();
}
```

Una vez conectada la API, puedes eliminar o archivar con tranquilidad `src/data/mockProducts.ts` sin romper ninguna otra parte de la aplicación.

---

## 📁 Estructura del Proyecto

```
e-comerce/
├── assets/                     # Assets originales de la marca (logos, fotos jordan, slide, modelo 3D)
├── public/                     # Enlace simbólico para servir assets estáticos
├── src/
│   ├── types/
│   │   ├── product.ts          # Interfaces tipadas (Product, FilterState, ColorVariant)
│   │   └── cart.ts             # Interfaces de Carrito y Favoritos
│   ├── data/
│   │   └── mockProducts.ts     # Datos de prueba temporales basados en assets
│   ├── services/
│   │   ├── productService.ts   # Servicio desacoplado de consulta y filtrado de productos
│   │   └── storageService.ts   # Persistencia en localStorage
│   ├── state/
│   │   └── store.ts            # Store reactivo central (Patrón Observador)
│   ├── components/
│   │   ├── Header.ts           # Navbar, logos, navegación y accesos
│   │   ├── HeroBanner.ts       # Sección Hero con efecto 3D tilt
│   │   ├── FilterSidebar.ts    # Filtros laterales acordeón
│   │   ├── ProductCard.ts      # Tarjeta individual de calzado
│   │   ├── ProductGrid.ts      # Grid de productos, ordenamiento y paginación
│   │   ├── QuickViewModal.ts   # Modal de detalle y selección de talla/color
│   │   ├── CartDrawer.ts       # Carrito lateral deslizable con checkout
│   │   ├── WishlistDrawer.ts   # Cajón de favoritos
│   │   ├── SearchModal.ts      # Buscador rápido inteligente (Cmd+K)
│   │   ├── Model3DModal.ts     # Visor 3D interactivo GLB con rotación 360°
│   │   ├── Toast.ts            # Sistema de notificaciones toast
│   │   ├── Footer.ts           # Footer oscuro minimalista
│   │   └── Icons.ts            # Iconos vectoriales SVG optimizados
│   ├── styles/
│   │   ├── variables.css       # Colores, tipografía y medidas del diseño
│   │   ├── reset.css           # Reseteo CSS moderno
│   │   ├── animations.css      # Keyframes y clases de animación
│   │   ├── components.css      # Estilos de cada componente y responsive
│   │   └── main.css            # Archivo maestro de estilos
│   └── main.ts                 # Punto de entrada de la aplicación
├── index.html                  # HTML principal
├── package.json
├── tsconfig.json
└── vite.config.ts
```
