# ChamoEntregas

ChamoEntregas es una app local de entregas para Coloncito, Táchira, diseñada para atender comida, paquetes y mandados con un enfoque rápido, cálido y confiable.

## Stack

- Next.js 16 + TypeScript + Tailwind CSS
- Supabase para autenticación y base de datos compartida con la app móvil
- Diseño responsive para móvil y escritorio
- PWA instalable desde el navegador del teléfono (requiere HTTPS)
- Panel administrativo protegido con estados de pedidos y cobertura

## Requisitos

- Node.js 20+ (recomendado 22 LTS)
- npm
- Cuenta Supabase con proyecto creado

## Instalación

1. Clona el repositorio y entra al proyecto:

```bash
cd chamoentregas
```

2. Instala dependencias:

```bash
npm install
```

3. Crea tu archivo de entorno local a partir del ejemplo:

```bash
cp .env.example .env.local
```

4. Completa las variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_WHATSAPP_NUMBER=584165552233
```

5. Inicia el proyecto en modo desarrollo:

```bash
npm run dev
```

Abre http://localhost:3000.

### Probar desde un teléfono en la misma red Wi-Fi

1. Conecta el computador y el teléfono a la misma red Wi-Fi.
2. Inicia el servidor aceptando conexiones de la red local:

```bash
npm run dev -- --hostname 0.0.0.0
```

3. En Windows, ejecuta `ipconfig` y busca la dirección IPv4 del adaptador Wi-Fi.
4. En el navegador del teléfono abre `http://DIRECCION-IP:3000` (por ejemplo, `http://192.168.1.66:3000`).
5. El panel se encuentra en `http://DIRECCION-IP:3000/admin`.

Si Windows muestra una solicitud del Firewall para Node.js, permite el acceso en redes privadas. Si no abre, comprueba que ambos dispositivos sigan en la misma Wi-Fi y que la dirección IPv4 no haya cambiado.

La dirección local sirve para previsualizar el sitio; los navegadores no permiten instalar una PWA desde una dirección HTTP de red local. Para instalar ChamoEntregas, publica el sitio con HTTPS (por ejemplo, en Vercel), abre su dirección pública en el teléfono y selecciona **Instalar app**. En iPhone/iPad, abre el sitio en Safari y usa **Compartir > Añadir a pantalla de inicio**. La PWA necesita conexión a internet para cargar y enviar solicitudes; no ofrece uso sin conexión.

## Supabase

La estructura esperada para la base de datos se encuentra en `supabase/schema.sql`.

Incluye las tablas principales:

- `orders`
- `couriers`
- `coverage_zones`

Los estados de pedido usados son:

- `nuevos`
- `asignados`
- `recogidos`
- `en_camino`
- `entregados`
- `cancelados`

### Paso a paso para crear la base en Supabase

1. Abre tu proyecto en Supabase.
2. En SQL Editor, crea las tablas con el contenido de `supabase/schema.sql`.
3. Asegúrate de ejecutar el script completo.
4. Copia la URL del proyecto y la clave anónima en `.env.local`.

## Demo local

Si no configuras Supabase, el panel administrativo entra en modo demo con:

- Usuario: `admin@chamoentregas.com`
- Contraseña: `chamo123`

Esto sirve para revisar la experiencia de administración y probar los flujos sin conectarse a un backend real.

## Estructura principal

```text
app/
  page.tsx
  admin/page.tsx
components/
  chamo-landing.tsx
  chamo-admin.tsx
  pwa-install-button.tsx
app/
  manifest.ts
lib/
  demo-data.ts
  supabase.ts
public/
  pwa/icon-192.png
  pwa/icon-512.png
  sw.js
  brand/logo-mascota.svg
supabase/
  schema.sql
.env.example
```

## Despliegue en Vercel

1. Sube este proyecto a GitHub.
2. Conecta el repositorio en Vercel.
3. Configura las variables de entorno del proyecto.
4. Haz deploy.
5. Abre la dirección HTTPS que Vercel asigna para instalar la PWA:
   - Android: abre la web en Chrome y toca **Instalar app** o **Instalar aplicación**.
   - iPhone/iPad: abre la web en Safari, toca **Compartir** y elige **Añadir a pantalla de inicio**.

La dirección `http://localhost:3000` y la dirección HTTP de la red Wi-Fi sirven para previsualizar la web, no para instalarla desde otro teléfono. La PWA requiere conexión a internet; no guarda pedidos para enviarlos sin conexión.

## Notas

- No se usa pago online.
- No se incluye seguimiento GPS en vivo.
- El sistema está preparado para integrar aún más funciones con Supabase y la app móvil en el futuro.
- El proyecto usa beneficios de marca y estilo propio, sin copiar ninguna marca existente.
