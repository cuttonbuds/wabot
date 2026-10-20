# Design System Inspired by ChatBot

> Auto-extracted from `https://www.chatbot.com/` on 2026-08-27

## 1. Visual Theme & Atmosphere

Friendly, approachable design with rounded shapes and generous whitespace.

The hero section leads with "AI chatbot that helps your customers and grows your sales" followed by "Train it on your website. Deploy it in minutes. AI Agent answers questions, recommends products, and".

**Key Characteristics:**
- Colfax as the heading font (custom web font loaded via @font-face)
- Colfax as the body font for all running text
- Heading weight 500, letter-spacing -2px
- Light/white background (#ffffff) as the primary canvas
- Primary accent `#0066ff` used for CTAs and brand highlights
- 6 shadow level(s) detected — tinted shadows
- Rounded corners (10px+) creating a friendly, approachable feel
- Tags: light, rounded, colorful, bold-typography, sans-serif

## 2. Color Palette & Roles

### Primary
- **Primary Accent** (`#0066ff`) · `--color-primary`: Brand color, CTA backgrounds, link text, interactive highlights.
- **Secondary Accent** (`#ee0007`) · `--color-secondary`: Secondary brand, hover states, complementary highlights.
- **Background** (`#ffffff`) · `--color-bg`: Page background, primary canvas.
- **Background Secondary** (`#f6f6f7`) · `--color-bg-secondary`: Cards, surfaces, alternating sections.

### Text
- **Text Primary** (`#1b1b20`) · `--color-text`: Headings and body text.
- **Text Secondary** (`#666666`) · `--color-text-secondary`: Muted text, captions, placeholders.

### Borders & Surfaces
- **Border** (`#f6f6f7`) · `--color-border`: Dividers, outlines, input borders.

### Full Extracted Palette

| # | Hex | CSS Variable | Role | Area | Contrast |
|---|---|---|---|---|---|
| 1 | `#ffffff` | `--palette-1` | block | large | text-dark |
| 2 | `#f6f6f7` | `--palette-2` | block | large | text-dark |
| 3 | `#f7a482` | `--palette-3` | block | large | text-dark |
| 4 | `#e27042` | `--palette-4` | block | large | text-dark |
| 5 | `#29292f` | `--palette-5` | block | large | text-light |
| 6 | `#0f0f10` | `--palette-6` | button | medium | text-light |
| 7 | `#ee0007` | `--palette-7` | button | medium | text-light |
| 8 | `#0066ff` | `--palette-8` | text-accent | medium | text-light |
| 9 | `#a5af7b` | `--palette-9` | button | small | text-dark |
| 10 | `#ed916d` | `--palette-10` | button | small | text-dark |
| 11 | `#f0ad5b` | `--palette-11` | button | small | text-dark |
| 12 | `#0000ee` | `--palette-12` | text-accent | small | text-light |
| 13 | `#0156f9` | `--palette-13` | text-accent | small | text-light |
| 14 | `#da851e` | `--palette-14` | text-accent | small | text-dark |

## 3. Typography Rules

- **Heading Font:** `Colfax` (web font)
- **Body Font:** `Colfax` (web font)

### Type Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| H1 | Colfax | 72px | 500 | 74px | -2px |
| H2 | Colfax | 40px | 500 | 46px | -0.5px |
| H3 | Colfax | 18px | 500 | 28px | normal |
| Body | Colfax | 12px | 500 | 18.6667px | normal |
| Small | Colfax | 14px | 400 | 23.1px | normal |

### Type Scale

| Token | Size | Suggested Usage |
|---|---|---|
| Display | `72px` | headings |
| H1 | `56px` | headings |
| H2 | `40px` | headings |
| H3 | `32px` | headings |
| H4 | `31.3632px` | headings |
| Body L | `24px` | body / supporting text |
| Body | `21.06px` | body / supporting text |
| Small | `18px` | body / supporting text |
| XS | `16px` | body / supporting text |
| Caption | `14px` | body / supporting text |

## 4. Component Stylings

### Primary Button

```css
.btn-primary {
  background: transparent;
  color: #1b1b20;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 16px;
  font-weight: 500;
  border: none;
  cursor: pointer;
}
```

### Ghost Button

```css
.btn-ghost {
  background: transparent;
  color: #0f0f10;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 500;
  border: none;
  cursor: pointer;
}
```

### Filled Button

```css
.btn-filled {
  background: #ffffff;
  color: #0f0f10;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 18px;
  font-weight: 500;
  border: 1.6px solid rgb(15, 15, 16);
  cursor: pointer;
}
```

### Filled Button 2

```css
.btn-filled-2 {
  background: #ee0007;
  color: #ffffff;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 18px;
  font-weight: 500;
  border: 1.6px solid rgb(238, 0, 7);
  cursor: pointer;
}
```

### Ghost Button 2

```css
.btn-ghost-2 {
  background: transparent;
  color: #0156f9;
  border-radius: 0px;
  padding: 0px 0px;
  font-size: 18px;
  font-weight: 500;
  border: none;
  cursor: pointer;
}
```

### Filled Button 3

```css
.btn-filled-3 {
  background: #0f0f10;
  color: #ffffff;
  border-radius: 10px;
  padding: 12px 24px;
  font-size: 18px;
  font-weight: 500;
  border: 1.6px solid rgb(15, 15, 16);
  cursor: pointer;
}
```

## 5. Layout Principles

- **Base spacing unit:** `8px` — use multiples (16px, 24px, 32px, etc.)

### Spacing Scale (extracted from real elements)

| Token | Value | Role |
|---|---|---|
| spacing-1 | `8px` | element |
| spacing-2 | `24px` | card |
| spacing-3 | `16px` | element |
| spacing-4 | `12px` | element |
| spacing-5 | `32px` | card |
| spacing-6 | `1.6px` | element |
| spacing-7 | `20px` | element |
| spacing-8 | `4px` | element |

### Border Radius Scale

| Token | Value | Element |
|---|---|---|
| radius-button | `10px` | button |
| radius-card | `20px` | card |
| radius-card | `16px` | card |
| radius-button | `12px` | button |
| radius-card | `40px` | card |
| radius-button | `6px` | button |

## 6. Depth & Elevation

| Level | Shadow | Usage |
|---|---|---|
| Mid | `rgba(0, 0, 0, 0.1) 0px 5px 12px 0px` | Dropdowns, popovers |
| Low | `rgba(0, 0, 0, 0.05) 0px 0px 4px 1px, rgba(0, 0, 0, 0.08) 0px 40px 34px -16px, rg...` | Cards, subtle elevation |
| High | `rgba(0, 0, 0, 0.1) 0px 0px 15px 0px` | Modals, floating elements |
| Mid | `rgba(0, 0, 0, 0.03) 0px 5px 10px 0px, rgba(0, 0, 0, 0.03) 0px 18px 18px 0px, rgb...` | Dropdowns, popovers |
| High | `rgba(0, 0, 0, 0.03) 0px 4px 14px 0px inset` | Modals, floating elements |


## 7. Do's and Don'ts

### Do
- Use `#ffffff` as the primary background color
- Use `Colfax` for all headings and `Colfax` for body text
- Use `#0066ff` as the single dominant accent/CTA color
- Maintain `8px` as the base spacing unit — all gaps should be multiples
- Use rounded corners (`10px`+) consistently for all interactive elements
- Make headlines large and bold — typography is the hero element
- Embrace bold color combinations — playful energy is the point
- Apply the shadow system for elevation — use the extracted shadow values
- Use weight 500 for headings to match the brand's typographic voice

### Don't
- Don't use colors outside the extracted palette without justification
- Don't substitute Colfax/Colfax with generic alternatives
- Don't use irregular spacing — stick to 8px grid
- Don't use dark/black backgrounds — this is a light-themed design
- Don't use sharp corners — they feel hostile in this rounded design language
- Don't use pure black (#000000) for text — use `#1b1b20` instead
- Don't add decorative elements not present in the original design — no badges, ribbons, banners, or ornaments unless the source site uses them
- Don't invent UI patterns the source site doesn't have — if the original has no NEW badge, don't add one just because a red is in the palette

## 8. Responsive Behavior

| Breakpoint | Width | Notes |
|---|---|---|
| Mobile | < 640px | Single column, stack sections, reduce font sizes ~80% |
| Tablet | 640–1024px | 2-column where appropriate, maintain spacing ratios |
| Desktop | 1024–1440px | Full layout as designed |
| Wide | > 1440px | Max-width container, center content |

- Touch targets: minimum 44×44px on mobile
- Maintain 8px base unit across breakpoints — only scale multipliers

## 9. Agent Prompt Guide

### Quick Color Reference

```
Background:  #ffffff
Text:        #1b1b20
Accent:      #0066ff
Secondary:   #ee0007
Border:      #f6f6f7
```

### Example Prompts

1. "Build a hero section with a `#ffffff` background, `Colfax` heading in `#1b1b20`, and a `#0066ff` CTA button with 10px radius."
2. "Create a pricing card using background `#f6f6f7`, border `#f6f6f7`, `Colfax` for text, and 24px padding."
3. "Design a navigation bar — `#ffffff` background, `#1b1b20` links, `#0066ff` for active state."
4. "Build a feature grid with 3 columns, 24px gap, each card using the card component style."
5. "Create a footer with `#1b1b20` background, `#ffffff` text, and 16px padding."

### Iteration Guide

1. Start with layout structure (sections, grid, spacing)
2. Apply colors from the palette — background first, then text, then accents
3. Set typography — font families, sizes from the type scale, weights
4. Add components — buttons, cards, inputs using the specs above
5. Apply border-radius consistently across all elements
6. Add shadows for depth — use the extracted shadow values, not defaults
7. Check responsive behavior — test mobile and tablet layouts
8. Final pass — verify all colors match, spacing is consistent, fonts are correct

## 10. CSS Custom Properties

> 7 custom properties extracted from `:root` / `html` stylesheets.

### Color Variables

| Variable | Value |
|---|---|
| `--color-black-30` | `#f6f6f7` |
| `--color-purple-75` | `#f4f1ff` |
| `--color-black-20` | `#fcfcfc` |
| `--color-black-75` | `#eeeeef` |
| `--sqf-panel-bg` | `#eeebe7` |
| `--sqf-accent` | `#f05c21` |
| `--sqf-divider` | `#dbd9d0` |
