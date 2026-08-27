# Gastos — Control de Gastos Personales

App web personal para controlar finanzas en Argentina. Dual currency ARS/USD con tipo de cambio CCL.

## Stack

- **Next.js 15** App Router + TypeScript
- **Supabase** PostgreSQL (sin auth — app personal, RLS deshabilitado en todas las tablas)
- **Tailwind v4** — las clases `px-/py-` son poco confiables; todo el padding usa `style={}`
- **Recharts** para gráficos
- **SheetJS (`xlsx` v0.18.5)** para importar el Excel
- **Resend** (pendiente: emails semanales)

## Estructura

```
src/
  app/
    page.tsx              # Dashboard — saldo histórico + stats del período
    gastos/page.tsx       # CRUD de gastos con filtro de fechas
    ingresos/page.tsx     # CRUD de ingresos con filtro de fechas
    cuotas/page.tsx       # Gestión de compras en cuotas por tarjeta
    analytics/page.tsx    # Gráficos: ingresos vs gastos, donut, CCL, balance acumulado
    configuracion/page.tsx # Categorías, CCL manual, importar Excel
  components/
    ui/DateRangeFilter.tsx  # Filtro reutilizable: presets + date pickers
    ui/Toast.tsx
    charts/DonutChart.tsx
    layout/Sidebar.tsx
  lib/supabase/client.ts
scripts/
  migrar_excel.py         # Importador Python del Excel histórico
supabase/
  schema.sql              # Schema completo con todas las tablas
```

## Base de datos (Supabase)

Proyecto: `znrkoqlhwweevsyfzfsz`

| Tabla | Descripción |
|-------|-------------|
| `categories` | Categorías de gastos e ingresos (tipo, color, emoji) |
| `cards` | Tarjetas de crédito (Macro Visa, Naranja, MP, etc.) |
| `expenses` | Gastos con fecha, monto ARS/USD y tipo de cambio CCL |
| `incomes` | Ingresos con la misma estructura |
| `installment_purchases` | Compras en cuotas — `total_amount` es el cargo a la tarjeta, `paid_amount` es lo que pone el usuario (para compras compartidas con amigos) |
| `exchange_rates` | Historial de cotizaciones CCL (una por fecha, unique) |
| `card_statements` | Resúmenes mensuales reales por tarjeta |
| `settings` | Config global: presupuesto, email, CCL manual |

Para aplicar el schema: copiar `supabase/schema.sql` en el SQL Editor de Supabase.

Si hay errores de RLS al insertar:
```sql
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE incomes DISABLE ROW LEVEL SECURITY;
-- (etc. para todas las tablas)
```

## Tipo de cambio CCL

El CCL no viene en ninguna columna directa del Excel — se computa como `monto_ars / monto_usd`. Se guarda en `exchange_rates` con `unique` en `date`, usando `ignoreDuplicates: true` al insertar.

## Filtro de fechas (`DateRangeFilter`)

Componente compartido en `src/components/ui/DateRangeFilter.tsx`.

Presets: **Este mes · Mes ant. · Este año · Histórico**

- Gastos, Ingresos: default → mes corriente
- Analytics: default → este año
- Dashboard (stat cards y transacciones recientes): default → mes corriente
- Dashboard (saldo hero): siempre histórico hasta fin del mes corriente (sin gastos futuros)

## Dashboard — lógica del saldo

El número grande del hero es el **saldo histórico real**:

```
Saldo = Σ ingresos (hasta hoy) − Σ gastos (hasta hoy)
```

No filtra por período porque eso evita tener que sumar el sobrante del mes anterior al siguiente. Las stat cards de abajo (Ingresos / Gastos / Cuotas) sí respetan el `DateRangeFilter`.

## Cuotas — compras compartidas

`total_amount` = monto total que se carga a la tarjeta  
`paid_amount` = lo que realmente pone el usuario (cuando le hace una compra a un amigo y él reembolsa parte)

El resumen de tarjeta muestra "Cuota tarjeta est." y "Mi aporte est." cuando difieren.

## Importador Excel (`scripts/migrar_excel.py`)

```bash
# Ver estructura del Excel
python scripts/migrar_excel.py "Control de Gastos.xlsx" --show-sheets

# Dry run (no escribe en Supabase)
python scripts/migrar_excel.py "Control de Gastos.xlsx" --dry-run

# Importar todo
python scripts/migrar_excel.py "Control de Gastos.xlsx"

# Sin importar cotizaciones
python scripts/migrar_excel.py "Control de Gastos.xlsx" --skip-rates
```

Variables de entorno necesarias:
```
SUPABASE_URL=https://znrkoqlhwweevsyfzfsz.supabase.co
SUPABASE_KEY=<service_role_key>
```

Estructura de columnas del Excel (obtenida con `--show-sheets`):

**Sheet "Gastos/Ingresos":** `col0=Fecha | col1=Categoría | col2=Detalle | col3=Monto ARS | col4=Monto USD`  
**Sheet "Datos" (cuotas):** `col0=Fecha compra | col1=Descripción | col2=Monto total | col3=Monto abonado por mí | col4=Cuotas | col5=Tarjeta | col8=Fecha inicio | col9=Fecha fin`

> **NUNCA subir `Control de Gastos.xlsx` al repo.** Contiene datos financieros personales. Está en `.gitignore` como `*.xlsx`.

## Desarrollo

```bash
npm run dev      # Puerto 3000
npm run build
npm run lint
```

El servidor de desarrollo lo levanta el usuario manualmente (no correr desde Claude).

## Notas técnicas

- `useToast()` retorna `{ showToast }` — los tipos válidos son `"success" | "error" | "warning"` (no `"info"`)
- Tailwind v4 responsive (`hidden md:block`, `md:hidden`) no funciona confiablemente — usar `style={{}}` con lógica JS para mostrar/ocultar
- `XLSX.read()` acepta `cellDates: true`; `sheet_to_json()` no (causa error de tipos)
- `exchange_rates` usa `onConflict: "date", ignoreDuplicates: true` al insertar desde el importador
