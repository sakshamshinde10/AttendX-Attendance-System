---
name: Professional Academic Continuity
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#393939'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1b1c1c'
  surface-container: '#1f2020'
  surface-container-high: '#292a2a'
  surface-container-highest: '#343535'
  on-surface: '#e3e2e2'
  on-surface-variant: '#c6c6c6'
  inverse-surface: '#e3e2e2'
  inverse-on-surface: '#303031'
  outline: '#919191'
  outline-variant: '#474747'
  surface-tint: '#b2c5ff'
  primary: '#b2c5ff'
  on-primary: '#002b73'
  primary-container: '#1f4290'
  on-primary-container: '#dae2ff'
  inverse-primary: '#3b5ba9'
  secondary: '#c1c5dd'
  on-secondary: '#2b3042'
  secondary-container: '#414659'
  on-secondary-container: '#dde1fa'
  tertiary: '#e0bbdc'
  on-tertiary: '#412741'
  tertiary-container: '#593d59'
  on-tertiary-container: '#fed7f9'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#1f4290'
  secondary-fixed: '#dde1fa'
  secondary-fixed-dim: '#c1c5dd'
  on-secondary-fixed: '#161b2c'
  on-secondary-fixed-variant: '#414659'
  tertiary-fixed: '#fed7f9'
  tertiary-fixed-dim: '#e0bbdc'
  on-tertiary-fixed: '#2a122b'
  on-tertiary-fixed-variant: '#593d59'
  background: '#121414'
  on-background: '#e3e2e2'
  surface-variant: '#343535'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: 0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: 0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  margin-mobile: 16px
  gutter-mobile: 12px
---

## Brand & Style

The design system is engineered for a "Smart Wireless Attendance System," targeting educational institutions and corporate training environments. The brand personality is **authoritative yet frictionless**, prioritizing speed of utility with a premium, high-tech aesthetic. 

The design style is **Modern Minimalist with Glassmorphic accents**. It utilizes high-transparency surfaces and background blurs to create a sense of depth and hierarchy without the clutter of heavy borders. By blending the structured logic of Material Design 3 with soft, tactile depth, the UI evokes an emotional response of trust, precision, and modern sophistication. The "Rainbow" color logic introduces a broader spectrum of muted tones, softening the strictly corporate feel into something more inclusive and multi-dimensional.

## Colors

The palette is anchored by a **Muted Periwinkle (#5574C4)**, providing a sophisticated take on the traditional blue to signify reliability.

- **Primary:** Used for key FABs (Floating Action Buttons), active navigation states, and primary button fills.
- **Secondary & Tertiary:** A duo of Slate Grey (#71768B) and Mauve Plum (#8D6D8B) are utilized for attendance status tracking and auxiliary metrics, offering a balanced, non-traditional professional vibe.
- **Surface Strategy:** The system utilizes a **Dark Mode** default. Surfaces shift to a **Medium Neutral Gray (#777777)** base to maintain contrast while reducing eye strain during evening lectures and providing a contemporary matte-tech aesthetic.
- **Glass Effects:** Interactive cards and overlays utilize semi-transparent versions of the background colors with a 20px - 40px background blur (Gaussian) to maintain depth in the dark environment.

## Typography

This design system uses a streamlined, high-performance typographic pairing to maximize clarity and modern appeal.

**Manrope** is used for headlines, providing a geometric, contemporary feel that balances tech-forward aesthetics with excellent legibility. It serves as the primary visual anchor for high-level information. **Inter** serves as the workhorse for all body text, titles, and labels. Its neutral character and high x-height ensure exceptional readability in data-heavy views, student lists, and administrative dashboards.

Headlines utilize bold weights and slight letter-spacing to command attention. Body text maintains a comfortable line-height to ensure that schedules and logs are easily scannable against dark backgrounds. Labels use medium weights and specific tracking to distinguish metadata from primary content.

## Layout & Spacing

The layout follows a **fluid grid system** tailored for mobile-first interactions. It employs a 4-column structure for mobile devices with a standard 16px lateral margin.

- **Vertical Rhythm:** Elements are spaced using an 8px incremental scale (base 4px).
- **Safe Areas:** The layout respects the notch and home indicator zones, particularly for the Bottom Navigation and Top App Bars.
- **Card Padding:** All attendance and statistics cards use a standard 16px internal padding (md) to ensure content breathes within the glassmorphic containers.

## Elevation & Depth

In this dark-mode centered system, depth is achieved through **Tonal Elevation** and **Backdrop Blurs** rather than traditional shadows.

1.  **Level 0 (Base):** Medium Neutral Gray background (#777777 or derived tonal dark variant).
2.  **Level 1 (Cards):** Slightly lighter surface containers with soft, diffused shadows (Opacity: 0.2) and a 1px inner stroke in a low-opacity primary tint to simulate a glass edge.
3.  **Level 2 (Active States/Modals):** Increased background blur (32px) and a subtle primary-tinted outer glow to lift the element above the primary content.
4.  **Glassmorphism:** Navigation bars and Top App Bars use a 70% opacity fill of the surface-container color combined with a background blur, allowing content to peek through during scrolling, maintaining context.

## Shapes

The shape language is consistently **Rounded**, providing a friendly and approachable feel to the technical environment.

Containers (cards, input fields, and modals) utilize a **16px radius** (rounded-lg) as the standard. Small elements like chips or attendance status tags use an **8px radius** (rounded-sm). This soft geometry balances the clean, geometric lines of the Manrope headlines, making the technology feel human-centric and polished.

## Components

- **Attendance Cards:** Use a Level 1 glassmorphic container. Side color strips utilize Secondary Slate or Tertiary Mauve to indicate status and grouping. 
- **Glassmorphic Buttons:** Primary buttons use the Muted Periwinkle with a subtle gradient. Secondary buttons use a frosted-glass effect (semi-transparent gray) with a medium-weight Inter label.
- **Statistics Cards:** Feature large `headline-lg` numbers in the Manrope typeface. Use tonal variations of the primary color for progress rings or sparklines.
- **Input Fields:** Use fully enclosed containers with a 16px radius and a 1px low-contrast outline. The background is a slightly darker shade than the surface container.
- **Top App Bar:** Center-aligned for the main dashboard. It maintains the background blur effect to allow the bold Manrope headlines to stay visible while content scrolls beneath.
- **Bottom Navigation:** Icons use a pill-shaped indicator for the active state, utilizing the Primary Periwinkle at 20% opacity for the highlight background to ensure visibility against the dark surface.