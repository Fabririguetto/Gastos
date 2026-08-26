# Design Evaluation Rubric — Gastos App

## Axes & Weights

### Design Quality (weight: 0.35)
- Does the dark fintech aesthetic feel premium and cohesive?
- Are numbers (ARS/USD) displayed with proper hierarchy (big primary, small secondary)?
- Is the color usage restrained — accent color pops without feeling garish?
- Does the layout breathe properly — spacing, alignment, visual rhythm?

### Originality (weight: 0.30)
- Does it avoid generic dashboard templates?
- Are there any creative layout choices (asymmetric grids, bold hero sections, unusual card treatments)?
- Does the data visualization feel distinctive vs default Recharts output?
- Would a designer stop scrolling at this?

### Craft (weight: 0.25)
- Are interactive states (hover, focus, active) well-considered?
- Is typography scaled correctly — bold for numbers, lighter for labels?
- Are loading/empty/error states handled with the same care as the default state?
- Is the mobile layout a true responsive adaptation, not just a shrunken desktop?

### Functionality (weight: 0.10)
- Does the main happy path work (view dashboard, add expense, see analytics)?
- Are the Recharts charts actually rendering with plausible data?
- Does the Excel import flow exist (even as a UI shell)?

## Scoring
Each axis scored 1–10. Weighted average must reach **7.5** to pass.
A 10 on Design Quality + Originality outweighs a 6 on Functionality — this is a design sprint.

## Pass Conditions
- Score ≥ 7.5 weighted average
- No axis below 5.0 (hard floor)
- The dashboard "wow moment" exists — first 3 seconds feel intentional
