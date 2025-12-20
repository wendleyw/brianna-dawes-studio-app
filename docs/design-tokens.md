# Design Tokens Documentation

## Overview

This document provides comprehensive documentation for the design token system used in the Brianna Dawes Studio Miro App. Design tokens are the visual design atoms of the design system — specifically, they are named entities that store visual design attributes.

## Table of Contents

1. [Color Tokens](#color-tokens)
2. [Typography Tokens](#typography-tokens)
3. [Spacing & Layout Tokens](#spacing--layout-tokens)
4. [Breakpoint Tokens](#breakpoint-tokens)
5. [Animation Tokens](#animation-tokens)
6. [Shadow Tokens](#shadow-tokens)
7. [Usage Guidelines](#usage-guidelines)
8. [Dark Mode Preparation](#dark-mode-preparation)

---

## Color Tokens

### Primary Colors

**Purpose:** Core brand colors used throughout the application.

```css
--color-primary: #000000;        /* Main brand color */
--color-primary-light: #1a1a5c;  /* Lighter variant */
--color-primary-dark: #030024;   /* Darker variant */
```

**When to use:**
- Primary buttons and CTAs
- Main navigation elements
- Brand-critical UI elements

**Example:**
```css
.primary-button {
  background-color: var(--color-primary);
}
```

---

### Accent Colors

**Purpose:** Secondary brand colors for emphasis and contrast.

```css
--color-accent: #2563eb;       /* Main accent */
--color-accent-light: #3b82f6; /* Lighter variant */
--color-accent-dark: #1d4ed8;  /* Darker variant */
```

**When to use:**
- Links and interactive elements
- Secondary actions
- Highlighting important information

---

### Brand Colors

**Purpose:** Special brand-specific colors for unique elements.

```css
--color-brand-gold: #D4A574;   /* Gold accent for client names */
```

**When to use:**
- Client name displays (ProjectCard:183)
- Premium features or highlights
- Decorative brand elements

**Example:**
```css
.client-name {
  color: var(--color-brand-gold);
}
```

---

### Status Colors

**Purpose:** Communicate state and provide visual feedback.

```css
/* Standard status colors */
--color-success: #10b981;
--color-success-light: #d1fae5;
--color-success-dark: #065f46;

--color-warning: #f59e0b;
--color-warning-light: #fef3c7;
--color-warning-dark: #92400e;

--color-error: #ef4444;
--color-error-light: #fee2e2;
--color-error-dark: #991b1b;

--color-info: #3b82f6;
--color-info-light: #dbeafe;
--color-info-dark: #1e40af;
```

**When to use:**
- Success: Confirmations, successful operations
- Warning: Alerts, cautionary messages
- Error: Validation errors, failed operations
- Info: Informational messages, tips

---

### Extended Status Colors

**Purpose:** Additional status colors for specialized use cases.

```css
--color-purple-500: #8B5CF6;
--color-purple-600: #7C3AED;
--color-purple-700: #6D28D9;
```

**When to use:**
- Alternative status indicators
- Progress states
- Custom status categories

---

### Project Status Colors

**Purpose:** Specific colors for project workflow states.

```css
--status-draft: #9ca3af;         /* Gray - Not started */
--status-in-progress: #3b82f6;   /* Blue - Active work */
--status-review: #f59e0b;        /* Orange - Awaiting review */
--status-done: #10b981;          /* Green - Completed */
--status-archived: #6b7280;      /* Dark gray - Archived */
```

**When to use:**
- Project cards and status badges
- Kanban board columns
- Timeline indicators

---

### Priority Colors

**Purpose:** Indicate task or project priority levels.

```css
--priority-urgent: #ef4444;      /* Red - Immediate attention */
--priority-high: #f59e0b;        /* Orange - High priority */
--priority-medium: #3b82f6;      /* Blue - Normal priority */
--priority-standard: #10b981;    /* Green - Standard priority */
```

**When to use:**
- Priority badges
- Task lists
- Dashboard indicators

---

### Neutral Colors

**Purpose:** Gray scale for backgrounds, borders, and text.

```css
--color-gray-50: #f9fafb;   /* Lightest */
--color-gray-100: #f3f4f6;
--color-gray-200: #e5e7eb;
--color-gray-300: #d1d5db;
--color-gray-400: #9ca3af;
--color-gray-500: #6b7280;
--color-gray-600: #4b5563;
--color-gray-700: #374151;
--color-gray-800: #1f2937;
--color-gray-900: #111827;  /* Darkest */
```

**When to use:**
- Backgrounds: 50-200 range
- Borders: 200-300 range
- Disabled states: 400
- Text: 500-900 range

---

### Semantic Background Colors

**Purpose:** Predefined backgrounds for common UI patterns.

```css
--color-bg-primary: #ffffff;     /* Main backgrounds */
--color-bg-secondary: #f9fafb;   /* Subtle backgrounds */
--color-bg-tertiary: #f3f4f6;    /* Deeper backgrounds */
```

**When to use:**
- Primary: Main content areas, cards
- Secondary: Alternate sections, hover states
- Tertiary: Nested elements, subtle dividers

---

### Semantic Text Colors

**Purpose:** Predefined text colors for hierarchy.

```css
--color-text-primary: #111827;    /* Main text */
--color-text-secondary: #4b5563;  /* Supporting text */
--color-text-tertiary: #9ca3af;   /* Subtle text */
--color-text-inverse: #ffffff;    /* Text on dark backgrounds */
```

**When to use:**
- Primary: Headings, body copy
- Secondary: Descriptions, metadata
- Tertiary: Labels, hints
- Inverse: Text on colored/dark backgrounds

---

### Border Colors

**Purpose:** Standardized border colors.

```css
--color-border: #e5e7eb;         /* Default borders */
--color-border-focus: #2563eb;   /* Focus states */
```

**When to use:**
- Border: Default input borders, dividers
- Border Focus: Active/focused form elements

---

### Gradients

**Purpose:** Pre-defined gradient combinations for visual appeal.

```css
--gradient-success: linear-gradient(135deg, #10B981 0%, #059669 100%);
--gradient-warning: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
--gradient-purple: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%);
--gradient-primary: linear-gradient(135deg, #050038 0%, #030025 100%);
```

**When to use:**
- Hero sections
- Premium features
- Status badges with depth
- Background accents

**Example:**
```css
.hero-banner {
  background: var(--gradient-primary);
}

.premium-badge {
  background: var(--gradient-purple);
}
```

---

### Component-Specific Tokens

**Purpose:** Semantic tokens that reference other tokens for specific components.

```css
--color-project-card-border: var(--color-primary);
--color-badge-text: var(--color-text-inverse);
--color-modal-overlay: rgba(0, 0, 0, 0.5);
```

**When to use:**
- Use these instead of hard-coded values
- Provides semantic meaning
- Easier to update globally

**Why use component tokens:**
- If you need to change all project card borders, update one token
- Makes code more readable and maintainable
- Future-proof for theming

---

## Typography Tokens

### Font Families

```css
--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-display: var(--font-ui);  /* Alias for backwards compatibility */
--font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
```

**Purpose:**
- UI: All interface text (Inter only)
- Display: Headings and prominent text
- Mono: Code snippets, technical text

---

### Font Sizes

**Purpose:** Standardized type scale optimized for Miro panels.

```css
--text-2xs: 0.625rem;   /* 10px - Micro labels */
--text-xs: 0.75rem;     /* 12px - Labels, badges, hints */
--text-sm: 0.8125rem;   /* 13px - Secondary text, metadata */
--text-base: 0.875rem;  /* 14px - Body text, inputs (default) */
--text-md: 0.9375rem;   /* 15px - Emphasized text */
--text-lg: 1rem;        /* 16px - Section titles, card headers */
--text-xl: 1.125rem;    /* 18px - Page subtitles */
--text-2xl: 1.25rem;    /* 20px - Page titles */
--text-3xl: 1.5rem;     /* 24px - Hero text */
--text-4xl: 1.75rem;    /* 28px - Large hero text */
--text-5xl: 2rem;       /* 32px - Extra large hero text */
```

**When to use:**
- 2xs-xs: Micro text, metadata
- sm: Supporting information
- base: Default body text
- lg: Subsection headings
- xl-2xl: Page headings
- 3xl+: Rarely used in panels (full-screen only)

---

### Font Weights

```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

**When to use:**
- Normal: Body text
- Medium: Subtle emphasis
- Semibold: Headings, buttons
- Bold: Strong emphasis, headers

---

### Line Heights

```css
--leading-none: 1;
--leading-tight: 1.2;
--leading-snug: 1.35;
--leading-normal: 1.5;
--leading-relaxed: 1.6;
--leading-loose: 1.8;
```

**When to use:**
- Tight: Headings, compact UI
- Normal: Body text (default)
- Relaxed: Comfortable reading

---

### Letter Spacing

```css
--tracking-tighter: -0.03em;
--tracking-tight: -0.015em;
--tracking-normal: 0;
--tracking-wide: 0.02em;
--tracking-wider: 0.05em;
--tracking-widest: 0.1em;
```

**When to use:**
- Tighter: Large headings
- Normal: Body text
- Wide: Labels, buttons in caps

---

## Spacing & Layout Tokens

### Spacing Scale

**Purpose:** Consistent spacing throughout the application.

```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

**When to use:**
- 1-2: Tight spacing (icons, badges)
- 3-4: Standard component spacing
- 6-8: Section spacing
- 12+: Page-level spacing

**When NOT to use tokens:**
- One-off values that won't be reused
- Component-specific measurements (e.g., 47px for a specific design requirement)

---

### Border Radius

```css
--radius-none: 0;
--radius-sm: 0.25rem;   /* 4px */
--radius-md: 0.5rem;    /* 8px */
--radius-lg: 0.75rem;   /* 12px */
--radius-xl: 1rem;      /* 16px */
--radius-2xl: 1.5rem;   /* 24px */
--radius-full: 9999px;  /* Fully rounded */
```

**When to use:**
- sm: Buttons, inputs, small cards
- md: Cards, modals (default)
- lg: Large cards, panels
- full: Pills, avatars, rounded buttons

---

### Z-Index Scale

```css
--z-dropdown: 100;
--z-sticky: 200;
--z-modal-backdrop: 300;
--z-modal: 400;
--z-toast: 500;
--z-tooltip: 600;
```

**Purpose:** Consistent layering hierarchy.

**When to use:**
- Always use these instead of arbitrary z-index values
- Prevents z-index conflicts
- Makes stacking order predictable

---

## Breakpoint Tokens

### Breakpoint Values

**Purpose:** Responsive design breakpoints (mobile-first).

```css
--breakpoint-sm: 640px;    /* Small devices */
--breakpoint-md: 768px;    /* Tablets */
--breakpoint-lg: 1024px;   /* Laptops */
--breakpoint-xl: 1280px;   /* Desktops */
--breakpoint-2xl: 1536px;  /* Large desktops */
```

**When to use:**
- Use in media queries for responsive layouts
- Mobile-first approach: start with mobile, add breakpoints up

**Example:**
```css
.component {
  /* Mobile styles */
  padding: var(--space-4);
}

@media (min-width: 768px) {
  .component {
    /* Tablet+ styles */
    padding: var(--space-8);
  }
}
```

---

### Container Max-Widths

**Purpose:** Maximum content width at each breakpoint.

```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
```

**When to use:**
- Use with `.container` utility class
- Constrains content width on large screens
- Improves readability

---

### Responsive Utilities

#### Container

```css
.container {
  /* Automatically constrains content width */
  /* Responsive padding and max-width */
}
```

#### Visibility Utilities

```css
.hide-sm    /* Hidden below 640px, visible above */
.show-sm    /* Visible below 640px, hidden above */
.hide-md    /* Hidden below 768px, visible above */
.show-md    /* Visible below 768px, hidden above */
.hide-lg    /* Hidden below 1024px, visible above */
.show-lg    /* Visible below 1024px, hidden above */
.hide-xl    /* Hidden below 1280px, visible above */
.show-xl    /* Visible below 1280px, hidden above */
```

**Example:**
```html
<!-- Show on mobile only -->
<div class="show-md">Mobile menu</div>

<!-- Show on tablet and up -->
<div class="hide-md">Desktop navigation</div>
```

#### Flexbox Utilities

```css
.flex-col-sm   /* Column on mobile, row on sm+ */
.flex-col-md   /* Column on mobile/sm, row on md+ */
.flex-col-lg   /* Column on mobile/sm/md, row on lg+ */
```

#### Grid Utilities

```css
.grid-cols-1        /* 1 column on all sizes */
.grid-cols-sm-2     /* 2 columns on sm+ */
.grid-cols-md-2     /* 2 columns on md+ */
.grid-cols-md-3     /* 3 columns on md+ */
.grid-cols-lg-2     /* 2 columns on lg+ */
.grid-cols-lg-3     /* 3 columns on lg+ */
.grid-cols-lg-4     /* 4 columns on lg+ */
```

**Example:**
```html
<!-- 1 column on mobile, 2 on tablet, 3 on desktop -->
<div class="grid-cols-1 grid-cols-md-2 grid-cols-lg-3">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

---

## Animation Tokens

### Duration

**Purpose:** Consistent animation timing.

```css
--duration-fast: 150ms;      /* Quick transitions */
--duration-normal: 250ms;    /* Standard transitions */
--duration-slow: 350ms;      /* Deliberate transitions */
```

**When to use:**
- Fast: Hover effects, simple state changes
- Normal: Most transitions (default)
- Slow: Complex animations, page transitions

**Also available (from spacing.css):**
```css
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;
```

---

### Easing

**Purpose:** Consistent motion curves.

```css
--easing-standard: cubic-bezier(0.4, 0.0, 0.2, 1);    /* Standard motion */
--easing-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1);  /* Entering elements */
--easing-accelerate: cubic-bezier(0.4, 0.0, 1, 1);    /* Exiting elements */
```

**When to use:**
- Standard: Most animations
- Decelerate: Elements entering the screen
- Accelerate: Elements leaving the screen

**Example:**
```css
.fade-in {
  opacity: 0;
  transition: opacity var(--duration-normal) var(--easing-decelerate);
}

.fade-in.active {
  opacity: 1;
}
```

---

## Shadow Tokens

### Box Shadows

**Purpose:** Consistent elevation and depth.

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

**When to use:**
- sm: Subtle depth (cards, inputs)
- md: Standard elevation (dropdowns, popovers)
- lg: Prominent elevation (modals, floating panels)
- xl: Maximum elevation (special overlays)

**Note:** There are duplicate shadow definitions in spacing.css. The ones in colors.css are newer and use simplified rgba syntax.

---

## Usage Guidelines

### When to Use Design Tokens

**Always use tokens for:**
- Colors that match defined status, brand, or semantic meanings
- Standard spacing increments (4, 8, 12, 16, 24, 32px, etc.)
- Typography sizes from the defined scale
- Shadows and elevation
- Animation timing
- Border radius from the scale
- Z-index layering

**It's okay to use hard-coded values for:**
- One-off measurements unique to a specific component
- Values that won't be reused elsewhere
- Component-specific dimensions (e.g., icon size: 18px)
- Unique design requirements outside the system

---

### Token Naming Convention

Tokens follow this pattern: `--{category}-{property}-{variant}`

Examples:
- `--color-success-light` - Category: color, Property: success, Variant: light
- `--space-4` - Category: space, Property: none, Variant: 4 (16px)
- `--text-lg` - Category: text, Property: none, Variant: lg

---

### How to Reference Tokens in CSS

```css
.my-component {
  /* Good - using tokens */
  color: var(--color-text-primary);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  transition: all var(--duration-normal) var(--easing-standard);
}

/* Avoid - hard-coded values when tokens exist */
.bad-component {
  color: #111827;     /* Use var(--color-text-primary) instead */
  padding: 16px;      /* Use var(--space-4) instead */
  border-radius: 8px; /* Use var(--radius-md) instead */
}
```

---

### Component-Specific Tokens

For reusable component-specific values, create semantic tokens that reference base tokens:

```css
/* Good - semantic component token */
:root {
  --color-project-card-border: var(--color-primary);
  --button-padding-x: var(--space-4);
  --button-padding-y: var(--space-2);
}

.project-card {
  border-color: var(--color-project-card-border);
}

.button {
  padding: var(--button-padding-y) var(--button-padding-x);
}
```

**Benefits:**
- Semantic naming improves code readability
- Easy to update globally
- Maintains consistency

---

## Dark Mode Preparation

### Current State

The design token system is ready for dark mode implementation. All colors are defined as CSS custom properties, making theme switching straightforward.

### How to Implement Dark Mode (Future)

1. **Add data attribute to root:**
```html
<html data-theme="dark">
```

2. **Define dark mode tokens:**
```css
:root {
  /* Light mode (default) */
  --color-bg-primary: #ffffff;
  --color-text-primary: #111827;
}

[data-theme="dark"] {
  /* Dark mode overrides */
  --color-bg-primary: #111827;
  --color-text-primary: #ffffff;
}
```

3. **Use semantic tokens throughout:**
```css
/* This automatically supports both themes */
.component {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}
```

### Dark Mode Token Strategy

**What needs to be defined for dark mode:**
- Background colors (inverted)
- Text colors (inverted)
- Border colors (adjusted for contrast)
- Status colors (may need lightening/darkening)
- Shadows (may need adjustment or removal)

**What doesn't need changes:**
- Spacing tokens
- Typography sizes and weights
- Border radius
- Animation timing
- Z-index scale

### Recommended Dark Mode Palette

When implementing dark mode, consider these adjustments:

```css
[data-theme="dark"] {
  /* Backgrounds - darker */
  --color-bg-primary: #0f1419;
  --color-bg-secondary: #1a1f26;
  --color-bg-tertiary: #242b33;

  /* Text - lighter */
  --color-text-primary: #e6e9ef;
  --color-text-secondary: #9ca3af;
  --color-text-tertiary: #6b7280;

  /* Borders - more subtle */
  --color-border: #2d3748;

  /* Status colors - slightly desaturated/lighter */
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-error: #f87171;

  /* Shadows - less prominent or removed */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}
```

---

## Best Practices

1. **Always reference tokens through `var()`**
   - Enables dynamic theming
   - Provides fallback support

2. **Use semantic tokens when possible**
   - `var(--color-text-primary)` over `var(--color-gray-900)`
   - Makes intent clear

3. **Don't nest var() unnecessarily**
   ```css
   /* Good */
   --my-color: var(--color-primary);

   /* Avoid deep nesting */
   --my-color: var(--other-token);
   --other-token: var(--base-token);
   ```

4. **Keep component tokens close to usage**
   - Define component-specific tokens in component CSS
   - Only add to root tokens if used globally

5. **Document non-standard values**
   ```css
   .special-component {
     /* Non-standard height required for Miro SDK iframe */
     height: 47px;
   }
   ```

---

## Token File Structure

```
/src/shared/ui/
├── tokens/
│   ├── colors.css          # All color tokens
│   ├── typography.css      # Font families, sizes, weights
│   ├── spacing.css         # Spacing, radius, shadows
│   └── breakpoints.css     # Responsive breakpoints
├── utilities/
│   └── responsive.css      # Responsive utility classes
└── styles/
    └── global.css          # Imports all tokens
```

All tokens are automatically available in components that import global styles.

---

## Questions?

For questions or suggestions about the design token system, please consult:
- `/src/shared/ui/tokens/` for token definitions
- This document for usage guidelines
- CLAUDE.md for project-specific conventions

---

**Version:** 1.0
**Last Updated:** December 19, 2025
**Maintainer:** Brianna Dawes Studio Development Team
