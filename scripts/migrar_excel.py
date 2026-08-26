"""
Migración de Control de Gastos.xlsx → Supabase

Uso:
  pip install openpyxl requests python-dotenv
  python scripts/migrar_excel.py --file "Control de Gastos.xlsx"

El script lee el .env.local para las credenciales.
"""

import argparse
import os
import json
import sys
from datetime import date, datetime
from dateutil.relativedelta import relativedelta  # pip install python-dateutil
from pathlib import Path
import requests

try:
    import openpyxl
except ImportError:
    sys.exit("Faltan dependencias. Corré: pip install openpyxl requests python-dateutil")

# ─── Config ──────────────────────────────────────────────────

def load_env():
    env_path = Path(__file__).parent.parent / ".env.local"
    env = {}
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env

env = load_env()
SUPABASE_URL = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or "REEMPLAZAR" in SUPABASE_KEY:
    sys.exit("ERROR: Completá el .env.local con la URL y anon key de Supabase antes de migrar.")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def sb_get(table, params=""):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?{params}", headers=HEADERS)
    r.raise_for_status()
    return r.json()

def sb_post(table, rows):
    if not rows:
        return []
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, json=rows)
    if not r.ok:
        print(f"  ERROR en {table}: {r.text[:200]}")
        return []
    return r.json() if r.text else []

# ─── Helpers ──────────────────────────────────────────────────

def parse_date(val) -> str | None:
    if val is None:
        return None
    if isinstance(val, (date, datetime)):
        return val.strftime("%Y-%m-%d")
    try:
        return datetime.strptime(str(val), "%Y-%m-%d").strftime("%Y-%m-%d")
    except Exception:
        try:
            return datetime.strptime(str(val), "%d/%m/%Y").strftime("%Y-%m-%d")
        except Exception:
            return None

def parse_float(val) -> float:
    if val is None:
        return 0.0
    try:
        return float(str(val).replace(",", ".").replace("$", "").strip())
    except Exception:
        return 0.0

def first_day_next_month(d: str) -> str:
    dt = datetime.strptime(d, "%Y-%m-%d")
    next_month = dt + relativedelta(months=1)
    return next_month.replace(day=1).strftime("%Y-%m-%d")

def end_date(start: str, n_installments: int) -> str:
    dt = datetime.strptime(start, "%Y-%m-%d")
    end = dt + relativedelta(months=n_installments - 1)
    return end.strftime("%Y-%m-%d")

# ─── Load reference data from Supabase ───────────────────────

def load_categories():
    cats = sb_get("categories", "select=id,name,type")
    return {
        "expense": {c["name"].lower(): c["id"] for c in cats if c["type"] == "expense"},
        "income":  {c["name"].lower(): c["id"] for c in cats if c["type"] == "income"},
    }

def load_cards():
    cards = sb_get("cards", "select=id,name")
    return {c["name"].lower(): c["id"] for c in cards}

# ─── Sheet parsers ────────────────────────────────────────────

def parse_gastos(ws, cats):
    """Hoja Gastos: Fecha | Categoría | Detalle | Monto ARS | Monto USD | CCL"""
    rows = []
    expense_cats = cats["expense"]
    for row in ws.iter_rows(min_row=2, values_only=True):
        fecha = parse_date(row[0])
        if not fecha:
            continue
        cat_name = str(row[1] or "Otros").strip().lower()
        detalle = str(row[2] or "").strip()
        monto_ars = parse_float(row[3])
        monto_usd = parse_float(row[4]) if len(row) > 4 else None
        ccl = parse_float(row[5]) if len(row) > 5 else None

        if monto_ars == 0:
            continue

        cat_id = expense_cats.get(cat_name) or expense_cats.get("otros")

        rows.append({
            "date": fecha,
            "category_id": cat_id,
            "detail": detalle,
            "amount": monto_ars,
            "currency": "ARS",
            "amount_ars": monto_ars,
            "amount_usd": monto_usd,
            "ccl_rate": ccl,
        })
    return rows

def parse_ingresos(ws, cats):
    """Hoja Ingresos: Fecha | Categoría | Detalle | Monto ARS | Monto USD | CCL"""
    rows = []
    income_cats = cats["income"]
    for row in ws.iter_rows(min_row=2, values_only=True):
        fecha = parse_date(row[0])
        if not fecha:
            continue
        cat_name = str(row[1] or "Sueldo").strip().lower()
        detalle = str(row[2] or "").strip()
        monto_ars = parse_float(row[3])
        monto_usd = parse_float(row[4]) if len(row) > 4 else None
        ccl = parse_float(row[5]) if len(row) > 5 else None

        if monto_ars == 0:
            continue

        cat_id = income_cats.get(cat_name) or income_cats.get("sueldo")

        rows.append({
            "date": fecha,
            "category_id": cat_id,
            "detail": detalle,
            "amount": monto_ars,
            "currency": "ARS",
            "amount_ars": monto_ars,
            "amount_usd": monto_usd,
            "ccl_rate": ccl,
        })
    return rows

def parse_datos(ws, cards):
    """Hoja Datos: Descripción | Monto Total | Cuotas | Tarjeta | Cuota mensual | Fecha compra | ..."""
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row[0]:
            continue
        descripcion = str(row[0]).strip()
        monto_total = parse_float(row[1])
        cuotas = int(parse_float(row[2]) or 1)
        tarjeta_name = str(row[3] or "").strip().lower()
        fecha_compra_raw = row[5] if len(row) > 5 else row[4]
        fecha_compra = parse_date(fecha_compra_raw)

        if not fecha_compra or monto_total == 0:
            continue

        card_id = None
        for k, v in cards.items():
            if k in tarjeta_name or tarjeta_name in k:
                card_id = v
                break

        start = first_day_next_month(fecha_compra)
        e_date = end_date(start, cuotas)

        rows.append({
            "description": descripcion,
            "card_id": card_id,
            "total_amount": monto_total,
            "paid_amount": monto_total,
            "currency": "ARS",
            "total_installments": cuotas,
            "paid_installments": 0,  # se puede calcular después
            "start_date": start,
            "end_date": e_date,
            "counts_towards_balance": True,
        })
    return rows

# ─── Main ─────────────────────────────────────────────────────

def batch(lst, size=100):
    for i in range(0, len(lst), size):
        yield lst[i:i+size]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Ruta al archivo .xlsx")
    parser.add_argument("--dry-run", action="store_true", help="Solo muestra qué haría, sin insertar")
    args = parser.parse_args()

    xlsx_path = Path(args.file)
    if not xlsx_path.exists():
        sys.exit(f"Archivo no encontrado: {xlsx_path}")

    print(f"📂 Leyendo {xlsx_path.name}...")
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    sheets = {name.lower(): wb[name] for name in wb.sheetnames}

    print("📡 Cargando categorías y tarjetas de Supabase...")
    cats = load_categories()
    cards = load_cards()
    print(f"   Categorías expense: {len(cats['expense'])} | income: {len(cats['income'])}")
    print(f"   Tarjetas: {len(cards)}")

    # Parse sheets
    gastos_sheet = sheets.get("gastos") or sheets.get("gasto")
    ingresos_sheet = sheets.get("ingresos") or sheets.get("ingreso")
    datos_sheet = sheets.get("datos") or sheets.get("cuotas")

    gastos_rows = parse_gastos(gastos_sheet, cats) if gastos_sheet else []
    ingresos_rows = parse_ingresos(ingresos_sheet, cats) if ingresos_sheet else []
    datos_rows = parse_datos(datos_sheet, cards) if datos_sheet else []

    print(f"\n📊 Datos encontrados:")
    print(f"   Gastos:   {len(gastos_rows)}")
    print(f"   Ingresos: {len(ingresos_rows)}")
    print(f"   Cuotas:   {len(datos_rows)}")

    if args.dry_run:
        print("\n⚠️  Dry run — no se insertó nada.")
        return

    confirm = input("\n¿Insertar todo en Supabase? (s/n): ").strip().lower()
    if confirm != "s":
        print("Cancelado.")
        return

    # Insert gastos
    if gastos_rows:
        print(f"\n⬆️  Insertando {len(gastos_rows)} gastos...")
        inserted = 0
        for chunk in batch(gastos_rows):
            result = sb_post("expenses", chunk)
            inserted += len(result)
        print(f"   ✓ {inserted} insertados")

    # Insert ingresos
    if ingresos_rows:
        print(f"\n⬆️  Insertando {len(ingresos_rows)} ingresos...")
        inserted = 0
        for chunk in batch(ingresos_rows):
            result = sb_post("incomes", chunk)
            inserted += len(result)
        print(f"   ✓ {inserted} insertados")

    # Insert cuotas
    if datos_rows:
        print(f"\n⬆️  Insertando {len(datos_rows)} compras en cuotas...")
        inserted = 0
        for chunk in batch(datos_rows):
            result = sb_post("installment_purchases", chunk)
            inserted += len(result)
        print(f"   ✓ {inserted} insertadas")

    print("\n✅ Migración completa.")

if __name__ == "__main__":
    main()
