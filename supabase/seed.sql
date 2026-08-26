-- ============================================================
-- Seed: Categorías y Tarjetas reales del Excel del usuario
-- Ejecutar DESPUÉS del schema.sql
-- ============================================================

-- Categorías de Gastos
insert into categories (name, type, color, emoji) values
  ('Casa',           'expense', '#6366f1', '🏠'),
  ('Supermercado',   'expense', '#10b981', '🛒'),
  ('Comida',         'expense', '#f97316', '🍔'),
  ('Transporte',     'expense', '#f59e0b', '🚗'),
  ('Uber',           'expense', '#1d4ed8', '🚕'),
  ('Salud',          'expense', '#ef4444', '💊'),
  ('Ejercicio',      'expense', '#84cc16', '🏋️'),
  ('Entretenimiento','expense', '#8b5cf6', '🎮'),
  ('Tarjeta',        'expense', '#64748b', '💳'),
  ('Familia',        'expense', '#f472b6', '👨‍👩‍👧'),
  ('Sistemas',       'expense', '#06b6d4', '💻'),
  ('Inversión',      'expense', '#14b8a6', '📈'),
  ('Vacaciones',     'expense', '#fb923c', '✈️'),
  ('Otros',          'expense', '#6b7280', '📦')
on conflict do nothing;

-- Categorías de Ingresos
insert into categories (name, type, color, emoji) values
  ('Sueldo',    'income', '#00e87a', '💼'),
  ('Regalo',    'income', '#f472b6', '🎁'),
  ('Intereses', 'income', '#0ea5e9', '📈'),
  ('Ajuste',    'income', '#a78bfa', '⚖️'),
  ('Préstamo',  'income', '#fb923c', '🤝'),
  ('Venta',     'income', '#34d399', '💰')
on conflict do nothing;

-- Tarjetas reales del usuario
insert into cards (name, bank, color) values
  ('Visa Macro',    'Macro',    '#00e87a'),
  ('Amex Macro',    'Macro',    '#1d4ed8'),
  ('Naranja X',     'Naranja',  '#f59e0b'),
  ('Mercado Pago',  'MP',       '#0ea5e9')
on conflict do nothing;
