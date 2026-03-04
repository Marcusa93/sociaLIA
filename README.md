# SociaLIA — Social Intelligence & Political Analytics

Plataforma full-stack para monitoreo y análisis de ecosistemas de redes sociales. Construida con Next.js 14, Supabase, Recharts y Anthropic.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS (dark mode) |
| Auth | Supabase Auth |
| DB | Supabase Postgres + RLS |
| Charts | Recharts + vis-network |
| Chatbot | Anthropic Claude (claude-sonnet-4-6) |
| Workers | Node.js + tsx |
| Package mgr | pnpm |

---

## Setup

### 1. Variables de entorno

```bash
cp .env.local.example .env.local
```

Editá `.env.local` con tus credenciales.

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Aplicar migraciones a Supabase

Abrí el SQL Editor de tu proyecto en el Dashboard de Supabase:
**https://supabase.com/dashboard/project/qokznpvgjiiqjeclqdii/sql/new**

Aplicá los archivos en orden:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_seed_helpers.sql`

### 4. Cargar datos de ejemplo

```bash
pnpm seed
```

Crea: 1 organización, 15 cuentas, 8 meses de posts y métricas.

### 5. Calcular features analíticas

```bash
pnpm compute
```

Calcula `account_month_features` y `ecosystem_month_summary`.

### 6. Iniciar el servidor de desarrollo

```bash
pnpm dev
```

Abrí http://localhost:3000

---

## Estructura

```
app/
├── (auth)/login/        # Login con Supabase Auth
├── (app)/
│   ├── overview/        # Dashboard KPIs + gráficos
│   ├── universe/        # Gestión de cuentas
│   ├── collection/      # Jobs de recolección
│   ├── analysis/        # Features tabla + grafo
│   ├── reports/         # Reportes HTML/PDF
│   └── chat/            # Chatbot analítico
└── api/
    ├── chat/            # POST /api/chat
    ├── reports/generate # POST /api/reports/generate
    └── jobs/            # POST /api/jobs

components/
├── ui/                  # Primitivas (Button, Card, Badge...)
├── charts/              # TimeSeriesChart, ConcentrationBar
├── graph/               # CoPublicationGraph (vis-network)
└── layout/              # Sidebar, Topbar

lib/
├── supabase/            # Clientes browser/server + types
├── analytics/           # features.ts, typology.ts, concentration.ts, graph.ts
├── chat/                # engine.ts (router de intenciones + SQL)
├── connectors/          # BrightDataConnector (mock)
└── reports/             # builder.ts (HTML del reporte)

worker/
├── seed.ts              # Seed: 8 meses, 2 bloques
├── compute-features.ts  # Calcula account_month_features
└── apply-migrations.ts  # Script para aplicar migraciones
```

---

## Scripts

| Script | Descripción |
|--------|-------------|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm seed` | Carga datos de ejemplo |
| `pnpm compute` | Recalcula features analíticas |
| `pnpm migrate` | Intenta aplicar migraciones automáticamente |
| `pnpm test` | Tests unitarios (vitest) |

---

## Tipologías de cuentas

| Tipología | Criterio |
|-----------|---------|
| **Gatillo** | p90+ en activation score |
| **Amplificador** | p75-90 activación + alta volatilidad |
| **Intermitente** | p50-75 activación + alta volatilidad |
| **Saturación** | p75+ activación + alta frecuencia |
| **Tracción sostenida** | p50-75 activación + baja volatilidad |
| **Intermedia** | p25-50 |
| **Baja incidencia** | <p25 |
| **Coordinación** | >50% posts con collab_group_id (override) |

---

## Tests

```bash
pnpm test
```

Cubre: `features.ts`, `typology.ts`, `concentration.ts`

---

## Chatbot — ejemplos de queries

- "¿Cuáles son las 5 cuentas con más interacciones?"
- "¿Qué tipologías predominan en Instagram?"
- "Mostrame la concentración del ecosistema en los últimos meses"
- "¿Cuántas cuentas tienen patrón de Coordinación?"
- "Evolución de @lider_oposicion"

---

## BrightData Integration

El conector `lib/connectors/brightdata.ts` tiene:
- `MockConnector`: lee datos del seed en Supabase
- `RealConnector`: stub para la API de Bright Data (implementar)

Para activar el conector real, agregar `BRIGHT_DATA_API_KEY=...` a `.env.local`.
