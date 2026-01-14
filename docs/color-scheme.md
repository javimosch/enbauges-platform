# Color scheme (Enbauges / Massif des Bauges)

This document defines a consistent color scheme and usage rules for the Enbauges web UI.

## Goals

- **Nature + civic**: feel rooted in the Bauges (forest / stone / sky) while staying readable and “service public”.
- **Accessibility first**: default text/background combinations should meet WCAG AA.
- **Sobriety**: limited, reusable palette; accents used sparingly.

## Palette

### Primary (Forest)

Use for primary buttons, key actions, and brand accents.

- `forest-700`: `#14532D` (primary action / important emphasis)
- `forest-600`: `#166534` (hover/active variants)
- `forest-500`: `#16A34A` (secondary accents, badges)

### Secondary (Alpine Sky)

Use for links, secondary actions, and informational accents.

- `sky-700`: `#0369A1`
- `sky-600`: `#0284C7`
- `sky-500`: `#0EA5E9`

### Neutrals (Stone)

Use for layout, borders, surfaces, and typography.

- `stone-950`: `#0C0E10` (near-black text on light backgrounds)
- `stone-800`: `#1F2937` (secondary text)
- `stone-600`: `#475569` (muted text)
- `stone-300`: `#CBD5E1` (borders)
- `stone-100`: `#F1F5F9` (subtle backgrounds)
- `paper`: `#FAFAF5` (main page background)

### Highlight (Sun / Amber)

Use sparingly for highlights, “new”, or friendly warnings.

- `amber-600`: `#D97706`
- `amber-500`: `#F59E0B`

### Status colors

- **Success**: `#16A34A` (reuse `forest-500`)
- **Info**: `#0284C7` (reuse `sky-600`)
- **Warning**: `#F59E0B` (reuse `amber-500`)
- **Error**: `#DC2626`

## Semantic tokens (recommended)

Define these as CSS variables (or a Tailwind theme later) so the palette can evolve without refactoring templates.

- `--color-bg`: `paper`
- `--color-surface`: `#FFFFFF`
- `--color-text`: `stone-950`
- `--color-text-muted`: `stone-600`
- `--color-border`: `stone-300`
- `--color-primary`: `forest-700`
- `--color-primary-hover`: `forest-600`
- `--color-link`: `sky-700`
- `--color-link-hover`: `sky-600`

## Usage rules

### Buttons

- **Primary CTA**: `forest-700` background + white text.
- **Secondary**: outline with `forest-700` or `sky-700` depending on context.
- **Destructive**: red background, never forest.

### Links

- Default links use `sky-700`.
- Hover uses `sky-600`.
- Do not use amber for links.

### Backgrounds and surfaces

- Page background: `paper`.
- Cards/surfaces: white.
- Subtle section background: `stone-100`.

### Charts / tags

- Prefer: forest / sky / amber + neutrals.
- Avoid adding new random saturated colors.

## Accessibility notes

- Keep normal body text as dark neutral (`stone-950`) on light surfaces.
- For text placed on `forest-700`, use white text.
- Avoid `sky-500` as a text color on white; prefer `sky-700`.

## Visual direction (landing page)

- **Primary feeling**: calm and trustworthy (paper background + forest CTAs).
- **Local identity**: forest/stone palette + optional topographic pattern (very subtle, low contrast).
