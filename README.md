# ChamoEntregas

ChamoEntregas es una app local de entregas para Coloncito, Táchira, diseñada para atender comida, paquetes y mandados con un enfoque rápido, cálido y confiable.

## Stack

- Next.js 16 + TypeScript + Tailwind CSS
- Supabase para autenticación y base de datos compartida con la app móvil
- Diseño responsive para móvil y escritorio
- PWA instalable desde el navegador del teléfono (requiere HTTPS)
- Panel administrativo protegido con estados de pedidos y cobertura
- Interfaz móvil protegida para repartidores en `/repartidor`
- Registro e inicio de sesión de clientes por correo, perfil privado e historial
- Reputación con incidencias de impago confirmadas por administración

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
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=secreto-solo-del-servidor
```

`SUPABASE_SERVICE_ROLE_KEY` solo se necesita para invitar y habilitar repartidores desde `/admin`. Es una credencial privilegiada: no la publiques, no la pongas en una variable `NEXT_PUBLIC_*` y no la uses en componentes del navegador.

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
6. La interfaz para repartidores se encuentra en `http://DIRECCION-IP:3000/repartidor`.

Si Windows muestra una solicitud del Firewall para Node.js, permite el acceso en redes privadas. Si no abre, comprueba que ambos dispositivos sigan en la misma Wi-Fi y que la dirección IPv4 no haya cambiado.

La dirección local sirve para previsualizar el sitio; los navegadores no permiten instalar una PWA desde una dirección HTTP de red local. Para instalar ChamoEntregas, publica el sitio con HTTPS (por ejemplo, en Vercel), abre su dirección pública en el teléfono y selecciona **Instalar app**. En iPhone/iPad, abre el sitio en Safari y usa **Compartir > Añadir a pantalla de inicio**. La PWA necesita conexión a internet para cargar y enviar solicitudes; no ofrece uso sin conexión.

### Probar la interfaz de repartidor

Sin las variables de Supabase, abre `/repartidor` e inicia sesión con `repartidor@chamoentregas.com` / `chamo123`. Es un modo de demostración: permite recorrer pedidos de prueba, pero los cambios no se guardan. La demo del panel administrativo es `admin@chamoentregas.com` / `chamo123`.

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
2. En SQL Editor, ejecuta completo el contenido de `supabase/schema.sql`.
3. Ejecuta también `supabase/migrations/20261015_customer_accounts_and_reputation.sql` para añadir perfiles, cuentas de clientes, historial y reputación.
4. Ejecuta `supabase/migrations/20261016_courier_invitations.sql` para habilitar los correos de repartidores.
5. Copia la URL y la clave publicable del proyecto en `.env.local`. Añade `SUPABASE_SERVICE_ROLE_KEY` solo al entorno de servidor.

El esquema y la migración crean políticas RLS diferenciadas: clientes autenticados pueden solicitar y consultar únicamente sus pedidos, y actualizar solo su nombre y teléfono; administradores operan pedidos, perfiles, incidencias y cobertura; repartidores autenticados solo ven pedidos nuevos de su ciudad y sus propias entregas. Aceptar un pedido, avanzar estados y moderar restricciones se realiza mediante funciones SQL protegidas.

### Registro y reputación de clientes

- El cliente crea una cuenta con correo, contraseña y nombre. El teléfono es opcional en su perfil.
- Desde la portada, **Pedir ahora** y **Solicitar** llevan al acceso de cliente si no hay sesión. Al iniciar sesión o confirmar el correo, continúa directamente a `/pedido`; el perfil queda como una sección independiente.
- Una solicitud se asocia a la identidad autenticada y el backend completa el correo y nombre desde el perfil. La política de base de datos impide pedidos anónimos y solicitudes durante una pausa vigente.
- Los clientes consultan su perfil, reputación, incidencias confirmadas e historial en `/perfil`.
- La reputación inicia en 100/100. Solo el administrador puede registrar un impago tras revisar evidencia vinculada a un pedido entregado. Un caso confirmado descuenta 20 puntos; la base impide duplicar el reporte para el mismo pedido.
- Bajar puntos no bloquea automáticamente al cliente. Si la revisión lo justifica, el administrador puede pausar nuevas solicitudes por 1, 3 o 7 días desde el panel; también puede quitar la pausa.
- La notificación y la evidencia quedan visibles al cliente en su perfil. Los reportes son privados para el cliente afectado y la administración.
- El formulario original de foto de paquete conserva el nombre de archivo, pero todavía no sube la imagen a Storage.

### Crear cuentas para el equipo

1. No habilites el registro público de cuentas del equipo.
2. Crea la cuenta del administrador en **Authentication > Users** y asigna `app_metadata.role = "admin"` desde un entorno seguro que use la Admin API de Supabase. Los roles de confianza nunca deben guardarse en `user_metadata` ni modificarse desde el navegador.
3. En **Authentication > URL Configuration**, agrega como redirect URLs el dominio de producción y `http://localhost:3000/auth/update-password` para pruebas locales.
4. Para que el administrador invite repartidores desde `/admin`, configura `SUPABASE_SERVICE_ROLE_KEY` en el servidor local y en Vercel. El valor se obtiene desde **Supabase > Project Settings > API Keys**. No lo pegues en el código, en GitHub ni en el chat.
5. Desde **/admin > Invitar y gestionar repartidores**, introduce nombre, correo, ciudad y teléfono opcional. La API de servidor envía la invitación, asigna `app_metadata.role = "courier"` y crea el perfil de `couriers` asociado. El repartidor recibirá un enlace para establecer su contraseña y continuar a `/repartidor`.
6. El administrador puede pausar o reactivar el acceso desde esa misma sección; un perfil pausado no puede operar pedidos.
7. En Vercel configura `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` con `https://chamoentregas.vercel.app` y `SUPABASE_SERVICE_ROLE_KEY` como variable secreta de servidor. Nunca expongas esta última en `NEXT_PUBLIC_*`.

Si falta `SUPABASE_SERVICE_ROLE_KEY`, el panel informa que no puede enviar la invitación; no muestra un resultado de éxito falso.

La app cliente no muestra un mensaje de éxito si Supabase no está configurado: informará que todavía no se pueden recibir solicitudes.

## Demo local

Si no configuras Supabase, el panel administrativo entra en modo demo con:

- Usuario: `admin@chamoentregas.com`
- Contraseña: `chamo123`

Esto sirve para revisar la experiencia de administración y probar los flujos sin conectarse a un backend real.

## Estructura principal

```text
app/
  page.tsx
  pedido/page.tsx
  admin/page.tsx
  repartidor/page.tsx
components/
  chamo-landing.tsx
  customer-order-form.tsx
  chamo-admin.tsx
  courier-dashboard.tsx
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

## Guías en PDF

- [Guía de funcionamiento de ChamoEntregas](./docs/guia-funcionalidad.pdf)
- [Tutorial paso a paso de cómo se construyó](./docs/tutorial-construccion.pdf)
