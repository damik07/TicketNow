# 🎟️ TicketNow

**TicketNow** es una plataforma integral y auto-gestionable para la creación, publicación y venta de entradas a eventos en tiempo real. Diseñada bajo una arquitectura moderna y escalable, permite a los organizadores recaudar sus ganancias de forma directa mediante integraciones de pago nativas y ofrece a los usuarios una experiencia fluida de adquisición y validación de accesos.

---

## 🚀 Características Principales

### 📊 Panel de Control y Analíticas (Dashboard de Ventas)
* **Filtros Temporales Reactivos:** Gráficos estadísticos y métricas dinámicas que se ajustan al período seleccionado (por defecto últimos 7 días).
* **Control de Latencia Admin:** Panel avanzado para administradores que permite regular el intervalo de refresco automático (polling) de los datos de transacciones.
* **Normalización de Datos:** Procesamiento en tiempo real de Órdenes, Tickets y Eventos unificando múltiples husos horarios de forma local.

### 💼 Portal para Organizadores
* **Split de Pagos e Integración Directa:** Vinculación directa con cuentas de **Mercado Pago** mediante OAuth para el procesamiento transparente de cobros.
* **Gestión de Eventos:** Creación, edición, borrado y publicación de eventos con manejo inteligente de capacidades físicas y control de precios mínimos.

### 📱 Experiencia de Usuario y Mobile (Próximamente en Google Play)
* Compra ágil de entradas con emisión automática de comprobantes.
* Infraestructura preparada para la validación física de accesos.

---

## 🛠️ Stack Tecnológico

La aplicación está construida sobre un stack full-stack robusto y fuertemente tipado:

* **Framework:** [Next.js 14/15](https://nextjs.org/) (App Router & Route Handlers)
* **Lenguaje:** [TypeScript](https://www.typescript.org/) (Tipado estricto extremo para robustez en pasarelas de pago)
* **Estilos:** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/ui](https://ui.shadcn.com/)
* **Base de Datos:** [Neon](https://neon.tech/) / [Supabase](https://supabase.com/) (PostgreSQL Serverless)
* **ORM:** [Prisma](https://www.prisma.io/)
* **Gráficos e Interfaces:** [Recharts](https://recharts.org/) & [Lucide React](https://lucide.dev/)
* **Manejo de Fechas:** [Date-fns](https://date-fns.org/) con soporte estricto para localización local (`es-AR`).

---

## ⚙️ Configuración del Entorno (`.env`)

Para correr el proyecto localmente o realizar el deploy en plataformas como **Vercel**, configurá las siguientes variables de entorno:

```env
# Conexión a la Base de Datos (Neon/Supabase)
DATABASE_URL="postgresql://user:password@ep-pool-id.provider.postgres.neon.tech/dbname?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-pool-id.provider.postgres.neon.tech/dbname?sslmode=require"

# Autenticación y Seguridad
NEXTAUTH_SECRET="tu_secreto_super_seguro_para_nextauth"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Pasarela de Pagos (Mercado Pago API)
MERCADOPAGO_ACCESS_TOKEN="TEST-mp-access-token..."
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="TEST-mp-public-key..."
MP_CLIENT_ID="tu_client_id_oauth"
MP_CLIENT_SECRET="tu_client_secret_oauth"



## 🗂️ Arquitectura del Proyecto (Puntos Clave)
El proyecto cuenta con lógicas críticas para mitigar dolores de cabeza comunes en entornos de producción:

* **utils/date.ts:** Módulo centralizador de fechas. Incluye la función `displayLocalDate` que remueve la notación UTC 'Z' devuelta por Prisma, previniendo que los navegadores resten desfases horarios (ej: las -3hs de Argentina) al renderizar la agenda de eventos.

* **Componentes Aislados:** Estructura modular donde el Dashboard (DashboardVentas) delega responsabilidades a sub-componentes altamente optimizados (SalesChart, StatsGrid, EventsTable, DateFilter) mediante memorización con `useMemo` y `useCallback` para evitar re-renders innecesarios.

🗺️ RoadMap / Próximos Pasos
[x] Corrección de consistencia horaria en visualizaciones locales.

[x] Filtros reactivos por rango de fechas en Dashboard de Ventas.

[ ] Deploy inicial en Vercel (Ambiente de Staging).

[ ] Pruebas del flujo OAuth completo con el Sandbox de Mercado Pago.

[ ] Empaquetado y distribución mobile para Google Play Store.

desarrollados con 💜 para una gestión de eventos sin fricciones.

