# Iteration 2 Changes

## Summary of fixes applied

### Fix 1 — Hero redesign (Originality)
- Removed flat card wrapper; hero is now a full-bleed section (no card border)
- ARS balance at clamp(56px, 7vw, 88px) font-size, tabular-nums, white
- Radial gradient glow behind number: rgba(0,232,122,0.08)
- USD equivalent at 28px in #0ea5e9 blue
- Top-left label "SALDO AGOSTO" with letter-spacing: 0.15em and a thin 2px gradient accent line below
- Asymmetric layout: 60% left text / 40% right donut chart
- Donut chart at 220px, no card wrapper, floating beside the number
- Budget bar moved to its own standalone section below hero with no card wrapper
- Budget bar: 6px height, rounded, gradient fill (green→amber→red)

### Fix 2 — Stat cards redesign
- Hover state: subtle colored left border (2px) glow effect via border-left transition
- Box-shadow glow on hover matches card accent color
- Cuotas card uses #0ea5e9 (blue) accent color on hover
- Category mini-bars increased from 3px to 6px height

### Fix 3 — Spin animation (Bug)
- Added @keyframes spin to globals.css
- Added .animate-spin CSS class
- The inline animation: "spin 1s linear infinite" in configuracion/page.tsx now works

### Fix 4 — Analytics grid mobile bug
- Removed inline `style={{ gridTemplateColumns: "1fr 1fr" }}` from Row 2
- Now uses only className="grid grid-cols-1 md:grid-cols-3" for responsive behavior

### Fix 5 — Analytics layout rethink
- Bar chart is now 300px tall and full width (was 240px)
- Row 2 is now a 3-column grid on desktop:
  - Col 1: Feature stat card "Mes con mayor gasto" with ARS value + vs-average comparison
  - Col 2: Donut chart (gastos por categoría)
  - Col 3: CCL line chart
- Bar chart shows delta labels (+formatK) above ingresos bars
- Bar tooltip shows delta line when both bars have data

### Fix 6 — Sidebar logo
- Replaced "$" dollar sign with custom SVG: green circle with white "G"
- App name styled as "gas" (white) + "tos" (#00e87a green)
- Sidebar CCL footer now reads from CURRENT_CCL constant instead of hardcoded "$1.548"

### Fix 7 — Edit button functionality (Gastos + Ingresos)
- Pencil button now opens the drawer pre-populated with row data
- Drawer title changes to "Editar gasto" / "Editar ingreso"
- Save button text changes to "Actualizar gasto" / "Actualizar ingreso"
- Edit updates the record in-place rather than appending a new one
- Pencil button has hover state: green color + green background tint

### Fix 8 — "Cargar resumen del mes" modal (Cuotas)
- New CargarResumenModal component with full form
- Triggered by card button with card color accent
- Fields: Moneda toggle (ARS/USD), Monto input at 20px font-size
- Success state: button turns green with checkmark for 1.2s then closes
- New statements are added to state and reflected in card "Último resumen"

## Dev Server
- URL: http://localhost:3000
- Status: running
- Command: npm run dev
