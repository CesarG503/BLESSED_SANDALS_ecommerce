--
-- PostgreSQL database dump
--

\restrict hWm6sfXuZfYZoChN70o3ABWAMAjnwmKbVD74x3rwjJSTvcfjNAXsISViZ9WJFBD

-- Dumped from database version 16.16
-- Dumped by pg_dump version 16.16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.wishlists DROP CONSTRAINT IF EXISTS "wishlists_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.wishlists DROP CONSTRAINT IF EXISTS "wishlists_productId_fkey";
ALTER TABLE IF EXISTS ONLY public.user_coupons DROP CONSTRAINT IF EXISTS "user_coupons_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.user_coupons DROP CONSTRAINT IF EXISTS "user_coupons_promoCodeId_fkey";
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS "reviews_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS "reviews_productId_fkey";
ALTER TABLE IF EXISTS ONLY public.promo_usages DROP CONSTRAINT IF EXISTS "promo_usages_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.promo_usages DROP CONSTRAINT IF EXISTS "promo_usages_promoCodeId_fkey";
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS "products_categoryId_fkey";
ALTER TABLE IF EXISTS ONLY public.product_sizes DROP CONSTRAINT IF EXISTS "product_sizes_productId_fkey";
ALTER TABLE IF EXISTS ONLY public.product_colors DROP CONSTRAINT IF EXISTS "product_colors_productId_fkey";
ALTER TABLE IF EXISTS ONLY public.payment_cards DROP CONSTRAINT IF EXISTS "payment_cards_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS "orders_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS "orders_promoCodeId_fkey";
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS "order_items_productId_fkey";
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS "order_items_orderId_fkey";
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS "cart_items_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS "cart_items_productId_fkey";
ALTER TABLE IF EXISTS ONLY public.addresses DROP CONSTRAINT IF EXISTS "addresses_userId_fkey";
DROP INDEX IF EXISTS public."wishlists_userId_productId_key";
DROP INDEX IF EXISTS public.users_email_key;
DROP INDEX IF EXISTS public."user_coupons_userId_promoCodeId_key";
DROP INDEX IF EXISTS public.promo_codes_code_key;
DROP INDEX IF EXISTS public.products_slug_key;
DROP INDEX IF EXISTS public."product_sizes_productId_size_key";
DROP INDEX IF EXISTS public."orders_orderNumber_key";
DROP INDEX IF EXISTS public.categories_slug_key;
DROP INDEX IF EXISTS public.categories_name_key;
DROP INDEX IF EXISTS public."cart_items_userId_productId_size_colorName_key";
ALTER TABLE IF EXISTS ONLY public.wishlists DROP CONSTRAINT IF EXISTS wishlists_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.user_coupons DROP CONSTRAINT IF EXISTS user_coupons_pkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_pkey;
ALTER TABLE IF EXISTS ONLY public.promo_usages DROP CONSTRAINT IF EXISTS promo_usages_pkey;
ALTER TABLE IF EXISTS ONLY public.promo_codes DROP CONSTRAINT IF EXISTS promo_codes_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.product_sizes DROP CONSTRAINT IF EXISTS product_sizes_pkey;
ALTER TABLE IF EXISTS ONLY public.product_colors DROP CONSTRAINT IF EXISTS product_colors_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_cards DROP CONSTRAINT IF EXISTS payment_cards_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS cart_items_pkey;
ALTER TABLE IF EXISTS ONLY public.addresses DROP CONSTRAINT IF EXISTS addresses_pkey;
DROP TABLE IF EXISTS public.wishlists;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_coupons;
DROP TABLE IF EXISTS public.reviews;
DROP TABLE IF EXISTS public.promo_usages;
DROP TABLE IF EXISTS public.promo_codes;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.product_sizes;
DROP TABLE IF EXISTS public.product_colors;
DROP TABLE IF EXISTS public.payment_cards;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.order_items;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.cart_items;
DROP TABLE IF EXISTS public.addresses;
DROP TYPE IF EXISTS public."Role";
DROP TYPE IF EXISTS public."OrderStatus";
DROP TYPE IF EXISTS public."DiscountType";
--
-- Name: DiscountType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DiscountType" AS ENUM (
    'PERCENTAGE',
    'FIXED',
    'HIDDEN_STORE'
);


--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'PENDING',
    'PAID',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'ADMIN'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addresses (
    id text NOT NULL,
    "userId" text NOT NULL,
    "fullName" text NOT NULL,
    phone text NOT NULL,
    street text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    "postalCode" text NOT NULL,
    country text DEFAULT 'SV'::text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id text NOT NULL,
    "userId" text NOT NULL,
    "productId" text NOT NULL,
    size double precision DEFAULT 9 NOT NULL,
    "colorName" text DEFAULT 'Original'::text NOT NULL,
    "colorHex" text DEFAULT '#000000'::text,
    "colorImage" text,
    quantity integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    image text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text NOT NULL,
    size double precision NOT NULL,
    color text,
    quantity integer NOT NULL,
    "unitPrice" double precision NOT NULL,
    total double precision NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id text NOT NULL,
    "orderNumber" text NOT NULL,
    "userId" text NOT NULL,
    status public."OrderStatus" DEFAULT 'PENDING'::public."OrderStatus" NOT NULL,
    subtotal double precision NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    shipping double precision DEFAULT 0 NOT NULL,
    total double precision NOT NULL,
    "promoCodeId" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payment_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_cards (
    id text NOT NULL,
    "userId" text NOT NULL,
    "cardHolder" text NOT NULL,
    brand text DEFAULT 'VISA'::text NOT NULL,
    last4 text NOT NULL,
    "expMonth" integer NOT NULL,
    "expYear" integer NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    balance double precision DEFAULT 500.0 NOT NULL,
    "cardNumber" text,
    cvc text DEFAULT '123'::text
);


--
-- Name: product_colors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_colors (
    id text NOT NULL,
    "productId" text NOT NULL,
    name text NOT NULL,
    hex text NOT NULL,
    image text,
    gallery text[] DEFAULT ARRAY[]::text[],
    "originalPrice" double precision,
    price double precision,
    sizes jsonb
);


--
-- Name: product_sizes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_sizes (
    id text NOT NULL,
    "productId" text NOT NULL,
    size double precision NOT NULL,
    stock integer DEFAULT 15 NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    subtitle text,
    description text,
    price double precision NOT NULL,
    "originalPrice" double precision,
    badge text,
    gender text DEFAULT 'Unisex'::text NOT NULL,
    height text,
    image text NOT NULL,
    "model3dUrl" text,
    "inStock" boolean DEFAULT true NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    "categoryId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    gallery text[] DEFAULT ARRAY[]::text[],
    "carouselImage" text,
    "showcaseActive" boolean DEFAULT false NOT NULL,
    "showcaseOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_codes (
    id text NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    "discountType" public."DiscountType" DEFAULT 'PERCENTAGE'::public."DiscountType" NOT NULL,
    "discountValue" double precision NOT NULL,
    "minPurchase" double precision,
    "maxDiscount" double precision,
    "usageLimit" integer,
    "timesUsed" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "startsAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isWelcomeOnly" boolean DEFAULT false NOT NULL,
    "onePerUser" boolean DEFAULT true NOT NULL,
    "storeItems" jsonb
);


--
-- Name: promo_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_usages (
    id text NOT NULL,
    "promoCodeId" text NOT NULL,
    "userId" text NOT NULL,
    "orderId" text,
    "usedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id text NOT NULL,
    "userId" text NOT NULL,
    "productId" text NOT NULL,
    rating integer DEFAULT 5 NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: user_coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_coupons (
    id text NOT NULL,
    "userId" text NOT NULL,
    "promoCodeId" text NOT NULL,
    "isUsed" boolean DEFAULT false NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "claimedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    name text NOT NULL,
    avatar text,
    phone text,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: wishlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlists (
    id text NOT NULL,
    "userId" text NOT NULL,
    "productId" text NOT NULL,
    "addedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.addresses (id, "userId", "fullName", phone, street, city, state, "postalCode", country, "isDefault", "createdAt", "updatedAt") FROM stdin;
5a50f139-5958-4229-a3b4-53a2c6d78e6e	571bbbb4-43e5-4f21-81fd-db9f14d20f9a	Alexander Garay	+503 7000-0000	Avenida Las Palmas #123, Colonia Escalón	San Salvador	San Salvador	1101	SV	t	2026-11-21 17:03:28.878	2026-11-21 17:03:28.878
c407042b-5d5f-45c8-849c-f8eed325915f	2b381647-6120-4920-b8fb-0e77ca782b22	cesar garay	77345940	Avenida el Almendro, Urbanización La Mascota, Colonia Campestre 1 (Ref: Cerca de San Salvador Centro, coord: 13.7013, -89.2435)	Antiguo Cuscatlán (La Sultana, Santa Elena)	San Salvador	3970	SV	f	2026-11-21 19:01:54.197	2026-11-21 19:16:22.168
6deb9e76-235f-4d58-9d88-9614d8bf5623	2b381647-6120-4920-b8fb-0e77ca782b22	cesarc	3213213123	87 Avenida Sur, Colonia Campestre 1 (Ref: Cerca de San Salvador Centro, coord: 13.6989, -89.2415)	San Salvador Centro (Escalón, San Benito, Centro)	San Salvador	3970	SV	t	2026-11-21 19:16:14.171	2026-11-21 19:16:22.173
b91d5d99-1512-4cae-ab30-6ba2617606cb	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	Admin Blessed	77345940	colonia 15 de septiembre	san miguel	San Miguel	1101	SV	f	2026-11-22 23:22:19.721	2026-11-22 23:22:53.695
b40f7624-15d4-4bd5-8114-cc432a646a1d	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	cesar garay	+50377345940	colonia 15 de septiembre (Ref: Cerca de San Salvador Centro, coord: 13.6989, -89.2415)	San Miguel Centro	San Miguel	503	SV	t	2026-11-22 23:22:53.708	2026-11-22 23:22:53.708
6e8bde82-ddfb-45a3-b9d0-8375bbe825d0	2b381647-6120-4920-b8fb-0e77ca782b22	Admin Blessed	77345940	colonia 15 de septiembre	san miguel	San Miguel	1101	SV	f	2026-11-22 23:32:33.786	2026-11-22 23:32:33.786
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart_items (id, "userId", "productId", size, "colorName", "colorHex", "colorImage", quantity, "createdAt", "updatedAt") FROM stdin;
e61167ca-75b0-4887-922f-97694fce2f71	8a985114-13b3-4b82-997c-5c4aededec7d	prod-006	36	Vintage Sail Red	#b91c1c	/assets/jordan/jordan5.jpg	2	2026-11-21 20:27:20.342	2026-11-23 20:30:02.389
7e4567e8-868d-40f2-8658-3a6a45bbc957	8a985114-13b3-4b82-997c-5c4aededec7d	prod-002	39	Varsity Red / White	#bd1b21	/assets/jordan/jordan.jpg	1	2026-11-21 20:27:22.019	2026-11-21 20:27:22.019
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, slug, description, image, "createdAt", "updatedAt") FROM stdin;
c74af1a3-9217-4214-86a3-dcaff9347df7	Zapatillas Jordan & Sneaker	shoes	Calzado exclusivo, ediciones retro Jordan y sneakers contemporáneos.	/assets/jordan/jordan1.jpg	2026-11-21 17:03:28.873	2026-11-21 17:03:28.873
1a5f4d2a-b60b-42c1-b5a9-1f73b234be5a	Blessed Sandals & Slides	sandals	Sandalias y slides ergonómicas diseñadas para máximo confort.	/assets/sandalias/slide-white.png	2026-11-21 17:03:28.876	2026-11-21 17:03:28.876
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, "orderId", "productId", size, color, quantity, "unitPrice", total) FROM stdin;
978d02b1-858a-496d-b9fd-42414f7e24a2	8ab58a0f-fa45-4b5e-9de4-c11b157b96f2	prod-001	9	Blanco Puro	1	139.99	139.99
4aa25e7c-18bf-480a-a0fc-eee8de0648e2	04306f25-d4fb-4d56-b200-770cd57d3f79	prod-008	39	White & Crimson	1	135	135
d66d5eb1-e783-48c8-be61-24c099968ef3	e442a646-5cd5-4c0d-82fb-04c3e8e2a64d	prod-001	38	Chicago Red	1	225	225
b6a59a6e-9f93-45bd-9058-3fade78c6ace	69b9e970-524c-41d8-90fd-c1f18cc147f3	prod-005	38	Bred Classic	1	145	145
3e858cb1-9e30-45a3-b1e8-641438a7d3c5	72b318d3-a890-4297-997d-a7d57c2ae514	prod-001	38	Chicago Red	1	225	225
033bca65-4d92-44a9-9ef5-5cfdfd3cbc92	17317d19-303c-45b2-9d4c-e14b4119e097	prod-003	36	Blessed Emerald Green	1	65	65
efd59642-e5ef-424d-8a56-cb241d513b18	17317d19-303c-45b2-9d4c-e14b4119e097	prod-009	36	Blanco Nube	2	55	110
5c657a6f-ec57-4434-bb2f-341a4c2bf3af	17317d19-303c-45b2-9d4c-e14b4119e097	prod-007	39	Cuero Castaño	2	95	190
8d11260a-ec32-496b-b46c-84ccb89334a7	17317d19-303c-45b2-9d4c-e14b4119e097	prod-008	39	White & Crimson	1	135	135
e27aa99b-7cf5-48b6-9a05-8df70bfa3183	baaf6dca-c251-4009-8f62-18fcc2db9286	prod-009	36	Blanco Nube	1	55	55
837b6e9a-e236-49c7-9350-1c333229a46b	baaf6dca-c251-4009-8f62-18fcc2db9286	prod-008	39	White & Crimson	1	135	135
8eb9045d-e4e2-496c-94e9-477876b62e0c	baaf6dca-c251-4009-8f62-18fcc2db9286	prod-007	39	Cuero Castaño	1	95	95
acc49522-6329-4905-93e8-1e220b1e1777	baaf6dca-c251-4009-8f62-18fcc2db9286	prod-004	40	Infrared White	1	200	200
6164d674-d8dd-4490-bf19-30a40625f3a6	baaf6dca-c251-4009-8f62-18fcc2db9286	prod-005	38	Bred Classic	1	145	145
3592b4b7-b61a-4759-bfcc-ca0bf9829ebc	baaf6dca-c251-4009-8f62-18fcc2db9286	prod-006	36	Vintage Sail Red	1	180	180
8ee0f303-5952-4c91-a2fa-b059bc8e923d	baaf6dca-c251-4009-8f62-18fcc2db9286	prod-003	36	Blessed Emerald Green	1	65	65
e2052f85-804a-46ff-a7d2-8c1fec760ae5	baaf6dca-c251-4009-8f62-18fcc2db9286	prod-002	39	Varsity Red / White	1	250	250
1c3143ff-a7a7-4225-9c11-7f6dcb73049a	baaf6dca-c251-4009-8f62-18fcc2db9286	prod-001	38	Chicago Red	1	225	225
0641ad6e-731a-445c-bc5a-89697ab17bfd	670e0c7e-78dc-48a8-942e-391f062748fa	prod-002	39	Varsity Red / White	1	250	250
a6b75fb5-c05d-4b04-993e-90051373812d	6e3bb319-774a-4419-9292-54608b119454	prod-002	9	Original	1	250	250
a899d960-3c30-4bb1-bc46-8645c9e53cf3	ca2209e9-46e6-4aeb-aebd-38c66848b54f	prod-002	39	Varsity Red / White	2	250	500
3372ea7c-a8c1-4264-8102-ee700d177b34	0bf78d69-301b-4360-ad6c-db2783e5fd69	prod-002	39	Varsity Red / White	1	250	250
a25399d7-f169-4cc9-97f3-6ab6a181df62	ed742d3c-75e8-4616-9f1b-b02ac9eaa551	prod-004	40	Infrared White	2	200	400
10bb9eaa-985d-4bfb-9a0b-f9f97ec197b5	ed742d3c-75e8-4616-9f1b-b02ac9eaa551	prod-003	36	Blessed Emerald Green	1	65	65
83f5b53c-2c24-44e0-bf04-d8217d143858	ed742d3c-75e8-4616-9f1b-b02ac9eaa551	a8bf1eef-90a4-4134-a286-14686671fcd0	39	Negro	1	100	100
b1dd0580-f69b-45bb-9537-8736d904914b	3019e69d-7e9e-43c6-bdc0-8b467ccabc9f	prod-004	40	Infrared White	1	100	100
be3f3bc9-c5f5-4763-ba40-4f213371c018	2ba3a637-efe6-4b59-b09b-65b26e2840e9	a8bf1eef-90a4-4134-a286-14686671fcd0	40	Negro	2	100	200
26f65a98-7a2f-4960-b8bc-e6e330283105	b8f13528-d337-4add-a6a2-b6a044bd984d	prod-002	40	Original	2	220	440
1dcb91ef-b45e-45de-b7cd-8e41a0dfcc47	797cb9aa-de94-4000-9db2-664fa1414b80	a8bf1eef-90a4-4134-a286-14686671fcd0	40	Negro	1	100	100
ade49843-a469-4e6e-abc5-afae1ae03205	7bc72b4b-3d9b-4093-8fa6-9b64932795a1	fe7b8259-1d41-41ec-ba00-3b953b045fc6	40	Chalk Sand	1	170	170
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, "orderNumber", "userId", status, subtotal, discount, shipping, total, "promoCodeId", notes, "createdAt", "updatedAt") FROM stdin;
8ab58a0f-fa45-4b5e-9de4-c11b157b96f2	BLS-2026-94812	571bbbb4-43e5-4f21-81fd-db9f14d20f9a	DELIVERED	139.99	14	0	125.99	9b2d1d16-64ee-46cc-a7ba-880b5b081064	Entregar en caseta de seguridad, Residencial Las Palmas	2026-11-21 17:03:28.936	2026-11-21 17:03:28.936
04306f25-d4fb-4d56-b200-770cd57d3f79	ORD-1795287053811-930	2b381647-6120-4920-b8fb-0e77ca782b22	PAID	135	0	0	135	\N	\N	2026-11-21 18:50:53.814	2026-11-21 18:50:53.814
e442a646-5cd5-4c0d-82fb-04c3e8e2a64d	ORD-1795288622662-194	2b381647-6120-4920-b8fb-0e77ca782b22	PAID	225	22.5	0	202.5	9b2d1d16-64ee-46cc-a7ba-880b5b081064	\N	2026-11-21 19:17:02.666	2026-11-21 19:17:02.666
69b9e970-524c-41d8-90fd-c1f18cc147f3	ORD-1795289443370-908	2b381647-6120-4920-b8fb-0e77ca782b22	PAID	145	7.25	0	137.75	32cd7f8d-804d-40e6-9645-d7bcd68f982a	\N	2026-11-21 19:30:43.371	2026-11-21 19:30:43.371
72b318d3-a890-4297-997d-a7d57c2ae514	ORD-1795290192740-410	2b381647-6120-4920-b8fb-0e77ca782b22	PAID	225	25	0	200	732ee998-dfca-4e24-b707-187419d34889	\N	2026-11-21 19:43:12.748	2026-11-21 19:43:12.748
17317d19-303c-45b2-9d4c-e14b4119e097	ORD-1795293563380-438	2b381647-6120-4920-b8fb-0e77ca782b22	PAID	500	0	0	500	\N	\N	2026-11-21 20:39:23.387	2026-11-21 20:39:23.387
baaf6dca-c251-4009-8f62-18fcc2db9286	ORD-1795295006558-287	2b381647-6120-4920-b8fb-0e77ca782b22	PAID	1350	0	0	1350	\N	\N	2026-11-21 21:03:26.565	2026-11-21 21:03:26.565
670e0c7e-78dc-48a8-942e-391f062748fa	ORD-1795380827408-954	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	PAID	250	0	0	250	\N	\N	2026-11-22 20:53:47.413	2026-11-22 20:53:47.413
6e3bb319-774a-4419-9292-54608b119454	ORD-1795388879665-578	571bbbb4-43e5-4f21-81fd-db9f14d20f9a	PAID	0	0	0	250	\N	Stripe Test Mode (Aprobado) • VISA •••• 9999 • Envío a: Alexander Garay (+503 7000-0000), Avenida Las Palmas #123, Colonia Escalón, San Salvador, San Salvador, El Salvador	2026-11-22 23:07:59.666	2026-11-22 23:07:59.666
ca2209e9-46e6-4aeb-aebd-38c66848b54f	ORD-1795389739734-62	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	PAID	500	0	0	500	\N	Stripe Test Mode (Aprobado) • VISA •••• 4242 • Envío a: Admin Blessed (77345940), colonia 15 de septiembre, san miguel, San Miguel, El Salvador	2026-11-22 23:22:19.737	2026-11-22 23:22:19.737
0bf78d69-301b-4360-ad6c-db2783e5fd69	ORD-1795390353800-502	2b381647-6120-4920-b8fb-0e77ca782b22	PAID	250	0	0	250	\N	Stripe Test Mode (Aprobado) • VISA •••• 4242 • Envío a: Admin Blessed (77345940), colonia 15 de septiembre, san miguel, San Miguel, El Salvador	2026-11-22 23:32:33.809	2026-11-22 23:32:33.809
ed742d3c-75e8-4616-9f1b-b02ac9eaa551	ORD-1795391767167-661	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	PAID	565	0	0	565	\N	Stripe Test Mode (Aprobado) • VISA •••• 4242 • Envío a: cesar garay (+50377345940), colonia 15 de septiembre (Ref: Cerca de San Salvador Centro, coord: 13.6989, -89.2415), San Miguel Centro, San Miguel, El Salvador	2026-11-22 23:56:07.18	2026-11-22 23:56:07.18
3019e69d-7e9e-43c6-bdc0-8b467ccabc9f	ORD-1795391971350-928	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	PAID	100	0	0	100	\N	Stripe Test Mode (Aprobado) • VISA •••• 4242 • Envío a: Admin Blessed (77345940), colonia 15 de septiembre, san miguel, San Miguel, El Salvador	2026-11-22 23:59:31.353	2026-11-22 23:59:31.353
2ba3a637-efe6-4b59-b09b-65b26e2840e9	ORD-1795393615937-80	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	PAID	200	0	0	200	\N	Stripe Test Mode (Aprobado) • VISA •••• 4242 • Envío a: cesar garay (+50377345940), colonia 15 de septiembre (Ref: Cerca de San Salvador Centro, coord: 13.6989, -89.2415), San Miguel Centro, San Miguel, El Salvador	2026-11-23 00:26:55.942	2026-11-23 00:26:55.942
b8f13528-d337-4add-a6a2-b6a044bd984d	ORD-1795394228197-456	571bbbb4-43e5-4f21-81fd-db9f14d20f9a	PAID	440	0	0	440	\N	Stripe Test Mode (Aprobado) • VISA •••• 4242 • Envío a: Dirección no especificada	2026-11-23 00:37:08.198	2026-11-23 00:37:08.198
797cb9aa-de94-4000-9db2-664fa1414b80	ORD-1795394648907-790	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	PAID	100	0	0	100	\N	Stripe Test Mode (Aprobado) • VISA •••• 4242 • Envío a: cesar garay (+50377345940), colonia 15 de septiembre (Ref: Cerca de San Salvador Centro, coord: 13.6989, -89.2415), San Miguel Centro, San Miguel, El Salvador	2026-11-23 00:44:08.909	2026-11-23 00:44:08.909
7bc72b4b-3d9b-4093-8fa6-9b64932795a1	ORD-1795461528992-197	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	PAID	170	0	0	170	\N	Stripe Test Mode (Aprobado) • VISA •••• 4242 • Envío a: cesar garay (+50377345940), colonia 15 de septiembre (Ref: Cerca de San Salvador Centro, coord: 13.6989, -89.2415), San Miguel Centro, San Miguel, El Salvador	2026-11-23 19:18:49	2026-11-23 19:18:49
\.


--
-- Data for Name: payment_cards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_cards (id, "userId", "cardHolder", brand, last4, "expMonth", "expYear", "isDefault", "createdAt", "updatedAt", balance, "cardNumber", cvc) FROM stdin;
3346daa6-a133-487a-b5cf-bc02405e0044	571bbbb4-43e5-4f21-81fd-db9f14d20f9a	ALEXANDER TEST LOW	VISA	1111	12	2028	f	2026-11-22 23:07:33.019	2026-11-22 23:07:33.029	15	\N	123
e02d0f97-ca2b-46a1-9318-e92b33303f4b	571bbbb4-43e5-4f21-81fd-db9f14d20f9a	ALEXANDER SUFFICIENT TEST	VISA	9999	12	2028	f	2026-11-22 23:07:59.65	2026-11-22 23:07:59.664	250	\N	123
30b8bdf9-46b3-41e3-b664-0450e7895f1c	2b381647-6120-4920-b8fb-0e77ca782b22	ADMIN BLESSED	VISA	4242	12	2028	f	2026-11-22 23:32:33.755	2026-11-22 23:32:33.755	1250	\N	123
e5dfd3c3-137c-4550-8e4e-2f429109faec	8a985114-13b3-4b82-997c-5c4aededec7d	ADMIN TEST APROBADA	VISA	4242	12	2028	t	2026-11-22 23:49:05.033	2026-11-22 23:49:05.046	800	\N	123
07be998b-65d2-4c50-889a-4077ff453dd7	571bbbb4-43e5-4f21-81fd-db9f14d20f9a	Alexander Garay	VISA	4242	12	2028	t	2026-11-21 17:03:28.878	2026-11-23 00:37:08.191	60	\N	123
e678569b-8778-4a81-92e1-f50fea35e1fe	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	ADMIN BLESSED	VISA	4242	12	2028	f	2026-11-22 23:22:19.707	2026-11-23 19:18:48.963	30	\N	123
\.


--
-- Data for Name: product_colors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_colors (id, "productId", name, hex, image, gallery, "originalPrice", price, sizes) FROM stdin;
68232213-ad83-40c1-bcd8-a3ad1f3a8154	prod-001	Chicago Red	#cf2228	/assets/jordan/jordan1.jpg	{}	\N	\N	\N
27dbcfd9-937a-4733-a2d9-6e712a854d51	prod-001	Pure White	#f0f0f0	/assets/jordan/jordan.jpg	{}	\N	\N	\N
afcf10cd-3181-4732-915f-32dec1542386	prod-001	Bred Black	#1a1a1a	/assets/jordan/jordan4.jpg	{}	\N	\N	\N
51823c73-ae6a-4fff-9206-de8c18a9d8fb	prod-002	Varsity Red / White	#bd1b21	/assets/jordan/jordan.jpg	{}	\N	\N	\N
9ef5144c-eeba-423b-9f8b-aea866b864b7	prod-002	Concord Black	#000000	/assets/jordan/jordan4.jpg	{}	\N	\N	\N
768f55fc-c196-47d4-b570-968b4c32afc6	prod-003	Blessed Emerald Green	#0B3B24	/assets/slide/slide.png	{}	\N	\N	\N
689a8a53-4aed-46ec-93f2-a45c05ccb6ee	prod-003	Sand Gold	#d2b588	/assets/slide/slide.png	{}	\N	\N	\N
b5c30ead-969c-4c86-ae2d-b3a6c0bd93a8	prod-003	Midnight Onyx	#111111	/assets/slide/slide.png	{}	\N	\N	\N
a708f660-aaa7-42b4-824b-19c911799391	prod-004	Infrared White	#e41c2d	/assets/jordan/jordan2.jpg	{}	\N	\N	\N
56f95936-7759-4090-8dfe-3f67d0a028c8	prod-004	Triple White	#f7f7f7	/assets/jordan/jordan.jpg	{}	\N	\N	\N
0311902a-dbe7-4e77-b9d2-ff7a8723f5af	prod-005	Bred Classic	#991b1b	/assets/jordan/jordan4.jpg	{}	\N	\N	\N
41962ab5-7b0b-44fb-9303-a6c28b62526a	prod-005	Sail White	#fef08a	/assets/jordan/jordan5.jpg	{}	\N	\N	\N
a8c6ba94-736a-4655-9f70-a0d191aafe2a	prod-006	Vintage Sail Red	#b91c1c	/assets/jordan/jordan5.jpg	{}	\N	\N	\N
88d1fe16-889c-4204-ab81-1f04c367e8d8	prod-006	Pure White	#ffffff	/assets/jordan/jordan.jpg	{}	\N	\N	\N
47f2fea8-8ada-4d5c-b4b0-53bfcf872f7e	prod-007	Cuero Castaño	#582f0e	/assets/slide/slide.png	{}	\N	\N	\N
b66186e5-8670-4e32-880f-1e691b5c0b09	prod-007	Verde Bosque Blessed	#0B3B24	/assets/slide/slide.png	{}	\N	\N	\N
9986eba2-5429-48b0-9e1c-5d1fdcf6fcff	prod-008	White & Crimson	#ef4444	/assets/jordan/jordan3-preview.jpg	{}	\N	\N	\N
a10a871f-1f97-4deb-a338-37f95f54cdf2	prod-008	Black Patent	#000000	/assets/jordan/jordan4.jpg	{}	\N	\N	\N
dfe4eb10-4137-4f20-8e3b-634e934f2d70	prod-009	Blanco Nube	#ffffff	/assets/slide/slide.png	{}	\N	\N	\N
c33f305c-c4b0-4a26-bc13-bd08058fde28	prod-009	Oro Arena	#d2b588	/assets/slide/slide.png	{}	\N	\N	\N
1b0d9b7a-11f2-41f0-9039-3fda684b9efb	a8bf1eef-90a4-4134-a286-14686671fcd0	Negro	#000000	/ecommerce-assets/1795316848393-foam.jpg	{/ecommerce-assets/1795316848393-foam.jpg,/ecommerce-assets/1795320358577-foam.webp,/ecommerce-assets/1795320369654-foam2.jpg}	101	100	[{"size": 39, "stock": 0}, {"size": 39.5, "stock": 0}, {"size": 40, "stock": 4}, {"size": 40.5, "stock": 0}, {"size": 41, "stock": 0}, {"size": 41.5, "stock": 0}, {"size": 42, "stock": 1}, {"size": 42.5, "stock": 0}, {"size": 43, "stock": 0}, {"size": 43.5, "stock": 0}, {"size": 44, "stock": 0}, {"size": 44.5, "stock": 0}, {"size": 45, "stock": 0}]
8596598c-8e68-48a5-8004-b134811a66dc	a8bf1eef-90a4-4134-a286-14686671fcd0	Blanco	#ffffff	/ecommerce-assets/1795320032741-foam_white.jpg	{/ecommerce-assets/1795320032741-foam_white.jpg}	130	115	[{"size": 39, "stock": 0}, {"size": 39.5, "stock": 0}, {"size": 40, "stock": 0}, {"size": 40.5, "stock": 0}, {"size": 41, "stock": 0}, {"size": 41.5, "stock": 1}, {"size": 42, "stock": 0}, {"size": 42.5, "stock": 0}, {"size": 43, "stock": 0}, {"size": 43.5, "stock": 0}, {"size": 44, "stock": 0}, {"size": 44.5, "stock": 0}, {"size": 45, "stock": 0}]
3e4379d2-2886-4f00-a7c7-4afd27d29e63	8f6dfed5-a11d-4ac4-a3cb-891545558f0d	Carbon Grey	#434343	/ecommerce-assets/stock-adidas-adilette-slide-1795410971679-image_copy_2.png	{/ecommerce-assets/stock-adidas-adilette-slide-1795410971679-image_copy_2.png,/ecommerce-assets/stock-adidas-adilette-slide-1795410971699-image.png,/ecommerce-assets/stock-adidas-adilette-slide-1795410971705-image_copy.png}	60	50	\N
21630505-2c9e-45f4-a8e2-3840c5ead6ef	c77eaf28-c12f-40ba-b88f-a1d5498fed38	Sage Aqua	#506c69	/ecommerce-assets/stock-adidas-aqua-slide-1795410971755-image.png	{/ecommerce-assets/stock-adidas-aqua-slide-1795410971755-image.png,/ecommerce-assets/stock-adidas-aqua-slide-1795410971766-image_copy_2.png,/ecommerce-assets/stock-adidas-aqua-slide-1795410971785-image_copy_3.png,/ecommerce-assets/stock-adidas-aqua-slide-1795410971805-image_copy_4.png,/ecommerce-assets/stock-adidas-aqua-slide-1795410971823-image_copy_5.png,/ecommerce-assets/stock-adidas-aqua-slide-1795410971849-image_copy.png}	42	35	\N
71a476bc-a903-4791-bb15-27067e7a0fe5	fe7b8259-1d41-41ec-ba00-3b953b045fc6	Chalk Sand	#bbb1a1	/ecommerce-assets/stock-adidas-campus-bad-bunny-1795410971870-image.png	{/ecommerce-assets/stock-adidas-campus-bad-bunny-1795410971870-image.png,/ecommerce-assets/stock-adidas-campus-bad-bunny-1795410971891-image_copy_2.png,/ecommerce-assets/stock-adidas-campus-bad-bunny-1795410971903-image_copy.png}	204	170	\N
b207226f-bb07-42cb-bee3-6256062f178d	5399c164-5b86-4b86-b058-5a5ef9378779	Pearl Grey	#c2bbb1	/ecommerce-assets/stock-adidas-confort-2-0-1795410971931-image.png	{/ecommerce-assets/stock-adidas-confort-2-0-1795410971931-image.png,/ecommerce-assets/stock-adidas-confort-2-0-1795410971938-image_copy_2.png,/ecommerce-assets/stock-adidas-confort-2-0-1795410971949-image_copy_3.png,/ecommerce-assets/stock-adidas-confort-2-0-1795410971965-image_copy.png}	42	35	\N
3efddc78-4b54-4c53-96d8-c968482e7e04	d8563134-9fbe-409d-936a-f28119c404b4	Core Black	#1e2022	/ecommerce-assets/stock-adidas-confort-classic-1795410971990-image.png	{/ecommerce-assets/stock-adidas-confort-classic-1795410971990-image.png,/ecommerce-assets/stock-adidas-confort-classic-1795410972000-image_copy_2.png,/ecommerce-assets/stock-adidas-confort-classic-1795410972013-image_copy_3.png,/ecommerce-assets/stock-adidas-confort-classic-1795410972021-image_copy_4.png,/ecommerce-assets/stock-adidas-confort-classic-1795410972031-image_copy.png}	42	35	\N
fa286461-b239-413f-854e-51fb24294ebe	c7338d21-03ff-4c59-b152-a5c349b9bf72	Matte Charcoal	#2b2c2e	/ecommerce-assets/stock-adilette-lumia-slides-1795410972052-image.png	{/ecommerce-assets/stock-adilette-lumia-slides-1795410972052-image.png,/ecommerce-assets/stock-adilette-lumia-slides-1795410972061-image_copy_2.png,/ecommerce-assets/stock-adilette-lumia-slides-1795410972074-image_copy_3.png,/ecommerce-assets/stock-adilette-lumia-slides-1795410972083-image_copy_4.png,/ecommerce-assets/stock-adilette-lumia-slides-1795410972092-image_copy.png}	42	35	\N
02e9b390-d1c2-48d7-a647-c26e44b85e34	aa81def3-1831-4f80-8ba2-f74d12758002	Scarlet Red	#d32f2f	/ecommerce-assets/stock-cambpion-red-slide-1795410972157-image_copy.png	{/ecommerce-assets/stock-cambpion-red-slide-1795410972157-image_copy.png,/ecommerce-assets/stock-cambpion-red-slide-1795410972169-image.png,/ecommerce-assets/stock-cambpion-red-slide-1795410972173-image_copy_2.png,/ecommerce-assets/stock-cambpion-red-slide-1795410972184-image_copy_4.png}	42	35	\N
918c50bf-7834-48ec-b05d-370645d5440a	8374f2df-3186-4a67-81cd-61ad97526d66	Navy College	#223254	/ecommerce-assets/stock-champion-all-america-1795410972201-image.png	{/ecommerce-assets/stock-champion-all-america-1795410972201-image.png,/ecommerce-assets/stock-champion-all-america-1795410972215-image_copy_2.png,/ecommerce-assets/stock-champion-all-america-1795410972221-image_copy.png}	42	35	\N
580394c7-d434-44ee-9d22-45f77e69c335	c3684821-59b2-47d8-b17a-9f20e8fc8d1e	Classic Black	#1b1c1e	/ecommerce-assets/stock-champion-black-slide-1795410972240-image.png	{/ecommerce-assets/stock-champion-black-slide-1795410972240-image.png,/ecommerce-assets/stock-champion-black-slide-1795410972245-image_copy_2.png,/ecommerce-assets/stock-champion-black-slide-1795410972253-image_copy_3.png,/ecommerce-assets/stock-champion-black-slide-1795410972259-image_copy.png}	30	25	\N
5fa710b5-bfb8-4869-8e21-09d02bbae343	e6f3bd65-b0f0-490e-bc44-d7f6c84ddd65	Volt Lime	#b2d24c	/ecommerce-assets/stock-tacos-nike-mercurian-1795410972320-image_copy.png	{/ecommerce-assets/stock-tacos-nike-mercurian-1795410972320-image_copy.png,/ecommerce-assets/stock-tacos-nike-mercurian-1795410972336-image.png,/ecommerce-assets/stock-tacos-nike-mercurian-1795410972349-image_copy_2.png,/ecommerce-assets/stock-tacos-nike-mercurian-1795410972363-image_copy_3.png}	132	110	\N
ad7a2883-534f-493a-b886-44fcaf736a80	009d2b37-a765-48e4-8a1b-573d6ad02d20	Dark Mocha	#7d5e3f	/ecommerce-assets/stock-jordan-1-retro-og-vintage-1795410972293-image_copy.png	{/ecommerce-assets/stock-jordan-1-retro-og-vintage-1795410972293-image_copy.png,/ecommerce-assets/stock-jordan-1-retro-og-vintage-1795410972287-image_copy_2.png,/ecommerce-assets/stock-jordan-1-retro-og-vintage-1795410972271-image.png}	144	120	[{"size": 39, "stock": 20}, {"size": 40, "stock": 20}, {"size": 41, "stock": 20}, {"size": 42, "stock": 20}, {"size": 43, "stock": 20}, {"size": 44, "stock": 20}, {"size": 45, "stock": 20}]
1b16266a-6ab8-4fbb-bba6-a247ad203da6	5d6e7626-1e3c-48c3-ad42-f24e3d3aae6f	Bordeaux Crimson	#8e4b53	/ecommerce-assets/stock-air-jordan-1-crimson-heritage-1795410972130-image.png	{/ecommerce-assets/stock-air-jordan-1-crimson-heritage-1795410972130-image.png,/ecommerce-assets/stock-air-jordan-1-crimson-heritage-1795410972137-image_copy.png}	144	120	[{"size": 39, "stock": 20}, {"size": 40, "stock": 20}, {"size": 41, "stock": 20}, {"size": 42, "stock": 20}, {"size": 43, "stock": 20}, {"size": 44, "stock": 20}, {"size": 45, "stock": 20}]
67f93d2f-6612-449e-ba31-7a72088e5954	0ef1ebe3-cf8c-4743-b0e9-722f86fde46e	Negro	#ffffff	/ecommerce-assets/1795448122965-image.png	{/ecommerce-assets/1795448122965-image.png,/ecommerce-assets/1795448127994-image_copy.png}	20	15	[{"size": 39, "stock": 0}, {"size": 39.5, "stock": 0}, {"size": 40, "stock": 0}, {"size": 40.5, "stock": 0}, {"size": 41, "stock": 0}, {"size": 41.5, "stock": 0}, {"size": 42, "stock": 0}, {"size": 42.5, "stock": 0}, {"size": 43, "stock": 1}, {"size": 43.5, "stock": 0}, {"size": 44, "stock": 0}, {"size": 44.5, "stock": 0}, {"size": 45, "stock": 0}]
\.


--
-- Data for Name: product_sizes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_sizes (id, "productId", size, stock) FROM stdin;
de5fc200-2e6a-4d50-acb2-0f27777127cd	prod-001	38	20
7edcca07-8214-4f21-9f68-c012a315f5ca	prod-001	39	20
af37eb58-9a46-411d-9cd2-6cf04e155537	prod-001	40	20
5f0362c3-ef19-4115-a059-8b9a5fbe6e37	prod-001	41	20
688c9312-d995-40c8-9701-dc7891346093	prod-001	42	20
2c924a60-0f89-405c-8458-dbaa75d1fe5e	prod-001	43	20
f986e2e3-30de-4f39-85cb-7a2bd327cdd9	prod-001	44	20
123fe05f-2554-415f-8a46-43313b42b952	prod-001	45	20
1d38185e-5db6-4926-9049-e588abba4ca0	prod-002	39	20
e0d72f6e-cc5d-4732-ae62-61fd084b003f	prod-002	41	20
966add00-9bee-456a-a30f-7d64741a5a7c	prod-002	42	20
3c7d4d36-3b44-4e61-89a9-d317ab279e90	prod-002	43	20
70bbbb2b-2d56-4957-90b6-6fdf26b884f8	prod-002	44	20
ec416554-ea41-4893-9964-f07a95d2cf1a	prod-002	45	20
4bb0151e-82dc-4e4a-94be-fa1532d09c6d	prod-003	36	20
d4352d04-6e8b-4482-9408-6d2c7dd3999a	prod-003	37	20
10267c25-4240-4126-a0b0-2e18ed065479	prod-003	38	20
0a9860bc-3393-48d1-9781-027345756440	prod-003	39	20
871ec861-b71f-49ad-8671-1aa1212a24fb	prod-003	40	20
b4373add-28f6-425d-95dc-243e8ba443be	prod-003	41	20
31ae782f-ddc2-4064-9093-04edc050ec22	prod-003	42	20
8af9afd4-5c9a-4c95-ad78-036b5d6a5c80	prod-003	43	20
836a59c8-2097-42e8-9689-2e544854055e	prod-003	44	20
440939bc-3f05-49ae-a7c5-371ad5d3e6fb	prod-004	40	20
a1f2574b-6476-48da-8e42-81eb76dc4318	prod-004	41	20
0f5bed82-35fb-4d96-973f-adb7b3e0d708	prod-004	42	20
a6e413ad-ff32-4c32-a2cf-3610132a0073	prod-004	43	20
2ac01786-dc7b-40d6-852a-da43b9c5e578	prod-004	44	20
aeb957a4-5aa6-4c0d-aaa1-db8166fc0680	prod-005	38	20
64c22e2a-a490-4ec9-b2a8-77592b90f975	prod-005	39	20
c0404cf9-9e3c-4cbe-a701-a0a89443edff	prod-005	40	20
bc053433-ec5b-4212-ad1c-bfc4a4d4161c	prod-005	41	20
24da0242-95a9-4d0a-87f1-c6cf490ae921	prod-005	42	20
ea050a9d-2618-484d-9523-22abcba00667	prod-005	43	20
ceac92f8-234f-40ce-97d8-e47ee4721ff4	prod-006	36	20
a3e1512e-1f26-4c9f-8a3a-ff2fc275fc24	prod-006	37	20
9dd951c2-444e-4ae6-930a-a799e2c420db	prod-006	38	20
2b3cb78e-1e8b-4514-89d7-b1a9da536cf4	prod-006	39	20
9bd4a39e-0fe2-4b59-bbbc-904bfd6b81b7	prod-006	40	20
f0fcb7f6-8bd0-4475-8a56-31131c5c4f6f	prod-006	41	20
0329a4c1-b062-4628-a8af-6e76e54603b6	prod-007	39	20
506224fb-9305-4be0-9850-ade004453bbc	prod-007	40	20
f24a4839-8478-4d6e-a0fb-b5fa59b34bfe	prod-007	41	20
c4fae11e-971c-49ae-bd4b-03bd910d5acd	prod-007	42	20
d2ae2a90-3606-4ab7-9b2b-f5a80a07d565	prod-007	43	20
6dd25ba1-6579-467a-bcef-9e79c9c28db8	prod-007	44	20
68662742-dc5e-4c66-a89c-222bee0fad69	prod-007	45	20
50955dff-54b9-488b-87af-0e87ccae53b1	prod-008	39	20
61748c9a-43ca-403c-a9f4-d02539e7e5fb	prod-008	40	20
56679379-83e6-4f7d-8e0c-24af65ab8002	prod-008	41	20
e7dfff2f-236f-44bb-8d88-e4f084e3425d	prod-008	42	20
423d6f03-de87-43a8-9ea1-70db52f430a6	prod-008	43	20
4c5322cd-dc7c-4d7f-8c3b-c4cfba624fcb	prod-008	44	20
24b2336c-317c-48ce-a542-eaec1fd3fac8	prod-002	40	18
ccc04fb7-63e8-40b8-90d8-6e761217f045	prod-009	36	20
dca05baa-4c0f-461f-b78e-2d73fe16dae3	prod-009	37	20
bd10aaa2-8039-4ad1-ae11-1f402394d701	prod-009	38	20
a49b4129-c46f-44e7-b215-f3173f0eb0ef	prod-009	39	20
d4eb2da5-9c4d-444f-b922-3be1899f5f38	prod-009	39.5	0
c4855661-8249-4901-b651-b776558ee905	prod-009	40	20
d459b708-226c-41fa-ad3a-6ebf98bfdf63	prod-009	40.5	0
1d07ba1d-eda5-4226-b6b2-118abb3b15e3	prod-009	41	20
3a4f2f5b-3c47-4188-9200-b239f85d2579	prod-009	41.5	0
7222fe50-5f05-4834-8b9a-2e7075c8f212	prod-009	42	0
add46bc2-53c2-43fb-bfec-897fdfd82258	prod-009	42.5	0
ad59ec52-fdd9-4fd6-b198-422f6092768b	prod-009	43	0
528ae93a-0025-422e-bf21-90726d9c8e61	prod-009	43.5	0
886938a4-c917-4b98-a71c-5d199617a221	prod-009	44	0
cff27692-b455-4973-ab97-9bd7a5879a1f	prod-009	44.5	0
f5be06fb-0c72-4ea3-83d4-b57fc45640e0	prod-009	45	0
a75c1fc3-0e53-4cfb-a726-e0a13311eb68	a8bf1eef-90a4-4134-a286-14686671fcd0	39	0
94f0529c-403f-4c47-8de6-982a919f2133	a8bf1eef-90a4-4134-a286-14686671fcd0	39.5	0
e94687b2-2024-4a62-a701-72ee4879e26f	a8bf1eef-90a4-4134-a286-14686671fcd0	40.5	0
727e9896-3664-4fb6-8e6f-a46ae1b960f1	a8bf1eef-90a4-4134-a286-14686671fcd0	41	0
b4fdbd00-b3a5-49cc-92e4-0f993cdfd0e3	a8bf1eef-90a4-4134-a286-14686671fcd0	41.5	1
ac01439b-92e0-403c-8164-2fe12d760319	a8bf1eef-90a4-4134-a286-14686671fcd0	42	1
0359d288-d8e7-4095-887f-d7aab3230b73	a8bf1eef-90a4-4134-a286-14686671fcd0	42.5	0
9c1e3b2e-b40a-4c54-9603-b2920f86dace	a8bf1eef-90a4-4134-a286-14686671fcd0	43	0
782094f3-643f-4977-b936-6938180a046e	a8bf1eef-90a4-4134-a286-14686671fcd0	43.5	0
df15ef6f-3c30-4275-84f2-1931bf7bd705	a8bf1eef-90a4-4134-a286-14686671fcd0	44	0
54bd4c7e-6189-4291-aa5d-8fdce2ebed67	a8bf1eef-90a4-4134-a286-14686671fcd0	44.5	0
9ebc9532-60dd-4b5d-ac5e-36a600b77bd6	a8bf1eef-90a4-4134-a286-14686671fcd0	45	0
3605fc39-633b-4771-8550-f5752e9c4d5a	a8bf1eef-90a4-4134-a286-14686671fcd0	40	4
98bad0d8-442a-4d6c-bf18-8e2a1e20d706	8f6dfed5-a11d-4ac4-a3cb-891545558f0d	38	20
cc9efce3-2d5c-4b38-a505-80cf899893fa	8f6dfed5-a11d-4ac4-a3cb-891545558f0d	39	20
20972004-93f0-42d1-9167-b9e44e551037	8f6dfed5-a11d-4ac4-a3cb-891545558f0d	40	20
fba123d7-d76d-4fa5-9454-d91fd4db3020	8f6dfed5-a11d-4ac4-a3cb-891545558f0d	41	20
d285b85e-cf7b-47ca-b02f-3f5799c74c4d	8f6dfed5-a11d-4ac4-a3cb-891545558f0d	42	20
94dc609a-c985-457e-bf1c-dad98f615b5e	8f6dfed5-a11d-4ac4-a3cb-891545558f0d	43	20
69aa353a-4f2c-4041-bcba-5e3cac30f0f2	8f6dfed5-a11d-4ac4-a3cb-891545558f0d	44	20
570ad16c-88a8-4512-91f5-baac1804e697	c77eaf28-c12f-40ba-b88f-a1d5498fed38	38	20
6761d591-8d97-4312-8012-eeb630661844	c77eaf28-c12f-40ba-b88f-a1d5498fed38	39	20
65de8408-484e-4f40-8a4c-0d0328b5247d	c77eaf28-c12f-40ba-b88f-a1d5498fed38	40	20
b14547c9-04e3-489c-aede-a252105d1c37	c77eaf28-c12f-40ba-b88f-a1d5498fed38	41	20
cd6b727d-088c-4d46-8b8e-caf139c3aba0	c77eaf28-c12f-40ba-b88f-a1d5498fed38	42	20
4926bc4d-0e33-41ad-b253-4e9364095eb7	c77eaf28-c12f-40ba-b88f-a1d5498fed38	43	20
6a1868d7-8999-4851-9155-d247014d9b55	c77eaf28-c12f-40ba-b88f-a1d5498fed38	44	20
69e45520-b3a6-4053-b337-a56f7f0da428	fe7b8259-1d41-41ec-ba00-3b953b045fc6	38	20
c987096b-914e-4fbf-a0db-295355914ccc	fe7b8259-1d41-41ec-ba00-3b953b045fc6	39	20
e505a1db-75a0-49e1-a33f-4edf733d9b2c	fe7b8259-1d41-41ec-ba00-3b953b045fc6	41	20
ea5ddc3c-a08d-4d0b-a860-902d36704927	fe7b8259-1d41-41ec-ba00-3b953b045fc6	42	20
4d5bf244-749b-4232-bae0-2735ca13063a	fe7b8259-1d41-41ec-ba00-3b953b045fc6	40	19
79025ca2-3896-4122-92eb-7c80616cbed1	fe7b8259-1d41-41ec-ba00-3b953b045fc6	43	20
002035bd-305c-41c0-a265-1651ea872ea2	fe7b8259-1d41-41ec-ba00-3b953b045fc6	44	20
2462d5d9-d3b2-4768-b6e8-62a67696e1f0	fe7b8259-1d41-41ec-ba00-3b953b045fc6	45	20
cd209659-04b8-419d-a446-6f0da060b201	5399c164-5b86-4b86-b058-5a5ef9378779	38	20
fad46ece-82f2-448c-b8f6-a56af8514435	5399c164-5b86-4b86-b058-5a5ef9378779	39	20
fecd5d07-c408-4893-b79d-766f345b2f42	5399c164-5b86-4b86-b058-5a5ef9378779	40	20
f341f7c0-2821-4761-9f2f-78682348c546	5399c164-5b86-4b86-b058-5a5ef9378779	41	20
0ec016e1-c2c3-4304-9a1b-2aa7522cee1d	5399c164-5b86-4b86-b058-5a5ef9378779	42	20
372ec0b7-0bca-42aa-8c3b-bd53ca03b2c7	5399c164-5b86-4b86-b058-5a5ef9378779	43	20
fec86887-c3b0-4496-bd84-a97c9c15371d	5399c164-5b86-4b86-b058-5a5ef9378779	44	20
fd22a816-1d4e-4820-944f-b5f2e53fd914	d8563134-9fbe-409d-936a-f28119c404b4	38	20
208fb3be-1277-4ab0-8075-1265bc3293ff	d8563134-9fbe-409d-936a-f28119c404b4	39	20
a4d359c8-6071-4867-88bd-5f9d7508f046	d8563134-9fbe-409d-936a-f28119c404b4	40	20
702e209d-80d8-4880-8416-7200a7d38c3a	d8563134-9fbe-409d-936a-f28119c404b4	41	20
dcb10987-4a85-4421-86de-adb422b12bf6	d8563134-9fbe-409d-936a-f28119c404b4	42	20
059fec4b-132e-4204-92b1-61bf71de378b	d8563134-9fbe-409d-936a-f28119c404b4	43	20
87fb93f3-dcbf-40cb-93db-8a290edcd35f	d8563134-9fbe-409d-936a-f28119c404b4	44	20
6d9e0acc-d54d-4695-9281-165582a2ef09	c7338d21-03ff-4c59-b152-a5c349b9bf72	38	20
b7e40b48-68c4-4960-9890-d9a5941716f9	c7338d21-03ff-4c59-b152-a5c349b9bf72	39	20
b57aaec4-de6c-4e31-93ce-d76c0285dd8c	c7338d21-03ff-4c59-b152-a5c349b9bf72	40	20
678c8bee-113b-4bc6-aea6-6941835f1e06	c7338d21-03ff-4c59-b152-a5c349b9bf72	41	20
29250d74-071c-4665-ab17-6abf02906db3	c7338d21-03ff-4c59-b152-a5c349b9bf72	42	20
6838110b-d226-456d-8632-3c35cfe4cb79	c7338d21-03ff-4c59-b152-a5c349b9bf72	43	20
c3e89a40-6a8b-470f-9110-ae74b4544cc9	c7338d21-03ff-4c59-b152-a5c349b9bf72	44	20
dadf3710-73a4-4794-8fa3-161fddf66ee6	aa81def3-1831-4f80-8ba2-f74d12758002	38	20
a2d9cbe0-d0e4-41db-92b1-24a460ef4c39	aa81def3-1831-4f80-8ba2-f74d12758002	39	20
c4f76bd1-d69f-4582-a4fc-fffdb48d8b30	aa81def3-1831-4f80-8ba2-f74d12758002	40	20
9524cf1a-d569-403a-b165-a5711773ece8	aa81def3-1831-4f80-8ba2-f74d12758002	41	20
a3805eb0-75b7-4ce3-9d09-ba8244029551	aa81def3-1831-4f80-8ba2-f74d12758002	42	20
512fc427-6537-40e8-ab92-92d1598e4c1d	aa81def3-1831-4f80-8ba2-f74d12758002	43	20
8a022027-03d4-44ae-b781-39ef451d3c73	aa81def3-1831-4f80-8ba2-f74d12758002	44	20
1bd637af-00f4-488d-af59-9a94f0e18f17	8374f2df-3186-4a67-81cd-61ad97526d66	38	20
13c2ecaf-880f-4634-90aa-084d1c97df3b	8374f2df-3186-4a67-81cd-61ad97526d66	39	20
6b6ca809-cb15-4487-8abd-c4462c1ed9d0	8374f2df-3186-4a67-81cd-61ad97526d66	40	20
8e755a97-c38a-46c5-8dc8-62af0d5f2154	8374f2df-3186-4a67-81cd-61ad97526d66	41	20
96d7dae1-d7f9-4881-ab93-8e9b80d6bf9d	8374f2df-3186-4a67-81cd-61ad97526d66	42	20
8e58017a-9539-40de-bf5e-eeb9a3b86fce	8374f2df-3186-4a67-81cd-61ad97526d66	43	20
0c86c2c0-7f67-4403-8ea1-375985b6a570	8374f2df-3186-4a67-81cd-61ad97526d66	44	20
d22f25fb-7732-4b85-8d5d-b9af510b1246	c3684821-59b2-47d8-b17a-9f20e8fc8d1e	38	20
5ff4a0d3-c7ff-4b4c-83b5-064280babde5	c3684821-59b2-47d8-b17a-9f20e8fc8d1e	39	20
f6ab0364-751b-4ae1-af52-c31d03604a50	c3684821-59b2-47d8-b17a-9f20e8fc8d1e	40	20
2130e3ce-b91f-4aba-a654-0c6967ecd78e	c3684821-59b2-47d8-b17a-9f20e8fc8d1e	41	20
0a280921-8e4e-49b6-96d8-c48ad7c44f27	c3684821-59b2-47d8-b17a-9f20e8fc8d1e	42	20
1b5f944b-d6d7-4a28-977c-609a25531e65	c3684821-59b2-47d8-b17a-9f20e8fc8d1e	43	20
2af2379e-62e1-4248-97c8-686ea4c0a2e2	c3684821-59b2-47d8-b17a-9f20e8fc8d1e	44	20
797f3a52-abe6-4685-92f7-82e2ca2d3907	e6f3bd65-b0f0-490e-bc44-d7f6c84ddd65	38	20
f84d5c44-c9b7-4b88-9589-f5a644099c1b	e6f3bd65-b0f0-490e-bc44-d7f6c84ddd65	39	20
f1885705-50b0-4191-9a65-36bee990844a	e6f3bd65-b0f0-490e-bc44-d7f6c84ddd65	40	20
1024d8c0-80c8-422e-a0b1-c84192bb2eb4	e6f3bd65-b0f0-490e-bc44-d7f6c84ddd65	41	20
c2ffa1d9-868b-4090-ab9a-024f0137bef2	e6f3bd65-b0f0-490e-bc44-d7f6c84ddd65	42	20
754753c4-42f4-44f4-987e-44cf31c98965	e6f3bd65-b0f0-490e-bc44-d7f6c84ddd65	43	20
32c19c83-e29c-4845-a1cd-344af3816e72	e6f3bd65-b0f0-490e-bc44-d7f6c84ddd65	44	20
e6f3b9ff-9657-4d05-8f71-b0fbe63c048e	e6f3bd65-b0f0-490e-bc44-d7f6c84ddd65	45	20
c768c2b1-c3b5-47f2-8b66-d03899339e30	009d2b37-a765-48e4-8a1b-573d6ad02d20	39	20
d8264eb9-74ee-416e-b63d-fcdd34e3d66b	009d2b37-a765-48e4-8a1b-573d6ad02d20	40	20
f1a8d3f3-6ed1-438a-8718-6df24844d51b	009d2b37-a765-48e4-8a1b-573d6ad02d20	41	20
a6155ba7-6f1c-4eb9-9d0e-831617b02b0b	009d2b37-a765-48e4-8a1b-573d6ad02d20	42	20
305fced1-4dda-456c-a864-030ef438ef42	009d2b37-a765-48e4-8a1b-573d6ad02d20	43	20
8352751d-6238-41d6-8055-47acfbea4d35	009d2b37-a765-48e4-8a1b-573d6ad02d20	44	20
c261106e-5dc6-47a9-8c23-d5d02b60cee6	009d2b37-a765-48e4-8a1b-573d6ad02d20	45	20
1cf2c38f-4e08-4f17-b4c2-bebd0cb10499	5d6e7626-1e3c-48c3-ad42-f24e3d3aae6f	39	20
1f6b6381-1179-4c72-8211-0991520630ab	5d6e7626-1e3c-48c3-ad42-f24e3d3aae6f	40	20
797958f3-9c71-4d54-bce9-dd701880f90f	5d6e7626-1e3c-48c3-ad42-f24e3d3aae6f	41	20
490c122c-11d7-44ed-85c6-b6e7569dfac6	5d6e7626-1e3c-48c3-ad42-f24e3d3aae6f	42	20
3a7503e5-8b72-4fc8-b62d-68a3d800f38c	5d6e7626-1e3c-48c3-ad42-f24e3d3aae6f	43	20
7b0d989e-604b-4faf-b081-8a94b4bb3e0e	5d6e7626-1e3c-48c3-ad42-f24e3d3aae6f	44	20
b6029c8f-a64a-4806-b8eb-baa32775b5e1	5d6e7626-1e3c-48c3-ad42-f24e3d3aae6f	45	20
fe57c67d-a0e3-4211-8920-70b8fed8346c	0ef1ebe3-cf8c-4743-b0e9-722f86fde46e	39	0
43dc00cc-a155-4580-8e90-414297fd4163	0ef1ebe3-cf8c-4743-b0e9-722f86fde46e	39.5	0
4afa21b4-2240-4149-8f24-93fe80012318	0ef1ebe3-cf8c-4743-b0e9-722f86fde46e	40	0
a54b52c5-226a-4673-8532-3e795394679c	0ef1ebe3-cf8c-4743-b0e9-722f86fde46e	40.5	0
2f5a89ef-db03-40ef-bf3b-fc05dc7071a2	0ef1ebe3-cf8c-4743-b0e9-722f86fde46e	41	0
aa74a457-5b9e-4e98-a7ae-3c6afa1d3638	0ef1ebe3-cf8c-4743-b0e9-722f86fde46e	41.5	0
86df6f02-55a1-4769-9113-594672151161	0ef1ebe3-cf8c-4743-b0e9-722f86fde46e	42	0
688ff4f4-da2a-4d5e-b26d-82b28bfddfd8	0ef1ebe3-cf8c-4743-b0e9-722f86fde46e	42.5	0
425bd71b-c91b-4a50-9271-70638995e6a8	0ef1ebe3-cf8c-4743-b0e9-722f86fde46e	43	1
2541d7e8-63f5-428d-b32c-96824f1e6d41	0ef1ebe3-cf8c-4743-b0e9-722f86fde46e	43.5	0
c9e86334-ed74-4bfd-af2e-8d78fc9b0ade	0ef1ebe3-cf8c-4743-b0e9-722f86fde46e	44	0
5c795f6b-aec4-4e00-a8ea-90a5a31864e4	0ef1ebe3-cf8c-4743-b0e9-722f86fde46e	44.5	0
439c80ca-b6b3-4401-b49f-fa7e0d0e6341	0ef1ebe3-cf8c-4743-b0e9-722f86fde46e	45	0
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, name, slug, subtitle, description, price, "originalPrice", badge, gender, height, image, "model3dUrl", "inStock", featured, "categoryId", "createdAt", "updatedAt", gallery, "carouselImage", "showcaseActive", "showcaseOrder") FROM stdin;
prod-003	Blessed Slide Sandal Classic	blessed-slide-sandal-classic	Sandalia Ergonómica de Descanso	La máxima comodidad para el día a día. Fabricada con espuma de doble densidad y textura ergonómica que masajea el pie con cada pisada. El distintivo sello Blessed en relieve.	65	\N	NUEVO	Unisex	Baja	/assets/slide/slide.png	\N	t	f	1a5f4d2a-b60b-42c1-b5a9-1f73b234be5a	2026-11-21 17:03:28.91	2026-11-21 17:03:28.91	{}	\N	f	0
prod-004	Air Jordan 6 Retro	air-jordan-6-retro	Calzado Lifestyle Deportivo	La silueta con la que MJ conquistó su primer anillo en 1991. Estilo agresivo, perforaciones para ventilación y una unidad Air visible en la entresuela.	200	\N	MÁS VENDIDO	Hombre	Alta	/assets/jordan/jordan2.jpg	\N	t	t	c74af1a3-9217-4214-86a3-dcaff9347df7	2026-11-21 17:03:28.913	2026-11-21 17:03:28.913	{}	\N	f	0
prod-005	Air Jordan 1 Mid	air-jordan-1-mid	Calzado para Mujer y Hombre	Inspirado en el AJ1 original, este modelo de perfil medio ofrece una estética urbana limpia con acentos en contraste y comodidad durante toda la jornada.	145	\N	DESCUENTO	Unisex	Media	/assets/jordan/jordan4.jpg	\N	t	f	c74af1a3-9217-4214-86a3-dcaff9347df7	2026-11-21 17:03:28.917	2026-11-21 17:03:28.917	{}	\N	f	0
prod-006	Air Jordan 1 Elevate High	air-jordan-1-elevate-high	Calzado con Plataforma para Mujer	Lleva tu estilo a nuevas alturas con una entresuela de plataforma audaz combinada con la legendaria silueta de caña alta. Diseño sofisticado y vanguardista.	180	\N	EDICIÓN LIMITADA	Mujer	Alta	/assets/jordan/jordan5.jpg	\N	t	f	c74af1a3-9217-4214-86a3-dcaff9347df7	2026-11-21 17:03:28.921	2026-11-21 17:03:28.921	{}	\N	f	0
prod-008	Air Jordan 11 CMFT Low	air-jordan-11-cmft-low	Calzado Ligero de Verano	Una reinterpretación de corte bajo pensada para el confort urbano diario. Incorpora espuma Cushlon suave y una estética limpia inspirada en los campeonatos de Chicago.	135	\N	DESCUENTO	Hombre	Baja	/assets/jordan/jordan3-preview.jpg	\N	t	f	c74af1a3-9217-4214-86a3-dcaff9347df7	2026-11-21 17:03:28.931	2026-11-21 17:03:28.931	{}	\N	f	0
prod-009	Blessed Slide Foam Runner	blessed-slide-foam-runner	Sandalia Deportiva Recuperación	Diseñada específicamente para descanso y recuperación muscular. Su estructura de una sola pieza envuelve el arco plantar brindando una sensación flotante al caminar.	55	\N	NUEVO	Mujer	Baja	/assets/slide/slide.png	\N	t	f	1a5f4d2a-b60b-42c1-b5a9-1f73b234be5a	2026-11-21 17:03:28.933	2026-11-22 03:09:54.432	{/assets/slide/slide.png}	\N	f	0
prod-001	Air Jordan 1 Retro High OG	air-jordan-1-retro-high-og	Calzado para Hombre	El clásico atemporal reinventado con materiales de primera calidad. Cuenta con amortiguación Air encapsulada en el talón y el emblemático logotipo Wings.	225	\N	MÁS VENDIDO	Hombre	Alta	/assets/jordan/jordan1.jpg	/assets/modelos/Nike Air Jordan 1.glb	t	t	c74af1a3-9217-4214-86a3-dcaff9347df7	2026-11-21 17:03:28.898	2026-11-22 04:45:41.511	{}	\N	f	0
prod-002	Air Jordan 11 Retro	air-jordan-11-retro	Calzado de Baloncesto y Estilo	Uno de los diseños más codiciados de todos los tiempos. La combinación de charol brillante y amortiguación de longitud completa ofrece elegancia dentro y fuera de la cancha.	250	\N	PRÓXIMAMENTE	Hombre	Media	/assets/jordan/jordan.jpg	\N	t	f	c74af1a3-9217-4214-86a3-dcaff9347df7	2026-11-21 17:03:28.906	2026-11-23 00:37:08.213	{}	\N	f	0
aa81def3-1831-4f80-8ba2-f74d12758002	Cambpion Red Slide	cambpion-red-slide	Sandalia Atlética Bold Scarlet Red	Intenso color rojo escarlata con el clásico logotipo Champion moldeado en relieve sobre la banda superior. Correa acolchada de secado rápido y plantilla anatómica con soporte antideslizante.	35	42	POPULAR	Unisex	\N	/ecommerce-assets/stock-cambpion-red-slide-1795410972157-image_copy.png	\N	t	f	1a5f4d2a-b60b-42c1-b5a9-1f73b234be5a	2026-11-23 05:16:12.194	2026-11-23 05:16:12.194	{/ecommerce-assets/stock-cambpion-red-slide-1795410972157-image_copy.png,/ecommerce-assets/stock-cambpion-red-slide-1795410972169-image.png,/ecommerce-assets/stock-cambpion-red-slide-1795410972173-image_copy_2.png,/ecommerce-assets/stock-cambpion-red-slide-1795410972184-image_copy_4.png}	\N	f	0
0ef1ebe3-cf8c-4743-b0e9-722f86fde46e	Jordan Everyday Socks DRI-FIT	jordan-everyday-socks-dri-fit-mwtfh8i1	calcetines de calidad	Calidad Unica algodón DRI-FIT	15	20	GOAD	Unisex	\N	/ecommerce-assets/1795448122965-image.png	\N	t	f	1a5f4d2a-b60b-42c1-b5a9-1f73b234be5a	2026-11-23 15:36:02.381	2026-11-23 15:36:30.979	{/ecommerce-assets/1795448122965-image.png,/ecommerce-assets/1795448127994-image_copy.png}	\N	f	0
prod-007	Blessed Sandal Leather Luxe	blessed-sandal-leather-luxe	Sandalia de Piel Hecha a Mano	La máxima expresión del lujo relajado. Elaborada artesanalmente con pieles seleccionadas y entresuela de corcho natural que se adapta a tu pisada con el tiempo.	95	\N	EDICIÓN LIMITADA	Hombre	Baja	/assets/slide/slide.png	\N	t	f	1a5f4d2a-b60b-42c1-b5a9-1f73b234be5a	2026-11-21 17:03:28.928	2026-11-23 05:23:56.948	{}	/ecommerce-assets/1795323755694-carousel-1795323755638-slide.png	f	-1
c3684821-59b2-47d8-b17a-9f20e8fc8d1e	Champion Black Slide	champion-black-slide	Sandalia Ergonómica Classic Athletic Slide	La sandalia casual más versátil y ligera de Champion. Silueta en color negro con logo en contraste blanco, plantilla acanalada y suela con relieve de máxima adherencia sobre cualquier superficie.	25	30	DESCUENTO	Unisex	\N	/ecommerce-assets/stock-champion-black-slide-1795410972240-image.png	\N	t	f	1a5f4d2a-b60b-42c1-b5a9-1f73b234be5a	2026-11-23 05:16:12.264	2026-11-23 05:16:12.264	{/ecommerce-assets/stock-champion-black-slide-1795410972240-image.png,/ecommerce-assets/stock-champion-black-slide-1795410972245-image_copy_2.png,/ecommerce-assets/stock-champion-black-slide-1795410972253-image_copy_3.png,/ecommerce-assets/stock-champion-black-slide-1795410972259-image_copy.png}	/ecommerce-assets/stock-champion-black-slide-carousel-1795410972232.png	t	9
a8bf1eef-90a4-4134-a286-14686671fcd0	Blessed Slide Foam Runner	blessed-slide-foam-runner-mwr8sbuc	Sandalia Deportiva Recuperación	el mejor par del mundo	100	101	GOAD	Unisex	\N	/ecommerce-assets/1795316848393-foam.jpg	\N	t	f	1a5f4d2a-b60b-42c1-b5a9-1f73b234be5a	2026-11-22 02:53:10.265	2026-11-23 15:14:23.854	{/ecommerce-assets/1795316848393-foam.jpg,/ecommerce-assets/1795320358577-foam.webp,/ecommerce-assets/1795320369654-foam2.jpg}	/ecommerce-assets/1795323566702-carousel-1795323566690-foam.png	t	-1
c7338d21-03ff-4c59-b152-a5c349b9bf72	Adilette Lumia Slides	adilette-lumia-slides	Sandalia Ergonómica Urbana Estilo Lumia	Diseño futurista con estructura geométrica aerodinámica y ranuras de flexión optimizadas en la suela. Material EVA de alta densidad resistente al agua, desgaste y abrasión diaria.	35	42	DESTACADO	Unisex	\N	/ecommerce-assets/stock-adilette-lumia-slides-1795410972052-image.png	\N	t	f	1a5f4d2a-b60b-42c1-b5a9-1f73b234be5a	2026-11-23 05:16:12.104	2026-11-23 05:16:12.104	{/ecommerce-assets/stock-adilette-lumia-slides-1795410972052-image.png,/ecommerce-assets/stock-adilette-lumia-slides-1795410972061-image_copy_2.png,/ecommerce-assets/stock-adilette-lumia-slides-1795410972074-image_copy_3.png,/ecommerce-assets/stock-adilette-lumia-slides-1795410972083-image_copy_4.png,/ecommerce-assets/stock-adilette-lumia-slides-1795410972092-image_copy.png}	/ecommerce-assets/stock-adilette-lumia-slides-carousel-1795410972044.png	t	6
e6f3bd65-b0f0-490e-bc44-d7f6c84ddd65	Tacos nike mercurian	tacos-nike-mercurian	Botines de Fútbol Césped FG High Speed	Diseñados para desatar velocidad y aceleración explosiva. Empeine sintético con microrrelieve para control excepcional del balón a toda velocidad y suela de tacos cónicos para cambios de dirección fulgurantes.	110	132	NUEVO	Unisex	Baja	/ecommerce-assets/stock-tacos-nike-mercurian-1795410972320-image_copy.png	\N	t	t	c74af1a3-9217-4214-86a3-dcaff9347df7	2026-11-23 05:16:12.379	2026-11-23 05:16:12.379	{/ecommerce-assets/stock-tacos-nike-mercurian-1795410972320-image_copy.png,/ecommerce-assets/stock-tacos-nike-mercurian-1795410972336-image.png,/ecommerce-assets/stock-tacos-nike-mercurian-1795410972349-image_copy_2.png,/ecommerce-assets/stock-tacos-nike-mercurian-1795410972363-image_copy_3.png}	/ecommerce-assets/stock-tacos-nike-mercurian-carousel-1795410972305.png	t	11
8374f2df-3186-4a67-81cd-61ad97526d66	Champion All America	champion-all-america	Sandalia Colegial Retro All American Heritage	Tributo al espíritu deportivo y colegial universitario estadounidense. Correa ancha acolchada con tipografía retro Champion All America sobre una base ergonómica de absorción de impacto.	35	42	EDICIÓN LIMITADA	Unisex	\N	/ecommerce-assets/stock-champion-all-america-1795410972201-image.png	\N	t	t	1a5f4d2a-b60b-42c1-b5a9-1f73b234be5a	2026-11-23 05:16:12.231	2026-11-23 05:16:12.231	{/ecommerce-assets/stock-champion-all-america-1795410972201-image.png,/ecommerce-assets/stock-champion-all-america-1795410972215-image_copy_2.png,/ecommerce-assets/stock-champion-all-america-1795410972221-image_copy.png}	/ecommerce-assets/stock-champion-all-america-carousel-1795410972195.png	t	8
c77eaf28-c12f-40ba-b88f-a1d5498fed38	Adidas Aqua Slide	adidas-aqua-slide	Sandalia Impermeable de Confort Quick-Dry	Diseño monocromático en tono verde menta salvia confeccionado en espuma EVA moldeada de secado ultra rápido. Perfecta para ducha, piscina o días de relax con plantilla Cloudfoam integrada.	35	42	NUEVO	Unisex	\N	/ecommerce-assets/stock-adidas-aqua-slide-1795410971755-image.png	\N	t	t	1a5f4d2a-b60b-42c1-b5a9-1f73b234be5a	2026-11-23 05:16:11.862	2026-11-23 15:14:26.076	{/ecommerce-assets/stock-adidas-aqua-slide-1795410971755-image.png,/ecommerce-assets/stock-adidas-aqua-slide-1795410971766-image_copy_2.png,/ecommerce-assets/stock-adidas-aqua-slide-1795410971785-image_copy_3.png,/ecommerce-assets/stock-adidas-aqua-slide-1795410971805-image_copy_4.png,/ecommerce-assets/stock-adidas-aqua-slide-1795410971823-image_copy_5.png,/ecommerce-assets/stock-adidas-aqua-slide-1795410971849-image_copy.png}	/ecommerce-assets/stock-adidas-aqua-slide-carousel-1795410971738.png	t	1
5399c164-5b86-4b86-b058-5a5ef9378779	Adidas Confort 2.0	adidas-confort-2-0	Sandalia Ultra Confort Cloudfoam Plus 2.0	Segunda generación de confort legendario. Presenta banda superior acolchada de microfibra, plantilla contorneada de espuma viscoelástica para soporte del arco plantar y base ligera de amortiguación responsiva.	35	42	NUEVO	Unisex	\N	/ecommerce-assets/stock-adidas-confort-2-0-1795410971931-image.png	\N	t	f	1a5f4d2a-b60b-42c1-b5a9-1f73b234be5a	2026-11-23 05:16:11.979	2026-11-23 15:14:39.423	{/ecommerce-assets/stock-adidas-confort-2-0-1795410971931-image.png,/ecommerce-assets/stock-adidas-confort-2-0-1795410971938-image_copy_2.png,/ecommerce-assets/stock-adidas-confort-2-0-1795410971949-image_copy_3.png,/ecommerce-assets/stock-adidas-confort-2-0-1795410971965-image_copy.png}	/ecommerce-assets/stock-adidas-confort-2-0-carousel-1795410971924.png	t	3
d8563134-9fbe-409d-936a-f28119c404b4	Adidas confort	adidas-confort-classic	Slide Deportivo Clásico con Amortiguación Cloudfoam	El slide atlético por excelencia de adidas con plantilla suave Cloudfoam y las emblemáticas 3 bandas en contraste blanco y negro. Ideal para descanso post-partido y uso relajado diario.	35	42	MÁS VENDIDO	Unisex	\N	/ecommerce-assets/stock-adidas-confort-classic-1795410971990-image.png	\N	t	f	1a5f4d2a-b60b-42c1-b5a9-1f73b234be5a	2026-11-23 05:16:12.043	2026-11-23 15:14:42.717	{/ecommerce-assets/stock-adidas-confort-classic-1795410971990-image.png,/ecommerce-assets/stock-adidas-confort-classic-1795410972000-image_copy_2.png,/ecommerce-assets/stock-adidas-confort-classic-1795410972013-image_copy_3.png,/ecommerce-assets/stock-adidas-confort-classic-1795410972021-image_copy_4.png,/ecommerce-assets/stock-adidas-confort-classic-1795410972031-image_copy.png}	/ecommerce-assets/stock-adidas-confort-classic-carousel-1795410971983.png	t	4
fe7b8259-1d41-41ec-ba00-3b953b045fc6	Adidas Campus Bad bunny	adidas-campus-bad-bunny	Edición Colaborativa Limitada "Chalk White"	Colaboración exclusiva de Bad Bunny sobre la clásica silueta Campus. Incorpora confección acolchada en gamuza prémium, lengüeta doble desmontable con el tercer ojo emblemático y suela chunky vulcanizada de estética retro.	170	204	EDICIÓN LIMITADA	Unisex	Baja	/ecommerce-assets/stock-adidas-campus-bad-bunny-1795410971870-image.png	\N	t	t	c74af1a3-9217-4214-86a3-dcaff9347df7	2026-11-23 05:16:11.92	2026-11-23 19:18:49.018	{/ecommerce-assets/stock-adidas-campus-bad-bunny-1795410971870-image.png,/ecommerce-assets/stock-adidas-campus-bad-bunny-1795410971891-image_copy_2.png,/ecommerce-assets/stock-adidas-campus-bad-bunny-1795410971903-image_copy.png}	/ecommerce-assets/stock-adidas-campus-bad-bunny-carousel-1795410971864.png	t	2
009d2b37-a765-48e4-8a1b-573d6ad02d20	Jordan 1 Retro OG	jordan-1-retro-og-vintage	Zapatilla Urbana High OG Vintage Edition	Silueta legendaria con acabados en nobuk tono café moca y piel blanca premium. Cuenta con amortiguación Air encapsulada, tobillera alta acolchada para máxima estabilidad y detalles retro de la era dorada del baloncesto.	120	144	MÁS VENDIDO	Hombre	Alta	/ecommerce-assets/stock-jordan-1-retro-og-vintage-1795410972293-image_copy.png	\N	t	t	c74af1a3-9217-4214-86a3-dcaff9347df7	2026-11-23 05:16:12.303	2026-11-23 05:49:21.443	{/ecommerce-assets/stock-jordan-1-retro-og-vintage-1795410972293-image_copy.png,/ecommerce-assets/stock-jordan-1-retro-og-vintage-1795410972287-image_copy_2.png,/ecommerce-assets/stock-jordan-1-retro-og-vintage-1795410972271-image.png}	/ecommerce-assets/stock-jordan-1-retro-og-vintage-carousel-1795410972266.png	t	0
8f6dfed5-a11d-4ac4-a3cb-891545558f0d	Adidas Adilette	adidas-adilette-slide	Sandalia Ergonómica Adilette 22 Slides	Icónico diseño anatómico Adilette con acabado topográfico 3D de inspiración planetaria. Su estructura de espuma biológica moldeada ofrece confort superior y absorción duradera del impacto en cada pisada.	50	60	MÁS VENDIDO	Unisex	\N	/ecommerce-assets/stock-adidas-adilette-slide-1795410971679-image_copy_2.png	\N	t	t	1a5f4d2a-b60b-42c1-b5a9-1f73b234be5a	2026-11-23 05:16:11.725	2026-11-23 15:14:25.083	{/ecommerce-assets/stock-adidas-adilette-slide-1795410971679-image_copy_2.png,/ecommerce-assets/stock-adidas-adilette-slide-1795410971699-image.png,/ecommerce-assets/stock-adidas-adilette-slide-1795410971705-image_copy.png}	/ecommerce-assets/stock-adidas-adilette-slide-carousel-1795410971643.png	t	0
5d6e7626-1e3c-48c3-ad42-f24e3d3aae6f	Air Jordan 1	air-jordan-1-crimson-heritage	Zapatilla Urbana High Heritage Edition	El estilo legendario que transformó la cultura sneaker en 1985 con una llamativa combinación en tonos vino tinto y blanco puro. Confeccionada con cuero auténtico prémium y unidad Air-Sole encapsulada.	120	144	DESTACADO	Hombre	Alta	/ecommerce-assets/stock-air-jordan-1-crimson-heritage-1795410972130-image.png	/ecommerce-assets/1795446796100-nike_air_jordan_1.glb	t	t	c74af1a3-9217-4214-86a3-dcaff9347df7	2026-11-23 05:16:12.155	2026-11-23 15:14:42.707	{/ecommerce-assets/stock-air-jordan-1-crimson-heritage-1795410972130-image.png,/ecommerce-assets/stock-air-jordan-1-crimson-heritage-1795410972137-image_copy.png}	/ecommerce-assets/stock-air-jordan-1-crimson-heritage-carousel-1795410972105.png	t	5
\.


--
-- Data for Name: promo_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promo_codes (id, code, description, "discountType", "discountValue", "minPurchase", "maxDiscount", "usageLimit", "timesUsed", "isActive", "startsAt", "expiresAt", "createdAt", "updatedAt", "isWelcomeOnly", "onePerUser", "storeItems") FROM stdin;
09c6e2f0-61bf-4719-a8ec-0898130393d2	BLESSED20	20% de descuento para miembros VIP (1 uso por persona)	PERCENTAGE	20	100	\N	\N	0	t	2026-11-21 17:03:28.892	\N	2026-11-21 17:03:28.892	2026-11-21 17:03:28.892	f	t	\N
b174812d-3d85-4411-89f7-0ca4ae0dcdd8	WILD15	15% de descuento en colección Blessed Wild (1 uso por persona)	PERCENTAGE	15	50	\N	\N	0	t	2026-11-21 17:03:28.893	\N	2026-11-21 17:03:28.893	2026-11-21 17:03:28.893	f	t	\N
9b2d1d16-64ee-46cc-a7ba-880b5b081064	BLESSED10	10% de descuento en toda la tienda (1 uso por persona)	PERCENTAGE	10	30	\N	\N	1	t	2026-11-21 17:03:28.89	\N	2026-11-21 17:03:28.89	2026-11-21 19:17:02.695	f	t	\N
32cd7f8d-804d-40e6-9645-d7bcd68f982a	BIENVENIDA5	5% de descuento exclusivo para cuenta nueva (1 solo uso)	PERCENTAGE	5	0	\N	\N	1	t	2026-11-21 17:03:28.888	\N	2026-11-21 17:03:28.888	2026-11-21 19:30:43.398	t	t	\N
732ee998-dfca-4e24-b707-187419d34889	VERANO25	$25 de descuento en compras superiores a $120 (1 uso por persona)	FIXED	25	120	\N	\N	1	t	2026-11-21 17:03:28.894	\N	2026-11-21 17:03:28.894	2026-11-21 19:43:12.777	f	t	\N
29a71c31-00be-4814-89eb-17203440fd18	GTA6	GTA 6	FIXED	6	0	\N	\N	0	f	2026-11-21 21:19:43.696	\N	2026-11-21 21:19:43.696	2026-11-22 04:11:31.209	f	t	\N
13cc14be-69e0-4ee8-840d-59d423d5fcab	VIP	shhh	HIDDEN_STORE	0	\N	\N	100	0	t	2026-11-22 20:52:00	2026-12-22 20:52:00	2026-11-22 20:52:35.407	2026-11-22 20:52:35.407	f	t	[{"productId": "a8bf1eef-90a4-4134-a286-14686671fcd0", "badgeLabel": "EDICIÓN PROMO", "promoPrice": 80}, {"productId": "prod-008", "badgeLabel": "EDICIÓN PROMO", "promoPrice": 108}, {"productId": "prod-005", "badgeLabel": "EDICIÓN PROMO", "promoPrice": 116}, {"productId": "prod-004", "badgeLabel": "EDICIÓN PROMO", "promoPrice": 160}]
b9840c9c-0f82-4f66-9e76-020ae51e69b3	SECRET	Tienda Promocional 50%	HIDDEN_STORE	0	\N	\N	1	0	t	2026-11-22 21:10:00	2026-12-22 21:10:00	2026-11-22 21:11:32.252	2026-11-22 21:11:32.252	f	t	[{"productId": "a8bf1eef-90a4-4134-a286-14686671fcd0", "badgeLabel": "EDICIÓN PROMO", "promoPrice": 59}, {"productId": "prod-006", "badgeLabel": "EDICIÓN PROMO", "promoPrice": 90}, {"productId": "prod-004", "badgeLabel": "EDICIÓN PROMO", "promoPrice": 100}, {"productId": "prod-002", "badgeLabel": "EDICIÓN PROMO", "promoPrice": 112.5}, {"productId": "prod-001", "badgeLabel": "EDICIÓN PROMO", "promoPrice": 112.5}]
24b415b6-ad82-4d8e-8fd2-9af235f5de8f	TIENDA	tienda del 10% de decuento	HIDDEN_STORE	0	\N	\N	\N	0	t	2026-11-23 18:41:00	2026-12-23 18:41:00	2026-11-23 18:42:19.01	2026-11-23 18:42:19.01	f	t	[{"productId": "prod-008", "badgeLabel": "EDICIÓN PROMO", "promoPrice": 108}]
64158a20-4a55-49e9-ba1a-1b15cbdf465f	GTA7	GTA ESTA CERCA	FIXED	7	\N	\N	\N	0	t	2026-11-23 19:07:38.207	\N	2026-11-23 19:07:38.212	2026-11-23 19:07:38.212	f	t	\N
\.


--
-- Data for Name: promo_usages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promo_usages (id, "promoCodeId", "userId", "orderId", "usedAt") FROM stdin;
d6d0d51e-be7b-4cef-865d-bdc83824de6d	9b2d1d16-64ee-46cc-a7ba-880b5b081064	2b381647-6120-4920-b8fb-0e77ca782b22	e442a646-5cd5-4c0d-82fb-04c3e8e2a64d	2026-11-21 19:17:02.69
b47545b7-c4c2-4a18-ab5c-c18e6bc15d6d	32cd7f8d-804d-40e6-9645-d7bcd68f982a	2b381647-6120-4920-b8fb-0e77ca782b22	69b9e970-524c-41d8-90fd-c1f18cc147f3	2026-11-21 19:30:43.393
56cc5c30-e62a-4d85-a1a6-d62340ecb51e	732ee998-dfca-4e24-b707-187419d34889	2b381647-6120-4920-b8fb-0e77ca782b22	72b318d3-a890-4297-997d-a7d57c2ae514	2026-11-21 19:43:12.773
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews (id, "userId", "productId", rating, comment, "createdAt", "updatedAt") FROM stdin;
49b40f10-01f0-4644-aa31-a2d1bef9ef1c	571bbbb4-43e5-4f21-81fd-db9f14d20f9a	prod-001	5	Calidad inmejorable, la espuma ergonómica es comodísima. Llegó rápido a San Salvador.	2026-11-21 17:03:28.94	2026-11-21 17:03:28.94
2d9c6c56-41fe-42d0-8276-a4c128eab535	571bbbb4-43e5-4f21-81fd-db9f14d20f9a	prod-001	5	Gran comodidad y agarre en el arco del pie.	2026-11-21 20:38:14.207	2026-11-21 20:38:14.207
f7c31e74-e0a2-474c-8545-6bd42f0ac5e0	2b381647-6120-4920-b8fb-0e77ca782b22	prod-001	5	bueno	2026-11-21 20:39:09.953	2026-11-21 20:39:09.953
c206a83b-e690-45bb-8bef-9eec7177e3d6	2b381647-6120-4920-b8fb-0e77ca782b22	prod-009	5	muy buen material me gusto el envio fue rapido	2026-11-21 20:41:11.033	2026-11-21 20:41:11.033
\.


--
-- Data for Name: user_coupons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_coupons (id, "userId", "promoCodeId", "isUsed", "usedAt", "claimedAt") FROM stdin;
5d25fa25-3cf7-4274-b3b3-6506c782dcbb	571bbbb4-43e5-4f21-81fd-db9f14d20f9a	32cd7f8d-804d-40e6-9645-d7bcd68f982a	f	\N	2026-11-21 17:03:28.895
5ef34fcb-fb21-4c86-9b9f-228ea4ef90e4	2b381647-6120-4920-b8fb-0e77ca782b22	9b2d1d16-64ee-46cc-a7ba-880b5b081064	t	2026-11-21 19:17:02.683	2026-11-21 18:33:29.755
5d03f0ce-cb49-4905-b85c-387db599f246	2b381647-6120-4920-b8fb-0e77ca782b22	32cd7f8d-804d-40e6-9645-d7bcd68f982a	t	2026-11-21 19:30:43.386	2026-11-21 17:11:39.259
72fc1450-ce57-4401-a8f1-e18bc7638d5c	2b381647-6120-4920-b8fb-0e77ca782b22	732ee998-dfca-4e24-b707-187419d34889	t	2026-11-21 19:43:12.767	2026-11-21 19:42:50.332
65201cad-967a-427a-9915-1420fdaf31ab	2b381647-6120-4920-b8fb-0e77ca782b22	b174812d-3d85-4411-89f7-0ca4ae0dcdd8	f	\N	2026-11-21 19:47:39.277
45974614-f81d-4f87-ba79-27a60c899b13	8a985114-13b3-4b82-997c-5c4aededec7d	32cd7f8d-804d-40e6-9645-d7bcd68f982a	f	\N	2026-11-21 20:20:32.105
0c7c3f27-2016-4c24-8cb9-0de2064b7041	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	29a71c31-00be-4814-89eb-17203440fd18	f	\N	2026-11-21 21:20:51.556
df041903-caa1-405d-801d-59bb3119b260	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	13cc14be-69e0-4ee8-840d-59d423d5fcab	f	\N	2026-11-22 20:52:44.74
b58ee484-e8c2-460d-8ecd-959730ff00ad	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	b9840c9c-0f82-4f66-9e76-020ae51e69b3	f	\N	2026-11-22 21:12:01.995
9c0d75e7-b3a8-43c8-8e62-d04d639d319b	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	732ee998-dfca-4e24-b707-187419d34889	f	\N	2026-11-22 21:17:28.897
7b4cbb64-6c51-4d85-b7af-523566c1097c	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	24b415b6-ad82-4d8e-8fd2-9af235f5de8f	f	\N	2026-11-23 18:42:34.443
297978d4-c7bd-4248-81be-43d799f15e3e	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	64158a20-4a55-49e9-ba1a-1b15cbdf465f	f	\N	2026-11-23 19:08:13.001
e378f97a-0355-49de-b887-ee8696471720	8a985114-13b3-4b82-997c-5c4aededec7d	b9840c9c-0f82-4f66-9e76-020ae51e69b3	f	\N	2026-11-23 20:35:50.944
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, "passwordHash", name, avatar, phone, role, "createdAt", "updatedAt") FROM stdin;
571bbbb4-43e5-4f21-81fd-db9f14d20f9a	alexander@blessed.com	$2b$10$demoHashedPasswordForDevEnvironment1234567890	Alexander Garay	https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150	+503 7000-0000	ADMIN	2026-11-21 17:03:28.878	2026-11-21 17:03:28.878
2b381647-6120-4920-b8fb-0e77ca782b22	admin@gmail.com	$2b$10$hashedSecureUserPasswordDemo1234567890	admin admin	https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150	\N	USER	2026-11-21 17:11:39.25	2026-11-21 17:11:39.25
8a985114-13b3-4b82-997c-5c4aededec7d	pereira@gmail.com	$2b$10$hashedSecureUserPasswordDemo1234567890	miguekl pererira	https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150	\N	USER	2026-11-21 20:20:32.093	2026-11-21 20:20:32.093
cd628aa0-c2cb-4076-b6e4-6343eaa116b9	admin@blessed.com	admin	Admin Blessed	https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150	+503 7777-7777	ADMIN	2026-11-21 20:43:59.452	2026-11-21 20:43:59.452
\.


--
-- Data for Name: wishlists; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wishlists (id, "userId", "productId", "addedAt") FROM stdin;
6adc2b2a-a54d-4645-833e-6fec488d397e	571bbbb4-43e5-4f21-81fd-db9f14d20f9a	prod-002	2026-11-21 17:03:28.942
9ad0ef76-8df6-413b-9c2a-144d23128fe7	2b381647-6120-4920-b8fb-0e77ca782b22	prod-004	2026-11-21 20:09:20.134
57986e32-3f47-4b0c-8bde-b8d08f992734	2b381647-6120-4920-b8fb-0e77ca782b22	prod-009	2026-11-21 20:10:21.087
a8a6a77a-0045-4451-aca5-130a00abdcdb	8a985114-13b3-4b82-997c-5c4aededec7d	prod-001	2026-11-21 20:20:32.145
fdbeba75-0446-4452-a9d6-6843635106f8	8a985114-13b3-4b82-997c-5c4aededec7d	prod-002	2026-11-21 20:20:32.163
f5519a16-4c6b-4404-a899-913623620eeb	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	009d2b37-a765-48e4-8a1b-573d6ad02d20	2026-11-23 18:34:59.172
1ca9a456-44d7-4ea4-8ab3-061cf049cc15	cd628aa0-c2cb-4076-b6e4-6343eaa116b9	e6f3bd65-b0f0-490e-bc44-d7f6c84ddd65	2026-11-23 19:05:39.948
\.


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_cards payment_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_cards
    ADD CONSTRAINT payment_cards_pkey PRIMARY KEY (id);


--
-- Name: product_colors product_colors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_colors
    ADD CONSTRAINT product_colors_pkey PRIMARY KEY (id);


--
-- Name: product_sizes product_sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_sizes
    ADD CONSTRAINT product_sizes_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- Name: promo_usages promo_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_usages
    ADD CONSTRAINT promo_usages_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: user_coupons user_coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_coupons
    ADD CONSTRAINT user_coupons_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_pkey PRIMARY KEY (id);


--
-- Name: cart_items_userId_productId_size_colorName_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "cart_items_userId_productId_size_colorName_key" ON public.cart_items USING btree ("userId", "productId", size, "colorName");


--
-- Name: categories_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_name_key ON public.categories USING btree (name);


--
-- Name: categories_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);


--
-- Name: orders_orderNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "orders_orderNumber_key" ON public.orders USING btree ("orderNumber");


--
-- Name: product_sizes_productId_size_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "product_sizes_productId_size_key" ON public.product_sizes USING btree ("productId", size);


--
-- Name: products_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_slug_key ON public.products USING btree (slug);


--
-- Name: promo_codes_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX promo_codes_code_key ON public.promo_codes USING btree (code);


--
-- Name: user_coupons_userId_promoCodeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_coupons_userId_promoCodeId_key" ON public.user_coupons USING btree ("userId", "promoCodeId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: wishlists_userId_productId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "wishlists_userId_productId_key" ON public.wishlists USING btree ("userId", "productId");


--
-- Name: addresses addresses_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cart_items cart_items_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cart_items cart_items_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT "cart_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orders orders_promoCodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES public.promo_codes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payment_cards payment_cards_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_cards
    ADD CONSTRAINT "payment_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_colors product_colors_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_colors
    ADD CONSTRAINT "product_colors_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_sizes product_sizes_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_sizes
    ADD CONSTRAINT "product_sizes_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: products products_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promo_usages promo_usages_promoCodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_usages
    ADD CONSTRAINT "promo_usages_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES public.promo_codes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: promo_usages promo_usages_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_usages
    ADD CONSTRAINT "promo_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reviews reviews_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reviews reviews_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_coupons user_coupons_promoCodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_coupons
    ADD CONSTRAINT "user_coupons_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES public.promo_codes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_coupons user_coupons_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_coupons
    ADD CONSTRAINT "user_coupons_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: wishlists wishlists_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT "wishlists_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: wishlists wishlists_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT "wishlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict hWm6sfXuZfYZoChN70o3ABWAMAjnwmKbVD74x3rwjJSTvcfjNAXsISViZ9WJFBD

