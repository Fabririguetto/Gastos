# Plan de desarrollo — Sistema de Control de Gastos

> Generado el 2026-08-26. Leer este archivo ANTES de tocar cualquier código.
> **No modificar código sin verificar el estado actual primero (ver sección 1).**

---

## 1. VERIFICAR ESTADO ACTUAL PRIMERO

Antes de hacer cualquier cosa, ejecutar estos comandos para saber en qué punto está el trabajo:

```bash
# ¿Corre la app?
cd "C:\Users\fabri\Desktop\proyectos\Gastos"
npm run dev

# ¿Hay .env.local con credenciales de Supabase?
ls .env.local

# ¿Hay schema SQL creado en Supabase?
# Ver src/lib/supabase/ — si solo tiene client.ts y server.ts, no hay schema todavía

# ¿Hay algún archivo de migración o schema SQL?
ls -r *.sql 2>/dev/null || echo "no hay archivos SQL"

# Ver qué cambios hay respecto a git (si hay git init)
git status 2>/dev/null || echo "no hay git"
```

### Qué existe hoy

| Archivo / Carpeta | Estado conocido |
|---|---|
| `src/app/page.tsx` | Dashboard completo con mock-data. Funciona visualmente. |
| `src/app/gastos/page.tsx` | UI de lista + drawer para agregar/editar. Mock-data. |
| `src/app/ingresos/page.tsx` | Existe, revisar qué tan completo está. |
| `src/app/cuotas/page.tsx` | UI con modal de nueva compra. Mock-data. |
| `src/app/analytics/page.tsx` | Existe, revisar qué tan completo está. |
| `src/app/configuracion/page.tsx` | UI de categorías y tarjetas. Mock-data. |
| `src/lib/mock-data.ts` | Toda la data está acá. TODA. No hay Supabase real. |
| `src/lib/supabase/client.ts` | Solo el cliente SSR. Sin credenciales. |
| `src/lib/supabase/server.ts` | Solo el cliente server. Sin credenciales. |
| `src/types/database.ts` | Tipos TypeScript definidos (ver abajo). |
| `.env.local` | **NO EXISTE**. Sin este archivo nada conecta a Supabase. |

### Tipos actuales en `database.ts`

```ts
Expense       // id, date, category_id, detail, amount, currency, amount_ars, amount_usd, ccl_rate
Income        // id, date, category_id, detail, amount, currency, amount_ars, amount_usd, ccl_rate
Category      // id, name, type (expense|income), color, emoji
Card          // id, name, bank, color
InstallmentPurchase // id, description, card_id, total_amount, currency, total_installments,
                    // paid_installments, start_date, counts_towards_balance
CardStatement // id, card_id, period_month, period_year, amount, currency
ExchangeRate  // id, date, ccl_rate
Settings      // monthly_budget_ars, notification_email, ccl_auto_fetch
```

---

## 2. CONTEXTO DE NEGOCIO (MUY IMPORTANTE)

### Lógica financiera del usuario

El usuario usa **tarjeta de crédito con cuotas** de forma estratégica:

1. Compra algo en cuotas → registra el **monto total** en Gastos (categoría "Tarjeta") → esa plata la aparta en una cuenta remunerada para generar intereses
2. Registra la compra también en **Cuotas/Datos** con el calendario de debito mensual
3. Cada mes le descuentan la cuota de la tarjeta → la cuenta remunerada la cubre
4. **El duplicado es intencional**: Gastos = impacto en presupuesto (ocurre al comprar), Cuotas = impacto en tarjeta (ocurre mes a mes desde el mes siguiente)

### Regla de cuotas

- La primera cuota se paga el **mes siguiente** al de la compra
- Ejemplo: compra el 15/ago/2025 en 6 cuotas → cuotas: sep/2025, oct, nov, dic, ene/2026, feb/2026
- `fecha_inicio_pago = primer día del mes siguiente a fecha_compra`

### Tarjetas del usuario (del Excel real)

- Macro Visa
- Naranja (Naranja X)
- Mercado Pago
- Macro Amex

### Categorías del Excel real

**Gastos**: Todos, Casa, Otros, Supermercado, Comida, Transporte, Ejercicio, Salud, Tarjeta, Uber, Familia, Sistemas, Inversión, Vacaciones

**Ingresos**: Todos, Sueldo, Regalo, Intereses, Ajuste, Préstamo, Venta

### Moneda

- Todo en ARS (pesos argentinos)
- Conversión a USD usando **dólar CCL** (Contado con Liqui)
- El Excel usaba IMPORTXML de dolarhoy.com — en el sistema nuevo usar una API pública

---

## 3. SCHEMA DE BASE DE DATOS (Supabase / PostgreSQL)

Crear estas tablas en Supabase. El `.env.local` debe estar configurado primero.

```sql
-- Categorías (tanto gastos como ingresos)
create table categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('gasto', 'ingreso')),
  color text not null default '#6b7280',
  emoji text not null default '📦',
  created_at timestamptz default now()
);

-- Tarjetas de crédito
create table tarjetas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,       -- "Macro Visa"
  banco text not null,        -- "Macro"
  color text not null default '#6b7280',
  created_at timestamptz default now()
);

-- Cotizaciones del dólar (historial)
create table cotizaciones (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  ccl numeric(12,2) not null,
  blue numeric(12,2),
  created_at timestamptz default now()
);

-- Gastos directos (efectivo, débito, o monto total apartado para cuotas)
create table gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  categoria_id uuid references categorias(id),
  detalle text,
  monto_ars numeric(14,2) not null,
  monto_usd numeric(12,4),
  ccl numeric(12,2),
  compra_cuota_id uuid references compras_cuotas(id) on delete set null, -- link si viene de cuota
  created_at timestamptz default now()
);

-- Ingresos
create table ingresos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  categoria_id uuid references categorias(id),
  detalle text,
  monto_ars numeric(14,2) not null,
  monto_usd numeric(12,4),
  ccl numeric(12,2),
  created_at timestamptz default now()
);

-- Compras en cuotas (hoja "Datos" del Excel)
create table compras_cuotas (
  id uuid primary key default gen_random_uuid(),
  fecha_compra date not null,
  descripcion text not null,
  tarjeta_id uuid references tarjetas(id),
  monto_total numeric(14,2) not null,      -- monto total de la compra
  monto_abonado numeric(14,2) not null,    -- lo que pone el usuario (puede diferir si es compartido)
  cuotas integer not null default 1,
  cuotas_pagadas integer not null default 0,
  fecha_inicio_pago date not null,         -- primer día del mes siguiente a fecha_compra
  fecha_fin_pago date not null,            -- fecha_inicio_pago + (cuotas - 1) meses
  monto_usd numeric(12,4),
  ccl numeric(12,2),
  genera_gasto boolean not null default true, -- si creó automáticamente un registro en gastos
  gasto_id uuid references gastos(id) on delete set null, -- link al gasto generado
  created_at timestamptz default now()
);
```

**Nota sobre forward reference**: `gastos` referencia `compras_cuotas` y viceversa. En Supabase crear `compras_cuotas` primero sin la FK de `gasto_id`, agregar la FK de `gastos.compra_cuota_id` después, y luego agregar `compras_cuotas.gasto_id`.

---

## 4. FUNCIONALIDADES A IMPLEMENTAR

### 4.1 Configuración inicial

- [ ] Crear `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Crear schema SQL en Supabase (sección 3)
- [ ] Poblar `categorias` y `tarjetas` con los valores reales del Excel
- [ ] Crear `src/lib/supabase/queries.ts` con las funciones de acceso a datos

### 4.2 Migración de datos históricos del Excel

Crear un script Python `scripts/importar_excel.py` que:
1. Lea `Control de Gastos.xlsx`
2. Inserte los registros de la hoja **Gastos** → tabla `gastos`
3. Inserte los registros de la hoja **Ingresos** → tabla `ingresos`
4. Inserte los registros de la hoja **Datos** → tabla `compras_cuotas` (calculando `fecha_inicio_pago` como primer día del mes siguiente a `fecha_compra`)
5. Detecte duplicados: si una entrada de Datos tiene un gasto en Gastos con fecha similar y monto similar, vincularlos con `gasto_id` / `compra_cuota_id`

El Excel tiene 1234 registros en Datos (cuotas) y ~998 en Gastos.

### 4.3 Reemplazar mock-data con Supabase

Para cada página, reemplazar imports de `mock-data` con queries reales a Supabase usando `createClient()` del cliente browser o server según corresponda.

Crear `src/lib/supabase/queries.ts`:
```ts
// Funciones principales a implementar:
getGastosByMonth(year: number, month: number)
getIngresosByMonth(year: number, month: number)
getCuotasActivasEnMes(year: number, month: number)  // suma cuota_mensual donde fecha_inicio_pago <= mes <= fecha_fin_pago
getCuotasProximosMeses(nMeses: number)               // proyección
getDeudaTotalPorTarjeta()                            // cuotas pendientes × cuota_mensual por tarjeta
getCotizacionActual()                                // última cotización o fetch a API externa
createGasto(data)
createIngreso(data)
createCompraCuota(data)  // también crea gasto si genera_gasto = true
```

### 4.4 Dashboard (page.tsx)

Ya tiene UI completa. Necesita:
- Conectar a Supabase en lugar de mock-data
- Usar `useEffect` + `createClient()` para cargar datos del mes seleccionado
- La lógica `computeInstallmentsForMonth` ya existe — reemplazarla con query real

### 4.5 Página de Cuotas (`/cuotas`)

Ya tiene UI con modal. Necesita:

**Al crear nueva compra** (modal existente):
- Agregar campo `genera_gasto` (toggle: "Descontar del presupuesto ahora")
  - Si está activado: crear también un registro en `gastos` con `monto_abonado`, categoría "Tarjeta", fecha = fecha de compra
  - Guardar `gasto_id` en `compras_cuotas` y `compra_cuota_id` en `gastos`
- Calcular automáticamente `fecha_inicio_pago` = 1er día del mes siguiente

**Vista de deuda por tarjeta**:
- Sumar cuotas pendientes × cuota_mensual por tarjeta
- Mostrar saldo restante de cada compra

**Proyección** (ya existe skeleton en dashboard, expandir acá):
- Tabla/gráfico de próximos 6-12 meses con total de cuotas por mes y por tarjeta

### 4.6 Conversión USD automática

Al registrar gastos/ingresos/cuotas, obtener el CCL actual:

```ts
// src/lib/dolar.ts
export async function getCotizacionCCL(): Promise<number> {
  // Opción 1: API pública argentina
  const res = await fetch('https://dolarapi.com/v1/dolares/contadoconliqui')
  const data = await res.json()
  return data.venta
  
  // Fallback: última cotización guardada en tabla cotizaciones
}
```

Guardar cada cotización usada en la tabla `cotizaciones` para tener historial.

### 4.7 Páginas pendientes de revisar

Verificar el estado de estas páginas antes de trabajar en ellas:
- `/ingresos` — ¿tiene CRUD completo o solo lista?
- `/analytics` — ¿tiene gráficos de Recharts o es esqueleto?

---

## 5. ORDEN DE TRABAJO RECOMENDADO

```
1. Verificar estado actual (sección 1)
2. Confirmar con el usuario si .env.local existe o hay que crearlo
3. Crear schema SQL en Supabase
4. Poblar categorias y tarjetas con datos reales
5. Crear src/lib/supabase/queries.ts
6. Conectar Dashboard (/) a Supabase
7. Conectar /gastos a Supabase
8. Conectar /ingresos a Supabase
9. Conectar /cuotas a Supabase + lógica de genera_gasto
10. Agregar fetch de cotización USD real
11. Script de migración del Excel (Python)
12. /analytics con gráficos reales
13. Proyección de cuotas (próximos 6-12 meses)
14. Vista de deuda total por tarjeta
```

---

## 6. CONVENCIONES DEL PROYECTO

- Dark theme con CSS variables: `--surface`, `--border`, `--accent-green`, `--accent-blue`, `--error`, `--text-primary`, `--text-muted`, `--bg`
- Color de acento principal: `#00e87a` (verde)
- Fuente: Geist (Next.js default)
- Formato de moneda: `new Intl.NumberFormat("es-AR")` para ARS, `u$d XXX` para USD
- Sin comentarios innecesarios en el código
- TypeScript estricto
- No agregar dependencias sin necesidad — recharts, lucide-react, date-fns ya están instalados

---

## 7. PREGUNTAS ABIERTAS (confirmar con el usuario)

Estas preguntas están pendientes de respuesta. No asumir — preguntar antes de implementar:

1. **¿Supabase ya tiene proyecto creado?** ¿Tenés URL + anon key? Si no, hay que crear el proyecto en supabase.com
2. **Para cuotas + gastos duplicados**: ¿Preferís que al crear una compra en cuotas haya un toggle "descontar del presupuesto ahora" que auto-crea el gasto? ¿O siempre auto-crear? ¿O siempre manual?
3. **Cotización**: ¿CCL, Blue, o las dos visibles?
4. **Migración del Excel**: ¿Querés importar TODO el historial o solo cuotas activas (pendientes)?
5. **`counts_towards_balance`** (tipo `InstallmentPurchase` existente): ¿Qué significa en tu lógica? ¿Hay compras que NO quieras incluir en el balance? (En el Excel había devoluciones negativas)
