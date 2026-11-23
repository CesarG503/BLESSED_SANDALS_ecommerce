FROM public.ecr.aws/docker/library/node:20-alpine

WORKDIR /app

# Instalar dependencias del sistema necesarias para Prisma y compatibilidad con Alpine
RUN apk add --no-cache openssl libc6-compat

# Copiar manifiestos de paquetes y esquema de prisma
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias de node
RUN npm install

# Generar cliente de Prisma para el entorno Linux
RUN npx prisma generate

# Copiar el resto del código fuente
COPY . .

# Exponer el puerto de desarrollo de Vite
EXPOSE 5173

# Arrancar Vite escuchando en todas las interfaces de red
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
