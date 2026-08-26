# Gastos App — Design Brief (v2, afinado)

## Concepto
App web de control de gastos personales para Argentina. Visual: **fintech premium oscuro** — fondo dark, acento electric green/teal, tipografía bold para números, datos que se sienten vivos. Usuario único, no multi-tenant.

---

## Datos & Lógica de Negocio

### Moneda
- Todo gasto/ingreso tiene un **selector de moneda: ARS | USD**
- Siempre se guarda el monto en la moneda elegida + su equivalente en la otra (calculado con el CCL del momento)
- El tipo de cambio CCL se trae **automáticamente desde una API pública** (ej. bluelytics.com.ar) con posibilidad de sobreescribir manualmente
- El CCL histórico se guarda en DB para recalcular conversiones antiguas

### Cuotas de Tarjeta (lógica compleja)
Cada compra en cuotas tiene:
- **Datos de la compra**: descripción, monto total, cantidad de cuotas, tarjeta, fecha
- **Check "Descuenta de mi saldo"**: si está marcado, las cuotas se suman al gasto del mes. Si no (ej. es gasto compartido), aparece en la vista pero no impacta el balance
- **Monto del resumen**: el usuario carga el monto real del resumen de la tarjeta cada mes (siempre es mayor al valor de cuota porque incluye impuestos y recargos)
- El resumen mensual es lo que realmente se pagó — no hay "estimado", solo el real
- El dashboard muestra: "Próximo resumen [Tarjeta]: $X" donde X es el monto del último resumen cargado
- Historial de resúmenes por tarjeta para ver tendencia de impuestos

### Presupuesto
- Un solo número global mensual en ARS
- Barra de progreso en dashboard: gastado vs presupuesto (verde → amarillo → rojo)
- La notificación semanal incluye: gastado, presupuesto, restante, y cuotas comprometidas

---

## Pantallas a Diseñar

### 1. Dashboard
- **Hero**: Saldo del mes = Ingresos − Gastos − Cuotas (que descontan). En ARS grande, USD pequeño debajo
- **Barra de presupuesto**: "$X gastados de $Y — te quedan $Z" con color dinámico
- **3 cards**: Ingresos del mes | Gastos del mes | Cuotas activas (estimado vs real)
- **Donut**: gastos por categoría (ARS, últimos 30 días)
- **Lista reciente**: últimas 5 transacciones con ícono de categoría
- **FAB**: botón flotante "+" para agregar gasto rápido

### 2. Gastos Page
- Tabla filtrable (mes, categoría, moneda)
- Cada fila: fecha | categoría | detalle | monto ARS | monto USD | acciones
- Drawer "Agregar gasto":
  - Fecha (default hoy)
  - Categoría (dropdown con color + emoji)
  - Detalle (texto)
  - Moneda: toggle ARS | USD
  - Monto (según moneda elegida)
  - CCL aplicado: auto-fetched, editable
  - Equivalente en la otra moneda (calculado en tiempo real mientras tipea)

### 3. Ingresos Page
- Misma estructura que Gastos
- Categorías de ingreso: Sueldo, Regalo, Intereses, + custom

### 4. Cuotas & Tarjetas Page
- **Cards por tarjeta** (Macro Visa / Mercado Pago / Naranja):
  - Consumo del mes (gastos directos + cuotas activas)
  - Próximo resumen estimado vs último resumen real
- **Tabla de cuotas activas**:
  - Descripción | Tarjeta | Cuota X/N | Monto cuota base | ¿Descuenta saldo? | Estado
  - Barra de progreso: cuotas pagadas / total
- **Modal "Nueva compra en cuotas"**: descripción, monto, cuotas, tarjeta, check "descuenta de mi saldo"
- **Sección "Cargar resumen mensual"**: ingresar el monto real del resumen de cada tarjeta. Este es el número definitivo — siempre será mayor al monto de cuota base por impuestos

### 5. Analytics Page
- Barra chart: Ingresos vs Gastos por mes (año completo)
- Donut: gastos por categoría (filtrable por período)
- Line chart: evolución del dólar CCL en el tiempo
- Line chart: balance acumulado ARS vs USD
- Selector: Mes | Trimestre | Año

### 6. Settings / Config
- Presupuesto mensual (ARS)
- Gestión de categorías (add/edit/delete, color + emoji)
- Email para notificaciones semanales
- Tipo de cambio: botón "Actualizar CCL ahora" + valor manual override
- Import Excel (modal con instrucciones y uploader)

---

## Diseño Visual
- **Fondo**: #0f0f0f (casi negro, no pure black)
- **Superficie cards**: #1a1a1a con borde #252525
- **Acento primario**: #00e87a (electric green)
- **Acento secundario**: #0ea5e9 (sky blue, para USD)
- **Warning**: #f59e0b, **Error**: #ef4444
- **Tipografía**: Geist (next/font) — bold para cifras, regular para labels
- **Números grandes**: 48–64px, semibold, sin serif
- **Animaciones**: counter animado al cargar, fade-in por sección
- **Mobile-first**: formularios full-screen en mobile, tabla scrollable horizontal

---

## Stack (no negociable)
- Next.js 15 App Router + TypeScript
- Supabase (PostgreSQL + Auth + Edge Functions)
- Resend (emails semanales)
- Vercel Cron Jobs (lunes 9am)
- Recharts (todos los gráficos)
- shadcn/ui + Tailwind CSS v4
- SheetJS / xlsx (import Excel)
- bluelytics.com.ar o similar para CCL auto

---

## DB Schema (referencia para generador)
```sql
-- types
type currency_type = 'ARS' | 'USD'

-- exchange rates históricos
exchange_rates (id, date, ccl_rate, created_at)

-- categorías configurables
categories (id, name, type: 'expense'|'income', color, emoji, created_at)

-- gastos
expenses (id, date, category_id, detail, amount, currency, amount_ars, amount_usd, ccl_rate_id, created_at)

-- ingresos
incomes (id, date, category_id, detail, amount, currency, amount_ars, amount_usd, ccl_rate_id, created_at)

-- tarjetas
cards (id, name, bank, color, created_at)

-- compras en cuotas
installment_purchases (
  id, description, card_id, total_amount, currency,
  total_installments, start_date,
  counts_towards_balance boolean,  -- el check "descuenta de mi saldo"
  created_at
)

-- resúmenes de tarjeta (monto real del resumen mensual, incluye impuestos)
card_statements (
  id, card_id, period_month, period_year,
  amount,  -- el monto real del resumen cargado por el usuario (siempre > suma de cuotas base)
  currency,
  created_at
)

-- configuración
settings (id, key, value, updated_at)
-- keys: monthly_budget_ars, notification_email, ccl_auto_fetch
```

---

## Email Semanal (lunes 9am)
Asunto: "💰 Resumen semanal — te quedan $X este mes"
Cuerpo:
- Gastado esta semana: $X ARS (u$d Y)
- Acumulado del mes: $X de $PRESUPUESTO
- Cuotas del mes: $X estimado
- **Restante libre**: $Z ARS (u$d W)
- Link a la app

---

## UX Goals
- Agregar un gasto: < 10 segundos
- Dashboard carga: < 1s
- Mobile: formulario full-screen sin scroll
- El "wow moment": ver el saldo en ARS + USD en tiempo real con el tipo de cambio del día
