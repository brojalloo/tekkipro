# TekkiPro - Senegal Teranga Design System (Pro Max Edition)

Welcome to the unified design language for TekkiPro, reimagined for Senegal. This system blends the hospitality (Teranga) of Senegalese culture with high-end modern UX principles.

## 1. Visual Theme & Atmosphere
- **Concept:** "Senegal Teranga" — A fusion of vibrant West African colors, geometric patterns (Bogolan/Indigo), and cutting-edge minimalism.
- **Atmosphere:** Warm, hospitable, energetic, and high-performance.
- **Key Effects:** **Glassmorphism** (translucent cards), **Cultural Patterns** (subtle SVG patterns), and **Pro Max Transitions** (smooth 200ms ease-in-out).

## 2. Color Palette & Typography

### Primary Colors (Senegal Flag Colors)
| Color | Hex | Role |
|-------|-----|------|
| **Baobab Green** | `#1B5E20` | Stability / Growth / Brand Primary |
| **Senegal Gold**  | `#FFD600` | Energy / Warmth / Highlights |
| **Gorée Red**    | `#D32F2F` | Action / Vitality / Accents |
| **Teranga Sand** | `#FFFAF0` | Warm Background / Clean Space |

### Typography (Modern & Friendly)
- **Primary Font:** `Plus Jakarta Sans` (Professional yet approachable)
- **Rules:** 
    - Headers use `letter-spacing: -0.02em` and `font-weight: 800`.
    - Body text uses `font-weight: 500`.
    - Maintain **4.5:1 contrast ratio** for all informative text.

## 3. Technical UX Tokens

### Brand Color Tokens (App.css Variables)
| Variable | Value | Usage |
|----------|-------|-------|
| `--primary` | `#1B5E20` | Primary Actions / Green Success / "Baobab" |
| `--secondary` | `#FFD600` | High Attention / Gold / Updates |
| `--accent` | `#D32F2F` | Alerts / Critical Actions / "Gorée Red" |
| `--background` | `#FFFAF0` | Global Page Background / "Teranga Sand" |

### Spacing & Layout
| Token | Value | usage |
|-------|-------|-------|
| `--radius-md` | `1rem` (16px) | Standard component curvature |
| `--sidebar-width` | `288px` | Maximum content density layout |

## 4. Component Rules

- **Badges:** 
    - `badge-success`: Primary Green (`--primary`)
    - `badge-danger`: Gorée Red (`--accent`)
    - `badge-warning`: Senegal Gold (`--secondary`)
    - `badge-primary`: Baobab Green (`--primary`)
- **Buttons:**
    - `.btn-primary`: Baobab Green gradient.
    - `.btn-secondary`: Gorée Red gradient (used for energetic actions).
- **Cards:** Use glassmorphism (`backdrop-filter`) only on light backgrounds.

## 5. Pre-Delivery Checklist (MANDATORY)
Before finalizing any UI component, verify:
- [x] **Accessibility:** Check contrast ratios and ensure visible focus states.
- [x] **Typography:** Use `Plus Jakarta Sans` exclusively.
- [x] **Responsiveness:** Test at 375px (Mobile) and 1440px (Desktop).
- [x] **Brand Alignment:** No generic blue (#007bff) or orange (#fd7e14) outliers.

---
*TekkiPro Design System - Version 2.0 (Senegal Teranga)*
