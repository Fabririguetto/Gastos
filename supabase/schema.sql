-- ============================================================
-- Schema: Sistema de Control de Gastos
-- Ejecutar en el SQL Editor de Supabase en este orden exacto.
-- ============================================================

-- 1. Categorías
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('expense', 'income')),
  color text not null default '#6b7280',
  emoji text not null default '📦',
  created_at timestamptz default now()
);

-- 2. Tarjetas
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bank text not null,
  color text not null default '#6b7280',
  created_at timestamptz default now()
);

-- 3. Historial de cotizaciones
create table if not exists exchange_rates (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  ccl_rate numeric(12,2) not null,
  blue_rate numeric(12,2),
  created_at timestamptz default now()
);

-- 4. Compras en cuotas (sin gasto_id aún — se agrega después)
create table if not exists installment_purchases (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  card_id uuid references cards(id) on delete set null,
  total_amount numeric(14,2) not null,
  paid_amount numeric(14,2),          -- monto que realmente paga el usuario
  currency text not null default 'ARS',
  total_installments integer not null default 1,
  paid_installments integer not null default 0,
  start_date date not null,           -- primer día del mes siguiente a la compra
  end_date date,                      -- calculado: start_date + (total_installments - 1) meses
  counts_towards_balance boolean not null default true,
  expense_id uuid,                    -- FK a expenses se agrega abajo
  created_at timestamptz default now()
);

-- 5. Gastos
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  category_id uuid references categories(id) on delete set null,
  detail text,
  amount numeric(14,2) not null,
  currency text not null default 'ARS',
  amount_ars numeric(14,2) not null,
  amount_usd numeric(12,4),
  ccl_rate numeric(12,2),
  installment_purchase_id uuid references installment_purchases(id) on delete set null,
  created_at timestamptz default now()
);

-- 6. Ingresos
create table if not exists incomes (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  category_id uuid references categories(id) on delete set null,
  detail text,
  amount numeric(14,2) not null,
  currency text not null default 'ARS',
  amount_ars numeric(14,2) not null,
  amount_usd numeric(12,4),
  ccl_rate numeric(12,2),
  created_at timestamptz default now()
);

-- 7. Resumenes de tarjeta (monto real del resumen mensual, en ambas monedas)
create table if not exists card_statements (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards(id) on delete cascade,
  period_month integer not null check (period_month between 1 and 12),
  period_year integer not null,
  amount_ars numeric(14,2),
  amount_usd numeric(14,2),
  created_at timestamptz default now(),
  unique (card_id, period_month, period_year),
  check (amount_ars is not null or amount_usd is not null)
);

-- 8. Ahora que expenses existe, agregar FK en installment_purchases
alter table installment_purchases
  add constraint installment_purchases_expense_id_fkey
  foreign key (expense_id) references expenses(id) on delete set null;

-- 9. Configuración general (una sola fila)
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  monthly_budget_ars numeric(14,2) default 0,
  notification_email text,
  ccl_auto_fetch boolean default true,
  created_at timestamptz default now()
);

-- Insertar config default si no existe
insert into settings (monthly_budget_ars, notification_email, ccl_auto_fetch)
select 0, 'fabririguetto@gmail.com', true
where not exists (select 1 from settings);

-- 10. Fecha de cierre de tarjeta
alter table cards add column if not exists closing_rule text not null default 'none'
  check (closing_rule in ('none', 'fixed_day', 'last_weekday'));
alter table cards add column if not exists closing_day integer;         -- 1-31, si closing_rule = 'fixed_day'
alter table cards add column if not exists closing_weekday integer;     -- 0=Domingo..6=Sábado, si closing_rule = 'last_weekday'

create table if not exists card_closing_overrides (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards(id) on delete cascade,
  period_month integer not null check (period_month between 1 and 12),
  period_year integer not null,
  closing_date date not null,
  created_at timestamptz default now(),
  unique (card_id, period_month, period_year)
);

-- 11. Descuento del resumen (monto real que se resta al pagar, y en qué moneda)
alter table card_statements add column if not exists discount_amount numeric(14,2);
alter table card_statements add column if not exists discount_currency text check (discount_currency in ('ARS', 'USD'));

-- ============================================================
-- RLS: Deshabilitado (app personal, sin autenticación)
-- ============================================================
alter table categories disable row level security;
alter table cards disable row level security;
alter table exchange_rates disable row level security;
alter table installment_purchases disable row level security;
alter table expenses disable row level security;
alter table incomes disable row level security;
alter table card_statements disable row level security;
alter table settings disable row level security;
alter table card_closing_overrides disable row level security;
